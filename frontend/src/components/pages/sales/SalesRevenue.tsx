import { useEffect, useState } from 'react';
import axios from 'axios';
import './salesStyles.css';

const API_URL = import.meta.env.VITE_API_URL;

interface Customer {
  id: string;
  email: string;
  name: string;
  totalOrders: number;
  totalSpent: number;
}

interface CustomerOrder {
  id: string;
  items: any[];
  total: number;
  adjustedTotal?: number;
  status: string;
  createdAt: any;
  userId: string;
  customerEmail?: string;
  customerName?: string;
}

interface RevenueData {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  revenuePerOrder: number;
  customers: Customer[];
  recentOrders: CustomerOrder[];
}

const SalesRevenue = () => {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const salesRepId = localStorage.getItem('salesRepId');
      if (!salesRepId) throw new Error('Please login to continue');

      // First, get all customers linked to this sales rep
      const { data: customers } = await axios.get<Customer[]>(
        `${API_URL}/api/sales/customers`,
        { headers: { Authorization: `Bearer ${salesRepId}` } }
      );

      console.log('Linked customers:', customers.length);

      if (customers.length === 0) {
        setRevenueData({
          totalRevenue: 0,
          totalOrders: 0,
          totalCustomers: 0,
          revenuePerOrder: 10,
          customers: [],
          recentOrders: []
        });
        setLoading(false);
        return;
      }

      // Fetch orders for each customer and aggregate
      const allOrders: CustomerOrder[] = [];
      const customerMap = new Map();

      // Create customer lookup map
      customers.forEach(customer => {
        customerMap.set(customer.userId || customer.id, {
          email: customer.email,
          name: customer.name
        });
      });

      // Define valid order statuses for commission calculation
      const validStatuses = ['pending', 'processing', 'in_transit', 'completed'];

      // Fetch orders for each customer
      for (const customer of customers) {
        try {
          const encodedEmail = encodeURIComponent(customer.email);
          
          // Use the existing order route that checks sales rep authorization
          const { data: customerOrders } = await axios.get<CustomerOrder[]>(
            `${API_URL}/api/orders/customer/email/${encodedEmail}`,
            { headers: { Authorization: `Bearer ${salesRepId}` } }
          );

          // Filter orders by valid statuses and add customer info
          const validOrders = customerOrders
            .filter(order => validStatuses.includes(order.status?.toLowerCase()))
            .map(order => ({
              ...order,
              customerEmail: customer.email,
              customerName: customer.name
            }));

          allOrders.push(...validOrders);
        } catch (orderError) {
          console.error(`Error fetching orders for ${customer.email}:`, orderError);
          // Continue with other customers even if one fails
        }
      }

      // Calculate revenue metrics
      const totalOrders = allOrders.length;
      const totalRevenue = totalOrders * 10; // R10 per order
      const totalCustomers = customers.length;
      const revenuePerOrder = 10;

      // Sort orders by date (newest first)
      const sortedOrders = allOrders.sort((a, b) => {
        const getTime = (timestamp: any) => {
          if (!timestamp) return 0;
          if (timestamp.seconds) return timestamp.seconds * 1000;
          if (typeof timestamp === 'string') return new Date(timestamp).getTime();
          return 0;
        };
        return getTime(b.createdAt) - getTime(a.createdAt);
      });

      // Get recent orders (last 20 for display)
      const recentOrders = sortedOrders.slice(0, 20);

      setRevenueData({
        totalRevenue,
        totalOrders,
        totalCustomers,
        revenuePerOrder,
        customers,
        recentOrders
      });

      console.log('Revenue calculation:', {
        totalOrders,
        totalRevenue,
        totalCustomers,
        recentOrdersCount: recentOrders.length
      });

    } catch (err: any) {
      console.error('Error fetching revenue data:', err);
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
    return date.toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="buyer-dashboard">
        <div className="buyer-section">
          <p style={{ textAlign: 'center', padding: '2rem' }}>
            Loading revenue data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="buyer-dashboard">
      <div className="buyer-section">
        <h2>My Revenue Dashboard</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '2rem' }}>
          You earn R10 for every order from your linked customers
        </p>

        {error && <div className="error-message">{error}</div>}

        {revenueData && (
          <>
            {/* Revenue Stats Cards */}
            <div className="revenue-stats">
              <div className="stat-card primary">
                <div className="stat-icon">💰</div>
                <div className="stat-content">
                  <h3>Total Earnings</h3>
                  <p className="stat-value">{formatCurrency(revenueData.totalRevenue)}</p>
                  <small>{revenueData.totalOrders} orders × R10</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📦</div>
                <div className="stat-content">
                  <h3>Total Orders</h3>
                  <p className="stat-value">{revenueData.totalOrders}</p>
                  <small>From linked customers</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <h3>Linked Customers</h3>
                  <p className="stat-value">{revenueData.totalCustomers}</p>
                  <small>Active customers</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">💵</div>
                <div className="stat-content">
                  <h3>Per Order Rate</h3>
                  <p className="stat-value">{formatCurrency(revenueData.revenuePerOrder)}</p>
                  <small>Fixed commission</small>
                </div>
              </div>
            </div>

            {/* Customer Performance Section */}
            {revenueData.customers.length > 0 && (
              <div className="customer-performance">
                <h3>Top Customers</h3>
                <div className="customers-revenue-grid">
                  {revenueData.customers
                    .sort((a, b) => b.totalOrders - a.totalOrders)
                    .slice(0, 6)
                    .map((customer) => (
                      <div key={customer.id} className="customer-revenue-card">
                        <div className="customer-info">
                          <h4>{customer.name}</h4>
                          <p className="customer-email">{customer.email}</p>
                        </div>
                        <div className="customer-stats">
                          <div className="stat">
                            <span className="stat-label">Orders:</span>
                            <span className="stat-value">{customer.totalOrders}</span>
                          </div>
                          <div className="stat">
                            <span className="stat-label">Your Earnings:</span>
                            <span className="stat-value highlight">
                              {formatCurrency(customer.totalOrders * 10)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Recent Orders Section */}
            {revenueData.recentOrders.length > 0 && (
              <div className="recent-earnings">
                <h3>Recent Orders</h3>
                <div className="earnings-table">
                  <div className="earnings-header">
                    <span>Order ID</span>
                    <span>Customer</span>
                    <span>Date</span>
                    <span>Status</span>
                    <span>Order Total</span>
                    <span>Your Earning</span>
                  </div>
                  {revenueData.recentOrders.map((order) => (
                    <div key={order.id} className="earnings-row">
                      <span className="order-id">#{order.id.slice(-6)}</span>
                      <span className="customer-info">
                        <div className="customer-name">{order.customerName}</div>
                        <div className="customer-email-small">{order.customerEmail}</div>
                      </span>
                      <span className="order-date">{formatDate(order.createdAt)}</span>
                      <span className={`order-status status-${order.status}`}>
                        {order.status}
                      </span>
                      <span className="order-total">
                        {formatCurrency(order.adjustedTotal || order.total || 0)}
                      </span>
                      <span className="earning highlight">{formatCurrency(10)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {revenueData.totalOrders === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>No Orders Yet</h3>
                <p>Your linked customers haven't placed any orders yet.</p>
                <p>
                  <strong>Tip:</strong> Encourage your customers to place their first order 
                  and start earning R10 per order!
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SalesRevenue;
