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

    const snap = await db.collection('orders').where('userId', '==', userId).orderBy('createdAt', 'desc').get();
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.json({ orders });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Failed to fetch user orders' });
  }
};