const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./login-page/routes/auth');
const homeRoutes = require('./home-page/routes/home');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config({ path: './.env' });
const profileRoute = require('./home-page/routes/profile');
const app = express();
const friendRequestRoutes = require('./home-page/routes/friend');

const posts = require('./home-page/routes/posts');
const storiesRoutes = require('./home-page/routes/stories');

const notificationRoutes = require('./home-page/routes/notifications');



// Connect to the database
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser()); // To handle cookies for session management
app.use(cookieParser());
// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup for EJS templates
app.set('views', [path.join(__dirname, 'login-page/views'), path.join(__dirname, 'home-page/views')]);
app.set('view engine', 'ejs');
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Routes
app.use('/auth', authRoutes); // Authentication routes
app.use('/home', homeRoutes); // Home page routes
 // Adjust path as needed
 app.use('/home/profile', profileRoute);
 app.use('/friend', friendRequestRoutes);
 app.use('/posts', posts);

 app.use('/notifications', notificationRoutes);
 app.use('/stories', storiesRoutes);

// Default route
app.get('/', (req, res) => {
    res.redirect('/auth/login'); // Redirect to login as the default page
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log("MONGO_URI:", process.env.MONGO_URI);
    console.log("EMAIL_USER:", process.env.EMAIL_USER);
    console.log("EMAIL_PASS:", process.env.EMAIL_PASS);
});
