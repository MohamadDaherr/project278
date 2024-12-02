// models/Story.js
const mongoose = require('mongoose');
const { Schema } = mongoose;
const storySchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ['image', 'video']},
    likes: [
        {
            user: { type: Schema.Types.ObjectId, ref: 'User' }, // User who liked the story
            date: { type: Date, default: Date.now } // Date of the like
        }
    ],
    dislikes: [
        {
            user: { type: Schema.Types.ObjectId, ref: 'User' }, // User who liked the story
            date: { type: Date, default: Date.now } // Date of the like
        }
    ],
    comments: [ 
        new Schema(
            {
              content: { type: String, required: true },
              user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
              likes: [
                {
                  user: { type: Schema.Types.ObjectId, ref: 'User' },
                  date: { type: Date, default: Date.now }
                }
              ],
              dislikes: [
                {
                  user: { type: Schema.Types.ObjectId, ref: 'User' },
                  date: { type: Date, default: Date.now }
                }
              ],
              createdAt: { type: Date, default: Date.now }
            },
            { _id: true } // Explicitly enable `_id` for subdocuments
          )
      ], // Recursive replies
    visibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => Date.now() + 24*60*60*1000 } // 24 hours from creation
});

module.exports = mongoose.model('Story', storySchema);
