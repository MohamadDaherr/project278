// home-page/routes/stories.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const Story = require('../../models/Story');

const router = express.Router();

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/stories');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Route to upload a new story
router.post('/upload-story', upload.single('mediaFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("No media file uploaded.");
        }
        const newStory = new Story({
            user: req.user?.userId || 'Anonymous', // Default to 'Anonymous' if userId is not provided
            mediaUrl: `/uploads/stories/${req.file.filename}`,
            text: req.body.text || '',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
        });
        await newStory.save();
        res.redirect('/home');
    } catch (error) {
        console.error("Error creating story:", error);
        res.status(500).send("Server error");
    }
});

// Route to get stories
router.get('/', async (req, res) => {
    try {
        const stories = await Story.find({ expiresAt: { $gte: new Date() } }).populate('user');
        res.json(stories);
    } catch (error) {
        console.error("Error fetching stories:", error);
        res.status(500).send("Server error");
    }
});

module.exports = router;
