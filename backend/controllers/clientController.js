const Worker = require('../models/Worker');
const Job = require('../models/Job');
const Rating = require('../models/Rating');
const Payment = require('../models/Payment');
const { notifyWorker } = require('../websocket/websocket');

/**
 * Browse area-wise workers
 * GET /api/workers
 */
const browseWorkers = async (req, res) => {
    try {
        const { areaId, serviceId } = req.query;

        if (!areaId) {
            return res.status(400).json({
                success: false,
                message: 'Area ID is required'
            });
        }

        // Build filter - workers who work in this area
        const workerFilter = {
            isAvailable: true,
            areaIds: areaId
        };

        if (serviceId) {
            workerFilter.serviceIds = serviceId;
        }

        // Get workers in the area
        const workers = await Worker.find(workerFilter)
            .populate('userId', 'name phone email')
            .populate('areaIds')
            .populate('serviceIds')
            .sort({ averageRating: -1 })
            .lean();

        // Get area-specific ratings for each worker
        for (let worker of workers) {
            const areaRatings = await Rating.find({
                workerId: worker._id
            })
                .populate({
                    path: 'jobId',
                    match: { areaId: areaId },
                    select: 'areaId'
                })
                .select('rating');

            // Filter out null jobIds (where area doesn't match)
            const validAreaRatings = areaRatings.filter(r => r.jobId !== null);

            const areaRating = validAreaRatings.length > 0
                ? validAreaRatings.reduce((sum, r) => sum + r.rating, 0) / validAreaRatings.length
                : worker.averageRating;

            worker.areaSpecificRating = areaRating;
            worker.areaReviewCount = validAreaRatings.length;
        }

        res.json({
            success: true,
            data: { workers }
        });
    } catch (error) {
        console.error('Browse workers error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching workers'
        });
    }
};

/**
 * Create service booking
 * POST /api/jobs
 */
const createJob = async (req, res) => {
    try {
        const clientId = req.user.client._id;
        const { serviceId, areaId, description, scheduledAt, address, estimatedPrice, workerId } = req.body;

        // Validation
        if (!serviceId || !areaId || !description || !address) {
            return res.status(400).json({
                success: false,
                message: 'serviceId, areaId, description, and address are required'
            });
        }

        // Use provided scheduledAt or default to now + 1 hour
        const scheduledDate = scheduledAt ? new Date(scheduledAt) : new Date(Date.now() + 60 * 60 * 1000);

        // Create job
        const jobData = {
            clientId,
            serviceId,
            areaId,
            description,
            scheduledAt: scheduledDate,
            address,
            estimatedPrice: estimatedPrice || 0
        };

        // If a specific worker is targeted, pre-assign them
        if (workerId) {
            jobData.workerId = workerId;
        }

        const job = await Job.create(jobData);

        // Populate for response
        await job.populate([
            {
                path: 'clientId',
                populate: [
                    {
                        path: 'userId',
                        select: 'name phone'
                    },
                    { path: 'areaId' }
                ]
            },
            { path: 'serviceId' },
            { path: 'areaId' }
        ]);

        // Notify worker(s) via WebSocket
        if (workerId) {
            // Notify specific worker
            notifyWorker(workerId.toString(), {
                type: 'NEW_JOB_REQUEST',
                job
            });
        } else {
            // Notify all available workers in this area with this service
            const workersInArea = await Worker.find({
                isAvailable: true,
                areaIds: areaId,
                serviceIds: serviceId
            }).select('_id');

            workersInArea.forEach(worker => {
                notifyWorker(worker._id.toString(), {
                    type: 'NEW_JOB_REQUEST',
                    job
                });
            });
        }

        res.status(201).json({
            success: true,
            message: 'Job created successfully',
            data: { job }
        });
    } catch (error) {
        console.error('Create job error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating job'
        });
    }
};

/**
 * Get client's job history
 * GET /api/jobs
 */
const getClientJobs = async (req, res) => {
    try {
        const clientId = req.user.client._id;
        const { status } = req.query;

        const filter = {
            clientId,
            ...(status && { status })
        };

        const jobs = await Job.find(filter)
            .populate('serviceId')
            .populate('areaId')
            .populate({
                path: 'workerId',
                populate: {
                    path: 'userId',
                    select: 'name phone'
                }
            })
            .sort({ createdAt: -1 })
            .lean();

        // Get payment and rating for each job
        for (let job of jobs) {
            const payment = await Payment.findOne({ jobId: job._id });
            const rating = await Rating.findOne({ jobId: job._id });
            job.payment = payment;
            job.rating = rating;
        }

        res.json({
            success: true,
            data: { jobs }
        });
    } catch (error) {
        console.error('Get client jobs error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching jobs'
        });
    }
};

/**
 * Get job details
 * GET /api/jobs/:jobId
 */
