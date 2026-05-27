/**
 * LocalsZA — Seed Script v2
 * ─────────────────────────────────────────────────────────────────────────────
 * Populates Cosmos DB with realistic post-payment orders that match the actual
 * user journey:  SelectStore → UploadReceipt → Delivery quote → Pay →
 * order lands in Command Centre (Deliveries tab) as "pending".
 *
 * Modes
 * ─────
 *   node seed-orders.js                  Seed 25 orders + receipt documents
 *   node seed-orders.js --drivers        Seed 4 driver accounts
 *   node seed-orders.js --upload-images  Upload local receipt photos to Azure
 *                                        Blob then print the blob URLs to paste
 *                                        into RECEIPT_IMAGES below.
 *
 * Prerequisites
 * ─────────────
 *   npm install @azure/cosmos            (always required)
 *   npm install @azure/storage-blob      (only for --upload-images)
 *
 * Receipt images workflow
 * ───────────────────────
 *   1. Create a ./seed-receipts/ folder next to this file.
 *   2. Drop in:
 *        receipt-1.(jpg|png)  →  Mokoena's C&C beverages (table photo)
 *        receipt-2.(jpg|png)  →  Mokoena's C&C dry goods (printer photo)
 *        receipt-3.(jpg|png)  →  Gumede's Wholesale Outlet
 *   3. Run:  node seed-orders.js --upload-images
 *   4. Copy the 3 blob URLs printed to the console into RECEIPT_IMAGES below.
 *   5. Run:  node seed-orders.js
 *
 * Safe to re-run — fixed IDs (seed-order-001 … 025) → upserts, no duplicates.
 * ─────────────────────────────────────────────────────────────────────────────
 */

'use strict';
const { CosmosClient } = require('@azure/cosmos');
const path             = require('path');
const fs               = require('fs');

// ── COSMOS CONFIG ─────────────────────────────────────────────────────────────
const COSMOS_ENDPOINT = process.env.COSMOS_ENDPOINT || 'https://localsza-cosmos.documents.azure.com:443/';
const COSMOS_KEY      = process.env.COSMOS_KEY;
const DB_NAME         = 'localsza';

// ── AZURE BLOB CONFIG (only used for --upload-images) ─────────────────────────
const BLOB_CONN_STR  = process.env.AZURE_BLOB_CONNECTION_STRING;
const BLOB_CONTAINER = 'receipts';

