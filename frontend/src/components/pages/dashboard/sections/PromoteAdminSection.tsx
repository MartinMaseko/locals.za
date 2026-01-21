import { useState, useEffect } from 'react';
import { adminApi } from '../services/adminApi';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

interface SalesRep {
  id: string;
  username: string;
  email: string;
  createdAt: any;
  isActive: boolean;
}

interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: any;
  customerName: string;
  salesRepCashedOut: boolean;
}

interface CashoutRequest {
  id: string;
  amount: number;
  orderCount: number;
  status: string;
  createdAt: any;
  orderIds: string[];
}

interface SalesRepDetails {
  id: string;
  username: string;
  email: string;
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  pendingCommission: number;
  totalCashedOut: number;
  customers: any[];
  orders: Order[];
  cashoutHistory: CashoutRequest[];
}

const PromoteAdminSection = () => {
  const [promoteUid, setPromoteUid] = useState('');
  const [promoteMsg, setPromoteMsg] = useState('');
  const [salesRepUsername, setSalesRepUsername] = useState('');
  const [salesRepEmail, setSalesRepEmail] = useState('');
  const [salesRepPassword, setSalesRepPassword] = useState('');
  const [salesRepMsg, setSalesRepMsg] = useState('');
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRep, setSelectedRep] = useState<SalesRepDetails | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [processingCashout, setProcessingCashout] = useState<string | null>(null);

  useEffect(() => {
    fetchSalesReps();
  }, []);

  const fetchSalesReps = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getSalesReps();
      setSalesReps(data);
    } catch (err: any) {
      console.error('Error fetching sales reps:', err);
    }
    setLoading(false);
  };

  const handlePromoteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoteMsg('');
    try {
      await adminApi.promoteToAdmin(promoteUid);
      setPromoteMsg('User promoted to admin!');
      setPromoteUid('');
    } catch (err: any) {
      setPromoteMsg(err?.response?.data?.error || 'Promotion failed');
    }
  };

  const handleAddSalesRep = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalesRepMsg('');
    try {
      await adminApi.promoteToSalesRep(salesRepUsername, salesRepEmail, salesRepPassword);
      setSalesRepMsg('Sales Rep created successfully!');
      setSalesRepUsername('');
      setSalesRepEmail('');
      setSalesRepPassword('');
      fetchSalesReps(); // Refresh the list
    } catch (err: any) {
      setSalesRepMsg(err?.response?.data?.error || 'Failed to create Sales Rep');
    }
  };

  const viewRepDetails = async (repId: string) => {
    setModalLoading(true);
    try {
      // Use the new admin endpoint for detailed info
      const response = await axios.get(`${API_URL}/api/sales/admin/${repId}/details`);
      setSelectedRep(response.data as SalesRepDetails);
    } catch (err: any) {
      console.error('Error fetching rep details:', err);
      setSalesRepMsg('Failed to load sales rep details. Please try again.');
    }
    setModalLoading(false);
  };

  const markCashoutAsPaid = async (cashoutId: string) => {
    setProcessingCashout(cashoutId);
    try {
      await axios.patch(`${API_URL}/api/sales/admin/cashout/${cashoutId}/mark-paid`);
      setSalesRepMsg('Cashout marked as paid successfully!');
      // Refresh the details
      if (selectedRep) {
        await viewRepDetails(selectedRep.id);
      }
    } catch (err: any) {
      console.error('Error marking cashout as paid:', err);
      setSalesRepMsg('Failed to mark cashout as paid. Please try again.');
    }
    setProcessingCashout(null);
  };

  const formatCurrency = (amount: number) => {
    return `R${(amount || 0).toFixed(2)}`;
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

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: { bg: '#fff3cd', color: '#856404' },
      processing: { bg: '#d1ecf1', color: '#0c5460' },
      paid: { bg: '#d4edda', color: '#155724' },
      cancelled: { bg: '#f8d7da', color: '#721c24' }
    };
    
    const style = colors[status as keyof typeof colors] || colors.pending;
    
    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: '600',
        backgroundColor: style.bg,
        color: style.color
      }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="admin-promotion-section">
      <h2>User Promotions</h2>
      
      {/* Promote to Admin Section */}
      <div className="promotion-card admin-promotion-card">
        <h3>Promote User to Admin</h3>
        <form onSubmit={handlePromoteAdmin} className="admin-form">
          <div className="form-group">
            <input 
              type="text" 
              placeholder="Firebase UID" 
              value={promoteUid} 
              onChange={e => setPromoteUid(e.target.value)} 
              required 
            />
          </div>
          <button type="submit" className="form-button">Promote to Admin</button>
          {promoteMsg && (
            <div className={promoteMsg.includes('failed') ? "error-message" : "success-message"}>
              {promoteMsg}
            </div>
          )}
        </form>
      </div>

      {/* Promote to Sales Rep Section */}
      <div className="promotion-card sales-promotion-card">
        <h3>Create Sales Representative</h3>
        <form onSubmit={handleAddSalesRep} className="admin-form">
          <div className="form-group">
            <input 
              type="text" 
              placeholder="Username" 
              value={salesRepUsername} 
              onChange={e => setSalesRepUsername(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <input 
              type="email" 
              placeholder="Email Address" 
              value={salesRepEmail} 
              onChange={e => setSalesRepEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <input 
              type="password" 
              placeholder="Password" 
              value={salesRepPassword} 
              onChange={e => setSalesRepPassword(e.target.value)} 
              required 
              minLength={6}
            />
          </div>
          <button type="submit" className="form-button sales-rep-button">
            Create Sales Rep
          </button>
          {salesRepMsg && (
            <div className={salesRepMsg.includes('failed') || salesRepMsg.includes('Failed') ? "error-message" : "success-message"}>
              {salesRepMsg}
            </div>
          )}
        </form>

        {/* Sales Reps List */}
        <div className="sales-reps-list">
          <h4>Existing Sales Representatives</h4>
          {loading ? (
            <p>Loading...</p>
          ) : salesReps.length === 0 ? (
            <p className="no-sales-reps">No sales representatives yet.</p>
          ) : (
            <div className="sales-reps-table-container">
              <table className="sales-reps-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salesReps.map((rep) => (
                    <tr key={rep.id}>
                      <td>{rep.username}</td>
                      <td>{rep.email}</td>
                      <td>
                        <span className={`sales-rep-status ${rep.isActive ? 'active' : 'inactive'}`}>
                          {rep.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        {rep.createdAt?.seconds 
                          ? new Date(rep.createdAt.seconds * 1000).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td>
                        <button 
                          onClick={() => viewRepDetails(rep.id)} 
                          className="view-details-button"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Sales Rep Details Modal */}
      {selectedRep && (
        <div className="sales-rep-modal-overlay" onClick={() => setSelectedRep(null)}>
          <div className="sales-rep-modal-container" onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div className="sales-rep-modal-header">
              <h3>{selectedRep.username}'s Profile</h3>
              <button className="sales-rep-modal-close" onClick={() => setSelectedRep(null)}>×</button>
            </div>

            <div className="sales-rep-modal-content">
              {modalLoading ? (
                <p className="modal-loading">Loading...</p>
              ) : (
                <>
                  {/* Statistics Cards */}
                  <div className="sales-rep-stats-grid">
                    <div className="salesDash-stat-card stat-customers">
                      <div className="salesDash-stat-label">Customers</div>
                      <div className="salesDash-stat-value">{selectedRep.totalCustomers}</div>
                    </div>
                    <div className="salesDash-stat-card stat-orders">
                      <div className="salesDash-stat-label">Orders</div>
                      <div className="salesDash-stat-value">{selectedRep.totalOrders}</div>
                    </div>
                    <div className="salesDash-stat-card stat-revenue">
                      <div className="salesDash-stat-label">Revenue</div>
                      <div className="salesDash-stat-value stat-value-revenue">
                        {formatCurrency(selectedRep.totalRevenue)}
                      </div>
                    </div>
                    <div className="salesDash-stat-card stat-pending">
                      <div className="salesDash-stat-label">Pending</div>
                      <div className="salesDash-stat-value stat-value-pending">
                        {formatCurrency(selectedRep.pendingCommission)}
                      </div>
                    </div>
                    <div className="salesDash-stat-card stat-paid">
                      <div className="salesDash-stat-label">Paid Out</div>
                      <div className="salesDash-stat-value stat-value-paid">
                        {formatCurrency(selectedRep.totalCashedOut)}
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="sales-rep-tabs">
                    <div className="sales-rep-tab-container">
                      <button className="sales-rep-tab active">
                        Cashout Requests
                      </button>
                    </div>
                  </div>

                  {/* Cashout Requests */}
                  <div>
                    <h4 className="cashout-section-title">Cashout Requests ({selectedRep.cashoutHistory.length})</h4>
                    {selectedRep.cashoutHistory.length > 0 ? (
                      <div className="cashout-requests-container">
                        {selectedRep.cashoutHistory.map((cashout: CashoutRequest) => (
                          <div key={cashout.id} className="cashout-request-item">
                            <div className="cashout-request-details">
                              <div className="cashout-header">
                                <div className="cashout-amount">
                                  {formatCurrency(cashout.amount)}
                                </div>
                                {getStatusBadge(cashout.status)}
                              </div>
                              <div className="cashout-meta">
                                {cashout.orderCount} orders • {formatDate(cashout.createdAt)}
                              </div>
                            </div>
                            {cashout.status === 'pending' && (
                              <button
                                onClick={() => markCashoutAsPaid(cashout.id)}
                                disabled={processingCashout === cashout.id}
                                className={`mark-paid-btn ${processingCashout === cashout.id ? 'processing' : ''}`}
                              >
                                {processingCashout === cashout.id ? 'Processing...' : 'Mark as Paid'}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-cashout-requests">No cashout requests yet</p>
                    )}
                  </div>

                  {/* Recent Orders */}
                  <div className="recent-orders-section">
                    <h4 className="recent-orders-title">Recent Orders ({selectedRep.orders.length})</h4>
                    {selectedRep.orders.length > 0 ? (
                      <div className="recent-orders-container">
                        {selectedRep.orders.slice(0, 10).map((order: Order) => (
                          <div key={order.id} className={`recent-order-item ${order.salesRepCashedOut ? 'paid' : 'unpaid'}`}>
                            <div className="order-info">
                              <div className="order-customer">{order.customerName}</div>
                              <div className="order-meta">
                                #{order.id.slice(-8)} • {formatDate(order.createdAt)}
                              </div>
                            </div>
                            <div className="order-summary">
                              <div className="order-total">{formatCurrency(order.total)}</div>
                              <div className={`order-status ${order.salesRepCashedOut ? 'paid' : 'pending'}`}>
                                {order.salesRepCashedOut ? 'Paid' : 'Pending'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-orders">No orders yet</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoteAdminSection;
