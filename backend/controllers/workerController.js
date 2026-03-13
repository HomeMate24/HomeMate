const Worker = require('../models/Worker');
const Job = require('../models/Job');
const Payment = require('../models/Payment');
const { notifyClient } = require('../websocket/websocket');

/**
 * Get worker's job requests (area-filtered)
 * GET /api/workers/jobs
 */
const getWorkerJobs = async (req, res) => {
    try {
        const workerId = req.user.worker._id;
        const { status } = req.query;

        // Get worker's areas
        const worker = await Worker.findById(workerId).select('areaIds');
        const areaIds = worker.areaIds;

        // Build filter
        const filter = {
            areaId: { $in: areaIds },
            ...(status && { status })
        };

        // Get jobs from worker's areas with populated fields
        const jobs = await Job.find(filter)
            .populate({
                path: 'clientId',
                populate: [
                    {
                        path: 'userId',
                        select: 'name phone email'
                    },
                    {
                        path: 'areaId'
                    }
                ]
            })
            .populate('serviceId')
            .populate('areaId')
            .populate({
                path: 'workerId',
                populate: {
                    path: 'userId',
                    select: 'name phone'
                }
            })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: { jobs }
        });
    } catch (error) {
        console.error('Get worker jobs error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching jobs'
        });
    }
};

/**
 * Accept job request
 * POST /api/workers/jobs/:jobId/accept
 */
const acceptJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const workerId = req.user.worker._id;

        // Get job with area info
        const job = await Job.findById(jobId)
            .populate('areaId')
            .populate('clientId');

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        // Check if job is still pending
        if (job.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: `Job is already ${job.status.toLowerCase()}`
            });
        }

        // Verify worker works in this area
        const worker = await Worker.findById(workerId);
        if (!worker.areaIds.includes(job.areaId._id.toString())) {
            return res.status(403).json({
                success: false,
                message: 'You do not service this area'
            });
        }

        // Accept the job
        job.workerId = workerId;
        job.status = 'ACCEPTED';
        job.acceptedAt = new Date();
        // Set 24-hour expiry from acceptance
        job.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await job.save();

        // Populate for response
        await job.populate([
            {
                path: 'clientId',
                populate: {
                    path: 'userId',
                    select: 'name phone email'
                }
            },
            {
                path: 'workerId',
                populate: {
                    path: 'userId',
                    select: 'name phone'
                }
            },
            { path: 'serviceId' },
            { path: 'areaId' }
        ]);

        // Update worker stats
        await Worker.findByIdAndUpdate(workerId, {
            $inc: { totalJobs: 1 }
        });

        // Notify client via WebSocket
        notifyClient(job.clientId._id.toString(), {
            type: 'SERVICE_REQUEST_ACCEPTED',
            job: job,
            message: 'Worker has accepted your service request. You have 24 hours to complete it.'
        });

        res.json({
            success: true,
            message: 'Job accepted successfully',
            data: { job }
        });
    } catch (error) {
        console.error('Accept job error:', error);
        res.status(500).json({
            success: false,
            message: 'Error accepting job'
        });
    }
};

/**
 * Reject job request
 * POST /api/workers/jobs/:jobId/reject
 */
const rejectJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const workerId = req.user.worker._id;

        const job = await Job.findById(jobId).populate('areaId');

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        if (job.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: `Job is already ${job.status.toLowerCase()}`
            });
        }

        // Verify worker works in this area
        const worker = await Worker.findById(workerId);
        if (!worker.areaIds.includes(job.areaId._id.toString())) {
            return res.status(403).json({
                success: false,
                message: 'You do not service this area'
            });
        }

        job.status = 'REJECTED';
        await job.save();

        // Notify client
        notifyClient(job.clientId.toString(), {
            type: 'JOB_REJECTED',
            jobId: job._id.toString()
        });

        res.json({
            success: true,
            message: 'Job rejected',
            data: { job }
        });
    } catch (error) {
        console.error('Reject job error:', error);
        res.status(500).json({
            success: false,
            message: 'Error rejecting job'
        });
    }
};

/**
 * Update job status (in_review, in_progress, completed)
 * PATCH /api/workers/jobs/:jobId/status
 */
const updateJobStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { status } = req.body;
        const workerId = req.user.worker._id;

        const validStatuses = ['IN_REVIEW', 'IN_PROGRESS', 'COMPLETED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be IN_REVIEW, IN_PROGRESS or COMPLETED'
            });
        }

        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        if (job.workerId.toString() !== workerId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You are not assigned to this job'
            });
        }

        job.status = status;
        if (status === 'COMPLETED') {
            job.completedAt = new Date();
        }
        await job.save();

        // Populate for response
        await job.populate([
            {
                path: 'clientId',
                populate: { path: 'userId' }
            },
            {
                path: 'workerId',
                populate: { path: 'userId' }
            },
            { path: 'serviceId' },
            { path: 'areaId' }
        ]);

        // If completed, update worker stats
        if (status === 'COMPLETED') {
            await Worker.findByIdAndUpdate(workerId, {
                $inc: { completedJobs: 1 }
            });
        }

        // Notify client
        notifyClient(job.clientId._id.toString(), {
            type: 'JOB_STATUS_UPDATED',
            job: job
        });

        res.json({
            success: true,
            message: 'Job status updated',
            data: { job }
        });
    } catch (error) {
        console.error('Update job status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating job status'
        });
    }
};

