// routes/friend.js

const express = require('express');
const path = require('path');
const router = express.Router();
const User = require('../../login-page/models/User');// Adjust path as needed
const isAuthenticated = require('../middleware/authMiddleware');

// Send a friend request
// friend.js
router.post('/friend-request/send', isAuthenticated, async (req, res) => {
    const { targetUserId } = req.body;
    const userId = req.user.userId;




    try {
        const currentUser = await User.findById(userId);
        const targetUser = await User.findById(targetUserId);
        console.log("Current User:", currentUser);
        console.log("Target User:", targetUser);

        if (!currentUser || !targetUser) {
            console.error("One or both users not found.");
            return res.status(404).json({ message: "User not found" });
        }

        if (currentUser.friends.includes(targetUserId)) {
            console.warn("Users are already friends.");
            return res.status(400).json({ message: "Already friends" });
        }

        // Check if friend request is already sent
        if (targetUser.notifications.some(notification => notification.from.toString() === userId)) {
            console.warn("Friend request already sent.");
            return res.status(400).json({ message: "Friend request already sent" });
        }

        // Add friend request
        targetUser.notifications.push({ type: 'friend-request', from: userId });
        await targetUser.save();

        console.log("Friend request sent successfully.");
        res.status(200).json({ message: "Friend request sent" });
    } catch (error) {
        console.error("Error sending friend request:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});



// Respond to a friend request
router.post('/friend-request/respond', isAuthenticated, async (req, res) => {
    const { requesterId, response } = req.body; // response is 'accepted' or 'declined'
    const userId = req.user.userId;

    try {
        const user = await User.findById(userId);
        const request = user.friendRequests.find(req => req.from.toString() === requesterId);

        if (!request) return res.status(404).json({ message: 'Friend request not found' });

        // Update friend request status
        request.status = response;
        await user.save();

        // Add to friends if accepted
        if (response === 'accepted') {
            user.friends.push(requesterId);
            await user.save();

            const requester = await User.findById(requesterId);
            requester.friends.push(userId);
            await requester.save();
        }

        res.status(200).json({ message: `Friend request ${response}` });
    } catch (error) {
        console.error('Error responding to friend request:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Remove a friend
router.post('/friend/remove', isAuthenticated, async (req, res) => {
    const { friendId } = req.body;
    const userId = req.user.userId;

    try {
        // Remove friend from both users' friend lists
        await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
        await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });

        res.status(200).json({ message: 'Friend removed' });
    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
