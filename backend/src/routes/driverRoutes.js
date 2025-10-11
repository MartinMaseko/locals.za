const express = require('express');
const router = express.Router();
const admin = require('../../firebase');
const authenticateToken = require('../middleware/auth');
const driverController = require('../controllers/driverController');
// Import email helper functions
const { sendEmail, formatCashoutEmail } = require('../utils/emailHelper');

// Register a new driver
router.post('/register', driverController.register);

// Driver authentication endpoints
router.post('/verify-credentials', driverController.verifyCredentials);
router.post('/login-link', driverController.generateLoginCredentials);

// Get driver profile (authenticated)
router.get('/profile', authenticateToken, driverController.getProfile);

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

// Handle driver cashout requests
router.post('/cashout', authenticateToken, async (req, res) => {
  try {
    const { orderIds, amount, driverName, driverEmail, driverId } = req.body;
    const userId = req.user.uid;
    
    // Verify the user is either the driver or an admin
    const isDriverOrAdmin = await verifyDriverOrAdmin(userId, driverId);
    
    if (!isDriverOrAdmin) {
      return res.status(403).json({ error: 'Unauthorized to perform this action' });
    }
    
    // Verify these orders haven't been cashed out already
    const batch = admin.firestore().batch();
    const orderRefs = orderIds.map(id => admin.firestore().collection('orders').doc(id));
    
    // Get the orders to check if they're already cashed out
    const orderDocs = await Promise.all(orderRefs.map(ref => ref.get()));
    
    // Check if any orders are already cashed out
    const alreadyCashedOut = orderDocs.some(doc => doc.exists && doc.data().cashedOut === true);
    
    if (alreadyCashedOut) {
      return res.status(400).json({ error: 'Some orders have already been cashed out' });
    }
    
    // Mark all orders as cashed out
    orderDocs.forEach((doc, index) => {
      if (doc.exists) {
        batch.update(orderRefs[index], { 
          cashedOut: true,
          cashedOutAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    });
    
    // Update the driver's last cashout date
    const driverRef = admin.firestore().collection('drivers').doc(driverId);
    batch.set(driverRef, {
      lastCashoutDate: admin.firestore.FieldValue.serverTimestamp(),
      lastCashoutAmount: amount
    }, { merge: true });
    
    // Prepare request details for email
    const requestDetails = {
      driver: driverName,
      driverId: driverId,
      driverEmail: driverEmail,
      amount: amount.toFixed(2),
      orderCount: orderIds.length,
      orderIds: orderIds
    };
    
    // Create a cashout record
    const cashoutRef = admin.firestore().collection('cashouts').doc();
    batch.set(cashoutRef, {
      driverId,
      driverName,
      driverEmail,
      amount,
      orderIds,
      orderCount: orderIds.length,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      emailDetails: {
        to: process.env.ADMIN_EMAIL || 'admin@locals-za.co.za',
        subject: `Driver Cashout Request: ${driverName}`,
        requestDetails
      }
    });
    
    // Commit all the updates
    await batch.commit();
    
    // Send email using the configured settings from .env
    try {
      // Format email HTML content
      const htmlContent = formatCashoutEmail(requestDetails);
      
      // Mail options
      const mailOptions = {
        from: process.env.EMAIL_USER || 'admin@locals-za.co.za',
        to: process.env.ADMIN_EMAIL || 'admin@locals-za.co.za',
        subject: `Driver Cashout Request: ${driverName} - R${amount.toFixed(2)}`,
        html: htmlContent,
        text: `Driver Cashout Request from ${driverName} for R${amount.toFixed(2)} for ${orderIds.length} orders.`
      };
      
      // Send the email
      await sendEmail(mailOptions);
      console.log('Cashout email notification sent successfully');
    } catch (emailError) {
      console.error('Failed to send cashout email notification:', emailError);
      // Continue processing even if email fails
    }
    
    res.json({ 
      success: true, 
      message: 'Cashout request submitted successfully',
      cashoutId: cashoutRef.id
    });
    
  } catch (error) {
    console.error('Error processing cashout request:', error);
    res.status(500).json({ error: 'Failed to process cashout request' });
  }
});

// Helper function to verify user is a driver or admin
async function verifyDriverOrAdmin(userId, driverId) {
  try {
    // First check if user is admin from Auth custom claims
    try {
      const userRecord = await admin.auth().getUser(userId);
      const customClaims = userRecord.customClaims || {};
      
      if (customClaims.admin || customClaims.role === 'admin') {
        return true;
      }
      
      // Check if user is the driver
      if (userId === driverId || customClaims.driver_id === driverId) {
        return true;
      }
    } catch (authError) {
      console.log('Auth check failed, falling back to Firestore check:', authError);
    }
    
    // If not found in Auth, check in Firestore users collection
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData.user_type === 'admin' || userData.role === 'admin') {
        return true;
      }
    }
    
    // Last resort: check if this is the driver's own ID
    if (userId === driverId) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error verifying driver or admin:', error);
    return false;
  }
}

// Helper function to get driver info
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const { driver_id } = req.query;
    const userId = req.user.uid;
    
    // Verify the user is either the driver or an admin
    const isDriverOrAdmin = await verifyDriverOrAdmin(userId, driver_id);
    
    if (!isDriverOrAdmin) {
      return res.status(403).json({ error: 'Unauthorized to access driver information' });
    }
    
    // Get driver data
    const driverRef = admin.firestore().collection('drivers').doc(driver_id);
    const driverDoc = await driverRef.get();
    
    // Also check user collection as fallback
    let driverData = {};
    if (driverDoc.exists) {
      driverData = driverDoc.data();
    } else {
      // Try to get data from users collection as fallback
      const userRef = admin.firestore().collection('users').doc(driver_id);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        driverData = userDoc.data();
      }
    }
    
    // Return what we found
    res.json({
      name: driverData.name || driverData.full_name || driverData.displayName || null,
      lastCashoutDate: driverData.lastCashoutDate ? driverData.lastCashoutDate.toDate().toISOString() : null,
      lastCashoutAmount: driverData.lastCashoutAmount || 0,
      email: driverData.email || null
    });
    
  } catch (error) {
    console.error('Error getting driver info:', error);
    res.status(500).json({ error: 'Failed to get driver information' });
  }
});

// Simple test endpoint to verify routing
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: "Driver routes are working correctly",
    timestamp: new Date().toISOString()
  });
});

module.exports = router;