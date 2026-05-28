import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';
import axios from 'axios';
import '../../../assets/UI/loginReg.css';

const API_URL = import.meta.env.VITE_API_URL;

const DriverLogin: React.FC = () => {
  const [driverId, setDriverId] = useState('');
  const [pin, setPin]           = useState('');
  const [showPin, setShowPin]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();
  const auth = getAuth(app);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId.trim() || !pin.trim()) {
      setError('Driver ID and PIN are required.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // Step 1 — verify Driver ID + PIN (throws on 401/403 if invalid)
      await axios.post(`${API_URL}/api/drivers/verify-credentials`, {
        driver_id: driverId.trim(),
        pin:       pin.trim(),
      });

      // Step 2 — get Firebase custom token
      const tokenRes = await axios.post<{ customToken: string }>(`${API_URL}/api/drivers/login-link`, {
        driver_id: driverId.trim(),
      });

      // Step 3 — sign in with the custom token
      await signInWithCustomToken(auth, tokenRes.data.customToken);
      navigate('/driver/dashboard');
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError('Invalid Driver ID or PIN. Please check your credentials.');
      } else if (err.response?.status === 403) {
        setError('Your account is not active. Please contact support.');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.request) {
        setError('No response from server. Please check your connection.');
      } else {
        setError('Login failed. Please try again or contact support.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registerLogin-container driver-login-container">
      <img
        src="https://firebasestorage.googleapis.com/v0/b/localsza.firebasestorage.app/o/logos%2FdriverLogo.png?alt=media&token=f9413fdd-7ea8-43d9-a013-8161dd5bd34f"
        alt="Locals ZA"
        className="reg-logo"
      />

      <h1>LocalsZA</h1>
      <p className="driver-login-subtitle">Driver Login</p>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="app-form driver-login-form">
        <div className="form-group">
          <input
            type="text"
            id="driver-login-input"
            value={driverId}
            onChange={e => setDriverId(e.target.value)}
            placeholder="Driver ID (e.g. DRV-241103120045)"
            required
            autoComplete="username"
          />
        </div>

        <div className="form-group" style={{ position: 'relative' }}>
          <input
            type={showPin ? 'text' : 'password'}
            id="driver-pin-input"
            inputMode="numeric"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="PIN"
            required
            autoComplete="current-password"
            style={{ paddingRight: '3rem' }}
          />
          <button
            type="button"
            onClick={() => setShowPin(v => !v)}
            style={{
              position: 'absolute', right: '0.75rem', top: '50%',
              transform: 'translateY(-50%)', background: 'none',
              border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '0.8rem',
            }}
          >
            {showPin ? 'hide' : 'show'}
          </button>
        </div>

        <button type="submit" className="app-btn" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <div className="driver-help">
        <p>Need help? Email <strong className="help-cta">admin@locals-za.co.za</strong></p>
        <p>WhatsApp Support</p>
        <a
          href="https://wa.me/27682858930"
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-link"
          aria-label="Contact us on WhatsApp"
        >
          <div className="whatsapp-icon pulsate">
            <img width="48" height="48"
              src="https://img.icons8.com/color/48/whatsapp--v1.png"
              alt="WhatsApp Support"
            />
          </div>
        </a>
      </div>
      <a href="/" className="back-to-app">Back to Store</a>
    </div>
  );
};

export default DriverLogin;
