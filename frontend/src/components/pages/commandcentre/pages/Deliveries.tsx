import { useEffect, useState } from 'react';
import { adminApi, type AdminOrder } from '../services/adminApi';
import { formatRand, formatDate } from '../functions/formatters';
import StatusBadge from '../components/StatusBadge';

const FILTERS = ['all', 'confirmed', 'assigned', 'accepted', 'arrivedAtPickup', 'loaded', 'delivered', 'cancelled'];

const Deliveries = () => {
  const [deliveries, setDeliveries] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getDeliveries()
      .then(setDeliveries)
      .catch(() => setError('Failed to load deliveries.'))
      .finally(() => setLoading(false));
  }, []);

  const handleAlertCustomer = (_orderId: string) => {
    // TODO: trigger SMS notification when endpoint is ready
  };

  // Deduplicate in case the cross-partition Cosmos query returns the same document twice
  const unique    = Array.from(new Map(deliveries.map(d => [d.id, d])).values());
  const filtered  = filter === 'all' ? unique : unique.filter(d => d.status === filter);
  const searchTerm = search.trim().toLowerCase();
  const visible   = searchTerm
    ? filtered.filter(d =>
        (d.order_number || d.id).toLowerCase().includes(searchTerm)
      )
    : filtered;

  return (
    <div>
      <div className="cc-page-header">
        <h1 className="cc-page-title">Deliveries</h1>
        <span style={{ color: '#555', fontSize: '0.8rem' }}>{unique.length} total</span>
      </div>

      <div style={{ margin: '0 0 0.75rem' }}>
        <input
          type="search"
          className="cc-form-input"
          placeholder="Search order number…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
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
                <th>Order #</th>
                <th>Status</th>
                <th>Driver</th>
                <th>Delivery Fee</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d, i) => (
                <tr key={`${d.id}-${i}`}>
                  <td>{d.order_number || d.id.slice(0, 8)}</td>
                  <td><StatusBadge status={d.status} /></td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {d.driver_id ?? <span style={{ color: '#555' }}>Unassigned</span>}
                  </td>
                  <td>{formatRand(d.delivery_fee)}</td>
                  <td>{formatDate(d.updated_at)}</td>
                  <td>
                    <button
                      className="cc-btn cc-btn--ghost"
                      disabled={d.status === 'delivered'}
                      onClick={() => handleAlertCustomer(d.id)}
                    >
                      Alert Customer
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={6} className="cc-empty">No deliveries</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Deliveries;
