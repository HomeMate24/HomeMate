const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { sendToUser } = require('../websocket/websocket');

const searchUsers = async (req, res) => {
    try {
        const currentUserId = req.user._id;
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Search term must be at least 2 characters' });
        }

        const users = await User.find(
            { _id: { $ne: currentUserId }, name: { $regex: q.trim() }, role: undefined },
            { select: 'id, name, email, role', limit: 20 }
        );

        res.json({ success: true, data: { users } });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ success: false, message: 'Error searching users' });
    }
};

const getConversations = async (req, res) => {
    try {
        const userId = req.user._id;

        const conversations = await Conversation.findByParticipant(userId);

        const conversationsWithDetails = await Promise.all(conversations.map(async (conv) => {
            const unreadCount = await Message.countUnread(conv.id, userId);

            const otherParticipants = conv.participants.filter(
                p => (p.userId._id || p.userId.id || p.userId).toString() !== userId.toString()
            );

            // Get last message
            let lastMessage = null;
            if (conv.last_message_id) {
                lastMessage = await Message.findById(conv.last_message_id);
            }

            // Populate requestedBy
            let requestedBy = conv.requestedBy;
            if (conv.requested_by && typeof conv.requested_by === 'string') {
                requestedBy = await User.findById(conv.requested_by, 'id, name, email, role');
            }

            return {
                id: conv._id,
                _id: conv._id,
                participants: conv.participants,
                otherParticipants,
                lastMessage,
                lastMessageAt: conv.lastMessageAt || conv.last_message_at,
                unreadCount,
                conversationType: conv.conversationType || conv.conversation_type,
                status: conv.status,
                requestedBy,
                metadata: conv.metadata
            };
        }));

        const pending = conversationsWithDetails.filter(c => c.status === 'pending');
        const accepted = conversationsWithDetails.filter(c => c.status === 'accepted');

        res.json({
            success: true,
            data: { conversations: accepted, pendingRequests: pending }
        });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ success: false, message: 'Error fetching conversations' });
    }
};

const getMessages = async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;
        const { limit = 50, before } = req.query;

        // Verify user is participant
        const isParticipant = await Conversation.isParticipant(conversationId, userId);
        if (!isParticipant) {
            return res.status(404).json({ success: false, message: 'Conversation not found or access denied' });
        }

        const filters = { conversationId, isDeleted: false };
        if (before) filters.createdAtLt = new Date(before).toISOString();

        const messages = await Message.find(filters, {
            orderBy: ['createdAt', 'desc'],
            limit: parseInt(limit),
            populateSender: true
        });

        res.json({
            success: true,
            data: {
                messages: messages.reverse(),
                hasMore: messages.length === parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ success: false, message: 'Error fetching messages' });
    }
};

const markAsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;
        const { messageIds } = req.body;

        const isParticipant = await Conversation.isParticipant(conversationId, userId);
        if (!isParticipant) {
            return res.status(404).json({ success: false, message: 'Conversation not found or access denied' });
        }

        const markedCount = await Message.markAsRead(conversationId, userId, messageIds);

        res.json({
            success: true,
            message: 'Messages marked as read',
            data: { markedCount }
        });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ success: false, message: 'Error marking messages as read' });
    }
};

const createConversation = async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const { participantId } = req.body;

        if (!participantId) {
            return res.status(400).json({ success: false, message: 'Participant ID is required' });
        }

        const participant = await User.findById(participantId);
        if (!participant) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Check if direct conversation already exists
        const existingConversation = await Conversation.findDirectBetween(userId, participantId);
        if (existingConversation) {
            return res.json({
                success: true,
                message: 'Conversation already exists',
                data: { conversation: existingConversation, isNew: false }
            });
        }

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

        // Send real-time notification to the recipient
        const recipient = conversation.participants.find(
            p => (p.userId._id || p.userId.id || p.userId).toString() !== userId.toString()
        );
        if (recipient) {
            sendToUser((recipient.userId._id || recipient.userId.id || recipient.userId).toString(), {
                type: 'NEW_CHAT_REQUEST',
                conversation
            });
        }

        res.status(201).json({
            success: true,
            message: 'Message request sent successfully',
            data: { conversation, isNew: true }
        });
    } catch (error) {
        console.error('Create conversation error:', error);
        res.status(500).json({ success: false, message: 'Error creating conversation' });
    }
};

const updateConversationStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;
        const { status } = req.body;

        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status. Must be "accepted" or "rejected"' });
        }

        const isParticipant = await Conversation.isParticipant(conversationId, userId);
        if (!isParticipant) {
            return res.status(404).json({ success: false, message: 'Conversation not found or access denied' });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        if ((conversation.requested_by || conversation.requestedBy) === userId.toString()) {
            return res.status(403).json({ success: false, message: 'You cannot approve your own message request' });
        }

        const updated = await Conversation.updateById(conversationId, { status });

        // Notify participants
        for (const participant of updated.participants) {
            const pUserId = (participant.userId._id || participant.userId.id || participant.userId).toString();
            sendToUser(pUserId, {
                type: status === 'accepted' ? 'CHAT_REQUEST_ACCEPTED' : 'CHAT_REQUEST_REJECTED',
                conversation: updated,
                updatedBy: userId.toString()
            });
        }

        res.json({
            success: true,
            message: `Message request ${status}`,
            data: { conversation: updated }
        });
    } catch (error) {
        console.error('Update conversation status error:', error);
        res.status(500).json({ success: false, message: 'Error updating conversation status' });
    }
};

module.exports = { searchUsers, getConversations, getMessages, markAsRead, createConversation, updateConversationStatus };
