const mongoose = require('mongoose');

const otpCodeSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    otp: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    }
}, {
    timestamps: true
});

// TTL index — MongoDB auto-deletes expired documents
otpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for quick lookups
otpCodeSchema.index({ email: 1, otp: 1 });

const OtpCode = mongoose.model('OtpCode', otpCodeSchema);

module.exports = OtpCode;
