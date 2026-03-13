const Job = require('../models/Job');
const Client = require('../models/Client');
const { sendToUser } = require('../websocket/websocket');

/**
 * Background job to check for expired service requests
 * Runs every minute to check jobs that have expired
 */
const checkExpiredJobs = async () => {
    try {
        const now = new Date();

        // Find jobs that are accepted, not completed, not expired, and past their expiry time
        const expiredJobs = await Job.find({
            status: 'ACCEPTED',
            expired: false,
            expiresAt: { $lte: now }
        }).populate('clientId workerId');

        for (const job of expiredJobs) {
            // Mark job as expired
            job.expired = true;
            job.status = 'CANCELLED';
            await job.save();

            // Decrease client rating by 0.5
            const client = await Client.findById(job.clientId);
            if (client) {
                client.rating = Math.max(0, client.rating - 0.5);
                await client.save();
            }

            // Notify both client and worker
            const jobObj = await Job.findById(job._id)
                .populate('clientId workerId serviceId areaId')
                .lean();

            // Notify client
            if (job.clientId?.userId) {
                sendToUser(job.clientId.userId.toString(), {
                    type: 'SERVICE_REQUEST_EXPIRED',
                    job: jobObj,
                    message: 'Your service request has expired. Your rating has been decreased.'
                });
            }

            // Notify worker
            if (job.workerId?.userId) {
                sendToUser(job.workerId.userId.toString(), {
                    type: 'SERVICE_REQUEST_EXPIRED',
                    job: jobObj,
                    message: 'Service request has expired and been cancelled.'
                });
            }

            console.log(`Job ${job._id} expired - Client rating decreased`);
        }

        if (expiredJobs.length > 0) {
            console.log(`Processed ${expiredJobs.length} expired jobs`);
        }
    } catch (error) {
        console.error('Error checking expired jobs:', error);
    }
};

// Run every minute
const startExpiryChecker = () => {
    setInterval(checkExpiredJobs, 60 * 1000); // 60 seconds
    console.log('✅ Job expiry checker started - running every minute');
};

module.exports = { checkExpiredJobs, startExpiryChecker };
