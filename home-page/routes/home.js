// home-page/routes/home.js
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const Post = require('../../models/Post');
const User = require('../../models/User');
const Story = require('../../models/Story');
const storyController = require('../routes/stories');
const isAuthenticated = require('../middleware/authMiddleware');
const Notification = require('../../models/Notification');
const Contributor = require('../../models/Contributor');

router.get('/logout', (req, res) => {
    res.clearCookie('token'); // Clear the authentication token cookie
    req.session = null; // If you use sessions, clear the session
    res.redirect('/auth/login'); // Redirect to the login page
});
// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/posts');
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

        // Find the current user and their friends
        const currentUser = await User.findById(userId).populate('friends');
        if (!currentUser) {
            console.error("User not found for ID:", userId);
            return res.status(404).send("User not found");
        }


        const friendIds = currentUser.friends.map(friend => friend._id);
        friendIds.push(userId); // Include the current user's own ID

        // Fetch posts based on friends and privacy settings
        let posts = await Post.find({
            $or: [
                { user: { $in: friendIds }, privacy: { $in: ['friends', 'public'] } }, // Friends' public or 'friends' posts
                { privacy: 'public' }, // Public posts from any user
                { user: userId, privacy: 'private' } // Current user's private posts
            ]
        })
            .populate('user', 'username profileImage') // Populate the post author details
            .populate({
                path: 'comments',
                populate: {
                    path: 'user',
                    select: 'username profileImage' // Populate commenter details
                }
            })
            .populate('likes.user', 'username profileImage') // Populate like details
            .sort({ createdAt: -1 }); // Sort by newest posts first

        // Fetch stories from friends and the user within the last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const stories = await Story.find({
            user: { $in: friendIds },
            createdAt: { $gte: oneDayAgo }
        }).populate('user').sort({ createdAt: -1 });

        posts = posts.map(post => ({
            ...post.toObject(),
            isOwner: post.user._id.toString() === userId, // Compare IDs and set boolean
        }));

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
        let mediaType = '';

        // Check if a file was uploaded
        if (req.file) {
            const fileExtension = path.extname(req.file.originalname).toLowerCase();
            mediaUrl = '/uploads/posts/' + req.file.filename;

            // Determine media type based on file extension
            if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExtension)) {
                mediaType = 'image';
            } else if (['.mp4', '.avi', '.mov', '.wmv'].includes(fileExtension)) {
                mediaType = 'video';
            } else {
                throw new Error('Unsupported media type');
            }
        }

        // Create a new post with the provided data
        const newPost = new Post({
            content,
            mediaUrl,
            mediaType,
            privacy,
            user: userId,
            likes: [],
            dislikes: [],
            comments: [],
        });

        // Save the post to the database
        await newPost.save();

        // Update the Contributor schema for the user
        await Contributor.findOneAndUpdate(
            { user: userId, friend: userId },
            { $inc: { sharedPostCount: 1 } },
            { upsert: true, new: true }
        );

        // Update the Contributor schema for each friend
        const user = await User.findById(userId).populate('friends', '_id');
        if (user && user.friends.length > 0) {
            const bulkOps = user.friends.map(friend => ({
                updateOne: {
                    filter: { user: friend._id, friend: userId },
                    update: { $inc: { sharedPostCount: 1 } },
                    upsert: true,
                },
            }));

            await Contributor.bulkWrite(bulkOps);
        }

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
router.get('/notifications', isAuthenticated, async (req, res) => {
    const userId = req.user.userId;

    try {
        const notifications = await Notification.find({ to: userId })
            .populate('from', 'username firstName lastName') // Sender details
            .sort({ createdAt: -1 }) // Latest notifications first
            .lean();

        res.json(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

