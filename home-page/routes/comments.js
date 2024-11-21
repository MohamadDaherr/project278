const express = require('express'); // Express for routing
const router = express.Router(); // Express Router
const Comment = require('../../models/comments'); // Import the Comment schema
const isAuthenticated = require('../middleware/authMiddleware');
const User = require('../../models/User'); // Adjust the path if needed




router.post('/:commentId/like', isAuthenticated, async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.userId;

    try {
        const comment = await Comment.findById(commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        const isLiked = comment.likes.some(like => like.user.toString() === userId);
        if (isLiked) {
            // Unlike the comment
            comment.likes = comment.likes.filter(like => like.user.toString() !== userId);
        } else {
            // Like the comment
            comment.likes.push({ user: userId, date: new Date() });
        }

        await comment.save();
        res.json({ likesCount: comment.likes.length, isLiked: !isLiked });
    } catch (error) {
        console.error("Error toggling comment like:", error);
        res.status(500).json({ message: "Server error" });
    }
});

router.post('/:commentId/dislike', isAuthenticated, async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.userId;

    try {
        const comment = await Comment.findById(commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        const isdisLiked = comment.dislikes.some(dislike => dislike.user.toString() === userId);
        if (isdisLiked) {
            // Unlike the comment
            comment.dislikes = comment.dislikes.filter(dislike => dislike.user.toString() !== userId);
        } else {
            // Like the comment
            comment.dislikes.push({ user: userId, date: new Date() });
        }

        await comment.save();
        res.json({ dislikesCount: comment.dislikes.length, isdisLiked: !isdisLiked });
    } catch (error) {
        console.error("Error toggling comment like:", error);
        res.status(500).json({ message: "Server error" });
    }
});


router.post('/:commentId/replies/:replyIndex/like', isAuthenticated, async (req, res) => {
    const { commentId, replyIndex } = req.params;
    const userId = req.user.userId;

    console.log("userId",userId);
    console.log("commentId",commentId);
    console.log("replyId",replyIndex);
    try {
        const comment = await Comment.findById(commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        const reply = comment.replies.id(replyIndex);
        if (!reply) return res.status(404).json({ message: 'Reply not found' });

        const isLiked = reply.likes.some(like => like.user.toString() === userId);
        if (isLiked) {
            // Unlike the reply
            reply.likes = reply.likes.filter(like => like.user.toString() !== userId);
        } else {
            // Like the reply
            reply.likes.push({ user: userId, date: new Date() });
        }

        await comment.save();
        res.json({ likesCount: reply.likes.length, isLiked: !isLiked });
    } catch (error) {
        console.error("Error toggling reply like:", error);
        res.status(500).json({ message: "Server error" });
    }
});
router.post('/:commentId/replies/:replyIndex/dislike', isAuthenticated, async (req, res) => {
    const { commentId, replyIndex } = req.params;
    const userId = req.user.userId;

    console.log("userId",userId);
    console.log("commentId",commentId);
    console.log("replyId",replyIndex);
    try {
        const comment = await Comment.findById(commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        const reply = comment.replies.id(replyIndex);
        if (!reply) return res.status(404).json({ message: 'Reply not found' });

        const isdisLiked = reply.dislikes.some(dislike => dislike.user.toString() === userId);
        if (isdisLiked) {
            // Unlike the reply
            reply.dislikes = reply.dislikes.filter(dislike => dislike.user.toString() !== userId);
        } else {
            // Like the reply
            reply.dislikes.push({ user: userId, date: new Date() });
        }

        await comment.save();
        res.json({ dislikesCount: reply.dislikes.length, isdisLiked: !isdisLiked });
    } catch (error) {
        console.error("Error toggling reply Dislike:", error);
        res.status(500).json({ message: "Server error" });
    }
});




router.post('/:commentId/reply', isAuthenticated, async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.userId; // Ensure the user is authenticated
    const { content } = req.body;

    console.log("Reply endpoint triggered for commentId:", commentId); // Log the commentId
    console.log("User ID:", userId); // Log the user ID
    console.log("Reply content:", content); // Log the reply content

    try {
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Add the reply
        const newReply = {
            content,
            user: userId,
            likes: [],
            dislikes: [],
            createdAt: new Date(),
        };
        comment.replies.push(newReply);
        await comment.save();

        // Populate the user's details for the response
        const populatedReply = comment.replies[comment.replies.length - 1];
        const populatedUser = await User.findById(userId).select('username profileImage');
        res.json({
            _id: populatedReply._id,
            content: populatedReply.content,
            user: {
                username: populatedUser.username,
                profileImage: populatedUser.profileImage,
            },
        });
    } catch (error) {
        console.error('Error adding reply:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


module.exports = router;


