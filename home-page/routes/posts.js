const express = require('express');
const router = express.Router();
const Post = require('../../models/Post');
const User = require('../../models/User');
const isAuthenticated = require('../middleware/authMiddleware');
const Notification = require('../../models/Notification');
const Comment = require('../../models/comments');
const ActiveFriend = require('../../models/ActiveFriend');

// Route to toggle like on a post
router.post('/:postId/like', isAuthenticated, async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.userId; // Ensure req.user is populated with userId from auth middleware

    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Check if user already liked the post
        const existingLikeIndex = post.likes.findIndex(like => like.user?.toString() === userId);

        if (existingLikeIndex !== -1) {
            // User has already liked the post, remove the like
            post.likes.splice(existingLikeIndex, 1);
        } else {
            // Add a new like
            post.likes.push({ user: userId, date: new Date() });
            // Notify post owner if the liker is not the owner
            if (post.user && post.user.toString() !== userId) {
                await Notification.create({
                    from: userId,
                    to: post.user,
                    type: 'post-like',
                    post: postId,
                });
            }
        }

        await post.save();

        // Refresh the likedBy list
        await post.populate('likes.user', 'username profileImage');

        

        res.json({
            likesCount: post.likes.length,
            isLiked: existingLikeIndex === -1,
            likedBy: post.likes.map(like => ({
                username: like.user.username,
                profileImage: like.user.profileImage,
            })),
        });
    } catch (error) {
        console.error("Error toggling like:", error);
        res.status(500).json({ message: "Server error" });
    }
});
router.post('/:postId/dislike', isAuthenticated, async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.userId; // Ensure req.user is populated with userId from auth middleware

    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const existingdisLikeIndex = post.dislikes.findIndex(dislike => dislike.user.toString() === userId);

        if (existingdisLikeIndex !== -1) {
            // User has already liked the post, remove the like
            post.dislikes.splice(existingdisLikeIndex, 1);
        } else {
            // Add a new like
            post.dislikes.push({ user: userId, date: new Date() });
        }

        await post.save();

        res.json({
            dislikesCount: post.dislikes.length,
            isdisLiked: existingdisLikeIndex === -1 // Return true if liked, false if unliked
        });
    } catch (error) {
        console.error("Error toggling like:", error);
        res.status(500).json({ message: "Server error" });
    }
});




  

// Route to add a comment to a post
router.post('/:postId/comment', isAuthenticated, async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.userId; // Ensure req.user is populated with userId from auth middleware
    const { content } = req.body; // Use 'content' to align with the Comment schema

    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Create the comment in the Comment collection
        const newComment = new Comment({
            content,
            user: userId,
            post: postId,
            createdAt: new Date(),
        });
        await newComment.save();

        // Add the comment's ObjectId to the post's comments array
        post.comments.push(newComment._id);
        await post.save();
        const activeFriend = await ActiveFriend.findOne({ user: post.user, friend: userId });
        if (activeFriend) {
            activeFriend.commentCount += 1;
            await activeFriend.save();
        } else {
            await ActiveFriend.create({
                user: post.user,
                friend: userId,
                commentCount: 1,
            });
        }

        // Notify the post owner if the commenter is not the owner
        if (post.user && post.user.toString() !== userId) {
            await Notification.create({
                from: userId,
                to: post.user,
                type: 'comment', // Notification type for comments
                post: postId,
                comment: newComment._id,
            });
        }

        // Populate the user field in the comment for the response
        const populatedComment = await Comment.findById(newComment._id).populate('user', 'username profileImage');

        res.json({
            content: populatedComment.content,
            user: {
                username: populatedComment.user.username,
                profileImage: populatedComment.user.profileImage,
            },
        });
    } catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).json({ message: "Server error" });
    }
});






