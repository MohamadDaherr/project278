// home-page/routes/home.js
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const Post = require('../models/Post');
const User = require('../../login-page/models/User');
const Story = require('../models/Story');
const storyController = require('../controllers/storyController');
const isAuthenticated = require('../middleware/authMiddleware');


// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });
router.post('/upload-story', isAuthenticated, upload.single('storyFile'), storyController.createStory);

// Home route with authentication
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const userId = req.user.userId; // Extract `userId` from `req.user`
        console.log("Fetching user with ID:", userId); // Debug log

        // Find the current user and their friends
        const currentUser = await User.findById(userId).populate('friends');
        if (!currentUser) {
            console.error("User not found for ID:", userId);
            return res.status(404).send("User not found");
        }

        console.log("Current user and friends:", currentUser); // Debug log

        const friendIds = currentUser.friends.map(friend => friend._id);
        friendIds.push(userId); // Include the current user's own ID

        // Fetch posts based on friend and privacy settings
        const posts = await Post.find({
            $or: [
                { user: { $in: friendIds }, privacy: { $in: ['friends', 'public'] } },
                { privacy: 'public' },
                { user: userId, privacy: 'private' }
            ]
        }).populate('user').sort({ createdAt: -1 });

        // Fetch stories from friends and the user within the last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const stories = await Story.find({
            user: { $in: friendIds },
            createdAt: { $gte: oneDayAgo }
        }).populate('user').sort({ createdAt: -1 });

        console.log("Fetched posts and stories successfully"); // Debug log

        // Render the home page, passing posts, stories, and the current user
        res.render('home', { posts, stories, user: currentUser });
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).send("Server error");
    }
});


router.post('/create-post', isAuthenticated, upload.single('mediaFile'), async (req, res) => {
    try {
        const userId = req.user.userId;
        const { content, privacy } = req.body;
        let mediaUrl = '';

        // Check if a file was uploaded
        if (req.file) {
            mediaUrl = '/uploads/' + req.file.filename; // Save the file path to mediaUrl
        }

        // Create a new post with the provided data
        const newPost = new Post({
            content,
            mediaUrl,
            privacy,
            user: userId
        });

        // Save the post to the database
        await newPost.save();
        res.redirect('/home'); // Redirect to home page after posting
    } catch (error) {
        console.error("Error creating post:", error);
        res.status(500).send("Server error");
    }
});
router.get('/search-users', isAuthenticated, async (req, res) => {
    const { query } = req.query;
    const userId = req.user.userId;

    try {
        const users = await User.find({
            $and: [
                { _id: { $ne: userId } }, // Exclude the current user
                { $or: [ 
                    { username: { $regex: query, $options: 'i' } }, 
                    { firstName: { $regex: query, $options: 'i' } } // Search by first name if username isn’t available
                ]}
            ]
        }).lean();

        const currentUser = await User.findById(userId);
        const results = users.map(user => ({
            _id: user._id,
            username: user.username || '', // Default to empty if no username
            firstName: user.firstName || '', // Add first name for display
            isFriend: currentUser.friends.includes(user._id)
        }));

        console.log("Search Results:", results); // Log the search results
        res.json(results);
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Route to send a friend request
// router.post('/friend-request/send', isAuthenticated, async (req, res) => {
//     const { targetUserId } = req.body;
//     const userId = req.user.userId;

//     try {
//         const currentUser = await User.findById(userId);
//         const targetUser = await User.findById(targetUserId);

//         if (!currentUser || !targetUser) return res.status(404).json({ message: "User not found" });

//         if (!currentUser.friends.includes(targetUserId)) {
//             targetUser.notifications.push({ type: 'friend-request', from: userId });
//             await targetUser.save();
//             res.status(200).json({ message: "Friend request sent" });
//         } else {
//             res.status(400).json({ message: "Already friends" });
//         }
//     } catch (error) {
//         console.error("Error sending friend request:", error);
//         res.status(500).json({ message: "Server error" });
//     }
// });

// Route to remove a friend
// router.post('/friend/remove', isAuthenticated, async (req, res) => {
//     const { friendId } = req.body;
//     const userId = req.user.userId;

//     try {
//         const currentUser = await User.findById(userId);
//         const friendUser = await User.findById(friendId);

//         if (!currentUser || !friendUser) return res.status(404).json({ message: "User not found" });

//         currentUser.friends.pull(friendId);
//         friendUser.friends.pull(userId);

//         await currentUser.save();
//         await friendUser.save();

//         res.status(200).json({ message: "Friend removed" });
//     } catch (error) {
//         console.error("Error removing friend:", error);
//         res.status(500).json({ message: "Server error" });
//     }
// });

// Route to fetch notifications
router.get('/notifications', isAuthenticated, async (req, res) => {
    const userId = req.user.userId;

    try {
        const user = await User.findById(userId).populate('notifications.from', 'firstName').lean();
        const unreadNotifications = user.notifications.filter(n => !n.read);

        res.json(unreadNotifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Profile route in home.js or a profile-specific route file
// router.get('/profile', isAuthenticated, async (req, res) => {
//     try {
//         const userId = req.user.userId;
//         const user = await User.findById(userId).populate('friends').lean();
//         const posts = await Post.find({ user: userId }).sort({ createdAt: -1 }).lean();
        
//         res.render('profile', { user, posts });
//     } catch (error) {
//         console.error("Error loading profile:", error);
//         res.status(500).send("Server error");
//     }
// });
// router.post('/profile/toggle-privacy/:userId', isAuthenticated, async (req, res) => {
//     try {
//         const userId = req.params.userId;
//         const user = await User.findById(userId);
        
//         if (user) {
//             user.isPrivate = !user.isPrivate;
//             await user.save();
//             res.json({ success: true });
//         } else {
//             res.status(404).json({ success: false, message: "User not found" });
//         }
//     } catch (error) {
//         console.error("Error toggling privacy:", error);
//         res.status(500).json({ success: false });
//     }
// });


module.exports = router;

