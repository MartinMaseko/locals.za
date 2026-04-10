# LocalsZA

https://locals-za.co.za/ - Website

LocalsZA is a supply-chain aggregator platform built for South African SMEs -- spaza shops, salons, fast-food outlets, and other informal traders. The system connects product suppliers, field sales representatives, delivery drivers, and business buyers through a single coordinated platform, handling everything from catalogue browsing and checkout to payment processing, route-optimised delivery, and discount distribution.

The project is actively maintained. The MVP is live and new modules are under development.

---

## Table of Contents

- [System Overview](#system-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Firebase Backend](#firebase-backend)
- [Frontend Architecture](#frontend-architecture)
- [Ozow Pay-by-Bank Integration](#ozow-pay-by-bank-integration)
- [The LocalsZA Ecosystem](#the-localsza-ecosystem)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Deployment](#deployment)

---

## System Overview

LocalsZA operates as an interconnected ecosystem of five user roles, each with its own interface, all sharing a common backend and data layer:

| Role | Purpose |
|------|---------|
| **Customer** | Browse products, build a cart, checkout, pay via Ozow, and track deliveries |
| **Driver** | Receive delivery assignments, navigate routes, update statuses, and request cashouts |
| **Admin** | Manage products, drivers, orders, discounts, sales reps, and view operational analytics |
| **Sales Rep** | Onboard and link customers, place orders on their behalf, and earn per-order commission |
| **Buyer** | Track orders and receive price-update notifications from procurement |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.8, Vite 7, React Router 7 |
| Backend | Node.js 22, Express 4, Firebase Admin SDK 12 |
| Database | Cloud Firestore |
| Authentication | Firebase Authentication (Email/Password, custom tokens) |
| Payments | Ozow Pay-by-Bank (SHA-512 signed requests) |
| Maps | Google Maps Distance Matrix and Geocoding APIs |
| Email | Nodemailer via SMTP (smtpout.secureserver.net) |
| Hosting | Firebase Hosting (frontend), Firebase Cloud Functions (backend) |
| Build | Vite with PWA plugin, Brotli/Gzip compression |

---

## Project Structure

```
locals-za-app/
├── firebase.json                 # Firebase Hosting + Cloud Functions config
├── .firebaserc                   # Firebase project alias (localsza)
├── package.json                  # Root dependencies (firebase-functions)
│
├── backend/
│   ├── index.js                  # Express server, CORS, route mounting
│   ├── index.firebase.js         # Cloud Functions entry point
│   ├── firebase.js               # Firebase Admin SDK initialisation
│   ├── package.json
│   └── src/
│       ├── middleware/
│       │   └── auth.js           # authenticateToken, requireAdmin, authenticateSalesRep
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── adminController.js
│       │   ├── driverController.js
│       │   ├── orderController.js
│       │   ├── productController.js
│       │   ├── discountController.js
│       │   └── mapsController.js
│       ├── routes/
│       │   ├── authRoutes.js
│       │   ├── userRoutes.js
│       │   ├── productRoutes.js
│       │   ├── orderRoutes.js
│       │   ├── driverRoutes.js
│       │   ├── paymentRoutes.js
│       │   ├── adminRoutes.js
│       │   ├── dashboardRoutes.js
│       │   ├── salesRoutes.js
│       │   ├── messageRoutes.js
│       │   ├── ticketRoutes.js
│       │   ├── mapsRoutes.js
│       │   ├── reportRoutes.js
│       │   ├── discountRoutes.js
│       │   ├── supportRoutes.js
│       │   └── productRequestRoutes.js
│       ├── services/
│       │   ├── ozowService.js    # Ozow payment hash generation and verification
│       │   └── mapsService.js    # Google Maps Distance Matrix and Geocoding
│       └── utils/
│           ├── emailHelper.js    # Transactional email via Nodemailer
│           └── notificationHelper.js  # In-app inbox and notification messages
│
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── src/
        ├── App.tsx               # All route definitions
        ├── main.tsx              # React entry point
        ├── Auth/
        │   ├── AuthProvider.tsx   # Auth context and token management
        │   ├── authService.ts     # signUp, signIn, signOut wrappers
        │   ├── firebaseClient.ts  # Firebase client SDK init
        │   ├── ProtectedRoute.tsx # Route guard (authenticated users)
        │   └── SalesProtectedRoute.tsx  # Route guard (sales reps)
        ├── components/
        │   ├── contexts/
        │   │   ├── CartContext.tsx       # Cart state with localStorage persistence
        │   │   ├── FavoritesContext.tsx  # Wishlist with localStorage persistence
        │   │   └── WazeRouteContext.tsx  # Waze deep-link integration for drivers
        │   └── pages/
        │       ├── storepages/          # Customer storefront and checkout
        │       ├── dashboard/           # Admin dashboard with sections, hooks, services, types
        │       ├── drivers/             # Driver dashboard, deliveries, revenue
        │       ├── userpages/           # Customer account, orders, profile
        │       ├── sales/               # Sales rep shop, cart, customers, revenue
        │       └── buyers/              # Buyer orders and price updates
        ├── lib/
        │   └── api.ts            # Axios instance creation
        ├── utils/
        │   ├── api.ts            # Axios interceptors, token refresh, retry logic
        │   ├── analytics.ts      # Event tracking
        │   └── priceHelper.ts    # Price formatting utilities
        └── types/
            ├── global.d.ts       # ImportMetaEnv interface
            ├── env.d.ts
            ├── images.d.ts
            └── virtual-pwa-register.d.ts
```

---

## Firebase Backend

### Authentication

Firebase Authentication handles identity for all user roles. The implementation supports three authentication strategies depending on the role:

- **Customers** authenticate directly on the frontend using Firebase's `signInWithEmailAndPassword`. After sign-in, the frontend calls `POST /api/users/register` to persist the user profile in Firestore.
- **Drivers** are registered by an admin. On first login the backend verifies the driver's name and ID against the `drivers` collection, creates a Firebase Auth account if one does not exist, and issues a custom token with driver claims.
- **Sales Reps** authenticate with a username and bcrypt-hashed password stored in the `salesReps` Firestore collection. The backend validates credentials and returns a session reference.
- **Admins** are promoted via `POST /api/auth/promote-admin`, which sets the `admin: true` custom claim on the Firebase Auth token and updates the Firestore user document.

All authenticated API requests attach a Firebase ID token as a Bearer token. The `authenticateToken` middleware decodes and verifies the token on every protected route. The `requireAdmin` middleware extends this check by inspecting the custom claim or falling back to a Firestore lookup.

### Cloud Firestore

Firestore is the sole database. The following collections form the data model:

| Collection | Purpose |
|------------|---------|
| `users` | Customer and admin profiles. Contains subcollections `inbox` and `notifications` for in-app messaging. |
| `orders` | All orders with items, totals, payment status, delivery address, assigned driver, and ETA. |
| `products` | Master product catalogue with name, price, image, category, and brand. |
| `drivers` | Driver profiles including vehicle type, contact details, and cashout history. |
| `salesReps` | Sales representative accounts with a `customers` subcollection linking them to onboarded users. |
| `discounts` | Daily discount records keyed as `YYYY-MM-DD_productId` with unit-level cost breakdowns. |
| `customerDiscounts` | Per-customer discount balances with a `transactions` subcollection for audit trail. |
| `cashouts` | Driver cashout requests with status tracking (pending, completed). |

### Cloud Functions

The backend Express server is exported as a Firebase Cloud Function via `index.firebase.js`. Firebase Hosting proxies all `/api` requests to this function. The runtime is Node.js 22.

### Notification System

The `notificationHelper` module writes structured messages to two Firestore subcollections under each user document:

- `users/{userId}/inbox` -- user-facing messages displayed in the app.
- `users/{userId}/notifications` -- backend audit notifications.

Predefined message types include order confirmation, status updates (processing, in transit, delivered, cancelled), driver approach alerts, and delivery PIN codes.

Transactional emails are sent via Nodemailer over SMTP for events such as driver cashout requests and support form submissions.

---

## Frontend Architecture

### TypeScript and Type Safety

The frontend is written entirely in TypeScript 5.8. Key interfaces include:

```typescript
// Cart and product types
type Product = {
  id: string;
  name?: string;
  price?: number | string;
  image_url?: string;
  category?: string;
};

type CartItem = { product: Product; qty: number };

// Order types
type Order = {
  id: string;
  items: OrderItem[];
  subtotal?: number;
  serviceFee?: number;
  total?: number;
  status?: string;
  paymentStatus?: string;
  deliveryAddress?: Record<string, any>;
  driver_id?: string;
  eta?: string;
  missingItems?: MissingItem[];
  refundStatus?: 'pending' | 'processed' | 'credited';
};

// Auth context
interface AuthContextType {
  currentUser: User | null;
  userLoading: boolean;
  accessToken: string | null;
  refreshUserToken: () => Promise<string | null>;
}

// Environment variables
interface ImportMetaEnv {
  VITE_API_URL: string;
  VITE_FIREBASE_API_KEY: string;
  VITE_FIREBASE_AUTH_DOMAIN: string;
  VITE_FIREBASE_PROJECT_ID: string;
  VITE_FIREBASE_STORAGE_BUCKET: string;
  VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  VITE_FIREBASE_APP_ID: string;
  VITE_FIREBASE_MEASUREMENT_ID: string;
}
```

The admin dashboard maintains its own `types/` directory with interfaces for dashboard statistics, driver records, and order management views.

### State Management

Global state is managed through React Context providers:

| Context | Responsibility | Persistence |
|---------|---------------|-------------|
| `AuthProvider` | Current user, Firebase ID token, automatic token refresh (30-minute interval) | sessionStorage / localStorage |
| `CartContext` | Cart items with add, remove, increase, decrease, and clear operations | localStorage |
| `FavoritesContext` | Favourite products wishlist with toggle and remove | localStorage |
| `WazeRouteContext` | Route data for Waze deep-link navigation used by drivers | In-memory |
| `LoadingContext` | Shared loading spinner state across checkout and order pages | In-memory |

### API Client

The Axios client is configured with request and response interceptors:

- **Request interceptor** attaches the Firebase ID token from sessionStorage to every outgoing request (excluding auth routes).
- **Response interceptor** catches 401 responses, transparently refreshes the token via `getAuthToken()`, and retries the original request once.
- **Timeout** is set to 30 seconds.
- **Base URL** resolves from `VITE_API_URL` or defaults to `/api`.

### Route Structure

**Public routes:**
- `/` -- Home and product catalogue
- `/register` -- Customer registration
- `/login` -- Customer login
- `/product/:id` -- Product detail
- `/adminlogin`, `/driverlogin`, `/buyerlogin`, `/saleslogin` -- Role-specific login pages

**Customer routes (protected):**
- `/useraccount`, `/userprofile`, `/userorders` -- Account management
- `/checkout` -- Cart checkout with delivery details
- `/payment-success/:orderId`, `/payment-cancelled/:orderId` -- Payment result pages
- `/messages` -- Order messaging

**Driver routes (protected):**
- `/driver/dashboard` -- Assigned orders with status filtering
- `/driver/deliveries/:orderId` -- Delivery details, status updates, proof of delivery
- `/driver/revenue` -- Earnings breakdown and cashout requests

**Admin routes (protected, admin-only):**
- `/admindashboard` -- Unified dashboard with sections for statistics, driver management, product management, order management, admin promotion, client views, procurement, and discount analytics

**Sales rep routes (sales rep guard):**
- `/sales/shop`, `/sales/cart` -- Browse and order on behalf of customers
- `/sales/add-customer`, `/sales/customers` -- Customer onboarding and management
- `/sales/revenue` -- Commission tracking

**Buyer routes (protected):**
- `/buyer/orders` -- Order history
- `/buyer/price-updates` -- Price change notifications

### PWA Support

The frontend is configured as a Progressive Web App via `vite-plugin-pwa`, enabling installation on mobile devices and offline asset caching. Build output is compressed with Brotli and Gzip via `vite-plugin-compression2`.

---

## Ozow Pay-by-Bank Integration

LocalsZA uses Ozow for secure pay-by-bank payments. Ozow connects directly to South African banks, allowing customers to pay from their bank account without a card.

### Payment Flow

1. **Order creation** -- The customer completes checkout. The frontend sends cart items, delivery address, and calculated totals to `POST /api/orders`. The order is created in Firestore with status `pending_payment`.

2. **Payment initiation** -- The frontend calls `POST /api/payment/process/:orderId`. The backend constructs a signed payment request using the Ozow Site Code, Private Key, and order details. A SHA-512 hash is generated over the concatenated fields (SiteCode, CountryCode, CurrencyCode, Amount, TransactionReference, BankReference, callback URLs, IsTest flag, and Private Key). The response contains form fields for a browser POST to the Ozow gateway.

3. **Bank selection and authentication** -- The customer is redirected to Ozow, selects their bank, and authenticates using their bank credentials.

4. **Callback handling** -- Ozow sends a server-to-server POST to `POST /api/payment/notify` with the transaction result. The backend verifies the hash integrity, confirms the transaction via the Ozow `GetTransactionByReference` API, and updates the order:
   - `Complete` -- sets `paymentStatus: 'paid'` and `status: 'pending'` (ready for fulfilment)
   - `Cancelled` or `Abandoned` -- sets `status: 'cancelled'`
   - `Error` -- sets `status: 'payment_failed'`
   - `PendingInvestigation` -- retains `status: 'pending_payment'`

5. **Frontend redirect** -- The customer is returned to either the `OrderConfirmationPage` or `PaymentCancelledPage` based on the Ozow callback URL.

### Service Fee Calculation

Service fees are determined by product category and reflect the vehicle type required for delivery:

- **R80 (van)** -- Beverages, Canned Foods, Sugar, Flour, Cooking Oils and Fats, Rice, Maize Meal
- **R60 (light vehicle)** -- Spices and Seasoning, Snacks and Confectionery, Household Cleaning, Laundry Supplies, Personal Care, Hair Care products

If the cart contains any van-category item, the R80 fee applies regardless of other items.

---

## The LocalsZA Ecosystem

The platform is designed as a closed-loop supply chain where each role feeds into the next.

### Storefront (Customer-Facing)

The storefront is the primary entry point. Customers browse the product catalogue, filter by category, add items to a persistent cart, and proceed to checkout. The cart is managed through `CartContext` and survives browser refreshes via localStorage. At checkout, the system calculates the service fee based on the heaviest product category in the cart, applies any earned discounts from the `customerDiscounts` collection, and initiates Ozow payment. Once paid, the order moves to `pending` status and becomes visible in the admin dashboard for processing.

### Admin Dashboard

The admin dashboard is the operational control centre. It provides:

- **Order management** -- View incoming, unassigned, and in-progress orders. Assign drivers to orders and resolve issues such as missing items.
- **Product management** -- Add, edit, and delete products from the master catalogue.
- **Driver management** -- Register new drivers, view all active drivers, track delivery performance, and process cashout requests.
- **Sales rep management** -- Promote users to sales representatives and monitor their customer portfolios.
- **Procurement and discounts** -- Record daily paid prices for products, which triggers the discount distribution engine. The system calculates per-unit discounts, splits them 75/25 between customers and the business, and distributes earned discounts to every customer who ordered that product on the recorded date.
- **Analytics** -- Dashboard KPIs include service revenue, order revenue, driver revenue (R40/van delivery, R30/light delivery), sales rep revenue (R10/order), and top products by quantity sold. Periods are configurable (30, 60, 90 days, or all time).

### Driver Dashboard

Drivers operate through a dedicated interface. After logging in with their registered credentials, they see a list of orders assigned to them. The workflow proceeds through status transitions:

1. `pending` -- Order is paid and awaiting dispatch.
2. `processing` -- Driver acknowledges and prepares for pickup.
3. `in_transit` -- Driver is en route. The system sends the customer an alert message and updates the ETA via the Google Maps Distance Matrix API.
4. `delivered` -- Driver confirms delivery with proof. The customer receives a notification with a delivery PIN.

Earnings are calculated per delivery based on vehicle type. Drivers can view their accumulated earnings and submit cashout requests, which are reviewed and processed by an admin.

Waze deep-link integration is available through `WazeRouteContext`, allowing drivers to open turn-by-turn navigation directly from the delivery screen.

### Sales Network

Sales representatives act as field agents who onboard new customers. A sales rep can:

- Link existing platform users to their account by email address.
- Browse the product catalogue and place orders on behalf of linked customers.
- Track their commission earnings (R10 per fulfilled order from their linked customers).

Customer-sales rep relationships are stored in the `salesReps/{repId}/customers` subcollection. When an order is delivered for a linked customer, the commission is attributed to the corresponding sales rep and reflected in the revenue dashboard.

### Buyer Portal

Buyers operate at the procurement level. They can view their order history and receive notifications when product prices are updated, allowing them to make informed purchasing decisions.

### How the Roles Interlink

```
Customer ─── browses ───> Storefront ─── checkout ───> Ozow Payment
                                                            │
Sales Rep ── places order on behalf ──────────────────> Order Created
                                                            │
                                                            v
                                                     Admin Dashboard
                                                       │         │
                                          assigns driver│         │records paid prices
                                                       v         v
                                                 Driver App    Discount Engine
                                                    │              │
                                          delivers  │              │distributes to
                                                    v              v
                                               Customer ◄──── Customer Discounts
                                              (notification)   (applied at next checkout)
```

The cycle is continuous: customers order, admins process, drivers deliver, discounts accumulate, and customers return to order again with reduced costs. Sales reps expand the customer base, feeding more volume into the same pipeline.

---

## API Reference

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | None | Registration (handled on frontend) |
| POST | `/api/auth/login` | None | Login (handled on frontend) |
| POST | `/api/auth/session` | Token | Verify session token |
| POST | `/api/auth/promote-admin` | Token | Promote user to admin role |

### Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/users/register` | Token | Create user profile after auth |
| GET | `/api/users/me` | Token | Get current user profile |
| PUT | `/api/users/me` | Token | Update current user profile |
| GET | `/api/users/:id` | Token | Get user by ID |
| PUT | `/api/users/:id` | Token | Update user by ID |

### Products

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/products` | None | List all products, optional category filter |
| GET | `/api/products/:id` | None | Get product by ID |
| POST | `/api/products` | Admin | Create product |
| PUT | `/api/products/:id` | Admin | Update product |
| DELETE | `/api/products/:id` | Admin | Delete product |

### Orders

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/orders` | Token | Create order (checkout) |
| GET | `/api/orders/my` | Token | Get current user orders |
| GET | `/api/orders/:id` | Token | Get order by ID |
| PUT | `/api/orders/:id` | Token | Update order status |
| GET | `/api/orders/all` | Admin | Get all orders |
| GET | `/api/orders/incoming` | Admin | Get pending orders |
| GET | `/api/orders/user/:userId` | Admin | Get orders for a specific user |

### Payments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/payment/process/:orderId` | Token | Initiate Ozow payment |
| POST | `/api/payment/notify` | None | Ozow webhook callback |
| GET | `/api/payment/status/:orderId` | Token | Check payment status |

### Drivers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/drivers/register` | Admin | Register a new driver |
| POST | `/api/drivers/verify-credentials` | None | Verify driver identity |
| POST | `/api/drivers/login-link` | None | Generate driver login token |
| GET | `/api/drivers/profile` | Token | Get driver profile |
| PUT | `/api/drivers/me/profile` | Token | Update driver profile |
| GET | `/api/drivers/me/deliveries` | Token | Get assigned deliveries |
| GET | `/api/drivers/me/earnings` | Token | Get earnings summary |
| PUT | `/api/drivers/deliveries/:id/status` | Token | Update delivery status |
| POST | `/api/drivers/deliveries/:id/proof` | Token | Upload proof of delivery |
| POST | `/api/drivers/cashout` | Token | Request earnings cashout |
| GET | `/api/drivers` | Admin | List all drivers |
| GET | `/api/drivers/all` | Admin | List all drivers with details |

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/stats` | Admin | Dashboard statistics by period |
| GET | `/api/admin/stats/users` | Admin | User count |
| GET | `/api/admin/cashouts` | Admin | Get pending cashout requests |
| PUT | `/api/admin/cashouts/:cashoutId/complete` | Admin | Process a cashout payment |
| GET | `/api/admin/drivers/:driverId/payments` | Admin | Driver payment history |
| POST | `/api/admin/promote-sales-rep` | Admin | Promote user to sales rep |
| GET | `/api/admin/sales-reps` | Admin | List all sales reps |
| GET | `/api/admin/sales-reps/:salesRepId` | Admin | Get sales rep details |

### Dashboard (Internal Operations)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/dashboard/orders/incoming` | Admin | New pending orders |
| GET | `/api/dashboard/orders/unassigned` | Admin | Orders without drivers |
| GET | `/api/dashboard/orders/issues` | Admin | Orders with reported issues |
| GET | `/api/dashboard/deliveries` | Admin | Unassigned deliveries |
| GET | `/api/dashboard/deliveries/performance` | Admin | Delivery performance metrics |
| GET | `/api/dashboard/drivers/efficiency` | Admin | Driver efficiency statistics |
| GET | `/api/dashboard/drivers/earnings` | Admin | All driver earnings |
| GET | `/api/dashboard/revenue` | Admin | Revenue totals |
| GET | `/api/dashboard/:id/location` | Admin | Driver location |

### Sales

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/sales/login` | None | Sales rep login |
| POST | `/api/sales/customers` | SalesRep | Link customer to sales rep |
| GET | `/api/sales/customers` | SalesRep | Get linked customers |
| POST | `/api/sales/customer-orders` | SalesRep | Create order for customer |

### Discounts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/discounts/paid-price` | Admin | Record paid price and trigger discount distribution |
| GET | `/api/discounts/analytics` | Admin | Discount analytics |
| GET | `/api/discounts/by-date/:date` | Admin | Discounts for a specific date |
| GET | `/api/discounts/customer/:userId` | Token | Get customer discount balance |
| POST | `/api/discounts/apply` | Token | Apply discount to an order |

### Maps

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/maps/directions` | Token | Get directions and ETA |
| GET | `/api/maps/geocode` | Token | Geocode an address |
| PUT | `/api/maps/orders/:orderId/eta` | Token | Update order ETA |

### Messaging and Support

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/messages` | Token | Send a message on an order |
| GET | `/api/messages/order/:orderId` | Token | Get messages for an order |
| POST | `/api/support/contact` | None | Submit a support query (sends email) |
| POST | `/api/product-requests` | None | Request a new product (sends email) |

---

## Environment Variables

### Frontend (.env)

```
VITE_API_URL=https://your-backend-url.com/api
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=localsza
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

### Backend (.env)

```
PORT=3000
OZOW_SITE_CODE=
OZOW_PRIVATE_KEY=
OZOW_API_KEY=
OZOW_IS_TEST=true
OZOW_SUCCESS_URL=
OZOW_CANCEL_URL=
OZOW_ERROR_URL=
OZOW_NOTIFY_URL=
GOOGLE_MAPS_API_KEY=
EMAIL_HOST=smtpout.secureserver.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=
EMAIL_PASSWORD=
```

---

## Getting Started

### Prerequisites

- Node.js 22 or later
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project with Authentication and Firestore enabled
- An Ozow merchant account (test or production)
- A Google Maps API key with Distance Matrix and Geocoding enabled

### Backend

```bash
cd backend
npm install
# Configure .env with Firebase, Ozow, Google Maps, and email credentials
node index.js
# Server runs on http://localhost:3000
```

### Frontend

```bash
cd frontend
npm install
# Configure .env with VITE_API_URL and Firebase client credentials
npm run dev
# App runs on http://localhost:5173
```

---

## Deployment

### Firebase Hosting (Frontend)

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

The build output in `frontend/dist` is served by Firebase Hosting. All routes are rewritten to `index.html` for SPA client-side routing.

### Firebase Cloud Functions (Backend)

```bash
firebase deploy --only functions
```

The Express server is exported from `index.firebase.js` as a Cloud Function. The runtime is Node.js 22, configured in `firebase.json` under the `localsbackend` codebase.
