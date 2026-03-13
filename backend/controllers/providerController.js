const Provider = require('../models/Provider');
const Worker = require('../models/Worker');
const User = require('../models/User');
const Job = require('../models/Job');
const bcrypt = require('bcryptjs');

/**
 * Get Provider Dashboard Stats
 * GET /api/provider/dashboard
 */
const getDashboardStats = async (req, res) => {
    try {
        const userId = req.user._id;

        // Get provider data
        const provider = await Provider.findOne({ userId });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Get workers count
        const workersCount = await Worker.countDocuments({ providerId: provider._id });

        // Get jobs for this provider's workers
        const workers = await Worker.find({ providerId: provider._id }).select('_id');
        const workerIds = workers.map(w => w._id);

        const totalBookings = await Job.countDocuments({ workerId: { $in: workerIds } });
        const completedJobs = await Job.countDocuments({
            workerId: { $in: workerIds },
            status: 'COMPLETED'
        });
        const activeWorkers = await Worker.countDocuments({
            providerId: provider._id,
            isAvailable: true
        });

        // Calculate total revenue from completed jobs
        const revenueData = await Job.aggregate([
            {
                $match: {
                    workerId: { $in: workerIds },
                    status: 'COMPLETED'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$estimatedPrice' }
                }
            }
        ]);

        const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;

        res.json({
            success: true,
            data: {
                totalRevenue: `₹${totalRevenue}`,
                totalBookings,
                completedJobs,
                activeWorkers,
                revenueChange: '+0%', // TODO: Calculate change from last month
                bookingsChange: '+0%',
                jobsChange: '+0%',
                workersChange: `+0`
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard stats'
        });
    }
};

/**
 * Get Provider's Workers
 * GET /api/provider/workers
 */
const getWorkers = async (req, res) => {
    try {
        const userId = req.user._id;

        // Get provider
        const provider = await Provider.findOne({ userId });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Get all workers for this provider
        const workers = await Worker.find({ providerId: provider._id })
            .populate('userId', 'name email phone')
            .populate('areaIds', 'name city')
            .populate('serviceIds', 'name icon')
            .sort({ createdAt: -1 })
            .lean();

        // Transform data for frontend
        const transformedWorkers = workers.map(worker => ({
            id: worker._id,
            name: worker.userId?.name || 'Unknown',
            email: worker.userId?.email,
            phone: worker.userId?.phone,
            role: worker.serviceIds?.map(s => s.name).join(', ') || 'General',
            bio: worker.bio,
            experience: worker.experience,
            hourlyRate: worker.hourlyRate,
            rating: worker.averageRating || 0,
            jobs: worker.completedJobs || 0,
            status: worker.isAvailable ? 'active' : 'inactive',
            areas: worker.areaIds || [],
            services: worker.serviceIds || []
        }));

        res.json({
            success: true,
            data: {
                workers: transformedWorkers
            }
        });
    } catch (error) {
        console.error('Get workers error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching workers'
        });
    }
};

/**
 * Add Worker to Provider's Team
 * POST /api/provider/workers
 */
const addWorker = async (req, res) => {
    try {
        const userId = req.user._id;
        const {
            name,
            email,
            phone,
            password,
            bio,
            experience,
            hourlyRate,
            areaIds,
            serviceIds
        } = req.body;

        // Validation
        if (!name || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and phone are required'
            });
        }

        // Get provider
        const provider = await Provider.findOne({ userId });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email }, { phone }]
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'User with this email or phone already exists'
            });
        }

        // Generate password if not provided
        const workerPassword = password || Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(workerPassword, 10);

        // Create user
        const user = await User.create({
            email,
            password: hashedPassword,
            name,
            phone,
            role: 'WORKER'
        });

        // Create worker profile with provider reference
        const worker = await Worker.create({
            userId: user._id,
            bio: bio || '',
            experience: experience || 0,
            hourlyRate: hourlyRate || 0,
            areaIds: areaIds || [],
            serviceIds: serviceIds || [],
            providerId: provider._id
        });

        // Populate for response
        await worker.populate('userId areaIds serviceIds');

        // Update provider's worker count
        await Provider.findByIdAndUpdate(provider._id, {
            $inc: { totalWorkers: 1 }
        });

        // Prepare response
        const workerResponse = {
            id: worker._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: worker.serviceIds?.map(s => s.name).join(', ') || 'General',
            bio: worker.bio,
            experience: worker.experience,
            hourlyRate: worker.hourlyRate,
            rating: 0,
            jobs: 0,
            status: 'active',
            areas: worker.areaIds || [],
            services: worker.serviceIds || [],
            temporaryPassword: password ? undefined : workerPassword // Only send if auto-generated
        };

        res.status(201).json({
            success: true,
            message: 'Worker added successfully',
            data: {
                worker: workerResponse
            }
        });
    } catch (error) {
        console.error('Add worker error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding worker'
        });
    }
};

/**
 * Get Provider Bookings
 * GET /api/provider/bookings
 */
