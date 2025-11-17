import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../../contexts/CartContext';
import { Analytics } from '../../../../utils/analytics';
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
    'Shampoos & Cleansers', 'Conditioners & Treatments', 'Relaxers & Perm Kits', 'Hair Styling Products', 'Hair Food & Oils', 'Hair Coloring'
]);
const computeServiceFee = (cartItems) => {
    let hasVan = false;
    let hasLight = false;
    for (const it of cartItems) {
        const cat = (it.product && it.product.category) ? String(it.product.category).trim() : '';
        if (!cat) {
            // Unknown category — treat conservatively as van
            hasVan = true;
            continue;
        }
        if (vanCategories.has(cat))
            hasVan = true;
        else if (lightCategories.has(cat))
            hasLight = true;
        else {
            // Unknown category name — treat as van to be safe
            hasVan = true;
        }
        // If both detected we can stop early
        if (hasVan && hasLight)
            break;
    }
    if (hasVan && hasLight)
        return { fee: VAN_FEE, type: 'Mixed' };
    if (hasVan)
        return { fee: VAN_FEE, type: 'Heavy' };
    if (hasLight)
        return { fee: LIGHT_FEE, type: 'Light' };
    // Default
    return { fee: VAN_FEE, type: 'Van' };
};
const CheckoutPage = () => {
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
    const payfastFormRef = useRef(null);
    const subtotal = cart.reduce((s, it) => {
        const price = typeof it.product.price === 'number' ? it.product.price : parseFloat(String(it.product.price || 0));
        return s + (isNaN(price) ? 0 : price * it.qty);
    }, 0);
    const { fee: serviceFee, type: deliveryType } = computeServiceFee(cart);
    const total = subtotal + serviceFee;
    // Track cart abandonment when leaving checkout
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (cart.length > 0) {
                Analytics.trackCartAbandonment(cart, total);
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [cart, total]);
    // Track initial checkout step
    useEffect(() => {
        if (cart.length > 0) {
            Analytics.trackCheckoutStep(1, 'delivery_details');
        }
    }, [cart.length]);
    // Validate and normalize fields. Returns cleaned values and valid flag.
    const validateFields = () => {
        // helper
        const normalize = (v) => {
            if (v === undefined || v === null)
                return '';
            let s = typeof v === 'string' ? v : String(v);
            s = s.replace(/\u00A0/g, ' ');
            s = s.trim();
            try {
                if (typeof s.normalize === 'function')
                    s = s.normalize('NFKC');
            }
            catch (e) { }
            s = s.replace(/\s+/g, ' ');
            return s;
        };
        // Clear previous field errors
        setNameError('');
        setPhoneError('');
        setAddressError('');
        setCityError('');
        setPostalError('');
        setError('');
        const cleanName = normalize(name);
        const cleanPhoneRaw = normalize(phone);
        const cleanPhone = (cleanPhoneRaw.startsWith('+') ? '+' : '') + cleanPhoneRaw.replace(/[^\d]/g, '');
        const cleanAddress = normalize(addressLine);
        const cleanCity = normalize(city);
        const cleanPostal = normalize(postal);
        let ok = true;
        if (!cleanName || cleanName.length < 2) {
            setNameError('Please enter your full name (at least 2 characters)');
            ok = false;
            Analytics.trackFormCompletion('checkout_form', false, 'invalid_name');
        }
        if (!cleanPhone || !/^\+?\d{7,15}$/.test(cleanPhone)) {
            setPhoneError('Please enter a valid phone number (digits only, optional +)');
            ok = false;
            Analytics.trackFormCompletion('checkout_form', false, 'invalid_phone');
        }
        if (!cleanAddress || cleanAddress.length < 5) {
            setAddressError('Please enter a valid delivery address');
            ok = false;
        }
        // optional checks for city/postal (if provided)
        if (cleanCity && cleanCity.length < 2) {
            setCityError('City value is too short');
            ok = false;
        }
        if (cleanPostal && cleanPostal.length < 2) {
            setPostalError('Postal code looks invalid');
            ok = false;
        }
        if (ok) {
            Analytics.trackFormCompletion('checkout_form', true);
        }
        return { valid: ok, cleanName, cleanPhone, cleanAddress, cleanCity, cleanPostal };
    };
    const placeOrder = async () => {
        if (!cart.length)
            return setError('Cart is empty');
        const validated = validateFields();
        if (!validated.valid)
            return;
        setLoading(true);
        setError('');
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            const token = user ? await user.getIdToken() : null;
            if (!user) {
                setError('You must be logged in to place an order.');
                setLoading(false);
                return;
            }
            // Create order payload
            const payload = {
                items: cart.map(i => ({ productId: i.product.id, product: i.product, qty: i.qty })),
                subtotal,
                serviceFee,
                deliveryType,
                total,
                deliveryAddress: {
                    name: validated.cleanName,
                    phone: validated.cleanPhone,
                    addressLine: validated.cleanAddress,
                    city: validated.cleanCity,
                    postal: validated.cleanPostal
                },
                status: 'pending_payment',
                createdAt: new Date().toISOString(),
                userId: user?.uid || 'guest',
                email: user?.email || '',
            };
            // Step 1: Create order
            const res = await axios.post(`${API_URL}/api/orders`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            // Type assertion for order response
            const orderRes = res;
            const orderId = orderRes.data.id || orderRes.data.orderId || '';
            if (!orderId) {
                throw new Error('Failed to create order - no order ID returned');
            }
            console.log(`Order created with ID: ${orderId}`);
            // Step 2: Get payment form data from backend
            const paymentRes = await axios.post(`${API_URL}/api/payment/process/${orderId}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            // Type assertion for payment response
            const paymentData = paymentRes.data;
            clearCart();
            // Step 3: Submit form to PayFast
            if (paymentData.formData && paymentData.url) {
                if (payfastFormRef.current) {
                    payfastFormRef.current.action = paymentData.url;
                    payfastFormRef.current.innerHTML = '';
                    // Add all form data as hidden inputs - maintain PayFast field order
                    Object.keys(paymentData.formData).forEach(key => {
                        const input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = key;
                        input.value = String(paymentData.formData[key] || '');
                        payfastFormRef.current?.appendChild(input);
                    });
                    console.log('Submitting to PayFast:', paymentData.url);
                    console.log('Form data keys:', Object.keys(paymentData.formData));
                    payfastFormRef.current.submit();
                }
                else {
                    // Fallback: redirect directly if form ref is unavailable
                    console.warn('PayFast form ref not available, redirecting directly');
                    window.location.href = paymentData.url;
                }
            }
            else {
                throw new Error('Payment data not received from server');
            }
        }
        catch (err) {
            console.error('Order placement error:', err);
            setError(err?.response?.data?.message || 'Failed to place order');
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "checkout-page", children: [_jsx("h1", { children: "Checkout" }), _jsxs("section", { className: "checkout-items", children: [_jsx("h2", { children: "Order details" }), cart.length === 0 ? _jsx("p", { children: "Your cart is empty." }) : (_jsxs(_Fragment, { children: [_jsx("ul", { className: 'checkout-list', children: cart.map(it => (_jsxs("li", { className: 'checkout-item', children: [_jsx(ProductCard, { product: it.product }), _jsxs("div", { children: ["Qty: ", it.qty] })] }, it.product.id))) }), _jsxs("div", { className: 'billing-summary', children: [_jsxs("div", { children: ["Subtotal: R ", subtotal.toFixed(2)] }), _jsxs("div", { children: ["Service fee: R ", Number(serviceFee).toFixed(2)] }), _jsx("div", { className: 'total-bill', children: _jsxs("strong", { children: ["Total: R ", total.toFixed(2)] }) })] })] }))] }), _jsxs("section", { className: "checkout-form", children: [_jsx("h2", { children: "Delivery Details" }), error && _jsx("div", { className: "error", children: error }), _jsx("label", { children: "Full name" }), _jsx("input", { value: name, onChange: e => setName(e.target.value), "aria-invalid": !!nameError, required: true, maxLength: 100, pattern: "[\\p{L} '\\-\\.]{2,100}", title: "Enter your full name (letters, spaces, - ' . allowed)" }), nameError && _jsx("div", { className: "field-error", children: nameError }), _jsx("label", { children: "Phone" }), _jsx("input", { value: phone, onChange: e => setPhone(e.target.value), "aria-invalid": !!phoneError, required: true, inputMode: "tel", maxLength: 20, pattern: "[+0-9 ()-]{7,20}", title: "Enter a valid phone number" }), phoneError && _jsx("div", { className: "field-error", children: phoneError }), _jsx("label", { children: "Address" }), _jsx("input", { value: addressLine, onChange: e => setAddressLine(e.target.value), "aria-invalid": !!addressError, required: true, maxLength: 200, title: "Enter delivery address" }), addressError && _jsx("div", { className: "field-error", children: addressError }), _jsx("label", { children: "City" }), _jsx("input", { value: city, onChange: e => setCity(e.target.value), maxLength: 100, "aria-invalid": !!cityError }), cityError && _jsx("div", { className: "field-error", children: cityError }), _jsx("label", { children: "Postal code" }), _jsx("input", { value: postal, onChange: e => setPostal(e.target.value), maxLength: 20, "aria-invalid": !!postalError }), postalError && _jsx("div", { className: "field-error", children: postalError }), _jsxs("div", { className: "payfast-information", children: [_jsxs("div", { className: "payfast-logos", children: [_jsx("img", { src: PayfastLogo, alt: "PayFast Logo", className: "payfast-logo" }), _jsx("img", { src: InstantEftLogo, alt: "Instant EFT Logo", className: "instanteft-logo" })] }), _jsx("h3", { children: "Payment via PayFast" }), _jsx("p", { children: "You will be redirected to PayFast to complete your payment securely. Please ensure all details are correct before proceeding." })] }), _jsxs("div", { className: 'checkout-actions', children: [_jsx("button", { className: 'place-order-button', type: "button", disabled: loading, onClick: placeOrder, children: loading ? 'Processing...' : 'Proceed to Payment' }), _jsx("button", { className: 'cancel-button', type: "button", onClick: () => navigate(-1), children: "Cancel" })] })] }), _jsx("form", { ref: payfastFormRef, method: "POST", action: "", style: { display: 'none' }, acceptCharset: "UTF-8", encType: "application/x-www-form-urlencoded" })] }));
};
export default CheckoutPage;
