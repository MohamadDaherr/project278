const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const isAuthenticated = require('../middleware/authMiddleware');
const ActiveFriend = require('../../models/ActiveFriend');
const Contributor = require('../../models/Contributor');

// Send friend request
router.get('/', isAuthenticated, (req, res) => {
    res.render('friends'); // Render the friends.ejs template
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
        const friends = await User.findById(userId).populate('friends', 'username profileImage').lean();

        const contributors = await Contributor.find({ user: userId ,friend: { $ne: userId }})
            .populate('friend', 'username profileImage')
            .sort({ sharedPostCount: -1, sharedStoryCount: -1 })
            .lean();

        // Merge friends who are not in the contributors list
        const contributorsMap = new Map(contributors.map(c => [c.friend._id.toString(), c]));
        friends.friends.forEach(friend => {
            if (!contributorsMap.has(friend._id.toString())) {
                contributorsMap.set(friend._id.toString(), {
                    friend,
                    sharedPostCount: 0,
                    sharedStoryCount: 0,
                });
            }
        });

        res.json([...contributorsMap.values()]);
    } catch (error) {
        console.error("Error fetching top contributors:", error);
        res.status(500).json({ message: "Server error" });
    }
});


router.get('/active-friends', isAuthenticated, async (req, res) => {
    const userId = req.user.userId;

    try {
        // Fetch active friends
        const activeFriends = await ActiveFriend.find({ user: userId, friend: { $ne: userId } }) // Exclude self
            .populate('friend', 'username profileImage') // Fetch friend details
            .sort({ likeCount: -1, commentCount: -1, dislikeCount: -1 }) // Sort by multiple fields
            .lean();

        // Include friends with 0 activity
        const allFriends = await User.findById(userId).populate('friends', 'username profileImage').lean();
        const allFriendsList = allFriends.friends.map(friend => ({
            friend,
            likeCount: 0,
            commentCount: 0,
            dislikeCount: 0,
        }));

        // Merge active friends and all friends
        const mergedFriends = allFriendsList.map(friend => {
            const activeFriend = activeFriends.find(active => active.friend._id.toString() === friend.friend._id.toString());
            return activeFriend || friend;
        });

        // Sort merged list by likeCount, commentCount, and dislikeCount
        mergedFriends.sort((a, b) => {
            if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
            if (b.commentCount !== a.commentCount) return b.commentCount - a.commentCount;
            return b.dislikeCount - a.dislikeCount;
        });

        res.json(mergedFriends);
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
            friends = await Contributor.find({ user: userId,friend: { $ne: userId }})
                .populate('friend', 'username profileImage')
                .sort({ sharedPostCount: -1, sharedStoryCount: -1 })
                .lean();
        } else if (type === 'active-friends') {
            friends = await ActiveFriend.find({ user: userId })
                .populate('friend', 'username profileImage')
                .sort({ likeCount: -1, commentCount: -1, dislikeCount: -1 })
                .lean();
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



module.exports = router;
