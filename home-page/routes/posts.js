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

        res.json({
            likesCount: post.likes.length,
            isLiked: existingLikeIndex === -1, // Return true if liked, false if unliked
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
        const post = await Post.findById(req.params.postId)
            .populate('user', 'username profileImage') // Populate the post author
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'username profileImage' // Populate user details in comments
                }
            })
            .populate('likes.user', 'username profileImage'); // Populate like details

        if (!post) return res.status(404).json({ message: 'Post not found' });

        res.json({
            _id: post._id,
            mediaUrl: post.mediaUrl,
            likesCount: post.likes.length,
            commentsCount: post.comments.length,
            isLiked: post.likes.some(like => like.user.toString() === req.user.userId),
            likedBy: post.likes.map(like => ({
                username: like.user.username,
                profileImage: like.user.profileImage,
            })),
            comments: post.comments.map(comment => ({
                content: comment.content,
                user: {
                    username: comment.user.username,
                    profileImage: comment.user.profileImage,
                },
            })),
        });
    } catch (error) {
        console.error("Error fetching post details:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
