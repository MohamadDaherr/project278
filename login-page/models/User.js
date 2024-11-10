const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    username: { type: String, required: true, unique: true, trim: true, default:"me"}, // Added username field
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verificationCode: String,
    profileImage: { type: String, default: '/path/to/default-profile.png' }, // Path to profile image
    bio: { type: String, default: '' }, // Short bio for the user
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of friends// Account privacy
    postsCount: { type: Number, default: 0 },
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    notifications: [{
        from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        type: { type: String, enum: ['friend-request', 'friend-accepted','friend-declined'] },
        read: { type: Boolean, default: false }
    }] 
}, { timestamps: true }); // Add timestamps to track creation and update times




// UserSchema.pre('save', function (next) {
//     // Only update followingCount if following array has been modified
//     if (this.isModified('friends')) {
//         this.followingCount = this.friends.length;
//     }
//     next();
// });

// Method to compare input password with hashed password in database
UserSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', UserSchema);
