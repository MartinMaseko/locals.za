import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import axios from 'axios';
import './driverStyles.css';

const API_URL = import.meta.env.VITE_API_URL;

interface OrderItem {
  description: string;
  qty:         number;
  unit_price:  number;
  line_total:  number;
}

interface DriverReceipt {
  id:          string;
  orderId:     string;
  blobUrl:     string;
  storeName?:  string;
  items?:      Array<{
    description: string;
    qty:         number;
    unitPrice:   number;
    lineTotal:   number;
    estimatedKg: number;
  }>;
  weightClass: string;
  status:      string;
}

interface Job {
  id:               string;
  order_number:     string;
  status:           string;
  store_id:         string;
  customer_name:    string;
  contact_number:   string;
  delivery_address: {
    addressLine?: string;
    suburb?:      string;
    city?:        string;
    province?:    string;
    postal?:      string;
    [key: string]: any;
  };
  items:            OrderItem[];
  subtotal:         number;
  delivery_fee:     number;
  total:            number;
  driver_payout:    number;
  weight_class:     string;
  distance_km:      number;
  created_at:       string;
  updated_at:       string;
  [key: string]: any;
}

// Status progression shown to the driver
const NEXT_ACTION: Record<string, { label: string; color: string; textColor: string }> = {
  assigned:        { label: 'Accept Job',          color: '#FFB803', textColor: '#111' },
  accepted:        { label: 'Arrived at Store',    color: '#64b5f6', textColor: '#111' },
  arrivedAtPickup: { label: 'Order Loaded',         color: '#ff8a00', textColor: '#fff' },
  loaded:          { label: 'Mark as Delivered',   color: '#4CAF50', textColor: '#fff' },
};

const STATUS_LABEL: Record<string, string> = {
  assigned:        'Assigned',
  accepted:        'Accepted',
  arrivedAtPickup: 'At Store',
  loaded:          'En Route',
  delivered:       'Delivered',
};

const formatAddress = (addr: Job['delivery_address']): string => {
  if (!addr) return 'No address';
  return [
    addr.addressLine || addr.address_line || addr.street || '',
    addr.suburb   || '',
    addr.city     || '',
    addr.province || addr.province || '',
    addr.postal   || addr.postalCode || '',
  ].filter(Boolean).join(', ') || 'No address details';
};

