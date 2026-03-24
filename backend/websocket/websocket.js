const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Client = require('../models/Client');
const Worker = require('../models/Worker');
const Provider = require('../models/Provider');

const connections = new Map();

function initializeWebSocket(server) {
    const wss = new WebSocket.Server({ server });

    wss.on('connection', async (ws, req) => {
        try {
            const urlParams = new URLSearchParams(req.url.split('?')[1]);
            const token = urlParams.get('token');

            if (!token) {
                ws.close(1008, 'Authentication required');
                return;
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);

            if (!user) {
                ws.close(1008, 'Invalid token');
                return;
            }

            let roleData = null;
            if (user.role === 'CLIENT') {
                roleData = await Client.findOne({ userId: user._id });
            } else if (user.role === 'WORKER') {
                roleData = await Worker.findOne({ userId: user._id });
            } else if (user.role === 'PROVIDER') {
                roleData = await Provider.findOne({ userId: user._id });
            }

            const connectionId = user._id.toString();

            connections.set(connectionId, {
                ws,
                userId: user._id.toString(),
                role: user.role,
                roleDataId: roleData?._id?.toString()
            });

            console.log(`WebSocket connected: userId=${connectionId}, role=${user.role}`);

            ws.send(JSON.stringify({
                type: 'CONNECTION_ESTABLISHED',
                message: `Connected as ${user.role}`,
                userId: user._id.toString()
            }));

            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data);
                    console.log(`Message from ${connectionId}:`, message);

                    switch (message.type) {
                        case 'PING':
                            ws.send(JSON.stringify({ type: 'PONG' }));
                            break;
                        case 'TYPING':
                            if (message.conversationId) {
                                broadcastTyping(connectionId, message.conversationId);
                            }
                            break;
                        case 'SEND_MESSAGE':
                            const chatSocket = require('./chatSocket');
                            const result = await chatSocket.handleChatMessage(connectionId, message.data);
                            if (result.success) {
                                ws.send(JSON.stringify({ type: 'MESSAGE_SENT', message: result.message }));
                            } else {
                                ws.send(JSON.stringify({ type: 'ERROR', message: result.message }));
                            }
                            break;
                        default:
                            ws.send(JSON.stringify({ type: 'MESSAGE_RECEIVED', receivedMessage: message }));
                    }
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            });

            ws.on('close', () => {
                connections.delete(connectionId);
                console.log(`WebSocket disconnected: ${connectionId}`);
            });

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

function sendToUser(userId, message) {
    const connection = connections.get(userId);
    if (connection && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(message));
        return true;
    }
    return false;
}

function sendChatMessage(userId, message) {
    return sendToUser(userId, message);
}

function notifyClient(clientId, message) {
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

function notifyWorker(workerId, message) {
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

async function broadcastTyping(senderId, conversationId) {
    try {
        const Conversation = require('../models/Conversation');
        const participantIds = await Conversation.getParticipantIds(conversationId);

        participantIds.forEach(userId => {
            if (userId.toString() !== senderId) {
                sendToUser(userId.toString(), {
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

async function notifyWorkersInAreas(areaIds, message) {
    try {
        const workers = await Worker.findByAreaIds(areaIds);
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

function getConnectionStats() {
    const stats = { total: connections.size, clients: 0, workers: 0, providers: 0, connections: [] };
    connections.forEach((conn, userId) => {
        if (conn.role === 'CLIENT') stats.clients++;
        else if (conn.role === 'WORKER') stats.workers++;
        else if (conn.role === 'PROVIDER') stats.providers++;
        stats.connections.push({ userId, role: conn.role });
    });
    return stats;
}

module.exports = { initializeWebSocket, sendToUser, sendChatMessage, notifyClient, notifyWorker, notifyWorkersInAreas, getConnectionStats };
