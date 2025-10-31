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

// Service fee rules: light vehicle categories = R60, van vehicle categories = R80
const VAN_FEE = 80;
const LIGHT_FEE = 60;

// Categories that require van vs light
const vanCategories = new Set([
  'Beverages', 'Canned Foods', 'Sugar', 'Flour', 'Cooking Oils & Fats', 'Rice', 'Maize Meal'
]);
const lightCategories = new Set([
  'Spices & Seasoning', 'Snacks & Confectionery', 'Household Cleaning & Goods', 'Laundry Supplies', 'Personal Care',
  'Shampoos & Cleansers','Conditioners & Treatments','Relaxers & Perm Kits','Hair Styling Products','Hair Food & Oils','Hair Coloring'
]);

const computeServiceFee = (cartItems: { product: any; qty: number }[]) => {
  let hasVan = false;
  let hasLight = false;
  for (const it of cartItems) {
    const cat = (it.product && it.product.category) ? String(it.product.category).trim() : '';
    if (!cat) {
      // Unknown category — treat conservatively as van
      hasVan = true;
      continue;
    }
    if (vanCategories.has(cat)) hasVan = true;
    else if (lightCategories.has(cat)) hasLight = true;
    else {
      // Unknown category name — treat as van to be safe
      hasVan = true;
    }
    // If both detected we can stop early
    if (hasVan && hasLight) break;
  }

  if (hasVan && hasLight) return { fee: VAN_FEE, type: 'Mixed' };
  if (hasVan) return { fee: VAN_FEE, type: 'Heavy' };
  if (hasLight) return { fee: LIGHT_FEE, type: 'Light' };
  // Default
  return { fee: VAN_FEE, type: 'Van' };
};

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
  // Field-level errors for inline feedback
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [cityError, setCityError] = useState('');
  const [postalError, setPostalError] = useState('');
  
  // Create a ref for PayFast form
  const payfastFormRef = useRef<HTMLFormElement>(null);

  const subtotal = cart.reduce((s, it) => {
    const price = typeof it.product.price === 'number' ? it.product.price : parseFloat(String(it.product.price || 0));
    return s + (isNaN(price) ? 0 : price * it.qty);
  }, 0);
  const { fee: serviceFee, type: deliveryType } = computeServiceFee(cart);
  const total = subtotal + serviceFee;

  // Validate and normalize fields. Returns cleaned values and valid flag.
  const validateFields = () => {
    // helper
    const normalize = (v: any) => {
      if (v === undefined || v === null) return '';
      let s = typeof v === 'string' ? v : String(v);
      s = s.replace(/\u00A0/g, ' ');
      s = s.trim();
      try { if (typeof (s as any).normalize === 'function') s = (s as any).normalize('NFKC'); } catch (e) {}
      s = s.replace(/\s+/g, ' ');
      return s;
    };

    // Clear previous field errors
    setNameError(''); setPhoneError(''); setAddressError(''); setCityError(''); setPostalError(''); setError('');

    const cleanName = normalize(name);
    const cleanPhoneRaw = normalize(phone);
    const cleanPhone = (cleanPhoneRaw.startsWith('+') ? '+' : '') + cleanPhoneRaw.replace(/[^\d]/g, '');
    const cleanAddress = normalize(addressLine);
    const cleanCity = normalize(city);
    const cleanPostal = normalize(postal);

    let ok = true;
    if (!cleanName || cleanName.length < 2) { setNameError('Please enter your full name (at least 2 characters)'); ok = false; }
    if (!cleanPhone || !/^\+?\d{7,15}$/.test(cleanPhone)) { setPhoneError('Please enter a valid phone number (digits only, optional +)'); ok = false; }
    if (!cleanAddress || cleanAddress.length < 5) { setAddressError('Please enter a valid delivery address'); ok = false; }
    // optional checks for city/postal (if provided)
    if (cleanCity && cleanCity.length < 2) { setCityError('City value is too short'); ok = false; }
    if (cleanPostal && cleanPostal.length < 2) { setPostalError('Postal code looks invalid'); ok = false; }

    return { valid: ok, cleanName, cleanPhone, cleanAddress, cleanCity, cleanPostal };
  };

  const placeOrder = async () => {
    if (!cart.length) return setError('Cart is empty');

    // Validate fields and get cleaned values
    const validated = validateFields();
    if (!validated.valid) return;

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

      // Create order payload using cleaned values from validation
      const payload = {
        items: cart.map(i => ({ productId: i.product.id, product: i.product, qty: i.qty })),
        subtotal,
        serviceFee,
        deliveryType,
        total,
        deliveryAddress: { name: validated.cleanName, phone: validated.cleanPhone, addressLine: validated.cleanAddress, city: validated.cleanCity, postal: validated.cleanPostal },
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
              <div>Service fee: R {Number(serviceFee).toFixed(2)}</div>
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
            aria-invalid={!!nameError}
            required
            maxLength={100}
            pattern={"[\\p{L} '\\-\\.]{2,100}"}
            title="Enter your full name (letters, spaces, - ' . allowed)"
          />
        {nameError && <div className="field-error">{nameError}</div>}
         <label>
          Phone
        </label>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            aria-invalid={!!phoneError}
            required
            inputMode="tel"
            maxLength={20}
            pattern="[+0-9 ()-]{7,20}"
            title="Enter a valid phone number"
          />
        {phoneError && <div className="field-error">{phoneError}</div>}
         <label>
          Address
        </label>
          <input
            value={addressLine}
            onChange={e => setAddressLine(e.target.value)}
            aria-invalid={!!addressError}
            required
            maxLength={200}
            title="Enter delivery address"
          />
        {addressError && <div className="field-error">{addressError}</div>}
         <label>
          City
        </label>
          <input value={city} onChange={e => setCity(e.target.value)} maxLength={100} aria-invalid={!!cityError} />
        {cityError && <div className="field-error">{cityError}</div>}
         <label>
          Postal code
        </label>
          <input value={postal} onChange={e => setPostal(e.target.value)} maxLength={20} aria-invalid={!!postalError} />
        {postalError && <div className="field-error">{postalError}</div>}

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