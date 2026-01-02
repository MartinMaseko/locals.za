const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');

// Admin routes - require authentication
router.post('/paid-price', discountController.savePaidPrice);
router.get('/analytics', discountController.getDiscountAnalytics);
router.get('/by-date/:date', discountController.getDiscountsByDate);

// Customer routes
router.get('/customer/:userId?', discountController.getCustomerDiscount);
router.post('/apply', discountController.applyDiscountToOrder);

module.exports = router;