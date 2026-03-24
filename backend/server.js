require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const { apiLimiter } = require('./middleware/rateLimiter');
const routes = require('./routes');
const { initializeWebSocket } = require('./websocket/websocket');
const { startExpiryChecker } = require('./jobs/expiryChecker');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

app.use((err, req, res, next) => {
    console.error('Global error handler:', err);

    // Supabase / PostgreSQL errors
    if (err.code && err.code.startsWith('PGRST') || err.code === '23505' || err.code === '23503') {
        return res.status(400).json({
            success: false,
            message: 'Database operation failed',
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

const server = http.createServer(app);

initializeWebSocket(server);

server.listen(PORT, () => {
    console.log('╔════════════════════════════════════════╗');
    console.log('║     HomeMate Hub Backend Server       ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🔌 WebSocket URL: ws://localhost:${PORT}?token=YOUR_JWT_TOKEN`);
    console.log(`🗄️  Database: Supabase (PostgreSQL)`);
    console.log('═══════════════════════════════════════════\n');

    startExpiryChecker();
});

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
