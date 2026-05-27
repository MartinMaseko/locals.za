import { useState, useEffect, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './driverStyles.css';

const API_URL = import.meta.env.VITE_API_URL;

interface DriverProfile {
  driver_id:    string;
  full_name:    string;
  status:       string;   // offline | available | on_delivery
  vehicle_type: string;
}

interface Job {
  id:               string;
  order_number:     string;
  status:           string;
  store_id:         string;
  delivery_address: {
    addressLine?: string;
    suburb?:      string;
    city?:        string;
    province?:    string;
    postal?:      string;
    [key: string]: any;
  };
  delivery_fee:  number;
  driver_payout: number;
  updated_at:    string;
  [key: string]: any;
}

const STATUS_LABEL: Record<string, string> = {
  assigned:        'New Job',
  accepted:        'Accepted',
  arrivedAtPickup: 'At Store',
  loaded:          'En Route',
  delivered:       'Delivered',
};

const STATUS_COLOR: Record<string, string> = {
  assigned:        '#FFB803',
  accepted:        '#64b5f6',
  arrivedAtPickup: '#ff8a00',
  loaded:          '#ba68c8',
  delivered:       '#4CAF50',
};

const getAddress = (addr: Job['delivery_address']): string => {
  if (!addr) return 'No address';
  const parts = [
    addr.addressLine || addr.address_line || '',
    addr.suburb || '',
    addr.city   || '',
  ].filter(Boolean);
  return parts.join(', ') || 'No address details';
};

const DriversDash = () => {
  const [profile, setProfile]   = useState<DriverProfile | null>(null);
  const [jobs, setJobs]         = useState<Job[]>([]);
  const [loading, setLoading]   = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError]       = useState('');
  const auth = getAuth(app);
  const navigate = useNavigate();

  const getToken = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  }, [auth]);

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [profileRes, jobsRes] = await Promise.all([
        axios.get<DriverProfile>(`${API_URL}/api/drivers/me`, { headers }),
        axios.get<Job[]>(`${API_URL}/api/drivers/me/jobs`,    { headers }),
      ]);

      setProfile(profileRes.data);
      setJobs(Array.isArray(jobsRes.data) ? jobsRes.data : []);
    } catch (err) {
      setError('Failed to load dashboard data. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleStatus = async () => {
    if (!profile) return;
    const newStatus = profile.status === 'available' ? 'offline' : 'available';
    setToggling(true);
    try {
      const token = await getToken();
      await axios.patch(
        `${API_URL}/api/drivers/me/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfile(prev => prev ? { ...prev, status: newStatus } : null);
    } catch {
      setError('Failed to update status. Please try again.');
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading dashboard…</p>
      </div>
    );
  }

  const activeJobs    = jobs.filter(j => j.status !== 'delivered');
  const completedJobs = jobs.filter(j => j.status === 'delivered');
  const isOnline      = profile?.status === 'available' || profile?.status === 'on_delivery';

  return (
    <div className="driver-stats-cards">

      {/* ── Status toggle card ── */}
      <div className="driver-stat-card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#aaa', fontSize: '0.75rem', marginBottom: 4 }}>
              {profile?.full_name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: isOnline ? '#4CAF50' : '#888',
                  display: 'inline-block',
                  boxShadow: isOnline ? '0 0 0 3px rgba(76,175,80,0.25)' : 'none',
                }}
              />
              <span style={{ fontWeight: 600, color: isOnline ? '#4CAF50' : '#aaa' }}>
                {profile?.status === 'on_delivery' ? 'On Delivery' : isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
          {profile?.status !== 'on_delivery' && (
            <button
              onClick={toggleStatus}
              disabled={toggling}
              style={{
                background: isOnline ? '#2a2a2a' : '#4CAF50',
                color:      isOnline ? '#aaa'    : '#fff',
                border:     `1px solid ${isOnline ? '#444' : '#4CAF50'}`,
                borderRadius: 20,
                padding: '8px 18px',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: toggling ? 'not-allowed' : 'pointer',
                opacity: toggling ? 0.6 : 1,
                transition: 'all 0.2s',
              }}
            >
              {toggling ? '…' : isOnline ? 'Go Offline' : 'Go Online'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{
          background: '#3a1a1a', color: '#ff6b6b', padding: '10px 14px',
          borderRadius: 8, fontSize: '0.82rem', margin: '0 0 8px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          {error}
          <button
            onClick={() => { setError(''); setLoading(true); fetchData(); }}
            style={{ background: 'none', border: 'none', color: '#ffb803', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Summary ── */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div className="driver-stat-card" style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: '0.8rem', color: '#aaa' }}>Active Jobs</h3>
          <p className="stat-number">{activeJobs.length}</p>
        </div>
        <div className="driver-stat-card" style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 6px', fontSize: '0.8rem', color: '#aaa' }}>Completed</h3>
          <p className="stat-number">{completedJobs.length}</p>
        </div>
      </div>

      {/* ── Active jobs ── */}
      <div className="driver-section">
        <h2>Active Jobs</h2>

        {activeJobs.length === 0 ? (
          <div className="no-orders-message" style={{ padding: '2rem 0' }}>
            <img
              src="https://img.icons8.com/ios-filled/100/999999/delivery.png"
              alt="No jobs"
              style={{ width: 60, opacity: 0.4, marginBottom: 12 }}
            />
            <p>{isOnline ? 'No jobs assigned yet — new deliveries will appear here.' : 'You are offline. Go online to receive jobs.'}</p>
          </div>
        ) : (
          <div className="driver-orders-list">
            {activeJobs.map(job => (
              <div key={job.id} className="driver-order-card">
                <div className="driver-order-header" style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="driver-order-id" style={{ fontWeight: 700 }}>
                      {job.order_number || `#${job.id.slice(-6).toUpperCase()}`}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#777', marginTop: 2 }}>
                      {getAddress(job.delivery_address)}
                    </div>
                  </div>
                  <span
                    className="driver-order-status"
                    style={{
                      background: STATUS_COLOR[job.status] ?? '#888',
                      color: ['assigned','arrivedAtPickup','loaded'].includes(job.status) ? '#111' : '#fff',
                      borderRadius: 12,
                      padding: '3px 10px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      marginTop: 0,
                    }}
                  >
                    {STATUS_LABEL[job.status] ?? job.status}
                  </span>
                </div>

                {job.delivery_fee > 0 && (
                  <div style={{ fontSize: '0.78rem', color: '#aaa', margin: '6px 0' }}>
                    Delivery fee: <strong style={{ color: '#ffb803' }}>R{job.delivery_fee.toFixed(2)}</strong>
                    {' '}· Your payout: <strong style={{ color: '#4CAF50' }}>R{(job.driver_payout || job.delivery_fee * 0.8).toFixed(2)}</strong>
                  </div>
                )}

                <div className="driver-order-actions" style={{ marginTop: 10 }}>
                  <button
                    className="driver-view-order-btn"
                    onClick={() => navigate(`/driver/deliveries/${job.id}`)}
                  >
                    {job.status === 'assigned' ? '⚡ Accept & View Job' : 'View Job'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Completed jobs (collapsed) ── */}
      {completedJobs.length > 0 && (
        <div className="driver-section">
          <h2>Completed Jobs ({completedJobs.length})</h2>
          <div className="driver-orders-list">
            {completedJobs.slice(0, 5).map(job => (
              <div key={job.id} className="driver-order-card" style={{ opacity: 0.65 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {job.order_number || `#${job.id.slice(-6).toUpperCase()}`}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#888' }}>
                      {getAddress(job.delivery_address)}
                    </div>
                  </div>
                  <strong style={{ color: '#4CAF50', fontSize: '0.9rem' }}>
                    R{(job.driver_payout || job.delivery_fee * 0.8).toFixed(2)}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default DriversDash;
