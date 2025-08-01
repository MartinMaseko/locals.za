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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));