const express = require('express');
const router = express.Router();
const admin = require('../../firebase');
const authenticateToken = require('../middleware/auth');

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

    // optionally store separate order_items collection for compatibility
    if (Array.isArray(items) && items.length > 0) {
      const orderItems = items.map(item => ({ ...item, order_id: orderRef.id }));
      const batch = admin.firestore().batch();
      orderItems.forEach(item => {
        const itemRef = admin.firestore().collection('order_items').doc();
        batch.set(itemRef, item);
      });
      await batch.commit();
    }

    return res.status(201).json({ id: orderRef.id, order: orderData });
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

// Get Order by ID (Salon Owner / Admin)
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await admin.firestore().collection('orders').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Order not found" });
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update Order Status (Admin/Driver)
router.put('/:id/status', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await admin.firestore().collection('orders').doc(id).set({ status, updatedAt: new Date().toISOString() }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Assign Driver to Order (Admin)
router.put('/:id/assign-driver', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { driver_id } = req.body;
  try {
    await admin.firestore().collection('orders').doc(id).set({ driver_id }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;