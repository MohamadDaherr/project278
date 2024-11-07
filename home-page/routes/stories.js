// home-page/routes/stories.js
const express = require('express');
const router = express.Router();
const storyController = require('../controllers/storyController');

// Route to upload a new story
router.post('/upload-story', storyController.upload.single('mediaFile'), storyController.createStory);

// Route to get stories
router.get('/', storyController.getStories);

module.exports = router;
