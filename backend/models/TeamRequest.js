const mongoose = require('mongoose');

const teamRequestSchema = new mongoose.Schema({
    providerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Provider',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    requestType: {
        type: String,
        enum: ['WORKER', 'CLIENT'],
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
        default: 'PENDING'
    },
    message: {
        type: String,
        trim: true,
        maxlength: 500
    },
    respondedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
teamRequestSchema.index({ userId: 1, status: 1 });
teamRequestSchema.index({ providerId: 1, status: 1 });
teamRequestSchema.index({ createdAt: -1 });

// Prevent duplicate pending requests
teamRequestSchema.index(
    { providerId: 1, userId: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: 'PENDING' } }
);

const TeamRequest = mongoose.model('TeamRequest', teamRequestSchema);

module.exports = TeamRequest;
