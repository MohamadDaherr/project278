const express = require('express');
const Message = require('../../models/Message');
const User = require('../../models/User'); 
const router = express.Router();
const isAuthenticated = require('../middleware/authMiddleware'); 
let io;

router.setSocket = (socket) => {
  io = socket;
};

// Route to fetch all users for the chat page
router.get('/', isAuthenticated, (req, res) => {
  const currentUserId = req.user.userId;
  const token = req.cookies.token;

  User.find({ _id: { $ne: currentUserId } })
    .select('firstName lastName username profileImage')
    .then(users => {
      res.render('chats', { users, currentUserId, token });
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('Error fetching users');
    });
});

// Route to send a message
router.post('/send-message', isAuthenticated, async (req, res) => {
  const { senderId, receiverId, message } = req.body;

  if (!mongoose.Types.ObjectId.isValid(senderId) || !mongoose.Types.ObjectId.isValid(receiverId)) {
    return res.status(400).json({ message: 'Invalid sender or receiver ID' });
  }

  try {
    const newMessage = new Message({
      senderId,
      receiverId,
      message,
    });

    await newMessage.save();

    // Emit message to both sender and receiver
    io.to(receiverId).emit('receive_message', { senderId, receiverId, message });
    io.to(senderId).emit('receive_message', { senderId, receiverId, message });

    res.status(200).json({ message: 'Message sent successfully!', data: newMessage });
  } catch (error) {
    console.error('Error saving message:', error);
    res.status(500).json({ message: 'Error saving message.' });
  }
});

// Route to retrieve chat history
router.get('/messages/:userId', isAuthenticated, async (req, res) => {
  const currentUserId = req.user.userId;
  const { userId } = req.params;

  try {
    const messages = await Message.find({
      $or: [
        { senderId: currentUserId, receiverId: userId },
        { senderId: userId, receiverId: currentUserId }
      ]
    })
      .sort({ timestamp: 1 })
      .populate('senderId receiverId', 'firstName lastName username profileImage');
 
    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).send('Error fetching messages');
  }
});


module.exports = router;
