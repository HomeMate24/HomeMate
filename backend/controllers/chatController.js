const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { sendToUser } = require('../websocket/websocket');

/**
 * Search for users (providers, workers, clients) by name
 * GET /api/chat/search?q=searchTerm
 */
const searchUsers = async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search term must be at least 2 characters'
            });
        }

        // Search users by name (case-insensitive)
        const users = await User.find({
            _id: { $ne: currentUserId }, // Exclude current user
            name: { $regex: q.trim(), $options: 'i' }
        })
            .select('name email role')
            .limit(20)
            .lean();

        res.json({
            success: true,
            data: { users }
        });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching users'
        });
    }
};

/**
 * Get User's Conversations
 * GET /api/chat/conversations
 */
const getConversations = async (req, res) => {
    try {
        const userId = req.user._id;

        // Find all conversations where user is a participant
        const conversations = await Conversation.find({
            'participants.userId': userId
        })
            .populate('participants.userId', 'name email role')
            .populate('requestedBy', 'name email role')
            .populate('lastMessageId')
            .sort({ lastMessageAt: -1 })
            .lean();

        // Get unread message count for each conversation
        const conversationsWithDetails = await Promise.all(conversations.map(async (conv) => {
            const unreadCount = await Message.countDocuments({
                conversationId: conv._id,
                senderId: { $ne: userId },
                'readBy.userId': { $ne: userId }
            });

            // Get the other participant(s)
            const otherParticipants = conv.participants.filter(
                p => p.userId._id.toString() !== userId.toString()
            );

            return {
                id: conv._id,
                participants: conv.participants,
                otherParticipants,
                lastMessage: conv.lastMessageId,
                lastMessageAt: conv.lastMessageAt,
                unreadCount,
                conversationType: conv.conversationType,
                status: conv.status,
                requestedBy: conv.requestedBy,
                metadata: conv.metadata
            };
        }));

        // Separate pending and accepted conversations
        const pending = conversationsWithDetails.filter(c => c.status === 'pending');
        const accepted = conversationsWithDetails.filter(c => c.status === 'accepted');

        res.json({
            success: true,
            data: {
                conversations: accepted,
                pendingRequests: pending
            }
        });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching conversations'
        });
    }
};

/**
 * Get Messages in a Conversation
 * GET /api/chat/conversations/:conversationId/messages
 */
const getMessages = async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;
        const { limit = 50, before } = req.query;

        // Verify user is part of the conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            'participants.userId': userId
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found or access denied'
            });
        }

        // Build query
        const query = { conversationId, isDeleted: false };
        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        // Get messages
        const messages = await Message.find(query)
            .populate('senderId', 'name role')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .lean();

        res.json({
            success: true,
            data: {
                messages: messages.reverse(), // Send in chronological order
                hasMore: messages.length === parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching messages'
        });
    }
};

/**
 * Mark Messages as Read
 * POST /api/chat/conversations/:conversationId/read
 */
const markAsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;
        const { messageIds } = req.body; // Optional: specific message IDs, otherwise mark all

        // Verify user is part of the conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            'participants.userId': userId
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found or access denied'
            });
        }

        // Build query
        const query = {
            conversationId,
            senderId: { $ne: userId }, // Don't mark own messages
            'readBy.userId': { $ne: userId } // Not already read
        };

        if (messageIds && messageIds.length > 0) {
            query._id = { $in: messageIds };
        }

        // Update messages
        const result = await Message.updateMany(
            query,
            {
                $push: {
                    readBy: {
                        userId,
                        readAt: new Date()
                    }
                }
            }
        );

        res.json({
            success: true,
            message: 'Messages marked as read',
            data: {
                markedCount: result.modifiedCount
            }
        });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking messages as read'
        });
    }
};

/**
 * Create a New Conversation
 * POST /api/chat/conversations
 */
const createConversation = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const { participantId } = req.body;

        if (!participantId) {
            return res.status(400).json({
                success: false,
                message: 'Participant ID is required'
            });
        }

        // Verify participant exists
        const participant = await User.findById(participantId);
        if (!participant) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if conversation already exists
        const existingConversation = await Conversation.findOne({
            conversationType: 'DIRECT',
            'participants.userId': { $all: [userId, participantId] },
            $expr: { $eq: [{ $size: '$participants' }, 2] }
        }).populate('participants.userId', 'name email role')
            .populate('requestedBy', 'name email role');

        if (existingConversation) {
            return res.json({
                success: true,
                message: 'Conversation already exists',
                data: {
                    conversation: existingConversation,
                    isNew: false
                }
            });
        }

        // Create new conversation with pending status
        const conversation = await Conversation.create({
            participants: [
                { userId, userRole },
                { userId: participantId, userRole: participant.role }
            ],
            conversationType: 'DIRECT',
            status: 'pending',
            requestedBy: userId,
            metadata: {}
        });

        await conversation.populate('participants.userId', 'name email role');
        await conversation.populate('requestedBy', 'name email role');

        // Send real-time notification to the recipient
        const recipient = conversation.participants.find(
            p => p.userId._id.toString() !== userId.toString()
        );
        if (recipient) {
            sendToUser(recipient.userId._id.toString(), {
                type: 'NEW_CHAT_REQUEST',
                conversation: conversation.toObject()
            });
        }

        res.status(201).json({
            success: true,
            message: 'Message request sent successfully',
            data: {
                conversation: conversation.toObject(),
                isNew: true
            }
        });
    } catch (error) {
        console.error('Create conversation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating conversation'
        });
    }
};

/**
 * Update Conversation Status (Accept/Reject Request)
 * POST /api/chat/conversations/:conversationId/status
 */
const updateConversationStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;
        const { status } = req.body;

        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be "accepted" or "rejected"'
            });
        }

        // Find conversation and verify user is a participant (but not the requester)
        const conversation = await Conversation.findOne({
            _id: conversationId,
            'participants.userId': userId
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found or access denied'
            });
        }

        // Check if user is trying to approve their own request
        if (conversation.requestedBy.toString() === userId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You cannot approve your own message request'
            });
        }

        // Update status
        conversation.status = status;
        await conversation.save();

        await conversation.populate('participants.userId', 'name email role');
        await conversation.populate('requestedBy', 'name email role');

        // Send real-time notification to both participants
        conversation.participants.forEach(participant => {
            const participantUserId = participant.userId._id.toString();
            sendToUser(participantUserId, {
                type: status === 'accepted' ? 'CHAT_REQUEST_ACCEPTED' : 'CHAT_REQUEST_REJECTED',
                conversation: conversation.toObject(),
                updatedBy: userId.toString()
            });
        });

        res.json({
            success: true,
            message: `Message request ${status}`,
            data: { conversation }
        });
    } catch (error) {
        console.error('Update conversation status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating conversation status'
        });
    }
};

module.exports = {
    searchUsers,
    getConversations,
    getMessages,
    markAsRead,
    createConversation,
    updateConversationStatus
};
