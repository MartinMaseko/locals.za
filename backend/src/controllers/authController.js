// Import the Firebase admin SDK for server-side operations
const admin = require('../../firebase');

// Registration (handled on frontend with Firebase Auth)
exports.register = async (req, res) => {
  // Registration is handled on frontend with Firebase Auth
  res.status(501).json({ error: "Registration is handled on the frontend with Firebase Auth." });
};

// Login (handled on frontend with Firebase Auth)
exports.login = async (req, res) => {
  // Login is handled on frontend with Firebase Auth
  res.status(501).json({ error: "Login is handled on the frontend with Firebase Auth." });
};

// Sign out (handled on frontend with Firebase Auth)
exports.signOut = async (req, res) => {
  res.status(501).json({ error: "Sign out is handled on the frontend with Firebase Auth." });
};

// Get current user session (verify Firebase token)
exports.getSession = async (req, res) => {
  const { access_token } = req.body;
  if (!access_token) return res.status(400).json({ error: 'Access token required' });

  try {
    const decodedToken = await admin.auth().verifyIdToken(access_token);
    res.json({ user: decodedToken });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Promote user to admin (set custom claim + password)
exports.promoteToAdmin = async (req, res) => {
  const { email, adminPassword } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  if (!adminPassword) return res.status(400).json({ error: 'Admin password required' });

  try {
    // Look up the user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    const uid = userRecord.uid;

    // Set admin custom claim
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    await admin.auth().updateUser(uid, {
      password: adminPassword,
    });

    await admin.firestore().collection('users').doc(uid).update({
      user_type: 'admin',
    });

    res.json({ message: `User ${email} promoted to admin with login credentials set.` });
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'No user found with that email address' });
    }
    res.status(500).json({ error: error.message });
  }
};

