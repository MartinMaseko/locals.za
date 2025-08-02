const express = require('express');

// Import the express framework and create a router instance
const router = express.Router();

// Import the authentication controller to handle requests
// This controller contains the logic for user registration and login
const authController = require('../controllers/authController');

// Define the routes for user registration and login
// The POST method is used for creating new resources (registration) and authenticating users (login
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/signout', authController.signOut);
router.post('/session', authController.getSession);

// Export the router so it can be used in the main application file
module.exports = router;