// ─────────────────────────────────────────────────────────────────────────────
// RECEIPT IMAGES
// ─────────────────────────────────────────────────────────────────────────────
// Paste the Azure Blob URLs here after running:  node seed-orders.js --upload-images
//
// If blobUrl is left as an empty string the seed will fall back to a
// descriptive placehold.co URL so the rest of the data still seeds correctly.
// ─────────────────────────────────────────────────────────────────────────────
const RECEIPT_IMAGES = [
  // ── Image 0 ── Mokoena's C&C — beverages (table photo) ───────────────────
  {
    blobUrl:           'https://localszastorage.blob.core.windows.net/receipts/seed-receipt-1-1779876850192.jpg',
    storeName:         "Mokoena's Cash & Carry",
    date:              '12/03/2026',
    subtotal:          1174.90,
    total:             1351.14,
    items: [
      { description: 'Coca-Cola Original 2L Btl',        qty: 10, unitPrice: 22.99,  lineTotal: 229.90,  estimatedKg:  2.2 },
      { description: 'Fanta Orange 2L Btl',              qty:  5, unitPrice: 21.50,  lineTotal: 107.50,  estimatedKg:  2.1 },
      { description: 'Bonaqua Still Water 500ml',        qty: 12, unitPrice:  7.50,  lineTotal:  90.00,  estimatedKg: 0.55 },
      { description: 'Score Energy Drink 500ml (6×6pk)', qty:  3, unitPrice: 65.00,  lineTotal: 195.00,  estimatedKg:  3.6 },
      { description: 'Appletiser 330ml Can (×6pk)',      qty:  4, unitPrice: 72.50,  lineTotal: 290.00,  estimatedKg:  2.3 },
      { description: 'Liqui-Fruit Berry Blaze 2L Btl',   qty:  1, unitPrice: 28.00,  lineTotal:  28.00,  estimatedKg:  2.1 },
      { description: 'Iwisa Maize Meal 10 kg Bag',       qty:  1, unitPrice: 145.00, lineTotal: 145.00,  estimatedKg: 10.0 },
      { description: 'Huletts Sugar 5 kg Bag',           qty:  1, unitPrice:  89.50, lineTotal:  89.50,  estimatedKg:  5.0 },
    ],
    estimatedWeightKg: 74.4,
    weightClass:       'heavy',
    qualityScore:      0.88,
    warnings:          [],
  },

  // ── Image 1 ── Mokoena's C&C — dry goods (printer photo) ─────────────────
  {
    blobUrl:           'https://localszastorage.blob.core.windows.net/receipts/seed-receipt-2-1779876851819.jpg',
    storeName:         "Mokoena's Cash & Carry",
    date:              '12/02/2026',
    subtotal:          1995.00,
    total:             2294.25,
    items: [
      { description: 'Iwisa Maize Meal 10 kg',     qty: 3, unitPrice: 145.00, lineTotal: 435.00,  estimatedKg: 10.0 },
      { description: 'Golden Penny Flour 25 kg',   qty: 2, unitPrice: 310.00, lineTotal: 620.00,  estimatedKg: 25.0 },
      { description: 'Juko Tea Bags 100pk',        qty: 1, unitPrice: 140.00, lineTotal: 140.00,  estimatedKg:  0.8 },
      { description: 'Knorr Soup Packets',         qty: 4, unitPrice:  18.25, lineTotal:  73.00,  estimatedKg:  0.2 },
      { description: 'Bulk Cleaning Paper 60pk',   qty: 1, unitPrice:  97.00, lineTotal:  97.00,  estimatedKg:  3.0 },
      { description: 'Cleaning Detergent 5 L',     qty: 2, unitPrice: 115.00, lineTotal: 230.00,  estimatedKg:  5.5 },
      { description: 'Bulk Cooking Oil 20 L',      qty: 1, unitPrice: 400.00, lineTotal: 400.00,  estimatedKg: 18.5 },
    ],
    estimatedWeightKg: 93.0,
    weightClass:       'bulk',
    qualityScore:      0.82,
    warnings:          [],
  },

  // ── Image 2 ── Gumede's Wholesale Outlet — bulk restocking ───────────────
  {
    blobUrl:           'https://localszastorage.blob.core.windows.net/receipts/seed-receipt-3-1779876851916.jpg',
    storeName:         "Gumede's Wholesale Outlet",
    date:              '19/05/2026',
    subtotal:          42660.00,
    total:             49059.00,
    items: [
      { description: 'Golden Glory Rice 10 kg',           qty: 100, unitPrice: 125.00, lineTotal: 12500.00, estimatedKg: 10.0 },
      { description: 'Simba Chips Assorted 48pk',         qty:  50, unitPrice: 204.00, lineTotal: 10200.00, estimatedKg:  1.5 },
      { description: 'Coca-Cola Original 2L (6pk)',       qty:  30, unitPrice: 110.00, lineTotal:  3300.00, estimatedKg: 13.0 },
      { description: 'Bulk Sugar (Huletts) 25 kg',        qty:  20, unitPrice: 350.00, lineTotal:  7000.00, estimatedKg: 25.0 },
      { description: 'Bulk Cleaning Supplies (Ajax) 5 L', qty:  10, unitPrice: 180.00, lineTotal:  1800.00, estimatedKg:  5.5 },
      { description: 'Knorr Popp Packets',                qty:  10, unitPrice: 116.00, lineTotal:  1160.00, estimatedKg:  0.4 },
      { description: 'Bulk Cooking Oil 20 L',             qty:  10, unitPrice: 340.00, lineTotal:  3400.00, estimatedKg: 18.5 },
      { description: 'Bulk Crate Soft Drinks (24-pack)',  qty:  10, unitPrice: 330.00, lineTotal:  3300.00, estimatedKg: 10.0 },
    ],
    estimatedWeightKg: 950.0,
    weightClass:       'bulk',
    qualityScore:      0.91,
    warnings:          ['Very large order — may require truck transport'],
  },
];

