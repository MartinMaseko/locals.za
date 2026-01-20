const express = require('express');
const router = express.Router();
const admin = require('../../firebase');
const bcrypt = require('bcrypt');
const { authenticateSalesRep } = require('../middleware/auth');
// Import email helper functions
const { sendEmail, formatCashoutEmail } = require('../utils/emailHelper');

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

// Handle sales rep cashout requests
router.post('/cashout', authenticateSalesRep, async (req, res) => {
  try {
    const { orderIds, amount, salesRepName, salesRepEmail } = req.body;
    const salesRepId = req.user.uid;
    
    if (!orderIds || !orderIds.length || !amount) {
      return res.status(400).json({ error: 'Invalid cashout request data' });
    }
    
    // Verify these orders haven't been cashed out already and belong to this sales rep's customers
    const batch = admin.firestore().batch();
    const orderRefs = orderIds.map(id => admin.firestore().collection('orders').doc(id));
    
    // Get the orders to verify eligibility
    const orderDocs = await Promise.all(orderRefs.map(ref => ref.get()));
    
    // Verify orders exist and haven't been cashed out
    const invalidOrders = orderDocs.filter((doc, index) => {
      if (!doc.exists) return true;
      const orderData = doc.data();
      return orderData.salesRepCashedOut === true;
    });
    
    if (invalidOrders.length > 0) {
      return res.status(400).json({ error: 'Some orders have already been cashed out or do not exist' });
    }
    
    // Verify all orders belong to customers linked to this sales rep
    const customerUserIds = new Set();
    orderDocs.forEach(doc => {
      if (doc.exists) {
        customerUserIds.add(doc.data().userId);
      }
    });
    
    // Check if all customers are linked to this sales rep
    const customerChecks = await Promise.all(
      Array.from(customerUserIds).map(userId => 
        admin.firestore().collection('users').doc(userId).get()
      )
    );
    
    const unauthorizedCustomers = customerChecks.filter(customerDoc => {
      if (!customerDoc.exists) return true;
      return customerDoc.data().salesRepId !== salesRepId;
    });
    
    if (unauthorizedCustomers.length > 0) {
      return res.status(403).json({ error: 'Some orders do not belong to your linked customers' });
    }
    
    // Mark all orders as cashed out for sales rep
    orderDocs.forEach((doc, index) => {
      if (doc.exists) {
        batch.update(orderRefs[index], { 
          salesRepCashedOut: true,
          salesRepCashedOutAt: admin.firestore.FieldValue.serverTimestamp(),
          salesRepCashedOutBy: salesRepId
        });
      }
    });
    
    // Update the sales rep's last cashout date
    const salesRepRef = admin.firestore().collection('salesReps').doc(salesRepId);
    batch.set(salesRepRef, {
      lastCashoutDate: admin.firestore.FieldValue.serverTimestamp(),
      lastCashoutAmount: amount
    }, { merge: true });
    
    // Prepare request details for email
    const requestDetails = {
      salesRep: salesRepName || req.user.username || 'Sales Rep',
      salesRepId: salesRepId,
      salesRepEmail: salesRepEmail || req.user.email || 'No email provided',
      amount: amount.toFixed(2),
      orderCount: orderIds.length,
      orderIds: orderIds,
      type: 'sales_rep' // Distinguish from driver cashouts
    };
    
    // Create a sales cashout record
    const cashoutRef = admin.firestore().collection('salesCashouts').doc();
    batch.set(cashoutRef, {
      salesRepId,
      salesRepName: requestDetails.salesRep,
      salesRepEmail: requestDetails.salesRepEmail,
      amount,
      orderIds,
      orderCount: orderIds.length,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      emailDetails: {
        to: process.env.ADMIN_EMAIL || 'admin@locals-za.co.za',
        subject: `Sales Rep Cashout Request: ${requestDetails.salesRep}`,
        requestDetails
      }
    });
    
    // Commit all the updates
    await batch.commit();
    
    // Send email notification
    try {
      // Format email HTML content for sales rep cashout
      const htmlContent = formatSalesRepCashoutEmail(requestDetails);
      
      // Mail options
      const mailOptions = {
        from: process.env.EMAIL_USER || 'admin@locals-za.co.za',
        to: process.env.ADMIN_EMAIL || 'admin@locals-za.co.za',
        subject: `Sales Rep Cashout Request: ${requestDetails.salesRep} - R${amount.toFixed(2)}`,
        html: htmlContent,
        text: `Sales Rep Cashout Request from ${requestDetails.salesRep} for R${amount.toFixed(2)} for ${orderIds.length} orders.`
      };
      
      // Send the email
      await sendEmail(mailOptions);
      console.log('Sales rep cashout email notification sent successfully');
    } catch (emailError) {
      console.error('Failed to send sales rep cashout email notification:', emailError);
      // Continue processing even if email fails
    }
    
    res.json({ 
      success: true, 
      message: 'Cashout request submitted successfully',
      cashoutId: cashoutRef.id
    });
    
  } catch (error) {
    console.error('Error processing sales rep cashout request:', error);
    res.status(500).json({ error: 'Failed to process cashout request' });
  }
});

