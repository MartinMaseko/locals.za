import { useEffect, useState } from 'react';
import { adminApi, type AdminReceipt } from '../services/adminApi';
import { formatRand, formatDate } from '../functions/formatters';
import StatusBadge from '../components/StatusBadge';

const FILTERS = ['all', 'pending', 'confirmed', 'rejected'];

const Receipts = () => {
  const [receipts, setReceipts] = useState<AdminReceipt[]>([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // id of receipt being actioned

  const load = (status?: string) => {
    setLoading(true);
    adminApi.getReceipts(status === 'all' ? undefined : status)
      .then(setReceipts)
      .catch(() => setError('Failed to load receipts.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(filter); }, [filter]);

  const action = async (id: string, status: 'confirmed' | 'rejected', note?: string) => {
    setBusy(id);
    try {
      const updated = await adminApi.reviewReceipt(id, status, note);
      setReceipts(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
    } catch {
      setError(`Failed to ${status} receipt.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="cc-page-header">
        <h1 className="cc-page-title">Receipts</h1>
        <span style={{ color: '#555', fontSize: '0.8rem' }}>Review scanned receipts</span>
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
      {error   && <p className="cc-error">{error}</p>}

      {!loading && !error && (
        <div className="cc-table-wrap">
          <table className="cc-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Store</th>
                <th>Total</th>
                <th>Weight</th>
                <th>Quality</th>
                <th>Status</th>
                <th>Receipt</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map(r => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                    {r.orderId.slice(0, 12)}…
                  </td>
                  <td>{r.storeName ?? '—'}</td>
                  <td>{r.total != null ? formatRand(r.total) : '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{r.weightClass}</td>
                  <td>
                    <span style={{ color: r.qualityScore < 0.6 ? '#ff6b6b' : '#4CAF50' }}>
                      {Math.round(r.qualityScore * 100)}%
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={r.status ?? 'pending'} />
                  </td>
                  <td>
                    {r.blobUrl ? (
                      <a href={r.blobUrl} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#FFB803', fontSize: '0.78rem' }}>
                        View
                      </a>
                    ) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        className="cc-btn cc-btn--primary"
                        disabled={busy === r.id || r.status === 'confirmed'}
                        onClick={() => action(r.id, 'confirmed')}
                      >
                        ✓
                      </button>
                      <button
                        className="cc-btn cc-btn--danger"
                        disabled={busy === r.id || r.status === 'rejected'}
                        onClick={() => {
                          const note = window.prompt('Rejection reason (optional):') ?? undefined;
                          action(r.id, 'rejected', note);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {receipts.length === 0 && (
                <tr><td colSpan={8} className="cc-empty">No receipts</td></tr>
              )}
            </tbody>
          </table>
          <p style={{ fontSize: '0.7rem', color: '#444', padding: '0.5rem 1rem' }}>
            {formatDate(new Date().toISOString())} — Showing {filter} receipts
          </p>
        </div>
      )}
    </div>
  );
};

export default Receipts;
