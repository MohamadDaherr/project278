// module.exports = (req, res, next) => {
//     const adminEmail = "admin@mail.com"; // Set the admin email
//     const adminPassword = "admin"; // Set the admin password

//     // Check if the email and password match
//     if (req.body.email === adminEmail && req.body.password === adminPassword) {
//         return next(); // Proceed to the next route if valid
//     }

//     // If not admin credentials, return error
//     return res.status(403).json({ message: "Unauthorized" });
// };


// Middleware to check if the user is an admin
const isAdmin = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/auth/login'); // Redirect to login if not authenticated
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.userId !== 'admin') { // Check if the logged-in user is an admin
            return res.status(403).send('Forbidden'); // If not an admin, block access
        }
        next(); // Allow access to admin routes
    } catch (error) {
        return res.status(401).send('Unauthorized');
    }
};

module.exports = isAdmin;
