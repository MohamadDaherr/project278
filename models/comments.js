const mongoose = require('mongoose');
const { Schema } = mongoose;

const commentSchema = new Schema({
  content: { type: String, required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Author of the comment
  post: { type: Schema.Types.ObjectId, ref: 'Post', required: true }, // Associated post
  likes: [
      {
          user: { type: Schema.Types.ObjectId, ref: 'User' }, // User who liked the comment
          date: { type: Date, default: Date.now } // Date of the like
      }
  ],
  replies: [
      {
          content: { type: String, required: true },
          user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Author of the reply
          likes: [
              {
                  user: { type: Schema.Types.ObjectId, ref: 'User' }, // User who liked the reply
                  date: { type: Date, default: Date.now } // Date of the like
              }
          ],
          createdAt: { type: Date, default: Date.now }
      }
  ], // Recursive replies
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', commentSchema);
