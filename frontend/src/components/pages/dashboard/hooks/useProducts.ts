import { useState, useCallback } from 'react';
import { adminApi } from '../services/adminApi';

export const useProducts = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchProducts = useCallback(async () => {
    // Skip if products are already loaded (from DashboardSection)
    if (products.length > 0) return;
    
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.getProducts();
      setProducts(data);
      setFilteredProducts(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [products.length]);

  const createProduct = useCallback(async (product: any) => {
    setError('');
    setSuccess('');
    try {
      const newProduct = await adminApi.createProduct(product);
      // Optimistically update local state instead of refetching all products
      setProducts(prev => [...prev, newProduct]);
      setFilteredProducts(prev => [...prev, newProduct]);
      setSuccess('Product added successfully!');
      return true;
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to create product');
      return false;
    }
  }, []);

  const updateProduct = useCallback(async (productId: string, updates: any) => {
    setError('');
    setSuccess('');
    try {
      await adminApi.updateProduct(productId, updates);
      setProducts(prev =>
        prev.map(p => (p.id === productId || p.product_id === productId) ? { ...p, ...updates } : p)
      );
      setFilteredProducts(prev =>
        prev.map(p => (p.id === productId || p.product_id === productId) ? { ...p, ...updates } : p)
      );
      setSuccess('Product updated successfully');
      return true;
    } catch (err: any) {
      const errorResponse = err.response?.data;
      let errorMessage = 'Failed to update product';
      if (typeof errorResponse === 'string') {
        errorMessage = errorResponse;
      } else if (errorResponse?.error) {
        errorMessage = errorResponse.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      return false;
    }
  }, []);

  const deleteProduct = useCallback(async (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId && p.product_id !== productId));
    setFilteredProducts(prev => prev.filter(p => p.id !== productId && p.product_id !== productId));
  }, []);

  const filterByQuery = useCallback((query: string) => {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(products.filter(p =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        ((p.id || p.product_id) && (p.id || p.product_id).toString().toLowerCase().includes(q))
      ));
    }
  }, [products]);

  return {
    products,
    filteredProducts,
    loading,
    error,
    success,
    setError,
    setSuccess,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    filterByQuery
  };
};
