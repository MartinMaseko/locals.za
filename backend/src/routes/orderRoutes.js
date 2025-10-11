const express = require('express');
const router = express.Router();
const admin = require('../../firebase');
const authenticateToken = require('../middleware/auth');
const { sendOrderConfirmationMessage, sendOrderStatusMessage, sendUserMessages } = require('../utils/notificationHelper');

/*
  POST '/'
  - supports two payload shapes:
    1) { order, items }  (existing behaviour)
    2) { items, subtotal, serviceFee, total, deliveryAddress, ... } (checkout payload)
  - order.owner (salon_id/userId) is taken from authenticated user when available
*/
router.post('/', authenticateToken, async (req, res) => {
  try {
    // if caller sent a full "order" object (legacy), use existing flow
    if (req.body.order && Array.isArray(req.body.items)) {
      const { order, items } = req.body;
      const orderRef = await admin.firestore().collection('orders').add(order);

      const orderItems = items.map(item => ({ ...item, order_id: orderRef.id }));
      const batch = admin.firestore().batch();
      orderItems.forEach(item => {
        const itemRef = admin.firestore().collection('order_items').doc();
        batch.set(itemRef, item);
      });
      await batch.commit();

      return res.json({ order: { id: orderRef.id, ...order }, items: orderItems });
    }

    // otherwise treat request as checkout payload
    const {
      items = [],
      subtotal = 0,
      serviceFee = 0,
      total = null,
      deliveryAddress = {},
      status = 'pending',
      salon_id = null,
      userId: bodyUserId = null,
      createdAt = new Date().toISOString(),
    } = req.body;

    const userId = (req.user && req.user.uid) || bodyUserId || null;
    const computedTotal = total !== null ? total : (Number(subtotal || 0) + Number(serviceFee || 0));

    const orderData = {
      userId,
      salon_id,
      items: items.map(i => ({ productId: i.productId || i.id || i.product?.id || null, product: i.product || null, qty: i.qty || 1 })),
      subtotal: Number(subtotal || 0),
      serviceFee: Number(serviceFee || 0),
      total: Number(computedTotal || 0),
      deliveryAddress,
      status,
      createdAt,
      updatedAt: createdAt,
    };

    // save order
    const orderRef = await admin.firestore().collection('orders').add(orderData);
    const orderId = orderRef.id;

    // optionally store separate order_items collection for compatibility
    if (Array.isArray(items) && items.length > 0) {
      const orderItems = items.map(item => ({ ...item, order_id: orderId }));
      const batch = admin.firestore().batch();
      orderItems.forEach(item => {
        const itemRef = admin.firestore().collection('order_items').doc();
        batch.set(itemRef, item);
      });
      await batch.commit();
    }

    return res.status(201).json({ id: orderId, order: orderData });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// Get My Orders (Salon Owner)
router.get('/my', authenticateToken, async (req, res) => {
  const { uid } = req.user;
  try {
    const snapshot = await admin.firestore().collection('orders').where('salon_id', '==', uid).get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get Incoming Orders (Internal Team) — keep before '/:id' so route is reachable
router.get('/incoming', authenticateToken, async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('orders').where('status', '==', 'pending').get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all orders (admin only)
router.get('/all', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    const { uid } = req.user;
    const userRef = await admin.firestore().collection('users').doc(uid).get();
    const userData = userRef.data();
    
    if (userData?.user_type !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    // Get query parameters for filtering/pagination
    const { status, limit = 100, offset = 0 } = req.query;
    
    let orders = [];
    
    try {
      let query = admin.firestore().collection('orders');
      
      // Add filters if provided
      if (status) {
        query = query.where('status', '==', status);
      }
      
      // Order by creation date (newest first)
      query = query.orderBy('createdAt', 'desc');
      
      // Apply pagination
      query = query.limit(parseInt(limit)).offset(parseInt(offset));
      
      const snapshot = await query.get();
      orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
    } catch (indexError) {
      // Handle missing index error (code 9 is Firestore's missing index error)
      if (indexError.code === 9 || 
          indexError.message.includes('index') || 
          indexError.message.includes('Index')) {
        console.log('Missing index error, using client-side filtering instead');
        
        // Fallback to getting all orders and filtering in memory
        const snapshot = await admin.firestore()
          .collection('orders')
          .orderBy('createdAt', 'desc')
          .limit(1000) // Set a reasonable limit
          .get();
        
        // Filter in memory
        orders = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(order => !status || order.status === status)
          .slice(parseInt(offset), parseInt(offset) + parseInt(limit));
      } else {
        // If it's not an index error, rethrow
        throw indexError;
      }
    }
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    console.error('Error details:', error.code, error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get Orders for a specific user (frontend / checkout uses userId)
router.get('/user/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  try {
    // Try to fetch with userId field first
    try {
      const snapshot = await admin.firestore().collection('orders')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return res.json(orders);
    } catch (indexError) {
      // If it's a missing index error, try without sorting
      if (indexError.code === 9 || indexError.message.includes('index')) {
        console.warn('Missing index for orders by userId with sorting, falling back to unsorted query');
        try {
          const snapshot = await admin.firestore().collection('orders')
            .where('userId', '==', userId)
            .get();
          
          // Sort in memory instead
          const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => {
              // Handle various createdAt formats (Timestamp, ISO string, etc)
              const getTime = (doc) => {
                const ts = doc.createdAt;
                if (!ts) return 0;
                if (typeof ts === 'string') return new Date(ts).getTime();
                if (ts.seconds) return ts.seconds * 1000;
                return 0;
              };
              return getTime(b) - getTime(a); // Descending
            });
          
          return res.json(orders);
        } catch (fallbackError) {
          // If that fails too, try the other field name
          const altSnapshot = await admin.firestore().collection('orders')
            .where('user_id', '==', userId)
            .get();
          
          const orders = altSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => {
              const getTime = (doc) => {
                const ts = doc.createdAt;
                if (!ts) return 0;
                if (typeof ts === 'string') return new Date(ts).getTime();
                if (ts.seconds) return ts.seconds * 1000;
                return 0;
              };
              return getTime(b) - getTime(a); // Descending
            });
          
          return res.json(orders);
        }
      } else {
        throw indexError; // Re-throw if it's not an index issue
      }
    }
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get Order by ID (Salon Owner / Admin / Assigned Driver)
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await admin.firestore().collection('orders').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Order not found" });
    
    const orderData = { id: doc.id, ...doc.data() };
    
    // Security check: ensure user can only view their own orders unless they're an admin or the assigned driver
    const isAdmin = req.user.role === 'admin' || req.user.user_type === 'admin';
    const isOrderOwner = req.user.uid === orderData.userId;
    const isSalonOwner = req.user.uid === orderData.salon_id;
    const isAssignedDriver = req.user.uid === orderData.driver_id || 
                             req.user.driver_id === orderData.driver_id;
    
    if (!isAdmin && !isOrderOwner && !isSalonOwner && !isAssignedDriver) {
      console.log('Access denied: User', req.user.uid, 'tried to access order', id);
      console.log('Order driver_id:', orderData.driver_id, 'User driver_id claim:', req.user.driver_id);
      return res.status(403).json({ error: "You don't have permission to view this order" });
    }
    
    // If we need to fetch the products info
    if (orderData.items && Array.isArray(orderData.items) && !orderData.products) {
      try {
        // Convert items to products with full details if needed
        const productDetails = await Promise.all(
          orderData.items.map(async (item) => {
            const productId = item.productId || item.product?.id;
            if (!productId) {
              return {
                id: 'unknown',
                name: item.product?.name || 'Unknown Product',
                price: item.product?.price || 0,
                quantity: item.qty || 1
              };
            }
            
            try {
              const productDoc = await admin.firestore().collection('products').doc(productId).get();
              if (productDoc.exists) {
                return {
                  id: productId,
                  ...productDoc.data(),
                  quantity: item.qty || 1
                };
              } else {
                return {
                  id: productId,
                  name: item.product?.name || 'Product Not Found',
                  price: item.product?.price || 0,
                  quantity: item.qty || 1
                };
              }
            } catch (err) {
              console.error('Error fetching product', productId, ':', err);
              return {
                id: productId,
                name: item.product?.name || 'Error Loading Product',
                price: item.product?.price || 0,
                quantity: item.qty || 1
              };
            }
          })
        );
        
        orderData.products = productDetails;
      } catch (err) {
        console.error('Error fetching product details:', err);
      }
    }
    
    res.json(orderData);
  } catch (error) {
    console.error('Error fetching order by ID:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Order Status (Admin/Driver)
router.put('/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status, sendConfirmation, missingItems, refundAmount, driverNote, adjustedTotal } = req.body;
  
  try {
    // Get the current user ID
    const userId = req.user.uid;
    
    // Create update object with status and timestamp
    const updateData = { 
      status, 
      updatedAt: new Date().toISOString(),
      updatedBy: userId
    };
    
    // Get the order to fetch customer ID before making any updates
    const orderDoc = await admin.firestore().collection('orders').doc(id).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const orderData = orderDoc.data();
    const customerId = orderData.userId;
    
    // If the status is changing to 'pending' from 'pending_payment' and sendConfirmation is true
    if (customerId && status === 'pending' && orderData.status === 'pending_payment' && sendConfirmation === true) {
      console.log(`Sending order confirmation for order ${id} to user ${customerId}`);
      
      // Mark the order as having had confirmation sent
      updateData.confirmationSent = true;
      updateData.confirmationSentAt = admin.firestore.FieldValue.serverTimestamp();
      
      // Send the confirmation message using the existing helper
      await sendOrderConfirmationMessage(customerId, id, orderData);
    } 
    // For other status changes, send status update message
    else if (customerId && status && status !== orderData.status) {
      console.log(`Sending status update for order ${id} to user ${customerId}: ${status}`);
      await sendOrderStatusMessage(customerId, id, status);
    }
    
    // If missing items data is provided, include it in the update
    if (missingItems) {
      updateData.missingItems = missingItems;
    }
    
    // If refund amount is provided, include it in the update
    if (refundAmount) {
      updateData.refundAmount = refundAmount;
    }
    
    // If driver note is provided, include it in the update
    if (driverNote) {
      updateData.driverNote = driverNote;
    }
    
    // If adjusted total is provided, include it in the update
    if (adjustedTotal !== undefined) {
      updateData.adjustedTotal = adjustedTotal;
    }
    
    // Update the order document
    await admin.firestore().collection('orders').doc(id).set(updateData, { merge: true });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(400).json({ error: error.message });
  }
});

// Assign Driver to Order (Admin)
router.put('/:id/assign-driver', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { driver_id } = req.body;
  try {
    const orderRef = admin.firestore().collection('orders').doc(id);
    
    if (driver_id === null) {
      // Remove driver assignment
      await orderRef.update({
        driver_id: admin.firestore.FieldValue.delete(), // This removes the field
        updatedAt: new Date().toISOString()
      });
      res.json({ success: true, message: "Driver removed successfully" });
    } else {
      // Assign driver
      await orderRef.update({
        driver_id,
        updatedAt: new Date().toISOString()
      });
      res.json({ success: true, message: "Driver assigned successfully" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get orders for a specific driver
router.get('/driver/:driverId', authenticateToken, async (req, res) => {
  const { driverId } = req.params;
  try {
    // Check if user is admin
    const { uid } = req.user;
    const userRef = await admin.firestore().collection('users').doc(uid).get();
    const userData = userRef.data();
    
    // Allow access if the user is an admin
    if (userData?.user_type !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    // Get all orders assigned to this driver
    let orders = [];
    
    try {
      // Try to get orders with driver_id match
      const snapshot = await admin.firestore()
        .collection('orders')
        .where('driver_id', '==', driverId)
        .get();
        
      orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (indexError) {
      // If index error, do unfiltered query and filter in memory
      console.log('Index error or missing field, fetching all orders:', indexError.message);
      const snapshot = await admin.firestore().collection('orders').get();
      orders = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(order => order.driver_id === driverId);
    }
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching driver orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get orders - supports filtering by driver_id (for driver dashboard)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { driver_id, status } = req.query;
    const { uid } = req.user;
    
    // Security check: Drivers can only access their own orders
    // Admins can access any driver's orders by providing driver_id
    if (driver_id && driver_id !== uid) {
      // Check if this is the driver's custom ID (driver_id claim)
      const isDriverOwner = req.user.driver_id === driver_id || req.user.driver === true;
      
      // If not the driver's ID and not admin, check user type
      if (!isDriverOwner) {
        // Check if user is admin
        const userRef = await admin.firestore().collection('users').doc(uid).get();
        const userData = userRef.data();
        
        if (userData?.user_type !== 'admin') {
          return res.status(403).json({ error: "Not authorized to view other driver's orders" });
        }
      }
    }
    
    // Use the authenticated user's ID if driver_id is not provided
    const driverId = driver_id || uid;
    
    // If no driver_id provided and not filtering specifically for drivers, return error
    if (!driverId) {
      return res.status(400).json({ error: "driver_id parameter is required" });
    }
    
    let orders = [];
    
    try {
      // Try to get orders with driver_id match
      let query = admin.firestore()
        .collection('orders')
        .where('driver_id', '==', driverId);
      
      // Apply status filter if provided
      if (status) {
        query = query.where('status', '==', status);
      }
      
      // Add sorting (if you have a composite index)
      try {
        query = query.orderBy('createdAt', 'desc');
      } catch (sortError) {
        // Ignore sort error, we'll sort in memory later
      }
        
      const snapshot = await query.get();
      orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort in memory if we couldn't do it in the query
      if (!query.toString().includes('orderBy')) {
        orders.sort((a, b) => {
          // Handle various createdAt formats
          const getTime = (doc) => {
            const ts = doc.createdAt;
            if (!ts) return 0;
            if (typeof ts === 'string') return new Date(ts).getTime();
            if (ts.seconds) return ts.seconds * 1000;
            return 0;
          };
          return getTime(b) - getTime(a); // Descending
        });
      }
    } catch (indexError) {
      console.log('Falling back to unfiltered query with client-side filtering');
      // If index error, do unfiltered query and filter in memory
      const snapshot = await admin.firestore().collection('orders').get();
      orders = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(order => order.driver_id === driverId && (!status || order.status === status))
        .sort((a, b) => {
          // Sort by createdAt in descending order
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
    }
    
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update order ETA
router.put('/:id/eta', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { eta } = req.body;
    const userId = req.user.uid;
    
    if (!eta) {
      return res.status(400).json({ error: 'ETA is required' });
    }
    
    const orderRef = admin.firestore().collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const orderData = orderDoc.data();
    
    // Check if the user is authorized (either driver or admin)
    const isDriver = orderData.driver_id === userId || 
                    (orderData.driver && orderData.driver.id === userId);
    const isAdmin = req.user.role === 'admin';
    
    if (!isDriver && !isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to update this order' });
    }
    
    // Update the order with ETA
    await orderRef.update({
      eta: eta,
      eta_updated_at: admin.firestore.FieldValue.serverTimestamp(),
      eta_updated_by: userId
    });
    
    // Send notification to customer about ETA
    const customerId = orderData.userId;
    if (customerId) {
      // Create ETA notification for customer
      const inboxMessage = {
        title: `ETA Update for Order #${orderId.slice(-6)}`,
        body: `Your delivery is expected to arrive at ${eta}. Your driver is on the way!`,
        fromRole: "LocalsZA Support",
        type: "eta_update",
        orderId: orderId,
        imageUrl: "https://img.icons8.com/ios-filled/50/ffb803/delivery-time.png"
      };
      
      const notificationMessage = {
        title: `Delivery ETA Updated`,
        body: `Your order #${orderId.slice(-6)} will arrive at ${eta}`,
        type: "eta_update",
        orderId: orderId
      };
      
      await sendUserMessages(customerId, inboxMessage, notificationMessage);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating order ETA:', error);
    res.status(500).json({ error: 'Failed to update order ETA' });
  }
});

// Report missing items during order collection
router.post('/:id/missing-items', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const { missingItems, refundAmount, driverNote } = req.body;
    const userId = req.user.uid;
    
    // Validate the request body
    if (!Array.isArray(missingItems) || missingItems.length === 0) {
      return res.status(400).json({ error: 'Missing items data is required' });
    }
    
    // Get the order document
    const orderRef = admin.firestore().collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const orderData = orderDoc.data();
    
    // Verify driver is assigned to this order
    if (orderData.driver_id !== userId && (!orderData.driver || orderData.driver.id !== userId)) {
      return res.status(403).json({ error: 'Unauthorized to update this order' });
    }
    
    // Calculate the original total
    const originalTotal = orderData.total || 0;
    
    // Calculate refund amount if not provided
    let calculatedRefundAmount = refundAmount;
    if (!calculatedRefundAmount) {
      calculatedRefundAmount = missingItems.reduce(
        (total, item) => total + ((item.price || 0) * (item.missingQuantity || 0)), 
        0
      );
    }
    
    // Calculate new total
    const newTotal = originalTotal - calculatedRefundAmount;
    
    // Update the order with missing items information
    await orderRef.update({
      missingItems,
      refundAmount: calculatedRefundAmount,
      adjustedTotal: newTotal,
      driverNote,
      hasRefund: calculatedRefundAmount > 0,
      refundStatus: 'pending', // Options: pending, processed, credited
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: userId
    });
    
    // Create a discount for next order if there's a refund amount
    if (calculatedRefundAmount > 0) {
      // Get customer ID
      const customerId = orderData.userId;
      
      if (customerId) {
        // Create a discount entry
        await admin.firestore().collection('discounts').add({
          userId: customerId,
          amount: calculatedRefundAmount,
          reason: `Refund for missing items in order ${orderId}`,
          status: 'active',
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // Notify customer using the inbox system
        const inboxMessage = {
          title: `Items Missing from Order #${orderId.slice(-6)}`,
          body: `Some items in your order were unavailable. A refund of R${calculatedRefundAmount.toFixed(2)} has been credited to your account for your next order.`,
          fromRole: "LocalsZA Support",
          type: "refund",
          orderId: orderId,
          imageUrl: "https://img.icons8.com/ios/50/ffb803/refund.png"
        };
        
        const notificationMessage = {
          title: `Refund Applied`,
          body: `R${calculatedRefundAmount.toFixed(2)} credit for missing items in order #${orderId.slice(-6)}`,
          type: "refund",
          orderId: orderId
        };
        
        await sendUserMessages(customerId, inboxMessage, notificationMessage);
      }
      
      // Notify admin about missing items
      try {
        await admin.firestore().collection('adminNotifications').add({
          title: 'Missing Items in Order',
          message: `Order #${orderId.slice(-6)} has ${missingItems.length} missing items. Refund amount: R${calculatedRefundAmount.toFixed(2)}`,
          orderId: orderId,
          type: 'missingItems',
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (adminNotifyError) {
        console.error('Error notifying admin about missing items:', adminNotifyError);
        // Continue processing even if notification fails
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Missing items reported successfully',
      refundAmount: calculatedRefundAmount,
      newTotal
    });
    
  } catch (error) {
    console.error('Error reporting missing items:', error);
    res.status(500).json({ error: 'Failed to report missing items' });
  }
});

// Send order confirmation notification (called from OrderConfirmationPage)
router.post('/:id/send-confirmation', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Get the order from the database
    const orderDoc = await admin.firestore().collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const orderData = orderDoc.data();
    const userId = orderData.userId;
    
    // Only allow the order owner or admin to send confirmations
    if (req.user.uid !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Check if confirmation was already sent to avoid duplicates
    if (orderData.confirmationSent) {
      return res.status(200).json({ message: 'Confirmation already sent' });
    }
    
    // Use the existing helper function to send notification
    await sendOrderConfirmationMessage(userId, orderId, orderData);
    
    // Mark the order as having had confirmation sent
    await admin.firestore().collection('orders').doc(orderId).update({
      confirmationSent: true,
      confirmationSentAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error sending confirmation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route   POST /api/orders/:id/rate
 * @desc    Add or update a rating for an order
 * @access  Private
 */
router.post('/:id/rate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    const { rating, comment } = req.body;
    
    // Validate rating
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be a number between 1 and 5' });
    }

    // Fetch the order to verify ownership and status
    const orderRef = admin.firestore().collection('orders').doc(id);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const orderData = orderDoc.data();
    
    // Verify the user owns this order
    if (orderData.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to rate this order' });
    }
    
    // Verify order is completed
    if (orderData.status !== 'completed' && orderData.status !== 'delivered') {
      return res.status(400).json({ error: 'Only completed orders can be rated' });
    }
    
    // Add the rating to the order
    await orderRef.update({
      rating: rating,
      ratingComment: comment || null,
      ratedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // If the order has a driver, update the driver's average rating
    if (orderData.driver_id) {
      const driverRef = admin.firestore().collection('drivers').doc(orderData.driver_id);
      const driverDoc = await driverRef.get();
      
      if (driverDoc.exists) {
        const driverData = driverDoc.data();
        const currentRatings = driverData.ratings || [];
        const newRating = {
          orderId: id,
          rating: rating,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Add this order's rating to the driver's ratings array
        await driverRef.update({
          ratings: [...currentRatings, newRating],
          averageRating: calculateAverageRating([...currentRatings, newRating])
        });
      }
    }
    
    res.json({ 
      success: true,
      message: 'Rating submitted successfully'
    });
    
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// Helper function to calculate average rating
function calculateAverageRating(ratings) {
  if (!ratings || ratings.length === 0) return 0;
  
  const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
  return sum / ratings.length;
}

module.exports = router;