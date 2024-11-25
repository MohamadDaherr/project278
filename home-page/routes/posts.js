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
    const userId = req.user.userId;

    try {
        const post = await Post.findById(postId).populate('user', '_id'); // Get the post owner
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const postOwnerId = post.user._id.toString();
        const existingLikeIndex = post.likes.findIndex(like => like.user?.toString() === userId);

        if (existingLikeIndex !== -1) {
            // Remove like and decrement likeCount
            post.likes.splice(existingLikeIndex, 1);
            await ActiveFriend.updateOne(
                { user: postOwnerId, friend: userId },
                { $inc: { likeCount: -1 } },
                { upsert: true }
            );
        } else {
            // Add like and increment likeCount
            post.likes.push({ user: userId, date: new Date() });
            await ActiveFriend.updateOne(
                { user: postOwnerId, friend: userId },
                { $inc: { likeCount: 1 } },
                { upsert: true }
            );
            // Notify post owner if liker is not the owner
            if (postOwnerId !== userId) {
                await Notification.create({
                    from: userId,
                    to: postOwnerId,
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
    const userId = req.user.userId;

    try {
        const post = await Post.findById(postId).populate('user', '_id'); // Get the post owner
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const postOwnerId = post.user._id.toString();
        const existingDislikeIndex = post.dislikes.findIndex(dislike => dislike.user.toString() === userId);

        if (existingDislikeIndex !== -1) {
            // Remove dislike and decrement dislikeCount
            post.dislikes.splice(existingDislikeIndex, 1);
            await ActiveFriend.updateOne(
                { user: postOwnerId, friend: userId },
                { $inc: { dislikeCount: -1 } },
                { upsert: true }
            );
        } else {
            // Add dislike and increment dislikeCount
            post.dislikes.push({ user: userId, date: new Date() });
            await ActiveFriend.updateOne(
                { user: postOwnerId, friend: userId },
                { $inc: { dislikeCount: 1 } },
                { upsert: true }
            );
            if (postOwnerId !== userId) {
                await Notification.create({
                    from: userId,
                    to: postOwnerId,
                    type: 'post-dislike',
                    post: postId, // Include the post ID for reference
                });
            }
            
        }

        await post.save();

        res.json({
            dislikesCount: post.dislikes.length,
            isDisliked: existingDislikeIndex === -1,
        });
    } catch (error) {
        console.error("Error toggling dislike:", error);
        res.status(500).json({ message: "Server error" });
    }
});





  

// Route to add a comment to a post
router.post('/:postId/comment', isAuthenticated, async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.userId;
    const { content } = req.body;

    try {
        const post = await Post.findById(postId).populate('user', '_id'); // Get the post owner
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const postOwnerId = post.user._id.toString();

        // Create a new comment
        const newComment = new Comment({
            content,
            user: userId,
            post: postId,
            createdAt: new Date(),
        });
        await newComment.save();

        // Add comment to post
        post.comments.push(newComment._id);
        await post.save();

        // Update comment count for the post owner
        await ActiveFriend.updateOne(
            { user: postOwnerId, friend: userId },
            { $inc: { commentCount: 1 } },
            { upsert: true }
        );

        // Notify post owner if commenter is not the owner
        if (postOwnerId !== userId) {
            await Notification.create({
                from: userId,
                to: postOwnerId,
                type: 'comment',
                post: postId,
                comment: newComment._id,
            });
        }

        const populatedComment = await Comment.findById(newComment._id).populate('user', 'username profileImage');
        const CommentCount = post.comments.length;
        res.json({
            content: populatedComment.content,
            user: {
                username: populatedComment.user.username,
                profileImage: populatedComment.user.profileImage,
            },
            CommentCount,
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
            isOwner: post.user._id.toString() === userId,
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
            // Delete a comment
            const comment = await Comment.findById(id);

            if (!comment) {
                return res.status(404).json({ message: 'Comment not found' });
            }

            // Ensure only the owner can delete the comment
            if (comment.user.toString() !== userId) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            // Get the associated post
            const post = await Post.findById(comment.post);

            if (!post) {
                return res.status(404).json({ message: 'Post not found' });
            }

            // Remove the comment ID from the post's comments array
            post.comments = post.comments.filter(commentId => commentId.toString() !== id);
            await post.save();

            // Delete the comment
            await comment.deleteOne();

            // Return the updated comment count
            const updatedCommentCount = post.comments.length;
            res.json({ message: 'Comment deleted successfully', updatedCommentCount });
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
