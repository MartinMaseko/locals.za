const express = require('express');
const router = express.Router();
const admin = require('../../firebase');
const authenticateToken = require('../middleware/auth');

// Create Ticket
router.post('/', authenticateToken, async (req, res) => {
  const user_id = req.user.uid;
  const { subject, description, priority } = req.body;
  try {
    const ref = await admin.firestore().collection('support_tickets').add({
      user_id,
      subject,
      description,
      priority,
      status: 'open'
    });
    res.json({ id: ref.id, user_id, subject, description, priority, status: 'open' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get My Tickets
router.get('/my', authenticateToken, async (req, res) => {
  const user_id = req.user.uid;
  try {
    const snapshot = await admin.firestore().collection('support_tickets').where('user_id', '==', user_id).get();
    const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(tickets);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get All Tickets (Internal Team)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('support_tickets').get();
    const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(tickets);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update Ticket Status/Assign (Internal Team)
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    await admin.firestore().collection('support_tickets').doc(id).set(updates, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;