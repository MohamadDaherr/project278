const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./login-page/routes/auth');
const path = require('path');
require('dotenv').config({ path: './.env' });

const app = express();
app.use(express.static(path.join(__dirname, 'public')));  

app.set('views', path.join(__dirname, 'login-page/views'))
app.set('view engine', 'ejs');

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get('/', (req, res) => {
    res.redirect('/auth/login'); // Redirect to login page or any page you want as the default
});
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
console.log("MONGO_URI:", process.env.MONGO_URI);
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS:", process.env.EMAIL_PASS);