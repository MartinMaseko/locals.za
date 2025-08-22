const admin = require('../../firebase');
const db = admin.firestore();

exports.createOrder = async (req, res) => {
  try {
    const userId = (req.user && req.user.uid) || req.body.userId || null;
    const {
      items = [], subtotal = 0, serviceFee = 0, total = 0,
      deliveryAddress = {}, status = 'pending', createdAt = new Date().toISOString()
    } = req.body;

    const orderData = {
      userId,
      items,
      subtotal,
      serviceFee,
      total,
      deliveryAddress,
      status,
      createdAt,
      updatedAt: createdAt,
    };

    const docRef = await db.collection('orders').add(orderData);
    const saved = (await docRef.get()).data();

    return res.status(201).json({ id: docRef.id, order: saved });
  } catch (err) {
    console.error('createOrder error', err);
    return res.status(500).json({ message: 'Failed to create order' });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('orders').doc(id).get();
    if (!doc.exists) return res.status(404).json({ message: 'Order not found' });
    return res.json({ id: doc.id, order: doc.data() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch order' });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    // prefer authenticated user
    const userId = (req.user && req.user.uid) || req.params.userId;
    if (!userId) return res.status(400).json({ message: 'Missing user id' });

    let snap;
    try {
      // try the desired server-side ordering first
      snap = await db.collection('orders')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
    } catch (err) {
      // Firestore may throw a "requires an index" error for certain orderBy+where combos.
      // Fall back to an unordered query and sort results in JS.
      const msg = (err && err.message) ? err.message : String(err);
      if (msg.includes('requires an index') || msg.includes('FAILED_PRECONDITION')) {
        console.warn('Firestore index required for orderBy(userId, createdAt). Falling back to client-side sort.', msg);
        snap = await db.collection('orders').where('userId', '==', userId).get();
      } else {
        throw err;
      }
    }

    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Ensure consistent sorting by createdAt (handles Firestore Timestamp or string/number)
    const toMillis = (val) => {
      if (!val) return 0;
      if (typeof val === 'object' && val.seconds != null) {
        return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1e6);
      }
      const parsed = Date.parse(val);
      if (!isNaN(parsed)) return parsed;
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    };

    orders.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

    return res.json({ orders });
  } catch (err) {
    console.error('getUserOrders error:', err);
    return res.status(500).json({ message: 'Failed to fetch user orders', error: err?.message || String(err) });
  }
};