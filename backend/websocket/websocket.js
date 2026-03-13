const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Client = require('../models/Client');
const Worker = require('../models/Worker');
const Provider = require('../models/Provider');

// Store active connections - keyed by userId
const connections = new Map();

/**
 * Initialize WebSocket server
 */
function initializeWebSocket(server) {
    const wss = new WebSocket.Server({ server });

    wss.on('connection', async (ws, req) => {
        try {
            // Extract token from query string
            const urlParams = new URLSearchParams(req.url.split('?')[1]);
            const token = urlParams.get('token');

            if (!token) {
                ws.close(1008, 'Authentication required');
                return;
            }

            // Verify JWT
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user data
            const user = await User.findById(decoded.userId).lean();

            if (!user) {
                ws.close(1008, 'Invalid token');
                return;
            }

            // Get role-specific data
            let roleData = null;
            if (user.role === 'CLIENT') {
                roleData = await Client.findOne({ userId: user._id }).lean();
            } else if (user.role === 'WORKER') {
                roleData = await Worker.findOne({ userId: user._id }).lean();
            } else if (user.role === 'PROVIDER') {
                roleData = await Provider.findOne({ userId: user._id }).lean();
            }

            // Use userId as connection key for simplicity
            const connectionId = user._id.toString();

            // Store connection
            connections.set(connectionId, {
                ws,
                userId: user._id.toString(),
                role: user.role,
                roleDataId: roleData?._id.toString()
            });

            console.log(`WebSocket connected: userId=${connectionId}, role=${user.role}`);

            // Send confirmation
            ws.send(JSON.stringify({
                type: 'CONNECTION_ESTABLISHED',
                message: `Connected as ${user.role}`,
                userId: user._id.toString()
            }));

            // Handle messages from client
            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data);
                    console.log(`Message from ${connectionId}:`, message);

                    // Handle different message types
                    switch (message.type) {
                        case 'PING':
                            ws.send(JSON.stringify({ type: 'PONG' }));
                            break;
                        case 'TYPING':
                            // Broadcast typing indicator to conversation participants
                            if (message.conversationId) {
                                broadcastTyping(connectionId, message.conversationId);
                            }
                            break;
                        case 'SEND_MESSAGE':
                            // Handle chat message
                            const chatSocket = require('./chatSocket');
                            const result = await chatSocket.handleChatMessage(connectionId, message.data);
                            if (result.success) {
                                ws.send(JSON.stringify({
                                    type: 'MESSAGE_SENT',
                                    message: result.message
                                }));
                            } else {
                                ws.send(JSON.stringify({
                                    type: 'ERROR',
                                    message: result.message
                                }));
                            }
                            break;
                        default:
                            // Echo back for now
                            ws.send(JSON.stringify({
                                type: 'MESSAGE_RECEIVED',
                                receivedMessage: message
                            }));
                    }
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            });

            // Handle disconnection
            ws.on('close', () => {
                connections.delete(connectionId);
                console.log(`WebSocket disconnected: ${connectionId}`);
            });

            // Handle errors
            ws.on('error', (error) => {
                console.error(`WebSocket error for ${connectionId}:`, error);
                connections.delete(connectionId);
            });

        } catch (error) {
            console.error('WebSocket connection error:', error);
            ws.close(1011, 'Authentication failed');
        }
    });

    console.log('WebSocket server initialized');
    return wss;
}

/**
 * Send a message to a specific user by userId
 * @param {string} userId - User ID
 * @param {Object} message - Message to send
 */
function sendToUser(userId, message) {
    const connection = connections.get(userId);

    if (connection && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(message));
        return true;
    }

    return false;
}

/**
 * Send chat message to a user
 * @param {string} userId - User ID
 * @param {Object} message - Chat message object
 */
function sendChatMessage(userId, message) {
    return sendToUser(userId, message);
}

/**
 * Notify a specific client (for job notifications)
 * @param {string} clientId - Client ID
 * @param {Object} message - Message to send
 */
function notifyClient(clientId, message) {
    // Find connection by roleDataId matching clientId
    for (const [userId, conn] of connections.entries()) {
        if (conn.role === 'CLIENT' && conn.roleDataId === clientId) {
            if (conn.ws.readyState === WebSocket.OPEN) {
                conn.ws.send(JSON.stringify(message));
                return true;
            }
        }
    }
    return false;
}

/**
 * Notify a specific worker (for job notifications)
 * @param {string} workerId - Worker ID
 * @param {Object} message - Message to send
 */
function notifyWorker(workerId, message) {
    // Find connection by roleDataId matching workerId
    for (const [userId, conn] of connections.entries()) {
        if (conn.role === 'WORKER' && conn.roleDataId === workerId) {
            if (conn.ws.readyState === WebSocket.OPEN) {
                conn.ws.send(JSON.stringify(message));
                return true;
            }
        }
    }
    return false;
}

/**
 * Broadcast typing indicator to conversation participants
 * @param {string} senderId - User ID of person typing
 * @param {string} conversationId - Conversation ID
 */
async function broadcastTyping(senderId, conversationId) {
    try {
        const Conversation = require('../models/Conversation');
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) return;

        // Send to all participants except sender
        conversation.participantIds.forEach(participantId => {
            const userId = participantId.toString();
            if (userId !== senderId) {
                sendToUser(userId, {
                    type: 'USER_TYPING',
                    conversationId,
                    userId: senderId
                });
            }
        });
    } catch (error) {
        console.error('Error broadcasting typing:', error);
    }
}

/**
 * Broadcast to all workers in specific areas (for job notifications)
 * @param {Array} areaIds - Array of area IDs (as strings)
 * @param {Object} message - Message to send
 */
async function notifyWorkersInAreas(areaIds, message) {
    try {
        const Worker = require('../models/Worker');
        // Find workers who service these areas
        const workers = await Worker.find({
            areaIds: { $in: areaIds }
        }).select('_id').lean();

        let notifiedCount = 0;
        workers.forEach(worker => {
            if (notifyWorker(worker._id.toString(), message)) {
                notifiedCount++;
            }
        });

        return notifiedCount;
    } catch (error) {
        console.error('Error notifying workers in areas:', error);
        return 0;
    }
}

/**
 * Get connection statistics
 */
function getConnectionStats() {
    const stats = {
        total: connections.size,
        clients: 0,
        workers: 0,
        providers: 0,
        connections: []
    };

    connections.forEach((conn, userId) => {
        if (conn.role === 'CLIENT') {
            stats.clients++;
        } else if (conn.role === 'WORKER') {
            stats.workers++;
        } else if (conn.role === 'PROVIDER') {
            stats.providers++;
        }
        stats.connections.push({
            userId,
            role: conn.role
        });
    });

    return stats;
}

module.exports = {
    initializeWebSocket,
    sendToUser,
    sendChatMessage,
    notifyClient,
    notifyWorker,
    notifyWorkersInAreas,
    getConnectionStats
};
