const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { sendToUser } = require('./websocket');

/**
 * Handle incoming chat messages via WebSocket
 * @param {string} senderId - User ID of sender
 * @param {Object} messageData - Message data { conversationId, content, messageType }
 */
async function handleChatMessage(senderId, messageData) {
    try {
        const { conversationId, content, messageType = 'TEXT' } = messageData;

        if (!conversationId || !content || content.trim().length === 0) {
            return {
                success: false,
                message: 'Conversation ID and content are required'
            };
        }

        // Verify user is part of the conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            'participants.userId': senderId
        });

        if (!conversation) {
            return {
                success: false,
                message: 'Conversation not found or access denied'
            };
        }

        // Check if conversation is accepted
        if (conversation.status !== 'accepted') {
            return {
                success: false,
                message: 'Cannot send messages. Chat request must be accepted first.'
            };
        }

        // Get sender role
        const senderParticipant = conversation.participants.find(
            p => p.userId.toString() === senderId
        );

        // Create message
        const message = await Message.create({
            conversationId,
            senderId,
            senderRole: senderParticipant.userRole,
            content: content.trim(),
            messageType,
            readBy: [{
                userId: senderId,
                readAt: new Date()
            }]
        });

        // Update conversation's last message
        await Conversation.findByIdAndUpdate(conversationId, {
            lastMessageId: message._id,
            lastMessageAt: new Date()
        });

        // Populate sender info
        await message.populate('senderId', 'name role');

        const messageObj = message.toObject();

        // Send real-time notification to other participants
        const otherParticipants = conversation.participants.filter(
            p => p.userId.toString() !== senderId
        );

        otherParticipants.forEach(participant => {
            sendToUser(participant.userId.toString(), {
                type: 'NEW_MESSAGE',
                conversationId,
                message: messageObj
            });
        });

        return {
            success: true,
            message: messageObj
        };
    } catch (error) {
        console.error('Handle chat message error:', error);
        return {
            success: false,
            message: 'Error sending message'
        };
    }
}

/**
 * Notify conversation participants about message read status
 * @param {string} userId - User ID who read the messages
 * @param {string} conversationId - Conversation ID
 */
async function notifyMessageRead(userId, conversationId) {
    try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        // Notify other participants
        conversation.participants.forEach(participant => {
            const participantUserId = participant.userId.toString();
            if (participantUserId !== userId) {
                sendToUser(participantUserId, {
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

module.exports = {
    handleChatMessage,
    notifyMessageRead
};
