// home-page/routes/home.js
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const Post = require('../models/Post');
const User = require('../../login-page/models/User');


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

// Authentication middleware to check for token and decode it
const isAuthenticated = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        console.log("No token found, redirecting to login");
        return res.redirect('/auth/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach decoded token (with `userId`) to `req.user`
        console.log("Decoded user ID:", req.user.userId); // Debug log
        next();
    } catch (error) {
        console.error('JWT verification failed:', error);
        res.clearCookie('token');
        return res.redirect('/auth/login');
    }
};

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
        friendIds.push(userId);

        // Fetch posts based on friend and privacy settings
        const posts = await Post.find({
            $or: [
                { user: { $in: friendIds }, privacy: { $in: ['friends', 'public'] } },
                { privacy: 'public' },
                { user: userId, privacy: 'private' }
            ]
        }).populate('user').sort({ createdAt: -1 });

        res.render('home', { posts, user: currentUser });
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
module.exports = router;
