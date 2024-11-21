const express = require('express');
const router = express.Router();
const Post = require('../../models/Post');
const User = require('../../models/User');
const Comment = require('../../models/comments');
const isAuthenticated = require('../middleware/authMiddleware');

// Route to toggle like on a post
router.post('/:postId/like', isAuthenticated, async (req, res) => {
    const { postId } = req.params;
    const userId = req.user.userId; // Ensure req.user is populated with userId from auth middleware

    try {
        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: 'Post not found' });

        const existingLikeIndex = post.likes.findIndex(like => like.user.toString() === userId);

        if (existingLikeIndex !== -1) {
            // User has already liked the post, remove the like
            post.likes.splice(existingLikeIndex, 1);
        } else {
            // Add a new like
            post.likes.push({ user: userId, date: new Date() });
        }

        await post.save();

        res.json({
            likesCount: post.likes.length,
            isLiked: existingLikeIndex === -1 // Return true if liked, false if unliked
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
            createdAt: new Date()
        });
        await newComment.save();

        // Add the comment's ObjectId to the post's comments array
        post.comments.push(newComment._id);
        await post.save();

        // Populate the user field in the comment for the response
        const populatedComment = await Comment.findById(newComment._id).populate('user', 'username profileImage');

        res.json({
            content: populatedComment.content,
            user: {
                username: populatedComment.user.username,
                profileImage: populatedComment.user.profileImage
            }
        });
    } catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).json({ message: "Server error" });
    }
});





// Route to fetch post details (likes and comments)
router.get('/:postId', isAuthenticated, async (req, res) => {
    try {
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
            commentsCount: post.comments.length,
            isLiked: post.likes.some((like) => like.user?.toString() === req.user.userId),
            likedBy: post.likes.map((like) => ({
                username: like.user?.username || 'Unknown',
                profileImage: like.user?.profileImage || '/images/default-profile.png',
            })),
            comments: post.comments.map((comment) => ({
                _id: comment._id,
                content: comment.content,
                likesCount: comment.likes.length,
                dislikesCount: comment.dislikes.length,
                user: {
                    username: comment.user?.username || 'Unknown',
                    profileImage: comment.user?.profileImage || '/images/default-profile.png',
                },
                replies: comment.replies.map((reply) => ({
                    _id: reply._id,
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





module.exports = router;
