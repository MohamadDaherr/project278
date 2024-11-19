// home-page/routes/stories.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const Story = require('../../models/Story');
const router = express.Router();
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
        const newStory = new Story({
            user: req.user.userId,
            mediaUrl: `/uploads/stories/${req.file.filename}`,
            text: req.body.text || '',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
        await newStory.save();
        res.redirect('/home');
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
