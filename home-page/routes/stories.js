// home-page/routes/stories.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const Story = require('../../models/Story');
const router = express.Router();
const Contributor = require('../../models/Contributor');
const User = require('../../models/User');
const isAuthenticated = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/stories');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });
// router.post('/upload-story', isAuthenticated, upload.single('storyFile'), createStory);
// router.createStory = async (req, res) => {
//     try {
//         const userId = req.user.userId;

//         if (!req.file) {
//             return res.status(400).send("Media file is required for a story.");
//         }

//         const newStory = new Story({
//             user: userId,
//             mediaUrl: `/uploads/stories/${req.file.filename}`,
//             text: req.body.text || '',
//             expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Story expires in 24 hours
//         });

//         await newStory.save();

//         await Contributor.findOneAndUpdate(
//             { user: userId, friend: userId }, 
//             { $inc: { sharedStoryCount: 1 } },
//             { upsert: true, new: true }
//         );
        
//         // Update the Contributor schema for each friend
//         const user = await User.findById(userId).populate('friends', '_id');
//         if (user && user.friends.length > 0) {
//             const bulkOps = user.friends.map(friend => ({
//                 updateOne: {
//                     filter: { user: friend._id, friend: userId },
//                     update: { $inc: { sharedStoryCount: 1 } },
//                     upsert: true,
//                 },
//             }));
        
//             await Contributor.bulkWrite(bulkOps);
//         }
//         res.redirect('/home');
//     } catch (error) {
//         console.error("Error creating story:", error.message);
//         res.status(500).json({ message: "Server error during story creation." });
//     }
// };

// Route to handle story upload
router.post('/upload-story', isAuthenticated, upload.single('storyFile'), async (req, res) => {
    try {
        const userId = req.user.userId; // Ensure user is authenticated

        // Check if file is uploaded
        if (!req.file) {
            console.error("File upload failed.");
            return res.status(400).json({ message: 'Story file is required.' });
        }

        // Create new story
        const newStory = new Story({
            user: userId,
            mediaUrl: `/uploads/stories/${req.file.filename}`, // Path to the uploaded file
            text: req.body.text || '', // Optional text
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Story expires in 24 hours
        });

        await newStory.save(); // Save the story to the database

        // Update contributor data for the user
        await Contributor.findOneAndUpdate(
            { user: userId, friend: userId },
            { $inc: { sharedStoryCount: 1 } },
            { upsert: true, new: true }
        );

        // Update contributors for the user's friends
        const user = await User.findById(userId).populate('friends', '_id');
        if (user && user.friends.length > 0) {
            const bulkOps = user.friends.map(friend => ({
                updateOne: {
                    filter: { user: friend._id, friend: userId },
                    update: { $inc: { sharedStoryCount: 1 } },
                    upsert: true
                }
            }));
            await Contributor.bulkWrite(bulkOps);
        }

        console.log("Story created successfully:", newStory.mediaUrl);
        res.redirect('/home'); // Redirect back to the home page
    } catch (error) {
        console.error("Error uploading story:", error.message);
        res.status(500).json({ message: 'Server error during story creation.' });
    }
});


router.getStories = async (req, res) => {
    try {
        const stories = await Story.find({ expiresAt: { $gte: new Date() } }).populate('user');
        res.json(stories);
    } catch (error) {
        console.error("Error fetching stories:", error);
        res.status(500).send("Server error");
    }
};
module.exports = router;
