const Worker = require('../models/Worker');
const Job = require('../models/Job');
const Payment = require('../models/Payment');
const { notifyClient } = require('../websocket/websocket');

const getWorkerJobs = async (req, res) => {
    try {
        const workerId = req.user.worker._id;
        const { status } = req.query;

        // Get worker's area IDs from junction table
        const areaIds = await Worker.getAreaIds(workerId);

        const filter = { areaIdIn: areaIds };
        if (status) filter.status = status;

        const jobs = await Job.find(filter, { orderBy: ['createdAt', 'desc'] });

        for (const job of jobs) {
            await Job.populate(job, ['all']);
        }

        res.json({ success: true, data: { jobs } });
    } catch (error) {
        console.error('Get worker jobs error:', error);
        res.status(500).json({ success: false, message: 'Error fetching jobs' });
    }
};

const acceptJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const workerId = req.user.worker._id;

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        if (job.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: `Job is already ${job.status.toLowerCase()}` });
        }

        // Verify worker works in this area
        const hasArea = await Worker.hasArea(workerId, job.area_id || job.areaId);
        if (!hasArea) {
            return res.status(403).json({ success: false, message: 'You do not service this area' });
        }

        const updated = await Job.updateById(jobId, {
            workerId,
            status: 'ACCEPTED',
            acceptedAt: new Date(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });

        await Job.populate(updated, ['all']);
        await Worker.increment(workerId, 'totalJobs', 1);

        // Notify client
        const clientId = updated.client_id || updated.clientId;
        if (clientId && typeof clientId === 'object') {
            notifyClient(clientId._id.toString(), {
                type: 'SERVICE_REQUEST_ACCEPTED',
                job: updated,
                message: 'Worker has accepted your service request. You have 24 hours to complete it.'
            });
        } else if (clientId) {
            notifyClient(clientId.toString(), {
                type: 'SERVICE_REQUEST_ACCEPTED',
                job: updated,
                message: 'Worker has accepted your service request. You have 24 hours to complete it.'
            });
        }

        res.json({ success: true, message: 'Job accepted successfully', data: { job: updated } });
    } catch (error) {
        console.error('Accept job error:', error);
        res.status(500).json({ success: false, message: 'Error accepting job' });
    }
};

const rejectJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const workerId = req.user.worker._id;

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        if (job.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: `Job is already ${job.status.toLowerCase()}` });
        }

        const hasArea = await Worker.hasArea(workerId, job.area_id || job.areaId);
        if (!hasArea) {
            return res.status(403).json({ success: false, message: 'You do not service this area' });
        }

        const updated = await Job.updateById(jobId, { status: 'REJECTED' });

        notifyClient((job.client_id || job.clientId).toString(), {
            type: 'JOB_REJECTED',
            jobId: job._id.toString()
        });

        res.json({ success: true, message: 'Job rejected', data: { job: updated } });
    } catch (error) {
        console.error('Reject job error:', error);
        res.status(500).json({ success: false, message: 'Error rejecting job' });
    }
};

const updateJobStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { status } = req.body;
        const workerId = req.user.worker._id;

        const validStatuses = ['IN_REVIEW', 'IN_PROGRESS', 'COMPLETED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status. Must be IN_REVIEW, IN_PROGRESS or COMPLETED' });
        }

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        if ((job.worker_id || job.workerId).toString() !== workerId.toString()) {
            return res.status(403).json({ success: false, message: 'You are not assigned to this job' });
        }

        const updates = { status };
        if (status === 'COMPLETED') updates.completedAt = new Date();

        const updated = await Job.updateById(jobId, updates);
        await Job.populate(updated, ['all']);

        if (status === 'COMPLETED') {
            await Worker.increment(workerId, 'completedJobs', 1);
        }

        // Notify client
        const clientId = updated.clientId || updated.client_id;
        const cId = typeof clientId === 'object' ? clientId._id : clientId;
        notifyClient(cId.toString(), { type: 'JOB_STATUS_UPDATED', job: updated });

        res.json({ success: true, message: 'Job status updated', data: { job: updated } });
    } catch (error) {
        console.error('Update job status error:', error);
        res.status(500).json({ success: false, message: 'Error updating job status' });
    }
};

