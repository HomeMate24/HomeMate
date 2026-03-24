const TeamRequest = require('../models/TeamRequest');
const Provider = require('../models/Provider');
const Worker = require('../models/Worker');
const User = require('../models/User');
const { sendToUser } = require('../websocket/websocket');

const sendTeamRequest = async (req, res) => {
    try {
        const providerId = req.user._id;
        const { userId, requestType, message } = req.body;

        if (!userId || !requestType) {
            return res.status(400).json({ success: false, message: 'User ID and request type are required' });
        }

        if (!['WORKER', 'CLIENT'].includes(requestType)) {
            return res.status(400).json({ success: false, message: 'Invalid request type. Must be WORKER or CLIENT' });
        }

        const provider = await Provider.findOne({ userId: providerId });
        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        const targetUser = await User.findById(userId);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const existingRequest = await TeamRequest.findOne({
            providerId: provider._id,
            userId,
            status: 'PENDING'
        });

        if (existingRequest) {
            return res.status(409).json({ success: false, message: 'A pending request already exists for this user' });
        }

        const teamRequest = await TeamRequest.create({
            providerId: provider._id,
            userId,
            requestType,
            message: message || '',
            status: 'PENDING'
        });

        await TeamRequest.populate(teamRequest, ['providerId', 'userId']);

        const providerUser = await User.findById(providerId);

        sendToUser(userId.toString(), {
            type: 'TEAM_REQUEST',
            request: teamRequest,
            providerName: providerUser.name
        });

        res.status(201).json({ success: true, message: 'Team invitation sent successfully', data: { request: teamRequest } });
    } catch (error) {
        console.error('Send team request error:', error);
        res.status(500).json({ success: false, message: 'Error sending team invitation' });
    }
};

const getPendingRequests = async (req, res) => {
    try {
        const userId = req.user._id;
        const requests = await TeamRequest.find({ userId, status: 'PENDING' });
        await TeamRequest.populateMany(requests, ['providerId', 'userId']);

        res.json({ success: true, data: { requests } });
    } catch (error) {
        console.error('Get pending requests error:', error);
        res.status(500).json({ success: false, message: 'Error fetching pending requests' });
    }
};

const acceptTeamRequest = async (req, res) => {
    try {
        const userId = req.user._id;
        const { requestId } = req.params;

        const request = await TeamRequest.findOne({ _id: requestId, userId, status: 'PENDING' });
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found or already processed' });
        }

        await TeamRequest.updateById(request._id, { status: 'ACCEPTED', respondedAt: new Date() });

        if (request.requestType === 'WORKER') {
            const worker = await Worker.findOne({ userId });
            if (worker) {
                await Worker.updateById(worker._id, { providerId: request.providerId || request.provider_id });
                await Provider.increment(request.providerId || request.provider_id, 'totalWorkers', 1);
            } else {
                await Worker.create({
                    userId,
                    providerId: request.providerId || request.provider_id,
                    bio: '',
                    experience: 0,
                    hourlyRate: 0
                });
                await Provider.increment(request.providerId || request.provider_id, 'totalWorkers', 1);
            }
        }

        const provider = await Provider.findById(request.providerId || request.provider_id);
        if (provider) {
            const providerUser = await User.findById(provider.user_id || provider.userId);
            if (providerUser) {
                sendToUser(providerUser._id.toString(), {
                    type: 'TEAM_REQUEST_ACCEPTED',
                    request,
                    userId: userId.toString()
                });
            }
        }

        res.json({ success: true, message: 'Team request accepted', data: { request } });
    } catch (error) {
        console.error('Accept team request error:', error);
        res.status(500).json({ success: false, message: 'Error accepting team request' });
    }
};

const rejectTeamRequest = async (req, res) => {
    try {
        const userId = req.user._id;
        const { requestId } = req.params;

        const request = await TeamRequest.findOne({ _id: requestId, userId, status: 'PENDING' });
        if (!request) {
            return res.status(404).json({ success: false, message: 'Request not found or already processed' });
        }

        await TeamRequest.updateById(request._id, { status: 'REJECTED', respondedAt: new Date() });

        const provider = await Provider.findById(request.providerId || request.provider_id);
        if (provider) {
            const providerUser = await User.findById(provider.user_id || provider.userId);
            if (providerUser) {
                sendToUser(providerUser._id.toString(), {
                    type: 'TEAM_REQUEST_REJECTED',
                    request,
                    userId: userId.toString()
                });
            }
        }

        res.json({ success: true, message: 'Team request rejected', data: { request } });
    } catch (error) {
        console.error('Reject team request error:', error);
        res.status(500).json({ success: false, message: 'Error rejecting team request' });
    }
};

const getSentRequests = async (req, res) => {
    try {
        const userId = req.user._id;
        const provider = await Provider.findOne({ userId });
        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        const requests = await TeamRequest.find({ providerId: provider._id });
        await TeamRequest.populateMany(requests, ['userId']);

        res.json({ success: true, data: { requests } });
    } catch (error) {
        console.error('Get sent requests error:', error);
        res.status(500).json({ success: false, message: 'Error fetching sent requests' });
    }
};

module.exports = { sendTeamRequest, getPendingRequests, acceptTeamRequest, rejectTeamRequest, getSentRequests };
