import { useEffect, useState } from 'react';
import {
  adminApi,
  type AdminDriver,
  type AdminDriverFull,
} from '../services/adminApi';
import { formatRand } from '../functions/formatters';
import StatCard from '../components/StatCard';

const VEHICLE_TYPES = ['bakkie', 'van', 'truck', 'motorbike'];

const EMPTY_FORM = {
  fullName: '', driverId: '', email: '',
  phoneNumber: '', vehicleType: 'bakkie', vehicleModel: '',
};

const statusChip = (status: string) => {
  const map: Record<string, string> = {
    available:   'available',
    offline:     'offline',
    on_delivery: 'on-delivery',
  };
  return `cc-status-chip cc-status-chip--${map[status] ?? 'offline'}`;
};

const Drivers = () => {
  const [drivers, setDrivers]       = useState<AdminDriverFull[]>([]);
  const [revenue, setRevenue]       = useState<AdminDriver[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);

  useEffect(() => {
    Promise.all([adminApi.getDrivers(), adminApi.getDriverRevenue()])
      .then(([d, r]) => { setDrivers(d); setRevenue(r); })
      .catch(() => setError('Failed to load drivers.'))
      .finally(() => setLoading(false));
  }, []);

  const getRevData = (driverId: string) =>
    revenue.find(r => r.driverId === driverId);

  const totalTrips   = revenue.reduce((s, r) => s + r.completedTrips, 0);
  const totalPayout  = revenue.reduce((s, r) => s + r.estimatedPayout, 0);
  const platformCut  = revenue.reduce((s, r) => s + r.estimatedPayout * 0.25, 0);

  const handleCreate = async () => {
    if (!form.fullName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await adminApi.createDriver({
        fullName:     form.fullName,
        driverId:     form.driverId   || undefined,
        email:        form.email      || undefined,
        phoneNumber:  form.phoneNumber || undefined,
        vehicleType:  form.vehicleType,
        vehicleModel: form.vehicleModel || undefined,
      });
      setDrivers(prev => [...prev, created]);
      setShowCreate(false);
      setForm(EMPTY_FORM);
    } catch {
      setError('Failed to create driver account.');
    } finally {
      setSaving(false);
    }
  };

  const set = (k: keyof typeof EMPTY_FORM, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div>
      <div className="cc-page-header">
        <h1 className="cc-page-title">Drivers</h1>
        <button className="cc-btn cc-btn--primary" onClick={() => setShowCreate(true)}>
          + New Driver
        </button>
      </div>

      <div className="cc-stat-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard label="Total Drivers"      value={drivers.length} />
        <StatCard label="Completed Trips"    value={totalTrips}              accent="#64b5f6" />
        <StatCard label="Driver Payouts (80%)" value={formatRand(totalPayout)}  accent="#4CAF50" />
        <StatCard label="Platform Cut (20%)" value={formatRand(platformCut)} accent="#FFB803" />
      </div>

      {loading && <p className="cc-loading">Loading…</p>}
      {error && !showCreate && <p className="cc-error">{error}</p>}

      {!loading && !error && (
        <div className="cc-drivers-grid">
          {drivers.map(d => {
            const rev = getRevData(d.driver_id);
            return (
              <div key={d.driver_id} className="cc-driver-card">
                <div className="cc-driver-card__header">
                  <div>
                    <div className="cc-driver-card__name">{d.full_name}</div>
                    <div className="cc-driver-card__id">{d.driver_id}</div>
                  </div>
                  <span className={statusChip(d.status)}>
                    {d.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="cc-driver-card__meta">
                  {d.phone_number && <span>{d.phone_number}</span>}
                  {d.vehicle_type && (
                    <span style={{ textTransform: 'capitalize' }}>
                      {d.vehicle_type}{d.vehicle_model ? ` — ${d.vehicle_model}` : ''}
                    </span>
                  )}
                  {d.email && <span style={{ color: '#555' }}>{d.email}</span>}
                </div>
                <div className="cc-driver-card__stats">
                  <div className="cc-driver-stat">
                    <span className="cc-driver-stat__label">Trips</span>
                    <span className="cc-driver-stat__value">{rev?.completedTrips ?? 0}</span>
                  </div>
                  <div className="cc-driver-stat">
                    <span className="cc-driver-stat__label">Payout (80%)</span>
                    <span className="cc-driver-stat__value" style={{ color: '#4CAF50' }}>
                      {formatRand(rev?.estimatedPayout ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {drivers.length === 0 && (
            <p style={{ color: '#555', gridColumn: '1 / -1', padding: '2rem 0' }}>
              No drivers yet — click <strong>+ New Driver</strong> to add one.
            </p>
          )}
        </div>
      )}

      <p style={{ color: '#333', fontSize: '0.72rem', marginTop: '1.5rem' }}>
        Payout model: 80% of delivery fee to driver · 20% platform fee · drivers log in
        at <code style={{ color: '#555' }}>/driverlogin</code> using their Full Name + Driver ID.
      </p>

      {/* ── Create driver modal ── */}
      {showCreate && (
        <div className="cc-modal-overlay" onClick={() => setShowCreate(false)}>
          <div
            className="cc-modal"
            style={{ maxWidth: 500 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="cc-modal-header">
              <h2 className="cc-modal-title">New Driver Account</h2>
              <button className="cc-modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>

            <p style={{ color: '#666', fontSize: '0.8rem', margin: '0 0 1rem' }}>
              Driver logs in at <strong>/driverlogin</strong> using their{' '}
              <strong>Full Name</strong> and <strong>Driver ID</strong>.
            </p>

            {error && <p className="cc-error">{error}</p>}

            <div className="cc-form-grid">
              <div className="cc-form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="cc-form-label">Full Name *</label>
                <input
                  className="cc-form-input"
                  value={form.fullName}
                  onChange={e => set('fullName', e.target.value)}
                  placeholder="e.g. Sipho Nkosi"
                />
              </div>

              <div className="cc-form-field">
                <label className="cc-form-label">Driver ID</label>
                <input
                  className="cc-form-input"
                  value={form.driverId}
                  onChange={e => set('driverId', e.target.value)}
                  placeholder="Auto-generated if blank"
                />
              </div>

              <div className="cc-form-field">
                <label className="cc-form-label">Phone Number</label>
                <input
                  className="cc-form-input"
                  value={form.phoneNumber}
                  onChange={e => set('phoneNumber', e.target.value)}
                  placeholder="+27 82 123 4567"
                />
              </div>

              <div className="cc-form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="cc-form-label">Email</label>
                <input
                  type="email"
                  className="cc-form-input"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="driver@example.com"
                />
              </div>

              <div className="cc-form-field">
                <label className="cc-form-label">Vehicle Type</label>
                <select
                  className="cc-form-input"
                  value={form.vehicleType}
                  onChange={e => set('vehicleType', e.target.value)}
                >
                  {VEHICLE_TYPES.map(v => (
                    <option key={v} value={v} style={{ textTransform: 'capitalize' }}>
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cc-form-field">
                <label className="cc-form-label">Vehicle Model</label>
                <input
                  className="cc-form-input"
                  value={form.vehicleModel}
                  onChange={e => set('vehicleModel', e.target.value)}
                  placeholder="e.g. Toyota Hilux"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                className="cc-btn cc-btn--primary"
                style={{ minWidth: 130 }}
                onClick={handleCreate}
                disabled={saving || !form.fullName.trim()}
              >
                {saving ? 'Creating…' : 'Create Driver'}
              </button>
              <button
                className="cc-btn cc-btn--secondary"
                onClick={() => { setShowCreate(false); setError(null); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Drivers;
