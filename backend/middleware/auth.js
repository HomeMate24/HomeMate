const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Client = require('../models/Client');
const Worker = require('../models/Worker');
const Subscription = require('../models/Subscription');

/**
 * Middleware to authenticate JWT token
 * Attaches user object to req.user
 */
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch user from database
        const user = await User.findById(decoded.userId).lean();

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token - user not found'
            });
        }

        // Fetch role-specific data
        if (user.role === 'CLIENT') {
            const client = await Client.findOne({ userId: user._id })
                .populate('areaId')
                .lean();
            user.client = client;
        } else if (user.role === 'WORKER') {
            const worker = await Worker.findOne({ userId: user._id })
                .populate('areaIds serviceIds')
                .lean();
            user.worker = worker;
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

/**
 * Middleware to require specific role
 * @param {string} role - Required role (CLIENT or WORKER)
 */
const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (req.user.role !== role) {
            return res.status(403).json({
                success: false,
                message: `Access denied. This endpoint requires ${role} role.`
            });
        }

        next();
    };
};

/**
 * Middleware to check AI access eligibility
 * Only for clients with active subscription
 */
const checkAIAccess = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'CLIENT') {
            return res.status(403).json({
                success: false,
                message: 'AI access is only available for clients'
            });
        }

        // Check if client has active subscription
        const subscription = await Subscription.findOne({ clientId: req.user.client._id });

        if (!subscription || !subscription.isActive || !subscription.aiAccessEnabled) {
            return res.status(403).json({
                success: false,
                message: 'AI access requires an active subscription. Please subscribe for ₹49/month.',
                subscriptionRequired: true
            });
        }

        // Check if subscription has expired
        if (subscription.endDate && new Date() > subscription.endDate) {
            // Deactivate expired subscription
            subscription.isActive = false;
            subscription.aiAccessEnabled = false;
            await subscription.save();

            return res.status(403).json({
                success: false,
                message: 'Your subscription has expired. Please renew to continue using AI features.',
                subscriptionExpired: true
            });
        }

        // Attach subscription to request
        req.subscription = subscription;
        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error checking AI access eligibility'
        });
    }
};

module.exports = {
    authenticateToken,
    requireRole,
    checkAIAccess
};
