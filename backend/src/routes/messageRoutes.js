const express = require('express');
const router = express.Router();
const admin = require('../../firebase');
const authenticateToken = require('../middleware/auth');

// Send Message
router.post('/', authenticateToken, async (req, res) => {
  const { receiver_id, order_id, message_content } = req.body;
  const sender_id = req.user.uid;
  try {
    const ref = await admin.firestore().collection('messages').add({
      sender_id,
      receiver_id,
      order_id,
      message_content,
      sent_at: new Date().toISOString()
    });
    res.json({ id: ref.id, sender_id, receiver_id, order_id, message_content });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get Messages for Order
router.get('/order/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const snapshot = await admin.firestore().collection('messages')
      .where('order_id', '==', id)
      .orderBy('sent_at', 'asc')
      .get();
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(messages);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;