// ── DRIVERS ───────────────────────────────────────────────────────────────────
// Seeded to the `drivers` Cosmos container via:  node seed-orders.js --drivers
// These populate the driver dropdown in Receipts.tsx.
const DRIVERS = [
  {
    id:            'driver-mthembu-001',
    driver_id:     'driver-mthembu-001',
    firebase_uid:  null,
    full_name:     'Tebogo Mthembu',
    email:         'tebogo.mthembu@localsza.co.za',
    phone_number:  '+27820011001',
    vehicle_type:  'bakkie',
    vehicle_model: 'Toyota Hilux 2.4 GD-6',
    status:        'available',
    created_at:    '2026-01-15T08:00:00.000Z',
  },
  {
    id:            'driver-dlamini-002',
    driver_id:     'driver-dlamini-002',
    firebase_uid:  null,
    full_name:     'Lungisa Dlamini',
    email:         'lungisa.dlamini@localsza.co.za',
    phone_number:  '+27820022002',
    vehicle_type:  'van',
    vehicle_model: 'Volkswagen Caddy 2.0 TDI',
    status:        'available',
    created_at:    '2026-01-20T08:00:00.000Z',
  },
  {
    id:            'driver-nkosi-003',
    driver_id:     'driver-nkosi-003',
    firebase_uid:  null,
    full_name:     'Sizwe Nkosi',
    email:         'sizwe.nkosi@localsza.co.za',
    phone_number:  '+27820033003',
    vehicle_type:  'bakkie',
    vehicle_model: 'Ford Ranger 2.2 XLS',
    status:        'offline',
    created_at:    '2026-02-01T08:00:00.000Z',
  },
  {
    id:            'driver-sithole-004',
    driver_id:     'driver-sithole-004',
    firebase_uid:  null,
    full_name:     'Nhlanhla Sithole',
    email:         'nhlanhla.sithole@localsza.co.za',
    phone_number:  '+27820044004',
    vehicle_type:  'truck',
    vehicle_model: 'Isuzu NPR 400',
    status:        'available',
    created_at:    '2026-02-10T08:00:00.000Z',
  },
];

