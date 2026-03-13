const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    workerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Worker'
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: true
    },
    areaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Area',
        required: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    scheduledAt: {
        type: Date,
        required: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'ACCEPTED', 'IN_REVIEW', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'],
        default: 'PENDING'
    },
    estimatedPrice: {
        type: Number,
        required: true,
        min: 0
    },
    finalPrice: {
        type: Number,
        min: 0
    },
    acceptedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    },
    expiresAt: {
        type: Date,
        // Auto-set to 24 hours after acceptance
        index: true
    },
    expired: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
jobSchema.index({ clientId: 1 });
jobSchema.index({ workerId: 1 });
jobSchema.index({ areaId: 1 });
jobSchema.index({ serviceId: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ scheduledAt: 1 });

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
