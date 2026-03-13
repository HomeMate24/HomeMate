const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
        unique: true   // Already indexed automatically
    },
    plan: {
        type: String,
        default: 'monthly'
    },
    price: {
        type: Number,
        default: 49.0,
        min: 0
    },
    isActive: {
        type: Boolean,
        default: false
    },
    aiAccessEnabled: {
        type: Boolean,
        default: false
    },
    startDate: {
        type: Date
    },
    endDate: {
        type: Date
    },
    autoRenew: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index only non-unique fields
subscriptionSchema.index({ isActive: 1 });
subscriptionSchema.index({ endDate: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
