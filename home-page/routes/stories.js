// home-page/routes/stories.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const Story = require('../../models/Story');
const router = express.Router();
const Contributor = require('../../models/Contributor');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/stories');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });
router.createStory = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Create a new story
        const newStory = new Story({
            user: userId,
            mediaUrl: `/uploads/stories/${req.file.filename}`,
            text: req.body.text || '',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Story expires in 24 hours
        });

        await newStory.save();

        // Update the Contributor schema
        await Contributor.findOneAndUpdate(
            { user: userId, friend: userId }, // Ensure the user is updating their own contributor record
            { $inc: { sharedStoryCount: 1 } }, // Increment the shared story count
            { upsert: true, new: true } // Create a record if it doesn't exist
        );

        res.redirect('/home'); // Redirect to home page after creating the story
    } catch (error) {
        console.error("Error creating story:", error);
        res.status(500).send("Server error");
    }
};

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
