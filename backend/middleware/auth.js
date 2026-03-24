const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Client = require('../models/Client');
const Worker = require('../models/Worker');
const Subscription = require('../models/Subscription');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ success: false, message: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid token - user not found' });
        }

        // Fetch role-specific data
        if (user.role === 'CLIENT') {
            const client = await Client.findOne({ userId: user._id });
            if (client && client.area_id) {
                const Area = require('../models/Area');
                client.areaId = await Area.findById(client.area_id);
            }
            user.client = client;
        } else if (user.role === 'WORKER') {
            const worker = await Worker.findOne({ userId: user._id });
            if (worker) {
                await Worker.populate(worker, ['areaIds', 'serviceIds']);
            }
            user.worker = worker;
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired' });
        }
        return res.status(500).json({ success: false, message: 'Authentication error' });
    }
};

const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        if (req.user.role !== role) {
            return res.status(403).json({ success: false, message: `Access denied. This endpoint requires ${role} role.` });
        }
        next();
    };
};

const checkAIAccess = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'CLIENT') {
            return res.status(403).json({ success: false, message: 'AI access is only available for clients' });
        }

        const subscription = await Subscription.findOne({ clientId: req.user.client._id });

        if (!subscription || !(subscription.isActive || subscription.is_active) || !(subscription.aiAccessEnabled || subscription.ai_access_enabled)) {
            return res.status(403).json({
                success: false,
                message: 'AI access requires an active subscription. Please subscribe for ₹49/month.',
                subscriptionRequired: true
            });
        }

        const endDate = subscription.endDate || subscription.end_date;
        if (endDate && new Date() > new Date(endDate)) {
            await Subscription.updateById(subscription._id, { isActive: false, aiAccessEnabled: false });
            return res.status(403).json({
                success: false,
                message: 'Your subscription has expired. Please renew to continue using AI features.',
                subscriptionExpired: true
            });
        }

        req.subscription = subscription;
        next();
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Error checking AI access eligibility' });
    }
};

module.exports = { authenticateToken, requireRole, checkAIAccess };
