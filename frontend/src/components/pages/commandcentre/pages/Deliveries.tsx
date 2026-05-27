import { useEffect, useState } from 'react';
import { adminApi, type AdminOrder } from '../services/adminApi';
import { formatRand, formatDate } from '../functions/formatters';
import StatusBadge from '../components/StatusBadge';

const FILTERS = ['all', 'confirmed', 'assigned', 'accepted', 'arrivedAtPickup', 'loaded', 'delivered', 'cancelled'];

const Deliveries = () => {
  const [deliveries, setDeliveries] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getDeliveries()
      .then(setDeliveries)
      .catch(() => setError('Failed to load deliveries.'))
      .finally(() => setLoading(false));
  }, []);

  const handleAssign = async (orderId: string) => {
    const driverId = window.prompt('Enter Driver ID:');
    if (!driverId?.trim()) return;
    setAssigning(orderId);
    try {
      const updated = await adminApi.assignDriver(orderId, driverId.trim());
      setDeliveries(prev => prev.map(d => d.id === orderId ? { ...d, ...updated } : d));
    } catch {
      setError('Failed to assign driver.');
    } finally {
      setAssigning(null);
    }
  };

  // Deduplicate in case the cross-partition Cosmos query returns the same document twice
  const unique  = Array.from(new Map(deliveries.map(d => [d.id, d])).values());
  const visible = filter === 'all' ? unique : unique.filter(d => d.status === filter);

  return (
    <div>
      <div className="cc-page-header">
        <h1 className="cc-page-title">Deliveries</h1>
        <span style={{ color: '#555', fontSize: '0.8rem' }}>{unique.length} total</span>
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
                <th>Total</th>
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
                  <td>{formatRand(d.total)}</td>
                  <td>{formatDate(d.updated_at)}</td>
                  <td>
                    <button
                      className="cc-btn cc-btn--ghost"
                      disabled={assigning === d.id || d.status === 'delivered'}
                      onClick={() => handleAssign(d.id)}
                    >
                      {assigning === d.id ? '…' : 'Assign'}
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr><td colSpan={7} className="cc-empty">No deliveries</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Deliveries;
