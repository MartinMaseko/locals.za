const express = require('express');
const router = express.Router();
const admin = require('../../firebase'); // Update path if needed
const authenticateToken = require('../middleware/auth');
const driverController = require('../controllers/driverController');

// Register a new driver
router.post('/register', driverController.register);

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