/**
 * Get worker earnings & completed jobs
 * GET /api/workers/earnings
 */
const getEarnings = async (req, res) => {
    try {
        const workerId = req.user.worker._id;

        // Get completed jobs with payments
        const completedJobs = await Job.find({
            workerId,
            status: 'COMPLETED'
        })
            .populate('serviceId')
            .populate({
                path: 'clientId',
                populate: {
                    path: 'userId',
                    select: 'name'
                }
            })
            .sort({ completedAt: -1 })
            .lean();

        // Get payment information for each job
        for (let job of completedJobs) {
            const payment = await Payment.findOne({ jobId: job._id });
            job.payment = payment;
        }

        // Calculate total earnings
        const totalEarnings = completedJobs.reduce((sum, job) => {
            return sum + (job.finalPrice || job.estimatedPrice);
        }, 0);

        res.json({
            success: true,
            data: {
                totalEarnings,
                completedJobsCount: completedJobs.length,
                completedJobs
            }
        });
    } catch (error) {
        console.error('Get earnings error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching earnings'
        });
    }
};

/**
 * Update worker profile
 * PATCH /api/workers/profile
 */
const updateProfile = async (req, res) => {
    try {
        const workerId = req.user.worker._id;
        const { bio, experience, hourlyRate, isAvailable, profileImage } = req.body;

        const updateData = {};
        if (bio !== undefined) updateData.bio = bio;
        if (experience !== undefined) updateData.experience = experience;
        if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate;
        if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
        if (profileImage !== undefined) updateData.profileImage = profileImage;

        const updatedWorker = await Worker.findByIdAndUpdate(
            workerId,
            updateData,
            { new: true }
        )
            .populate('userId', 'name email phone')
            .populate('areaIds')
            .populate('serviceIds');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: { worker: updatedWorker }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating profile'
        });
    }
};

/**
 * Update worker's working areas
 * PATCH /api/workers/areas
 */
const updateAreas = async (req, res) => {
    try {
        const workerId = req.user.worker._id;
        const { areaIds } = req.body;

        if (!areaIds || areaIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one area must be selected'
            });
        }

        // Update worker's areaIds array directly (MongoDB approach)
        const updatedWorker = await Worker.findByIdAndUpdate(
            workerId,
            { areaIds },
            { new: true }
        ).populate('areaIds');

        res.json({
            success: true,
            message: 'Working areas updated successfully',
            data: { worker: updatedWorker }
        });
    } catch (error) {
        console.error('Update areas error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating working areas'
        });
    }
};

/**
 * Update worker's services
 * PATCH /api/workers/services
 */
const updateServices = async (req, res) => {
    try {
        const workerId = req.user.worker._id;
        const { serviceIds } = req.body;

        if (!serviceIds || serviceIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one service must be selected'
            });
        }

        const updatedWorker = await Worker.findByIdAndUpdate(
            workerId,
            { serviceIds },
            { new: true }
        ).populate('serviceIds').populate('areaIds');

        res.json({
            success: true,
            message: 'Services updated successfully',
            data: { worker: updatedWorker }
        });
    } catch (error) {
        console.error('Update services error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating services'
        });
    }
};

/**
 * Get current worker profile (areas + services)
 * GET /api/workers/profile
 */
const getProfile = async (req, res) => {
    try {
        const workerId = req.user.worker._id;
        const worker = await Worker.findById(workerId)
            .populate('userId', 'name email phone')
            .populate('areaIds')
            .populate('serviceIds');

        res.json({
            success: true,
            data: { worker }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching profile'
        });
    }
};

/**
 * Cancel an accepted job (worker cancels)
 * POST /api/workers/jobs/:jobId/cancel
 */
const cancelWorkerJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const workerId = req.user.worker._id;

        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        if (job.workerId.toString() !== workerId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You are not assigned to this job'
            });
        }

        const cancellableStatuses = ['ACCEPTED', 'IN_REVIEW', 'IN_PROGRESS'];
        if (!cancellableStatuses.includes(job.status)) {
            return res.status(400).json({
                success: false,
                message: `Job cannot be cancelled from status ${job.status}`
            });
        }

        job.status = 'CANCELLED';
        await job.save();

        // Notify client via WebSocket
        notifyClient(job.clientId.toString(), {
            type: 'JOB_CANCELLED_BY_WORKER',
            jobId: job._id.toString(),
            message: 'The worker has cancelled your service request.'
        });

        res.json({
            success: true,
            message: 'Job cancelled successfully',
            data: { job }
        });
    } catch (error) {
        console.error('Cancel worker job error:', error);
        res.status(500).json({
            success: false,
            message: 'Error cancelling job'
        });
    }
};

/**
 * Get worker's public ratings / reviews
 * GET /api/workers/ratings
 */
const getWorkerRatings = async (req, res) => {
    try {
        const workerId = req.user.worker._id;
        const Rating = require('../models/Rating');

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
            data: { ratings }
        });
    } catch (error) {
        console.error('Get worker ratings error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching ratings'
        });
    }
};

module.exports = {
    getWorkerJobs,
    acceptJob,
    rejectJob,
    updateJobStatus,
    cancelWorkerJob,
    getWorkerRatings,
    getEarnings,
    updateProfile,
    updateAreas,
    updateServices,
    getProfile
};
