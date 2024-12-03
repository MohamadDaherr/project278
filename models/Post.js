const mongoose = require('mongoose');
const Schema = mongoose.Schema;
require('./comments'); 
const postSchema = new Schema({
    content: { type: String},
    mediaUrl: { type: String, required:true },
    mediaType: { type: String, enum: ['image', 'video']},
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Author of the post
    likes: [
        {
            user: { type: Schema.Types.ObjectId, ref: 'User' }, // User who liked the post
            date: { type: Date, default: Date.now } // Date of the like
        }
    ],
    dislikes: [
        {
            user: { type: Schema.Types.ObjectId, ref: 'User' }, // User who liked the post
            date: { type: Date, default: Date.now } // Date of the like
        }
    ],
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }], // Array of comments
    location: { type: String }, // Add location field
    privacy: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
