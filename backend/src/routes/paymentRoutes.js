const express = require('express');
const router = express.Router();
const admin = require('../../firebase');
const authenticateToken = require('../middleware/auth');
const ozowService = require('../services/ozowService');
const { sendOrderStatusMessage } = require('../utils/notificationHelper');

/**
 * @route POST /api/payment/process/:orderId
 * @desc Process payment for an order and get Ozow payment form data
 * @access Private (requires authentication)
 */
router.post('/process/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.uid;

    console.log(`Payment process requested for order ${orderId} by user ${userId}`);

    const orderDoc = await admin.firestore().collection('orders').doc(orderId).get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = orderDoc.data();

    if (orderData.userId !== userId && !req.user.isAdmin) {
      console.log(`Unauthorized payment request: user ${userId} is not the owner of order ${orderId}`);
      return res.status(403).json({ error: 'Not authorized to process this order' });
    }

    // Generate Ozow payment data
    const payment = ozowService.createPaymentRequest(orderData, orderId, userId);

    await admin.firestore().collection('orders').doc(orderId).update({
      paymentInitiated: true,
      paymentProvider: 'ozow',
      paymentInitiatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdatedBy: userId,
    });

    console.log(`Payment initiated for order ${orderId}`);

    res.json(payment);
  } catch (error) {
    console.error('Error initiating payment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/payment/notify
 * @desc Handle Ozow payment notification callback
 * @access Public (Ozow server calls this)
 */
router.post('/notify', express.urlencoded({ extended: true }), express.json(), async (req, res) => {
  try {
    console.log('Ozow notification received');

    const data = req.body;

    console.log('Ozow notification data:', {
      TransactionReference: data.TransactionReference,
      Status: data.Status,
      TransactionId: data.TransactionId,
    });

    const result = await ozowService.processNotification(data);

    if (result.success) {
      console.log(`Notification processed successfully for order ${result.orderId}, status: ${result.status}`);

      if (result.userId) {
        try {
          await sendOrderStatusMessage(result.userId, result.orderId, result.newOrderStatus);
          console.log(`Status notification sent to user ${result.userId}`);
        } catch (notifyError) {
          console.error('Error sending notification:', notifyError);
        }
      }

      return res.status(200).json({ message: 'Notification processed successfully' });
    } else {
      console.error('Notification processing failed:', result.error);
      return res.status(400).json({ error: result.error || 'Notification processing failed' });
    }
  } catch (error) {
    console.error('Error handling notification:', error);
    return res.status(500).json({ error: 'Server error processing notification' });
  }
});

/**
 * @route GET /api/payment/status/:orderId
 * @desc Check payment status for an order (also verifies with Ozow API)
 * @access Private (requires authentication)
 */
router.get('/status/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.uid;

    const orderDoc = await admin.firestore().collection('orders').doc(orderId).get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = orderDoc.data();

    if (orderData.userId !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to check this order' });
    }

    res.json({
      orderId,
      status: orderData.status,
      paymentStatus: orderData.paymentStatus || 'unknown',
      paymentCompleted: orderData.paymentCompleted || false,
      ozow_transaction_id: orderData.ozow_transaction_id,
      transaction_id: orderData.transaction_id,
    });
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;