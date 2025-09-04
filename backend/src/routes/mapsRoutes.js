const express = require('express');
const router = express.Router();
const mapsController = require('../controllers/mapsController');
const authenticateToken = require('../middleware/auth');
const admin = require('firebase-admin');

// Get directions and ETA (protected route - requires authentication)
router.get('/directions', authenticateToken, mapsController.getDirections);

// Geocode an address (protected route)
router.get('/geocode', authenticateToken, mapsController.geocodeAddress);

// Update order with ETA (protected route)
router.put('/orders/:orderId/eta', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { eta, etaArrivalTime } = req.body;
    const userId = req.user.uid;
    
    // Check if user is a driver assigned to this order
    const orderRef = admin.firestore().collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const orderData = orderDoc.data();
    
    // Only allow the assigned driver to update ETA
    if (orderData.driver_id !== userId) {
      // Check if user is admin
      const userRecord = await admin.auth().getUser(userId);
      const claims = userRecord.customClaims || {};
      
      if (!claims.admin && claims.role !== 'admin') {
        return res.status(403).json({ error: 'Not authorized to update this order' });
      }
    }
    
    // Update order with ETA information
    await orderRef.update({
      eta,
      etaArrivalTime,
      etaUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.status(200).json({ 
      success: true, 
      message: 'ETA updated successfully',
      data: {
        eta,
        etaArrivalTime,
        etaUpdatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error updating order ETA:', error);
    res.status(500).json({ error: 'Failed to update ETA' });
  }
});

module.exports = router;