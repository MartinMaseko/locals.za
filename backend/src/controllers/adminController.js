const admin = require('../../firebase');

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
    
    res.json({
      serviceRevenue,
      orderRevenue,
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
    
    // Get all cashouts for this driver
    const snapshot = await admin.firestore().collection('cashouts')
      .where('driverId', '==', driverId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const payments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Ensure critical fields exist
      createdAt: doc.data().createdAt || null,
      paidAt: doc.data().paidAt || null,
      amount: doc.data().amount || 0,
      status: doc.data().status || 'pending'
    }));
    
    res.json(payments);
  } catch (error) {
    console.error('Error fetching driver payment history:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get user count
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
    const count = snapshot.size;
    
    res.json({
      count: count,
      message: 'User count retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting user count:', error);
    res.status(500).json({ error: error.message });
  }
};