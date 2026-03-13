const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,   // Already indexed automatically
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    icon: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    basePrice: {
        type: Number,
        min: 0
    }
}, {
    timestamps: true
});

// Index only non-unique fields
serviceSchema.index({ isActive: 1 });

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
