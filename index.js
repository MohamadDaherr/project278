const express = require('express');
const session = require('express-session');
const connectDB = require('./config/db');
const authRoutes = require('./login-page/routes/auth');
const homeRoutes = require('./home-page/routes/home');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config({ path: './.env' });
const profileRoute = require('./home-page/routes/profile');
const friendRequestRoutes = require('./home-page/routes/friend');
const posts = require('./home-page/routes/posts');
const storiesRoutes = require('./home-page/routes/stories');
const notificationRoutes = require('./home-page/routes/notifications');
const commentRoutes = require('./home-page/routes/comments');
const accountRoutes = require('./home-page/routes/account');
const http = require('http');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const User = require('./models/User');
const Message = require('./models/Message');
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const chatRoutes = require('./home-page/routes/chat');
const isAuthenticated=  require('./home-page/middleware/authMiddleware');// Import chat routes


connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session setup
app.use(session({
    secret: 'your-secret-key', // A random string to sign the session ID cookie
    resave: false,  // Don't save session if unmodified
    saveUninitialized: true,  // Save session even if it's not initialized
    cookie: { secure: false }  // Set to true if using https, false for http
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup for EJS templates
app.set('views', [path.join(__dirname, 'login-page/views'), path.join(__dirname, 'home-page/views')]);
app.set('view engine', 'ejs');
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes
app.use('/auth', authRoutes); // Authentication routes
app.use('/home', homeRoutes); // Home page routes
app.use('/home/profile', profileRoute);
app.use('/friend', friendRequestRoutes);
app.use('/posts', posts);
app.use('/notifications', notificationRoutes);
app.use('/stories', storiesRoutes);
app.use('/comments', commentRoutes);
app.use('/account', accountRoutes);
app.use('/chats', isAuthenticated, chatRoutes);
const socketConnections = {};
// Default route
app.get('/', (req, res) => {
    res.redirect('/auth/login'); // Redirect to login as the default page
});

// Fetch users from the database and render the chat page
app.get('/chat', isAuthenticated, (req, res) => {
    const currentUserId = req.user.userId; // This will be set from the decoded JWT
    const token = req.cookies.token; // Get token from cookies (or from header if preferred)
  
    User.find({ _id: { $ne: currentUserId } }) // Exclude the current user
      .then(users => {
        // Ensure you're passing the token and currentUserId correctly to the EJS template
        res.render('chat', { users, currentUserId, token });  
      })
      .catch(err => {
        console.error('Error fetching users:', err);
        res.status(500).send('Error fetching users');
      });
  });
app.get('/messages/:userId', isAuthenticated, (req, res) => {
    const currentUserId = req.user.userId;  // User info from decoded JWT
    const { userId } = req.params;  // The target user ID from the URL

    if (!mongoose.Types.ObjectId.isValid(currentUserId) || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user IDs' });
    }

    Message.find({
        $or: [
            { senderId: currentUserId, receiverId: userId },
            { senderId: userId, receiverId: currentUserId }
        ]
    })
    .sort({ timestamp: 1 })  // Sort messages by timestamp
    .populate('senderId receiverId', 'firstName lastName username profileImage')  // Populate user details
    .then(messages => res.json(messages))  // Return messages as JSON
    .catch(err => {
        console.error('Error fetching messages:', err);
        res.status(500).send('Error fetching messages');
    });
});

// POST Route to send a new message
app.post('/send_message', isAuthenticated, (req, res) => {
  const { senderId, receiverId, message } = req.body;

  const newMessage = new Message({
    senderId,
    receiverId,
    message,
    timestamp: new Date(),  // Add a timestamp for the message
  });

  newMessage.save()
    .then(savedMessage => {
      // Emit the new message to both the sender and the receiver
      io.to(receiverId).emit('receive_message', savedMessage);  // Send to receiver
      io.to(senderId).emit('receive_message', savedMessage);    // Optionally send back to sender
      res.status(200).json({ message: 'Message sent', data: savedMessage });  // Respond back to client
    })
    .catch(err => {
      console.error('Error saving message:', err);
      res.status(500).send('Error saving message');
    });
});
  
  // Socket connection
  const userSockets = {};

  io.on('connection', (socket) => {
      console.log('A user connected:', socket.id);
  
      // Store socket ID when user connects
      socket.on('user_connected', (userId) => {
          console.log(`User ${userId} connected to socket ${socket.id}`);
          userSockets[userId] = socket.id; // Map userId to socketId
      });
  
      // When a message is sent, emit to the receiver
      socket.on('send_message', (data) => {
          const { senderId, receiverId, message } = data;
          console.log('Sending message:', data);
  
          // Save the message to the database (message saving logic)
          const newMessage = new Message({
              senderId,
              receiverId,
              message,
              timestamp: new Date(),
          });
  
          newMessage.save()
              .then(savedMessage => {
                  // Emit to specific receiver using the mapped socket ID
                  const receiverSocketId = userSockets[receiverId];
  
                  if (receiverSocketId) {
                      console.log(`Emitting message to ${receiverId} (Socket: ${receiverSocketId})`);
                      io.to(receiverSocketId).emit('receive_message', savedMessage); // Emit to receiver
                  } else {
                      console.log(`Receiver ${receiverId} not connected`);
                  }
  
                  // Optionally, emit to sender as well
                  io.to(senderId).emit('receive_message', savedMessage);
              })
              .catch(err => {
                  console.error('Error saving message:', err);
              });
      });
  
      // Handle disconnects
      socket.on('disconnect', () => {
          console.log('A user disconnected:', socket.id);
          // Remove user from the mapping when they disconnect
          for (let userId in userSockets) {
              if (userSockets[userId] === socket.id) {
                  delete userSockets[userId];
                  break;
              }
          }
      });
  });

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
