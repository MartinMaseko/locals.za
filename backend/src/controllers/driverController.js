const admin = require('../../firebase');
const crypto = require('crypto');

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

// Verify driver credentials
exports.verifyCredentials = async (req, res) => {
  try {
    const { full_name, driver_id } = req.body;
    
    if (!full_name || !driver_id) {
      return res.status(400).json({ error: 'Full name and driver ID are required' });
    }
    
    // Query Firestore for a driver with matching credentials
    const driversRef = admin.firestore().collection('drivers');
    const snapshot = await driversRef
      .where('full_name', '==', full_name)
      .where('driver_id', '==', driver_id)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Get the driver document
    const driverDoc = snapshot.docs[0];
    const driverData = driverDoc.data();
    
    // If driver has a firebase_uid, use that
    // Otherwise, create a new Firebase Auth account
    let firebaseUid = driverData.firebase_uid;
    let driverEmail = driverData.email;
    
    if (!firebaseUid) {
      try {
        // Generate a unique email using the driver_id
        driverEmail = `${driver_id.toLowerCase()}@locals-za.driver`;
        
        // Create a new user in Firebase Auth
        const userRecord = await admin.auth().createUser({
          email: driverEmail,
          // Create a secure initial password
          password: crypto.randomBytes(16).toString('hex'),
          displayName: full_name
        });
        
        firebaseUid = userRecord.uid;
        
        // Update the driver document with the new Firebase UID
        await admin.firestore().collection('drivers').doc(driverDoc.id).update({
          firebase_uid: firebaseUid,
          email: driverEmail
        });
        
        // Set custom claims to identify as a driver
        await admin.auth().setCustomUserClaims(firebaseUid, { 
          driver: true,
          driver_id: driver_id
        });
      } catch (createError) {
        console.error('Error creating Firebase user:', createError);
        return res.status(500).json({ error: 'Failed to create authentication account' });
      }
    }
    
    res.json({ 
      success: true,
      email: driverEmail,
      firebase_uid: firebaseUid,
      driver_id: driver_id
    });
    
  } catch (error) {
    console.error('Error verifying driver:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Generate login credentials for driver
exports.generateLoginCredentials = async (req, res) => {
  try {
    const { firebase_uid, driver_id } = req.body;
    
    console.log('Generating login credentials for:', { firebase_uid, driver_id });
    
    if (!firebase_uid || !driver_id) {
      return res.status(400).json({ error: 'Firebase UID and driver ID are required' });
    }
    
    try {
      // Create custom token - this is the most reliable way to authenticate
      const customToken = await admin.auth().createCustomToken(firebase_uid, {
        driver: true,
        driver_id: driver_id
      });
      
      console.log('Custom token generated successfully');
      
      // Log the successful login attempt
      await admin.firestore().collection('driver_login_logs').add({
        driver_id,
        firebase_uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        login_method: 'custom_token',
        success: true
      });
      
      res.json({
        success: true,
        customToken
      });
    } catch (error) {
      console.error('Error generating login credentials:', error);
      res.status(500).json({ error: 'Failed to generate login credentials' });
    }
    
  } catch (error) {
    console.error('Error generating login credentials:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Get driver profile
exports.getProfile = async (req, res) => {
  try {
    const { uid } = req.user;
    
    // Find driver by firebase_uid
    const driversRef = admin.firestore().collection('drivers');
    const snapshot = await driversRef.where('firebase_uid', '==', uid).limit(1).get();
    
    if (snapshot.empty) {
      return res.status(404).json({ error: 'Driver profile not found' });
    }
    
    const driverData = snapshot.docs[0].data();
    
    // Return driver profile without sensitive information
    res.json({
      id: snapshot.docs[0].id,
      full_name: driverData.full_name,
      driver_id: driverData.driver_id,
      phone_number: driverData.phone_number,
      vehicle_type: driverData.vehicle_type,
      vehicle_model: driverData.vehicle_model,
    });
    
  } catch (error) {
    console.error('Error fetching driver profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};