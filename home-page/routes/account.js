const express = require('express');
const router = express.Router();
const Post = require('../../models/Post');
const User = require('../../models/User');
const isAuthenticated = require('../middleware/authMiddleware');
const Notification = require('../../models/Notification');
const Story = require('../../models/Story');

router.post('/deactivate-account', isAuthenticated, async (req, res) => {
    const userId = req.user.userId;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Toggle the deactivation status
        user.isDeactivated = !user.isDeactivated;
        await user.save();

        // Respond with appropriate message based on new status
        if (user.isDeactivated) {
            res.status(200).json({ message: "Account deactivated successfully" });
        } else {
            res.status(200).json({ message: "Account reactivated successfully" });
        }
    } catch (error) {
        console.error("Error deactivating/reactivating account:", error);
        res.status(500).json({ message: "Server error" });
    }
});


// Delete account
router.post('/delete-account', isAuthenticated, async (req, res) => {
  const userId = req.user.userId;

  try {
      // Find and delete the user
      const user = await User.findByIdAndDelete(userId);
      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }

      // Optional: Clean up related content
      await Post.deleteMany({ user: userId }); // Delete user's posts
      await Story.deleteMany({ user: userId }); // Delete user's stories
      await Notification.deleteMany({ $or: [{ from: userId }, { to: userId }] }); // Remove related notifications

      res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
