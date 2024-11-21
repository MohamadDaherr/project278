const mongoose = require('mongoose');
const { Schema } = mongoose;

const ContributorSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true, // The user who owns this contributor record
    },
    friend: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true, // Friend's ID
    },
    sharedPostCount: {
        type: Number,
        default: 0, // Number of posts shared
    },
    sharedStoryCount: {
        type: Number,
        default: 0, // Number of stories shared
    },
}, { timestamps: true });

module.exports = mongoose.model('Contributor', ContributorSchema);