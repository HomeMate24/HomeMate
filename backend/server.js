require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/database');
const { apiLimiter } = require('./middleware/rateLimiter');
const routes = require('./routes');
const { initializeWebSocket } = require('./websocket/websocket');
const { startExpiryChecker } = require('./jobs/expiryChecker');

// Initialize MongoDB connection (optional in development)
connectDB().catch(err => {
    console.error('Database initialization failed:', err.message);
});


const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

// Request logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api', apiLimiter);

// ============================================
// ROUTES
// ============================================

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to HomeMate Hub API',
        version: '1.0.0',
        documentation: '/api/health'
    });
});

app.use('/api', routes);

// ============================================
// ERROR HANDLING
// ============================================

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);

    // MongoDB/Mongoose errors
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        return res.status(400).json({
            success: false,
            message: 'Database operation failed',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    // Mongoose validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: Object.values(err.errors).map(e => e.message)
        });
    }

    // Duplicate key errors
    if (err.code === 11000) {
        return res.status(400).json({
            success: false,
            message: 'Duplicate entry found',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Authentication failed'
        });
    }

    // Default error
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ============================================
// SERVER INITIALIZATION
// ============================================

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket
initializeWebSocket(server);

// Start server
server.listen(PORT, () => {
    console.log('╔════════════════════════════════════════╗');
    console.log('║     HomeMate Hub Backend Server       ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🔌 WebSocket URL: ws://localhost:${PORT}?token=YOUR_JWT_TOKEN`);
    console.log('═══════════════════════════════════════════\n');

    // Start background job for checking expired requests
    startExpiryChecker();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

module.exports = app;