// ── CUSTOMER PROFILES ─────────────────────────────────────────────────────────
// 25 profiles — 5 per area — representing spaza shop owners after paying.
// Each profile pins to an area, store, and street address.
const CUSTOMERS = [
  // ── Katlehong (indices 0–4) ───────────────────────────────────────────────
  { name: 'Sipho Dlamini',      phone: '+27821345678', area: 'katlehong', storeId: 'katlehong-cash-carry',  addr: '15 Molapo Street,    Katlehong, Gauteng, 1431', lat: -26.3544, lng: 28.1489 },
  { name: 'Nomvula Khumalo',    phone: '+27834567890', area: 'katlehong', storeId: 'shoprite',               addr: '42 Ntuli Road,        Katlehong, Gauteng, 1431', lat: -26.3582, lng: 28.1523 },
  { name: 'Thabo Mokoena',      phone: '+27761234567', area: 'katlehong', storeId: 'sa-cash-and-carry',      addr: '7 Nkosi Street,       Katlehong, Gauteng, 1432', lat: -26.3501, lng: 28.1467 },
  { name: 'Zanele Sithole',     phone: '+27836789012', area: 'katlehong', storeId: 'katlehong-cash-carry',  addr: '88 Masondo Avenue,    Katlehong, Gauteng, 1431', lat: -26.3567, lng: 28.1445 },
  { name: 'Bongani Shabalala',  phone: '+27823456789', area: 'katlehong', storeId: 'shoprite',               addr: '23 Khumalo Drive,     Katlehong, Gauteng, 1431', lat: -26.3612, lng: 28.1512 },

  // ── Vosloorus (indices 5–9) ───────────────────────────────────────────────
  { name: 'Precious Radebe',    phone: '+27741234567', area: 'vosloorus', storeId: 'shoprite',               addr: '23 Thaba Nchu Street, Vosloorus, Gauteng, 1475', lat: -26.3633, lng: 28.1789 },
  { name: 'Lebogang Ndlovu',    phone: '+27856789012', area: 'vosloorus', storeId: 'vosloorus-trade-hub',    addr: '88 Phiri Street,      Vosloorus, Gauteng, 1475', lat: -26.3678, lng: 28.1756 },
  { name: 'Ayanda Mthembu',     phone: '+27821234560', area: 'vosloorus', storeId: 'shoprite',               addr: '14 Dlamini Drive,     Vosloorus, Gauteng, 1476', lat: -26.3601, lng: 28.1812 },
  { name: 'Mthokozisi Phiri',   phone: '+27834560123', area: 'vosloorus', storeId: 'vosloorus-trade-hub',    addr: '45 Mthembu Road,      Vosloorus, Gauteng, 1475', lat: -26.3645, lng: 28.1834 },
  { name: 'Lungelo Maphumulo',  phone: '+27769012345', area: 'vosloorus', storeId: 'shoprite',               addr: '9 Radebe Avenue,      Vosloorus, Gauteng, 1475', lat: -26.3689, lng: 28.1768 },

  // ── Alberton (indices 10–14) ──────────────────────────────────────────────
  { name: 'Nompilo Molefe',     phone: '+27821345679', area: 'alberton',  storeId: 'sa-cash-and-carry',      addr: '5 New Redruth Road,   Alberton,  Gauteng, 1449', lat: -26.2685, lng: 28.1205 },
  { name: 'Siyabonga Cele',     phone: '+27834567891', area: 'alberton',  storeId: 'sa-cash-and-carry',      addr: '19 Voortrekker Road,  Alberton,  Gauteng, 1449', lat: -26.2712, lng: 28.1178 },
  { name: 'Thandeka Buthelezi', phone: '+27762345678', area: 'alberton',  storeId: 'metro-wholesale-soweto', addr: '33 Bracken Road,      Alberton,  Gauteng, 1448', lat: -26.2654, lng: 28.1234 },
  { name: 'Mandla Vilakazi',    phone: '+27836789013', area: 'alberton',  storeId: 'sa-cash-and-carry',      addr: '7 Hennie Alberts St,  Alberton,  Gauteng, 1449', lat: -26.2698, lng: 28.1189 },
  { name: 'Nokwanda Mkhize',    phone: '+27823456780', area: 'alberton',  storeId: 'metro-wholesale-soweto', addr: '44 Engelbrecht Street,Alberton,  Gauteng, 1449', lat: -26.2671, lng: 28.1212 },

  // ── Germiston (indices 15–19) ─────────────────────────────────────────────
  { name: 'Sibongile Xulu',     phone: '+27741234568', area: 'germiston', storeId: 'sa-cash-and-carry',      addr: '12 Victoria Street,  Germiston, Gauteng, 1401', lat: -26.2281, lng: 28.1753 },
  { name: 'Lwazi Ntanzi',       phone: '+27856789013', area: 'germiston', storeId: 'germiston-trade-centre', addr: '55 Webber Street,     Germiston, Gauteng, 1401', lat: -26.2254, lng: 28.1789 },
  { name: 'Phindile Mbatha',    phone: '+27821234561', area: 'germiston', storeId: 'germiston-trade-centre', addr: '8 De Villiers Street, Germiston, Gauteng, 1401', lat: -26.2312, lng: 28.1722 },
  { name: 'Sifiso Mnguni',      phone: '+27834560124', area: 'germiston', storeId: 'sa-cash-and-carry',      addr: '34 Cross Street,      Germiston, Gauteng, 1401', lat: -26.2267, lng: 28.1812 },
  { name: 'Nobuhle Hadebe',     phone: '+27769012346', area: 'germiston', storeId: 'germiston-trade-centre', addr: '23 Odendaal Road,     Germiston, Gauteng, 1401', lat: -26.2298, lng: 28.1745 },

  // ── Boksburg (indices 20–24) ──────────────────────────────────────────────
  { name: 'Dumisani Mhlongo',   phone: '+27821345670', area: 'boksburg',  storeId: 'germiston-trade-centre', addr: '21 Commissioner St,  Boksburg,  Gauteng, 1459', lat: -26.2078, lng: 28.2612 },
  { name: 'Thulisile Gumbi',    phone: '+27834567892', area: 'boksburg',  storeId: 'alex-wholesale',         addr: '4 Trichardt Road,     Boksburg,  Gauteng, 1459', lat: -26.2112, lng: 28.2578 },
  { name: 'Sandile Nyandeni',   phone: '+27763456789', area: 'boksburg',  storeId: 'germiston-trade-centre', addr: '67 Rietfontein Road,  Boksburg,  Gauteng, 1460', lat: -26.2045, lng: 28.2645 },
  { name: 'Ntombi Majola',      phone: '+27836789014', area: 'boksburg',  storeId: 'tembisa-depot',          addr: '14 Adcock Road,       Boksburg,  Gauteng, 1459', lat: -26.2089, lng: 28.2634 },
  { name: 'Khosi Madlala',      phone: '+27823456781', area: 'boksburg',  storeId: 'germiston-trade-centre', addr: '38 Voortrekker Road,  Boksburg,  Gauteng, 1459', lat: -26.2123, lng: 28.2589 },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────

/** ISO timestamp, N days ago (+ optional hour offset for variety) */
function daysAgo(days, hoursOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hoursOffset);
  d.setMinutes(Math.floor(Math.random() * 60));
  return d.toISOString();
}

