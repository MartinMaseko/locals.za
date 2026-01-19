import { useState, useEffect } from 'react';
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
  userId?: string;
}

interface CustomerOrder {
  id: string;
  items: any[];
  subtotal: number;
  serviceFee: number;
  total: number;
  status: string;
  createdAt: any;
  missingItems?: any[];
  refundAmount?: number;
  adjustedTotal?: number;
}

const ViewCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      // Get salesRepId from localStorage instead of Firebase Auth
      const salesRepId = localStorage.getItem('salesRepId');
      if (!salesRepId) throw new Error('Please login to continue');

      const { data } = await axios.get<Customer[]>(`${API_URL}/api/sales/customers`, {
        headers: { Authorization: `Bearer ${salesRepId}` }
      });

      setCustomers(data);
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setError(err?.response?.data?.error || 'Failed to load customers');
    }
    setLoading(false);
  };

  const fetchCustomerOrders = async (customer: Customer) => {
    setLoadingOrders(true);
    setOrdersError('');
    
    try {
      // Get salesRepId from localStorage
      const salesRepId = localStorage.getItem('salesRepId');
      if (!salesRepId) throw new Error('Please login to continue');
      
      const encodedEmail = encodeURIComponent(customer.email);
      const { data } = await axios.get<CustomerOrder[]>(
        `${API_URL}/api/orders/customer/email/${encodedEmail}`, 
        {
          headers: { Authorization: `Bearer ${salesRepId}` }
        }
      );
      
      setCustomerOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching customer orders:', err);
      setOrdersError(err?.response?.data?.error || 'Failed to load customer orders');
      setCustomerOrders([]);
    }
    
    setLoadingOrders(false);
  };

  const handleViewOrderHistory = async (customer: Customer) => {
    setSelectedCustomer(customer);
    await fetchCustomerOrders(customer);
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
          <p className="loading-message">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="buyer-dashboard">
      <div className="buyer-section">
        <h2>My Customers</h2>
        <p className="customers-total-count">
          Total Customers: {customers.length}
        </p>

        {error && <div className="error-message">{error}</div>}

        {customers.length === 0 ? (
          <p className="no-customers-message">
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
                </div>

                <button
                  className="view-details-btn"
                  onClick={() => handleViewOrderHistory(customer)}
                >
                  View Order History
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Enhanced Customer Detail Modal */}
        {selectedCustomer && (
          <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{selectedCustomer.name}'s Order History</h3>
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

                {loadingOrders && (
                  <div className="loading-container">
                    <p>Loading order details...</p>
                  </div>
                )}

                {ordersError && (
                  <div className="error-message">
                    {ordersError}
                  </div>
                )}

                {!loadingOrders && !ordersError && (
                  <div className="order-history-section">
                    <h4>Recent Orders ({customerOrders.length} total)</h4>
                    
                    {customerOrders.length === 0 ? (
                      <p className="no-orders-message">
                        No detailed orders found
                      </p>
                    ) : (
                      <div className="recent-orders-detailed">
                        {customerOrders.slice(0, 2).map((order: CustomerOrder) => (
                          <div key={order.id} className="order-detail-card">
                            <div className="order-header-info">
                              <div className="order-id-date">
                                <strong>Order #{order.id.slice(-6)}</strong>
                                <span className="order-date">{formatDate(order.createdAt)}</span>
                              </div>
                              <div className="order-status-total">
                                <span className={`order-status status-${order.status}`}>
                                  {order.status}
                                </span>
                                <span className="order-total">
                                  {formatCurrency(order.adjustedTotal || order.total)}
                                </span>
                              </div>
                            </div>

                            <div className="order-items-summary">
                              <h5>Items ({order.items.length})</h5>
                              <div className="items-list">
                                {order.items.slice(0, 3).map((item: any, idx: number) => (
                                  <div key={idx} className="item-summary">
                                    <span className="item-name">
                                      {item.product?.name || `Product #${item.productId}`}
                                    </span>
                                    <span className="item-qty">×{item.qty}</span>
                                  </div>
                                ))}
                                {order.items.length > 3 && (
                                  <div className="more-items">
                                    +{order.items.length - 3} more items
                                  </div>
                                )}
                              </div>
                            </div>

                            {(order.refundAmount ?? 0) > 0 && (
                              <div className="refund-info">
                                <span className="refund-label">Refund Applied:</span>
                                <span className="refund-amount">-{formatCurrency(order.refundAmount!)}</span>
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {customerOrders.length > 2 && (
                          <div className="more-orders-note">
                            Showing 2 of {customerOrders.length} orders
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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