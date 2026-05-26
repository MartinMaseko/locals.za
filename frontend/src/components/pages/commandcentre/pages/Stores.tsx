import { useEffect, useRef, useState } from 'react';
import { adminApi, type AdminStore, type StoreForm } from '../services/adminApi';

const EMPTY_FORM: StoreForm = {
  name: '', tagline: '', initials: '', color: '#FFB803',
  address: '', lat: 0, lng: 0, active: true, logoUrl: '',
};

const Stores = () => {
  const [stores, setStores]     = useState<AdminStore[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [editing, setEditing]   = useState<AdminStore | null>(null);
  const [form, setForm]         = useState<StoreForm>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [logoPreview, setLogoPreview]     = useState<string | null>(null);
  const [logoFile, setLogoFile]           = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    adminApi.getStores()
      .then(setStores)
      .catch(() => setError('Failed to load stores.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setLogoPreview(null);
    setLogoFile(null);
    setShowForm(true);
    setError(null);
  };

  const openEdit = (store: AdminStore) => {
    setEditing(store);
    setForm({ ...store });
    setLogoPreview(store.logoUrl ?? null);
    setLogoFile(null);
    setShowForm(true);
    setError(null);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const set = (key: keyof StoreForm, val: string | number | boolean) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.address.trim()) {
      setError('Name and address are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let savedForm = { ...form };
      if (logoFile) {
        const url = await adminApi.uploadStoreLogo(logoFile);
        savedForm = { ...savedForm, logoUrl: url };
        setForm(prev => ({ ...prev, logoUrl: url }));
      }
      if (editing) {
        const updated = await adminApi.updateStore(editing.id, savedForm);
        setStores(prev => prev.map(s => s.id === editing.id ? updated : s));
      } else {
        const created = await adminApi.createStore(savedForm);
        setStores(prev => [...prev, created]);
      }
      setLogoFile(null);
      setShowForm(false);
    } catch {
      setError('Failed to save store.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (store: AdminStore) => {
    try {
      const updated = store.active
        ? await adminApi.deactivateStore(store.id)
        : await adminApi.activateStore(store.id);
      setStores(prev => prev.map(s => s.id === store.id ? updated : s));
    } catch {
      setError('Failed to update store status.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteStore(id);
      setStores(prev => prev.filter(s => s.id !== id));
      setConfirmDelete(null);
    } catch {
      setError('Failed to delete store.');
    }
  };

  return (
    <div>
      <div className="cc-page-header">
        <h1 className="cc-page-title">Stores</h1>
        <button className="cc-btn cc-btn--primary" onClick={openNew}>+ New Store</button>
      </div>

      {error && <p className="cc-error">{error}</p>}
      {loading && <p className="cc-loading">Loading stores…</p>}

      {/* ── Store grid ── */}
      {!loading && (
        <div className="cc-stores-grid">
          {stores.map(store => (
            <div key={store.id} className={`cc-store-card${store.active ? '' : ' cc-store-card--inactive'}`}>
              <div className="cc-store-card__badge" style={{ background: store.color, overflow: 'hidden', padding: store.logoUrl ? 0 : undefined }}>
                {store.logoUrl
                  ? <img src={store.logoUrl} alt={store.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (store.initials || store.name.slice(0, 2).toUpperCase())
                }
              </div>
              <div className="cc-store-card__info">
                <div className="cc-store-card__name">{store.name}</div>
                <div className="cc-store-card__tagline">{store.tagline}</div>
                <div className="cc-store-card__address">{store.address}</div>
                <div className="cc-store-card__coords">
                  {store.lat.toFixed(4)}, {store.lng.toFixed(4)}
                </div>
                <span className={`cc-status-chip${store.active ? ' cc-status-chip--green' : ' cc-status-chip--grey'}`}>
                  {store.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="cc-store-card__actions">
                <button className="cc-btn cc-btn--sm cc-btn--secondary" onClick={() => openEdit(store)}>
                  Edit
                </button>
                <button
                  className={`cc-btn cc-btn--sm${store.active ? ' cc-btn--warning' : ' cc-btn--success'}`}
                  onClick={() => handleToggle(store)}
                >
                  {store.active ? 'Deactivate' : 'Activate'}
                </button>
                <button className="cc-btn cc-btn--sm cc-btn--danger" onClick={() => setConfirmDelete(store.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit form modal ── */}
      {showForm && (
        <div className="cc-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="cc-modal" onClick={e => e.stopPropagation()}>
            <div className="cc-modal-header">
              <h2 className="cc-modal-title">{editing ? 'Edit Store' : 'New Store'}</h2>
              <button className="cc-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>

            {error && <p className="cc-error">{error}</p>}

            <div className="cc-form-grid">
              {/* Logo upload */}
              <div className="cc-form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="cc-form-label">Store Logo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: 80, height: 80, borderRadius: 12,
                      border: '2px dashed #444', cursor: 'pointer',
                      overflow: 'hidden', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#1a1a1a',
                    }}
                  >
                    {logoPreview
                      ? <img src={logoPreview} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ color: '#555', fontSize: '1.5rem' }}>+</span>
                    }
                  </div>
                  <div>
                    <button type="button" className="cc-btn cc-btn--ghost" onClick={() => fileInputRef.current?.click()}>
                      {logoPreview ? 'Change image' : 'Upload image'}
                    </button>
                    {logoPreview && (
                      <button
                        type="button"
                        className="cc-btn cc-btn--ghost"
                        style={{ marginLeft: '0.5rem', color: '#f44' }}
                        onClick={() => { setLogoPreview(null); setLogoFile(null); set('logoUrl', ''); }}
                      >
                        Remove
                      </button>
                    )}
                    <p style={{ color: '#666', fontSize: '0.75rem', margin: '0.35rem 0 0' }}>
                      PNG, JPG or WebP — max 5 MB
                    </p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleLogoChange}
                />
              </div>

              {[
                { key: 'name',     label: 'Store Name',  type: 'text' },
                { key: 'tagline',  label: 'Tagline',     type: 'text' },
                { key: 'initials', label: 'Initials (2–3 chars)', type: 'text' },
                { key: 'address',  label: 'Address',     type: 'text' },
              ].map(f => (
                <div key={f.key} className="cc-form-field">
                  <label className="cc-form-label" htmlFor={f.key}>{f.label}</label>
                  <input
                    id={f.key}
                    type={f.type}
                    className="cc-form-input"
                    value={(form as any)[f.key] ?? ''}
                    onChange={e => set(f.key as keyof StoreForm, e.target.value)}
                  />
                </div>
              ))}

              <div className="cc-form-field">
                <label className="cc-form-label" htmlFor="color">Brand Colour</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    id="color"
                    type="color"
                    style={{ width: 48, height: 36, border: 'none', cursor: 'pointer', borderRadius: 6 }}
                    value={form.color}
                    onChange={e => set('color', e.target.value)}
                  />
                  <input
                    type="text"
                    className="cc-form-input"
                    style={{ flex: 1 }}
                    value={form.color}
                    onChange={e => set('color', e.target.value)}
                    placeholder="#FFB803"
                  />
                </div>
              </div>

              <div className="cc-form-field">
                <label className="cc-form-label" htmlFor="lat">Latitude</label>
                <input id="lat" type="number" step="0.0001" className="cc-form-input"
                  value={form.lat} onChange={e => set('lat', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="cc-form-field">
                <label className="cc-form-label" htmlFor="lng">Longitude</label>
                <input id="lng" type="number" step="0.0001" className="cc-form-input"
                  value={form.lng} onChange={e => set('lng', parseFloat(e.target.value) || 0)} />
              </div>

              <div className="cc-form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="cc-form-label">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={e => set('active', e.target.checked)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Active (visible to customers)
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button className="cc-btn cc-btn--primary" onClick={handleSave} disabled={saving} style={{ minWidth: 120 }}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Store'}
              </button>
              <button className="cc-btn cc-btn--secondary" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {confirmDelete && (
        <div className="cc-modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="cc-modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <h2 className="cc-modal-title">Delete Store?</h2>
            <p style={{ color: '#555', margin: '0.75rem 0 1.5rem' }}>
              This permanently removes the store from Cosmos. Use Deactivate instead to hide it without losing the data.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="cc-btn cc-btn--danger" onClick={() => handleDelete(confirmDelete)}>
                Yes, Delete
              </button>
              <button className="cc-btn cc-btn--secondary" onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stores;
