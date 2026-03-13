const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true   // This already creates index
    },
    address: {
        type: String,
        trim: true
    },
    areaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Area'
    },
    rating: {
        type: Number,
        default: 5.0,
        min: 0,
        max: 5
    }
}, {
    timestamps: true
});

// Keep this one (no conflict here)
clientSchema.index({ areaId: 1 });

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
