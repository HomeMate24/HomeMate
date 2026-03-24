const Worker = require('../models/Worker');
const Job = require('../models/Job');
const Rating = require('../models/Rating');
const Payment = require('../models/Payment');
const { notifyWorker } = require('../websocket/websocket');

const browseWorkers = async (req, res) => {
    try {
        const { areaId, serviceId } = req.query;
        if (!areaId) {
            return res.status(400).json({ success: false, message: 'Area ID is required' });
        }

        const workers = await Worker.findByAreaId(areaId, {
            isAvailable: true,
            serviceId: serviceId || undefined
        });

        // Populate each worker
        for (const worker of workers) {
            await Worker.populate(worker, ['userId', 'areaIds', 'serviceIds']);

            // Get area-specific ratings
            const ratings = await Rating.find({ workerId: worker._id });
            let validAreaRatings = [];
            for (const r of ratings) {
                const job = await Job.findById(r.job_id || r.jobId);
                if (job && (job.area_id || job.areaId) === areaId) {
                    validAreaRatings.push(r);
                }
            }

            const areaRating = validAreaRatings.length > 0
                ? validAreaRatings.reduce((sum, r) => sum + r.rating, 0) / validAreaRatings.length
                : worker.averageRating || worker.average_rating || 0;

            worker.areaSpecificRating = areaRating;
            worker.areaReviewCount = validAreaRatings.length;
        }

        res.json({ success: true, data: { workers } });
    } catch (error) {
        console.error('Browse workers error:', error);
        res.status(500).json({ success: false, message: 'Error fetching workers' });
    }
};

const createJob = async (req, res) => {
    try {
        const clientId = req.user.client._id;
        const { serviceId, areaId, description, scheduledAt, address, estimatedPrice, workerId } = req.body;

        if (!serviceId || !areaId || !description || !address) {
            return res.status(400).json({ success: false, message: 'serviceId, areaId, description, and address are required' });
        }

        const scheduledDate = scheduledAt ? new Date(scheduledAt) : new Date(Date.now() + 60 * 60 * 1000);

        const jobData = { clientId, serviceId, areaId, description, scheduledAt: scheduledDate, address, estimatedPrice: estimatedPrice || 0 };
        if (workerId) jobData.workerId = workerId;

        const job = await Job.create(jobData);
        await Job.populate(job, ['clientId', 'serviceId', 'areaId']);

        if (workerId) {
            notifyWorker(workerId.toString(), { type: 'NEW_JOB_REQUEST', job });
        } else {
            const workersInArea = await Worker.findByAreaAndService(areaId, serviceId);
            workersInArea.forEach(worker => {
                notifyWorker(worker._id.toString(), { type: 'NEW_JOB_REQUEST', job });
            });
        }

        res.status(201).json({ success: true, message: 'Job created successfully', data: { job } });
    } catch (error) {
        console.error('Create job error:', error);
        res.status(500).json({ success: false, message: 'Error creating job' });
    }
};

const getClientJobs = async (req, res) => {
    try {
        const clientId = req.user.client._id;
        const { status } = req.query;

        const filter = { clientId };
        if (status) filter.status = status;

        const jobs = await Job.find(filter, { orderBy: ['createdAt', 'desc'] });

        for (const job of jobs) {
            await Job.populate(job, ['serviceId', 'areaId', 'workerId']);
            const payment = await Payment.findOne({ jobId: job._id });
            const rating = await Rating.findOne({ jobId: job._id });
            job.payment = payment;
            job.rating = rating;
        }

        res.json({ success: true, data: { jobs } });
    } catch (error) {
        console.error('Get client jobs error:', error);
        res.status(500).json({ success: false, message: 'Error fetching jobs' });
    }
};

const getJobDetails = async (req, res) => {
    try {
        const { jobId } = req.params;
        const clientId = req.user.client._id;

        const job = await Job.findOne({ _id: jobId, clientId });
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        await Job.populate(job, ['all']);

        const payment = await Payment.findOne({ jobId: job._id });
        const rating = await Rating.findOne({ jobId: job._id });
        job.payment = payment;
        job.rating = rating;

        res.json({ success: true, data: { job } });
    } catch (error) {
        console.error('Get job details error:', error);
        res.status(500).json({ success: false, message: 'Error fetching job details' });
    }
};

const cancelJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const clientId = req.user.client._id;

        const job = await Job.findOne({ _id: jobId, clientId });
        if (!job) {
            return res.status(404).json({ success: false, message: 'Job not found' });
        }

        if (job.status !== 'PENDING' && job.status !== 'ACCEPTED') {
            return res.status(400).json({ success: false, message: 'Only pending or accepted jobs can be cancelled' });
        }

        const updated = await Job.updateById(job._id, { status: 'CANCELLED' });

        if (job.workerId || job.worker_id) {
            notifyWorker((job.workerId || job.worker_id).toString(), {
                type: 'JOB_CANCELLED',
                jobId: job._id.toString()
            });
        }

        res.json({ success: true, message: 'Job cancelled successfully', data: { job: updated } });
    } catch (error) {
        console.error('Cancel job error:', error);
        res.status(500).json({ success: false, message: 'Error cancelling job' });
    }
};

const rateJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { rating, review } = req.body;
        const clientId = req.user.client._id;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
        }

        const job = await Job.findOne({ _id: jobId, clientId, status: 'COMPLETED' });
        if (!job) {
            return res.status(404).json({ success: false, message: 'Completed job not found' });
        }

        if (!job.workerId && !job.worker_id) {
            return res.status(400).json({ success: false, message: 'No worker assigned to this job' });
        }

        const existingRating = await Rating.findOne({ jobId });
        if (existingRating) {
            return res.status(400).json({ success: false, message: 'Job already rated' });
        }

        const wId = job.workerId || job.worker_id;
        const newRating = await Rating.create({ jobId, clientId, workerId: wId, rating, review });

        // Update worker's average rating
        const allRatings = await Rating.find({ workerId: wId });
        const averageRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
        await Worker.updateById(wId, { averageRating });

        res.status(201).json({ success: true, message: 'Rating submitted successfully', data: { rating: newRating } });
    } catch (error) {
        console.error('Rate job error:', error);
        res.status(500).json({ success: false, message: 'Error submitting rating' });
    }
};

const getWorkerPublicProfile = async (req, res) => {
    try {
        const { workerId } = req.params;
        const worker = await Worker.findById(workerId);
        if (!worker) {
            return res.status(404).json({ success: false, message: 'Worker not found' });
        }

        await Worker.populate(worker, ['userId', 'areaIds', 'serviceIds']);

        const ratings = await Rating.find({ workerId });
        await Rating.populateMany(ratings);

        res.json({ success: true, data: { worker, ratings } });
    } catch (error) {
        console.error('Get worker public profile error:', error);
        res.status(500).json({ success: false, message: 'Error fetching worker profile' });
    }
};

const searchWorkersByName = async (req, res) => {
    try {
        const { name } = req.query;
        if (!name || name.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Name query must be at least 2 characters' });
        }

        const matchingUsers = await User.find(
            { name: { $regex: name.trim() }, role: 'WORKER' },
            { select: 'id' }
        );
        const User = require('../models/User');

        const userIds = matchingUsers.map(u => u._id || u.id);
        if (userIds.length === 0) {
            return res.json({ success: true, data: { workers: [] } });
        }

        const workers = await Worker.find({ userId: { $in: userIds } });

        for (const worker of workers) {
            await Worker.populate(worker, ['userId', 'areaIds', 'serviceIds']);
            const ratingCount = await Rating.countDocuments({ workerId: worker._id });
            worker.areaReviewCount = ratingCount;
        }

        res.json({ success: true, data: { workers } });
    } catch (error) {
        console.error('Search workers by name error:', error);
        res.status(500).json({ success: false, message: 'Error searching workers' });
    }
};

module.exports = { browseWorkers, createJob, getClientJobs, getJobDetails, cancelJob, rateJob, getWorkerPublicProfile, searchWorkersByName };
