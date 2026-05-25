import { useEffect, useState } from 'react';
import { adminApi, type DashboardSummary } from '../services/adminApi';
import { formatRand, formatDate } from '../functions/formatters';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';

const Dashboard = () => {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getDashboard()
      .then(setData)
      .catch(() => setError('Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="cc-page-header">
        <h1 className="cc-page-title">Dashboard</h1>
        <span style={{ color: '#555', fontSize: '0.8rem' }}>Last 7 days</span>
      </div>

      {loading && <p className="cc-loading">Loading…</p>}
      {error   && <p className="cc-error">{error}</p>}

      {data && (
        <>
          <div className="cc-stat-grid">
            <StatCard label="Orders This Week"   value={data.ordersThisWeek} />
            <StatCard label="Active Deliveries"  value={data.activeDeliveries} accent="#64b5f6" />
            <StatCard label="Pending Receipts"   value={data.pendingReceipts}  accent="#FFB803" />
            <StatCard label="Weekly Revenue"     value={formatRand(data.weeklyRevenue)} accent="#4CAF50" />
          </div>

          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#888', marginBottom: '0.75rem' }}>
            Recent Orders
          </h2>
          <div className="cc-table-wrap">
            <table className="cc-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Store</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map(o => (
                  <tr key={o.id}>
                    <td>{o.orderNumber || o.id.slice(0, 8)}</td>
                    <td>{o.storeId}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td>{formatRand(o.total)}</td>
                    <td>{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
                {data.recentOrders.length === 0 && (
                  <tr><td colSpan={5} className="cc-empty">No recent orders</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
