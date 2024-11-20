const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const isAuthenticated = require('../middleware/authMiddleware');

// Send friend request
router.post('/send-request', isAuthenticated, async (req, res) => {
    const { targetUserId } = req.body;
    const userId = req.user.userId;

    try {
        if (userId === targetUserId) {
            return res.status(400).json({ message: "You cannot send a friend request to yourself" });
        }

        const currentUser = await User.findById(userId);
        const targetUser = await User.findById(targetUserId);

        if (!currentUser || !targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        if (currentUser.friends.includes(targetUserId)) {
            return res.status(400).json({ message: "You are already friends" });
        }

        const existingRequest = await Notification.findOne({
            from: userId,
            to: targetUserId,
            type: 'friend-request',
        });

        if (existingRequest) {
            return res.status(400).json({ message: "Friend request already sent" });
        }

        targetUser.friendRequests.push(userId);
        await targetUser.save();

        await Notification.create({
            from: userId,
            to: targetUserId,
            type: 'friend-request',
        });

        res.status(200).json({ message: "Friend request sent" });
    } catch (error) {
        console.error("Error sending friend request:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Accept Friend Request
router.post('/accept-request', isAuthenticated, async (req, res) => {
    const { notificationId } = req.body;
    const userId = req.user.userId;

    try {
        const notification = await Notification.findById(notificationId);

        if (!notification || notification.type !== 'friend-request') {
            return res.status(404).json({ message: "Friend request not found" });
        }

        const requesterId = notification.from.toString();

        const currentUser = await User.findById(userId);
        const requester = await User.findById(requesterId);

        if (!currentUser || !requester) {
            return res.status(404).json({ message: "User not found" });
        }

        currentUser.friends.push(requesterId);
        requester.friends.push(userId);

        currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== requesterId);
        await currentUser.save();
        await requester.save();

        await Notification.create({
            from: userId,
            to: requesterId,
            type: 'friend-accepted',
        });

        await Notification.findByIdAndDelete(notificationId);

        res.status(200).json({ message: "Friend request accepted" });
    } catch (error) {
        console.error("Error accepting friend request:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Decline Friend Request
router.post('/decline-request', isAuthenticated, async (req, res) => {
    const { notificationId } = req.body;
    const userId = req.user.userId;

    try {
        const notification = await Notification.findById(notificationId);

        if (!notification || notification.type !== 'friend-request') {
            return res.status(404).json({ message: "Friend request not found" });
        }

        const requesterId = notification.from.toString();

        const currentUser = await User.findById(userId);
        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== requesterId);
        await currentUser.save();

        await Notification.create({
            from: userId,
            to: requesterId,
            type: 'friend-declined',
        });

        await Notification.findByIdAndDelete(notificationId);

        res.status(200).json({ message: "Friend request declined" });
    } catch (error) {
        console.error("Error declining friend request:", error);
        res.status(500).json({ message: "Server error" });
    }
});


router.post('/remove', isAuthenticated, async (req, res) => {
    const { friendId } = req.body;
    const userId = req.user.userId;

    try {
        // Find both users
        const currentUser = await User.findById(userId);
        const friendUser = await User.findById(friendId);

        if (!currentUser || !friendUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if they are friends
        if (!currentUser.friends.includes(friendId) || !friendUser.friends.includes(userId)) {
            return res.status(400).json({ message: "You are not friends with this user" });
        }

        // Remove each other from the friends list
        currentUser.friends = currentUser.friends.filter(id => id.toString() !== friendId);
        friendUser.friends = friendUser.friends.filter(id => id.toString() !== userId);

        await currentUser.save();
        await friendUser.save();

        res.status(200).json({ message: "Friend removed successfully" });
    } catch (error) {
        console.error("Error removing friend:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
