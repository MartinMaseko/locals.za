const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/signout', authController.signOut);
router.post('/session', authController.getSession);
router.post('/promote-admin', authController.promoteToAdmin);

module.exports = router;