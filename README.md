LOCALS-ZA: README
Welcome to LOCALS-ZA, a project currently under development aimed at creating a robust platform for connecting local businesses, 
drivers, and customers. This README provides an overview of the project structure, its key components, and the technologies used. 
Whether you're a developer, contributor, or stakeholder, this document will help you understand the project's architecture and progress.

🚧 Project Status
LOCALS-ZA is still in development. Some features are functional (MVP Running), while others are being actively worked on. Contributions, 
feedback, and testing are welcome!

📂 Project Structure
The project is divided into two main parts: Backend and Frontend, each with its own set of files and directories.

1. Backend
The backend is built using Node.js and integrates with Firebase for authentication, database, and cloud functions. It also includes PayFast for payment processing.

Key Directories and Files
.env: Contains environment variables for secure configuration.
firebase.js: Firebase configuration and initialization.
index.js: Main entry point for the backend server.
controllers/: Handles business logic for various features.
adminController.js: Admin-specific operations.
authController.js: User authentication and authorization.
driverController.js: Driver-related operations.
mapsController.js: Google Maps integration.
orderController.js: Order management.
productController.js: Product-related operations.
middleware/: Middleware for handling authentication and other tasks.
auth.js: Authentication middleware.
routes/: API endpoints for different functionalities.
Examples: adminRoutes.js, authRoutes.js, orderRoutes.js, etc.
services/: External service integrations.
mapsService.js: Google Maps API integration.
payfastService.js: PayFast payment gateway integration.
utils/: Utility functions.
emailHelper.js: Email notifications.
notificationHelper.js: Push notifications.
Backend Features
Firebase Integration:
Authentication (Email/Password, OAuth).
Firestore Database for data storage.
Firebase Admin SDK for server-side operations.
PayFast Payment Gateway:
Secure payment processing for orders.
API Endpoints:
User authentication and management.
Admin dashboard operations.
Driver and order management.
Product and store management.
Google Maps Integration:
Route optimization for drivers.
Location-based services.
2. Frontend
The frontend is built using React (TypeScript) and is designed to provide a seamless user experience for customers, drivers, and admins.

Key Directories and Files
.env: Environment variables for frontend configuration.
vite.config.ts: Configuration for the Vite build tool.
src: Main source directory.
Auth/: Handles authentication logic.
AuthProvider.tsx: Context provider for authentication.
authService.ts: Authentication service.
firebaseClient.ts: Firebase client setup.
components/: Reusable UI components.
ScrollToTop.tsx: Utility for scrolling to the top of the page.
contexts/: Context providers for global state management.
CartContext.tsx: Manages cart state.
FavoritesContext.tsx: Manages favorite items.
WazeRouteContext.tsx: Manages Waze route data.
pages/: Page components for different user roles.
Admin Dashboard:
adminDashboard.tsx: Admin dashboard interface.
adminLogin.tsx: Admin login page.
AdminStyle.css: Styles for admin pages.
Driver Dashboard:
driverDeliveries.tsx: Driver delivery management.
driverRevenue.tsx: Driver revenue tracking.
driversDash.tsx: Driver dashboard interface.
driverStyles.css: Styles for driver pages.
Store Pages: Pages for store owners (under development).
User Pages: Pages for customers (under development).
lib/: API utilities.
api.ts: API service for making HTTP requests.
utils/: Utility functions.
analytics.ts: Analytics tracking.
api.ts: API helpers.
wazeHelper.ts: Waze integration helper.

Frontend Features
Admin Dashboard:
Manage users, drivers, and stores.
View and resolve support tickets.
Generate reports and analytics.
Driver Dashboard:
View assigned deliveries.
Track revenue and performance.
Navigate routes using Waze integration.
Customer Features (In Progress):
Browse and purchase products.
Track orders in real-time.
Communicate with support.
Store Features (In Progress):
Manage product listings.
View sales and analytics.

🔥 Firebase System
The project leverages Firebase for:

Authentication: Secure login and registration for users, drivers, and admins.
Firestore Database: Real-time database for storing user, order, and product data.
Cloud Functions: Serverless backend logic for handling events.
Push Notifications: Real-time updates for orders and messages.

💳 PayFast Integration
PayFast is integrated into the backend to handle secure payment processing. Key features include:

Payment initiation and confirmation.
Webhook handling for payment status updates.
Secure transactions for customers and store owners.

🛠️ Development Tools
Frontend: React (TypeScript), Vite, CSS Modules.
Backend: Node.js, Express, Firebase Admin SDK.
Database: Firebase Firestore.
Payment Gateway: PayFast.
Version Control: Git.
