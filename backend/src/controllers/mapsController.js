const mapsService = require('../services/mapsService');
const admin = require('firebase-admin');

/**
 * Maps controller for handling maps-related requests
 */
const mapsController = {
  /**
   * Get directions and ETA information
   */
  getDirections: async (req, res) => {
    try {
      const { originLat, originLng, destLat, destLng, mode } = req.query;
      
      // Validate parameters
      if (!originLat || !originLng || !destLat || !destLng) {
        return res.status(400).json({ error: 'Missing required coordinates' });
      }
      
      // Get directions from Google Maps API
      const directions = await mapsService.getDirections(
        originLat, 
        originLng, 
        destLat, 
        destLng, 
        mode || 'driving'
      );
      
      res.json(directions);
    } catch (error) {
      console.error('Error in getDirections controller:', error);
      res.status(500).json({ error: 'Failed to get directions' });
    }
  },
  
  /**
   * Geocode an address to get coordinates
   */
  geocodeAddress: async (req, res) => {
    try {
      const { address } = req.query;
      
      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }
      
      const geocodeResult = await mapsService.geocodeAddress(address);
      res.json(geocodeResult);
    } catch (error) {
      console.error('Error in geocodeAddress controller:', error);
      res.status(500).json({ error: 'Failed to geocode address' });
    }
  },

  /**
   * Update order with ETA information
   */
  updateOrderETA: async (req, res) => {
    try {
      const { orderId } = req.params;
      const { eta } = req.body;
      const userId = req.user.uid;
      
      if (!orderId || !eta) {
        return res.status(400).json({ error: 'Order ID and ETA are required' });
      }
      
      // Update order in Firestore
      const orderRef = admin.firestore().collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();
      
      if (!orderDoc.exists) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      const orderData = orderDoc.data();
      
      // Make sure the driver is assigned to this order
      if (orderData.driver_id !== userId && orderData.driver?.id !== userId) {
        return res.status(403).json({ 
          error: 'You are not authorized to update this order'
        });
      }
      
      // Update the order with ETA information
      await orderRef.update({
        eta: eta,
        eta_updated_at: admin.firestore.FieldValue.serverTimestamp(),
        eta_updated_by: userId
      });
      
      res.json({ success: true, message: 'ETA updated successfully' });
    } catch (error) {
      console.error('Error in updateOrderETA controller:', error);
      res.status(500).json({ error: 'Failed to update order ETA' });
    }
  }
};

module.exports = mapsController;