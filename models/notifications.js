const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
    type: {
        type: String,
        required: true,
        enum: [
            'friend-request',   // Sent a friend request
            'friend-accepted',  // Friend request accepted
            'friend-declined',  // Friend request declined
            'post-like',        // Liked a post
            'story-like',       // Liked a story
            'comment',          // Commented on a post
            'comment-like',     // Liked a comment
        ],
    },
    from: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true, // The user who initiated the notification
    },
    to: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true, // The user receiving the notification
    },
    // Optional targets based on type
    post: {
        type: Schema.Types.ObjectId,
        ref: 'Post', // Target post (e.g., for post-like, comment notifications)
        default: null,
    },
    story: {
        type: Schema.Types.ObjectId,
        ref: 'Story', // Target story (e.g., for story-like notifications)
        default: null,
    },
    comment: {
        type: Schema.Types.ObjectId,
        ref: 'Comment', // Target comment (e.g., for comment notifications)
        default: null,
    },
    reply: {
        type: Schema.Types.ObjectId,
        ref: 'Comment', // Target reply (e.g., for comment reply notifications)
        default: null,
    },
    createdAt: {
        type: Date,
        default: Date.now, // Automatically timestamps when the notification is created
    },
});

module.exports = mongoose.model('Notification', notificationSchema);
