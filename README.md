# LocalsZA

https://locals-za.co.za

LocalsZA is a wholesale pickup and delivery platform built for South African SMEs — spaza shops, salons, fast-food outlets, and informal traders. Customers upload a receipt from a cash-and-carry store; the platform prices the delivery, collects payment via Ozow, and dispatches a driver. The admin team reviews receipts, assigns drivers, and monitors operations through the Command Centre. Drivers manage their jobs through a dedicated mobile-first app.

The MVP is live. Levi Version One delivers the complete driver system end-to-end: PIN authentication, job workflow, assignment from Command Centre, and revenue tracking.

---

## Table of Contents

- [System Overview](#system-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Backend — .NET API on Azure](#backend--net-api-on-azure)
- [Frontend Architecture](#frontend-architecture)
- [Ozow Pay-by-Bank Integration](#ozow-pay-by-bank-integration)
- [Driver System](#driver-system)
- [Command Centre](#command-centre)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Deployment](#deployment)

---

## System Overview

| Role | Interface | Purpose |
|------|-----------|---------|
| **Customer** | Storefront (React) | Upload receipt, get delivery quote, pay via Ozow, track order |
| **Driver** | Driver App (React, mobile-first) | Accept jobs, navigate, update status, track earnings |
| **Admin** | Command Centre (React) | Review receipts, assign drivers, manage stores, set pricing |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 5.8, Vite 7, React Router 7 |
| Backend | .NET 10 (C#), ASP.NET Core Minimal API |
| Database | Azure Cosmos DB (NoSQL, Newtonsoft CamelCase serialisation) |
| Authentication | Firebase Authentication — email/password (customers), HMAC signed tokens (admin), Firebase custom tokens (drivers) |
| Payments | Ozow Pay-by-Bank (SHA-512 signed requests) |
| Storage | Azure Blob Storage (receipt images, store logos) |
| Maps | Azure Maps (geocoding, distance, routing) |
| Email | MailKit over SMTP |
| Hosting | Azure App Service — Linux, .NET 10, self-contained (backend); Netlify (frontend) |
| PWA | vite-plugin-pwa with auto-update, Brotli/Gzip compression |

---

## Project Structure

```
locals.za/
├── README.md
├── seed-orders.js              # Seed script — orders + receipts + driver accounts
├── seed-stores.js              # Seed script — store catalogue
│
├── api/                        # .NET 10 C# backend
│   ├── LocalsZaApi.csproj
│   ├── Program.cs              # Service registration, middleware, endpoint mapping
│   ├── appsettings.json
│   ├── deploynotes.txt         # Azure deploy recipe and slice history
│   ├── Endpoints/
│   │   ├── AdminEndpoints.cs   # Dashboard, orders, receipts, deliveries, drivers, pricing
│   │   ├── AuthEndPoints.cs    # Admin HMAC token login
│   │   ├── DriverEndpoints.cs  # Driver auth, jobs, status, location, revenue
│   │   ├── OrderEndPoints.cs   # Order CRUD, status updates
│   │   ├── PaymentEndpoints.cs # Ozow initiation and webhook callback
│   │   ├── QuoteEndpoints.cs   # Delivery pricing quotes
│   │   ├── ReceiptsEndpoints.cs# Receipt upload (OCR), retrieval
│   │   ├── StoreEndpoints.cs   # Store catalogue CRUD
│   │   └── MessageEndpoints.cs # In-app notifications
│   ├── Models/
│   │   ├── Order.cs
│   │   ├── Driver.cs
│   │   ├── Store.cs
│   │   ├── Payment.cs
│   │   ├── Receipts.cs
│   │   ├── PricingConfig.cs
│   │   ├── User.cs
│   │   ├── UserNotification.cs
│   │   ├── DeliveryAddress.cs
│   │   └── OrderItem.cs
│   └── Services/
│       ├── CosmoService.cs         # Cosmos DB client — CRUD, query, stream upsert
│       ├── BlobService.cs          # Azure Blob upload with SAS URL generation
│       ├── FirebaseAuthService.cs  # Custom token minting for driver login
│       ├── AuthHelpers.cs          # Token validation, UID extraction, admin/driver guards
│       ├── PricingService.cs       # Delivery fee calculation from Cosmos config container
│       ├── MapsService.cs          # Azure Maps distance + geocoding
│       ├── NotificationService.cs  # Push notifications to user inbox
│       └── OzowService.cs          # Ozow SHA-512 hash and transaction verification
│
└── frontend/                   # React + Vite frontend
    ├── package.json
    ├── vite.config.ts
    ├── netlify.toml            # Build config + CSP headers + SPA redirect
    ├── public/
    │   └── _headers
    └── src/
        ├── App.tsx             # All route definitions
        ├── main.tsx
        ├── Auth/
        │   ├── AuthProvider.tsx        # Firebase auth context, token refresh
        │   ├── firebaseClient.ts       # Firebase SDK initialisation
        │   └── ProtectedRoute.tsx      # Auth guard
        ├── components/
        │   ├── contexts/
        │   │   └── CartContext.tsx
        │   └── pages/
        │       ├── storepages/         # Customer storefront, checkout, orders
        │       ├── commandcentre/      # Admin Command Centre (9 pages)
        │       │   ├── pages/          # Dashboard, Orders, Payments, Receipts,
        │       │   │                   # Deliveries, Drivers, Metrics, Pricing, Stores
        │       │   ├── services/
        │       │   │   └── adminApi.ts # All Command Centre API calls
        │       │   └── components/     # StatusBadge, shared CC components
        │       ├── drivers/            # Driver app
        │       │   ├── auth/
        │       │   │   └── DriverLogin.tsx
        │       │   ├── driversDash.tsx
        │       │   ├── driverDeliveries.tsx
        │       │   ├── driverRevenue.tsx
        │       │   ├── driverNav.tsx
        │       │   ├── driverStyles.css
        │       │   └── layout/
        │       │       ├── DriverLayout.tsx
        │       │       └── DriverLayout.css
        │       └── userpages/          # Customer account, profile, orders
        ├── utils/
        │   └── api.ts          # Axios instance — Bearer token interceptor, 401 retry
        └── types/
            └── env.d.ts
```

---

## Backend — .NET API on Azure

### Cosmos DB Data Model

The backend uses Azure Cosmos DB. All containers use camelCase field names (Newtonsoft CamelCase serialiser policy). **STJ `[JsonPropertyName]` attributes affect HTTP responses only — Cosmos queries must use camelCase field names.**

| Container | Partition Key | Purpose |
|-----------|--------------|---------|
| `orders` | `/userId` | All customer orders — status, items, delivery address, assigned driver |
| `drivers` | `/id` | Driver profiles — PIN hash, status, location, vehicle |
| `receipts` | `/orderId` | Receipt documents — blob URL, OCR items, weight class, admin review state |
| `stores` | `/id` | Wholesale store catalogue |
| `payments` | `/orderId` | Ozow payment records |
| `config` | `/id` | Single `pricing` document — delivery fee parameters |

### Authentication Model

**Customers** — Firebase email/password. Frontend attaches Firebase ID token as `Authorization: Bearer <token>` on every API request. Middleware validates with Firebase Admin SDK.

**Admins** — HMAC-SHA256 signed token issued by `POST /api/admin/auth`. The Command Centre login page exchanges a shared secret for a signed token stored in sessionStorage, included as `Authorization: commandadmin <token>` on all admin requests.

**Drivers** — Two-step flow:
1. `POST /api/drivers/verify-credentials` — verifies Driver ID + PIN (SHA-256 hash of `{driverId}:{pin}`). Anonymous endpoint.
2. `POST /api/drivers/login-link` — issues a Firebase custom token with `role: driver` claims. Anonymous endpoint.
3. Frontend calls `signInWithCustomToken(auth, customToken)` — Firebase session established. All subsequent driver requests use the resulting Firebase ID token as Bearer token.

### Key Design Notes

- **Cosmos serialiser**: `Microsoft.Azure.Cosmos` 3.59.0 with `CosmosPropertyNamingPolicy.CamelCase`. The built-in serialiser uses STJ (not Newtonsoft) — `QueryAsync<T>` works correctly with C# model types. `QueryAsync<JObject>` and `QueryAsync<JsonElement>` both silently fail (serialiser cannot produce Newtonsoft/STJ foreign types).
- **Cross-partition queries**: All `QueryAsync` calls without a partition key hint fan out across all partitions. Point-reads (`GetAsync`) require both `id` and partition key value.
- **Duplicate seed documents**: Seed orders may appear in multiple partitions. Assign and job-detail endpoints prefer the document matching the expected driver ID or user ID rather than relying on `FirstOrDefault()`.

---

## Frontend Architecture

### Route Structure

**Public:**
- `/` — Landing page
- `/login`, `/register` — Customer auth
- `/commandlogin` — Command Centre admin login
- `/driverlogin` — Driver PIN login
- `/calculator` — Delivery cost calculator (sales tool)

**Customer (protected):**
- `/order/select-store` → `/order/delivery` → `/order/payment` — Order journey
- `/useraccount`, `/userprofile`, `/userorders` — Account management
- `/messages` — Notification inbox

**Driver (protected, Firebase custom token):**
- `/driver/dashboard` — Job list with status filters, online/offline toggle
- `/driver/deliveries/:orderId` — Job detail, status progression, Waze navigation
- `/driver/revenue` — Earnings breakdown (today / week / month / all-time)

**Command Centre (protected, HMAC token):**
- `/commandcentre/dashboard` — Weekly KPIs, active deliveries, pending receipts
- `/commandcentre/orders` — All orders with status filter
- `/commandcentre/payments` — Payment records
- `/commandcentre/receipts` — Receipt review workflow (image viewer, manual item entry, driver assignment)
- `/commandcentre/deliveries` — Assign drivers to orders
- `/commandcentre/drivers` — Create / delete driver accounts, view revenue
- `/commandcentre/metrics` — 30-day delivery and cancellation rates
- `/commandcentre/pricing` — Edit and save delivery fee configuration
- `/commandcentre/stores` — Manage store catalogue, upload logos

### API Client

`src/utils/api.ts` — Axios instance with:
- **Request interceptor**: attaches Firebase ID token or HMAC admin token from sessionStorage.
- **Response interceptor**: on 401, refreshes the Firebase token and retries the request once.
- **Base URL**: `import.meta.env.VITE_API_URL`

---

## Ozow Pay-by-Bank Integration

1. Customer completes delivery quote → frontend calls `POST /api/payment/process/:orderId`.
2. Backend builds a SHA-512 signed form POST to the Ozow gateway.
3. Customer authenticates with their bank on the Ozow hosted page.
4. Ozow sends a server-to-server `POST /api/payment/notify` callback — backend verifies hash, confirms via `GetTransactionByReference`, and updates the order status.
5. Customer is redirected to `/payment-success` or `/payment-cancelled`.

---

## Driver System

### Creating a Driver (Admin)

`POST /api/admin/drivers` — body: `{ fullName, pin, driverId?, email?, phoneNumber?, vehicleType?, vehicleModel? }`

The endpoint hashes the PIN as `SHA256("{driverId}:{pin}")`, stores it as `pinHash`, and returns the plain-text credentials once for the admin to share with the driver. The driver ID and PIN are never stored in plain text after this response.

### Driver Login Flow

```
Driver enters ID + PIN
       │
       ▼
POST /api/drivers/verify-credentials
(validates pinHash — anonymous endpoint)
       │
       ▼
POST /api/drivers/login-link
(issues Firebase custom token — anonymous endpoint)
       │
       ▼
signInWithCustomToken(auth, customToken)
(Firebase session — uid = driver.Id)
       │
       ▼
All driver endpoints authenticated via Firebase Bearer token
```

### Job Status Progression

```
assigned → accepted → arrivedAtPickup → loaded → delivered
```

Each `PATCH /api/drivers/me/jobs/{orderId}/status` advances the job one step. On `delivered`:
- `driverPayout` = `deliveryFee × 0.8`
- `platformFee` = `deliveryFee × 0.2`
- Driver status set back to `available`

---

## Command Centre

The Command Centre is the operational admin UI at `/commandcentre`. It authenticates with a HMAC-signed token issued by `POST /api/admin/auth`.

### Receipt Review Workflow

1. Customer uploads a receipt image → OCR service parses items → `POST /api/receipts/upload` creates a receipt document in Cosmos with `status: pending`.
2. Admin opens the receipt in the Receipts page — views the image, manually types items into a table, sets weight class.
3. Admin clicks **Confirm & Assign** → `PATCH /api/admin/receipts/{id}` (updates status + items) then `PATCH /api/admin/deliveries/{orderId}/assign` (sets driverId on the order).
4. Driver sees the assigned job on their dashboard.

---

## API Reference

### Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/admin/auth` | Shared secret | Issue HMAC admin token |
| POST | `/api/drivers/verify-credentials` | None | Verify driver ID + PIN |
| POST | `/api/drivers/login-link` | None | Issue Firebase custom token for driver |

### Stores

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/stores` | None | List all active stores |
| GET | `/api/stores/{id}` | None | Get store by ID |
| POST | `/api/stores` | Admin | Create store |
| PUT | `/api/stores/{id}` | Admin | Update store |
| PATCH | `/api/stores/{id}/deactivate` | Admin | Deactivate store |
| PATCH | `/api/stores/{id}/activate` | Admin | Activate store |
| DELETE | `/api/stores/{id}` | Admin | Delete store |
| POST | `/api/admin/upload-logo` | Admin | Upload store logo to Azure Blob |

### Orders

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/orders` | Token | Create order |
| GET | `/api/orders/my` | Token | Get current user's orders |
| GET | `/api/orders/{id}` | Token | Get order by ID |
| PATCH | `/api/orders/{id}/status` | Token | Update order status |
| GET | `/api/admin/orders` | Admin | All orders with optional status filter |
| GET | `/api/admin/deliveries` | Admin | Active deliveries |
| PATCH | `/api/admin/deliveries/{orderId}/assign` | Admin | Assign driver to order |

### Receipts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/receipts/upload` | Token | Upload receipt image (OCR parse) |
| GET | `/api/receipts/order/{orderId}` | Token | Get receipt for order |
| GET | `/api/admin/receipts` | Admin | All receipts with optional status filter |
| PATCH | `/api/admin/receipts/{id}` | Admin | Review receipt (confirm/reject, set items + weight class) |

### Drivers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/drivers` | Admin | List all drivers |
| POST | `/api/admin/drivers` | Admin | Create driver account |
| DELETE | `/api/admin/drivers/{driverId}` | Admin | Delete driver account |
| GET | `/api/drivers/me` | Driver token | Get own profile |
| PATCH | `/api/drivers/me/status` | Driver token | Toggle available / offline |
| POST | `/api/drivers/me/location` | Driver token | Update location ping |
| GET | `/api/drivers/me/jobs` | Driver token | Get assigned jobs |
| GET | `/api/drivers/me/jobs/{orderId}` | Driver token | Get single job detail |
| PATCH | `/api/drivers/me/jobs/{orderId}/status` | Driver token | Advance job status |
| GET | `/api/drivers/me/revenue` | Driver token | Earnings summary (today/week/month/all-time) |

### Payments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/payment/process/{orderId}` | Token | Initiate Ozow payment |
| POST | `/api/payment/notify` | None | Ozow webhook callback |
| GET | `/api/admin/payments` | Admin | All payment records |

### Pricing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/pricing` | Admin | Get current pricing config |
| PUT | `/api/admin/pricing` | Admin | Save pricing config |

### Admin Dashboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/admin/dashboard` | Admin | Weekly KPIs (orders, revenue, active deliveries) |
| GET | `/api/admin/metrics` | Admin | 30-day delivery and cancellation rates |
| GET | `/api/admin/drivers/revenue` | Admin | Per-driver completed trips and estimated payout |

### Quotes and Maps

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/quote` | None | Calculate delivery fee for a route |
| GET | `/api/maps/distance` | Token | Azure Maps distance between two points |

---

## Environment Variables

### Frontend (`frontend/.env`)

```
VITE_API_URL=https://localsza-api-a7eegch0fxfjh3at.southafricanorth-01.azurewebsites.net
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=localsza
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

### Backend (`api/appsettings.json` / Azure App Settings)

```
Cosmos__EndpointUri
Cosmos__PrimaryKey
Cosmos__DatabaseName
Firebase__ProjectId
Firebase__ServiceAccountPath        # = "firebase-service-account.json"
Ozow__SiteCode
Ozow__PrivateKey
Ozow__ApiKey
Ozow__IsTest
Ozow__PaymentUrl
Ozow__ApiUrl
AzureMaps__SubscriptionKey
AzureBlob__ConnectionString
AzureBlob__ContainerName
OcrService__BaseUrl
OcrService__SharedSecret
Email__SmtpHost
Email__Port
Email__Username
Email__Password
Email__From
AppBaseUrl
```

---

## Getting Started

### Prerequisites

- .NET 10 SDK
- Node.js 22
- Azure Cosmos DB account (or Cosmos emulator)
- Azure Blob Storage account
- Firebase project (Authentication + service account JSON)
- Ozow merchant account (test or production)

### Backend

```bash
cd api
# Add appsettings.Development.json with local credentials (gitignored)
dotnet run
# API runs on https://localhost:7xxx
```

### Frontend

```bash
cd frontend
npm install
# Configure frontend/.env with VITE_API_URL and Firebase client credentials
npm run dev
# App runs on http://localhost:5173
```

---

## Deployment

### Backend — Azure App Service

Run from `api/` directory. Requires Azure CLI and an existing App Service (`localsza-api`, resource group `localsza-rg`).

```powershell
$az = "C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd"

# 1. Clean
if (Test-Path .\publish)    { Remove-Item .\publish    -Recurse -Force }
if (Test-Path .\deploy.zip) { Remove-Item .\deploy.zip -Force          }

# 2. Publish self-contained linux-x64 bundle
dotnet publish -c Release -r linux-x64 --self-contained true -o ./publish --nologo

# 3. Pack with tar (NOT Compress-Archive — Windows backslashes break Linux rsync)
Push-Location .\publish
tar -a -cf ..\deploy.zip *
Pop-Location

# 4. Deploy async (Kudu finishes in background, ~60s)
& $az webapp deploy `
    --resource-group localsza-rg `
    --name localsza-api `
    --src-path .\deploy.zip `
    --type zip `
    --async true
```

App Service settings required (already configured):
- `SCM_DO_BUILD_DURING_DEPLOYMENT = false`
- `ASPNETCORE_ENVIRONMENT = Production`
- Startup file: `dotnet LocalsZaApi.dll`

Cosmos DB firewall: `ip-range-filter = "0.0.0.0"` (accept Azure datacenter IPs).

### Frontend — Netlify

Netlify is connected to the GitHub repo. Merging `issue-186-Levi-VersionOne` into `main` triggers an automatic build using `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to   = "/index.html"
  status = 200
```

To deploy manually:

```bash
cd frontend
npm run build
npx netlify-cli deploy --prod --dir=dist
```

### Version Tags

| Tag | Description |
|-----|-------------|
| `emani-v1` | Emani Version One — last stable state before Levi (on `main`) |
| `levi-v1` | Levi Version One — complete driver system, Command Centre, assign fix |
