import { useEffect, useState } from 'react';
import { adminApi, type AdminPayment } from '../services/adminApi';
import { formatRand, formatDate } from '../functions/formatters';
import StatusBadge from '../components/StatusBadge';

const FILTERS = ['all', 'pending', 'complete', 'cancelled', 'error'];

const Payments = () => {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getPayments()
      .then(setPayments)
      .catch(() => setError('Failed to load payments.'))
      .finally(() => setLoading(false));
  }, []);

  const visible = filter === 'all' ? payments : payments.filter(p => p.status === filter);

  return (
    <div>
      <div className="cc-page-header">
        <h1 className="cc-page-title">Payments</h1>
        <span style={{ color: '#555', fontSize: '0.8rem' }}>{payments.length} total</span>
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
                <th>Amount</th>
                <th>Status</th>
                <th>Ozow Txn</th>
                <th>Created</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(p => (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{p.order_id.slice(0, 12)}…</td>
                  <td>{formatRand(p.amount)}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {p.ozow_transaction_id ?? '—'}
                  </td>
                  <td>{formatDate(p.created_at)}</td>
                  <td>{formatDate(p.updated_at)}</td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={6} className="cc-empty">No payments match this filter</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Payments;
