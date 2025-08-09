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

// Promote user to admin (set custom claim)
exports.promoteToAdmin = async (req, res) => {
  const { uid } = req.body; // Firebase UID of the user to promote
  if (!uid) return res.status(400).json({ error: 'UID required' });

  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    res.json({ message: 'User promoted to admin.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

