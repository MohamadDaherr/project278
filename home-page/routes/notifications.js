const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const isAuthenticated = require('../middleware/authMiddleware');

// Get notifications
router.get('/notifications', isAuthenticated, async (req, res) => {
  const userId = req.user.userId;

  try {
      const user = await User.findById(userId)
          .populate('notifications.from', 'username firstName') // Ensure we get `username` and `firstName` from the sender
          .lean();

      if (!user) return res.status(404).json({ message: "User not found" });

      // Filter notifications that are unread
      const unreadNotifications = user.notifications.filter(notification => !notification.read);

      res.json(unreadNotifications);
  } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;