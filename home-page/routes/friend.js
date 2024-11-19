// routes/friend.js

const express = require('express');
const path = require('path');
const router = express.Router();
const User = require('../../models/User');// Adjust path as needed
const isAuthenticated = require('../middleware/authMiddleware');

// Send a friend request
// friend.js
router.post('/send-request', isAuthenticated, async (req, res) => {
    const { targetUserId } = req.body;
    const userId = req.user.userId;

    try {
        const currentUser = await User.findById(userId);
        const targetUser = await User.findById(targetUserId);

        if (!currentUser || !targetUser) return res.status(404).json({ message: "User not found" });

        // Check if already friends
        if (currentUser.friends.includes(targetUserId)) {
            return res.status(400).json({ message: "Already friends" });
        }

        // Check if there's a declined request or a pending one
        const existingRequest = targetUser.notifications.find(
            notification => notification.from.toString() === userId && notification.type === 'friend-request'
        );

        if (existingRequest) {
            return res.status(400).json({ message: "Request already sent" });
        }

        // Clear any previous declined requests
        targetUser.notifications = targetUser.notifications.filter(
            notification => !(notification.from.toString() === userId && notification.type === 'friend-declined')
        );

        // Add the friend request and notification
        targetUser.friendRequests.push(userId);
        targetUser.notifications.push({ from: userId, type: 'friend-request', status: 'pending' });

        await targetUser.save();
        res.status(200).json({ message: "Friend request sent" });
    } catch (error) {
        console.error("Error sending friend request:", error);
        res.status(500).json({ message: "Server error" });
    }
});
router.delete('/delete-notification/:notificationId', isAuthenticated, async (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user.userId;

    try {
        // Find the user and remove the notification by ID
        const user = await User.findById(userId);
        user.notifications = user.notifications.filter(
            (notification) => notification._id.toString() !== notificationId
        );
        
        await user.save();
        res.status(200).json({ message: "Notification deleted successfully" });
    } catch (error) {
        console.error("Error deleting notification:", error);
        res.status(500).json({ message: "Server error" });
    }
});



// Respond to a friend request
router.post('/accept-request', isAuthenticated, async (req, res) => {
    const { requesterId } = req.body; // ID of the user who sent the friend request
    const userId = req.user.userId; // ID of the user who received the friend request

    try {
        const currentUser = await User.findById(userId);
        const requester = await User.findById(requesterId);

        if (!currentUser || !requester) return res.status(404).json({ message: "User not found" });

        // Add each other as friends
        currentUser.friends.push(requesterId);
        requester.friends.push(userId);

        // Update notifications for both users
        currentUser.notifications = currentUser.notifications.map(notification => {
            if (notification.from.toString() === requesterId && notification.type === 'friend-request') {
                return { ...notification, type: 'friend-accepted', status: 'accepted' };
            }
            return notification;
        });
        requester.notifications.push({ from: userId, type: 'friend-accepted', status: 'accepted' });

        await currentUser.save();
        await requester.save();

        res.status(200).json({ message: "Friend request accepted" });
    } catch (error) {
        console.error("Error accepting friend request:", error);
        res.status(500).json({ message: "Server error" });
    }
});

router.post('/decline-request', isAuthenticated, async (req, res) => {
    const { requesterId } = req.body; // ID of the user who sent the friend request
    const userId = req.user.userId; // ID of the user who received the friend request

    try {
        const currentUser = await User.findById(userId);

        if (!currentUser) return res.status(404).json({ message: "User not found" });

        // Remove the requester's ID from the friendRequests array
        currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== requesterId);

        // Update the notification to indicate the request was declined
        currentUser.notifications = currentUser.notifications.map(notification => {
            if (notification.from.toString() === requesterId && notification.type === 'friend-request') {
                return { ...notification, type: 'friend-declined', status: 'declined' };
            }
            return notification;
        });

        await currentUser.save();
        res.status(200).json({ message: "Friend request declined" });
    } catch (error) {
        console.error("Error declining friend request:", error);
        res.status(500).json({ message: "Server error" });
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
router.get('/list', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await User.findById(userId).populate('friends', 'username firstName lastName');
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        
        res.json(user.friends);
    } catch (error) {
        console.error("Error fetching friends list:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
