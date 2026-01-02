import { useState, useEffect } from 'react';
import { adminApi } from '../services/adminApi';

interface SalesRep {
  id: string;
  username: string;
  email: string;
  createdAt: any;
  isActive: boolean;
}

interface SalesRepDetails {
  id: string;
  username: string;
  email: string;
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  customers: any[];
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
      const data = await adminApi.getSalesRepDetails(repId);
      setSelectedRep(data as SalesRepDetails);
    } catch (err: any) {
      console.error('Error fetching rep details:', err);
    }
    setModalLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return `R${amount.toFixed(2)}`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
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
        <div className="sales-reps-list" style={{ marginTop: '30px' }}>
          <h4>Existing Sales Representatives</h4>
          {loading ? (
            <p>Loading...</p>
          ) : salesReps.length === 0 ? (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No sales representatives yet.</p>
          ) : (
            <div className="sales-reps-table">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Username</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Email</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Created</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {salesReps.map((rep) => (
                    <tr key={rep.id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px' }}>{rep.username}</td>
                      <td style={{ padding: '12px' }}>{rep.email}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          backgroundColor: rep.isActive ? '#d4edda' : '#f8d7da',
                          color: rep.isActive ? '#155724' : '#721c24',
                          fontSize: '12px'
                        }}>
                          {rep.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {rep.createdAt?.seconds 
                          ? new Date(rep.createdAt.seconds * 1000).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button 
                          onClick={() => viewRepDetails(rep.id)} 
                          className="view-details-button"
                          style={{ 
                            padding: '8px 12px', 
                            backgroundColor: '#007bff', 
                            color: '#fff', 
                            border: 'none', 
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
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
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }} onClick={() => setSelectedRep(null)}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          maxWidth: '700px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
        }} onClick={(e) => e.stopPropagation()}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.5rem',
            borderBottom: '2px solid #f0f0f0'
          }}>
            <h3 style={{ margin: 0 }}>{selectedRep.username}'s Profile</h3>
            <button 
              onClick={() => setSelectedRep(null)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '2rem',
                cursor: 'pointer',
                padding: 0,
                width: '40px',
                height: '40px',
                borderRadius: '50%'
              }}
            >×</button>
          </div>

          <div style={{ padding: '1.5rem' }}>
            {modalLoading ? (
              <p style={{ textAlign: 'center' }}>Loading...</p>
            ) : (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Total Customers</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{selectedRep.totalCustomers}</div>
                  </div>
                  <div style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Total Orders</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{selectedRep.totalOrders}</div>
                  </div>
                  <div style={{ background: '#e8f5e9', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ color: '#2e7d32', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Total Revenue</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2e7d32' }}>
                      {formatCurrency(selectedRep.totalRevenue)}
                    </div>
                  </div>
                </div>

                <div>
                  <h4>Customers ({selectedRep.customers.length})</h4>
                  {selectedRep.customers.length > 0 ? (
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {selectedRep.customers.map((customer: any) => (
                        <div key={customer.id} style={{
                          padding: '1rem',
                          background: '#fafafa',
                          borderRadius: '8px',
                          marginBottom: '0.75rem',
                          border: '1px solid #e0e0e0'
                        }}>
                          <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{customer.name}</div>
                          <div style={{ fontSize: '0.9rem', color: '#666' }}>{customer.email}</div>
                          <div style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.25rem' }}>
                            Added: {formatDate(customer.createdAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ textAlign: 'center', color: '#666', padding: '1rem' }}>No customers yet</p>
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
