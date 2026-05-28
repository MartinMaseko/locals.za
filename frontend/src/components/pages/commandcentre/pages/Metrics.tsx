import { useEffect, useState } from 'react';
import { adminApi, type MetricsSummary } from '../services/adminApi';
import StatCard from '../components/StatCard';

const Metrics = () => {
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getMetrics()
      .then(setMetrics)
      .catch(() => setError('Failed to load metrics.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="cc-page-header">
        <h1 className="cc-page-title">Metrics</h1>
        <span style={{ color: '#555', fontSize: '0.8rem' }}>Last 30 days</span>
      </div>

      {loading && <p className="cc-loading">Loading…</p>}
      {error   && <p className="cc-error">{error}</p>}

      {metrics && (
        <>
          <div className="cc-stat-grid">
            <StatCard label="Total Orders"      value={metrics.totalOrders} />
            <StatCard label="Delivered"         value={metrics.deliveredOrders} accent="#4CAF50" />
            <StatCard label="Cancelled"         value={metrics.cancelledOrders} accent="#ff6b6b" />
            <StatCard label="Delivery Rate"     value={`${metrics.deliveryRate}%`}     accent="#4CAF50" />
            <StatCard label="Cancellation Rate" value={`${metrics.cancellationRate}%`} accent="#ff6b6b" />
          </div>

          {/* Delivery rate bar */}
          <div style={{ marginTop: '2rem' }}>
            <p style={{ color: '#666', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              Delivery success rate
            </p>
            <div style={{
              background: '#222', borderRadius: 8, height: 12, overflow: 'hidden', maxWidth: 500,
            }}>
              <div style={{
                width: `${metrics.deliveryRate}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #4CAF50, #81C784)',
                borderRadius: 8,
                transition: 'width 0.6s ease',
              }} />
            </div>
            <p style={{ color: '#555', fontSize: '0.72rem', marginTop: '0.35rem' }}>
              {metrics.deliveredOrders} of {metrics.totalOrders} orders delivered
            </p>
          </div>

          {metrics.totalOrders === 0 && (
            <p className="cc-empty" style={{ marginTop: '2rem' }}>
              No order data in the last 30 days yet.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default Metrics;
