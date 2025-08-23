const express = require('express');
const router = express.Router();
const admin = require('../../firebase');
const authenticateToken = require('../middleware/auth');

// Register extra user info after Firebase Auth registration
router.post('/register', authenticateToken, async (req, res) => {
  const { uid, email } = req.user;
  const { full_name, phone_number, user_type } = req.body;

  try {
    await admin.firestore().collection('users').doc(uid).set({
      email,
      full_name,
      phone_number,
      user_type,
    }, { merge: true });

    res.json({ success: true });
  } catch (error) {
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

// Update current user profile
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const updates = req.body;
    
    // Remove any security-sensitive fields
    delete updates.user_type;
    delete updates.role;
    
    // Store timestamp
    updates.updated_at = admin.firestore.FieldValue.serverTimestamp();
    
    // Map frontend fields to database fields
    const dbUpdates = {
      full_name: updates.full_name,
      phone_number: updates.phone_number, 
      profile_picture_url: updates.profile_picture_url,
      email: updates.email,
    };
    
    // Use set with merge to handle cases where document might not exist yet
    await admin.firestore().collection('users').doc(uid).set(dbUpdates, { merge: true });
    
    // Return the updated data
    res.json({ 
      success: true,
      profile: dbUpdates 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;