const getEarnings = async (req, res) => {
    try {
        const workerId = req.user.worker._id;
        const completedJobs = await Job.find({ workerId, status: 'COMPLETED' }, { orderBy: ['completedAt', 'desc'] });

        for (const job of completedJobs) {
            await Job.populate(job, ['serviceId', 'clientId']);
            const payment = await Payment.findOne({ jobId: job._id });
            job.payment = payment;
        }

        const totalEarnings = completedJobs.reduce((sum, job) => {
            return sum + (job.finalPrice || job.final_price || job.estimatedPrice || job.estimated_price || 0);
        }, 0);

        res.json({
            success: true,
            data: { totalEarnings, completedJobsCount: completedJobs.length, completedJobs }
        });
    } catch (error) {
        console.error('Get earnings error:', error);
        res.status(500).json({ success: false, message: 'Error fetching earnings' });
    }
};

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

        const updatedWorker = await Worker.updateById(workerId, updateData);
        await Worker.populate(updatedWorker, ['userId', 'areaIds', 'serviceIds']);

        res.json({ success: true, message: 'Profile updated successfully', data: { worker: updatedWorker } });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: 'Error updating profile' });
    }
};

const updateAreas = async (req, res) => {
    try {
        const workerId = req.user.worker._id;
        const { areaIds } = req.body;

        if (!areaIds || areaIds.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one area must be selected' });
        }

        await Worker.setAreaIds(workerId, areaIds);
        const updatedWorker = await Worker.findById(workerId);
        await Worker.populate(updatedWorker, ['areaIds']);

        res.json({ success: true, message: 'Working areas updated successfully', data: { worker: updatedWorker } });
    } catch (error) {
        console.error('Update areas error:', error);
        res.status(500).json({ success: false, message: 'Error updating working areas' });
    }
};

const updateServices = async (req, res) => {
    try {
        const workerId = req.user.worker._id;
        const { serviceIds } = req.body;

        if (!serviceIds || serviceIds.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one service must be selected' });
        }

        await Worker.setServiceIds(workerId, serviceIds);
        const updatedWorker = await Worker.findById(workerId);
        await Worker.populate(updatedWorker, ['serviceIds', 'areaIds']);

        res.json({ success: true, message: 'Services updated successfully', data: { worker: updatedWorker } });
    } catch (error) {
        console.error('Update services error:', error);
        res.status(500).json({ success: false, message: 'Error updating services' });
    }
};

const getProfile = async (req, res) => {
    try {
        const workerId = req.user.worker._id;
        const worker = await Worker.findById(workerId);
        await Worker.populate(worker, ['userId', 'areaIds', 'serviceIds']);

        res.json({ success: true, data: { worker } });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Error fetching profile' });
    }
};

const cancelWorkerJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const workerId = req.user.worker._id;

        const job = await Job.findById(jobId);
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        if ((job.worker_id || job.workerId).toString() !== workerId.toString()) {
            return res.status(403).json({ success: false, message: 'You are not assigned to this job' });
        }

        const cancellableStatuses = ['ACCEPTED', 'IN_REVIEW', 'IN_PROGRESS'];
        if (!cancellableStatuses.includes(job.status)) {
            return res.status(400).json({ success: false, message: `Job cannot be cancelled from status ${job.status}` });
        }

        const updated = await Job.updateById(jobId, { status: 'CANCELLED' });

        notifyClient((job.client_id || job.clientId).toString(), {
            type: 'JOB_CANCELLED_BY_WORKER',
            jobId: job._id.toString(),
            message: 'The worker has cancelled your service request.'
        });

        res.json({ success: true, message: 'Job cancelled successfully', data: { job: updated } });
    } catch (error) {
        console.error('Cancel worker job error:', error);
        res.status(500).json({ success: false, message: 'Error cancelling job' });
    }
};

const getWorkerRatings = async (req, res) => {
    try {
        const workerId = req.user.worker._id;
        const Rating = require('../models/Rating');

        const ratings = await Rating.find({ workerId });
        await Rating.populateMany(ratings);

        res.json({ success: true, data: { ratings } });
    } catch (error) {
        console.error('Get worker ratings error:', error);
        res.status(500).json({ success: false, message: 'Error fetching ratings' });
    }
};

module.exports = {
    getWorkerJobs, acceptJob, rejectJob, updateJobStatus, cancelWorkerJob,
    getWorkerRatings, getEarnings, updateProfile, updateAreas, updateServices, getProfile
};
