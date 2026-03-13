const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true  // automatically indexed
    },
    bio: {
        type: String,
        trim: true
    },
    profileImage: {
        type: String,
        trim: true
    },
    experience: {
        type: Number,
        min: 0
    },
    hourlyRate: {
        type: Number,
        min: 0
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    totalJobs: {
        type: Number,
        default: 0,
        min: 0
    },
    completedJobs: {
        type: Number,
        default: 0,
        min: 0
    },
    averageRating: {
        type: Number,
        default: 0.0,
        min: 0,
        max: 5
    },
    areaIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Area'
    }],
    serviceIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service'
    }],
    providerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Provider',
        required: false  // Workers can be independent or employed by a provider
    }
}, {
    timestamps: true
});

// Indexes only for non-unique fields
workerSchema.index({ isAvailable: 1 });
workerSchema.index({ averageRating: -1 });
workerSchema.index({ areaIds: 1 });
workerSchema.index({ serviceIds: 1 });

const Worker = mongoose.model('Worker', workerSchema);

module.exports = Worker;