// Helper function to format sales rep cashout email
function formatSalesRepCashoutEmail(requestDetails) {
  const {
    salesRep,
    salesRepId,
    salesRepEmail,
    amount,
    orderCount,
    orderIds
  } = requestDetails;

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ffb803; color: #212121; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .details { background-color: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
            .amount { font-size: 24px; font-weight: bold; color: #4caf50; }
            .footer { text-align: center; padding: 20px; color: #666; }
            ul { list-style-type: none; padding: 0; }
            li { background-color: #f0f0f0; margin: 5px 0; padding: 8px; border-radius: 3px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎯 Sales Rep Cashout Request</h1>
            </div>
            
            <div class="content">
                <div class="details">
                    <h2>Sales Representative Details</h2>
                    <p><strong>Name:</strong> ${salesRep}</p>
                    <p><strong>ID:</strong> ${salesRepId}</p>
                    <p><strong>Email:</strong> ${salesRepEmail}</p>
                </div>
                
                <div class="details">
                    <h2>Cashout Summary</h2>
                    <p><strong>Amount Requested:</strong> <span class="amount">R${amount}</span></p>
                    <p><strong>Commission Orders:</strong> ${orderCount} orders</p>
                    <p><strong>Rate:</strong> R10 per order</p>
                </div>
                
                <div class="details">
                    <h2>Order IDs</h2>
                    <ul>
                        ${orderIds.map(id => `<li>#${id.slice(-8)}</li>`).join('')}
                    </ul>
                </div>
            </div>
            
            <div class="footer">
                <p>LocalsZA Sales Commission System</p>
                <p>Please process this payout at your earliest convenience.</p>
            </div>
        </div>
    </body>
    </html>
  `;
}

// Get sales rep info for cashout purposes
router.get('/info', authenticateSalesRep, async (req, res) => {
  try {
    const salesRepId = req.user.uid;
    
    // Get sales rep data
    const salesRepRef = admin.firestore().collection('salesReps').doc(salesRepId);
    const salesRepDoc = await salesRepRef.get();
    
    let salesRepData = {};
    if (salesRepDoc.exists) {
      salesRepData = salesRepDoc.data();
    }
    
    // Get cashout history with error handling for missing index
    const cashoutHistory = [];
    let totalCashedOut = 0;
    
    try {
      const cashoutSnapshot = await admin.firestore()
        .collection('salesCashouts')
        .where('salesRepId', '==', salesRepId)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
      
      cashoutSnapshot.docs.forEach(doc => {
        const cashoutData = doc.data();
        cashoutHistory.push({
          id: doc.id,
          amount: cashoutData.amount,
          orderCount: cashoutData.orderCount,
          status: cashoutData.status || 'pending',
          createdAt: cashoutData.createdAt ? cashoutData.createdAt.toDate().toISOString() : null,
          orderIds: cashoutData.orderIds || []
        });
      });
      
      // Calculate total cashed out amount
      totalCashedOut = cashoutHistory.reduce((sum, cashout) => sum + (cashout.amount || 0), 0);
      
    } catch (firestoreError) {
      console.error('Error fetching cashout history (likely missing index):', firestoreError);
      
      // Fallback: try to get cashouts without ordering
      try {
        const fallbackSnapshot = await admin.firestore()
          .collection('salesCashouts')
          .where('salesRepId', '==', salesRepId)
          .limit(10)
          .get();
        
        fallbackSnapshot.docs.forEach(doc => {
          const cashoutData = doc.data();
          cashoutHistory.push({
            id: doc.id,
            amount: cashoutData.amount,
            orderCount: cashoutData.orderCount,
            status: cashoutData.status || 'pending',
            createdAt: cashoutData.createdAt ? cashoutData.createdAt.toDate().toISOString() : null,
            orderIds: cashoutData.orderIds || []
          });
        });
        
        // Sort manually and calculate total
        cashoutHistory.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        totalCashedOut = cashoutHistory.reduce((sum, cashout) => sum + (cashout.amount || 0), 0);
        
      } catch (fallbackError) {
        console.error('Fallback cashout history fetch also failed:', fallbackError);
        // Continue with empty history
      }
    }
    
    // Return what we found
    res.json({
      name: salesRepData.full_name || salesRepData.username || req.user.username || null,
      lastCashoutDate: salesRepData.lastCashoutDate ? salesRepData.lastCashoutDate.toDate().toISOString() : null,
      lastCashoutAmount: salesRepData.lastCashoutAmount || 0,
      email: salesRepData.email || req.user.email || null,
      cashoutHistory,
      totalCashedOut
    });
    
  } catch (error) {
    console.error('Error getting sales rep info:', error);
    res.status(500).json({ error: 'Failed to get sales rep information' });
  }
});

// Get detailed sales rep information for admin (including orders and cashout history)
router.get('/admin/:salesRepId/details', async (req, res) => {
  try {
    const { salesRepId } = req.params;
    
    // Get sales rep basic info
    const salesRepDoc = await admin.firestore()
      .collection('salesReps')
      .doc(salesRepId)
      .get();
    
    if (!salesRepDoc.exists) {
      return res.status(404).json({ error: 'Sales rep not found' });
    }
    
    const salesRepData = salesRepDoc.data();
    
    // Get customers linked to this sales rep
    const customersQuery = admin.firestore()
      .collection('users')
      .where('salesRepId', '==', salesRepId);
    
    const customersSnapshot = await customersQuery.get();
    const customers = [];
    const customerUserIds = [];
    
    for (const doc of customersSnapshot.docs) {
      const userData = doc.data();
      customerUserIds.push(doc.id);
      
      customers.push({
        id: doc.id,
        name: userData.full_name || userData.displayName || 'Unknown',
        email: userData.email,
        phone: userData.phone_number || '',
        createdAt: userData.created_at || userData.createdAt
      });
    }
    
    // Get all orders from these customers with better error handling
    let allOrders = [];
    let totalRevenue = 0;
    
    if (customerUserIds.length > 0) {
      // Handle large customer lists by batching
      const batchSize = 10; // Firestore 'in' query limit
      for (let i = 0; i < customerUserIds.length; i += batchSize) {
        const batchCustomerIds = customerUserIds.slice(i, i + batchSize);
        
        try {
          const ordersSnapshot = await admin.firestore()
            .collection('orders')
            .where('userId', 'in', batchCustomerIds)
            .get(); // Remove orderBy to avoid index requirement
          
          ordersSnapshot.docs.forEach(doc => {
            const orderData = doc.data();
            const orderTotal = orderData.adjustedTotal || orderData.total || 0;
            totalRevenue += orderTotal;
            
            allOrders.push({
              id: doc.id,
              total: orderTotal,
              status: orderData.status,
              createdAt: orderData.createdAt,
              userId: orderData.userId,
              customerName: customers.find(c => c.id === orderData.userId)?.name || 'Unknown',
              salesRepCashedOut: orderData.salesRepCashedOut || false
            });
          });
        } catch (orderError) {
          console.error(`Error fetching orders for batch ${i}:`, orderError);
          // Continue with other batches
        }
      }
      
      // Sort orders manually by date (newest first)
      allOrders.sort((a, b) => {
        const getTime = (timestamp) => {
          if (!timestamp) return 0;
          if (timestamp.seconds) return timestamp.seconds * 1000;
          if (typeof timestamp === 'string') return new Date(timestamp).getTime();
          return 0;
        };
        return getTime(b.createdAt) - getTime(a.createdAt);
      });
    }
    
    // Get cashout history with error handling
    let cashoutHistory = [];
    try {
      const cashoutSnapshot = await admin.firestore()
        .collection('salesCashouts')
        .where('salesRepId', '==', salesRepId)
        .orderBy('createdAt', 'desc')
        .get();
      
      cashoutSnapshot.docs.forEach(doc => {
        const cashoutData = doc.data();
        cashoutHistory.push({
          id: doc.id,
          amount: cashoutData.amount,
          orderCount: cashoutData.orderCount,
          status: cashoutData.status || 'pending',
          createdAt: cashoutData.createdAt,
          orderIds: cashoutData.orderIds || []
        });
      });
    } catch (cashoutError) {
      console.error('Error fetching cashout history (likely missing index):', cashoutError);
      
      // Fallback: try without ordering
      try {
        const fallbackCashoutSnapshot = await admin.firestore()
          .collection('salesCashouts')
          .where('salesRepId', '==', salesRepId)
          .get();
        
        fallbackCashoutSnapshot.docs.forEach(doc => {
          const cashoutData = doc.data();
          cashoutHistory.push({
            id: doc.id,
            amount: cashoutData.amount,
            orderCount: cashoutData.orderCount,
            status: cashoutData.status || 'pending',
            createdAt: cashoutData.createdAt,
            orderIds: cashoutData.orderIds || []
          });
        });
        
        // Sort manually
        cashoutHistory.sort((a, b) => {
          const getTime = (timestamp) => {
            if (!timestamp) return 0;
            if (timestamp.seconds) return timestamp.seconds * 1000;
            return 0;
          };
          return getTime(b.createdAt) - getTime(a.createdAt);
        });
      } catch (fallbackError) {
        console.error('Fallback cashout history fetch also failed:', fallbackError);
        // Continue with empty array
      }
    }
    
    // Calculate commission earnings
    const eligibleOrders = allOrders.filter(order => !order.salesRepCashedOut);
    const pendingCommission = eligibleOrders.length * 10; // R10 per order
    const totalCashedOut = cashoutHistory.reduce((sum, cashout) => sum + (cashout.amount || 0), 0);
    
    res.json({
      id: salesRepId,
      username: salesRepData.username,
      email: salesRepData.email,
      createdAt: salesRepData.createdAt,
      totalCustomers: customers.length,
      totalOrders: allOrders.length,
      totalRevenue,
      pendingCommission,
      totalCashedOut,
      customers,
      orders: allOrders.slice(0, 20), // Latest 20 orders
      cashoutHistory
    });
    
  } catch (error) {
    console.error('Error getting sales rep admin details:', error);
    res.status(500).json({ 
      error: 'Failed to get sales rep details', 
      details: error.message 
    });
  }
});

// Mark cashout as paid (admin only)
router.patch('/admin/cashout/:cashoutId/mark-paid', async (req, res) => {
  try {
    const { cashoutId } = req.params;
    
    const cashoutRef = admin.firestore().collection('salesCashouts').doc(cashoutId);
    const cashoutDoc = await cashoutRef.get();
    
    if (!cashoutDoc.exists) {
      return res.status(404).json({ error: 'Cashout request not found' });
    }
    
    await cashoutRef.update({
      status: 'paid',
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      paidBy: 'admin'
    });
    
    res.json({ success: true, message: 'Cashout marked as paid' });
    
  } catch (error) {
    console.error('Error marking cashout as paid:', error);
    res.status(500).json({ error: 'Failed to mark cashout as paid' });
  }
});

module.exports = router;
