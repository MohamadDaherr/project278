// routes/profile.js

const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const User = require('../../login-page/models/User'); // Adjust path as needed
const Post = require('../models/Post'); // Adjust path as needed
const isAuthenticated = require('../middleware/authMiddleware'); // Ensure this middleware checks if a user is logged in

// Configure multer for profile image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../public/uploads/profileimages')); // Path to store uploaded profile images
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Profile route to render profile page with user data
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.userId; // Assuming userId is available in req.user from auth middleware

    // Fetch user info and posts
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).send("User not found");

    // Fetch user posts
    const posts = await Post.find({ user: userId }).sort({ createdAt: -1 }).lean();
    const postsCount = posts.length;

    // Send data to be rendered on profile page
    res.render('profile', {
      user: {
        ...user,
        postsCount,
      },
      posts,
    });
  } catch (error) {
    console.error("Error loading profile:", error);
    res.status(500).send("Server error");
  }
});

// Route to edit bio
router.post('/edit', isAuthenticated, async (req, res) => {
  try {
    const { bio } = req.body;
    const updatedUser = await User.findByIdAndUpdate(req.user.userId, { bio }, { new: true });
    
    if (!updatedUser) return res.status(404).send("User not found");

    res.json({ bio: updatedUser.bio });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).send("Server error");
  }
});

// Route to change profile photo
router.post('/edit/photo', isAuthenticated, upload.single('profileImage'), async (req, res) => {
  try {
      if (!req.file) {
          return res.status(400).json({ message: 'No file uploaded' });
      }

      // Update only the profileImage field
      const updatedUser = await User.findByIdAndUpdate(
          req.user.userId,
          { profileImage: `/uploads/profileimages/${req.file.filename}` },
          { new: true, runValidators: true }
      );

      if (!updatedUser) {
          return res.status(404).json({ message: 'User not found' });
      }

      res.json({ profileImage: updatedUser.profileImage });
  } catch (error) {
      console.error("Error updating profile photo:", error);
      res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
