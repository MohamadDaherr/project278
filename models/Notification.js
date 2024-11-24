const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
    type: {
        type: String,
        required: true,
        enum: [
            'friend-request',   
            'friend-accepted',  
            'friend-declined',  
            'post-like',
            'post-dislike',        
            'story-like',       
            'comment', 
            'comment-reply',         
            'comment-like',
            'comment-dislike', 
            'reply-like',
            'reply-dislike',
        ],
    },
    from: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    to: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    post: { type: Schema.Types.ObjectId, ref: 'Post', default: null },
    story: { type: Schema.Types.ObjectId, ref: 'Story', default: null },
    comment: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    reply: { type: Schema.Types.ObjectId, ref: 'Comment', default: null },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);