import { useEffect, useMemo, useState } from 'react';
import type { Order } from '../types';
import { adminApi } from '../services/adminApi';
import { useDiscounts } from '../hooks/useDiscounts';

interface ClientSectionProps {
  ordersState: {
    orders: Order[];
    loading: boolean;
    error: string;
    fetchOrders: (status?: string) => Promise<void> | void;
  };
  customerDetails: Record<string, any>;
  fetchCustomerDetails: (userId: string) => Promise<void> | void;
}

const formatDate = (date: any) => {
  if (!date) return 'Unknown';
  const d = date?.seconds ? new Date(date.seconds * 1000) : new Date(date);
  return d.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatCurrency = (value: number) => `R${Number(value || 0).toFixed(2)}`;

const ClientSection = ({ ordersState, customerDetails, fetchCustomerDetails }: ClientSectionProps) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Order[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [users, setUsers] = useState<Array<{ userId: string; name?: string; email?: string; phone?: string }>>([]);
  const [filteredUsers, setFilteredUsers] = useState<Array<{ userId: string; name?: string; email?: string; phone?: string }>>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserDiscount, setSelectedUserDiscount] = useState({ availableDiscount: 0, totalEarned: 0, totalUsed: 0 });
  const { fetchCustomerDiscount } = useDiscounts();

  useEffect(() => {
    ordersState.fetchOrders('');
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      setUsersLoading(true);
      setUsersError('');
      try {
        const data = await adminApi.getUserCount();
        const list = Array.isArray((data as any)?.users) ? (data as any).users : [];
        
        // The API returns 'user_id' field
        const normalized = list
          .map((u: any) => ({
            userId: u.user_id,  
            name: u.full_name || u.displayName || u.email || 'Unknown',
            email: u.email,
            phone: u.phone_number || u.phone
          }))
          .filter((u: any) => u.userId); // Filter out any without user_id
        
        setUsers(normalized);
        setFilteredUsers(normalized);
      } catch (err: any) {
        setUsersError(err?.message || 'Failed to load users');
      } finally {
        setUsersLoading(false);
      }
    };
    loadUsers();
  }, []);

  // Filter users when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = users.filter(user => {
      const email = (user.email || '').toLowerCase();
      return email.includes(query);
    });
    
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  const totalSpend = useMemo(() => {
    return selectedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  }, [selectedOrders]);

  const handleViewProfile = async (userId: string) => {
    setSelectedUserId(userId);
    setProfileError('');
    setProfileLoading(true);
    try {
      if (!customerDetails[userId]) {
        await fetchCustomerDetails(userId);
      }
      
      // Fetch customer discount
      const discount = await fetchCustomerDiscount(userId);
      setSelectedUserDiscount(discount as { availableDiscount: number; totalEarned: number; totalUsed: number });
      
      // Use allOrders (complete unfiltered list) instead of orders
      const allOrders = (ordersState as any).allOrders || ordersState.orders;
      
      console.log('=== CLIENT SECTION - DEBUG VIEW PROFILE ===');
      console.log('Looking for userId:', userId);
      console.log('Total orders (unfiltered):', allOrders.length);
      
      // Get all unique userIds
      const uniqueUserIds = [...new Set(allOrders.map((o: Order) => o.userId))];
      console.log('Unique userIds:', uniqueUserIds.length);
      console.log('Does userId exist?', uniqueUserIds.includes(userId));
      
      // Match orders
      const matchedOrders = allOrders.filter((o: Order) => o.userId === userId);
      
      console.log(`Matched ${matchedOrders.length} orders`);
      console.log('=== END CLIENT SECTION DEBUG ===');
      
      setSelectedOrders(matchedOrders);
    } catch (err: any) {
      console.error('❌ Error loading user orders:', err);
      setProfileError(err?.message || 'Failed to load user orders');
      setSelectedOrders([]);
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <div className="clients-section">
      <div className="clients-header">
        <h2>Client Profiles</h2>
        <div className="client-search">
          <input 
            type="text" 
            placeholder="Search by Email" 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)} 
            className="client-search-input" 
          />
        </div>
      </div>

      {(ordersState.loading || usersLoading) && <div className="loading-indicator">Loading clients...</div>}
      {(ordersState.error || usersError) && !(ordersState.loading || usersLoading) && (
        <div className="error-message">{ordersState.error || usersError}</div>
      )}

      {!ordersState.loading && !usersLoading && !ordersState.error && !usersError && (
        <div className="clients-table-container">
          <table className="clients-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Cell No</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => {
                const detail = customerDetails[user.userId];
                const name = detail?.name || user.name || 'Unknown Customer';
                const email = detail?.email || user.email || '—';
                const phone = detail?.phone || detail?.phone_number || user.phone || '—';
                return (
                  <tr key={user.userId} className={selectedUserId === user.userId ? 'selected-row' : ''}>
                    <td>{name}</td>
                    <td>{email}</td>
                    <td>{phone}</td>
                    <td>
                      <button className="view-button" onClick={() => handleViewProfile(user.userId)}>
                        View Profile
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                    {searchQuery ? `No users match "${searchQuery}"` : 'No users found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedUserId && (
        <div className="order-details-overlay" onClick={() => setSelectedUserId(null)}>
          <div className="order-details-modal client-profile-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedUserId(null)} aria-label="Close">&times;</button>

            <div className="modal-header">
              <h3>Customer Profile</h3>
              <div className="customer-contact-info">
                <span>{customerDetails[selectedUserId]?.name || 'Unknown'}</span> |
                <span> {customerDetails[selectedUserId]?.email || 'No email'}</span> |
                <span> {customerDetails[selectedUserId]?.phone || customerDetails[selectedUserId]?.phone_number || 'No phone'}</span>
              </div>
            </div>

            <div className="customer-stats-grid">
              <div className="stat-box">
                <h4>Total Orders</h4>
                <p className="stat-number">{selectedOrders.length}</p>
              </div>
              <div className="stat-box">
                <h4>Total Spent</h4>
                <p className="stat-number">{formatCurrency(totalSpend)}</p>
              </div>
              <div className="stat-box">
                <h4>Avg Order</h4>
                <p className="stat-number">{formatCurrency(selectedOrders.length ? totalSpend / selectedOrders.length : 0)}</p>
              </div>
              <div className="stat-box">
                <h4>Available Savings</h4>
                <p className="stat-number">{formatCurrency(selectedUserDiscount.availableDiscount)}</p>
              </div>
              <div className="stat-box">
                <h4>Total Earned</h4>
                <p className="stat-number">{formatCurrency(selectedUserDiscount.totalEarned)}</p>
              </div>
              <div className="stat-box">
                <h4>Total Used</h4>
                <p className="stat-number">{formatCurrency(selectedUserDiscount.totalUsed)}</p>
              </div>
            </div>

            <div className="customer-orders-section">
              <h4>Order History ({selectedOrders.length})</h4>
              {profileLoading && <div className="loading-indicator">Loading orders...</div>}
              {profileError && !profileLoading && <div className="error-message">{profileError}</div>}
              {!profileLoading && !profileError && (
                <div className="driver-orders-accordion">
                  {selectedOrders
                    .sort((a, b) => {
                      const aDate = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime();
                      const bDate = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime();
                      return bDate - aDate;
                    })
                    .map(order => (
                      <div key={order.id} className="order-accordion-item">
                        <div className="order-accordion-header">
                          <div className="order-accordion-summary">
                            <strong>{order.id}</strong>
                            <span>{formatDate(order.createdAt)}</span>
                            <span className={`status-badge ${order.status}`}>{order.status}</span>
                          </div>
                          <div>{formatCurrency(order.total || 0)}</div>
                        </div>
                      </div>
                    ))}
                  {selectedOrders.length === 0 && (
                    <div className="no-orders">No orders for this user.</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientSection;
