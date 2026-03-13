const connectDB = require('../config/database');
const { User, Client, Worker, Area, Service, Job } = require('../models');

async function viewDatabase() {
    try {
        await connectDB();

        console.log('\n📊 Database Overview\n');
        console.log('='.repeat(50));

        // Count documents
        const counts = {
            users: await User.countDocuments(),
            clients: await Client.countDocuments(),
            workers: await Worker.countDocuments(),
            areas: await Area.countDocuments(),
            services: await Service.countDocuments(),
            jobs: await Job.countDocuments()
        };

        console.log('\n📈 Document Counts:');
        Object.entries(counts).forEach(([collection, count]) => {
            console.log(`   ${collection.padEnd(15)}: ${count}`);
        });

        // Show areas
        console.log('\n📍 Areas:');
        const areas = await Area.find();
        areas.forEach(area => {
            console.log(`   - ${area.name} (${area.city}) - ${area.pincode || 'N/A'}`);
        });

        // Show services
        console.log('\n🔧 Services:');
        const services = await Service.find();
        services.forEach(service => {
            console.log(`   - ${service.name} (₹${service.basePrice})`);
        });

        // Show users
        console.log('\n👥 Users:');
        const users = await User.find().select('name email role');
        users.forEach(user => {
            console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
        });

        // Show workers with details
        console.log('\n👷 Workers:');
        const workers = await Worker.find()
            .populate('userId', 'name email')
            .populate('areaIds', 'name')
            .populate('serviceIds', 'name');

        workers.forEach(worker => {
            console.log(`\n   ${worker.userId.name} (${worker.userId.email})`);
            console.log(`      Rating: ⭐ ${worker.averageRating}/5.0`);
            console.log(`      Jobs: ${worker.completedJobs}/${worker.totalJobs} completed`);
            console.log(`      Areas: ${worker.areaIds.map(a => a.name).join(', ')}`);
            console.log(`      Services: ${worker.serviceIds.map(s => s.name).join(', ')}`);
        });

        console.log('\n' + '='.repeat(50));
        console.log('✅ Database view completed!\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

viewDatabase();
