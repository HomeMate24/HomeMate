const Job = require('../models/Job');
const Client = require('../models/Client');
const { sendToUser } = require('../websocket/websocket');

const checkExpiredJobs = async () => {
    try {
        const now = new Date();

        // Find expired accepted jobs
        const expiredJobs = await Job.find({
            status: 'ACCEPTED',
            expired: false,
            expiresAtLte: now
        });

        for (const job of expiredJobs) {
            // Mark job as expired
            await Job.updateById(job._id, { expired: true, status: 'CANCELLED' });

            // Decrease client rating
            const clientId = job.client_id || job.clientId;
            if (clientId) {
                const client = await Client.findById(clientId);
                if (client) {
                    const currentRating = client.rating || 0;
                    await Client.updateById(clientId, { rating: Math.max(0, currentRating - 0.5) });
                }
            }

            // Get full job data for notification
            const fullJob = await Job.findById(job._id);
            await Job.populate(fullJob, ['all']);

            // Notify client
            if (fullJob.clientId?.user_id || fullJob.clientId?.userId) {
                const clientUserId = fullJob.clientId.user_id || fullJob.clientId.userId;
                sendToUser(clientUserId.toString(), {
                    type: 'SERVICE_REQUEST_EXPIRED',
                    job: fullJob,
                    message: 'Your service request has expired. Your rating has been decreased.'
                });
            }

            // Notify worker
            if (fullJob.workerId?.user_id || fullJob.workerId?.userId) {
                const workerUserId = fullJob.workerId.user_id || fullJob.workerId.userId;
                sendToUser(workerUserId.toString(), {
                    type: 'SERVICE_REQUEST_EXPIRED',
                    job: fullJob,
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

const startExpiryChecker = () => {
    setInterval(checkExpiredJobs, 60 * 1000);
    console.log('✅ Job expiry checker started - running every minute');
};

module.exports = { checkExpiredJobs, startExpiryChecker };
