const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { Schema } = mongoose;
const UserSchema = new mongoose.Schema({
    firstName: { type: String, trim: true, required:true },
    lastName: { type: String, trim: true , required:true},
    username: { type: String, required: true, unique: true, trim: true}, // Added username field
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verificationCode: String,
    profileImage: { type: String, default: '/path/to/default-profile.png' }, // Path to profile image
    bio: { type: String, default: '' },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    address: { type: String }, 
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of friends// Account privacy
    postsCount: { type: Number, default: 0 },
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isDeactivated: { type: Boolean, default: false },
    notifications: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Notification',
        }
    ],
}, { timestamps: true });
UserSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', UserSchema);
