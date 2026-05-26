/**
 * LocalsZA — Order Seed Script
 * -------------------------------------------------------
 * Writes 50 mock orders directly to Cosmos DB for testing
 * the admin dashboard (deliveries, metrics, driver revenue).
 *
 * Areas: Katlehong, Vosloorus, Alberton, Germiston, Boksburg
 *        (10 orders each)
 *
 * Prerequisites (run once in this folder):
 *   npm install @azure/cosmos
 *
 * Usage:
 *   node seed-orders.js
 *
 * Safe to re-run — uses fixed IDs (seed-order-001 … 050)
 * so it upserts rather than duplicates.
 * -------------------------------------------------------
 */

const { CosmosClient } = require('@azure/cosmos');
const { randomUUID }   = require('crypto'); // built-in Node ≥ 14.17

// ── CONFIG (from appsettings.Development.json) ────────────────────────────────
const COSMOS_ENDPOINT = 'https://localsza-cosmos.documents.azure.com:443/';
const COSMOS_KEY      = 'REDACTED_COSMOS_KEY=';
const DB_NAME         = 'localsza';
const CONTAINER       = 'orders';
// ─────────────────────────────────────────────────────────────────────────────

// ── Reference data ────────────────────────────────────────────────────────────

// Store IDs from seed-stores.js (must be seeded first)
const STORES = {
  katlehong:  'katlehong-cash-carry',
  germiston:  'sa-cash-and-carry',
  germiston2: 'germiston-trade-centre',
  vosloorus:  'shoprite',
  vosloorus2: 'vosloorus-trade-hub',
  alberton:   'sa-cash-and-carry',
};

const DRIVER_IDS = [
  'driver-mthembu-001',
  'driver-dlamini-002',
  'driver-nkosi-003',
  'driver-sithole-004',
];

const PLACEHOLDER_RECEIPT_IMG =
  'https://placehold.co/800x600/cccccc/666666?text=Receipt+Image';

// Wholesale products — realistic East Rand cash-and-carry stock
const PRODUCTS = [
  { description: 'Coca-Cola 2L (6-pack)',               unit_price: 89.99,  estimated_kg: 12.0 },
  { description: 'Sunflower Oil 2L',                    unit_price: 54.99,  estimated_kg: 1.9  },
  { description: 'White Maize Meal 12.5 kg',            unit_price: 159.99, estimated_kg: 12.5 },
  { description: 'Albany White Bread 700 g',            unit_price: 19.99,  estimated_kg: 0.7  },
  { description: 'Omo Washing Powder 2 kg',             unit_price: 79.99,  estimated_kg: 2.0  },
  { description: 'Toilet Paper 18-roll Pack',           unit_price: 89.99,  estimated_kg: 1.8  },
  { description: 'White Sugar 2.5 kg',                  unit_price: 49.99,  estimated_kg: 2.5  },
  { description: 'Frozen Chicken Portions 2 kg',        unit_price: 129.99, estimated_kg: 2.0  },
  { description: 'Glenryck Pilchards 400 g (6-pack)',   unit_price: 79.99,  estimated_kg: 2.4  },
  { description: 'Long Grain Rice 5 kg',                unit_price: 89.99,  estimated_kg: 5.0  },
  { description: 'Candles 10-pack',                     unit_price: 24.99,  estimated_kg: 0.5  },
  { description: 'Maggi Noodles 30-pack',               unit_price: 59.99,  estimated_kg: 1.5  },
  { description: 'Fanta Orange 2L (6-pack)',             unit_price: 84.99,  estimated_kg: 12.0 },
  { description: 'Knorrox Stock Cubes 12-pack',         unit_price: 29.99,  estimated_kg: 0.3  },
  { description: 'Full Cream Milk 1L (6-pack)',          unit_price: 119.99, estimated_kg: 6.0  },
  { description: 'Simba Chips 120 g (12-pack)',          unit_price: 99.99,  estimated_kg: 1.4  },
  { description: 'Wilson\'s All Gold Tomato Sauce 700 g', unit_price: 34.99, estimated_kg: 0.7 },
  { description: 'Handy Andy Multipurpose 750 ml (4-pack)', unit_price: 69.99, estimated_kg: 3.0 },
];

