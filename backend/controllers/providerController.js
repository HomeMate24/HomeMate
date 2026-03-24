const Provider = require('../models/Provider');
const Worker = require('../models/Worker');
const User = require('../models/User');
const Job = require('../models/Job');
const bcrypt = require('bcryptjs');

const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user._id;
        const provider = await Provider.findOne({ userId });

        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        const workersCount = await Worker.countDocuments({ providerId: provider._id });
        const workers = await Worker.find({ providerId: provider._id }, { select: 'id' });
        const workerIds = workers.map(w => w._id || w.id);

        let totalBookings = 0, completedJobs = 0, totalRevenue = 0;

        if (workerIds.length > 0) {
            totalBookings = await Job.countDocuments({ workerIdIn: workerIds });
            completedJobs = await Job.countDocuments({ workerIdIn: workerIds, status: 'COMPLETED' });
            totalRevenue = await Job.sumEstimatedPrice(workerIds);
        }

        const activeWorkers = await Worker.countDocuments({ providerId: provider._id, isAvailable: true });

        res.json({
            success: true,
            data: {
                totalRevenue: `₹${totalRevenue}`,
                totalBookings,
                completedJobs,
                activeWorkers,
                revenueChange: '+0%',
                bookingsChange: '+0%',
                jobsChange: '+0%',
                workersChange: '+0'
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Error fetching dashboard stats' });
    }
};

const getWorkers = async (req, res) => {
    try {
        const userId = req.user._id;
        const provider = await Provider.findOne({ userId });

        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        const workers = await Worker.find({ providerId: provider._id });

        for (const worker of workers) {
            await Worker.populate(worker, ['userId', 'areaIds', 'serviceIds']);
        }

        const transformedWorkers = workers.map(worker => ({
            id: worker._id,
            name: worker.userId?.name || 'Unknown',
            email: worker.userId?.email,
            phone: worker.userId?.phone,
            role: Array.isArray(worker.serviceIds) ? worker.serviceIds.map(s => s.name).join(', ') : 'General',
            bio: worker.bio,
            experience: worker.experience,
            hourlyRate: worker.hourlyRate || worker.hourly_rate,
            rating: worker.averageRating || worker.average_rating || 0,
            jobs: worker.completedJobs || worker.completed_jobs || 0,
            status: (worker.isAvailable !== undefined ? worker.isAvailable : worker.is_available) ? 'active' : 'inactive',
            areas: worker.areaIds || [],
            services: worker.serviceIds || []
        }));

        res.json({ success: true, data: { workers: transformedWorkers } });
    } catch (error) {
        console.error('Get workers error:', error);
        res.status(500).json({ success: false, message: 'Error fetching workers' });
    }
};

const addWorker = async (req, res) => {
    try {
        const userId = req.user._id;
        const { name, email, phone, password, bio, experience, hourlyRate, areaIds, serviceIds } = req.body;

        if (!name || !email || !phone) {
            return res.status(400).json({ success: false, message: 'Name, email, and phone are required' });
        }

        const provider = await Provider.findOne({ userId });
        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'User with this email or phone already exists' });
        }

        const workerPassword = password || Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(workerPassword, 10);

        const user = await User.create({ email, password: hashedPassword, name, phone, role: 'WORKER' });

        const worker = await Worker.create({
            userId: user._id,
            bio: bio || '',
            experience: experience || 0,
            hourlyRate: hourlyRate || 0,
            areaIds: areaIds || [],
            serviceIds: serviceIds || [],
            providerId: provider._id
        });

        await Worker.populate(worker, ['userId', 'areaIds', 'serviceIds']);
        await Provider.increment(provider._id, 'totalWorkers', 1);

        const workerResponse = {
            id: worker._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: Array.isArray(worker.serviceIds) ? worker.serviceIds.map(s => s.name).join(', ') : 'General',
            bio: worker.bio,
            experience: worker.experience,
            hourlyRate: worker.hourlyRate || worker.hourly_rate,
            rating: 0,
            jobs: 0,
            status: 'active',
            areas: worker.areaIds || [],
            services: worker.serviceIds || [],
            temporaryPassword: password ? undefined : workerPassword
        };

        res.status(201).json({ success: true, message: 'Worker added successfully', data: { worker: workerResponse } });
    } catch (error) {
        console.error('Add worker error:', error);
        res.status(500).json({ success: false, message: 'Error adding worker' });
    }
};

