const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth'); 
const adminController = require('../controllers/adminController');

// Get dashboard statistics
router.get('/stats', authenticateToken, adminController.getDashboardStats);

module.exports = router;