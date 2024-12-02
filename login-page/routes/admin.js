const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const adminAuthMiddleware = require('../../home-page/middleware/adminAuthMiddleware');
const User = require('../../models/User'); // User model to fetch user data

// Admin login route

router.post('/admin-login', adminAuthMiddleware, (req, res) => {
    // After validation, render the admin dashboard
    res.redirect('/admin/dashboard');
});


// Admin dashboard (list of users, create, delete, update functionality)
// Admin dashboard route (requires admin login)
router.get('/dashboard', async (req, res) => {
    // You might want to verify if the user is an admin here
    try {
        const users = await User.find(); // Fetch all users
        res.render('dashboard', { users });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching users');
    }
});

// View user profile as admin
router.get('/user/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.render('/home', {
            user
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Delete user
router.get('/delete-user/:userId', async (req, res) => {
    console.log('Admin routes are loaded!');  // Add this just after defining the routes

    const { userId } = req.params;
    console.log('Deleting user with ID:', userId);

    try {
        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            return res.status(404).send('User not found');
        }
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// Route to log in as a user
router.get('/login-as-user', async (req, res) => {
    const { email } = req.query; // Get email from query string
    if (!email) {
        return res.status(400).send('Email is required');
    }

    try {
        // Find the user by email
        const user = await User.findOne({ email }).select('+password'); // Ensure password is selected

        if (!user) {
            return res.status(404).send('User not found');
        }

        // Directly compare password and login (as admin, you can bypass this step)
        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '9h' });
        res.cookie('token', token, { httpOnly: true, maxAge: 3600000 }); // Set the JWT token

        // Redirect to the home page as if the admin is logged in as the user
        res.redirect('/home');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});


module.exports = router;
