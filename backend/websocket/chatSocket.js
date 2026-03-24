const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { sendToUser } = require('./websocket');

async function handleChatMessage(senderId, messageData) {
    try {
        const { conversationId, content, messageType = 'TEXT' } = messageData;

        if (!conversationId || !content || content.trim().length === 0) {
            return { success: false, message: 'Conversation ID and content are required' };
        }

        // Verify user is part of the conversation
        const isParticipant = await Conversation.isParticipant(conversationId, senderId);
        if (!isParticipant) {
            return { success: false, message: 'Conversation not found or access denied' };
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return { success: false, message: 'Conversation not found' };
        }

        if (conversation.status !== 'accepted') {
            return { success: false, message: 'Cannot send messages. Chat request must be accepted first.' };
        }

        // Get sender role from participants
        const senderParticipant = conversation.participants.find(
            p => {
                const pUserId = p.userId._id || p.userId.id || p.userId;
                return pUserId.toString() === senderId.toString();
            }
        );

        const message = await Message.create({
            conversationId,
            senderId,
            senderRole: senderParticipant ? senderParticipant.userRole : 'UNKNOWN',
            content: content.trim(),
            messageType,
            readBy: [{ userId: senderId, readAt: new Date() }]
        });

        // Update conversation's last message
        await Conversation.updateById(conversationId, {
            lastMessageId: message._id,
            lastMessageAt: new Date()
        });

        // Populate sender info
        await Message.populate(message);

        // Send real-time notification to other participants
        const otherParticipants = conversation.participants.filter(
            p => {
                const pUserId = p.userId._id || p.userId.id || p.userId;
                return pUserId.toString() !== senderId.toString();
            }
        );

        otherParticipants.forEach(participant => {
            const pUserId = participant.userId._id || participant.userId.id || participant.userId;
            sendToUser(pUserId.toString(), {
                type: 'NEW_MESSAGE',
                conversationId,
                message
            });
        });

        return { success: true, message };
    } catch (error) {
        console.error('Handle chat message error:', error);
        return { success: false, message: 'Error sending message' };
    }
}

async function notifyMessageRead(userId, conversationId) {
    try {
        const participantIds = await Conversation.getParticipantIds(conversationId);

        participantIds.forEach(participantUserId => {
            if (participantUserId.toString() !== userId) {
                sendToUser(participantUserId.toString(), {
                    type: 'MESSAGES_READ',
                    conversationId,
                    userId
                });
            }
        });
    } catch (error) {
        console.error('Notify message read error:', error);
    }
}

module.exports = { handleChatMessage, notifyMessageRead };
