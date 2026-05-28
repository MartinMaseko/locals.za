/**
 * LocalsZA — Store Seed Script
 * -------------------------------------------------------
 * 1. Uses firebase-admin + service account to grant your
 *    account the "admin" role claim (required by the API).
 * 2. Signs in via Firebase REST API to get a fresh token.
 * 3. PUTs all stores into Cosmos via the deployed API.
 *
 * Prerequisites:
 *   npm install firebase-admin   (run once in this folder)
 *
 * Usage:
 *   node seed-stores.js
 *
 * Edit the CONFIG block below before running.
 * -------------------------------------------------------
 */

const admin = require('firebase-admin');
const path  = require('path');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const ADMIN_EMAIL    = 'martinmasekodev@gmail.com';   // your LocalsZA login
const ADMIN_PASSWORD = 'LocalsZA';                    // Firebase password

const API_URL        = 'https://localsza-api-a7eegch0fxfjh3at.southafricanorth-01.azurewebsites.net';

const FIREBASE_API_KEY              = 'REDACTED_FIREBASE_KEY';  // from .env.production
const FIREBASE_CUSTOM_TOKEN_URL     = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`;
const FIREBASE_REFRESH_URL          = `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`;
const SERVICE_ACCOUNT_PATH          = path.resolve(__dirname, './api/firebase-service-account.json');
// ─────────────────────────────────────────────────────────────────────────────

// ── Store data (mirrors wholesale.types.ts STORES array + real coordinates) ──
const STORES = [
  {
    id: 'shoprite',
    name: 'Shoprite Cash and Carry SW Vosloorus',
    tagline: 'Bulk groceries & essentials',
    initials: 'SR',
    color: '#FFE000',
    address: 'Vosloorus Shopping Centre, Vosloorus, Boksburg, 1475',
    lat: -26.3507,
    lng: 28.2044,
    active: true,
  },
  {
    id: 'shoprite-springs',
    name: 'Shoprite Cash and Carry SW Springs',
    tagline: 'Spaza shop staples',
    initials: 'SS',
    color: '#FFE000',
    address: 'Springs Mall, Springs, East Rand, 1559',
    lat: -26.2617,
    lng: 28.4440,
    active: true,
  },
  {
    id: 'sa-cash-and-carry',
    name: 'SA Cash and Carry',
    tagline: 'Wholesale groceries & essentials',
    initials: 'SC',
    color: '#E30613',
    address: 'Junction Hill, Corner Black Reef Rd & Ginstein St, Germiston, 1401',
    lat: -26.2316,
    lng: 28.1571,
    active: true,
  },
  {
    id: 'metro-wholesale-soweto',
    name: 'Metro Wholesale Soweto',
    tagline: 'Everyday bulk staples',
    initials: 'MW',
    color: '#1565C0',
    address: 'Soweto, Johannesburg, 1818',
    lat: -26.2644,
    lng: 27.8588,
    active: true,
  },
  {
    id: 'katlehong-cash-carry',
    name: 'Katlehong Cash & Carry',
    tagline: 'Fresh produce & dry goods',
    initials: 'KC',
    color: '#2E7D32',
    address: 'Katlehong, Ekurhuleni, 1431',
    lat: -26.3647,
    lng: 28.1589,
    active: true,
  },
  {
    id: 'thokoza-wholesale',
    name: 'Thokoza Wholesale Depot',
    tagline: 'Township trader supplies',
    initials: 'TW',
    color: '#6A1B9A',
    address: 'Thokoza, Ekurhuleni, 1420',
    lat: -26.3618,
    lng: 28.1323,
    active: true,
  },
  {
    id: 'germiston-trade-centre',
    name: 'Germiston Trade Centre',
    tagline: 'Bulk beverages & snacks',
    initials: 'GT',
    color: '#BF360C',
    address: 'Germiston CBD, Germiston, 1401',
    lat: -26.2325,
    lng: 28.1614,
    active: true,
  },
  {
    id: 'tsakane-general',
    name: 'Tsakane General Suppliers',
    tagline: 'Household & cleaning bulk',
    initials: 'TG',
    color: '#00695C',
    address: 'Tsakane, Brakpan, 1550',
    lat: -26.3519,
    lng: 28.3607,
    active: true,
  },
  {
    id: 'alex-wholesale',
    name: 'Alexandra Wholesale Hub',
    tagline: 'Fast-moving consumer goods',
    initials: 'AW',
    color: '#F57F17',
    address: 'Alexandra Township, Johannesburg, 2090',
    lat: -26.1026,
    lng: 28.0990,
    active: true,
  },
  {
    id: 'tembisa-depot',
    name: 'Tembisa Depot & Supplies',
    tagline: 'Rice, oil & bulk essentials',
    initials: 'TD',
    color: '#37474F',
    address: 'Tembisa, Ekurhuleni, 1632',
    lat: -25.9990,
    lng: 28.2321,
    active: true,
  },
  {
    id: 'duduza-cash-carry',
    name: 'Duduza Cash & Carry',
    tagline: 'Spaza restocking specialists',
    initials: 'DC',
    color: '#880E4F',
    address: 'Duduza, Nigel, 1490',
    lat: -26.4007,
    lng: 28.4641,
    active: true,
  },
  {
    id: 'vosloorus-trade-hub',
    name: 'Vosloorus Trade Hub',
    tagline: 'Confectionery & frozen goods',
    initials: 'VT',
    color: '#1B5E20',
    address: 'Vosloorus, Boksburg, 1475',
    lat: -26.3510,
    lng: 28.2050,
    active: true,
  },
];

// ── Auth ─────────────────────────────────────────────────────────────────────

/** Ensure the configured account has the admin custom claim. Returns uid. */
async function ensureAdminClaim() {
  if (!admin.apps.length) {
    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(ADMIN_EMAIL);
  } catch {
    userRecord = await admin.auth().createUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    console.log(`✓ Created Firebase user: ${userRecord.uid}`);
  }
  const current = userRecord.customClaims;
  if (current?.role !== 'admin') {
    await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin' });
    console.log(`✓ Set role:"admin" claim on ${ADMIN_EMAIL}`);
  } else {
    console.log(`✓ Admin claim already set on ${ADMIN_EMAIL}`);
  }
  return userRecord.uid;
}

/** Mint a custom token and exchange for an ID token (no password needed). */
async function getIdToken(uid) {
  // Admin SDK mints a custom token — bypasses password entirely
  const customToken = await admin.auth().createCustomToken(uid);

  // Exchange custom token → session
  const signInRes = await fetch(FIREBASE_CUSTOM_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const signInData = await signInRes.json();
  if (!signInRes.ok) throw new Error(`Custom token sign-in failed: ${signInData.error?.message}`);

  // Refresh so the ID token carries the admin custom claim
  const refreshRes = await fetch(FIREBASE_REFRESH_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ grant_type: 'refresh_token', refresh_token: signInData.refreshToken }),
  });
  const refreshData = await refreshRes.json();
  if (!refreshRes.ok) throw new Error(`Token refresh failed: ${refreshData.error?.message}`);

  console.log(`✓ Token obtained for ${ADMIN_EMAIL} (includes admin claim)`);
  return refreshData.id_token;
}

// ── Upsert a single store via the API ────────────────────────────────────────
async function upsertStore(store, token) {
  // Use PUT /api/stores/{id} so it's idempotent (safe to re-run)
  const res = await fetch(`${API_URL}/api/stores/${store.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(store),
  });

  if (res.ok) {
    console.log(`  ✓ ${store.name}`);
    return;
  }

  // Fall back to POST if PUT not found (first run with no existing doc)
  if (res.status === 404) {
    const res2 = await fetch(`${API_URL}/api/stores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(store),
    });
    if (res2.ok) {
      console.log(`  ✓ ${store.name} (created)`);
    } else {
      const err = await res2.text();
      console.error(`  ✗ ${store.name} — POST ${res2.status}: ${err}`);
    }
    return;
  }

  const err = await res.text();
  console.error(`  ✗ ${store.name} — PUT ${res.status}: ${err}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nLocalsZA Store Seed`);
  console.log(`API: ${API_URL}`);

  console.log('\nStep 1 — Ensuring admin claim...');
  let uid;
  try {
    uid = await ensureAdminClaim();
  } catch (e) {
    console.error(`\n✗ Admin claim step failed: ${e.message}`);
    process.exit(1);
  }

  console.log('\nStep 2 — Authenticating...');
  let token;
  try {
    token = await getIdToken(uid);
  } catch (e) {
    console.error(`\n✗ Auth failed: ${e.message}`);
    process.exit(1);
  }

  console.log(`\nStep 3 — Seeding ${STORES.length} stores...\n`);
  for (const store of STORES) {
    await upsertStore(store, token);
  }

  console.log(`\n✓ Done. Verify at: ${API_URL}/api/stores\n`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
