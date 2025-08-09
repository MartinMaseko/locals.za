const admin = require('../../firebase');

// Create Product (Admin only)
exports.createProduct = async (req, res) => {
  try {
    const productData = req.body;
    const docRef = await admin.firestore().collection('products').add(productData);
    res.json({ id: docRef.id, ...productData });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


// Get All Products
exports.getAllProducts = async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection('products').get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};