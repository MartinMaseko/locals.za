import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../../contexts/CartContext';
import ProductCard from '../productview/productsCard';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
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

  // Order confirmation message in user's inbox
    const createOrderConfirmationMessage = async (orderId: string) => {
      try {
        const auth = getAuth(app);
        const userId = auth.currentUser?.uid;
  
        if (!userId) return; // Skip if not logged in
  
        const db = getFirestore(app);
  
        // Create message in user's inbox
        await addDoc(collection(db, 'users', userId, 'inbox'), {
          title: `Order #${orderId.slice(-6)} Confirmed`,
          body: `Thank you for your order! Your order for R${total.toFixed(2)} has been received and is being processed. 
          We'll update you when your order status changes. You can track your order at any time on the Orders page.`,
          fromRole: "LocalsZA Team",
          read: false,
          createdAt: serverTimestamp(),
          type: "order",
          orderId: orderId,
          imageUrl: "https://firebasestorage.googleapis.com/v0/b/localsza.firebasestorage.app/o/Thank%20You%20Banner.png?alt=media&token=81d2147b-f5ca-45e3-82ca-6e87dd4a0a4f"
        });
  
        // Create notification
        await addDoc(collection(db, 'users', userId, 'notifications'), {
          title: `New Order Placed`,
          body: `Your order #${orderId.slice(-6)} has been received and is being processed.`,
          read: false,
          createdAt: serverTimestamp(),
          type: "order",
          orderId: orderId
        });
      } catch (error) {
        console.error("Error creating order messages:", error);
        // Continue with order flow even if messaging fails
      }
    };

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

      // Get the order ID from response
      const data = res.data as { id?: string; orderId?: string };
      const orderId = data.id || data.orderId || '';

      // Create order confirmation message in user's inbox
      if (user) {
        await createOrderConfirmationMessage(orderId);
      }

      // on success clear cart and navigate to confirmation
      clearCart();
      navigate(`/order-confirmation/${orderId}`, { replace: true });
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