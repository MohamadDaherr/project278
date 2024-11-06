const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    mediaUrl: String, // Optional image or video URL
    createdAt: { type: Date, default: Date.now },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    privacy: { type: String, enum: ['public', 'friends', 'private'], default: 'public' }
});

module.exports = mongoose.model('Post', PostSchema);
