import { useState, useEffect, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './driverStyles.css';

const API_URL = import.meta.env.VITE_API_URL;

interface RevenueSummary {
  today:   number;
  week:    number;
  month:   number;
  allTime: number;
  trips:   number;
}

interface DriverProfile {
  full_name: string;
  driver_id: string;
  status:    string;
}

const fmt = (n: number) => `R${n.toFixed(2)}`;

const DriverRevenue = () => {
  const [revenue, setRevenue]   = useState<RevenueSummary | null>(null);
  const [profile, setProfile]   = useState<DriverProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const auth = getAuth(app);
  const navigate = useNavigate();

  const getToken = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  }, [auth]);

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) { navigate('/driverlogin'); return; }
      try {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const [revRes, profRes] = await Promise.all([
          axios.get<RevenueSummary>(`${API_URL}/api/drivers/me/revenue`, { headers }),
          axios.get<DriverProfile>(`${API_URL}/api/drivers/me`,          { headers }),
        ]);

        setRevenue(revRes.data);
        setProfile(profRes.data);
      } catch {
        setError('Failed to load revenue data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [auth, navigate, getToken]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading earnings…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="driver-revenue-page">
        <div className="driver-revenue-header">
          <h1>Earnings</h1>
        </div>
        <div style={{
          background: '#3a1a1a', color: '#ff6b6b', padding: '14px 16px',
          borderRadius: 8, fontSize: '0.85rem',
        }}>
          {error}
        </div>
      </div>
    );
  }

  const r = revenue!;

  return (
    <div className="driver-revenue-page">
      <div className="driver-revenue-header">
        <h1>Driver Earnings</h1>
        {profile?.full_name && (
          <p className="driver-name">Welcome back, {profile.full_name}</p>
        )}
      </div>

      {/* ── Payout note ── */}
      <p style={{
        background: '#1a2a1a', color: '#4CAF50', borderRadius: 8,
        padding: '10px 14px', fontSize: '0.8rem', marginBottom: '1rem',
      }}>
        Your earnings are <strong>80%</strong> of each delivery fee, calculated automatically on delivery.
      </p>

      {/* ── Revenue cards ── */}
      <div className="driver-revenue-cards">
        <div className="revenue-card available-revenue">
          <h2>Today</h2>
          <p className="revenue-amount">{fmt(r.today)}</p>
        </div>
        <div className="revenue-card total-revenue">
          <h2>This Week</h2>
          <p className="revenue-amount">{fmt(r.week)}</p>
        </div>
        <div className="revenue-card cashed-out">
          <h2>This Month</h2>
          <p className="revenue-amount">{fmt(r.month)}</p>
        </div>
      </div>

      {/* ── All-time summary ── */}
      <div className="revenue-card" style={{ marginTop: '1rem', textAlign: 'left', padding: '1.1rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ color: '#666', fontSize: '0.9rem' }}>Total Delivered</span>
          <strong>{r.trips} {r.trips === 1 ? 'trip' : 'trips'}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#666', fontSize: '0.9rem' }}>All-Time Earnings</span>
          <strong style={{ color: '#4CAF50', fontSize: '1.1rem' }}>{fmt(r.allTime)}</strong>
        </div>
      </div>

      {r.trips === 0 && (
        <div style={{
          marginTop: '1.5rem', textAlign: 'center',
          color: '#888', fontSize: '0.85rem',
        }}>
          <p>No completed deliveries yet.</p>
          <p>Accept jobs from your dashboard to start earning.</p>
        </div>
      )}
    </div>
  );
};

export default DriverRevenue;
