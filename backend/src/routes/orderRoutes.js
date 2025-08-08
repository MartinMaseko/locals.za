const express = require('express');
const router = express.Router();
const admin = require('../../firebase');
const authenticateToken = require('../middleware/auth');

// Create Order (Salon Owner)
router.post('/', authenticateToken, async (req, res) => {
  const { order, items } = req.body;
  try {
    // Add order
    const orderRef = await admin.firestore().collection('orders').add(order);
    // Add order_items
    const orderItems = items.map(item => ({ ...item, order_id: orderRef.id }));
    const batch = admin.firestore().batch();
    orderItems.forEach(item => {
      const itemRef = admin.firestore().collection('order_items').doc();
      batch.set(itemRef, item);
    });
    await batch.commit();
    res.json({ order: { id: orderRef.id, ...order }, items: orderItems });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get My Orders (Salon Owner)
router.get('/my', authenticateToken, async (req, res) => {
  const { uid } = req.user;
  try {
    const snapshot = await admin.firestore().collection('orders').where('salon_id', '==', uid).get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get Order by ID (Salon Owner)
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await admin.firestore().collection('orders').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Order not found" });
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get Incoming Orders (Internal Team)
router.get('/incoming', authenticateToken, async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('orders').where('status', '==', 'pending').get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update Order Status (Admin/Driver)
router.put('/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await admin.firestore().collection('orders').doc(id).set({ status }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Assign Driver to Order (Admin)
router.put('/:id/assign-driver', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { driver_id } = req.body;
  try {
    await admin.firestore().collection('orders').doc(id).set({ driver_id }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;