// ── Address pools (10 per area) ───────────────────────────────────────────────

const ADDRESSES = {

  katlehong: [
    { street: '15 Molapo Street',       city: 'Katlehong', province: 'Gauteng', postalCode: '1431', lat: -26.3544, lng: 28.1489 },
    { street: '42 Ntuli Road',           city: 'Katlehong', province: 'Gauteng', postalCode: '1431', lat: -26.3582, lng: 28.1523 },
    { street: '7 Nkosi Street',          city: 'Katlehong', province: 'Gauteng', postalCode: '1432', lat: -26.3501, lng: 28.1467 },
    { street: '88 Masondo Avenue',       city: 'Katlehong', province: 'Gauteng', postalCode: '1431', lat: -26.3567, lng: 28.1445 },
    { street: '23 Khumalo Drive',        city: 'Katlehong', province: 'Gauteng', postalCode: '1431', lat: -26.3612, lng: 28.1512 },
    { street: '56 Sithole Street',       city: 'Katlehong', province: 'Gauteng', postalCode: '1431', lat: -26.3489, lng: 28.1534 },
    { street: '4 Dlamini Road',          city: 'Katlehong', province: 'Gauteng', postalCode: '1432', lat: -26.3623, lng: 28.1478 },
    { street: '31 Shabalala Crescent',   city: 'Katlehong', province: 'Gauteng', postalCode: '1431', lat: -26.3543, lng: 28.1467 },
    { street: '19 Molefe Street',        city: 'Katlehong', province: 'Gauteng', postalCode: '1431', lat: -26.3578, lng: 28.1498 },
    { street: '62 Ndlovu Avenue',        city: 'Katlehong', province: 'Gauteng', postalCode: '1431', lat: -26.3534, lng: 28.1512 },
  ],

  vosloorus: [
    { street: '23 Thaba Nchu Street',    city: 'Vosloorus', province: 'Gauteng', postalCode: '1475', lat: -26.3633, lng: 28.1789 },
    { street: '88 Phiri Street',         city: 'Vosloorus', province: 'Gauteng', postalCode: '1475', lat: -26.3678, lng: 28.1756 },
    { street: '14 Dlamini Drive',        city: 'Vosloorus', province: 'Gauteng', postalCode: '1476', lat: -26.3601, lng: 28.1812 },
    { street: '45 Mthembu Road',         city: 'Vosloorus', province: 'Gauteng', postalCode: '1475', lat: -26.3645, lng: 28.1834 },
    { street: '9 Radebe Avenue',         city: 'Vosloorus', province: 'Gauteng', postalCode: '1475', lat: -26.3689, lng: 28.1768 },
    { street: '71 Maphumulo Street',     city: 'Vosloorus', province: 'Gauteng', postalCode: '1475', lat: -26.3612, lng: 28.1801 },
    { street: '37 Zondo Crescent',       city: 'Vosloorus', province: 'Gauteng', postalCode: '1476', lat: -26.3658, lng: 28.1745 },
    { street: '6 Ntanzi Road',           city: 'Vosloorus', province: 'Gauteng', postalCode: '1475', lat: -26.3624, lng: 28.1823 },
    { street: '52 Mbatha Avenue',        city: 'Vosloorus', province: 'Gauteng', postalCode: '1475', lat: -26.3667, lng: 28.1778 },
    { street: '18 Shabalala Street',     city: 'Vosloorus', province: 'Gauteng', postalCode: '1475', lat: -26.3641, lng: 28.1757 },
  ],

  alberton: [
    { street: '5 New Redruth Road',      city: 'Alberton',  province: 'Gauteng', postalCode: '1449', lat: -26.2685, lng: 28.1205 },
    { street: '19 Voortrekker Road',     city: 'Alberton',  province: 'Gauteng', postalCode: '1449', lat: -26.2712, lng: 28.1178 },
    { street: '33 Bracken Road',         city: 'Alberton',  province: 'Gauteng', postalCode: '1448', lat: -26.2654, lng: 28.1234 },
    { street: '7 Hennie Alberts Street', city: 'Alberton',  province: 'Gauteng', postalCode: '1449', lat: -26.2698, lng: 28.1189 },
    { street: '44 Engelbrecht Street',   city: 'Alberton',  province: 'Gauteng', postalCode: '1449', lat: -26.2671, lng: 28.1212 },
    { street: '28 Gericke Avenue',       city: 'Alberton',  province: 'Gauteng', postalCode: '1449', lat: -26.2723, lng: 28.1167 },
    { street: '12 Joubert Street',       city: 'Alberton',  province: 'Gauteng', postalCode: '1449', lat: -26.2645, lng: 28.1245 },
    { street: '66 Northdale Avenue',     city: 'Alberton',  province: 'Gauteng', postalCode: '1450', lat: -26.2734, lng: 28.1156 },
    { street: '3 Dekker Road',           city: 'Alberton',  province: 'Gauteng', postalCode: '1449', lat: -26.2667, lng: 28.1223 },
    { street: '51 Rietfontein Road',     city: 'Alberton',  province: 'Gauteng', postalCode: '1449', lat: -26.2709, lng: 28.1198 },
  ],

  germiston: [
    { street: '12 Victoria Street',      city: 'Germiston', province: 'Gauteng', postalCode: '1401', lat: -26.2281, lng: 28.1753 },
    { street: '55 Webber Street',        city: 'Germiston', province: 'Gauteng', postalCode: '1401', lat: -26.2254, lng: 28.1789 },
    { street: '8 De Villiers Street',    city: 'Germiston', province: 'Gauteng', postalCode: '1401', lat: -26.2312, lng: 28.1722 },
    { street: '34 Cross Street',         city: 'Germiston', province: 'Gauteng', postalCode: '1401', lat: -26.2267, lng: 28.1812 },
    { street: '23 Odendaal Road',        city: 'Germiston', province: 'Gauteng', postalCode: '1401', lat: -26.2298, lng: 28.1745 },
    { street: '17 Pretoria Road',        city: 'Germiston', province: 'Gauteng', postalCode: '1401', lat: -26.2245, lng: 28.1801 },
    { street: '48 Steyn Street',         city: 'Germiston', province: 'Gauteng', postalCode: '1401', lat: -26.2323, lng: 28.1768 },
    { street: '9 Library Road',          city: 'Germiston', province: 'Gauteng', postalCode: '1401', lat: -26.2278, lng: 28.1734 },
    { street: '72 Smit Street',          city: 'Germiston', province: 'Gauteng', postalCode: '1401', lat: -26.2256, lng: 28.1823 },
    { street: '31 Kobus Street',         city: 'Germiston', province: 'Gauteng', postalCode: '1402', lat: -26.2334, lng: 28.1712 },
  ],

  boksburg: [
    { street: '21 Commissioner Street',  city: 'Boksburg',  province: 'Gauteng', postalCode: '1459', lat: -26.2078, lng: 28.2612 },
    { street: '4 Trichardt Road',        city: 'Boksburg',  province: 'Gauteng', postalCode: '1459', lat: -26.2112, lng: 28.2578 },
    { street: '67 Rietfontein Road',     city: 'Boksburg',  province: 'Gauteng', postalCode: '1460', lat: -26.2045, lng: 28.2645 },
    { street: '14 Adcock Road',          city: 'Boksburg',  province: 'Gauteng', postalCode: '1459', lat: -26.2089, lng: 28.2634 },
    { street: '38 Voortrekker Road',     city: 'Boksburg',  province: 'Gauteng', postalCode: '1459', lat: -26.2123, lng: 28.2589 },
    { street: '9 Plantation Road',       city: 'Boksburg',  province: 'Gauteng', postalCode: '1459', lat: -26.2056, lng: 28.2667 },
    { street: '25 Market Street',        city: 'Boksburg',  province: 'Gauteng', postalCode: '1459', lat: -26.2101, lng: 28.2601 },
    { street: '53 Murray Road',          city: 'Boksburg',  province: 'Gauteng', postalCode: '1459', lat: -26.2067, lng: 28.2656 },
    { street: '7 Leeukop Street',        city: 'Boksburg',  province: 'Gauteng', postalCode: '1460', lat: -26.2134, lng: 28.2567 },
    { street: '44 West Road',            city: 'Boksburg',  province: 'Gauteng', postalCode: '1459', lat: -26.2078, lng: 28.2623 },
  ],
};

