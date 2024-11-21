const mongoose = require('mongoose');
const { Schema } = mongoose;
const ActiveFriendSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    friend: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    likeCount: {
        type: Number,
        default: 0,
    },
    commentCount: {
        type: Number,
        default: 0,
    },
    dislikeCount: {
        type: Number,
        default: 0,
    },
}, { timestamps: true });

module.exports = mongoose.model('ActiveFriend', ActiveFriendSchema);
