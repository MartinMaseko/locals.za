const express = require('express');
const router = express.Router();
const admin = require('../../firebase'); 
const authenticateToken = require('../middleware/auth');

// Get Driver Location (Internal Team)
router.get('/:id/location', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const doc = await admin.firestore().collection('drivers').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Driver not found" });
    res.json({ current_location: doc.data().current_location });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get dashboard deliveries (incoming, unassigned, pending issues)
router.get('/deliveries', authenticateToken, async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('deliveries').get();
    const deliveries = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(d => d.status === 'pending' || d.status === 'issue' || !d.driver_id);
    res.json(deliveries);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// New incoming orders (status = 'pending')
router.get('/orders/incoming', authenticateToken, async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('orders').where('status', '==', 'pending').get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Unassigned orders (driver_id is null)
router.get('/orders/unassigned', authenticateToken, async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('orders').where('driver_id', '==', null).get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Orders with pending issues (status = 'issue')
router.get('/orders/issues', authenticateToken, async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('orders').where('status', '==', 'issue').get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(orders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delivery performance: total, delivered, failed, average delivery time
router.get('/deliveries/performance', authenticateToken, async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('deliveries').get();
    const data = snapshot.docs.map(doc => doc.data());

    const total = data.length;
    const delivered = data.filter(d => d.status === 'delivered').length;
    const failed = data.filter(d => d.status === 'failed_attempt').length;
    const avgDeliveryTime = (
      data
        .filter(d => d.status === 'delivered' && d.pickup_time && d.delivery_attempt_time)
        .map(d => new Date(d.delivery_attempt_time) - new Date(d.pickup_time))
        .reduce((a, b) => a + b, 0) /
      Math.max(1, data.filter(d => d.status === 'delivered' && d.pickup_time && d.delivery_attempt_time).length)
    ) / 1000 / 60; // in minutes

    res.json({ total, delivered, failed, avgDeliveryTime });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Driver efficiency: deliveries per driver
router.get('/drivers/efficiency', authenticateToken, async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('deliveries').get();
    const data = snapshot.docs.map(doc => doc.data());

    const efficiency = {};
    data.forEach(d => {
      if (!efficiency[d.driver_id]) efficiency[d.driver_id] = { total: 0, delivered: 0 };
      efficiency[d.driver_id].total += 1;
      if (d.status === 'delivered') efficiency[d.driver_id].delivered += 1;
    });

    res.json(efficiency);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Revenue and earnings: total amount, service fee, delivery fee
router.get('/revenue', authenticateToken, async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('orders').get();
    const data = snapshot.docs.map(doc => doc.data());

    const completedOrders = data.filter(
      o => o.payment_status === 'paid' && o.status === 'delivered'
    );
    const totalAmount = completedOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const totalServiceFee = completedOrders.reduce((sum, o) => sum + Number(o.service_fee || 0), 0);
    const totalDeliveryFee = completedOrders.reduce((sum, o) => sum + Number(o.delivery_fee || 0), 0);

    res.json({ totalAmount, totalServiceFee, totalDeliveryFee });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// All drivers' earnings and deliveries (for admin dashboard)
router.get('/drivers/earnings', authenticateToken, async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('orders').get();
    const data = snapshot.docs.map(doc => doc.data());

    const completed = data.filter(
      o => o.status === 'delivered' && o.payment_status === 'paid' && o.driver_id
    );

    const driverStats = {};
    completed.forEach(order => {
      if (!driverStats[order.driver_id]) {
        driverStats[order.driver_id] = { deliveries: 0, totalEarnings: 0 };
      }
      driverStats[order.driver_id].deliveries += 1;
      driverStats[order.driver_id].totalEarnings += Number(order.delivery_fee || 0);
    });

    const result = Object.entries(driverStats).map(([driver_id, stats]) => ({
      driver_id,
      deliveries: stats.deliveries,
      totalEarnings: stats.totalEarnings
    }));

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Top selling products (by quantity)
router.get('/products/top-selling', authenticateToken, async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('order_items').get();
    const data = snapshot.docs.map(doc => doc.data());

    const productSales = {};
    data.forEach(item => {
      if (!productSales[item.product_id]) productSales[item.product_id] = 0;
      productSales[item.product_id] += item.quantity;
    });

    // Convert to array and sort
    const topSelling = Object.entries(productSales)
      .map(([product_id, quantity]) => ({ product_id, quantity }))
      .sort((a, b) => b.quantity - a.quantity);

    res.json(topSelling);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Salon spending: total spent per salon
router.get('/salons/spending', authenticateToken, async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('orders').get();
    const data = snapshot.docs.map(doc => doc.data());

    const spending = {};
    data.filter(o => o.payment_status === 'paid').forEach(o => {
      if (!spending[o.salon_id]) spending[o.salon_id] = 0;
      spending[o.salon_id] += Number(o.total_amount);
    });

    res.json(spending);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;