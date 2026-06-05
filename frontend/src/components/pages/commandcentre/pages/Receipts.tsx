import { useEffect, useState } from 'react';
import {
  adminApi,
  type AdminReceipt,
  type AdminReceiptItem,
  type AdminDriverFull,
  type AdminOrderDetail,
} from '../services/adminApi';
import { formatRand, formatDate } from '../functions/formatters';
import StatusBadge from '../components/StatusBadge';

const FILTERS      = ['all', 'pending', 'confirmed', 'rejected'];
const WEIGHT_OPTS  = ['light', 'medium', 'heavy', 'bulk'];
const EMPTY_ITEM   = (): AdminReceiptItem =>
  ({ description: '', qty: 1, unitPrice: 0, lineTotal: 0, estimatedKg: 0 });

const Receipts = () => {
  const [receipts, setReceipts]     = useState<AdminReceipt[]>([]);
  const [drivers, setDrivers]       = useState<AdminDriverFull[]>([]);
  const [filter, setFilter]         = useState('pending');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [reviewing, setReviewing]   = useState<AdminReceipt | null>(null);
  const [reviewOrder, setReviewOrder] = useState<AdminOrderDetail | null>(null);
  const [saving, setSaving]         = useState(false);
  const [rejectMode, setRejectMode] = useState(false);

  // Review form state
  const [items, setItems]                 = useState<AdminReceiptItem[]>([]);
  const [weightClass, setWeightClass]     = useState('medium');
  const [assignedDriver, setAssignedDriver] = useState('');
  const [adminNote, setAdminNote]         = useState('');

  useEffect(() => { load(filter); }, [filter]);

  useEffect(() => {
    adminApi.getDrivers().then(setDrivers).catch(() => {});
  }, []);

  const load = (status: string) => {
    setLoading(true);
    adminApi.getReceipts(status === 'all' ? undefined : status)
      .then(setReceipts)
      .catch(() => setError('Failed to load receipts.'))
      .finally(() => setLoading(false));
  };

  const openReview = (r: AdminReceipt) => {
    setReviewing(r);
    setItems(r.items?.length ? r.items.map(i => ({ ...i })) : []);
    setWeightClass(r.weightClass || 'medium');
    setAssignedDriver('');
    setAdminNote(r.adminNote || '');
    setRejectMode(false);
    setError(null);
    setReviewOrder(null);
    adminApi.getOrder(r.orderId).then(setReviewOrder).catch(() => {});
  };

  const closeReview = () => { setReviewing(null); setReviewOrder(null); setRejectMode(false); setError(null); };

  const handleSave = async (status: string) => {
    if (!reviewing) return;
    setSaving(true);
    setError(null);
    try {
      const cleanItems = items.filter(i => i.description.trim());
      const updated = await adminApi.reviewReceipt(reviewing.id, status, {
        note:        status === 'rejected' ? adminNote || undefined : undefined,
        items:       cleanItems,
        weightClass,
      });
      if (status === 'confirmed' && assignedDriver) {
        await adminApi.assignDriver(reviewing.orderId, assignedDriver);
      }
      setReceipts(prev => prev.map(r => r.id === reviewing.id ? updated : r));
      if (status === 'pending') {
        setReviewing(updated);
      } else {
        setReviewing(null);
      }
    } catch {
      setError('Failed to save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const addItem    = () => setItems(prev => [...prev, EMPTY_ITEM()]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof AdminReceiptItem, raw: string) => {
    setItems(prev => {
      const copy = prev.map((it, i) => i !== idx ? it : { ...it });
      if (field === 'description') {
        copy[idx].description = raw;
      } else {
        const val = parseFloat(raw) || 0;
        copy[idx] = { ...copy[idx], [field]: val };
        if (field === 'qty' || field === 'unitPrice') {
          copy[idx].lineTotal = parseFloat((copy[idx].qty * copy[idx].unitPrice).toFixed(2));
        }
      }
      return copy;
    });
  };

  const estTotalKg    = items.reduce((s, i) => s + (Number(i.estimatedKg) || 0), 0);
  const itemsTotal    = items.reduce((s, i) => s + (Number(i.lineTotal) || 0), 0);

  return (
    <div>
      <div className="cc-page-header">
        <h1 className="cc-page-title">Receipts</h1>
        <span style={{ color: '#555', fontSize: '0.8rem' }}>
          Manual review — type out items, assign driver, confirm
        </span>
      </div>

      <div className="cc-filter-bar">
        {FILTERS.map(f => (
          <button
            key={f}
            className={`cc-filter-btn${filter === f ? ' cc-filter-btn--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {loading && <p className="cc-loading">Loading…</p>}
      {error && !reviewing && <p className="cc-error">{error}</p>}

      {!loading && (
        <div className="cc-table-wrap">
          <table className="cc-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Store</th>
                <th>Total</th>
                <th>Weight</th>
                <th>Status</th>
                <th>Received</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {receipts.map(r => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                    {r.orderId.slice(0, 14)}…
                  </td>
                  <td>{r.storeName ?? '—'}</td>
                  <td>{r.total != null ? formatRand(r.total) : '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{r.weightClass}</td>
                  <td><StatusBadge status={r.status ?? 'pending'} /></td>
                  <td style={{ fontSize: '0.75rem', color: '#666' }}>{formatDate(r.parsedAt)}</td>
                  <td>
                    <button
                      className="cc-btn cc-btn--primary cc-btn--sm"
                      onClick={() => openReview(r)}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
              {receipts.length === 0 && (
                <tr>
                  <td colSpan={7} className="cc-empty">
                    No {filter === 'all' ? '' : filter} receipts
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Review modal ── */}
      {reviewing && (
        <div className="cc-modal-overlay" onClick={closeReview}>
          <div
            className="cc-modal cc-receipt-modal"
            onClick={e => e.stopPropagation()}
          >
            <div className="cc-modal-header">
              <h2 className="cc-modal-title">
                Review — {reviewing.storeName ?? reviewing.orderId.slice(0, 18)}
              </h2>
              <button className="cc-modal-close" onClick={closeReview}>✕</button>
            </div>

            {error && <p className="cc-error" style={{ margin: '0 0 0.5rem' }}>{error}</p>}

            <div className="cc-receipt-review">
              {/* Left: image + meta */}
              <div className="cc-receipt-image-panel">
                {reviewing.blobUrl ? (
                  <a
                    href={reviewing.blobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cc-receipt-img-link"
                  >
                    <img
                      src={reviewing.blobUrl}
                      alt="Receipt"
                      className="cc-receipt-img"
                      onError={e => {
                        const img = e.currentTarget;
                        img.style.display = 'none';
                        const placeholder = img.parentElement?.querySelector('.cc-receipt-img-error') as HTMLElement | null;
                        if (placeholder) placeholder.style.display = 'flex';
                      }}
                    />
                    {/* Shown when blob returns 404 / ResourceNotFound */}
                    <div
                      className="cc-receipt-img-error"
                      style={{
                        display: 'none',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '1.5rem',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px dashed rgba(255,184,3,0.3)',
                        borderRadius: '8px',
                        textAlign: 'center',
                        fontSize: '0.82rem',
                        color: '#aaa',
                      }}
                    >
                      <span style={{ fontSize: '1.8rem' }}>🖼️</span>
                      <span>Image not publicly accessible</span>
                      <span style={{ fontSize: '0.72rem', color: '#666' }}>
                        Set the <strong style={{ color: '#FFB803' }}>receipts</strong> container
                        to <strong style={{ color: '#FFB803' }}>Blob</strong> access in Azure Portal
                        → Storage accounts → localszastorage → Containers → receipts → Change access level
                      </span>
                    </div>
                    <span className="cc-receipt-img-hint">Open full size ↗</span>
                  </a>
                ) : (
                  <div className="cc-receipt-img-placeholder">No image attached</div>
                )}
                <div className="cc-receipt-meta">
                  <div><span>Order:</span> {reviewing.orderId}</div>
                  <div><span>Store:</span> {reviewing.storeName ?? '—'}</div>
                  <div><span>Total:</span> {reviewing.total != null ? formatRand(reviewing.total) : '—'}</div>
                  <div><span>Received:</span> {formatDate(reviewing.parsedAt)}</div>
                  <div><span>Customer:</span> {reviewOrder?.customer_name ?? '—'}</div>
                  <div>
                    <span>Phone:</span>{' '}
                    {reviewOrder?.contact_number
                      ? <a href={`tel:${reviewOrder.contact_number}`} style={{ color: '#FFB803' }}>{reviewOrder.contact_number}</a>
                      : '—'}
                  </div>
                  <div>
                    <span>Address:</span>{' '}
                    {reviewOrder?.delivery_address
                      ? [
                          reviewOrder.delivery_address.addressLine,
                          reviewOrder.delivery_address.suburb,
                          reviewOrder.delivery_address.city,
                          reviewOrder.delivery_address.province,
                        ].filter(Boolean).join(', ')
                      : '—'}
                  </div>
                  <div>
                    <span>Delivery Fee:</span>{' '}
                    {reviewOrder?.delivery_fee != null
                      ? <strong style={{ color: '#FFB803' }}>{formatRand(reviewOrder.delivery_fee)}</strong>
                      : '—'}
                  </div>
                  <div>
                    <span>Order Total:</span>{' '}
                    {reviewOrder?.total != null ? formatRand(reviewOrder.total) : '—'}
                  </div>
                  <div>
                    <span>Status:</span>
                    <StatusBadge status={reviewing.status ?? 'pending'} />
                  </div>
                  {reviewing.adminNote && (
                    <div style={{ color: '#ff8a65' }}><span>Note:</span> {reviewing.adminNote}</div>
                  )}
                </div>
              </div>

              {/* Right: items entry + assignment */}
              <div className="cc-receipt-form-panel">
                {/* Items table */}
                <div className="cc-receipt-section">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 className="cc-section-title">Collection Items</h3>
                    <button
                      className="cc-btn cc-btn--ghost cc-btn--sm"
                      onClick={addItem}
                    >
                      + Add Row
                    </button>
                  </div>
                  <div className="cc-items-table-wrap">
                    <table className="cc-items-table">
                      <thead>
                        <tr>
                          <th style={{ minWidth: 140 }}>Description</th>
                          <th>Qty</th>
                          <th>Unit Price</th>
                          <th>Total</th>
                          <th>Est. kg</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, i) => (
                          <tr key={i}>
                            <td>
                              <input
                                className="cc-form-input cc-items-input"
                                value={item.description}
                                onChange={e => updateItem(i, 'description', e.target.value)}
                                placeholder="e.g. Coca-Cola 2L × 6-pack"
                              />
                            </td>
                            <td>
                              <input
                                type="number" min="1"
                                className="cc-form-input cc-items-input cc-items-input--sm"
                                value={item.qty}
                                onChange={e => updateItem(i, 'qty', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number" min="0" step="0.01"
                                className="cc-form-input cc-items-input cc-items-input--sm"
                                value={item.unitPrice || ''}
                                placeholder="0.00"
                                onChange={e => updateItem(i, 'unitPrice', e.target.value)}
                              />
                            </td>
                            <td style={{ color: '#aaa', fontSize: '0.76rem', whiteSpace: 'nowrap' }}>
                              R{item.lineTotal.toFixed(2)}
                            </td>
                            <td>
                              <input
                                type="number" min="0" step="0.1"
                                className="cc-form-input cc-items-input cc-items-input--sm"
                                value={item.estimatedKg || ''}
                                placeholder="kg"
                                onChange={e => updateItem(i, 'estimatedKg', e.target.value)}
                              />
                            </td>
                            <td>
                              <button
                                className="cc-btn cc-btn--ghost cc-btn--sm"
                                style={{ color: '#ff6b6b', padding: '0.2rem 0.4rem' }}
                                onClick={() => removeItem(i)}
                              >
                                ×
                              </button>
                            </td>
                          </tr>
                        ))}
                        {items.length === 0 && (
                          <tr>
                            <td colSpan={6} style={{
                              color: '#444', fontSize: '0.78rem',
                              textAlign: 'center', padding: '0.75rem',
                            }}>
                              Type items from the receipt photo above, then click + Add Row
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {items.length > 0 && (
                    <p style={{ fontSize: '0.73rem', color: '#555', margin: '0.25rem 0 0' }}>
                      {items.filter(i => i.description).length} items
                      · Est. {estTotalKg.toFixed(1)} kg
                      · Items total {formatRand(itemsTotal)}
                    </p>
                  )}
                </div>

                {/* Weight class */}
                <div className="cc-receipt-section">
                  <h3 className="cc-section-title">Weight Class</h3>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {WEIGHT_OPTS.map(w => (
                      <button
                        key={w}
                        className={`cc-filter-btn${weightClass === w ? ' cc-filter-btn--active' : ''}`}
                        style={{ textTransform: 'capitalize', fontSize: '0.78rem' }}
                        onClick={() => setWeightClass(w)}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Driver assignment */}
                <div className="cc-receipt-section">
                  <h3 className="cc-section-title">Assign Driver</h3>
                  <select
                    className="cc-form-input"
                    value={assignedDriver}
                    onChange={e => setAssignedDriver(e.target.value)}
                  >
                    <option value="">— Assign after confirming —</option>
                    {drivers.filter(d => d.driver_id).map((d, i) => (
                      <option key={d.driver_id || `driver-${i}`} value={d.driver_id}>
                        {d.full_name}
                        {d.vehicle_type ? ` · ${d.vehicle_type}` : ''}
                        {d.status === 'available' ? ' ✓' : d.status === 'on_delivery' ? ' (busy)' : ' (offline)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Rejection note */}
                {rejectMode && (
                  <div className="cc-receipt-section">
                    <h3 className="cc-section-title">Rejection Reason</h3>
                    <textarea
                      className="cc-form-input"
                      rows={2}
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value)}
                      placeholder="Reason for rejecting (optional, sent to customer)"
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', paddingBottom: '0.5rem' }}>
                  <button
                    className="cc-btn cc-btn--secondary cc-btn--sm"
                    onClick={() => handleSave(reviewing.status ?? 'pending')}
                    disabled={saving}
                    title="Save items without changing status"
                  >
                    {saving ? 'Saving…' : 'Save Items'}
                  </button>
                  <button
                    className="cc-btn cc-btn--success cc-btn--sm"
                    onClick={() => handleSave('confirmed')}
                    disabled={saving}
                  >
                    Confirm &amp; Assign
                  </button>
                  {!rejectMode ? (
                    <button
                      className="cc-btn cc-btn--danger cc-btn--sm"
                      onClick={() => setRejectMode(true)}
                      disabled={saving}
                    >
                      Reject
                    </button>
                  ) : (
                    <>
                      <button
                        className="cc-btn cc-btn--danger cc-btn--sm"
                        onClick={() => handleSave('rejected')}
                        disabled={saving}
                      >
                        Confirm Reject
                      </button>
                      <button
                        className="cc-btn cc-btn--ghost cc-btn--sm"
                        onClick={() => setRejectMode(false)}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Receipts;
