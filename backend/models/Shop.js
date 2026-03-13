const mongoose = require('mongoose');

const shopSchema = new mongoose.Schema({
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    shopType: {
        type: String,
        enum: ['individual', 'company'],
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    serviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Service',
        required: false  // null when "Other" is selected
    },
    customService: {
        type: String,
        trim: true  // populated when "Other" is selected
    },
    contactNumber: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    areaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Area',
        required: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes for search and filtering
shopSchema.index({ name: 'text', description: 'text', customService: 'text' });
shopSchema.index({ serviceId: 1 });
shopSchema.index({ areaId: 1 });
shopSchema.index({ isActive: 1 });

const Shop = mongoose.model('Shop', shopSchema);

module.exports = Shop;
