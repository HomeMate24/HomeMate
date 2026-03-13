const mongoose = require('mongoose');

const areaSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,   // This already creates index
        trim: true
    },
    city: {
        type: String,
        default: 'Pune',
        trim: true
    },
    pincode: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Keep only this index
areaSchema.index({ isActive: 1 });

const Area = mongoose.model('Area', areaSchema);

module.exports = Area;
