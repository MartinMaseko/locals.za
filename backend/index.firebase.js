const { onRequest } = require('firebase-functions/v2/https');
const express = require('express');
const cors = require('cors');
const admin = require('./firebase');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const productRoutes = require('./src/routes/productRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const driverRoutes = require('./src/routes/driverRoutes');
const paymentRoutes = require('./src/routes/paymentRoutes');
const messageRoutes = require('./src/routes/messageRoutes');
const supportRoutes = require('./src/routes/supportRoutes');
const mapsRoutes = require('./src/routes/mapsRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const ticketRoutes = require('./src/routes/ticketRoutes');
const productRequestRoutes = require('./src/routes/productRequestRoutes');
const discountRoutes = require('./src/routes/discountRoutes');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://locals-za.co.za',
  'https://locals-za.netlify.app'
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy violation'), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/maps', mapsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/product-requests', productRequestRoutes);
app.use('/api/discounts', discountRoutes);

// Health check
app.get('/', (req, res) => {
  res.status(200).send('LocalsZA API is running');
});

// Error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Export as Firebase Function (v2)
exports.api = onRequest(
  {
    region: 'europe-west4',
    timeoutSeconds: 60,
    memory: '1GiB',
    maxInstances: 10
  },
  app
);