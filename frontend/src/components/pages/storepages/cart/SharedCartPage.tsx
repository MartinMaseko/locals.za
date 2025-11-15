import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './cartstyle.css';
import ProductCard from '../productview/productsCard';
import { useCart } from '../../../contexts/CartContext';

const API_URL = import.meta.env.VITE_API_URL;

const decodeBase64Unicode = (b64: string) => {
  try {
    return typeof window !== 'undefined' ? decodeURIComponent(escape(window.atob(b64))) : Buffer.from(b64, 'base64').toString('utf8');
  } catch (e) { return null; }
};

const SharedCartPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart: contextAddToCart, isInCart, increaseQty, getQty } = useCart();
  const [items, setItems] = useState<Array<{ id: string; qty: number; product?: any }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get('d');
    if (!d) { setError('Invalid shared link'); setLoading(false); return; }
    const b64 = decodeURIComponent(d);
    const json = decodeBase64Unicode(b64);
    if (!json) { setError('Failed to decode link'); setLoading(false); return; }

    try {
      const parsed = JSON.parse(json);
      const list = Array.isArray(parsed.items) ? parsed.items.map((it:any) => ({ id: String(it.id), qty: Number(it.qty) || 1 })) : [];
      setItems(list);

      // fetch product details
      Promise.all(list.map(async (it: { id: string; qty: number }) => {
        try {
          const res = await axios.get(`${API_URL}/api/products/${it.id}`);
          return { ...it, product: res.data };
        } catch (e) {
          return { ...it, product: null };
        }
      })).then(results => {
        setItems(results);
        setLoading(false);
      }).catch(() => setLoading(false));
    } catch (err) {
      setError('Malformed link data'); setLoading(false);
    }
  }, []);

  const addToCart = async () => {
    try {
      // Use CartContext methods to ensure the app state updates correctly
      for (const it of items) {
        if (!it.product) continue;
        const prod = it.product;
        const desiredQty = Number(it.qty) || 1;

        // If not in cart, add once
        if (!isInCart(prod.id)) {
          await contextAddToCart(prod);
        }

        // Increase until we reach desired quantity
        const currentQty = getQty(prod.id) || 0;
        const toAdd = Math.max(0, desiredQty - currentQty);
        for (let i = 0; i < toAdd; i++) {
          increaseQty(prod.id);
        }
      }

      // Navigate to cart after updates
      navigate('/cart');
    } catch (err) {
      console.error('Failed to add to cart', err);
      setError('Failed to add items to cart');
    }
  };

  if (loading) return <div className="loading-container">Loading shared cart...</div>;
  if (error) return <div className="error-container">{error}</div>;

  return (
    <div className="shared-cart-page">
      <h1>Shared Cart</h1>
      {items.length === 0 ? (
        <p>No items in this shared cart.</p>
      ) : (
        <div className="shared-items-list">
          {items.map((it, idx) => (
            <div key={it.id || idx} className="shared-item">
              {it.product ? (
                <div className="shared-item-card">
                  <ProductCard product={it.product} onClick={(p:any) => navigate(`/product/${p.id}`, { state: { product: p } })} />
                  <div className="shared-item-meta">Qty: {it.qty} • <span>Price: R{Number(it.product.price || 0).toFixed(2)}</span></div>
                </div>
              ) : (
                <div className="shared-item-left">
                  <div className="shared-item-title">Product {it.id}</div>
                  <div className="shared-item-meta">Qty: {it.qty} • <span>Price: R{Number(it.product?.price || 0).toFixed(2)}</span></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="shared-actions">
        <button className="place-order-button" disabled={items.length===0} onClick={addToCart}>Add to cart</button>
        <button className="cancel-button" onClick={() => navigate(-1)}>Cancel</button>
      </div>
    </div>
  );
};

export default SharedCartPage;
