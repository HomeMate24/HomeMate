/**
 * Seed script — inserts areas and services if they don't exist yet.
 * Run from the backend directory:  node scripts/seedData.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Area = require('../models/Area');
const Service = require('../models/Service');

const AREAS = [
    { name: 'Kothrud', city: 'Pune', pincode: '411038' },
    { name: 'Warje-Malwadi', city: 'Pune', pincode: '411058' },
    { name: 'Erandwane', city: 'Pune', pincode: '411006' },
];

const SERVICES = [
    { name: 'Plumbing', description: 'Pipe fitting, leak repair, drainage' },
    { name: 'Carpentry', description: 'Furniture repair, woodwork, installations' },
    { name: 'Cleaning', description: 'Home and office deep cleaning' },
    { name: 'Furniture', description: 'Furniture assembly and moving' },
    { name: 'Painting', description: 'Interior and exterior painting' },
    { name: 'Electrical', description: 'Wiring, repairs, and installations' },
    { name: 'Waterproofing', description: 'Roof and wall waterproofing' },
    { name: 'AC Service', description: 'AC installation, servicing, and repair' },
];

async function seed() {
    try {
        const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
        if (!uri) throw new Error('No MongoDB URI found in .env (MONGODB_URI or DATABASE_URL)');

        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB');

        // Seed areas
        for (const a of AREAS) {
            const exists = await Area.findOne({ name: a.name });
            if (!exists) {
                await Area.create(a);
                console.log(`  ➕ Area created: ${a.name}`);
            } else {
                console.log(`  ✔  Area already exists: ${a.name}`);
            }
        }

        // Seed services
        for (const s of SERVICES) {
            const exists = await Service.findOne({ name: s.name });
            if (!exists) {
                await Service.create(s);
                console.log(`  ➕ Service created: ${s.name}`);
            } else {
                console.log(`  ✔  Service already exists: ${s.name}`);
            }
        }

        console.log('\n🎉 Seed complete!');
    } catch (err) {
        console.error('❌ Seed failed:', err.message);
    } finally {
        await mongoose.disconnect();
    }
}

seed();
