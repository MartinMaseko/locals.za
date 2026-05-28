import { useEffect, useState } from 'react';
import { adminApi, type AdminDriver } from '../services/adminApi';
import { formatRand } from '../functions/formatters';
import StatCard from '../components/StatCard';

const DriverRevenue = () => {
  const [drivers, setDrivers] = useState<AdminDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminApi.getDriverRevenue()
      .then(setDrivers)
      .catch(() => setError('Failed to load driver revenue.'))
      .finally(() => setLoading(false));
  }, []);

  const totalTrips   = drivers.reduce((s, d) => s + d.completedTrips, 0);
  const totalPayout  = drivers.reduce((s, d) => s + d.estimatedPayout, 0);

  return (
    <div>
      <div className="cc-page-header">
        <h1 className="cc-page-title">Driver Revenue</h1>
        <span style={{ color: '#555', fontSize: '0.8rem' }}>{drivers.length} drivers</span>
      </div>

      {loading && <p className="cc-loading">Loading…</p>}
      {error   && <p className="cc-error">{error}</p>}

      {!loading && !error && (
        <>
          <div className="cc-stat-grid" style={{ marginBottom: '1.5rem' }}>
            <StatCard label="Total Drivers"       value={drivers.length} />
            <StatCard label="Completed Trips"     value={totalTrips}     accent="#64b5f6" />
            <StatCard label="Estimated Payouts"   value={formatRand(totalPayout)} accent="#4CAF50" />
          </div>

          <div className="cc-table-wrap">
            <table className="cc-table">
              <thead>
                <tr>
                  <th>Driver ID</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Completed Trips</th>
                  <th>Est. Payout</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map(d => (
                  <tr key={d.driverId}>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                      {d.driverId.slice(0, 12)}…
                    </td>
                    <td>{d.name || '—'}</td>
                    <td>{d.phone || '—'}</td>
                    <td>{d.completedTrips}</td>
                    <td style={{ color: '#4CAF50' }}>{formatRand(d.estimatedPayout)}</td>
                  </tr>
                ))}
                {drivers.length === 0 && (
                  <tr><td colSpan={5} className="cc-empty">No drivers found</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p style={{ color: '#444', fontSize: '0.72rem', marginTop: '0.75rem' }}>
            * Payout model: driver fee split configured per order — values shown are estimates.
            Full payout model coming in next sprint.
          </p>
        </>
      )}
    </div>
  );
};

export default DriverRevenue;
