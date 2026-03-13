const bcrypt = require('bcryptjs');
const connectDB = require('../config/database');
const { User, Client, Worker, Area, Service } = require('../models');

async function seed() {
    console.log('🌱 Starting database seeding...\n');

    try {
        // Connect to MongoDB
        await connectDB();

        // ============================================
        // SEED AREAS
        // ============================================
        console.log('📍 Seeding areas...');

        const areaData = [
            { name: 'Kothrud', city: 'Pune', pincode: '411038' },
            { name: 'Warje', city: 'Pune', pincode: '411058' },
            { name: 'Erandwane', city: 'Pune', pincode: '411004' }
        ];

        const areas = [];
        for (const data of areaData) {
            const existing = await Area.findOne({ name: data.name });
            if (!existing) {
                const area = await Area.create(data);
                areas.push(area);
            } else {
                areas.push(existing);
            }
        }

        console.log(`✅ Created ${areas.length} areas\n`);

        // ============================================
        // SEED SERVICES
        // ============================================
        console.log('🔧 Seeding services...');

        const serviceData = [
            { name: 'Plumbing', description: 'Water pipe repairs, installations, and maintenance', icon: '🔧', basePrice: 300 },
            { name: 'Carpentry', description: 'Furniture repair, installation, and custom woodwork', icon: '🪚', basePrice: 400 },
            { name: 'Electrical', description: 'Electrical wiring, repairs, and installations', icon: '⚡', basePrice: 350 },
            { name: 'Cleaning', description: 'House cleaning, deep cleaning, and sanitization', icon: '🧹', basePrice: 250 },
            { name: 'Painting', description: 'Interior and exterior painting services', icon: '🎨', basePrice: 500 },
            { name: 'Appliance Repair', description: 'Repair of home appliances like AC, fridge, washing machine', icon: '🔌', basePrice: 400 }
        ];

        const services = [];
        for (const data of serviceData) {
            const existing = await Service.findOne({ name: data.name });
            if (!existing) {
                const service = await Service.create(data);
                services.push(service);
            } else {
                services.push(existing);
            }
        }

        console.log(`✅ Created ${services.length} services\n`);

        // ============================================
        // SEED TEST USERS
        // ============================================
        console.log('👥 Seeding test users...');

        const hashedPassword = await bcrypt.hash('password123', 10);

        // Create test client
        let testClientUser = await User.findOne({ email: 'client@test.com' });
        if (!testClientUser) {
            testClientUser = await User.create({
                email: 'client@test.com',
                password: hashedPassword,
                name: 'Test Client',
                phone: '9876543210',
                role: 'CLIENT'
            });

            await Client.create({
                userId: testClientUser._id,
                address: 'Test Address, Kothrud',
                areaId: areas[0]._id
            });
        }

        // Create test worker 1 - Plumber
        let testWorker1User = await User.findOne({ email: 'worker1@test.com' });
        if (!testWorker1User) {
            testWorker1User = await User.create({
                email: 'worker1@test.com',
                password: hashedPassword,
                name: 'Rajesh Kumar',
                phone: '9876543211',
                role: 'WORKER'
            });

            await Worker.create({
                userId: testWorker1User._id,
                bio: 'Experienced plumber with 8 years of expertise',
                experience: 8,
                hourlyRate: 400,
                isAvailable: true,
                averageRating: 4.7,
                completedJobs: 156,
                totalJobs: 160,
                areaIds: [areas[0]._id, areas[1]._id], // Kothrud, Warje
                serviceIds: [services[0]._id] // Plumbing
            });
        }

        // Create test worker 2 - Electrician
        let testWorker2User = await User.findOne({ email: 'worker2@test.com' });
        if (!testWorker2User) {
            testWorker2User = await User.create({
                email: 'worker2@test.com',
                password: hashedPassword,
                name: 'Amit Deshmukh',
                phone: '9876543212',
                role: 'WORKER'
            });

            await Worker.create({
                userId: testWorker2User._id,
                bio: 'Professional electrician specializing in home wiring',
                experience: 5,
                hourlyRate: 350,
                isAvailable: true,
                averageRating: 4.5,
                completedJobs: 89,
                totalJobs: 95,
                areaIds: [areas[0]._id, areas[2]._id], // Kothrud, Erandwane
                serviceIds: [services[2]._id] // Electrical
            });
        }

        // Create test worker 3 - Carpenter
        let testWorker3User = await User.findOne({ email: 'worker3@test.com' });
        if (!testWorker3User) {
            testWorker3User = await User.create({
                email: 'worker3@test.com',
                password: hashedPassword,
                name: 'Priya Sharma',
                phone: '9876543213',
                role: 'WORKER'
            });

            await Worker.create({
                userId: testWorker3User._id,
                bio: 'Expert carpenter for furniture and woodwork',
                experience: 10,
                hourlyRate: 450,
                isAvailable: true,
                averageRating: 4.9,
                completedJobs: 234,
                totalJobs: 240,
                areaIds: [areas[1]._id, areas[2]._id], // Warje, Erandwane
                serviceIds: [services[1]._id] // Carpentry
            });
        }

        console.log('✅ Created test users:');
        console.log('   📧 Client: client@test.com / password123');
        console.log('   📧 Worker 1 (Plumber): worker1@test.com / password123');
        console.log('   📧 Worker 2 (Electrician): worker2@test.com / password123');
        console.log('   📧 Worker 3 (Carpenter): worker3@test.com / password123\n');

        console.log('✨ Database seeding completed successfully!\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
}

seed();
