import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import axios from 'axios';
import './salesStyles.css';

const API_URL = import.meta.env.VITE_API_URL;

interface RevenueData {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  revenuePerOrder: number;
  orders?: any[];
}

const SalesRevenue = () => {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const auth = getAuth(app);

  useEffect(() => {
    fetchRevenue();
  }, []);

  const fetchRevenue = async () => {
    setLoading(true);
    setError('');
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Please login to continue');

      const token = await user.getIdToken();
      const { data } = await axios.get<RevenueData>(`${API_URL}/api/sales/revenue`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setRevenueData(data);
    } catch (err: any) {
      console.error('Error fetching revenue:', err);
      setError(err?.response?.data?.error || 'Failed to load revenue data');
    }
    setLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return `R${amount.toFixed(2)}`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="buyer-dashboard">
        <div className="buyer-section">
          <p style={{ textAlign: 'center', padding: '2rem' }}>Loading revenue data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="buyer-dashboard">
      <div className="buyer-section">
        <h2>My Revenue</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '2rem' }}>
          You earn R10 for every order from your customers
        </p>

        {error && <div className="error-message">{error}</div>}

        {revenueData && (
          <>
            <div className="revenue-stats">
              <div className="stat-card primary">
                <div className="stat-icon">💰</div>
                <div className="stat-content">
                  <h3>Total Earnings</h3>
                  <p className="stat-value">{formatCurrency(revenueData.totalRevenue)}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📦</div>
                <div className="stat-content">
                  <h3>Total Orders</h3>
                  <p className="stat-value">{revenueData.totalOrders}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <h3>Active Customers</h3>
                  <p className="stat-value">{revenueData.totalCustomers}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">💵</div>
                <div className="stat-content">
                  <h3>Per Order</h3>
                  <p className="stat-value">{formatCurrency(revenueData.revenuePerOrder)}</p>
                </div>
              </div>
            </div>

            {revenueData.orders && revenueData.orders.length > 0 && (
              <div className="recent-earnings">
                <h3>Recent Orders</h3>
                <div className="earnings-table">
                  <div className="earnings-header">
                    <span>Order ID</span>
                    <span>Customer</span>
                    <span>Date</span>
                    <span>Order Total</span>
                    <span>Your Earning</span>
                  </div>
                  {revenueData.orders.map((order: any) => (
                    <div key={order.id} className="earnings-row">
                      <span className="order-id">#{order.id.slice(-6)}</span>
                      <span className="customer-email">{order.email}</span>
                      <span className="order-date">{formatDate(order.createdAt)}</span>
                      <span className="order-total">{formatCurrency(order.totalAmount || 0)}</span>
                      <span className="earning highlight">{formatCurrency(10)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!revenueData.orders || revenueData.orders.length === 0) && (
              <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
                No orders yet. Your customers haven't placed any orders.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SalesRevenue;
