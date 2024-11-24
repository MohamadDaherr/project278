
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../../models/User'); // Ensure the User model is set up correctly

const router = express.Router();

// Email validation pattern for AUB email format
const emailPattern = /^[a-zA-Z]{3}\d+@mail\.aub\.edu$/;
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      user: 'jeanelhouwayek@gmail.com',
      pass: 'uclyebempykpwhhz',
  },
});


// GET /auth/login - Render the login page
router.get('/login', (req, res) => {
    res.render('login'); // This renders the login.ejs template in views folder
});

// POST /auth/login - Handle login form submission
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
      // Step 1: Find the user by email
      const user = await User.findOne({ email }).select('+password'); // Ensure password field is selected
      if (!user) {
          console.log("User not found");
          return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Step 2: Log the plain text password and hashed password for debugging
      console.log("Entered plain text password:", password);
      console.log("Hashed password from DB:", user.password);

      // Step 3: Compare the entered password with the hashed password from the database
      const isMatch = await user.comparePassword(password);
      console.log("Password comparison result:", isMatch); // This will log true or false

      if (!isMatch) {
          console.log("Invalid password");
          return res.status(400).json({ message: 'Invalid credentials' });
      }

      // Step 4: If email and password match, generate a token
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '9h' });
      // Step 5: Send the token as a cookie or in the response
      
      
      res.cookie('token', token, { httpOnly: true, maxAge: 3600000 });
      res.redirect('/home');

  } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
  }
});


// GET /auth/signup - Render the signup page
router.get('/signup', (req, res) => {
    res.render('signup'); // This renders the signup.ejs template in views folder
});

// POST /auth/signup - Handle signup form submission
router.post('/signup', async (req, res) => {
    const { firstName, lastName, username, email, password } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email is already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const user = new User({ firstName, lastName,username, email, password: hashedPassword, verificationCode });
        await user.save();

        // Send email with verification code (using nodemailer)
        // Set up nodemailer transporter first
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify Your Email',
            text: `Your verification code is ${verificationCode}`,
        });

        res.json({ message: 'Signup successful, verification code sent.' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// GET /auth/verify - Render the verification page
router.get('/verify', (req, res) => {
    // Render the verify page with the email in the query string
    res.render('verify', { email: req.query.email });
});

router.post('/verify', async (req, res) => {
    const { email, code } = req.body;

    try {
        const user = await User.findOne({ email, verificationCode: code });
        if (!user) {
            return res.status(400).json({ message: 'Invalid verification code' });
        }

        user.isVerified = true;
        user.verificationCode = undefined;
        await user.save();
        res.json({ message: 'Verification successful' });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/forgot-password', (req, res) => {
  res.render('forgot-password'); // This renders the forgot-password.ejs template in views folder
});

// POST /auth/forgot-password - Send verification code to user's email
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            console.error("User not found with email:", email); // Log if user is not found
            return res.status(404).json({ message: 'No account with that email address exists.' });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.verificationCode = verificationCode;
        await user.save();

        // Send verification email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset Verification Code',
            text: `Your password reset verification code is ${verificationCode}`,
        });

        console.log("Verification code sent to:", email); // Log successful email sending
        res.json({ message: 'Verification code sent successfully.' });
    } catch (error) {
        console.error("Forgot Password error:", error); // Log the specific error
        res.status(500).json({ message: 'Server error' });
    }
});





// POST /auth/reset-password - Handle the new password submission
router.post('/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;

    try {
        // Find the user by email and verification code
        const user = await User.findOne({ email, verificationCode: code });
        if (!user) {
            console.error("Invalid verification code or email for:", email);
            return res.status(400).json({ message: 'Invalid verification code or email' });
        }

        // Hash the new password and update the user document
        user.password = await bcrypt.hash(newPassword, 10);
        user.verificationCode = undefined; // Clear the verification code after reset
        await user.save();

        console.log(`Password reset successful for user: ${email}`); // Log success

        // Send a success response to the client
        res.json({ message: 'Password has been changed successfully!' });

    } catch (error) {
        console.error("Error during password reset:", error); // Log the specific error
        res.status(500).json({ message: 'Server error' });
    }
});


module.exports = router;

