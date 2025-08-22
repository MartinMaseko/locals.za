import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../../contexts/CartContext';
import ProductCard from '../productview/productsCard';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';
import './cartstyle.css';

const SERVICE_FEE = 65;

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [postal, setPostal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const subtotal = cart.reduce((s, it) => {
    const price = typeof it.product.price === 'number' ? it.product.price : parseFloat(String(it.product.price || 0));
    return s + (isNaN(price) ? 0 : price * it.qty);
  }, 0);
  const total = subtotal + SERVICE_FEE;

  const placeOrder = async () => {
    if (!cart.length) return setError('Cart is empty');
    if (!name || !phone || !addressLine) return setError('Please complete delivery and contact details');

    setLoading(true);
    setError('');

    try {
      // try to get token if user logged in
      const auth = getAuth(app);
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;

      const payload = {
        items: cart.map(i => ({ productId: i.product.id, product: i.product, qty: i.qty })),
        subtotal,
        serviceFee: SERVICE_FEE,
        total,
        deliveryAddress: { name, phone, addressLine, city, postal },
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const res = await axios.post('/api/orders', payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      // on success clear cart and navigate to confirmation
      clearCart();
      const data = res.data as { id?: string; orderId?: string };
      navigate(`/order-confirmation/${data.id || data.orderId || ''}`, { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>

      <section className="checkout-items">
        <h2>Order details</h2>
        {cart.length === 0 ? <p>Your cart is empty.</p> : (
          <>
            <ul className='checkout-list'>
              {cart.map(it => (
                <li key={it.product.id} className='checkout-item'>
                  <ProductCard product={it.product} />
                  <div>Qty: {it.qty}</div>
                </li>
              ))}
            </ul>

            <div className='billing-summary'>
              <div>Subtotal: R {subtotal.toFixed(2)}</div>
              <div>Service fee: R {SERVICE_FEE.toFixed(2)}</div>
              <div className='total-bill'><strong>Total: R {total.toFixed(2)}</strong></div>
            </div>
          </>
        )}
      </section>

      <section className="checkout-form">
        <h2>Delivery Details</h2>
        {error && <div className="error">{error}</div>}
        <label>
          Full name
        </label>
          <input value={name} onChange={e => setName(e.target.value)} />
        <label>
          Phone
        </label>
          <input value={phone} onChange={e => setPhone(e.target.value)} />
        <label>
          Address
        </label>
          <input value={addressLine} onChange={e => setAddressLine(e.target.value)} />
        <label>
          City
        </label>
          <input value={city} onChange={e => setCity(e.target.value)} />
        <label>
          Postal code
        </label>
          <input value={postal} onChange={e => setPostal(e.target.value)} />

        <div className='checkout-actions'>
          <button className='place-order-button' type="button" disabled={loading} onClick={placeOrder}>
            {loading ? 'Placing order...' : 'Place order'}
          </button>
          <button className='cancel-button' type="button" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </section>
    </div>
  );
};

export default CheckoutPage;