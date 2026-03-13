const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        required: true,
        unique: true   // One rating per job
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    workerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Worker',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    review: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Indexes (only for non-unique fields)
ratingSchema.index({ workerId: 1 });
ratingSchema.index({ rating: 1 });

const Rating = mongoose.model('Rating', ratingSchema);

module.exports = Rating;
