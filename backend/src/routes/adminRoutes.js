const express = require('express');
const router = express.Router();
const admin = require('../../firebase'); 
const bcrypt = require('bcrypt'); 
const authenticateToken = require('../middleware/auth'); 
const adminController = require('../controllers/adminController');

// Get dashboard statistics
router.get('/stats', authenticateToken, adminController.getDashboardStats);

// Get user count for dashboard
router.get('/stats/users', authenticateToken, adminController.getUserCount);

// Get all cashout requests
router.get('/cashouts', authenticateToken, adminController.getCashoutRequests);

// Process cashout payment
router.put('/cashouts/:cashoutId/complete', authenticateToken, adminController.processCashoutPayment);

// Get driver payment history
router.get('/drivers/:driverId/payments', authenticateToken, adminController.getDriverPaymentHistory);

// Promote user to Sales Rep
router.post('/promote-sales-rep', authenticateToken, adminController.promoteToSalesRep);

// Get all sales representatives
router.get('/sales-reps', authenticateToken, adminController.getSalesReps);

// Get sales rep details
router.get('/sales-reps/:salesRepId', authenticateToken, adminController.getSalesRepDetails);

module.exports = router;