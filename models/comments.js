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
  dislikes: [
      {
          user: { type: Schema.Types.ObjectId, ref: 'User' }, // User who liked the comment
          date: { type: Date, default: Date.now } // Date of the like
      }
  ],
  replies: [ 
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
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', commentSchema);
