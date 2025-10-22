import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../../contexts/CartContext';
import ProductCard from '../productview/productsCard';
import axios from 'axios';
import { getAuth } from 'firebase/auth';
import PayfastLogo from '../../../assets/images/Payfastlogo.webp';
import InstantEftLogo from '../../../assets/images/instantEFT.webp';
import './cartstyle.css';

const API_URL = import.meta.env.VITE_API_URL;

const SERVICE_FEE = 80;

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
  
  // Create a ref for PayFast form
  const payfastFormRef = useRef<HTMLFormElement>(null);

  const subtotal = cart.reduce((s, it) => {
    const price = typeof it.product.price === 'number' ? it.product.price : parseFloat(String(it.product.price || 0));
    return s + (isNaN(price) ? 0 : price * it.qty);
  }, 0);
  const total = subtotal + SERVICE_FEE;

  const placeOrder = async () => {
    if (!cart.length) return setError('Cart is empty');

    // Client-side normalization helper (trim + NFKC + collapse spaces)
    const normalize = (v: any) => {
      if (v === undefined || v === null) return '';
      let s = typeof v === 'string' ? v : String(v);
      s = s.replace(/\u00A0/g, ' '); // replace non-breaking spaces
      s = s.trim();
      try {
        if (typeof (s as any).normalize === 'function') s = (s as any).normalize('NFKC');
      } catch (e) { /* ignore */ }
      s = s.replace(/\s+/g, ' ');
      return s;
    };

    // Clean inputs
    const cleanName = normalize(name);
    const cleanPhoneRaw = normalize(phone);
    // Keep only digits and leading + sign for phone
    const cleanPhone = (cleanPhoneRaw.startsWith('+') ? '+' : '') + cleanPhoneRaw.replace(/[^\d]/g, '');
    const cleanAddress = normalize(addressLine);
    const cleanCity = normalize(city);
    const cleanPostal = normalize(postal);

    // Basic client-side validation
    if (!cleanName || cleanName.length < 2) return setError('Please enter a valid full name');
    if (!cleanPhone || !/^\+?\d{7,15}$/.test(cleanPhone)) return setError('Please enter a valid phone number');
    if (!cleanAddress || cleanAddress.length < 5) return setError('Please enter a valid address');

    setLoading(true);
    setError('');

    try {
      // Get authentication token if user is logged in
      const auth = getAuth();
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;

      if (!user) {
        setError('You must be logged in to place an order.');
        setLoading(false);
        return;
      }

      // Create order payload using cleaned values
      const payload = {
        items: cart.map(i => ({ productId: i.product.id, product: i.product, qty: i.qty })),
        subtotal,
        serviceFee: SERVICE_FEE,
        total,
        deliveryAddress: { name: cleanName, phone: cleanPhone, addressLine: cleanAddress, city: cleanCity, postal: cleanPostal },
        status: 'pending_payment',
        createdAt: new Date().toISOString(),
        userId: user?.uid || 'guest',
        email: user?.email || '',
      };

      // Step 1: Create the order in the system
      const res = await axios.post(`${API_URL}/api/api/orders`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      // Get the order ID from response
      const data = res.data as { id?: string; orderId?: string };
      const orderId = data.id || data.orderId || '';

      if (!orderId) {
        throw new Error('Failed to create order - no order ID returned');
      }

      console.log(`Order created with ID: ${orderId}`);

      // Step 2: Initialize payment with PayFast
      type PaymentInitResponse = {
        formData?: Record<string, string | number | boolean>;
        url?: string;
        fullUrl?: string;
      };

      const paymentRes = await axios.post<PaymentInitResponse>(`${API_URL}/api/api/payment/process/${orderId}`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      
      // Clear cart after successful order creation
      clearCart();
      
      // Step 3: Redirect to PayFast
      const paymentData = paymentRes.data || {};
      if (paymentData.formData) {
        console.log('Redirecting to PayFast...');
        
        // Method 1: Form submission (recommended by PayFast)
        if (payfastFormRef.current) {
          const formData = paymentData.formData;
          const formUrl = paymentData.url || '';
          
          // Set form action URL
          payfastFormRef.current.action = formUrl;
          payfastFormRef.current.innerHTML = '';
          
          // Create hidden inputs for each field
          Object.keys(formData).forEach(key => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = String(formData[key]);
            payfastFormRef.current?.appendChild(input);
          });
          
          // Optional: log formData briefly for debugging (remove after verification)
          // console.log('Submitting PayFast form data:', formData);

          // Submit the form
          payfastFormRef.current.submit();
        } else {
          // Method 2: Direct URL redirect (fallback)
          window.location.href = paymentData.fullUrl || paymentData.url || '';
        }
      } else {
        throw new Error('Payment data not received');
      }
    } catch (err: any) {
      console.error('Order placement error:', err);
      setError(err?.response?.data?.message || 'Failed to place order');
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
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            maxLength={100}
            pattern={"[\\p{L} '\\-\\.]{2,100}"}
            title="Enter your full name (letters, spaces, - ' . allowed)"
          />
         <label>
          Phone
        </label>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
            inputMode="tel"
            maxLength={20}
            pattern="[+0-9 ()-]{7,20}"
            title="Enter a valid phone number"
          />
         <label>
          Address
        </label>
          <input
            value={addressLine}
            onChange={e => setAddressLine(e.target.value)}
            required
            maxLength={200}
            title="Enter delivery address"
          />
         <label>
          City
        </label>
          <input value={city} onChange={e => setCity(e.target.value)} maxLength={100} />
         <label>
          Postal code
        </label>
          <input value={postal} onChange={e => setPostal(e.target.value)} maxLength={20} />

        <div className="payfast-information">
          <div className="payfast-logos">
            <img src={PayfastLogo} alt="PayFast Logo" className="payfast-logo" />
            <img src={InstantEftLogo} alt="Instant EFT Logo" className="instanteft-logo" />
          </div>
          <h3>Payment via PayFast</h3>
          <p>
            You will be redirected to PayFast to complete your payment securely.
            Please ensure all details are correct before proceeding.
          </p>
        </div>

        <div className='checkout-actions'>
          <button 
            className='place-order-button' 
            type="button" 
            disabled={loading} 
            onClick={placeOrder}
          >
            {loading ? 'Processing...' : 'Proceed to Payment'}
          </button>
          <button 
            className='cancel-button' 
            type="button" 
            onClick={() => navigate(-1)}
          >
            Cancel
          </button>
        </div>
      </section>
      
      {/* Hidden form for PayFast submission */}
      <form 
        ref={payfastFormRef}
        method="POST" 
        action=""
        style={{ display: 'none' }}
      ></form>
    </div>
  );
};

export default CheckoutPage;