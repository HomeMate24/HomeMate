const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,   // automatically indexed
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: false  // Optional for Google OAuth users
    },
    phone: {
        type: String,
        required: true,
        unique: true,   // automatically indexed
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['CLIENT', 'WORKER', 'PROVIDER'],
        required: true
    },
    googleId: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Indexes for non-unique fields only
userSchema.index({ role: 1 });
userSchema.index({ googleId: 1 }, { sparse: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