/**
 * Build a fallback placehold.co URL when blobUrl is empty.
 * Gives admins an obvious placeholder they can replace with the real image.
 */
function fallbackUrl(imgIndex) {
  const labels = [
    "Mokoena%27s+C%26C+Receipt+%231",
    "Mokoena%27s+C%26C+Receipt+%232",
    "Gumede%27s+Wholesale+Receipt",
  ];
  return `https://placehold.co/800x1100/1a1a1a/ffb803?text=${labels[imgIndex]}`;
}

/** Parse a simple "Street, City, Province, Postal" string into address fields. */
function parseAddr(raw, lat, lng) {
  const parts = raw.split(',').map(s => s.trim());
  return {
    street:     parts[0] || '',
    city:       parts[1] || '',
    province:   parts[2] || 'Gauteng',
    postalCode: parts[3] || '',
    lat,
    lng,
  };
}

// ── ORDER + RECEIPT BUILDERS ──────────────────────────────────────────────────

function buildSeedOrder(index) {
  const customer  = CUSTOMERS[index];
  const imgIdx    = index % 3;          // rotate 0 → 1 → 2 → 0 …
  const receipt   = RECEIPT_IMAGES[imgIdx];
  const id        = `seed-order-${String(index + 1).padStart(3, '0')}`;
  const guestId   = `seed-guest-${String(index + 1).padStart(3, '0')}`;

  // Delivery fee based on distance (simple linear model)
  const distanceKm  = parseFloat((6 + (index * 0.7 + 1.3) % 14).toFixed(1));
  const ratePerKm   = receipt.weightClass === 'bulk' ? 8 : receipt.weightClass === 'heavy' ? 7 : 5;
  const deliveryFee = parseFloat((35 + distanceKm * ratePerKm).toFixed(2));

  // Spread created_at across the past 6 days (most recent = today, oldest = 6 days ago)
  const daysBack    = Math.floor(index / 4);    // 0,0,0,0 → 1,1,1,1 → … → 6
  const hoursBack   = (index * 3) % 23;
  const createdAt   = daysAgo(daysBack, hoursBack);

  const order = {
    id,
    userId:          guestId,
    guestId,
    storeId:         customer.storeId,
    orderNumber:     `ORD-2026-${String(index + 1).padStart(3, '0')}`,
    // Customer info captured during UploadReceipt step
    customerName:    customer.name,
    contactNumber:   customer.phone,
    deliveryAddress: parseAddr(customer.addr, customer.lat, customer.lng),
    // Financials — delivery cost only (goods cost is in the receipt document)
    deliveryFee,
    total:           deliveryFee,
    distanceKm,
    weightClass:     receipt.weightClass,
    // Status: 'pending' = just confirmed by Ozow, waiting for Command Centre
    status:          'pending',
    driverId:        null,
    receiptId:       id,
    rush:            index % 9 === 0,    // ~11 % rush orders
    pooled:          index % 7 === 0,    // ~14 % pool orders
    createdAt,
    updatedAt:       createdAt,
  };

  const receiptDoc = {
    id,                               // partition key = orderId
    orderId:          id,
    blobUrl:          receipt.blobUrl || fallbackUrl(imgIdx),
    storeName:        receipt.storeName,
    date:             receipt.date,
    subtotal:         receipt.subtotal,
    total:            receipt.total,
    items:            receipt.items,
    estimatedWeightKg:receipt.estimatedWeightKg,
    weightClass:      receipt.weightClass,
    qualityScore:     receipt.qualityScore,
    warnings:         receipt.warnings,
    parsedAt:         createdAt,
    status:           'pending',      // awaiting admin review in Receipts tab
    adminNote:        null,
    reviewedAt:       null,
  };

  return { order, receiptDoc };
}

