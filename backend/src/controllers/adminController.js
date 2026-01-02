const admin = require('../../firebase');
const bcrypt = require('bcrypt');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Check if user is admin
    const { uid } = req.user;
    
    // Get user data to verify admin status
    const userRef = await admin.firestore().collection('users').doc(uid).get();
    const userData = userRef.data();
    
    if (userData?.user_type !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    // Get period parameter (30, 60, 90 days or "all")
    const { period = '30' } = req.query;
    const daysToLookBack = period === 'all' ? 36500 : parseInt(period);
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToLookBack);
    
    // Get all orders
    const ordersSnapshot = await admin.firestore().collection('orders').get();
    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filter orders by date
    const filteredOrders = orders.filter(order => {
      if (!order.createdAt) return false;
      
      // Handle different timestamp formats
      let orderDate;
      if (order.createdAt instanceof Date) {
        orderDate = order.createdAt;
      } else if (order.createdAt.seconds) {
        // Firestore timestamp
        orderDate = new Date(order.createdAt.seconds * 1000);
      } else if (typeof order.createdAt === 'string') {
        // ISO string
        orderDate = new Date(order.createdAt);
      } else {
        return false;
      }
      
      return orderDate && orderDate >= cutoffDate;
    });
    
    // Calculate statistics
    const serviceRevenue = filteredOrders.reduce((sum, order) => 
      sum + (Number(order.serviceFee) || 0), 0);
    
    const orderRevenue = filteredOrders.reduce((sum, order) => 
      sum + (Number(order.subtotal) || 0), 0);
    
    // Calculate top products
    const productSales = {};
    filteredOrders.forEach(order => {
      if (!order.items) return;
      
      order.items.forEach(item => {
        const productId = item.productId;
        if (!productId) return;
        
        const productName = item.product?.name || `Product ${productId}`;
        const qty = Number(item.qty) || 0;
        const itemPrice = Number(item.product?.price || 0);
        
        if (!productSales[productId]) {
          productSales[productId] = {
            name: productName,
            count: 0,
            revenue: 0
          };
        }
        
        productSales[productId].count += qty;
        productSales[productId].revenue += itemPrice * qty;
      });
    });
    
    // Sort by count (quantity sold)
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    // Calculate driver revenue
    let driverRevenue = 0;
    for (const order of filteredOrders) {
      if (order.driver_id && order.status === 'delivered') {
        // R40 for van, R30 for light vehicle (default to R30 if not specified)
        const deliveryFee = order.vehicleType === 'van' ? 40 : 30;
        driverRevenue += deliveryFee;
      }
    }

    // Calculate sales rep revenue (R10 per order from their customers)
    const salesRepsSnapshot = await admin.firestore().collection('salesReps').get();
    let salesRepRevenue = 0;
    
    for (const repDoc of salesRepsSnapshot.docs) {
      const customersSnapshot = await admin.firestore()
        .collection('salesReps').doc(repDoc.id)
        .collection('customers')
        .get();
      
      const customerEmails = customersSnapshot.docs.map(doc => doc.data().email);
      
      if (customerEmails.length > 0) {
        // Count orders from these customers
        for (let i = 0; i < customerEmails.length; i += 10) {
          const batch = customerEmails.slice(i, i + 10);
          const ordersSnapshot = await admin.firestore().collection('orders')
            .where('email', 'in', batch)
            .get();
          
          // Filter by date
          const repOrders = ordersSnapshot.docs.filter(doc => {
            const orderData = doc.data();
            if (!orderData.createdAt) return false;
            
            let orderDate;
            if (orderData.createdAt instanceof Date) {
              orderDate = orderData.createdAt;
            } else if (orderData.createdAt.seconds) {
              orderDate = new Date(orderData.createdAt.seconds * 1000);
            } else if (typeof orderData.createdAt === 'string') {
              orderDate = new Date(orderData.createdAt);
            } else {
              return false;
            }
            
            return orderDate && orderDate >= cutoffDate;
          });
          
          salesRepRevenue += repOrders.length * 10; // R10 per order
        }
      }
    }
    
    res.json({
      serviceRevenue,
      orderRevenue,
      driverRevenue,
      salesRepRevenue,
      topProducts
    });
  } catch (error) {
    console.error('Error generating admin stats:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get cashout requests
exports.getCashoutRequests = async (req, res) => {
  try {
    // Check if user is admin
    const { uid } = req.user;
    
    // Get user data to verify admin status
    const userRef = await admin.firestore().collection('users').doc(uid).get();
    const userData = userRef.data();
    
    if (userData?.user_type !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    // Get all cashout requests
    const snapshot = await admin.firestore().collection('cashouts').orderBy('createdAt', 'desc').get();
    const cashouts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Ensure critical fields exist
      createdAt: doc.data().createdAt || null,
      driverName: doc.data().driverName || 'Unknown Driver',
      amount: doc.data().amount || 0,
      status: doc.data().status || 'pending'
    }));
    
    res.json(cashouts);
  } catch (error) {
    console.error('Error fetching cashout requests:', error);
    res.status(500).json({ error: error.message });
  }
};

