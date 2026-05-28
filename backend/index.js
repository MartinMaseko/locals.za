const express = require('express');
const cors = require('cors');

require('dotenv').config();

// Create an Express application object
const app = express();

// Enable CORS
app.use(cors({ origin: '*' }));

// Middleware to parse JSON bodies
app.use(express.json());

// Import the authentication routes from ./src/routes/authRoutes.
const authRoutes = require('./src/routes/authRoutes');

// Mount the authentication router at the /api/auth base path.
// All routes defined in authRoutes.js will be prefixed with this path.
app.use('/api/auth', authRoutes);

// Import the user routes from ./src/routes/userRoutes.
const userRoutes = require('./src/routes/userRoutes');

// Mount the user router at the /api/users base path.
app.use('/api/users', userRoutes);


// Import the product routes from ./src/routes/productRoutes.
// This will handle product-related operations like adding, updating, and deleting products.

const productRoutes = require('./src/routes/productRoutes');
// Mount the product router at the /api/products base path.
app.use('/api/products', productRoutes);


// Import the order routes from ./src/routes/orderRoutes.
// This will handle order-related operations like creating and managing orders.
const orderRoutes = require('./src/routes/orderRoutes');

// Mount the order router at the /api/orders base path.
app.use('/api/orders', orderRoutes);

// Import the driver routes from ./src/routes/driverRoutes.
// This will handle driver-related operations like managing deliveries and earnings.
const driverRoutes = require('./src/routes/driverRoutes');

// Mount the driver router at the /api/drivers base path.
app.use('/api/drivers', driverRoutes);

// Mount the maps router at the /api/maps base path.
const mapsRoutes = require('./src/routes/mapsRoutes');
app.use('/api/maps', mapsRoutes);

// Mount the support router at the /api/support base path.
const supportRoutes = require('./src/routes/supportRoutes');
app.use('/api/support', supportRoutes);

// Mount the message router at the /api/messages base path.
const messageRoutes = require('./src/routes/messageRoutes');
app.use('/api/messages', messageRoutes);

// Mount the product request router at the /api/product-requests base path.
const productRequestRoutes = require('./src/routes/productRequestRoutes');
app.use('/api/product-requests', productRequestRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Catch all route for debugging
app.use('*', (req, res) => {
  console.log('404 - Route not found:', req.method, req.originalUrl);
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// Start the server on the specified port or default to 3000.
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));