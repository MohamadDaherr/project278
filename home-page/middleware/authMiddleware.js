// home-page/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const isAuthenticated = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        console.log("No token found, redirecting to login");
        return res.redirect('/auth/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach decoded token (with `userId`) to `req.user`
        next();
    } catch (error) {
        console.error('JWT verification failed:', error);
        res.clearCookie('token');
        return res.redirect('/auth/login');
    }
};

module.exports = isAuthenticated;