const getBookings = async (req, res) => {
    try {
        const userId = req.user._id;
        const provider = await Provider.findOne({ userId });

        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        const workers = await Worker.find({ providerId: provider._id }, { select: 'id' });
        const workerIds = workers.map(w => w._id || w.id);

        if (workerIds.length === 0) {
            return res.json({ success: true, data: { bookings: [] } });
        }

        const jobs = await Job.find({ workerIdIn: workerIds }, { orderBy: ['createdAt', 'desc'], limit: 50 });

        const jobsWithDetails = await Promise.all(jobs.map(async (job) => {
            // Get client user name
            let clientName = 'Unknown Client';
            if (job.client_id || job.clientId) {
                const Client = require('../models/Client');
                const client = await Client.findById(job.client_id || job.clientId);
                if (client) {
                    const clientUser = await User.findById(client.user_id);
                    if (clientUser) clientName = clientUser.name;
                }
            }

            // Get worker user name
            let workerName = 'Unassigned';
            if (job.worker_id || job.workerId) {
                const w = await Worker.findById(job.worker_id || job.workerId);
                if (w) {
                    const wUser = await User.findById(w.user_id);
                    if (wUser) workerName = wUser.name;
                }
            }

            // Get service name
            let serviceName = 'Unknown Service';
            if (job.service_id || job.serviceId) {
                const Service = require('../models/Service');
                const service = await Service.findById(job.service_id || job.serviceId);
                if (service) serviceName = service.name;
            }

            const scheduledAt = job.scheduled_at || job.scheduledAt;
            return {
                id: job._id,
                client: clientName,
                service: serviceName,
                worker: workerName,
                amount: `₹${job.estimated_price || job.estimatedPrice || 0}`,
                date: new Date(scheduledAt).toLocaleDateString(),
                time: new Date(scheduledAt).toLocaleTimeString(),
                status: job.status.toLowerCase()
            };
        }));

        res.json({ success: true, data: { bookings: jobsWithDetails } });
    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({ success: false, message: 'Error fetching bookings' });
    }
};

const updateWorker = async (req, res) => {
    try {
        const userId = req.user._id;
        const { workerId } = req.params;
        const { bio, experience, hourlyRate, areaIds, serviceIds } = req.body;

        const provider = await Provider.findOne({ userId });
        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        const worker = await Worker.findOne({ _id: workerId, providerId: provider._id });
        if (!worker) {
            return res.status(404).json({ success: false, message: 'Worker not found or does not belong to your team' });
        }

        const updates = {};
        if (bio !== undefined) updates.bio = bio;
        if (experience !== undefined) updates.experience = experience;
        if (hourlyRate !== undefined) updates.hourlyRate = hourlyRate;

        if (Object.keys(updates).length > 0) {
            await Worker.updateById(workerId, updates);
        }
        if (areaIds !== undefined) await Worker.setAreaIds(workerId, areaIds);
        if (serviceIds !== undefined) await Worker.setServiceIds(workerId, serviceIds);

        const updatedWorker = await Worker.findById(workerId);
        await Worker.populate(updatedWorker, ['userId', 'areaIds', 'serviceIds']);

        res.json({ success: true, message: 'Worker updated successfully', data: { worker: updatedWorker } });
    } catch (error) {
        console.error('Update worker error:', error);
        res.status(500).json({ success: false, message: 'Error updating worker' });
    }
};

const removeWorker = async (req, res) => {
    try {
        const userId = req.user._id;
        const { workerId } = req.params;

        const provider = await Provider.findOne({ userId });
        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        const worker = await Worker.findOne({ _id: workerId, providerId: provider._id });
        if (!worker) {
            return res.status(404).json({ success: false, message: 'Worker not found or does not belong to your team' });
        }

        await Worker.updateById(workerId, { providerId: null });
        await Provider.increment(provider._id, 'totalWorkers', -1);

        res.json({ success: true, message: 'Worker removed from team' });
    } catch (error) {
        console.error('Remove worker error:', error);
        res.status(500).json({ success: false, message: 'Error removing worker' });
    }
};

const updateWorkerStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        const { workerId } = req.params;
        const { isAvailable } = req.body;

        const provider = await Provider.findOne({ userId });
        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        const worker = await Worker.findOne({ _id: workerId, providerId: provider._id });
        if (!worker) {
            return res.status(404).json({ success: false, message: 'Worker not found or does not belong to your team' });
        }

        if (isAvailable !== undefined) {
            await Worker.updateById(workerId, { isAvailable });
        }

        const updated = await Worker.findById(workerId);
        res.json({ success: true, message: 'Worker status updated', data: { worker: updated } });
    } catch (error) {
        console.error('Update worker status error:', error);
        res.status(500).json({ success: false, message: 'Error updating worker status' });
    }
};

const cancelBooking = async (req, res) => {
    try {
        const userId = req.user._id;
        const { jobId } = req.params;

        const provider = await Provider.findOne({ userId });
        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        const workerBelongs = await Worker.findOne({ _id: job.worker_id || job.workerId, providerId: provider._id });
        if (!workerBelongs) {
            return res.status(403).json({ success: false, message: 'This job does not belong to your team' });
        }

        const cancellableStatuses = ['PENDING', 'ACCEPTED', 'IN_REVIEW', 'IN_PROGRESS'];
        if (!cancellableStatuses.includes(job.status)) {
            return res.status(400).json({ success: false, message: `Job cannot be cancelled from status ${job.status}` });
        }

        await Job.updateById(jobId, { status: 'CANCELLED' });

        res.json({ success: true, message: 'Booking cancelled successfully' });
    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({ success: false, message: 'Error cancelling booking' });
    }
};

module.exports = { getDashboardStats, getWorkers, addWorker, getBookings, cancelBooking, updateWorker, removeWorker, updateWorkerStatus };
