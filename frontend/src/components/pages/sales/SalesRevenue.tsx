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
  salesRepCashedOut?: boolean;
}

interface RevenueData {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  revenuePerOrder: number;
  customers: Customer[];
  recentOrders: CustomerOrder[];
}

interface SalesRepInfo {
  name?: string | null;
  email?: string | null;
  lastCashoutDate?: string | null;
  lastCashoutAmount?: number;
  cashoutHistory?: CashoutRecord[];
  totalCashedOut?: number;
}

interface CashoutRecord {
  id: string;
  amount: number;
  orderCount: number;
  status: string;
  createdAt: string;
  orderIds: string[];
}

const SalesRevenue = () => {
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCashingOut, setIsCashingOut] = useState(false);
  const [cashoutSuccess, setCashoutSuccess] = useState(false);
  const [cashoutError, setCashoutError] = useState('');
  const [lastCashout, setLastCashout] = useState<string | null>(null);
  const [salesRepInfo, setSalesRepInfo] = useState<SalesRepInfo | null>(null);

  useEffect(() => {
    fetchRevenueData();
    fetchSalesRepInfo();
  }, []);

  const fetchSalesRepInfo = async () => {
    try {
      const salesRepId = localStorage.getItem('salesRepId');
      if (!salesRepId) return;

      const { data } = await axios.get<SalesRepInfo>(`${API_URL}/api/sales/info`, {
        headers: { Authorization: `Bearer ${salesRepId}` }
      });

      setSalesRepInfo(data);
      if (data.lastCashoutDate) {
        setLastCashout(data.lastCashoutDate);
      }
    } catch (error: any) {
      console.error('Error fetching sales rep info:', error);
      // Set default empty data instead of failing completely
      setSalesRepInfo({
        name: undefined,
        email: undefined,
        lastCashoutDate: undefined,
        lastCashoutAmount: 0,
        cashoutHistory: [],
        totalCashedOut: 0
      });
    }
  };

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
        customerMap.set(customer.id, {
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

          // Filter orders by valid statuses and exclude already cashed out orders
          const validOrders = customerOrders
            .filter(order => 
              validStatuses.includes(order.status?.toLowerCase()) &&
              !order.salesRepCashedOut // Exclude already cashed out orders
            )
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

    } catch (err: any) {
      console.error('Error fetching revenue data:', err);
      setError(err?.response?.data?.error || 'Failed to load revenue data');
    }
    
    setLoading(false);
  };

  const handleCashout = async () => {
    if (!revenueData || revenueData.totalOrders === 0) return;
    
    setIsCashingOut(true);
    setCashoutError('');
    setCashoutSuccess(false);
    
    try {
      const salesRepId = localStorage.getItem('salesRepId');
      const salesRepUsername = localStorage.getItem('salesRepUsername');
      
      if (!salesRepId) {
        throw new Error('Please login to continue');
      }
      
      // Get order IDs for cashout
      const orderIds = revenueData.recentOrders.map(order => order.id);
      
      // Calculate total amount
      const amount = revenueData.totalOrders * 10;

      await axios.post(`${API_URL}/api/sales/cashout`, {
        orderIds,
        amount,
        salesRepName: salesRepInfo?.name || salesRepUsername || 'Sales Rep',
        salesRepEmail: salesRepInfo?.email || 'No email provided'
      }, {
        headers: { Authorization: `Bearer ${salesRepId}` }
      });
      
      // Clear revenue data since orders are now cashed out
      setRevenueData({
        totalRevenue: 0,
        totalOrders: 0,
        totalCustomers: revenueData.totalCustomers,
        revenuePerOrder: 10,
        customers: revenueData.customers,
        recentOrders: []
      });
      
      // Set last cashout date
      setLastCashout(new Date().toISOString());
      
      // Show success message
      setCashoutSuccess(true);
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setCashoutSuccess(false);
      }, 5000);
      
    } catch (error: any) {
      console.error('Cashout failed:', error);
      setCashoutError(error?.response?.data?.error || 'Failed to process cashout. Please try again.');
    } finally {
      setIsCashingOut(false);
    }
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
          <p className="loading-message">
            Loading revenue data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-dashboard">
      <div className="sales-section">
        <h2>Revenue Dashboard</h2>
        <p className="revenue-subtitle">
          You earn R10 for every order from your linked customers
        </p>

        {error && <div className="error-message">{error}</div>}

        {revenueData && (
          <>
            {/* Revenue Stats Cards */}
            <div className="revenue-stats">
              <div className="stat-card primary">
                <div className="stat-icon">
                  <img width="50" height="50" src="https://img.icons8.com/ios/50/ffb803/cash-in-hand.png" alt="cash-in-hand"/>
                </div>
                <div className="stat-content">
                  <h3>Total Earnings</h3>
                  <p className="stat-value">{formatCurrency(revenueData.totalRevenue)}</p>
                  <small>{revenueData.totalOrders} orders × R10</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <img width="48" height="48" src="https://img.icons8.com/sf-regular/48/ffb803/add-shopping-cart.png" alt="add-shopping-cart"/>
                </div>
                <div className="stat-content">
                  <h3>Total Orders</h3>
                  <p className="stat-value">{revenueData.totalOrders}</p>
                  <small>From linked customers</small>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">
                  <img width="50" height="50" src="https://img.icons8.com/ios-filled/50/ffb803/gender-neutral-user.png" alt="gender-neutral-user"/>
                </div>
                <div className="stat-content">
                  <h3>Linked Customers</h3>
                  <p className="stat-value">{revenueData.totalCustomers}</p>
                  <small>Active customers</small>
                </div>
              </div>
            </div>
            
            {/* Request Payout Section */}
            <div className="request-payout">
              <div className="payout-card">
                <h3>Request Payout</h3>
                <div className="payout-summary">
                  <div className="payout-amount">
                    <span className="payout-label">Available for Payout:</span>
                    <span className="payout-value">{formatCurrency(revenueData.totalRevenue)}</span>
                  </div>
                  <div className="payout-orders">
                    <span className="payout-label">Orders:</span>
                    <span className="payout-count">{revenueData.totalOrders} orders × R10</span>
                  </div>
                  {lastCashout && (
                    <div className="last-payout">
                      <span className="payout-label">Last Payout:</span>
                      <span className="last-payout-date">{formatDate(lastCashout)}</span>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={handleCashout}
                  disabled={isCashingOut || revenueData.totalOrders === 0}
                  className="payout-btn"
                >
                  {isCashingOut ? 'Processing...' : `Request Payout - ${formatCurrency(revenueData.totalRevenue)}`}
                </button>
                
                {cashoutSuccess && (
                  <div className="payout-success">
                    <p>✅ Payout request submitted successfully!</p>
                    <p>Your payment will be processed by our admin team.</p>
                  </div>
                )}
                
                {cashoutError && (
                  <div className="payout-error">
                    <p>❌ {cashoutError}</p>
                  </div>
                )}
                
                <div className="payout-info">
                  <p>💡 <strong>Note:</strong> Payouts are processed manually by our admin team. You will receive an email confirmation once your payout has been approved and processed.</p>
                </div>
              </div>
            </div>
            
            {/* Cashout History Section */}
            {salesRepInfo?.cashoutHistory && salesRepInfo.cashoutHistory.length > 0 && (
              <div className="cashout-history-section">
                <h3>Payout History</h3>
                <div className="cashout-summary-stats">
                  <div className="cashout-stat-card">
                    <div className="cashout-stat-label">Total Paid Out</div>
                    <div className="cashout-stat-value">{formatCurrency(salesRepInfo.totalCashedOut || 0)}</div>
                  </div>
                  <div className="cashout-stat-card">
                    <div className="cashout-stat-label">Total Payouts</div>
                    <div className="cashout-stat-value">{salesRepInfo.cashoutHistory.length}</div>
                  </div>
                </div>
                <div className="cashout-history-list">
                  {salesRepInfo.cashoutHistory.slice(0, 5).map((cashout) => (
                    <div key={cashout.id} className="cashout-record">
                      <div className="cashout-record-header">
                        <div className="cashout-record-amount">
                          {formatCurrency(cashout.amount)}
                        </div>
                        <div className="cashout-record-date">
                          {formatDate(cashout.createdAt)}
                        </div>
                      </div>
                      <div className="cashout-record-details">
                        <span className="cashout-record-orders">
                          {cashout.orderCount} orders
                        </span>
                        <span className={`cashout-record-status status-${cashout.status}`}>
                          {cashout.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {salesRepInfo.cashoutHistory.length > 5 && (
                    <div className="more-cashouts-note">
                      Showing 5 of {salesRepInfo.cashoutHistory.length} payouts
                    </div>
                  )}
                </div>
              </div>
            )}

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
