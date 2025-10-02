// Import the express framework
const express = require('express');

// Load environment variables from a .env file into process.env
require('dotenv').config();

// Create an Express application object, the core of your server
const app = express();

// Middleware to parse JSON bodies from incoming requests.
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

// Import the dashboard routes for internal team operations.
// This will handle operations like fetching driver locations and dashboard deliveries.
const dashboardRoutes = require('./src/routes/dashboardRoutes');

// Mount the dashboard router at the /api/dashboard base path.
app.use('/api/dashboard', dashboardRoutes);


// Import the report routes for generating delivery reports.
// This will handle operations like fetching delivered deliveries for reporting.
const reportRoutes = require('./src/routes/reportRoutes');

// Mount the report router at the /api/reports base path.
app.use('/api/reports', reportRoutes);

// Import the message routes for handling user messages.
// This will handle operations like sending and retrieving messages between users.
const messageRoutes = require('./src/routes/messageRoutes');

// Mount the message router at the /api/messages base path.
app.use('/api/messages', messageRoutes);

// Import the ticket routes for handling support tickets.
// This will handle operations like creating, updating, and retrieving support tickets.
const ticketRoutes = require('./src/routes/ticketRoutes');

// Mount the ticket router at the /api/tickets base path.
app.use('/api/tickets', ticketRoutes);

// Mount the admin router at the /api/admin base path.  
const adminRoutes = require('./src/routes/adminRoutes');

// Mount the admin router at the /api/admin base path.
app.use('/api/admin', adminRoutes);

// Mount the maps router at the /api/maps base path.
const mapsRoutes = require('./src/routes/mapsRoutes');

// Mount the maps router at the /api/maps base path.
app.use('/api/maps', mapsRoutes);

// Mount the support router at the /api/support base path.
const supportRoutes = require('./src/routes/supportRoutes');
app.use('/api/support', supportRoutes);

// Mount the product request router at the /api/product-requests base path.
const productRequestRoutes = require('./src/routes/productRequestRoutes');
app.use('/api/product-requests', productRequestRoutes);

// Start the server on the specified port or default to 3000.
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));