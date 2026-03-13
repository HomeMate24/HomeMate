const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true
    },
    jobId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Job',
        unique: true,
        sparse: true
    },
    subscriptionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription',
        unique: true,
        sparse: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    paymentType: {
        type: String,
        enum: ['JOB_PAYMENT', 'SUBSCRIPTION'],
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
        default: 'PENDING'
    },
    paymentMethod: {
        type: String,
        trim: true
    },
    transactionId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true
    },
    paymentGatewayResponse: {
        type: mongoose.Schema.Types.Mixed
    },
    completedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes (Only non-unique fields)
paymentSchema.index({ clientId: 1 });
paymentSchema.index({ status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