const getJobDetails = async (req, res) => {
    try {
        const { jobId } = req.params;
        const clientId = req.user.client._id;

        const job = await Job.findOne({
            _id: jobId,
            clientId
        })
            .populate('serviceId')
            .populate('areaId')
            .populate({
                path: 'workerId',
                populate: {
                    path: 'userId',
                    select: 'name phone email'
                }
            })
            .lean();

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        // Get payment and rating
        const payment = await Payment.findOne({ jobId: job._id });
        const rating = await Rating.findOne({ jobId: job._id });
        job.payment = payment;
        job.rating = rating;

        res.json({
            success: true,
            data: { job }
        });
    } catch (error) {
        console.error('Get job details error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching job details'
        });
    }
};

/**
 * Cancel pending job
 * POST /api/jobs/:jobId/cancel
 */
const cancelJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const clientId = req.user.client._id;

        const job = await Job.findOne({
            _id: jobId,
            clientId
        });

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        if (job.status !== 'PENDING' && job.status !== 'ACCEPTED') {
            return res.status(400).json({
                success: false,
                message: 'Only pending or accepted jobs can be cancelled'
            });
        }

        job.status = 'CANCELLED';
        await job.save();

        // Notify worker if job was accepted
        if (job.workerId) {
            notifyWorker(job.workerId.toString(), {
                type: 'JOB_CANCELLED',
                jobId: job._id.toString()
            });
        }

        res.json({
            success: true,
            message: 'Job cancelled successfully',
            data: { job }
        });
    } catch (error) {
        console.error('Cancel job error:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling job'
        });
    }
};

/**
 * Submit rating and review
 * POST /api/jobs/:jobId/rate
 */
const rateJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { rating, review } = req.body;
        const clientId = req.user.client._id;

        // Validation
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: 'Rating must be between 1 and 5'
            });
        }

        const job = await Job.findOne({
            _id: jobId,
            clientId,
            status: 'COMPLETED'
        });

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Completed job not found'
            });
        }

        if (!job.workerId) {
            return res.status(400).json({
                success: false,
                message: 'No worker assigned to this job'
            });
        }

        // Check if already rated
        const existingRating = await Rating.findOne({ jobId });

        if (existingRating) {
            return res.status(400).json({
                success: false,
                message: 'Job already rated'
            });
        }

        // Create rating
        const newRating = await Rating.create({
            jobId,
            clientId,
            workerId: job.workerId,
            rating,
            review
        });

        // Update worker's average rating
        const allRatings = await Rating.find({ workerId: job.workerId }).select('rating');
        const averageRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

        await Worker.findByIdAndUpdate(job.workerId, { averageRating });

        res.status(201).json({
            success: true,
            message: 'Rating submitted successfully',
            data: { rating: newRating }
        });
    } catch (error) {
        console.error('Rate job error:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting rating'
        });
    }
};

/**
 * Get public profile of a specific worker (includes all ratings/reviews)
 * GET /api/client/workers/:workerId/profile
 */
const getWorkerPublicProfile = async (req, res) => {
    try {
        const { workerId } = req.params;

        const worker = await Worker.findById(workerId)
            .populate('userId', 'name phone email')
            .populate('areaIds')
            .populate('serviceIds')
            .lean();

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: 'Worker not found'
            });
        }

        // Get all ratings/reviews for this worker
        const ratings = await Rating.find({ workerId })
            .populate({
                path: 'clientId',
                populate: { path: 'userId', select: 'name' }
            })
            .populate({
                path: 'jobId',
                select: 'serviceId completedAt',
                populate: { path: 'serviceId', select: 'name' }
            })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: { worker, ratings }
        });
    } catch (error) {
        console.error('Get worker public profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching worker profile'
        });
    }
};

/**
 * Search workers by name
 * GET /api/client/workers/search?name=...
 */
const searchWorkersByName = async (req, res) => {
    try {
        const { name } = req.query;
        if (!name || name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Name query must be at least 2 characters'
            });
        }

        // Find matching users first, then get their worker profiles
        const User = require('../models/User');
        const matchingUsers = await User.find({
            name: { $regex: name.trim(), $options: 'i' },
            role: 'WORKER'
        }).select('_id').lean();

        const userIds = matchingUsers.map(u => u._id);

        const workers = await Worker.find({ userId: { $in: userIds } })
            .populate('userId', 'name phone email')
            .populate('areaIds')
            .populate('serviceIds')
            .lean();

        // Attach review count
        for (const worker of workers) {
            const ratingCount = await Rating.countDocuments({ workerId: worker._id });
            worker.areaReviewCount = ratingCount;
        }

        res.json({
            success: true,
            data: { workers }
        });
    } catch (error) {
        console.error('Search workers by name error:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching workers'
        });
    }
};

module.exports = {
    browseWorkers,
    createJob,
    getClientJobs,
    getJobDetails,
    cancelJob,
    rateJob,
    getWorkerPublicProfile,
    searchWorkersByName
};
