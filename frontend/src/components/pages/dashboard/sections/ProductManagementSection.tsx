import React, { useState } from 'react';
import { handleProductUpdate } from '../services/formHandlers';

interface Product {
  id?: string;
  product_id?: string;
  name: string;
  description: string;
  price: number;
  brand: string;
  category: string;
  image_url: string;
}

interface ProductManagementSectionProps {
  getToken: () => Promise<string>;
  productsState: any;
}

const ProductManagementSection = ({ getToken, productsState }: ProductManagementSectionProps) => {
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [productImageUploading, setProductImageUploading] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [editProductForm, setEditProductForm] = useState({
    name: '', 
    description: '', 
    price: '', 
    brand: '', 
    category: '', 
    imageFile: null as File | null, 
    image_url: ''
  });

  const openEditProduct = (prod: any) => {
    setEditingProduct(prod);
    setEditProductForm({
      name: prod.name || '', 
      description: prod.description || '', 
      price: prod.price != null ? String(prod.price) : '',
      brand: prod.brand || '', 
      category: prod.category || '', 
      imageFile: null, 
      image_url: prod.image_url || ''
    });
  };

  const closeEditProduct = () => {
    setEditingProduct(null);
    setEditProductForm({ name: '', description: '', price: '', brand: '', category: '', imageFile: null, image_url: '' });
  };

  const handleEditProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditProductForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditProductForm(prev => ({ ...prev, imageFile: e.target.files?.[0] || null }));
  };

  const handleUpdateProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingProduct) return;
    try {
      setProductImageUploading(true);
      const token = await getToken();
      const payload = await handleProductUpdate(editingProduct, editProductForm, token);
      await productsState.updateProduct(editingProduct.id || editingProduct.product_id, payload);
      closeEditProduct();
      productsState.setSuccess('Product updated successfully!');
    } catch (err: any) {
      console.error('handleUpdateProduct error', err);
      const errorMessage = err.message || 'Failed to update product';
      productsState.setError(errorMessage);
    } finally {
      setProductImageUploading(false);
    }
  };

  // Update search filtering whenever search query changes
  React.useEffect(() => {
    if (productsState.filterByQuery) {
      productsState.filterByQuery(productSearchQuery);
    }
  }, [productSearchQuery, productsState.filterByQuery]);

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }
    try {
      setDeletingProductId(productId);
      const token = await getToken();
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete product');
      }
      
      // Remove product from state
      await productsState.deleteProduct(productId);
      closeEditProduct();
      productsState.setSuccess('Product deleted successfully!');
    } catch (err: any) {
      console.error('Delete product error', err);
      productsState.setError(err?.message || 'Failed to delete product');
    } finally {
      setDeletingProductId(null);
    }
  };

  return (
    <div className="product-management-section">
      <div className="product-management-header">
        <h2>Manage Products</h2>
        <div className="product-search-container">
          <input
            type="text"
            placeholder="Search by name, brand or ID"
            value={productSearchQuery}
            onChange={(e) => setProductSearchQuery(e.target.value)}
            className="product-search-input"
          />
          {productSearchQuery && (
            <button 
              className="clear-search"
              onClick={() => setProductSearchQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {productsState.loading ? <div className="loading-indicator">Loading products...</div> :
        productsState.error ? <div className="error-message">{productsState.error}</div> :
        productsState.products.length === 0 ? <div className="no-products">No products found</div> :
        productsState.filteredProducts.length === 0 ? <div className="no-products">No products matching "{productSearchQuery}"</div> :
        <div className="products-grid">
          <div className="products-list">
            <table className="orders-table products-table">
              <thead><tr><th>Product ID</th><th>Image</th><th>Name</th><th>Category</th><th>Brand</th><th>Price</th><th>Actions</th></tr></thead>
              <tbody>
                {productsState.filteredProducts.map((p: Product) => (
                  <tr key={p.id || p.product_id}>
                    <td>{(p.id || p.product_id)?.toString().substring(0,10)}...</td>
                    <td>{p.image_url ? <img src={p.image_url} alt={p.name} className="product-thumb"/> : <div className="no-thumb">—</div>}</td>
                    <td>{p.name}</td><td>{p.category}</td><td>{p.brand}</td><td>R{Number(p.price || 0).toFixed(2)}</td>
                    <td>
                      <div className="action-buttons">
                        <button onClick={() => openEditProduct(p)} className="view-button">Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }

      {editingProduct && (
        <div className="order-details-overlay" onClick={closeEditProduct}>
          <div className="order-details-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={closeEditProduct} aria-label="Close">&times;</button>
            <h3>Edit Product</h3>
            <form onSubmit={handleUpdateProduct} className="product-edit-form">
              <div className="form-group">
                <label>Product ID</label>
                <div className="readonly-input">{editingProduct.id || editingProduct.product_id}</div>
              </div>
              <div className="form-group">
                <label>Name</label>
                <input name="name" value={editProductForm.name} onChange={handleEditProductChange} required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input name="category" value={editProductForm.category} onChange={handleEditProductChange} />
              </div>
              <div className="form-group">
                <label>Brand</label>
                <input name="brand" value={editProductForm.brand} onChange={handleEditProductChange} />
              </div>
              <div className="form-group">
                <label>Price</label>
                <input name="price" type="number" step="0.01" value={editProductForm.price} onChange={handleEditProductChange} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-textarea" name="description" value={editProductForm.description} onChange={handleEditProductChange} rows={4} />
              </div>
              <div className="form-group file-input-group">
                <label>Image (leave empty to keep current)</label>
                <input name="image" type="file" accept="image/*" onChange={handleEditProductImageChange} />
                {editProductForm.image_url && !editProductForm.imageFile && (
                  <div className="current-image-preview">
                    <img className='current-image' src={editProductForm.image_url} alt="current" />
                  </div>
                )}
              </div>
              <div className="form-actions">
                <button type="submit" className="form-button" disabled={productImageUploading}>{productImageUploading ? 'Uploading…' : 'Save changes'}</button>
                <button type="button" className="form-button secondary" onClick={closeEditProduct}>Cancel</button>
                <button 
                  type="button" 
                  className="form-button danger" 
                  onClick={() => handleDeleteProduct(editingProduct.id || editingProduct.product_id)}
                  disabled={deletingProductId === (editingProduct.id || editingProduct.product_id)}
                >
                  {deletingProductId === (editingProduct.id || editingProduct.product_id) ? 'Deleting...' : 'Delete Product'}
                </button>
              </div>
              {productsState.error && <div className="error-message">{productsState.error}</div>}
              {productsState.success && <div className="success-message">{productsState.success}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagementSection;
