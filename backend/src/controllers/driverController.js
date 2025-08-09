const admin = require('../../firebase');

// Register a new driver (save to Firestore)
exports.register = async (req, res) => {
  try {
    const driverData = req.body;
    const docRef = await admin.firestore().collection('drivers').add(driverData);
    res.json({ id: docRef.id, ...driverData });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};