// ── IMAGE UPLOAD HELPER ───────────────────────────────────────────────────────

async function uploadImages() {
  let BlobServiceClient;
  try {
    ({ BlobServiceClient } = require('@azure/storage-blob'));
  } catch {
    console.error('\n✗  @azure/storage-blob is not installed.');
    console.error('   Run:  npm install @azure/storage-blob  then try again.\n');
    process.exit(1);
  }

  const dir = path.join(__dirname, 'seed-receipts');
  if (!fs.existsSync(dir)) {
    console.error(`\n✗  Folder not found: ${dir}`);
    console.error('   Create it and drop in receipt-1, receipt-2, receipt-3 image files.\n');
    process.exit(1);
  }

  const slots = ['receipt-1', 'receipt-2', 'receipt-3'];
  const exts  = ['.jpg', '.jpeg', '.png', '.webp'];

  const blobService = BlobServiceClient.fromConnectionString(BLOB_CONN_STR);
  const container   = blobService.getContainerClient(BLOB_CONTAINER);

  console.log('\nUploading receipt images to Azure Blob Storage…\n');

  for (const slot of slots) {
    const found = exts.map(e => path.join(dir, slot + e)).find(fs.existsSync);
    if (!found) {
      console.warn(`  ⚠  ${slot}.(jpg|png) not found in ${dir} — skipping`);
      continue;
    }

    const ext      = path.extname(found);
    const blobName = `seed-${slot}-${Date.now()}${ext}`;
    const client   = container.getBlockBlobClient(blobName);

    const data         = fs.readFileSync(found);
    const contentType  = ext === '.png' ? 'image/png' : 'image/jpeg';
    await client.uploadData(data, { blobHTTPHeaders: { blobContentType: contentType } });

    console.log(`  ✓  ${slot}  →  ${client.url}`);
    console.log(`     Paste this URL into RECEIPT_IMAGES[${slots.indexOf(slot)}].blobUrl\n`);
  }

  console.log('Done. Update RECEIPT_IMAGES in this file then run:  node seed-orders.js\n');
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  const args          = process.argv.slice(2);
  const doDrivers     = args.includes('--drivers');
  const doUpload      = args.includes('--upload-images');

  // ── Mode: --upload-images ──────────────────────────────────────────────────
  if (doUpload) {
    await uploadImages();
    return;
  }

  // ── Mode: --drivers ────────────────────────────────────────────────────────
  if (doDrivers) {
    console.log('\nLocalsZA — Seed Drivers');
    console.log(`Target: ${COSMOS_ENDPOINT} → ${DB_NAME}/drivers`);
    console.log('─'.repeat(55));

    const client            = new CosmosClient({ endpoint: COSMOS_ENDPOINT, key: COSMOS_KEY });
    const driversContainer  = client.database(DB_NAME).container('drivers');

    let ok = 0, fail = 0;
    for (const d of DRIVERS) {
      try {
        await driversContainer.items.upsert(d, { partitionKey: d.driver_id });
        console.log(`  ✓  ${d.driver_id.padEnd(25)} ${d.full_name.padEnd(22)} ${d.vehicle_type}`);
        ok++;
      } catch (err) {
        console.error(`  ✗  ${d.driver_id}  ${err.message}`);
        fail++;
      }
    }
    console.log('─'.repeat(55));
    console.log(`\n✓ ${ok} drivers seeded  |  ✗ ${fail} failed\n`);
    return;
  }

  // ── Mode: default — seed orders + receipts ─────────────────────────────────

  // Warn if any receipt images are still using fallback URLs
  const missingImages = RECEIPT_IMAGES.filter(r => !r.blobUrl);
  if (missingImages.length) {
    console.warn('\n⚠  Real blob URLs not configured for:');
    missingImages.forEach(r => console.warn(`     – ${r.storeName} (${r.weightClass})`));
    console.warn('   Seed will use placehold.co fallbacks.');
    console.warn('   Run  node seed-orders.js --upload-images  to upload your real images.\n');
  }

  console.log('\nLocalsZA — Seed Orders v2');
  console.log(`Target : ${COSMOS_ENDPOINT} → ${DB_NAME}`);
  console.log(`Orders : ${CUSTOMERS.length}  (all status = "pending")`);
  console.log(`Receipts: seeded in parallel — 1 per order`);
  console.log('─'.repeat(55));

  const client          = new CosmosClient({ endpoint: COSMOS_ENDPOINT, key: COSMOS_KEY });
  const ordersContainer = client.database(DB_NAME).container('orders');
  const recContainer    = client.database(DB_NAME).container('receipts');

  let oOk = 0, oFail = 0, rOk = 0, rFail = 0;

  for (let i = 0; i < CUSTOMERS.length; i++) {
    const { order, receiptDoc } = buildSeedOrder(i);
    const imgTag = `[img${(i % 3) + 1}]`;

    // ── Upsert order ──────────────────────────────────────────────────────────
    try {
      await ordersContainer.items.upsert(order, { partitionKey: order.userId });
      console.log(`  ✓  ${order.orderNumber}  ${order.customerName.padEnd(22)} ${order.storeId.padEnd(25)} ${imgTag}`);
      oOk++;
    } catch (err) {
      console.error(`  ✗  ${order.orderNumber}  ${err.message}`);
      oFail++;
    }

    // ── Upsert receipt doc ────────────────────────────────────────────────────
    try {
      await recContainer.items.upsert(receiptDoc, { partitionKey: receiptDoc.orderId });
      rOk++;
    } catch (err) {
      console.error(`  ✗  receipt ${receiptDoc.id}  ${err.message}`);
      rFail++;
    }
  }

  console.log('─'.repeat(55));
  console.log(`\n✓ ${oOk} orders seeded   |  ✗ ${oFail} failed`);
  console.log(`✓ ${rOk} receipts seeded  |  ✗ ${rFail} failed`);

  // ── Receipt image usage summary ───────────────────────────────────────────
  console.log('\nReceipt image assignment:');
  const imgTotals = RECEIPT_IMAGES.map((r, i) => ({
    label:  r.storeName,
    count:  CUSTOMERS.filter((_, ci) => ci % 3 === i).length,
    hasUrl: !!r.blobUrl,
  }));
  imgTotals.forEach(t => {
    const status = t.hasUrl ? '✓ real image' : '⚠ fallback placeholder';
    console.log(`  [img${imgTotals.indexOf(t) + 1}]  ${t.label.padEnd(38)} ×${t.count}  ${status}`);
  });

  console.log('\nNext steps:');
  if (missingImages.length) {
    console.log('  1. node seed-orders.js --upload-images  → get real blob URLs');
    console.log('  2. Paste URLs into RECEIPT_IMAGES, re-run: node seed-orders.js');
  } else {
    console.log('  ✓ All receipt images use real Azure Blob URLs');
  }
  console.log('  • node seed-orders.js --drivers  → seed driver accounts\n');
}

main().catch(err => {
  console.error('\n✗ Seed failed:', err.message);
  process.exit(1);
});
