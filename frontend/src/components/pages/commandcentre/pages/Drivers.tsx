import { useEffect, useState } from 'react';
import {
  adminApi,
  type AdminDriver,
  type AdminDriverFull,
  type CreatedDriverResponse,
} from '../services/adminApi';
import { formatRand } from '../functions/formatters';
import StatCard from '../components/StatCard';

const VEHICLE_TYPES = ['bakkie', 'van', 'truck', 'motorbike'];

const EMPTY_FORM = {
  fullName: '', driverId: '', pin: '', email: '',
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
  const [drivers, setDrivers]         = useState<AdminDriverFull[]>([]);
  const [revenue, setRevenue]         = useState<AdminDriver[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [saving, setSaving]           = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [showPin, setShowPin]         = useState(false);
  // After creation: show credentials once
  const [credsModal, setCredsModal]   = useState<CreatedDriverResponse | null>(null);
  // Delete confirmation
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  // Edit driver
  const [editDriver, setEditDriver]   = useState<AdminDriverFull | null>(null);
  const [editForm, setEditForm]       = useState({ fullName: '', email: '', phoneNumber: '', vehicleType: 'bakkie', vehicleModel: '' });
  const [editSaving, setEditSaving]   = useState(false);

  useEffect(() => {
    Promise.all([adminApi.getDrivers(), adminApi.getDriverRevenue()])
      .then(([d, r]) => { setDrivers(d); setRevenue(r); })
      .catch(() => setError('Failed to load drivers.'))
      .finally(() => setLoading(false));
  }, []);

  const getRevData = (driverId: string) =>
    driverId ? revenue.find(r => r.driverId === driverId) : undefined;

  const totalTrips   = revenue.reduce((s, r) => s + r.completedTrips, 0);
  const totalPayout  = revenue.reduce((s, r) => s + r.estimatedPayout, 0);
  const platformCut  = totalPayout * 0.25;

  const handleCreate = async () => {
    if (!form.fullName.trim()) return;
    if (!form.pin.trim()) { setError('PIN is required'); return; }
    setSaving(true);
    setError(null);
    try {
      const created = await adminApi.createDriver({
        fullName:     form.fullName,
        pin:          form.pin,
        driverId:     form.driverId   || undefined,
        email:        form.email      || undefined,
        phoneNumber:  form.phoneNumber || undefined,
        vehicleType:  form.vehicleType,
        vehicleModel: form.vehicleModel || undefined,
      });
      setDrivers(prev => [...prev, created]);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setShowPin(false);
      setCredsModal(created);          // show credentials once
    } catch {
      setError('Failed to create driver account.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (driverId: string) => {
    if (!driverId) return;
    try {
      await adminApi.deleteDriver(driverId);
      // Remove by driver_id OR id — handles legacy docs where driver_id was empty
      setDrivers(prev => prev.filter(d => d.driver_id !== driverId && d.id !== driverId));
    } catch {
      setError('Failed to delete driver.');
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (d: AdminDriverFull) => {
    setEditDriver(d);
    setEditForm({
      fullName:     d.full_name,
      email:        d.email        ?? '',
      phoneNumber:  d.phone_number ?? '',
      vehicleType:  d.vehicle_type ?? 'bakkie',
      vehicleModel: d.vehicle_model ?? '',
    });
    setError(null);
  };

  const handleEdit = async () => {
    if (!editDriver) return;
    const id = editDriver.driver_id || editDriver.id;
    setEditSaving(true);
    setError(null);
    try {
      const updated = await adminApi.updateDriver(id, {
        fullName:     editForm.fullName     || undefined,
        email:        editForm.email        || undefined,
        phoneNumber:  editForm.phoneNumber  || undefined,
        vehicleType:  editForm.vehicleType  || undefined,
        vehicleModel: editForm.vehicleModel,
      });
      setDrivers(prev => prev.map(d => (d.driver_id === id || d.id === id) ? { ...d, ...updated } : d));
      setEditDriver(null);
    } catch {
      setError('Failed to update driver.');
    } finally {
      setEditSaving(false);
    }
  };

  const setEdit = (k: keyof typeof editForm, v: string) =>
    setEditForm(prev => ({ ...prev, [k]: v }));

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
        <StatCard label="Total Drivers"        value={drivers.length} />
        <StatCard label="Completed Trips"      value={totalTrips}             accent="#64b5f6" />
        <StatCard label="Driver Payouts (80%)" value={formatRand(totalPayout)} accent="#4CAF50" />
        <StatCard label="Platform Cut (20%)"   value={formatRand(platformCut)} accent="#FFB803" />
      </div>

      {loading && <p className="cc-loading">Loading…</p>}
      {error && !showCreate && <p className="cc-error">{error}</p>}

      {!loading && !error && (
        <div className="cc-drivers-grid">
          {drivers.map((d, i) => {
            // Use driver_id as key, fall back to id or index for legacy docs with empty driver_id
            const key = d.driver_id || d.id || `driver-${i}`;
            // Stable identifier for delete — prefer driver_id, fall back to id
            const deleteId = d.driver_id || d.id;
            const rev = getRevData(d.driver_id);
            return (
              <div key={key} className="cc-driver-card">
                <div className="cc-driver-card__header">
                  <div>
                    <div className="cc-driver-card__name">{d.full_name}</div>
                    <div className="cc-driver-card__id">{d.driver_id || d.id}</div>
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
                {/* Edit / Delete controls */}
                {deleteId && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    {deletingId !== deleteId && (
                      <button
                        className="cc-btn cc-btn--secondary"
                        style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                        onClick={() => openEdit(d)}
                      >
                        Edit
                      </button>
                    )}
                    {deletingId === deleteId ? (
                      <span style={{ fontSize: '0.78rem', color: '#888' }}>
                        Confirm delete?{' '}
                        <button
                          className="cc-btn cc-btn--danger"
                          style={{ fontSize: '0.78rem', padding: '2px 10px' }}
                          onClick={() => handleDelete(deleteId)}
                        >Yes, Delete</button>{' '}
                        <button
                          className="cc-btn cc-btn--secondary"
                          style={{ fontSize: '0.78rem', padding: '2px 10px' }}
                          onClick={() => setDeletingId(null)}
                        >Cancel</button>
                      </span>
                    ) : (
                      <button
                        className="cc-btn cc-btn--danger"
                        style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                        onClick={() => setDeletingId(deleteId)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
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
        at <code style={{ color: '#555' }}>/driverlogin</code> using their{' '}
        <strong>Driver ID</strong> + <strong>PIN</strong>.
      </p>

      {/* ── Create driver modal ── */}
      {showCreate && (
        <div className="cc-modal-overlay" onClick={() => setShowCreate(false)}>
          <div
            className="cc-modal"
            style={{ maxWidth: 520 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="cc-modal-header">
              <h2 className="cc-modal-title">New Driver Account</h2>
              <button className="cc-modal-close" onClick={() => { setShowCreate(false); setError(null); }}>✕</button>
            </div>

            <p style={{ color: '#666', fontSize: '0.8rem', margin: '0 0 1rem' }}>
              Driver logs in at <strong>/driverlogin</strong> using their{' '}
              <strong>Driver ID</strong> and <strong>PIN</strong>.
              The PIN will be shown <em>once</em> after creation — save it to share with the driver.
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
                <label className="cc-form-label">PIN * (4–8 digits)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="cc-form-input"
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={8}
                    value={form.pin}
                    onChange={e => set('pin', e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 1234"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(v => !v)}
                    style={{
                      position: 'absolute', right: '0.6rem', top: '50%',
                      transform: 'translateY(-50%)', background: 'none',
                      border: 'none', cursor: 'pointer', color: '#888', fontSize: '0.78rem',
                    }}
                  >
                    {showPin ? 'hide' : 'show'}
                  </button>
                </div>
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
                disabled={saving || !form.fullName.trim() || !form.pin.trim()}
              >
                {saving ? 'Creating…' : 'Create Driver'}
              </button>
              <button
                className="cc-btn cc-btn--secondary"
                onClick={() => { setShowCreate(false); setError(null); setForm(EMPTY_FORM); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Credentials modal (shown once after creation) ── */}
      {credsModal && (
        <div className="cc-modal-overlay" onClick={() => setCredsModal(null)}>
          <div
            className="cc-modal"
            style={{ maxWidth: 420 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="cc-modal-header">
              <h2 className="cc-modal-title">✅ Driver Created</h2>
              <button className="cc-modal-close" onClick={() => setCredsModal(null)}>✕</button>
            </div>

            <p style={{ color: '#555', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Share these login credentials with <strong>{credsModal.full_name}</strong>.
              The PIN cannot be retrieved again after you close this window.
            </p>

            <div style={{
              background: '#f5f5f5', borderRadius: '8px', padding: '1rem 1.25rem',
              border: '1px solid #ddd', marginBottom: '1rem',
            }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#888', display: 'block', marginBottom: '2px' }}>
                  Driver ID
                </span>
                <strong style={{ fontSize: '1.1rem', letterSpacing: '0.05em', color: '#111' }}>
                  {credsModal.credentials.driver_id}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#888', display: 'block', marginBottom: '2px' }}>
                  PIN
                </span>
                <strong style={{ fontSize: '1.1rem', letterSpacing: '0.2em', color: '#111' }}>
                  {credsModal.credentials.pin}
                </strong>
              </div>
            </div>

            <button
              className="cc-btn cc-btn--primary"
              style={{ width: '100%' }}
              onClick={() => {
                navigator.clipboard.writeText(
                  `Driver ID: ${credsModal.credentials.driver_id}\nPIN: ${credsModal.credentials.pin}`
                );
              }}
            >
              📋 Copy Credentials
            </button>

            <button
              className="cc-btn cc-btn--secondary"
              style={{ width: '100%', marginTop: '0.5rem' }}
              onClick={() => setCredsModal(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Edit driver modal ── */}
      {editDriver && (
        <div className="cc-modal-overlay" onClick={() => setEditDriver(null)}>
          <div
            className="cc-modal"
            style={{ maxWidth: 480 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="cc-modal-header">
              <h2 className="cc-modal-title">Edit Driver — {editDriver.full_name}</h2>
              <button className="cc-modal-close" onClick={() => setEditDriver(null)}>✕</button>
            </div>

            {error && <p className="cc-error">{error}</p>}

            <div className="cc-form-grid">
              <div className="cc-form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="cc-form-label">Full Name</label>
                <input
                  className="cc-form-input"
                  value={editForm.fullName}
                  onChange={e => setEdit('fullName', e.target.value)}
                  placeholder="Full name"
                />
              </div>

              <div className="cc-form-field">
                <label className="cc-form-label">Phone Number</label>
                <input
                  className="cc-form-input"
                  value={editForm.phoneNumber}
                  onChange={e => setEdit('phoneNumber', e.target.value)}
                  placeholder="+27 82 123 4567"
                />
              </div>

              <div className="cc-form-field">
                <label className="cc-form-label">Email</label>
                <input
                  type="email"
                  className="cc-form-input"
                  value={editForm.email}
                  onChange={e => setEdit('email', e.target.value)}
                  placeholder="driver@example.com"
                />
              </div>

              <div className="cc-form-field">
                <label className="cc-form-label">Vehicle Type</label>
                <select
                  className="cc-form-input"
                  value={editForm.vehicleType}
                  onChange={e => setEdit('vehicleType', e.target.value)}
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
                  value={editForm.vehicleModel}
                  onChange={e => setEdit('vehicleModel', e.target.value)}
                  placeholder="e.g. Toyota Hilux"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                className="cc-btn cc-btn--primary"
                style={{ minWidth: 120 }}
                onClick={handleEdit}
                disabled={editSaving}
              >
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                className="cc-btn cc-btn--secondary"
                onClick={() => { setEditDriver(null); setError(null); }}
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
