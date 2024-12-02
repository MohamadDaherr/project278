// routes/profile.js
 
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const User = require('../../models/User'); // Adjust path as needed
const Post = require('../../models/Post'); // Adjust path as needed
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
    const userId = req.user.userId; // Assuming `userId` is available in `req.user` from the `authMiddleware`

    // Fetch user info and posts
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).send("User not found");

    // Fetch user posts
    let posts = await Post.find({ user: userId }).sort({ createdAt: -1 }).lean();
    const postsCount = posts.length;

    posts = posts.map(post => ({
      ...post,
      isOwner: post.user._id.toString() === userId, // Compare IDs and set boolean
    }));

    const formattedDateOfBirth = user.dateOfBirth
      ? new Date(user.dateOfBirth).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'Not provided';

    // Add formatted dateOfBirth to the user object
    user.formattedDateOfBirth = formattedDateOfBirth;

    // Add `currentUser` to `res.render`
    res.render('profile', {
      user: {
        ...user,
        postsCount,
      },
      posts,
      currentUser: req.user, // Pass the logged-in user's info as `currentUser`
    });
  } catch (error) {
    console.error("Error loading profile:", error);
    res.status(500).send("Server error");
  }
});


// Route to edit bio
router.post('/edit', isAuthenticated, async (req, res) => {
  try {
      const { bio, dateOfBirth, gender, address } = req.body;
      const updatedUser = await User.findByIdAndUpdate(
          req.user.userId,
          { bio, dateOfBirth, gender, address },
          { new: true }
      );
      
      if (!updatedUser) return res.status(404).send("User not found");

      res.json({
          bio: updatedUser.bio,
          dateOfBirth: updatedUser.dateOfBirth,
          gender: updatedUser.gender,
          address: updatedUser.address
      });
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

router.get('/posts/:postId', async (req, res) => {
  try {
      const post = await Post.findById(req.params.postId)
          .populate({
              path: 'comments',
              populate: {
                  path: 'user',
                  select: 'username profileImage' // Select only the fields you need
              }
          })
          .populate({
              path: 'likes.user',
              select: 'username profileImage' // Select relevant fields for likes
          })
          .populate('user', 'username profileImage','content'); // Populate the author of the post
          

      if (!post) {
          return res.status(404).json({ message: 'Post not found' });
      }
      console.log("Fetched Post:", post);

      res.json(post);
  } catch (err) {
      console.error("Error fetching post details:", err);
      res.status(500).send("Error fetching post details.");
  }
});

router.get('/user/:userId', isAuthenticated, async (req, res) => {
  try {
      const userId = req.user.userId; // Logged-in user
      const viewedUserId = req.params.userId;

      // Find the viewed user's details
      const viewedUser = await User.findById(viewedUserId)
      .select('username profileImage bio gender address dateOfBirth friends friendRequests isDeactivated');

      if (!viewedUser) {
          return res.status(404).send('User not found');
      }
      

      if (viewedUser.dateOfBirth) {
        viewedUser.formattedDateOfBirth = new Date(viewedUser.dateOfBirth).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }

      // Check friendship status
      const isFriend = viewedUser.friends.includes(userId);
      const isOwner = userId === viewedUserId;
      const isPending = viewedUser.friendRequests.includes(req.user.userId);

      // Filter posts based on privacy
      let posts = await Post.find({
          user: viewedUserId,
          $or: [
              { privacy: 'public' },
              { privacy: 'friends', user: userId, friends: { $in: [userId] } },
              { user: userId } // Owner can see their private posts
          ],
      }).sort({ createdAt: -1 });


      res.render('viewuserprofile', {
          viewedUser,
          isFriend,
          isOwner,
          posts,
          isPending,
          isDeactivated: viewedUser.isDeactivated
      });
  } catch (error) {
      console.error('Error loading user profile:', error);
      res.status(500).send('Server error');
  }
});


module.exports = router;
