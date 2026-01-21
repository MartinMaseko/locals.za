const express = require('express');
const router = express.Router();
const admin = require('../../firebase');
const authenticateToken = require('../middleware/auth');

// Register extra user info after Firebase Auth registration
router.post('/register', authenticateToken, async (req, res) => {
  const { uid, email } = req.user;
  const { full_name, phone_number, user_type } = req.body;

  try {
    // Check if this email is linked to a sales rep via customers collection
    const customerSnapshot = await admin.firestore()
      .collection('customers')
      .where('email', '==', email)
      .limit(1)
      .get();

    let salesRepId = null;
    if (!customerSnapshot.empty) {
      const customerData = customerSnapshot.docs[0].data();
      salesRepId = customerData.salesRepId;
      
      // Update customer record with userId
      await admin.firestore()
        .collection('customers')
        .doc(customerSnapshot.docs[0].id)
        .update({ userId: uid });
    }

    // User document
    const userData = {
      email,
      full_name,
      phone_number,
      user_type,
      salesRepId, // Link user to their sales rep if applicable
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await admin.firestore().collection('users').doc(uid).set(userData, { merge: true });

    // Welcome notification and inbox message
    const welcomeMessage = {
      title: "Welcome to LocalsZA! 🎉",
      body: `Hi ${full_name || 'there'}! Welcome to LocalsZA. 
      We're excited to have you join our smart business community. 
      Browse stock supplies, and enjoy fast delivery right to your doorstep.`,
      imageUrl: "https://firebasestorage.googleapis.com/v0/b/localsza.firebasestorage.app/o/Welcome%20Banner.png?alt=media&token=67bad8c1-3e85-4658-8b42-8051f2fd6b34",
      read: false,
      from: "system",
      fromRole: "LocalsZA Team",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      type: "welcome"
    };

    // Add welcome message to user's inbox
    await admin.firestore().collection('users').doc(uid)
      .collection('inbox').add(welcomeMessage);
      
    // Add welcome notification
    await admin.firestore().collection('users').doc(uid)
      .collection('notifications').add({
        ...welcomeMessage,
        body: `Welcome to Locals! We're excited to have you join us.`
      });

    res.json({ success: true });
  } catch (error) {
    console.error("Error during registration:", error);
    return res.status(400).json({ error: error.message });
  }
});

// Get current user details
router.get('/me', authenticateToken, async (req, res) => {
  const { uid } = req.user;
  try {
    const doc = await admin.firestore().collection('users').doc(uid).get();
    
    if (!doc.exists) {
      // If user auth record exists but no Firestore document, create a minimal one
      const userRecord = await admin.auth().getUser(uid);
      const userData = {
        email: userRecord.email,
        user_type: userRecord.customClaims?.admin ? 'admin' : 'customer',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // Save this minimal profile
      await admin.firestore().collection('users').doc(uid).set(userData);
      
      return res.json(userData);
    }
    
    // Return the existing document
    res.json(doc.data());
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: error.message });
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

// Get user count (for admin dashboard)
router.get('/count', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const { uid } = req.user;
    
    // Get user data to verify admin status
    const userRef = await admin.firestore().collection('users').doc(uid).get();
    const userData = userRef.data();
    
    if (userData?.user_type !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    // Get all users from the users collection
    const snapshot = await admin.firestore().collection('users').get();
    const count = snapshot.size;
    
    res.json({
      count: count,
      message: 'User count retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting user count:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;