const express = require('express');
const router = express.Router();
const admin = require('../../firebase');
const authenticateToken = require('../middleware/auth');

// Register extra user info after Firebase Auth registration
router.post('/register', authenticateToken, async (req, res) => {
  const { uid, email } = req.user;
  const { full_name, phone_number, user_type } = req.body;

  console.log('Register payload:', { uid, email, full_name, phone_number, user_type });

  try {
    await admin.firestore().collection('users').doc(uid).set({
      email,
      full_name,
      phone_number,
      user_type,
    }, { merge: true });

    res.json({ success: true });
  } catch (error) {
    console.error('Firestore set error:', error);
    return res.status(400).json({ error: error.message });
  }
});

// Get current user details
router.get('/me', authenticateToken, async (req, res) => {
  const { uid } = req.user;
  try {
    const doc = await admin.firestore().collection('users').doc(uid).get();
    if (!doc.exists) return res.status(404).json({ error: "Profile not found" });
    res.json(doc.data());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user details by ID (internal use)
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await admin.firestore().collection('users').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Profile not found" });
    res.json(doc.data());
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update user profile
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    await admin.firestore().collection('users').doc(id).set(updates, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;