const DriverDeliveries = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [job, setJob]               = useState<Job | null>(null);
  const [receipt, setReceipt]       = useState<DriverReceipt | null>(null);
  const [loading, setLoading]       = useState(true);
  const [advancing, setAdvancing]   = useState(false);
  const [error, setError]           = useState('');
  const [addressCopied, setAddrCopied] = useState(false);
  const [showPocModal, setShowPocModal] = useState(false);
  const [otpInput, setOtpInput]     = useState('');
  const [otpError, setOtpError]     = useState('');
  const navigate = useNavigate();
  const auth = getAuth(app);

  const getToken = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  }, [auth]);

  useEffect(() => {
    const fetch = async () => {
      if (!orderId) { setError('Order ID missing'); setLoading(false); return; }
      try {
        const token = await getToken();
        const res = await axios.get<Job>(
          `${API_URL}/api/drivers/me/jobs/${orderId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setJob(res.data);
        // Best-effort receipt fetch — not an error if it doesn't exist yet
        try {
          const rRes = await axios.get<DriverReceipt>(
            `${API_URL}/api/drivers/me/jobs/${orderId}/receipt`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setReceipt(rRes.data);
        } catch { /* receipt not confirmed yet — normal */ }
      } catch (err: any) {
        if (err.response?.status === 403)
          setError('You are not assigned to this job.');
        else if (err.response?.status === 404)
          setError('Job not found.');
        else
          setError('Failed to load job details.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [orderId, getToken]);

  const advanceStatus = async (pin?: string) => {
    if (!job || !NEXT_ACTION[job.status]) return;
    setAdvancing(true);
    setError('');
    setOtpError('');
    try {
      const token = await getToken();
      const res = await axios.patch<Job>(
        `${API_URL}/api/drivers/me/jobs/${job.id}/status`,
        pin ? { delivery_pin: pin } : {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setJob(res.data);
      setOtpInput('');
    } catch (err: any) {
      const msg = err.response?.data?.error;
      if (err.response?.status === 400 && msg === 'Invalid delivery PIN')
        setOtpError('Incorrect PIN — ask the customer for their delivery PIN.');
      else
        setError(msg || 'Failed to update status. Please try again.');
    } finally {
      setAdvancing(false);
    }
  };

  const copyAddress = async () => {
    if (!job) return;
    const text = formatAddress(job.delivery_address);
    try {
      await navigator.clipboard.writeText(text);
      setAddrCopied(true);
      setTimeout(() => setAddrCopied(false), 3000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setAddrCopied(true);
      setTimeout(() => setAddrCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading job details…</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error || 'Failed to load job'}</p>
        <button className="app-btn" onClick={() => navigate('/driver/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const nextAction = NEXT_ACTION[job.status];
  const isDelivered = job.status === 'delivered';
  const payout = job.driver_payout > 0 ? job.driver_payout : job.delivery_fee * 0.8;

  return (
    <div className="driver-delivery-page">

      {/* ── Header ── */}
      <div className="delivery-header">
        <button className="back-btn" onClick={() => navigate('/driver/dashboard')}>
          <img width="20" height="20"
            src="https://img.icons8.com/ios-filled/20/ffb803/back.png" alt="back" />
          Back to jobs
        </button>
        <h1>{job.order_number || `Order #${job.id.slice(-6).toUpperCase()}`}</h1>
        <div
          className="driver-order-status2"
          style={{
            background: isDelivered ? '#4CAF50' : '#FFB803',
            color: '#111',
          }}
        >
          {STATUS_LABEL[job.status] ?? job.status}
        </div>
      </div>

      {error && (
        <div style={{
          background: '#3a1a1a', color: '#ff6b6b', padding: '10px 14px',
          borderRadius: 8, margin: '12px 16px', fontSize: '0.82rem',
        }}>
          {error}
        </div>
      )}

      <div className="delivery-sections">

        {/* ── Customer / delivery info ── */}
        <div className="delivery-section customer-info">
          <h2>Delivery Info</h2>
          <div className="info-card">
            {job.customer_name && (
              <div className="info-row">
                <span className="info-label">Name: </span>
                <span className="info-value">{job.customer_name}</span>
              </div>
            )}
            {job.contact_number && (
              <div className="info-row">
                <span className="info-label">Phone: </span>
                <span className="info-value">
                  <a href={`tel:${job.contact_number}`} className="phone-link">
                    {job.contact_number}
                  </a>
                </span>
              </div>
            )}
            <div className="info-row">
              <span className="info-label">Address: </span>
              <span className="info-value address-value">
                {formatAddress(job.delivery_address)}
              </span>
            </div>
            {job.weight_class && (
              <div className="info-row">
                <span className="info-label">Weight: </span>
                <span className="info-value" style={{ textTransform: 'capitalize' }}>
                  {job.weight_class}
                </span>
              </div>
            )}
            {job.distance_km > 0 && (
              <div className="info-row">
                <span className="info-label">Distance: </span>
                <span className="info-value">{job.distance_km.toFixed(1)} km</span>
              </div>
            )}
            <div className="info-row">
              <span className="info-label">Your Payout: </span>
              <span className="info-value" style={{ color: '#4CAF50', fontWeight: 700 }}>
                R{payout.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="address-buttons">
            <button
              className={`add-address-btn ${addressCopied ? 'added' : ''}`}
              onClick={copyAddress}
            >
              {addressCopied ? (
                <>
                  <img width="18" height="18" src="https://img.icons8.com/ios-filled/20/ffffff/checkmark.png" alt="" />
                  Copied!
                </>
              ) : (
                <>
                  <img width="18" height="18" src="https://img.icons8.com/ios-filled/20/ffffff/copy.png" alt="" />
                  Copy Address
                </>
              )}
            </button>
            <a
              href={`https://waze.com/ul?q=${encodeURIComponent(formatAddress(job.delivery_address))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="show-route-btn"
              style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', justifyContent: 'center' }}
            >
              <img width="18" height="18" src="https://img.icons8.com/color/48/waze.png" alt="" />
              Open in Waze
            </a>
          </div>
        </div>

        {/* ── Items ── */}
        <div className="delivery-section order-items">
          <h2>Items</h2>
          {job.items && job.items.length > 0 ? (
            <div className="delivery-products-list">
              {job.items.map((item, i) => (
                <div key={i} className="driver-product-card" style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <div className="product-info" style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '0.9rem', margin: '0 0 4px' }}>{item.description}</h3>
                    <div className="product-meta" style={{ display: 'flex', gap: 12 }}>
                      <span style={{ fontSize: '0.78rem', color: '#888' }}>Qty: {item.qty}</span>
                      {item.unit_price > 0 && (
                        <span style={{ fontSize: '0.78rem', color: '#888' }}>
                          R{item.unit_price.toFixed(2)} ea
                        </span>
                      )}
                    </div>
                  </div>
                  {item.line_total > 0 && (
                    <div style={{ fontWeight: 600, color: '#212121', fontSize: '0.9rem' }}>
                      R{item.line_total.toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
              <div style={{
                borderTop: '1px solid #eee', paddingTop: 10, marginTop: 4,
                display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem',
              }}>
                <span style={{ color: '#666' }}>Total</span>
                <strong>R{job.total.toFixed(2)}</strong>
              </div>
            </div>
          ) : (
            <p style={{ color: '#888', fontSize: '0.85rem', padding: '8px 0' }}>
              No item details available.
            </p>
          )}

          {/* ── Status action button ── */}
          <div className="delivery-actions">
            {isDelivered ? (
              <button className="complete-order-btn delivered" disabled>
                <img width="20" height="20"
                  src="https://img.icons8.com/ios-filled/20/ffffff/checkmark.png" alt="" />
                Delivered
              </button>
            ) : job.status === 'loaded' ? (
              <div className="otp-entry-section">
                <p className="otp-label">Enter the customer's delivery PIN:</p>
                <input
                  className="otp-input"
                  type="tel"
                  maxLength={4}
                  value={otpInput}
                  onChange={e => { setOtpInput(e.target.value.replace(/\D/g, '')); setOtpError(''); }}
                  placeholder="1234"
                  inputMode="numeric"
                />
                {otpError && <p className="otp-error">{otpError}</p>}
                <button
                  className="collect-order-btn"
                  style={{
                    background: '#4CAF50', color: '#fff', fontWeight: 700, fontSize: '1rem',
                    border: 'none', borderRadius: 8, padding: '14px 20px',
                    cursor: advancing || otpInput.length !== 4 ? 'not-allowed' : 'pointer',
                    opacity: advancing || otpInput.length !== 4 ? 0.6 : 1,
                    transition: 'all 0.2s', width: '100%', marginTop: 4,
                  }}
                  onClick={() => advanceStatus(otpInput)}
                  disabled={advancing || otpInput.length !== 4}
                >
                  {advancing ? 'Verifying…' : 'Confirm Delivery'}
                </button>
              </div>
            ) : nextAction ? (
              <button
                className="collect-order-btn"
                onClick={job.status === 'arrivedAtPickup' ? () => setShowPocModal(true) : () => advanceStatus()}
                disabled={advancing}
                style={{
                  background: nextAction.color,
                  color: nextAction.textColor,
                  fontWeight: 700,
                  fontSize: '1rem',
                  border: 'none',
                  borderRadius: 8,
                  padding: '14px 20px',
                  cursor: advancing ? 'not-allowed' : 'pointer',
                  opacity: advancing ? 0.7 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {advancing ? 'Updating…' : nextAction.label}
              </button>
            ) : null}
          </div>
        </div>

        {/* ── Confirmed receipt image (shown at pickup and en route) ── */}
        {receipt && (job.status === 'arrivedAtPickup' || job.status === 'loaded') && (
          <div className="delivery-section receipt-section">
            <h2>Confirmed Receipt</h2>
            <p className="receipt-store-name">{receipt.storeName ?? 'Store receipt'}</p>
            <a href={receipt.blobUrl} target="_blank" rel="noopener noreferrer">
              <img src={receipt.blobUrl} alt="Confirmed receipt" className="driver-receipt-img" />
            </a>
            <p className="receipt-tap-hint">Tap image to view full size</p>
          </div>
        )}

      </div>

      {/* ── Proof of Collection modal ── */}
      {showPocModal && (
        <div className="driver-modal-overlay" onClick={() => setShowPocModal(false)}>
          <div className="driver-modal-card" onClick={e => e.stopPropagation()}>
            <h3 className="driver-modal-title">Confirm Items Loaded</h3>
            <p className="driver-modal-subtitle">
              Verify all items are in your vehicle before proceeding.
            </p>
            {receipt?.items && receipt.items.length > 0 ? (
              <ul className="poc-items-list">
                {receipt.items.map((item, i) => (
                  <li key={i} className="poc-item">
                    <span className="poc-item-qty">×{item.qty}</span>
                    <span className="poc-item-desc">{item.description}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="poc-no-items">No confirmed item list — use the receipt image above.</p>
            )}
            <div className="driver-modal-actions">
              <button
                className="poc-confirm-btn"
                onClick={async () => { setShowPocModal(false); await advanceStatus(); }}
                disabled={advancing}
              >
                {advancing ? 'Updating…' : 'All Items Loaded — Proceed'}
              </button>
              <button className="poc-cancel-btn" onClick={() => setShowPocModal(false)}>
                Check Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverDeliveries;
