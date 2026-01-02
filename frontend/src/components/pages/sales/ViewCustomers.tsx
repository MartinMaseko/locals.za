import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import axios from 'axios';
import './salesStyles.css';

const API_URL = import.meta.env.VITE_API_URL;

interface Customer {
  id: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: any;
  createdAt: any;
  recentOrders?: any[];
}

const ViewCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const auth = getAuth(app);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Please login to continue');

      const token = await user.getIdToken();
      const { data } = await axios.get<Customer[]>(`${API_URL}/api/sales/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCustomers(data);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setError(err?.response?.data?.error || 'Failed to load customers');
    }
    setLoading(false);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Never';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return `R${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="buyer-dashboard">
        <div className="buyer-section">
          <p style={{ textAlign: 'center', padding: '2rem' }}>Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="buyer-dashboard">
      <div className="buyer-section">
        <h2>My Customers</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '1.5rem' }}>
          Total Customers: {customers.length}
        </p>

        {error && <div className="error-message">{error}</div>}

        {customers.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '2rem' }}>
            No customers yet. Add your first customer to get started!
          </p>
        ) : (
          <div className="customers-grid">
            {customers.map((customer) => (
              <div key={customer.id} className="customer-card">
                <div className="customer-header">
                  <h3>{customer.name}</h3>
                  <span className="customer-badge">{customer.totalOrders} orders</span>
                </div>
                
                <div className="customer-details">
                  <div className="detail-row">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">{customer.email}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Phone:</span>
                    <span className="detail-value">{customer.phone}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Total Spent:</span>
                    <span className="detail-value highlight">{formatCurrency(customer.totalSpent)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Last Order:</span>
                    <span className="detail-value">{formatDate(customer.lastOrderDate)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Customer Since:</span>
                    <span className="detail-value">{formatDate(customer.createdAt)}</span>
                  </div>
                </div>

                <button
                  className="view-details-btn"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  View Order History
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Customer Detail Modal */}
        {selectedCustomer && (
          <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{selectedCustomer.name}'s Orders</h3>
                <button className="modal-close" onClick={() => setSelectedCustomer(null)}>×</button>
              </div>
              
              <div className="modal-body">
                <div className="customer-summary">
                  <div className="summary-item">
                    <span className="summary-label">Total Orders:</span>
                    <span className="summary-value">{selectedCustomer.totalOrders}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Total Spent:</span>
                    <span className="summary-value">{formatCurrency(selectedCustomer.totalSpent)}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Your Earnings:</span>
                    <span className="summary-value highlight">{formatCurrency(selectedCustomer.totalOrders * 10)}</span>
                  </div>
                </div>

                {selectedCustomer.recentOrders && selectedCustomer.recentOrders.length > 0 ? (
                  <div className="recent-orders">
                    <h4>Recent Orders</h4>
                    {selectedCustomer.recentOrders.map((order: any) => (
                      <div key={order.id} className="order-item">
                        <div className="order-info">
                          <span className="order-id">#{order.id.slice(-6)}</span>
                          <span className="order-date">{formatDate(order.createdAt)}</span>
                        </div>
                        <div className="order-amount">{formatCurrency(order.totalAmount || 0)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: '#666', padding: '1rem' }}>
                    No orders yet
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewCustomers;
