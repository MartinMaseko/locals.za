const express = require('express');
const router = express.Router();
const admin = require('../../firebase'); // Update path if needed
const authenticateToken = require('../middleware/auth');
const driverController = require('../controllers/driverController');

// Register a new driver
router.post('/register', driverController.register);

// Get all drivers (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const { uid } = req.user;
    const userRef = await admin.firestore().collection('users').doc(uid).get();
    const userData = userRef.data();
    
    if (userData?.user_type !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    // Get all drivers from Firestore
    const snapshot = await admin.firestore().collection('drivers').get();
    const drivers = snapshot.docs.map(doc => ({
      id: doc.id,
      driver_id: doc.data().driver_id || doc.id,
      full_name: doc.data().full_name || '',
      email: doc.data().email || '',
      phone_number: doc.data().phone_number || '',
      vehicle_type: doc.data().vehicle_type || '',
      vehicle_model: doc.data().vehicle_model || ''
    }));
    
    res.json(drivers);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all drivers with full details (admin only)
router.get('/all', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const { uid } = req.user;
    const userRef = await admin.firestore().collection('users').doc(uid).get();
    const userData = userRef.data();
    
    if (userData?.user_type !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    // Get all drivers with complete details
    const snapshot = await admin.firestore().collection('drivers').get();
    const drivers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Ensure critical fields always exist
      driver_id: doc.data().driver_id || doc.id,
      full_name: doc.data().full_name || '',
      email: doc.data().email || '',
      phone_number: doc.data().phone_number || '',
    }));
    
    res.json(drivers);
  } catch (error) {
    console.error('Error fetching all drivers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Assigned Deliveries (Driver)
router.get('/me/deliveries', authenticateToken, async (req, res) => {
  const { uid } = req.user;
  try {
    const snapshot = await admin.firestore().collection('deliveries').where('driver_id', '==', uid).get();
    const deliveries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(deliveries);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update Delivery Status (Driver)
router.put('/deliveries/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await admin.firestore().collection('deliveries').doc(id).set({ status }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Capture Proof of Delivery (Driver)
router.post('/deliveries/:id/proof', authenticateToken, async (req, res) => {
  // Implement Firebase Storage logic here if needed
  res.json({ message: 'Proof of delivery uploaded (implement storage logic)' });
});

// Driver Earnings (based on delivered & paid orders)
router.get('/me/earnings', authenticateToken, async (req, res) => {
  const { uid } = req.user;
  try {
    const snapshot = await admin.firestore().collection('orders')
      .where('driver_id', '==', uid)
      .where('status', '==', 'delivered')
      .where('payment_status', '==', 'paid')
      .get();
    const data = snapshot.docs.map(doc => doc.data());
    const totalEarnings = data.reduce((sum, o) => sum + Number(o.delivery_fee || 0), 0);
    res.json({ totalEarnings, deliveries: data.length });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update Driver/Vehicle Info
router.put('/me/profile', authenticateToken, async (req, res) => {
  const { uid } = req.user;
  const updates = req.body;
  try {
    await admin.firestore().collection('drivers').doc(uid).set(updates, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;