const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Client = require('../models/Client');
const Worker = require('../models/Worker');

// Store active connections
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
            let clientData = null;
            let workerData = null;

            if (user.role === 'CLIENT') {
                clientData = await Client.findOne({ userId: user._id }).lean();
            } else if (user.role === 'WORKER') {
                workerData = await Worker.findOne({ userId: user._id }).lean();
            }

            // Determine connection ID based on role
            const connectionId = user.role === 'CLIENT'
                ? `client_${clientData?._id}`
                : `worker_${workerData?._id}`;

            // Store connection
            connections.set(connectionId, {
                ws,
                userId: user._id.toString(),
                role: user.role,
                clientId: clientData?._id.toString(),
                workerId: workerData?._id.toString()
            });

            console.log(`WebSocket connected: ${connectionId} (${user.role})`);

            // Send confirmation
            ws.send(JSON.stringify({
                type: 'CONNECTION_ESTABLISHED',
                message: `Connected as ${user.role}`,
                userId: user._id.toString()
            }));

            // Handle messages from client
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    console.log(`Message from ${connectionId}:`, message);

                    // Echo back for now
                    ws.send(JSON.stringify({
                        type: 'MESSAGE_RECEIVED',
                        receivedMessage: message
                    }));
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
 * Notify a specific client
 * @param {string} clientId - Client ID
 * @param {Object} message - Message to send
 */
function notifyClient(clientId, message) {
    const connectionId = `client_${clientId}`;
    const connection = connections.get(connectionId);

    if (connection && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(message));
        return true;
    }

    return false;
}

/**
 * Notify a specific worker
 * @param {string} workerId - Worker ID
 * @param {Object} message - Message to send
 */
function notifyWorker(workerId, message) {
    const connectionId = `worker_${workerId}`;
    const connection = connections.get(connectionId);

    if (connection && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(message));
        return true;
    }

    return false;
}

/**
 * Broadcast to all workers in specific areas
 * @param {Array} areaIds - Array of area IDs (as strings)
 * @param {Object} message - Message to send
 */
async function notifyWorkersInAreas(areaIds, message) {
    try {
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
        connections: []
    };

    connections.forEach((conn, id) => {
        if (conn.role === 'CLIENT') {
            stats.clients++;
        } else if (conn.role === 'WORKER') {
            stats.workers++;
        }
        stats.connections.push({
            id,
            role: conn.role,
            userId: conn.userId
        });
    });

    return stats;
}

module.exports = {
    initializeWebSocket,
    notifyClient,
    notifyWorker,
    notifyWorkersInAreas,
    getConnectionStats
};
