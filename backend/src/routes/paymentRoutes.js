const express = require('express');
const router = express.Router();
const admin = require('../../firebase');
const authenticateToken = require('../middleware/auth');
const payfastService = require('../services/payfastService');
const { sendOrderStatusMessage } = require('../utils/notificationHelper');

/**
 * @route POST /api/payment/process/:orderId
 * @desc Process payment for an order and get PayFast payment form data
 * @access Private (requires authentication)
 */
router.post('/process/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.uid;
    
    console.log(`Payment process requested for order ${orderId} by user ${userId}`);
    
    // Get the order from Firestore
    const orderDoc = await admin.firestore().collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const orderData = orderDoc.data();
    
    // Security check: ensure user is authorized for this order
    if (orderData.userId !== userId && !req.user.isAdmin) {
      console.log(`Unauthorized payment request: user ${userId} is not the owner of order ${orderId}`);
      return res.status(403).json({ error: 'Not authorized to process this order' });
    }
    
    // Generate payment URL and form data
    const payment = payfastService.createPaymentRequest(orderData, orderId, userId);
    
    // Update order with payment initiation timestamp
    await admin.firestore().collection('orders').doc(orderId).update({
      paymentInitiated: true,
      paymentInitiatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdatedBy: userId
    });
    
    console.log(`Payment initiated for order ${orderId}`);
    
    // Return the payment information
    res.json(payment);
  } catch (error) {
    console.error('Error initiating payment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/payment/notify
 * @desc Handle PayFast ITN (Instant Transaction Notification)
 * @access Public (PayFast server calls this)
 */
router.post('/notify', express.raw({ type: 'application/x-www-form-urlencoded' }), async (req, res) => {
  try {
    console.log('PayFast ITN received');
    
    // Parse ITN data from raw request body
    const data = payfastService.parseItnData(req.body);
    
    // Log ITN data for debugging (exclude sensitive info in production)
    console.log('PayFast ITN data:', { 
      m_payment_id: data.m_payment_id,
      payment_status: data.payment_status,
      pf_payment_id: data.pf_payment_id
    });
    
    // Process the ITN
    const result = await payfastService.processItn(data);
    
    if (result.success) {
      console.log(`ITN processed successfully for order ${result.orderId}, status: ${result.status}`);
      
      // Send notification to user if status changed
      if (result.userId) {
        try {
          await sendOrderStatusMessage(result.userId, result.orderId, result.newOrderStatus);
          console.log(`Status notification sent to user ${result.userId}`);
        } catch (notifyError) {
          console.error('Error sending notification:', notifyError);
          // Continue processing - notification failure shouldn't affect ITN response
        }
      }
      
      // Return success to PayFast
      return res.status(200).send('ITN processed successfully');
    } else {
      console.error('ITN processing failed:', result.error);
      return res.status(400).send(result.error || 'ITN processing failed');
    }
  } catch (error) {
    console.error('Error handling ITN:', error);
    return res.status(500).send('Server error processing ITN');
  }
});

/**
 * @route GET /api/payment/status/:orderId
 * @desc Check payment status for an order
 * @access Private (requires authentication)
 */
router.get('/status/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.uid;
    
    // Get the order
    const orderDoc = await admin.firestore().collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const orderData = orderDoc.data();
    
    // Security check: ensure user is authorized for this order
    if (orderData.userId !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to check this order' });
    }
    
    // Return payment status information
    res.json({
      orderId,
      status: orderData.status,
      paymentStatus: orderData.paymentStatus || 'unknown',
      paymentCompleted: orderData.paymentCompleted || false,
      pf_payment_id: orderData.pf_payment_id,
      transaction_id: orderData.transaction_id
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;