// ── Status schedule (index → status + driver assignment) ─────────────────────
// 50 slots: 0-9 Katlehong, 10-19 Vosloorus, 20-29 Alberton, 30-39 Germiston, 40-49 Boksburg
const STATUS_PLAN = [
  // Katlehong (0–9)
  { status: 'delivered',       driver: 0 },
  { status: 'delivered',       driver: 1 },
  { status: 'delivered',       driver: 2 },
  { status: 'cancelled',       driver: null },
  { status: 'pending',         driver: null },
  { status: 'confirmed',       driver: null },
  { status: 'accepted',        driver: 3 },
  { status: 'arrivedAtPickup', driver: 0 },
  { status: 'delivered',       driver: 1 },
  { status: 'cancelled',       driver: null },

  // Vosloorus (10–19)
  { status: 'delivered',       driver: 2 },
  { status: 'delivered',       driver: 3 },
  { status: 'pending',         driver: null },
  { status: 'confirmed',       driver: null },
  { status: 'confirmed',       driver: null },
  { status: 'loaded',          driver: 0 },
  { status: 'cancelled',       driver: null },
  { status: 'delivered',       driver: 1 },
  { status: 'accepted',        driver: 2 },
  { status: 'pending',         driver: null },

  // Alberton (20–29)
  { status: 'delivered',       driver: 3 },
  { status: 'delivered',       driver: 0 },
  { status: 'pending',         driver: null },
  { status: 'confirmed',       driver: null },
  { status: 'cancelled',       driver: null },
  { status: 'arrivedAtPickup', driver: 1 },
  { status: 'delivered',       driver: 2 },
  { status: 'pending',         driver: null },
  { status: 'confirmed',       driver: null },
  { status: 'cancelled',       driver: null },

  // Germiston (30–39)
  { status: 'delivered',       driver: 3 },
  { status: 'delivered',       driver: 0 },
  { status: 'delivered',       driver: 1 },
  { status: 'pending',         driver: null },
  { status: 'confirmed',       driver: null },
  { status: 'loaded',          driver: 2 },
  { status: 'arrivedAtDropoff',driver: 3 },
  { status: 'accepted',        driver: 0 },
  { status: 'cancelled',       driver: null },
  { status: 'pending',         driver: null },

  // Boksburg (40–49)
  { status: 'delivered',       driver: 1 },
  { status: 'delivered',       driver: 2 },
  { status: 'delivered',       driver: 3 },
  { status: 'pending',         driver: null },
  { status: 'confirmed',       driver: null },
  { status: 'accepted',        driver: 0 },
  { status: 'cancelled',       driver: null },
  { status: 'pending',         driver: null },
  { status: 'confirmed',       driver: null },
  { status: 'pending',         driver: null },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function pick(arr, index) {
  return arr[index % arr.length];
}

/** Random int in [min, max] */
function rInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** ISO date string offset by negative days from today */
function daysAgo(days, hoursOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hoursOffset);
  return d.toISOString();
}

