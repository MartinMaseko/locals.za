import { useState } from 'react';
import { handleProductImageUpload } from '../services/formHandlers';
import { generateProductId, productCategories } from '../utils/helpers';

interface AddProductSectionProps {
  getToken: () => Promise<string>;
  productsState: any;
}

const AddProductSection = ({ getToken, productsState }: AddProductSectionProps) => {
  const [productForm, setProductForm] = useState({
    product_id: generateProductId(), 
    name: '', 
    description: '', 
    price: '', 
    brand: '', 
    category: '', 
    image: null as File | null
  });

  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProductForm(prev => ({ ...prev, [name]: value }));
  };

  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProductForm(prev => ({ ...prev, image: e.target.files?.[0] || null }));
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    productsState.setError('');
    productsState.setSuccess('');
    try {
      const token = await getToken();
      let productImageUrl = '';
      
      if (productForm.image) {
        try {
          productImageUrl = await handleProductImageUpload(productForm.image, productForm.product_id);
        } catch (uploadErr: any) {
          productsState.setError(`Image upload failed: ${uploadErr.message}. Product will be created without an image.`);
        }
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/products`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: productForm.product_id,
          name: productForm.name,
          description: productForm.description,
          price: productForm.price,
          brand: productForm.brand,
          category: productForm.category,
          image_url: productImageUrl
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create product');
      }
      
      productsState.setSuccess('Product added successfully!');
      setProductForm({ product_id: generateProductId(), name: '', description: '', price: '', brand: '', category: '', image: null });
    } catch (err: any) {
      console.error('Product creation error:', err);
      productsState.setError(err?.message || 'Product creation failed');
    }
  };

  return (
    <div className="product-form-section">
      <h2>Add New Product</h2>
      <form onSubmit={handleAddProduct} className="admin-form">
        <div className="form-group"><input id="product_input" name="product_id" type="text" placeholder="Product ID" value={productForm.product_id} readOnly className="readonly-input" /></div>
        <div className="form-group"><input id="product_input" name="name" type="text" placeholder="Product Name" value={productForm.name} onChange={handleProductChange} required /></div>
        <div className="form-group"><input id="product_input" name="brand" type="text" placeholder="Brand" value={productForm.brand} onChange={handleProductChange} required /></div>
        <div className="form-group">
          <select name="category" value={productForm.category} onChange={handleProductChange} required>
            <option value="">Select Category</option>
            {productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div className="form-group"><input id="product_input" name="description" type="text" placeholder="Description" value={productForm.description} onChange={handleProductChange} required /></div>
        <div className="form-group"><input id="product_input" name="price" type="number" placeholder="Price" value={productForm.price} onChange={handleProductChange} required /></div>
        <div className="form-group file-input-group"><label>Product Image:</label><input name="image" type="file" accept="image/*" onChange={handleProductImageChange} /></div>
        <button type="submit" className="form-button">Add Product</button>
        {productsState.error && <div className="error-message">{productsState.error}</div>}
        {productsState.success && <div className="success-message">{productsState.success}</div>}
      </form>
    </div>
  );
};

export default AddProductSection;
