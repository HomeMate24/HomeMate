const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict limiter for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per 15 minutes
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.'
    },
    skipSuccessfulRequests: true,
});

// AI endpoint limiter (prevent abuse)
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 AI requests per hour
    message: {
        success: false,
        message: 'AI request limit reached. Please try again later.'
    },
});

module.exports = {
    apiLimiter,
    authLimiter,
    aiLimiter
};
