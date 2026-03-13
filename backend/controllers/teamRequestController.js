const TeamRequest = require('../models/TeamRequest');
const Provider = require('../models/Provider');
const Worker = require('../models/Worker');
const User = require('../models/User');
const { sendToUser } = require('../websocket/websocket');

/**
 * Send Team Invitation
 * POST /api/team-requests/send
 */
const sendTeamRequest = async (req, res) => {
    try {
        const providerId = req.user._id;
        const { userId, requestType, message } = req.body;

        // Validation
        if (!userId || !requestType) {
            return res.status(400).json({
                success: false,
                message: 'User ID and request type are required'
            });
        }

        if (!['WORKER', 'CLIENT'].includes(requestType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request type. Must be WORKER or CLIENT'
            });
        }

        // Get provider
        const provider = await Provider.findOne({ userId: providerId });
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Check if target user exists
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check for existing pending request
        const existingRequest = await TeamRequest.findOne({
            providerId: provider._id,
            userId,
            status: 'PENDING'
        });

        if (existingRequest) {
            return res.status(409).json({
                success: false,
                message: 'A pending request already exists for this user'
            });
        }

        // Create team request
        const teamRequest = await TeamRequest.create({
            providerId: provider._id,
            userId,
            requestType,
            message: message || '',
            status: 'PENDING'
        });

        await teamRequest.populate('providerId userId');

        // Get provider user details
        const providerUser = await User.findById(providerId);

        // Send real-time notification to the user
        sendToUser(userId.toString(), {
            type: 'TEAM_REQUEST',
            request: teamRequest.toObject(),
            providerName: providerUser.name
        });

        res.status(201).json({
            success: true,
            message: 'Team invitation sent successfully',
            data: { request: teamRequest }
        });
    } catch (error) {
        console.error('Send team request error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending team invitation'
        });
    }
};

/**
 * Get Pending Requests for Current User
 * GET /api/team-requests/pending
 */
const getPendingRequests = async (req, res) => {
    try {
        const userId = req.user._id;

        const requests = await TeamRequest.find({
            userId,
            status: 'PENDING'
        })
            .populate('providerId')
            .populate({
                path: 'providerId',
                populate: {
                    path: 'userId',
                    select: 'name email phone'
                }
            })
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: { requests }
        });
    } catch (error) {
        console.error('Get pending requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching pending requests'
        });
    }
};

/**
 * Accept Team Request
 * POST /api/team-requests/:requestId/accept
 */
const acceptTeamRequest = async (req, res) => {
    try {
        const userId = req.user._id;
        const { requestId } = req.params;

        // Find the request
        const request = await TeamRequest.findOne({
            _id: requestId,
            userId,
            status: 'PENDING'
        });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found or already processed'
            });
        }

        // Update request status
        request.status = 'ACCEPTED';
        request.respondedAt = new Date();
        await request.save();

        // If request type is WORKER, update the worker's providerId
        if (request.requestType === 'WORKER') {
            const worker = await Worker.findOne({ userId });

            if (worker) {
                worker.providerId = request.providerId;
                await worker.save();

                // Update provider's worker count
                await Provider.findByIdAndUpdate(request.providerId, {
                    $inc: { totalWorkers: 1 }
                });
            } else {
                // Create worker profile if doesn't exist
                await Worker.create({
                    userId,
                    providerId: request.providerId,
                    bio: '',
                    experience: 0,
                    hourlyRate: 0
                });

                await Provider.findByIdAndUpdate(request.providerId, {
                    $inc: { totalWorkers: 1 }
                });
            }
        }

        // Get provider user for notification
        const provider = await Provider.findById(request.providerId).populate('userId');

        // Send real-time notification to provider
        if (provider && provider.userId) {
            sendToUser(provider.userId._id.toString(), {
                type: 'TEAM_REQUEST_ACCEPTED',
                request: request.toObject(),
                userId: userId.toString()
            });
        }

        res.json({
            success: true,
            message: 'Team request accepted',
            data: { request }
        });
    } catch (error) {
        console.error('Accept team request error:', error);
        res.status(500).json({
            success: false,
            message: 'Error accepting team request'
        });
    }
};

/**
 * Reject Team Request
 * POST /api/team-requests/:requestId/reject
 */
const rejectTeamRequest = async (req, res) => {
    try {
        const userId = req.user._id;
        const { requestId } = req.params;

        // Find the request
        const request = await TeamRequest.findOne({
            _id: requestId,
            userId,
            status: 'PENDING'
        });

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Request not found or already processed'
            });
        }

        // Update request status
        request.status = 'REJECTED';
        request.respondedAt = new Date();
        await request.save();

        // Get provider user for notification
        const provider = await Provider.findById(request.providerId).populate('userId');

        // Send real-time notification to provider
        if (provider && provider.userId) {
            sendToUser(provider.userId._id.toString(), {
                type: 'TEAM_REQUEST_REJECTED',
                request: request.toObject(),
                userId: userId.toString()
            });
        }

        res.json({
            success: true,
            message: 'Team request rejected',
            data: { request }
        });
    } catch (error) {
        console.error('Reject team request error:', error);
        res.status(500).json({
            success: false,
            message: 'Error rejecting team request'
        });
    }
};

/**
 * Get Sent Requests (for providers)
 * GET /api/team-requests/sent
 */
const getSentRequests = async (req, res) => {
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

        const requests = await TeamRequest.find({
            providerId: provider._id
        })
            .populate('userId', 'name email phone')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            success: true,
            data: { requests }
        });
    } catch (error) {
        console.error('Get sent requests error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching sent requests'
        });
    }
};

module.exports = {
    sendTeamRequest,
    getPendingRequests,
    acceptTeamRequest,
    rejectTeamRequest,
    getSentRequests
};
