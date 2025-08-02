const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabaseClient');
const authenticateToken = require('../middleware/auth');

// Get Driver Location (Internal Team)
router.get('/:id/location', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('drivers')
    .select('current_location')
    .eq('id', id)
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Get dashboard deliveries (incoming, unassigned, pending issues)
router.get('/deliveries', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .or('status.eq.pending,status.eq.issue,driver_id.is.null');
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});


// New incoming orders (status = 'pending')
router.get('/orders/incoming', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'pending');
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});


// Unassigned orders (driver_id is null)
router.get('/orders/unassigned', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .is('driver_id', null);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// Orders with pending issues (status = 'issue')
router.get('/orders/issues', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'issue');
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});


// Delivery performance: total, delivered, failed, average delivery time
router.get('/deliveries/performance', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('deliveries')
    .select('id, status, pickup_time, delivery_attempt_time');
  if (error) return res.status(400).json({ error: error.message });

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
});


// Driver efficiency: deliveries per driver
router.get('/drivers/efficiency', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('deliveries')
    .select('driver_id, status');
  if (error) return res.status(400).json({ error: error.message });

  const efficiency = {};
  data.forEach(d => {
    if (!efficiency[d.driver_id]) efficiency[d.driver_id] = { total: 0, delivered: 0 };
    efficiency[d.driver_id].total += 1;
    if (d.status === 'delivered') efficiency[d.driver_id].delivered += 1;
  });

  res.json(efficiency);
});


// Revenue and earnings: total amount, service fee, delivery fee
router.get('/revenue', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('total_amount, service_fee, delivery_fee, payment_status, status');
  if (error) return res.status(400).json({ error: error.message });

  // Only include orders that are both paid and delivered
  const completedOrders = data.filter(
    o => o.payment_status === 'paid' && o.status === 'delivered'
  );
  const totalAmount = completedOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const totalServiceFee = completedOrders.reduce((sum, o) => sum + Number(o.service_fee || 0), 0);
  const totalDeliveryFee = completedOrders.reduce((sum, o) => sum + Number(o.delivery_fee || 0), 0);

  res.json({ totalAmount, totalServiceFee, totalDeliveryFee });
});


// All drivers' earnings and deliveries (for admin dashboard)
router.get('/drivers/earnings', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('driver_id, delivery_fee, status, payment_status');
  if (error) return res.status(400).json({ error: error.message });

  // Only include delivered and paid orders
  const completed = data.filter(
    o => o.status === 'delivered' && o.payment_status === 'paid' && o.driver_id
  );

  // Aggregate by driver
  const driverStats = {};
  completed.forEach(order => {
    if (!driverStats[order.driver_id]) {
      driverStats[order.driver_id] = { deliveries: 0, totalEarnings: 0 };
    }
    driverStats[order.driver_id].deliveries += 1;
    driverStats[order.driver_id].totalEarnings += Number(order.delivery_fee || 0);
  });

  // Convert to array for easier frontend use
  const result = Object.entries(driverStats).map(([driver_id, stats]) => ({
    driver_id,
    deliveries: stats.deliveries,
    totalEarnings: stats.totalEarnings
  }));

  res.json(result);
});


// Top selling products (by quantity)
router.get('/products/top-selling', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('order_items')
    .select('product_id, quantity');
  if (error) return res.status(400).json({ error: error.message });

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
});


// Salon spending: total spent per salon
router.get('/salons/spending', authenticateToken, async (req, res) => {
  const { data, error } = await supabase
    .from('orders')
    .select('salon_id, total_amount, payment_status');
  if (error) return res.status(400).json({ error: error.message });

  const spending = {};
  data.filter(o => o.payment_status === 'paid').forEach(o => {
    if (!spending[o.salon_id]) spending[o.salon_id] = 0;
    spending[o.salon_id] += Number(o.total_amount);
  });

  res.json(spending);
});

module.exports = router;