const getBookings = async (req, res) => {
    try {
        const userId = req.user._id;

        // Get provider
        const provider = await Provider.findOne({ userId });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Get all workers for this provider
        const workers = await Worker.find({ providerId: provider._id }).select('_id');
        const workerIds = workers.map(w => w._id);

        // Get jobs for these workers
        const jobs = await Job.find({ workerId: { $in: workerIds } })
            .populate('clientId', 'userId')
            .populate('workerId', 'userId')
            .populate('serviceId', 'name')
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        // Get user details for clients and workers
        const jobsWithDetails = await Promise.all(jobs.map(async (job) => {
            const clientUser = job.clientId?.userId ? await User.findById(job.clientId.userId).select('name').lean() : null;
            const workerUser = job.workerId?.userId ? await User.findById(job.workerId.userId).select('name').lean() : null;

            return {
                id: job._id,
                client: clientUser?.name || 'Unknown Client',
                service: job.serviceId?.name || 'Unknown Service',
                worker: workerUser?.name || 'Unassigned',
                amount: `₹${job.estimatedPrice || 0}`,
                date: new Date(job.scheduledAt).toLocaleDateString(),
                time: new Date(job.scheduledAt).toLocaleTimeString(),
                status: job.status.toLowerCase()
            };
        }));

        res.json({
            success: true,
            data: {
                bookings: jobsWithDetails
            }
        });
    } catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching bookings'
        });
    }
};

/**
 * Update Worker Details
 * PUT /api/provider/workers/:workerId
 */
const updateWorker = async (req, res) => {
    try {
        const userId = req.user._id;
        const { workerId } = req.params;
        const {
            bio,
            experience,
            hourlyRate,
            areaIds,
            serviceIds
        } = req.body;

        // Get provider
        const provider = await Provider.findOne({ userId });
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Find worker and verify it belongs to this provider
        const worker = await Worker.findOne({
            _id: workerId,
            providerId: provider._id
        });

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: 'Worker not found or does not belong to your team'
            });
        }

        // Update worker fields
        if (bio !== undefined) worker.bio = bio;
        if (experience !== undefined) worker.experience = experience;
        if (hourlyRate !== undefined) worker.hourlyRate = hourlyRate;
        if (areaIds !== undefined) worker.areaIds = areaIds;
        if (serviceIds !== undefined) worker.serviceIds = serviceIds;

        await worker.save();
        await worker.populate('userId areaIds serviceIds');

        res.json({
            success: true,
            message: 'Worker updated successfully',
            data: { worker }
        });
    } catch (error) {
        console.error('Update worker error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating worker'
        });
    }
};

/**
 * Remove Worker from Team
 * DELETE /api/provider/workers/:workerId
 */
const removeWorker = async (req, res) => {
    try {
        const userId = req.user._id;
        const { workerId } = req.params;

        // Get provider
        const provider = await Provider.findOne({ userId });
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Find worker and verify it belongs to this provider
        const worker = await Worker.findOne({
            _id: workerId,
            providerId: provider._id
        });

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: 'Worker not found or does not belong to your team'
            });
        }

        // Remove provider association (soft delete)
        worker.providerId = null;
        await worker.save();

        // Update provider's worker count
        await Provider.findByIdAndUpdate(provider._id, {
            $inc: { totalWorkers: -1 }
        });

        res.json({
            success: true,
            message: 'Worker removed from team'
        });
    } catch (error) {
        console.error('Remove worker error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing worker'
        });
    }
};

/**
 * Update Worker Status/Availability
 * PATCH /api/provider/workers/:workerId/status
 */
const updateWorkerStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        const { workerId } = req.params;
        const { isAvailable } = req.body;

        // Get provider
        const provider = await Provider.findOne({ userId });
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Find worker and verify it belongs to this provider
        const worker = await Worker.findOne({
            _id: workerId,
            providerId: provider._id
        });

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: 'Worker not found or does not belong to your team'
            });
        }

        // Update availability
        if (isAvailable !== undefined) {
            worker.isAvailable = isAvailable;
        }

        await worker.save();

        res.json({
            success: true,
            message: 'Worker status updated',
            data: { worker }
        });
    } catch (error) {
        console.error('Update worker status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating worker status'
        });
    }
};

/**
 * Cancel a booking (Provider cancels a job for their worker)
 * POST /api/provider/bookings/:jobId/cancel
 */
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

        // Verify the job's worker belongs to this provider
        const workerBelongs = await Worker.findOne({ _id: job.workerId, providerId: provider._id });
        if (!workerBelongs) {
            return res.status(403).json({ success: false, message: 'This job does not belong to your team' });
        }

        const cancellableStatuses = ['PENDING', 'ACCEPTED', 'IN_REVIEW', 'IN_PROGRESS'];
        if (!cancellableStatuses.includes(job.status)) {
            return res.status(400).json({ success: false, message: `Job cannot be cancelled from status ${job.status}` });
        }

        job.status = 'CANCELLED';
        await job.save();

        res.json({ success: true, message: 'Booking cancelled successfully' });
    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({ success: false, message: 'Error cancelling booking' });
    }
};

module.exports = {
    getDashboardStats,
    getWorkers,
    addWorker,
    getBookings,
    cancelBooking,
    updateWorker,
    removeWorker,
    updateWorkerStatus
};
