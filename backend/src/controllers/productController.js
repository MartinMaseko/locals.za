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


// Get All Products with optional category filtering
exports.getAllProducts = async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = admin.firestore().collection('products');
    
    // Add category filter if provided
    if (category) {
      query = query.where('category', '==', category);
    }
    
    const snapshot = await query.get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};