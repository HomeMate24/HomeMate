const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.DATABASE_URL, {
            // Modern Mongoose no longer needs these options, but keeping for reference
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of hanging
        });

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        console.log(`📦 Database: ${conn.connection.name}`);
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB disconnected');
        });

        return conn;
    } catch (error) {
        console.error('❌ Error connecting to MongoDB:', error.message);
        console.warn('\n⚠️  WARNING: MongoDB is not available!');
        console.warn('📝 The server will start but database operations will fail.');
        console.warn('\n💡 To fix this, you have 3 options:');
        console.warn('   1. Install MongoDB locally: https://www.mongodb.com/try/download/community');
        console.warn('   2. Use MongoDB Atlas (free cloud): https://www.mongodb.com/cloud/atlas');
        console.warn('   3. Update DATABASE_URL in backend/.env with your MongoDB connection string\n');
        
        // In development mode, don't exit - allow server to start
        if (process.env.NODE_ENV !== 'production') {
            console.warn('🔧 Running in DEVELOPMENT mode without database...\n');
            return null;
        }
        
        // In production, database is required
        process.exit(1);
    }
};

module.exports = connectDB;
