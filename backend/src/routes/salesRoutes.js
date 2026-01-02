const express = require('express');
const router = express.Router();
const admin = require('../../firebase');
const bcrypt = require('bcrypt');
const authenticateToken = require('../middleware/auth');

// Middleware to verify sales rep token
const verifySalesRep = async (req, res, next) => {
  try {
    const { uid } = req.user;
    
    // Check if user is a sales rep in the salesReps collection
    const salesRepDoc = await admin.firestore().collection('salesReps').doc(uid).get();
    
    if (!salesRepDoc.exists) {
      return res.status(403).json({ error: 'Sales representative access required' });
    }

    const salesRepData = salesRepDoc.data();
    
    if (!salesRepData.isActive) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Attach sales rep data to request
    req.salesRep = {
      id: salesRepDoc.id,
      ...salesRepData
    };

    next();
  } catch (error) {
    console.error('Sales rep verification error:', error);
    res.status(403).json({ error: 'Sales representative access required' });
  }
};

// Login endpoint for sales reps
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find sales rep by username
    const snapshot = await admin.firestore().collection('salesReps')
      .where('username', '==', username.trim())
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const salesRepDoc = snapshot.docs[0];
    const salesRep = salesRepDoc.data();

    // Verify password
    const isValidPassword = await bcrypt.compare(password, salesRep.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is active
    if (!salesRep.isActive) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Generate a custom token for the sales rep
    const customToken = await admin.auth().createCustomToken(salesRepDoc.id, {
      role: 'salesRep',
      username: salesRep.username,
      email: salesRep.email
    });

    res.json({
      success: true,
      token: customToken,
      salesRepId: salesRepDoc.id,
      username: salesRep.username,
      email: salesRep.email
    });
  } catch (error) {
    console.error('Sales rep login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Add customer endpoint
router.post('/add-customer', authenticateToken, verifySalesRep, async (req, res) => {
  try {
    const { customerEmail, customerName, customerPhone, customerAddress } = req.body;
    const salesRepId = req.salesRep.id;

    if (!customerEmail || !customerName || !customerPhone || !customerAddress) {
      return res.status(400).json({ error: 'All customer fields are required' });
    }

    const email = customerEmail.trim().toLowerCase();

    // Check if this email is already linked to ANY sales rep
    const allSalesRepsSnapshot = await admin.firestore().collection('salesReps').get();
    
    for (const repDoc of allSalesRepsSnapshot.docs) {
      const existingCustomer = await admin.firestore()
        .collection('salesReps').doc(repDoc.id)
        .collection('customers')
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (!existingCustomer.empty) {
        const existingRepData = repDoc.data();
        const isCurrentRep = repDoc.id === salesRepId;
        
        if (isCurrentRep) {
          return res.status(400).json({ error: 'This customer is already in your account' });
        } else {
          return res.status(400).json({ 
            error: `This customer is already managed by another sales representative (${existingRepData.username || 'Unknown'})` 
          });
        }
      }
    }

    // Check if user exists in users collection
    const userSnapshot = await admin.firestore().collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();

    let userId = null;
    if (!userSnapshot.empty) {
      userId = userSnapshot.docs[0].id;
      
      // Check if user already has a sales rep assigned
      const userData = userSnapshot.docs[0].data();
      if (userData.salesRepId && userData.salesRepId !== salesRepId) {
        return res.status(400).json({ 
          error: `This user is already linked to another sales representative (${userData.salesRepUsername || 'Unknown'})` 
        });
      }
      
      // Link sales rep to user profile
      await admin.firestore().collection('users').doc(userId).update({
        salesRepId: salesRepId,
        salesRepUsername: req.salesRep.username,
        linkedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Create customer in sales rep's subcollection
    const customerData = {
      email: email,
      name: customerName.trim(),
      phone: customerPhone.trim(),
      address: customerAddress.trim(),
      userId: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true,
      totalOrders: 0,
      totalSpent: 0,
      lastOrderDate: null
    };

    const docRef = await admin.firestore()
      .collection('salesReps').doc(salesRepId)
      .collection('customers')
      .add(customerData);

    res.json({
      success: true,
      customerId: docRef.id,
      message: 'Customer added successfully'
    });
  } catch (error) {
    console.error('Error adding customer:', error);
    res.status(500).json({ error: 'Failed to add customer' });
  }
});

// Get customers for logged-in sales rep with order data
router.get('/customers', authenticateToken, verifySalesRep, async (req, res) => {
  try {
    const salesRepId = req.salesRep.id;

    // Get customers from subcollection
    const snapshot = await admin.firestore()
      .collection('salesReps').doc(salesRepId)
      .collection('customers')
      .get();

    const customers = await Promise.all(snapshot.docs.map(async (doc) => {
      const customerData = doc.data();
      
      // Get orders for this customer by email
      const ordersSnapshot = await admin.firestore().collection('orders')
        .where('email', '==', customerData.email)
        .get();

      const orders = ordersSnapshot.docs.map(orderDoc => ({
        id: orderDoc.id,
        ...orderDoc.data()
      }));

      // Calculate stats
      const totalOrders = orders.length;
      const totalSpent = orders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
      const lastOrder = orders.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      })[0];

      return {
        id: doc.id,
        ...customerData,
        totalOrders,
        totalSpent,
        lastOrderDate: lastOrder?.createdAt || null,
        recentOrders: orders.slice(0, 5) // Last 5 orders
      };
    }));

    // Sort by creation date (newest first)
    customers.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });

    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Get revenue for logged-in sales rep (R10 per order)
router.get('/revenue', authenticateToken, verifySalesRep, async (req, res) => {
  try {
    const salesRepId = req.salesRep.id;

    // Get all customers
    const customersSnapshot = await admin.firestore()
      .collection('salesReps').doc(salesRepId)
      .collection('customers')
      .get();

    const customerEmails = customersSnapshot.docs.map(doc => doc.data().email);

    if (customerEmails.length === 0) {
      return res.json({
        totalRevenue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        revenuePerOrder: 10
      });
    }

    // Get all orders from these customers in batches (Firestore 'in' limit is 10)
    let allOrders = [];
    for (let i = 0; i < customerEmails.length; i += 10) {
      const batch = customerEmails.slice(i, i + 10);
      const batchSnapshot = await admin.firestore().collection('orders')
        .where('email', 'in', batch)
        .get();
      const batchOrders = batchSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      allOrders = [...allOrders, ...batchOrders];
    }

    const totalOrders = allOrders.length;
    const totalRevenue = totalOrders * 10; // R10 per order

    res.json({
      totalRevenue,
      totalOrders,
      totalCustomers: customerEmails.length,
      revenuePerOrder: 10,
      orders: allOrders.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      }).slice(0, 20) // Last 20 orders
    });
  } catch (error) {
    console.error('Error fetching revenue:', error);
    res.status(500).json({ error: 'Failed to fetch revenue' });
  }
});

module.exports = router;
