const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true  // automatically indexed
    },
    businessName: {
        type: String,
        required: true,
        trim: true
    },
    businessAddress: {
        type: String,
        trim: true
    },
    businessPhone: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    profileImage: {
        type: String,
        trim: true
    },
    totalWorkers: {
        type: Number,
        default: 0,
        min: 0
    },
    verificationStatus: {
        type: String,
        enum: ['PENDING', 'VERIFIED', 'REJECTED'],
        default: 'PENDING'
    },
    verifiedAt: {
        type: Date
    },
    totalRevenue: {
        type: Number,
        default: 0,
        min: 0
    },
    totalBookings: {
        type: Number,
        default: 0,
        min: 0
    },
    completedJobs: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

// Indexes
providerSchema.index({ verificationStatus: 1 });
providerSchema.index({ totalWorkers: -1 });

const Provider = mongoose.model('Provider', providerSchema);

module.exports = Provider;
