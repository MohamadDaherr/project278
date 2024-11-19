const express = require('express');
const router = express.Router();
const Post = require('../../models/Post');
const User = require('../../models/User');
const isAuthenticated = require('../middleware/authMiddleware');

// Route to toggle like on a post
router.post('/:postId/like', isAuthenticated, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.userId; // Ensure req.user is populated with userId from auth middleware

  try {
      const post = await Post.findById(postId);
      if (!post) return res.status(404).json({ message: 'Post not found' });

      const isLiked = post.likes.includes(userId);
      if (isLiked) {
          // Unlike the post
          post.likes = post.likes.filter(id => id.toString() !== userId);
      } else {
          // Like the post
          post.likes.push(userId);
      }

      await post.save();
      res.json({ likesCount: post.likes.length, isLiked: !isLiked });
  } catch (error) {
      console.error("Error toggling like:", error);
      res.status(500).json({ message: "Server error" });
  }
});

// Route to add a comment to a post
router.post('/:postId/comment', isAuthenticated, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.userId; // Ensure req.user is populated with userId from auth middleware
  const { text } = req.body;

  try {
      const post = await Post.findById(postId);
      if (!post) return res.status(404).json({ message: 'Post not found' });

      const comment = { user: userId, text, createdAt: new Date() };
      post.comments.push(comment);
      await post.save();

      const populatedComment = await post.populate('comments.user', 'username').execPopulate();
      res.json({ user: { username: populatedComment.comments.slice(-1)[0].user.username }, text });
  } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ message: "Server error" });
  }
});

// Route to fetch post details (likes and comments)
router.get('/:postId', isAuthenticated, async (req, res) => {
  try {
      const post = await Post.findById(req.params.postId)
          .populate('likes', 'username')
          .populate('comments.user', 'username');

      if (!post) return res.status(404).json({ message: 'Post not found' });

      res.json({
          likesCount: post.likes.length,
          commentsCount: post.comments.length,
          isLiked: post.likes.some(like => like._id.toString() === req.user.userId),
          likedBy: post.likes,
          comments: post.comments,
      });
  } catch (error) {
      console.error("Error fetching post details:", error);
      res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
