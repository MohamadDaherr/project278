const express = require('express');
const router = express.Router();
const Notification = require('../../models/Notification');
const isAuthenticated = require('../middleware/authMiddleware');

// Fetch all notifications for the logged-in user
router.get('/', isAuthenticated, async (req, res) => {
    const userId = req.user.userId;

    try {
        const notifications = await Notification.find({ to: userId })
            .populate('from', 'username firstName lastName') // Sender details
            .populate('post', 'content') // Post details for likes or comments
            .populate('story', 'mediaUrl') // Story details for likes
            .populate('comment', 'content') // Comment details
            .populate('reply', 'content') // Reply details
            .sort({ createdAt: -1 }) // Latest notifications first
            .lean();

        res.json(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: "Server error" });
    }
});
// Delete a notification
router.delete('/notifications/:notificationId', isAuthenticated, async (req, res) => {
    const { notificationId } = req.params;

    try {
        const deletedNotification = await Notification.findByIdAndDelete(notificationId);
        if (!deletedNotification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json({ message: "Notification deleted successfully" });
    } catch (error) {
        console.error("Error deleting notification:", error);
        res.status(500).json({ message: "Server error" });
    }
});
router.delete('/notifications/:notificationId', isAuthenticated, async (req, res) => {
    const { notificationId } = req.params;

    try {
        // Find and delete the notification
        const deletedNotification = await Notification.findByIdAndDelete(notificationId);

        if (!deletedNotification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json({ message: "Notification deleted successfully" });
    } catch (error) {
        console.error("Error deleting notification:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