// Process cashout payment
exports.processCashoutPayment = async (req, res) => {
  try {
    const { cashoutId } = req.params;
    
    // Check if user is admin
    const { uid } = req.user;
    const userRef = await admin.firestore().collection('users').doc(uid).get();
    const userData = userRef.data();
    
    if (userData?.user_type !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    // Get the cashout document
    const cashoutRef = admin.firestore().collection('cashouts').doc(cashoutId);
    const cashoutDoc = await cashoutRef.get();
    
    if (!cashoutDoc.exists) {
      return res.status(404).json({ error: "Cashout request not found" });
    }
    
    // Update the cashout status
    await cashoutRef.update({
      status: 'completed',
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      paidBy: uid,
      adminName: userData.full_name || userData.email
    });
    
    // Get the updated document
    const updatedDoc = await cashoutRef.get();
    
    res.json({
      success: true,
      cashout: {
        id: cashoutId,
        ...updatedDoc.data()
      }
    });
  } catch (error) {
    console.error('Error processing cashout payment:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get driver payment history
exports.getDriverPaymentHistory = async (req, res) => {
  try {
    const { driverId } = req.params;
    
    // Check if user is admin
    const { uid } = req.user;
    const userRef = await admin.firestore().collection('users').doc(uid).get();
    const userData = userRef.data();
    
    if (userData?.user_type !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    // Get all cashouts for this driver (without orderBy to avoid index requirement)
    const snapshot = await admin.firestore().collection('cashouts')
      .where('driverId', '==', driverId)
      .get();
    
    const payments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Ensure critical fields exist
      createdAt: doc.data().createdAt || null,
      paidAt: doc.data().paidAt || null,
      amount: doc.data().amount || 0,
      status: doc.data().status || 'pending',
      orderCount: doc.data().orderCount || 0
    }));
    
    // Sort by createdAt in JavaScript
    payments.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime; // descending order
    });
    
    res.json(payments);
  } catch (error) {
    console.error('Error fetching driver payment history:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get user count and user list
exports.getUserCount = async (req, res) => {
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
    const users = snapshot.docs.map(doc => ({
      user_id: doc.id,
      email: doc.data().email,
      full_name: doc.data().full_name,
      phone_number: doc.data().phone_number,
      user_type: doc.data().user_type,
      created_at: doc.data().created_at
    }));
    
    res.json({
      count: users.length,
      users: users,
      message: 'User data retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting user count:', error);
    res.status(500).json({ error: error.message });
  }
};

// Promote user to sales representative
exports.promoteToSalesRep = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if username already exists
    const usernameSnapshot = await admin.firestore().collection('salesReps')
      .where('username', '==', username.trim())
      .get();

    if (!usernameSnapshot.empty) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Check if email already exists
    const emailSnapshot = await admin.firestore().collection('salesReps')
      .where('email', '==', email.trim().toLowerCase())
      .get();

    if (!emailSnapshot.empty) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash the password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create sales rep profile
    const salesRepData = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: 'salesRep',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isActive: true
    };

    const docRef = await admin.firestore().collection('salesReps').add(salesRepData);

    res.json({ 
      success: true,
      salesRepId: docRef.id,
      message: 'Sales representative created successfully'
    });
  } catch (error) {
    console.error('Error creating sales rep:', error);
    res.status(500).json({ error: 'Failed to create sales representative' });
  }
};

// Get all sales representatives
exports.getSalesReps = async (req, res) => {
  try {
    // Check if user is admin
    const { uid } = req.user;
    const userRef = await admin.firestore().collection('users').doc(uid).get();
    const userData = userRef.data();
    
    if (userData?.user_type !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Get all sales reps
    const snapshot = await admin.firestore().collection('salesReps').get();
    const salesReps = snapshot.docs.map(doc => ({
      id: doc.id,
      username: doc.data().username,
      email: doc.data().email,
      createdAt: doc.data().createdAt || null,
      isActive: doc.data().isActive !== undefined ? doc.data().isActive : true
    }));

    // Sort by creation date (newest first)
    salesReps.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    });

    res.json(salesReps);
  } catch (error) {
    console.error('Error fetching sales reps:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get sales rep details with customers and revenue
exports.getSalesRepDetails = async (req, res) => {
  try {
    const { salesRepId } = req.params;
    const { uid } = req.user;
    
    // Verify admin
    const userRef = await admin.firestore().collection('users').doc(uid).get();
    const userData = userRef.data();
    
    if (userData?.user_type !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    // Get sales rep info
    const salesRepDoc = await admin.firestore().collection('salesReps').doc(salesRepId).get();
    
    if (!salesRepDoc.exists) {
      return res.status(404).json({ error: 'Sales rep not found' });
    }

    const salesRepData = salesRepDoc.data();

    // Get customers
    const customersSnapshot = await admin.firestore()
      .collection('salesReps').doc(salesRepId)
      .collection('customers')
      .get();

    const customerEmails = customersSnapshot.docs.map(doc => doc.data().email);
    const customers = customersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get orders for revenue calculation
    let totalOrders = 0;
    if (customerEmails.length > 0) {
      for (let i = 0; i < customerEmails.length; i += 10) {
        const batch = customerEmails.slice(i, i + 10);
        const ordersSnapshot = await admin.firestore().collection('orders')
          .where('email', 'in', batch)
          .get();
        totalOrders += ordersSnapshot.size;
      }
    }

    const totalRevenue = totalOrders * 10; // R10 per order

    res.json({
      id: salesRepId,
      ...salesRepData,
      totalCustomers: customers.length,
      totalOrders,
      totalRevenue,
      customers: customers.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      })
    });
  } catch (error) {
    console.error('Error fetching sales rep details:', error);
    res.status(500).json({ error: error.message });
  }
};