function buildItems(seed) {
  const count = (seed % 4) + 1; // 1–4 line items
  const items = [];
  for (let i = 0; i < count; i++) {
    const p   = PRODUCTS[(seed + i * 3) % PRODUCTS.length];
    const qty = ((seed + i) % 3) + 1; // 1–3 units
    items.push({
      description:  p.description,
      qty,
      unit_price:   p.unit_price,
      line_total:   parseFloat((p.unit_price * qty).toFixed(2)),
      estimated_kg: p.estimated_kg * qty,
    });
  }
  return items;
}

function buildOrder(index) {
  const areas     = ['katlehong', 'vosloorus', 'alberton', 'germiston', 'boksburg'];
  const areaIndex = Math.floor(index / 10);      // 0–4
  const localIdx  = index % 10;                  // 0–9 within area
  const area      = areas[areaIndex];

  const storeMap = {
    katlehong: STORES.katlehong,
    vosloorus: localIdx < 5 ? STORES.vosloorus : STORES.vosloorus2,
    alberton:  STORES.alberton,
    germiston: localIdx < 5 ? STORES.germiston : STORES.germiston2,
    boksburg:  STORES.germiston2,
  };

  const address    = ADDRESSES[area][localIdx];
  const plan       = STATUS_PLAN[index];
  const items      = buildItems(index);
  const subtotal   = parseFloat(items.reduce((s, i) => s + i.line_total, 0).toFixed(2));
  const serviceFee = parseFloat((subtotal * 0.05).toFixed(2));   // 5% platform fee on goods
  const distanceKm = parseFloat((rInt(2, 18) + (index % 10) * 0.3).toFixed(1));
  const deliveryFee = parseFloat((35 + distanceKm * 5).toFixed(2));
  const total      = parseFloat((subtotal + serviceFee + deliveryFee).toFixed(2));
  const driverPayout = parseFloat((deliveryFee * 0.8).toFixed(2));
  const platformFee  = parseFloat((deliveryFee * 0.2 + serviceFee).toFixed(2));

  const totalKg = items.reduce((s, i) => s + i.estimated_kg, 0);
  const weightClass =
    totalKg < 5  ? 'light'  :
    totalKg < 15 ? 'medium' :
    totalKg < 30 ? 'heavy'  : 'bulk';

  // Spread dates: ~30 days back, newer orders at higher indexes
  const daysBack = Math.max(1, 30 - Math.floor(index * 0.55));
  const createdAt = daysAgo(daysBack, index % 12);
  const updatedAt = daysAgo(Math.max(0, daysBack - 1), (index + 3) % 12);

  const guestId = `seed-guest-${String(index + 1).padStart(3, '0')}`;

  return {
    id:               `seed-order-${String(index + 1).padStart(3, '0')}`,
    guest_id:         guestId,
    store_id:         storeMap[area],
    order_number:     `ORD-SEED-${String(index + 1).padStart(3, '0')}`,
    items,
    subtotal,
    service_fee:      serviceFee,
    delivery_fee:     deliveryFee,
    total,
    platform_fee:     platformFee,
    driver_payout:    driverPayout,
    delivery_address: address,
    status:           plan.status,
    driver_id:        plan.driver !== null ? DRIVER_IDS[plan.driver] : null,
    receipt_id:       `seed-receipt-${String(index + 1).padStart(3, '0')}`,
    weight_class:     weightClass,
    rush:             index % 7 === 0,    // every 7th order is rush
    pooled:           index % 5 === 0,    // every 5th is pooled
    distance_km:      distanceKm,
    created_at:       createdAt,
    updated_at:       updatedAt,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nLocalsZA Order Seed');
  console.log(`Target: ${COSMOS_ENDPOINT} → ${DB_NAME}/${CONTAINER}`);
  console.log('─'.repeat(55));

  const client    = new CosmosClient({ endpoint: COSMOS_ENDPOINT, key: COSMOS_KEY });
  const container = client.database(DB_NAME).container(CONTAINER);

  const areas = ['Katlehong', 'Vosloorus', 'Alberton', 'Germiston', 'Boksburg'];
  let success = 0, failed = 0;

  for (let i = 0; i < 50; i++) {
    const order  = buildOrder(i);
    const areaName = areas[Math.floor(i / 10)];
    const pk     = order.guest_id;

    try {
      await container.items.upsert(order, { partitionKey: pk });
      console.log(`  ✓ [${String(i + 1).padStart(2, '0')}] ${order.order_number}  ${areaName.padEnd(12)} ${order.status}`);
      success++;
    } catch (err) {
      console.error(`  ✗ [${String(i + 1).padStart(2, '0')}] ${order.order_number}  ${err.message}`);
      failed++;
    }
  }

  console.log('─'.repeat(55));
  console.log(`\n✓ ${success} orders seeded  |  ✗ ${failed} failed\n`);

  // Summary by status
  const statusCounts = {};
  for (let i = 0; i < 50; i++) {
    const s = STATUS_PLAN[i].status;
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }
  console.log('Status breakdown:');
  Object.entries(statusCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([s, n]) => console.log(`  ${s.padEnd(20)} ${n}`));
  console.log();
}

main().catch(err => {
  console.error('\n✗ Seed failed:', err.message);
  process.exit(1);
});
