// Script to clear all users from database
// WARNING: This deletes ALL users!
// Run with: node backend/scripts/clearUsers.js

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Client = require('../models/Client');
const Worker = require('../models/Worker');
const Provider = require('../models/Provider');

async function clearUsers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/homemate-hub');
        console.log('Connected to MongoDB');

        // Delete all users and related data
        const usersDeleted = await User.deleteMany({});
        const clientsDeleted = await Client.deleteMany({});
        const workersDeleted = await Worker.deleteMany({});
        const providersDeleted = await Provider.deleteMany({});

        console.log('\n=== CLEANUP COMPLETE ===\n');
        console.log(`Users deleted: ${usersDeleted.deletedCount}`);
        console.log(`Clients deleted: ${clientsDeleted.deletedCount}`);
        console.log(`Workers deleted: ${workersDeleted.deletedCount}`);
        console.log(`Providers deleted: ${providersDeleted.deletedCount}`);

        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

clearUsers();
