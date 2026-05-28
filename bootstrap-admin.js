/**
 * LocalsZA — One-Time Admin Bootstrap
 * -------------------------------------------------------
 * Run this ONCE to:
 *   1. Set role:"admin" custom claim on your Firebase account
 *   2. Create/update your user doc in Cosmos DB via the API
 *
 * Prerequisites (run once in locals.za/ folder):
 *   npm install firebase-admin
 *
 * Usage:
 *   node bootstrap-admin.js
 * -------------------------------------------------------
 */

const admin = require('firebase-admin');
const path  = require('path');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const ADMIN_EMAIL    = 'martinmasekodev@gmail.com';
const ADMIN_PASSWORD = 'LocalsZA';

const API_URL             = 'https://localsza-api-a7eegch0fxfjh3at.southafricanorth-01.azurewebsites.net';
const FIREBASE_API_KEY    = 'REDACTED_FIREBASE_KEY';
const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, './api/firebase-service-account.json');
// ─────────────────────────────────────────────────────────────────────────────

const CUSTOM_TOKEN_SIGNIN_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`;
const REFRESH_URL             = `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`;

// ── Step 1: Initialise Firebase Admin SDK ─────────────────────────────────────
function initAdmin() {
  if (admin.apps.length) return;
  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  console.log('✓ Firebase Admin SDK initialised');
}

// ── Step 2: Ensure user exists + set admin claim ──────────────────────────────
async function setAdminClaim() {
  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(ADMIN_EMAIL);
    console.log(`✓ Found Firebase user: ${userRecord.uid}`);
  } catch {
    userRecord = await admin.auth().createUser({
      email:       ADMIN_EMAIL,
      password:    ADMIN_PASSWORD,
      displayName: 'Martin Maseko',
    });
    console.log(`✓ Created Firebase user: ${userRecord.uid}`);
  }

  await admin.auth().setCustomUserClaims(userRecord.uid, { role: 'admin' });
  console.log(`✓ Set custom claim { role: "admin" } on ${ADMIN_EMAIL}`);
  return userRecord.uid;
}

// ── Step 3: Mint a custom token and exchange for an ID token (no password needed) ─
async function getFreshToken(uid) {
  // Admin SDK mints a custom token — bypasses password entirely
  const customToken = await admin.auth().createCustomToken(uid);

  // Exchange custom token → session (idToken + refreshToken)
  const signInRes = await fetch(CUSTOM_TOKEN_SIGNIN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const signInData = await signInRes.json();
  if (!signInRes.ok) throw new Error(`Custom token sign-in failed: ${signInData.error?.message}`);

  // Refresh immediately so the resulting ID token carries the custom claims
  const refreshRes = await fetch(REFRESH_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ grant_type: 'refresh_token', refresh_token: signInData.refreshToken }),
  });
  const refreshData = await refreshRes.json();
  if (!refreshRes.ok) throw new Error(`Token refresh failed: ${refreshData.error?.message}`);

  console.log('✓ Fresh ID token obtained (includes admin claim)');
  return refreshData.id_token;
}

// ── Step 4: Create/update Cosmos user doc via GET /api/auth/me ─────────────────
async function seedCosmosUser(token) {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) {
    const user = await res.json();
    console.log(`✓ Cosmos user doc ready: user_type=${user.user_type}`);
    return user;
  }
  throw new Error(`/api/auth/me returned ${res.status}: ${await res.text()}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\nLocalsZA Admin Bootstrap');
  console.log('─────────────────────────');

  initAdmin();
  const uid = await setAdminClaim();

  console.log('\nGetting fresh token (includes admin claim)...');
  const token = await getFreshToken(uid);

  console.log('\nCreating Cosmos user doc...');
  await seedCosmosUser(token);

  console.log('\n✓ Bootstrap complete!');
  console.log(`  ${ADMIN_EMAIL} is now an admin.`);
  console.log('  You can now run: node seed-stores.js\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n✗ Bootstrap failed:', err.message);
  process.exit(1);
});