// Route to fetch post details (likes and comments)
router.get('/:postId', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.userId; // Extract `userId` from `req.user`
        const post = await Post.findById(req.params.postId)
            .populate('user', 'username profileImage') // Populate post owner
            .populate({
                path: 'comments',
                populate: [
                    {
                        path: 'user',
                        select: 'username profileImage', // Populate user details for comments
                    },
                    {
                        path: 'replies.user',
                        select: 'username profileImage', // Populate user details for replies
                    },
                ],
            });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        res.json({
            _id: post._id,
            mediaUrl: post.mediaUrl,
            likesCount: post.likes.length,
            dislikesCount: post.dislikes.length,
            commentsCount: post.comments.length,
            isLiked: post.likes.some((like) => like.user?.toString() === req.user.userId),
            likedBy: post.likes.map((like) => ({
                username: like.user?.username || 'Unknown',
                profileImage: like.user?.profileImage || '/images/default-profile.png',
            })),
            comments: post.comments.map((comment) => ({
                _id: comment._id,
                isOwner: comment.user._id.toString() === userId, // Compare IDs and set boolean
                content: comment.content,
                likesCount: comment.likes.length,
                dislikesCount: comment.dislikes.length,
                user: {
                    username: comment.user?.username || 'Unknown',
                    profileImage: comment.user?.profileImage || '/images/default-profile.png',
                },
                replies: comment.replies.map((reply) => ({
                    _id: reply._id,
                    isOwner: reply.user._id.toString() === userId,
                    content: reply.content,
                    likesCount: reply.likes.length,
                    dislikesCount: reply.dislikes.length,
                    user: {
                        username: reply.user?.username || 'Unknown',
                        profileImage: reply.user?.profileImage || '/images/default-profile.png',
                    },
                })),
            })),
        });
    } catch (error) {
        console.error("Error fetching post details:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Fetch reactions (likes and dislikes) for posts, comments, or replies
router.get('/:type/:id/reactions', isAuthenticated, async (req, res) => {
    const { type, id } = req.params; // type could be 'post', 'comment', or 'reply'
  
    try {
      let likedBy = [];
      let dislikedBy = [];
  
      if (type === 'post') {
        const post = await Post.findById(id)
          .populate('likes.user', 'username profileImage')
          .populate('dislikes.user', 'username profileImage');
  
        if (!post) return res.status(404).json({ message: 'Post not found' });
  
        likedBy = post.likes.map(like => ({
          username: like.user.username,
          profileImage: like.user.profileImage,
        }));
  
        dislikedBy = post.dislikes.map(dislike => ({
          username: dislike.user.username,
          profileImage: dislike.user.profileImage,
        }));
      } else if (type === 'comment') {
        const comment = await Comment.findById(id)
          .populate('likes.user', 'username profileImage')
          .populate('dislikes.user', 'username profileImage');
  
        if (!comment) return res.status(404).json({ message: 'Comment not found' });
  
        likedBy = comment.likes.map(like => ({
          username: like.user.username,
          profileImage: like.user.profileImage,
        }));
  
        dislikedBy = comment.dislikes.map(dislike => ({
          username: dislike.user.username,
          profileImage: dislike.user.profileImage,
        }));
      } else if (type === 'reply') {
        const comment = await Comment.findOne({ 'replies._id': id })
        .populate('replies.user', 'username profileImage')
        .populate('replies.likes.user', 'username profileImage') // Populate nested likes
        .populate('replies.dislikes.user', 'username profileImage'); // Populate nested dislikes
  
        if (!comment) return res.status(404).json({ message: 'Reply not found' });
  
        const reply = comment.replies.id(id);
  
        if (!reply) return res.status(404).json({ message: 'Reply not found' });
  
        likedBy = reply.likes.map(like => ({
          username: like.user.username,
          profileImage: like.user.profileImage,
        }));
  
        dislikedBy = reply.dislikes.map(dislike => ({
          username: dislike.user.username,
          profileImage: dislike.user.profileImage,
        }));

      } else {
        return res.status(400).json({ message: 'Invalid type' });
      }
  
      res.json({ likedBy, dislikedBy });
    } catch (error) {
      console.error('Error fetching reactions:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  

  router.delete('/delete/:type/:id', isAuthenticated, async (req, res) => {
    const { type, id } = req.params;
    const userId = req.user.userId;

    try {
        if (type === 'post') {
            const post = await Post.findById(id);
            if (!post) return res.status(404).json({ message: 'Post not found' });
            if (post.user.toString() !== userId) return res.status(403).json({ message: 'Not authorized' });

            await Post.findByIdAndDelete(id);
            res.json({ message: 'Post deleted' });
        } else if (type === 'comment') {
            // Find and delete the comment
            const comment = await Comment.findById(id);

            if (!comment) {
                console.error('Comment not found for ID:', id);
                return res.status(404).json({ message: 'Comment not found' });
            }

            // Ensure only the owner can delete the comment
            if (comment.user.toString() !== userId) {
                console.error('Unauthorized attempt to delete comment by user:', userId);
                return res.status(403).json({ message: 'Unauthorized' });
            }

            // Delete the comment and all its replies
            await comment.deleteOne();
            res.json({ message: 'Comment deleted successfully' });
        } else if (type === 'reply') {
            // Find the parent comment containing the reply
            const comment = await Comment.findOne({ 'replies._id': id });

            if (!comment) {
                console.error('Parent comment not found for reply ID:', id);
                return res.status(404).json({ message: 'Comment not found' });
            }

            // Find the reply to delete
            const reply = comment.replies.id(id);
            
            if (!reply) {
                console.error('Reply not found for ID:', id);
                return res.status(404).json({ message: 'Reply not found' });
            }

            // Ensure only the owner can delete the reply
            if (reply.user.toString() !== userId) {
                console.error('Unauthorized attempt to delete reply by user:', userId);
                return res.status(403).json({ message: 'Unauthorized' });
            }

            // Remove the reply
            reply.deleteOne();
            await comment.save();

            res.json({ message: 'Reply deleted successfully' });
        } else {
            console.error('Invalid delete type:', type);
            return res.status(400).json({ message: 'Invalid type' });
        }
    } catch (error) {
        console.error('Error deleting:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
