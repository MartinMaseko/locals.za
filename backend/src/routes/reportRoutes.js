const express = require('express');
const router = express.Router();
const admin = require('../../firebase');
const authenticateToken = require('../middleware/auth');

// Generate delivery reports 
router.get('/deliveries', authenticateToken, async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('deliveries')
      .where('status', '==', 'delivered')
      .get();
    const deliveries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(deliveries);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;