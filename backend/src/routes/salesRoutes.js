const express = require('express');
const router = express.Router();
const admin = require('../../firebase');
const bcrypt = require('bcrypt');
const { authenticateSalesRep } = require('../middleware/auth');

// Sales Rep Login - Simple credential verification
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
    }
    
    // Find sales rep by username
    const salesRepSnapshot = await admin.firestore()
      .collection('salesReps')
      .where('username', '==', username)
      .where('isActive', '==', true)
      .limit(1)
      .get();
    
    if (salesRepSnapshot.empty) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }
    
    const salesRepDoc = salesRepSnapshot.docs[0];
    const salesRepData = salesRepDoc.data();
    const salesRepId = salesRepDoc.id;
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, salesRepData.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid credentials' 
      });
    }
    
    // Update last login
    await admin.firestore()
      .collection('salesReps')
      .doc(salesRepId)
      .update({
        lastLogin: admin.firestore.FieldValue.serverTimestamp()
      });
    
    // Just return success with sales rep info
    res.json({
      success: true,
      salesRepId: salesRepId,
      username: salesRepData.username,
      email: salesRepData.email
    });
    
  } catch (error) {
    console.error('Sales login error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed' 
    });
  }
});

// Link existing customer to sales rep - USE NEW MIDDLEWARE
router.post('/customers', authenticateSalesRep, async (req, res) => {
  try {
    const { uid } = req.user; // This now comes from authenticateSalesRep
    const { email } = req.body;

    console.log('Linking customer request:', { uid, email });
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Find the registered user by email
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('email', '==', email.trim())
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      return res.status(404).json({ 
        error: "No registered user found with this email. Please ask the customer to register first." 
      });
    }

    const userDoc = usersSnapshot.docs[0];
    const customerData = userDoc.data();
    const customerId = userDoc.id;

    // Check if customer is already linked to a sales rep
    if (customerData.salesRepId && customerData.salesRepId !== uid) {
      return res.status(400).json({ 
        error: "This customer is already linked to another sales representative" 
      });
    }

    // Check if already linked to this sales rep
    if (customerData.salesRepId === uid) {
      return res.status(400).json({ 
        error: "This customer is already linked to your profile" 
      });
    }

    // Link the customer to this sales rep
    await admin.firestore().collection('users').doc(customerId).update({
      salesRepId: uid,
      linkedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Successfully linked customer to sales rep');

    // Check/create customer record for tracking
    const customerSnapshot = await admin.firestore()
      .collection('customers')
      .where('email', '==', email.trim())
      .limit(1)
      .get();

    let customerRecord;
    if (customerSnapshot.empty) {
      const customerRef = await admin.firestore().collection('customers').add({
        name: customerData.full_name || customerData.displayName || 'Unknown',
        email: email.trim(),
        phone: customerData.phone_number || '',
        address: customerData.address || '',
        salesRepId: uid,
        userId: customerId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        totalOrders: 0,
        totalSpent: 0
      });
      customerRecord = { id: customerRef.id };
    } else {
      const existingCustomer = customerSnapshot.docs[0];
      await admin.firestore().collection('customers').doc(existingCustomer.id).update({
        salesRepId: uid,
        userId: customerId,
        linkedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      customerRecord = { id: existingCustomer.id };
    }

    res.json({ 
      success: true, 
      message: "Customer successfully linked to your profile",
      customer: {
        id: customerRecord.id,
        userId: customerId,
        name: customerData.full_name || customerData.displayName || 'Unknown',
        email: email.trim(),
        phone: customerData.phone_number || ''
      }
    });

  } catch (error) {
    console.error('Error linking customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get customers linked to sales rep - USE NEW MIDDLEWARE
router.get('/customers', authenticateSalesRep, async (req, res) => {
  try {
    const { uid } = req.user;
    
    console.log('Fetching customers for sales rep:', uid);

    // Get customers linked to this sales rep
    const customersQuery = admin.firestore()
      .collection('users')
      .where('salesRepId', '==', uid);
    
    const snapshot = await customersQuery.get();
    const customers = [];

    for (const doc of snapshot.docs) {
      const userData = doc.data();
      
      // Get order statistics for this customer
      const ordersSnapshot = await admin.firestore()
        .collection('orders')
        .where('userId', '==', doc.id)
        .get();

      let totalOrders = ordersSnapshot.size;
      let totalSpent = 0;
      let lastOrderDate = null;

      ordersSnapshot.docs.forEach(orderDoc => {
        const orderData = orderDoc.data();
        totalSpent += (orderData.adjustedTotal || orderData.total || 0);
        
        if (orderData.createdAt && (!lastOrderDate || orderData.createdAt.seconds > lastOrderDate.seconds)) {
          lastOrderDate = orderData.createdAt;
        }
      });

      customers.push({
        id: doc.id,
        userId: doc.id,
        name: userData.full_name || userData.displayName || 'Unknown',
        email: userData.email,
        phone: userData.phone_number || '',
        address: userData.address || '',
        totalOrders,
        totalSpent,
        lastOrderDate,
        createdAt: userData.created_at || userData.createdAt,
        salesRepId: userData.salesRepId
      });
    }

    console.log(`Found ${customers.length} customers for sales rep`);
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get sales rep profile - USE NEW MIDDLEWARE
router.get('/profile', authenticateSalesRep, async (req, res) => {
  try {
    const { uid, username, email } = req.user;
    
    const salesRepDoc = await admin.firestore()
      .collection('salesReps')
      .doc(uid)
      .get();
    
    if (!salesRepDoc.exists) {
      return res.status(404).json({ error: 'Sales rep not found' });
    }
    
    const salesRepData = salesRepDoc.data();
    
    // Remove password from response
    const { password, ...profileData } = salesRepData;
    
    res.json({
      id: uid,
      ...profileData
    });
    
  } catch (error) {
    console.error('Error getting sales rep profile:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

module.exports = router;
