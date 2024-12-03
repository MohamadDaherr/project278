const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const isAuthenticated = require('../middleware/authMiddleware');
const ActiveFriend = require('../../models/ActiveFriend');
const Contributor = require('../../models/Contributor');
const Post = require('../../models/Post');
const Story = require('../../models/Story');
// Send friend request
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).lean(); // Fetch the logged-in user's details
        res.render('friends', { user }); // Pass user data to the EJS template
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({ message: "Server error" });
    }
});
router.post('/send-request', isAuthenticated, async (req, res) => {
    const { targetUserId } = req.body;
    const userId = req.user.userId;

    try {
        if (userId === targetUserId) {
            return res.status(400).json({ message: "You cannot send a friend request to yourself" });
        }

        const currentUser = await User.findById(userId);
        const targetUser = await User.findById(targetUserId);

        if (!currentUser || !targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        if (currentUser.friends.includes(targetUserId)) {
            return res.status(400).json({ message: "You are already friends" });
        }

        const existingRequest = await Notification.findOne({
            from: userId,
            to: targetUserId,
            type: 'friend-request',
        });

        if (existingRequest) {
            return res.status(400).json({ message: "Friend request already sent" });
        }

        targetUser.friendRequests.push(userId);
        await targetUser.save();

        await Notification.create({
            from: userId,
            to: targetUserId,
            type: 'friend-request',
        });

        res.status(200).json({ message: "Friend request sent" });
    } catch (error) {
        console.error("Error sending friend request:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Accept Friend Request
router.post('/accept-request', isAuthenticated, async (req, res) => {
    const { notificationId } = req.body;
    const userId = req.user.userId;

    try {
        const notification = await Notification.findById(notificationId);

        if (!notification || notification.type !== 'friend-request') {
            return res.status(404).json({ message: "Friend request not found" });
        }

        const requesterId = notification.from.toString();

        const currentUser = await User.findById(userId);
        const requester = await User.findById(requesterId);

        if (!currentUser || !requester) {
            return res.status(404).json({ message: "User not found" });
        }

        currentUser.friends.push(requesterId);
        requester.friends.push(userId);

        currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== requesterId);
        await currentUser.save();
        await requester.save();

        await Notification.create({
            from: userId,
            to: requesterId,
            type: 'friend-accepted',
        });

        await Notification.findByIdAndDelete(notificationId);

        res.status(200).json({ message: "Friend request accepted" });
    } catch (error) {
        console.error("Error accepting friend request:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// Decline Friend Request
router.post('/decline-request', isAuthenticated, async (req, res) => {
    const { notificationId } = req.body;
    const userId = req.user.userId;

    try {
        const notification = await Notification.findById(notificationId);

        if (!notification || notification.type !== 'friend-request') {
            return res.status(404).json({ message: "Friend request not found" });
        }

        const requesterId = notification.from.toString();

        const currentUser = await User.findById(userId);
        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== requesterId);
        await currentUser.save();

        await Notification.create({
            from: userId,
            to: requesterId,
            type: 'friend-declined',
        });

        await Notification.findByIdAndDelete(notificationId);

        res.status(200).json({ message: "Friend request declined" });
    } catch (error) {
        console.error("Error declining friend request:", error);
        res.status(500).json({ message: "Server error" });
    }
});


router.post('/remove', isAuthenticated, async (req, res) => {
    const { friendId } = req.body;
    const userId = req.user.userId;

    try {
        // Find both users
        const currentUser = await User.findById(userId);
        const friendUser = await User.findById(friendId);

        if (!currentUser || !friendUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if they are friends
        if (!currentUser.friends.includes(friendId) || !friendUser.friends.includes(userId)) {
            return res.status(400).json({ message: "You are not friends with this user" });
        }

        // Remove each other from the friends list
        currentUser.friends = currentUser.friends.filter(id => id.toString() !== friendId);
        friendUser.friends = friendUser.friends.filter(id => id.toString() !== userId);

        await currentUser.save();
        await friendUser.save();

        res.status(200).json({ message: "Friend removed successfully" });
    } catch (error) {
        console.error("Error removing friend:", error);
        res.status(500).json({ message: "Server error" });
    }
});
router.get('/top-contributors', isAuthenticated, async (req, res) => {
    const userId = req.user.userId;

    try {
        // Fetch user's friends
        const user = await User.findById(userId).populate('friends', 'username profileImage').lean();
        if (!user || !user.friends.length) {
            return res.json({ message: "No friends found", contributors: [] });
        }

        // Prepare contributors array
        const contributorsArray = await Promise.all(
            user.friends.map(async (friend) => {
                const sharedPostCount = await Post.countDocuments({ user: friend._id });
                const sharedStoryCount = await Story.countDocuments({user:friend._id}); // Adjust if you have a similar `Story` schema to count stories
                return {
                    friend,
                    sharedPostCount,
                    sharedStoryCount,
                    totalSharedContent: sharedPostCount + sharedStoryCount,
                };
            })
        );

        // Sort contributors by total shared content (descending order)
        const topContributors = contributorsArray
            .sort((a, b) => b.totalSharedContent - a.totalSharedContent)
            .slice(0, 3); // Top 3 contributors

        res.json(topContributors);
    } catch (error) {
        console.error("Error fetching top contributors:", error);
        res.status(500).json({ message: "Server error" });
    }
});





router.get('/active-friends', isAuthenticated, async (req, res) => {
    const userId = req.user.userId;

    try {
        const activeFriends = await ActiveFriend.find({ user: userId, friend: { $ne: userId } }) // Exclude self
            .populate('friend', 'username profileImage') // Fetch friend details
            .lean();
            // console.log("Active",activeFriends);
        if (!activeFriends.length) {
            return res.json({ message: "No active friends found", activeFriends: [] });
        }

        // Calculate total interaction score and sort the friends in descending order
        const sortedFriends = activeFriends.sort((a, b) => {
            const aScore = a.likeCount + a.commentCount + a.dislikeCount;
            const bScore = b.likeCount + b.commentCount + b.dislikeCount;
            return bScore - aScore; // Descending order
        });

        // Get the top 3 most active friends
        const top3ActiveFriends = sortedFriends.slice(0, 3);
        // console.log("top",top3ActiveFriends);
        res.json(top3ActiveFriends);
    } catch (error) {
        console.error("Error fetching active friends:", error);
        res.status(500).json({ message: "Server error" });
    }
});



router.get('/search-friends', isAuthenticated, async (req, res) => {
    const { type, query } = req.query;
    const userId = req.user.userId;

    try {
        let friends = [];
        if (type === 'top-contributors') {
            friends = await Contributor.find({ user: userId, friend: { $ne: userId } })
                .populate('friend', 'username profileImage')
                .sort({ sharedPostCount: -1, sharedStoryCount: -1 })
                .lean();
        } else if (type === 'active-friends') {
            friends = await ActiveFriend.find({ user: userId, friend: { $ne: userId } })
                .populate('friend', 'username profileImage')
                .sort({ likeCount: -1, commentCount: -1, dislikeCount: -1 })
                .lean();
        } else if (type === 'friends') {
            const user = await User.findById(userId).populate('friends', 'username profileImage').lean();
            friends = user.friends.map(friend => ({
                friend,
                sharedPostCount: 0,
                sharedStoryCount: 0,
                likeCount: 0,
                commentCount: 0,
                dislikeCount: 0,
            }));
        }

        // Filter friends based on the search query
        const filteredFriends = friends.filter(friend =>
            friend.friend.username.toLowerCase().includes(query.toLowerCase())
        );

        res.json(filteredFriends);
    } catch (error) {
        console.error("Error searching friends:", error);
        res.status(500).json({ message: "Server error" });
    }
});
router.get('/list', isAuthenticated, async (req, res) => {
    const userId = req.user.userId;

    try {
        const user = await User.findById(userId).populate('friends', 'username profileImage').lean();
        const friends = user.friends.map(friend => ({
            friend,
            sharedPostCount: 0,
            sharedStoryCount: 0,
            likeCount: 0,
            commentCount: 0,
            dislikeCount: 0,
        }));

        res.json(friends);
    } catch (error) {
        console.error("Error fetching friends list:", error);
        res.status(500).json({ message: "Server error" });
    }
});
router.get('/suggestions', isAuthenticated, async (req, res) => {
    const userId = req.user.userId;

    try {
        // Fetch the user's friends
        const user = await User.findById(userId).populate('friends', '_id').lean();
        const existingFriends = user.friends.map(friend => friend._id.toString());

        // Find top 3 active friends of the user
        const activeFriends = await ActiveFriend.find({ user: userId, friend: { $ne: userId } })
            .populate('friend', '_id')
            .sort({ likeCount: -1, commentCount: -1, dislikeCount: -1 })
            .limit(3)
            .lean();

        const topActiveFriendIds = activeFriends.map(f => f.friend._id.toString());

        // Fetch the most active friends of the user's top 3 active friends
        const suggestions = await ActiveFriend.find({
            user: { $in: topActiveFriendIds },
            friend: { $nin: [...existingFriends, userId] },
        })
            .populate('friend', 'username profileImage')
            .sort({ likeCount: -1, commentCount: -1, dislikeCount: -1 })
            .limit(9)
            .lean();
            
            // Filter out invalid suggestions (null friend) and remove duplicates
        const uniqueSuggestions = suggestions.filter((suggestion, index, self) => {
            // Skip if 'friend' is null or undefined
            if (!suggestion.friend) return false;

            // Remove duplicates by ensuring that friend._id is unique
            return index === self.findIndex((s) => s.friend && s.friend._id.toString() === suggestion.friend._id.toString());
        });

        res.json(uniqueSuggestions);
    } catch (error) {
        console.error("Error fetching friend suggestions:", error);
        res.status(500).json({ message: "Server error" });
    }
});





module.exports = router;
