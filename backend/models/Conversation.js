const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        userRole: {
            type: String,
            enum: ['CLIENT', 'WORKER', 'PROVIDER'],
            required: true
        }
    }],
    conversationType: {
        type: String,
        enum: ['DIRECT', 'GROUP'],
        default: 'DIRECT'
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastMessageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for participant IDs array
conversationSchema.virtual('participantIds').get(function () {
    return this.participants.map(p => p.userId);
});

// Index for faster queries
conversationSchema.index({ 'participants.userId': 1 });
conversationSchema.index({ lastMessageAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
