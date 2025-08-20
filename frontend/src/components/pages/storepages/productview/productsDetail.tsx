import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './productstyle.css';
import { useCart } from '../../../contexts/CartContext';
import type { Product } from '../../../contexts/FavoritesContext';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(location.state?.product || null);
  const [loading, setLoading] = useState(!product);
  const [error, setError] = useState('');

  const { addToCart, removeFromCart, isInCart, getQty, increaseQty, decreaseQty } = useCart();

  useEffect(() => {
    if (product) return;
    if (!id) {
      setError('Missing product id');
      return;
    }

    const fetchProduct = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await axios.get<Product>(`/api/products/${id}`);
        setProduct(data);
      } catch (err: any) {
        console.error('Failed to load product:', err);
        setError('Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, product]);

  if (loading) return <div className="product-detail-loading">Loading product...</div>;
  if (error) return <div className="product-detail-error">{error}</div>;
  if (!product) return <div className="product-detail-empty">Product not found</div>;

  const inCart = isInCart(product.id);
  const qty = getQty(product.id);

  return (
    <div className="product-detail-page">
      <button className="product-detail-back" onClick={() => navigate(-1)}>
        <img width="30" height="30" src="https://img.icons8.com/ios-filled/35/ffb803/back.png" alt="back" />
        Back
      </button>

      <div className="product-detail-grid">
        {product.image_url && <img src={product.image_url} alt={product.name} className="product-detail-image" />}
        <div className="product-detail-info">
          <h1 className="product-modal-title">{product.name}</h1>
          <p className="product-modal-price">R {product.price}</p>
          {product.brand && <p><strong>Brand:</strong> {product.brand}</p>}
          {product.category && <p><strong>Category:</strong> {product.category}</p>}
          {product.description && <p className="product-modal-desc">{product.description}</p>}

          {/* Add / Remove cart controls */}
          <div className="product-detail-actions">
            {!inCart ? (
              <button
                className="add-to-cart"
                onClick={() => {
                  addToCart(product);
                }}
                type="button"
              >
                Add to cart
              </button>
            ) : (
              <div className="cart-controls" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="decrease-qty"
                  type="button"
                  onClick={() => decreaseQty(product.id)}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span>Qty: {qty}</span>
                <button
                  className="increase-qty"
                  type="button"
                  onClick={() => increaseQty(product.id)}
                  aria-label="Increase quantity"
                >
                  +
                </button>
                <button
                  className="remove-from-cart"
                  onClick={() => removeFromCart(product.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;