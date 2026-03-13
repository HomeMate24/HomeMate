// Quick script to check users in database
// Run with: node backend/scripts/checkUsers.js

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function checkUsers() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/homemate-hub');
        console.log('Connected to MongoDB');

        // Get all users
        const users = await User.find({}).select('email name role createdAt');

        console.log('\n=== USERS IN DATABASE ===\n');
        if (users.length === 0) {
            console.log('No users found in database');
        } else {
            users.forEach((user, index) => {
                console.log(`${index + 1}. Email: ${user.email}`);
                console.log(`   Name: ${user.name}`);
                console.log(`   Role: ${user.role}`);
                console.log(`   Created: ${user.createdAt}`);
                console.log(`   ID: ${user._id}`);
                console.log('');
            });
            console.log(`Total users: ${users.length}`);
        }

        await mongoose.connection.close();
        console.log('\nDatabase connection closed');
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUsers();
