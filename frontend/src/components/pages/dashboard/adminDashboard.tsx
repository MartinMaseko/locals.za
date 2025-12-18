import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, signOut } from 'firebase/auth';
import { app } from '../../../Auth/firebaseClient';
import Logo from '../../assets/logos/LZA ICON.png';
import './AdminStyle.css';

import { useOrders } from './hooks/useOrders';
import { useProducts } from './hooks/useProducts';
import { useDrivers } from './hooks/useDrivers';
import { useTokenManagement } from './hooks/useTokenManagement';
import {
  useFetchCustomerDetails,
  useFetchDriversList,
  useFetchDriverOrders,
  useFetchPaymentHistory,
  useCashoutRequests
} from './hooks/useFetch';
import { adminApi } from './services/adminApi';
import { dashboardStatsService } from './services/dashboardStatsService';
import { ordersService } from './services/ordersService';
import { cashoutService } from './services/cashoutService';
import {
  handleDriverRegistration,
  handleProductImageUpload,
  handleProductUpdate
} from './services/formHandlers';
import {
  formatDate,
  generateProductId,
  generateDriverId,
  vehicleTypes,
  productCategories
} from './utils/helpers';
import type { AdminProfile, Order, OrderItem } from './types/index';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Custom hooks for token and data management
  const { getToken } = useTokenManagement();
  const { customerDetails, fetchCustomerDetails } = useFetchCustomerDetails();
  const { driversList, fetchDriversList } = useFetchDriversList();
  const { driverOrders, fetchDriverOrders } = useFetchDriverOrders();
  const { driverPaymentHistory, paymentHistoryLoading, fetchPaymentHistory } = useFetchPaymentHistory();
  const { 
    cashoutList, 
    setCashoutList, 
    cashoutLoading, 
    cashoutError, 
    fetchCashoutRequests 
  } = useCashoutRequests();

  // Global admin state
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'dashboard'|'drivers'|'products'|'admin'|'orders'|'ProductManagement'|'ManageDrivers'>('dashboard');

  // Use custom hooks for data management
  const ordersState = useOrders();
  const productsState = useProducts();
  const driversState = useDrivers();

  // Modal & UI states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [selectedCashout, setSelectedCashout] = useState<any | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [loadingCustomer] = useState<Record<string, boolean>>({});
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [productImageUploading, setProductImageUploading] = useState(false);

  // Driver form state
  const [driverForm, setDriverForm] = useState({
    driver_id: generateDriverId(), 
    email: '', 
    password: '', 
    full_name: '', 
    phone_number: '',
    vehicle_type: '', 
    vehicle_model: '', 
    bank_details: '', 
    license_number: '', 
    license_image: null as File | null
  });

  // Product form state
  const [productForm, setProductForm] = useState({
    product_id: generateProductId(), 
    name: '', 
    description: '', 
    price: '', 
    brand: '', 
    category: '', 
    image: null as File | null
  });

  // Edit product form state
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editProductForm, setEditProductForm] = useState({
    name: '', 
    description: '', 
    price: '', 
    brand: '', 
    category: '', 
    imageFile: null as File | null, 
    image_url: ''
  });

  // Admin promotion state
  const [promoteUid, setPromoteUid] = useState('');
  const [promoteMsg, setPromoteMsg] = useState('');

  // Search & filter states
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('');
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');

  // Dashboard stats
  const [statsPeriod, setStatsPeriod] = useState<'30'|'60'|'90'|'all'>('30');
  const [dashboardStats, setDashboardStats] = useState({
    serviceRevenue: 0,
    orderRevenue: 0,
    topProducts: [] as {name: string, count: number, revenue: number}[]
  });
  const [userCount] = useState<number>(0);
  const [processingPayment, setProcessingPayment] = useState(false);


  useEffect(() => {
    const auth = getAuth(app);
    setLoading(true);
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { navigate('/adminlogin'); return; }
      try {
        const profile = await adminApi.getAdminProfile();
        if ((profile as any)?.user_type !== 'admin') { navigate('/adminlogin'); return; }
        setAdmin(profile as AdminProfile);
      } catch (err) {
        navigate('/adminlogin');
      } finally { setLoading(false); }
    });
    return () => unsub();
  }, [navigate]);

  // Fetch orders when section changes
  useEffect(() => {
    if (activeSection === 'orders' && admin) {
      ordersState.fetchOrders(orderStatusFilter);
    }
  }, [activeSection, admin, orderStatusFilter]);

  // Fetch products when section changes
  useEffect(() => {
    if (activeSection === 'ProductManagement' && admin) {
      productsState.fetchProducts();
    }
  }, [activeSection, admin]);

  // Fetch drivers list when section changes
  useEffect(() => {
    if (activeSection === 'ManageDrivers' && admin) {
      driversState.fetchAllDrivers();
    }
  }, [activeSection, admin]);

  // Fetch drivers for dropdown
  useEffect(() => {
    if (activeSection === 'orders' && admin) {
      driversState.fetchDrivers();
    }
  }, [activeSection, admin]);

  // Search & filter handlers
  useEffect(() => {
    ordersState.filterByQuery(orderSearchQuery);
  }, [orderSearchQuery]);

  useEffect(() => {
    productsState.filterByQuery(productSearchQuery);
  }, [productSearchQuery]);

  // Customer details fetcher
  useEffect(() => {
    if (selectedOrder?.userId) fetchCustomerDetails(selectedOrder.userId);
  }, [selectedOrder, fetchCustomerDetails]);

  const openEditProduct = (prod: any) => {
    setEditingProduct(prod);
    setEditProductForm({
      name: prod.name || '', description: prod.description || '', price: prod.price != null ? String(prod.price) : '',
      brand: prod.brand || '', category: prod.category || '', imageFile: null, image_url: prod.image_url || ''
    });
    setShowDriverDropdown(false);
  };
  const closeEditProduct = () => {
    setEditingProduct(null);
    setEditProductForm({ name: '', description: '', price: '', brand: '', category: '', imageFile: null, image_url: '' });
  };
  const handleEditProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditProductForm(prev => ({ ...prev, [name]: value }));
  };
  const handleEditProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditProductForm(prev => ({ ...prev, imageFile: e.target.files?.[0] || null }));
  };

  const handleUpdateProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingProduct) return;
    try {
      setProductImageUploading(true);
      const token = await getToken();
      const payload = await handleProductUpdate(editingProduct, editProductForm, token);
      await productsState.updateProduct(editingProduct.id || editingProduct.product_id, payload);
      closeEditProduct();
      productsState.setSuccess('Product updated successfully!');
    } catch (err: any) {
      console.error('handleUpdateProduct error', err);
      const errorMessage = err.message || 'Failed to update product';
      productsState.setError(errorMessage);
    } finally {
      setProductImageUploading(false);
    }
  };

  // register driver
  const handleDriverChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDriverForm(prev => ({ ...prev, [name]: value }));
  };
  const handleDriverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDriverForm(prev => ({ ...prev, license_image: e.target.files?.[0] || null }));
  };
  const handleRegisterDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getToken();
      await handleDriverRegistration(
        driverForm,
        token,
        () => {
          driversState.setSuccess('Driver registered successfully!');
          setDriverForm({ 
            driver_id: generateDriverId(), 
            email: '', 
            password: '', 
            full_name: '', 
            phone_number: '', 
            vehicle_type: '', 
            vehicle_model: '', 
            bank_details: '', 
            license_number: '', 
            license_image: null 
          });
        },
        (error: string) => driversState.setError(error)
      );
    } catch (err: any) {
      driversState.setError(err?.message || 'Driver registration failed');
    }
  };

  // product add handlers
  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProductForm(prev => ({ ...prev, [name]: value }));
  };
  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProductForm(prev => ({ ...prev, image: e.target.files?.[0] || null }));
  };
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    productsState.setError('');
    productsState.setSuccess('');
    try {
      const token = await getToken();
      let productImageUrl = '';
      
      if (productForm.image) {
        try {
          productImageUrl = await handleProductImageUpload(productForm.image, productForm.product_id);
        } catch (uploadErr: any) {
          productsState.setError(`Image upload failed: ${uploadErr.message}. Product will be created without an image.`);
        }
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/products`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          product_id: productForm.product_id,
          name: productForm.name,
          description: productForm.description,
          price: productForm.price,
          brand: productForm.brand,
          category: productForm.category,
          image_url: productImageUrl
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create product');
      }
      
      productsState.setSuccess('Product added successfully!');
      setProductForm({ product_id: generateProductId(), name: '', description: '', price: '', brand: '', category: '', image: null });
    } catch (err: any) {
      console.error('Product creation error:', err);
      productsState.setError(err?.message || 'Product creation failed');
    }
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

  // sign out
  const handleSignOut = async () => {
    try {
      const auth = getAuth(app);
      await signOut(auth);
      navigate('/adminlogin');
    } catch (err) { console.error('Sign out error', err); }
  };

  // keyboard close modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setSelectedOrder(null); setEditingProduct(null); setShowDriverDropdown(false); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // UseEffect to filter products based on search query - now using hook
  useEffect(() => {
    productsState.filterByQuery(productSearchQuery);
  }, [productSearchQuery]);

  // FetchDashboardStats for adminDashboard.tsx
  const fetchDashboardStats = async () => {
    if (!admin) return;
    
    try {
      const token = await getToken();
      
      // Try to fetch from backend
      const stats = await dashboardStatsService.fetchStats(token, statsPeriod);
      
      if (stats) {
        setDashboardStats({
          serviceRevenue: Number(stats.serviceRevenue || 0),
          orderRevenue: Number(stats.orderRevenue || 0),
          topProducts: Array.isArray(stats.topProducts) ? stats.topProducts : []
        });
        return;
      }
      
      // Fallback: Calculate stats locally
      console.log('Calculating stats locally');
      const allOrders = await ordersService.fetchAllOrders(token);
      const calculatedStats = dashboardStatsService.calculateStatsLocally(allOrders, statsPeriod);
      setDashboardStats(calculatedStats);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setDashboardStats({
        serviceRevenue: 0,
        orderRevenue: 0,
        topProducts: []
      });
    }
  };

  useEffect(() => {
    if (activeSection === 'dashboard' && admin) fetchDashboardStats();
  }, [activeSection, admin, statsPeriod]);

  // fetch data when section is activated
  useEffect(() => {
    if (activeSection === 'ManageDrivers') {
      fetchDriversList(getToken);
      fetchCashoutRequests();
    }
  }, [activeSection, getToken, fetchCashoutRequests, fetchDriversList]);

  // fetch orders when a driver is selected
  useEffect(() => {
    if (selectedDriver) {
      fetchDriverOrders(getToken, selectedDriver.driver_id || selectedDriver.id);
      
      // Also fetch payment history for this driver
      fetchPaymentHistory(getToken, selectedDriver.driver_id || selectedDriver.id);
    }
  }, [selectedDriver, fetchDriverOrders, fetchPaymentHistory, getToken]);

  // auth check
  useEffect(() => {
    const auth = getAuth(app);
    setLoading(true);
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { navigate('/adminlogin'); return; }
      try {
        const profile = await adminApi.getAdminProfile();
        if ((profile as any)?.user_type !== 'admin') { navigate('/adminlogin'); return; }
        setAdmin(profile as AdminProfile);
      } catch (err) {
        navigate('/adminlogin');
      } finally { setLoading(false); }
    });
    return () => unsub();
  }, [navigate]);

  if (loading) return <div className="admin-loading">Loading dashboard...</div>;

  // Render
  return (
    <div className="admin-dashboard">
      <div className="admin-layout">
        <div className="admin-sidebar">
          <div className="admin-header">
            <img src={Logo} className='dashLogo' alt='Logo' />
            <h3>Dashboard</h3>
            <div className="admin-info">{admin?.full_name || admin?.email}</div>
          </div>

          <nav className="admin-nav">
            <button className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveSection('dashboard')}>Dashboard</button>
            <button className={`nav-item ${activeSection === 'drivers' ? 'active' : ''}`} onClick={() => setActiveSection('drivers')}>Register Driver</button>
            <button className={`nav-item ${activeSection === 'ManageDrivers' ? 'active' : ''}`} onClick={() => setActiveSection('ManageDrivers')}>Manage Drivers</button>
            <button className={`nav-item ${activeSection === 'products' ? 'active' : ''}`} onClick={() => setActiveSection('products')}>Add Product</button>
            <button className={`nav-item ${activeSection === 'ProductManagement' ? 'active' : ''}`} onClick={() => setActiveSection('ProductManagement')}>Manage Products</button>
            <button className={`nav-item ${activeSection === 'admin' ? 'active' : ''}`} onClick={() => setActiveSection('admin')}>Promote to Admin</button>
            <button className={`nav-item ${activeSection === 'orders' ? 'active' : ''}`} onClick={() => setActiveSection('orders')}>Manage Orders</button>
            <div className="nav-spacer" />
            <button className="nav-item signout-btn" onClick={handleSignOut}>Sign Out</button>
          </nav>
        </div>

        <div className="admin-content">
          {activeSection === 'dashboard' && (
            <div className="dashboard-overview">
              <div className='dashboard-overview-header'>
                <div className='dashboard-overview-title'>Dashboard Overview</div>
                {/* Time period filters */}
                <div className="stats-period-filter">
                  <label>Period: </label>
                  <div className="period-options">
                    <button 
                      className={`period-option ${statsPeriod === '30' ? 'active' : ''}`}
                      onClick={() => setStatsPeriod('30')}
                    >
                      30 Days
                    </button>
                    <button 
                      className={`period-option ${statsPeriod === '60' ? 'active' : ''}`}
                      onClick={() => setStatsPeriod('60')}
                    >
                      60 Days
                    </button>
                    <button 
                      className={`period-option ${statsPeriod === '90' ? 'active' : ''}`}
                      onClick={() => setStatsPeriod('90')}
                    >
                      90 Days
                    </button>
                    <button 
                      className={`period-option ${statsPeriod === 'all' ? 'active' : ''}`}
                      onClick={() => setStatsPeriod('all')}
                    >
                      All Time
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="dashboard-stats">
                <div className="stat-card"><h3>Products</h3><p className="stat-number">{productsState.products.length}</p></div>
                <div className="stat-card"><h3>Drivers</h3><p className="stat-number">{driversState.drivers.length}</p></div>
                <div className="stat-card"><h3>Orders</h3><p className="stat-number">{ordersState.orders.length}</p></div>
                
                <div className="stat-card">
                  <h3>Service Revenue</h3>
                  <p className="stat-number">R{dashboardStats.serviceRevenue.toFixed(2)}</p>
                  <p className="stat-period">Last {statsPeriod === 'all' ? 'all time' : `${statsPeriod} days`}</p>
                </div>
                
                <div className="stat-card">
                  <h3>Order Revenue</h3>
                  <p className="stat-number">R{dashboardStats.orderRevenue.toFixed(2)}</p>
                  <p className="stat-period">Last {statsPeriod === 'all' ? 'all time' : `${statsPeriod} days`}</p>
                </div>
                <div className="stat-card">
                  <h3>Users</h3>
                  <p className="stat-number">{userCount}</p>
                  <p className="stat-period">Total registered users</p>
                </div>
                <div className="stat-card">
                  <h3>Driver Payments</h3>
                  <p className="stat-number">
                    R{(ordersState.orders.filter(o => 
                      (o.status === 'delivered' || o.status === 'completed') && o.driver_id
                    ).length * 40).toFixed(2)}
                  </p>
                  <p className="stat-period">Total driver payments</p>
                </div>
                
                <div className="stat-card top-products">
                  <h3>Top Selling Products</h3>
                  {dashboardStats.topProducts.length > 0 ? (
                    dashboardStats.topProducts.map((product, idx) => (
                      <div key={idx} className="stat-product">
                        <span className="product-name">{product.name}</span>
                        <span className="product-count">{product.count} sold</span>
                      </div>
                    ))
                  ) : (
                    <p className="no-data">No product data</p>
                  )}
                  <p className="stat-period">Last {statsPeriod === 'all' ? 'all time' : `${statsPeriod} days`}</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'drivers' && (
            <div className="driver-form-section">
              <h2>Register New Driver</h2>
              <form onSubmit={handleRegisterDriver} className="admin-form">
                <div className="form-group"><input name="email" type="email" placeholder="Driver Email" value={driverForm.email} onChange={handleDriverChange} required /></div>
                <div className="form-group"><input name="password" type="password" placeholder="Password" value={driverForm.password} onChange={handleDriverChange} required /></div>
                <div className="form-group"><input name="full_name" type="text" placeholder="Full Name" value={driverForm.full_name} onChange={handleDriverChange} required /></div>
                <div className="form-group"><input name="phone_number" type="tel" placeholder="Phone Number" value={driverForm.phone_number} onChange={handleDriverChange} required /></div>
                <div className="form-group"><select name="vehicle_type" value={driverForm.vehicle_type} onChange={handleDriverChange} required className='form-select'><option value="">Select Vehicle Type</option>{vehicleTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div className="form-group"><input name="vehicle_model" type="text" placeholder="Vehicle Model" value={driverForm.vehicle_model} onChange={handleDriverChange} required /></div>
                <div className="form-group"><input name="bank_details" type="text" placeholder="Bank Details" value={driverForm.bank_details} onChange={handleDriverChange} required /></div>
                <div className="form-group"><input name="license_number" type="text" placeholder="License Number" value={driverForm.license_number} onChange={handleDriverChange} required /></div>
                <div className="form-group file-input-group"><label>License Image:</label><input name="license_image" type="file" accept="image/*" onChange={handleDriverImageChange} /></div>
                <button type="submit" className="form-button">Register Driver</button>
                {driversState.error && <div className="error-message">{driversState.error}</div>}
                {driversState.success && <div className="success-message">{driversState.success}</div>}
              </form>
            </div>
          )}

          {activeSection === 'products' && (
            <div className="product-form-section">
              <h2>Add New Product</h2>
              <form onSubmit={handleAddProduct} className="admin-form">
                <div className="form-group"><input id="product_input" name="product_id" type="text" placeholder="Product ID" value={productForm.product_id} readOnly className="readonly-input" /></div>
                <div className="form-group"><input id="product_input" name="name" type="text" placeholder="Product Name" value={productForm.name} onChange={handleProductChange} required /></div>
                <div className="form-group"><input id="product_input" name="brand" type="text" placeholder="Brand" value={productForm.brand} onChange={handleProductChange} required /></div>
                <div className="form-group">
                  <select name="category" value={productForm.category} onChange={handleProductChange} required>
                    <option value="">Select Category</option>
                    {productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    {!productCategories.includes('Food Packaging') && <option value="Food Packaging">Food Packaging</option>}
                    {!productCategories.includes('Sauces') && <option value="Sauces">Sauces</option>}
                  </select>
                </div>
                <div className="form-group"><input id="product_input" name="description" type="text" placeholder="Description" value={productForm.description} onChange={handleProductChange} required /></div>
                <div className="form-group"><input id="product_input" name="price" type="number" placeholder="Price" value={productForm.price} onChange={handleProductChange} required /></div>
                <div className="form-group file-input-group"><label>Product Image:</label><input name="image" type="file" accept="image/*" onChange={handleProductImageChange} /></div>
                <button type="submit" className="form-button">Add Product</button>
                {productsState.error && <div className="error-message">{productsState.error}</div>}
                {productsState.success && <div className="success-message">{productsState.success}</div>}
              </form>
            </div>
          )}

          {activeSection === 'admin' && (
            <div className="admin-promotion-section">
              <h2>Promote User to Admin</h2>
              <form onSubmit={handlePromoteAdmin} className="admin-form">
                <div className="form-group"><input type="text" placeholder="Firebase UID" value={promoteUid} onChange={e => setPromoteUid(e.target.value)} required /></div>
                <button type="submit" className="form-button">Promote to Admin</button>
                {promoteMsg && <div className={promoteMsg.includes('failed') ? "error-message" : "success-message"}>{promoteMsg}</div>}
              </form>
            </div>
          )}

          {activeSection === 'orders' && (
            <div className="orders-section">
              <div className="orders-header">
                <h2>Manage Orders</h2>
                <div className="order-search"><input type="text" placeholder="Search by Order ID" value={orderSearchQuery} onChange={e => setOrderSearchQuery(e.target.value)} className="order-search-input" /></div>
                <div className="orders-controls">
                  <div className="orders-filter">
                    <select value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)}><option value="">All Orders</option><option value="pending">Pending</option><option value="processing">Processing</option><option value="in transit">In Transit</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
                    <button onClick={() => ordersState.fetchOrders(orderStatusFilter)} className="refresh-button">Refresh</button>
                  </div>
                </div>
              </div>

              {ordersState.loading ? <div className="loading-indicator">Loading orders...</div> :
                ordersState.error ? <div className="error-message">{ordersState.error}</div> :
                ordersState.filteredOrders.length === 0 ? <div className="no-orders">{orderSearchQuery ? `No orders match "${orderSearchQuery}"` : 'No orders found'}</div> :
                <div className="orders-grid"><div className="orders-list">
                  <table className="orders-table">
                    <thead><tr><th>Order ID</th><th>Date</th><th>Customer</th><th>Total</th><th>Status</th><th>Rating</th><th>Actions</th></tr></thead>
                    <tbody>
                      {ordersState.filteredOrders.map((order: any) => (
                        <tr key={order.id} onClick={() => setSelectedOrder(order as Order)} className={selectedOrder?.id === order.id ? 'selected' : ''}>
                          <td>{order.id?.substring(0,8)}...</td>
                          <td>{formatDate(order.createdAt)}</td>
                          <td>{order.userId?.substring(0,8)}...</td>
                          <td>R{Number(order.total || 0).toFixed(2)}</td>
                          <td><div className={`status-badge ${order.status}`}>{order.status}</div></td>
                          <td>
                            {order.status === 'completed' ? (
                              order.rating ? (
                                <div className="table-rating">
                                  <div className="table-stars">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <span 
                                        key={star} 
                                        className={`table-star ${star <= (order.rating || 0) ? 'filled' : ''}`}
                                      >
                                        ★
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <span className="no-table-rating">Not rated</span>
                              )
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                          <td><div className="action-buttons"><button onClick={(e)=>{e.stopPropagation(); setSelectedOrder(order as Order);}} className="view-button">View</button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div></div>
              }

              {selectedOrder && (
                <div className="order-details-overlay" onClick={() => { setSelectedOrder(null); setShowDriverDropdown(false); }}>
                  <div className="order-details-modal" onClick={e => e.stopPropagation()}>
                    <button className="modal-close" onClick={() => { setSelectedOrder(null); setShowDriverDropdown(false); }} aria-label="Close">&times;</button>
                    <h3>Order Details</h3>
                    <div className="order-info">
                      <div className="order-header">
                        <div><strong>Order ID:</strong> {selectedOrder.id}</div>
                        <div><strong>Date:</strong> {formatDate(selectedOrder.createdAt)}</div>
                      </div>

                      <div className="customer-info">
                        {loadingCustomer[selectedOrder.userId] ? <div className="customer-name-loading">Loading customer info...</div> :
                          customerDetails[selectedOrder.userId] ? <div className="customer-name"><strong>Customer Name:</strong> {customerDetails[selectedOrder.userId].name}</div> : null}
                        <div><strong>Customer ID:</strong> {selectedOrder.userId}</div>
                      </div>

                      <div className="status-section">
                        <div className="current-status"><strong>Status:</strong><div className={`status-badge ${selectedOrder.status}`}>{selectedOrder.status}</div></div>
                        <div className="status-actions"><strong>Update Status:</strong>
                          <div className="status-buttons">
                            <button onClick={() => { ordersState.updateStatus(selectedOrder.id,'processing'); }} className="status-btn processing">Processing</button>
                            <button onClick={() => { ordersState.updateStatus(selectedOrder.id,'in transit'); }} className="status-btn shipped">In Transit</button>
                            <button onClick={() => { ordersState.updateStatus(selectedOrder.id,'delivered'); }} className="status-btn delivered">Delivered</button>
                            <button onClick={() => { ordersState.updateStatus(selectedOrder.id,'cancelled'); }} className="status-btn cancelled">Cancel</button>
                          </div>
                        </div>
                      </div>

                      <div className="delivery-info"><strong>Delivery Address:</strong>
                        <div className="address">{selectedOrder.deliveryAddress?.street}, {selectedOrder.deliveryAddress?.city}, {selectedOrder.deliveryAddress?.postalCode}</div>
                      </div>

                      <div className="driver-section">
                        <strong>Driver Assignment:</strong>
                        <div className="driver-info">
                          {selectedOrder.driver_id ? (
                            <>
                              <div className="assigned-driver"><span className="driver-label">Assigned to driver:</span><span className="driver-name">{driversState.drivers.find(d => d.id === selectedOrder.driver_id)?.name || selectedOrder.driver_id}</span></div>
                              <button onClick={() => setShowDriverDropdown(s => !s)} className="assign-button">Reassign Driver</button>
                            </>
                          ) : (
                            <>
                              <div>No driver assigned</div>
                              <button onClick={() => setShowDriverDropdown(s => !s)} className="assign-button">Assign Driver</button>
                            </>
                          )}

                          {showDriverDropdown && (
                            <div className="driver-dropdown">
                              {driversState.loading ? <div className="dropdown-loading">Loading drivers...</div> :
                                driversState.drivers.length === 0 ? <div className="dropdown-empty">No drivers available</div> :
                                  <div className="dropdown-list">
                                    {selectedOrder.driver_id && <div className="dropdown-item unassign" onClick={() => { ordersState.assignDriver(selectedOrder.id, null); setShowDriverDropdown(false); }}><span className="unassign-icon">❌</span> Remove Driver</div>}
                                    {driversState.drivers.map(d => <div key={d.id} className={`dropdown-item ${selectedOrder.driver_id === d.id ? 'selected' : ''}`} onClick={() => { ordersState.assignDriver(selectedOrder.id, d.id); setShowDriverDropdown(false); }}>{d.name}</div>)}
                                  </div>}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="items-section">
                        <strong>Order Items:</strong>
                        <table className="items-table">
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Qty</th>
                              <th>Price</th>
                              <th>Status</th> 
                            </tr>
                          </thead>
                          <tbody>
                            {selectedOrder.items.map((it, idx) => {
                              // Check if this item has any missing quantities
                              const missingItem = selectedOrder.missingItems?.find(
                                (mi: any) => mi.productId === it.productId
                              );
                              
                              const isFullyAvailable = !missingItem;
                              const isPartiallyAvailable = missingItem && typeof missingItem.missingQuantity === 'number' && missingItem.missingQuantity < it.qty;
                              
                              return (
                                <tr key={idx} className={isFullyAvailable ? '' : 'missing-item-row'}>
                                  <td>{it.product?.name || `Product ${it.productId}`}</td>
                                  <td>
                                    {it.qty}
                                    {isPartiallyAvailable && typeof missingItem?.missingQuantity === 'number' && (
                                      <span className="available-qty-note">
                                        ({it.qty - missingItem.missingQuantity} available)
                                      </span>
                                    )}
                                  </td>
                                  <td>{it.product?.price ? `R${(it.product.price * it.qty).toFixed(2)}` : 'N/A'}</td>
                                  <td className="item-status-cell">
                                    {isFullyAvailable ? (
                                      <span className="item-status available">Available</span>
                                    ) : isPartiallyAvailable ? (
                                      <span className="item-status partial">
                                        Partially Available
                                        <div className="item-status-tooltip">
                                          {missingItem.missingQuantity} out of {it.qty} missing
                                          <br/>
                                          Reason: {missingItem.reason}
                                        </div>
                                      </span>
                                    ) : (
                                      <span className="item-status missing">
                                        Not Available
                                        <div className="item-status-tooltip">
                                          Reason: {missingItem.reason}
                                        </div>
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={2}>Subtotal</td>
                              <td colSpan={2}>R{Number(selectedOrder.subtotal).toFixed(2)}</td>
                            </tr>
                            <tr>
                              <td colSpan={2}>Service Fee</td>
                              <td colSpan={2}>R{Number(selectedOrder.serviceFee).toFixed(2)}</td>
                            </tr>
                            
                            {/* Show refund information if there are missing items */}
                            {(selectedOrder.refundAmount || 0) > 0 && (
                              <tr className="refund-row">
                                <td colSpan={2}>Refund for Missing Items</td>
                                <td colSpan={2} className="refund-amount">-R{Number(selectedOrder.refundAmount).toFixed(2)}</td>
                              </tr>
                            )}
                            
                            <tr className="total-row">
                              <td colSpan={2}>Total</td>
                              <td colSpan={2}>
                                R{Number(selectedOrder.adjustedTotal || selectedOrder.total).toFixed(2)} 
                                {selectedOrder.adjustedTotal && selectedOrder.adjustedTotal !== selectedOrder.total && (
                                  <span className="original-price">
                                    <br/> was R{Number(selectedOrder.total).toFixed(2)}
                                  </span>
                                )}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                        
                        {/* Missing items summary section */}
                        {selectedOrder.missingItems && selectedOrder.missingItems.length > 0 && (
                          <div className="missing-items-summary">
                            <h4>Missing Items Summary</h4>
                            <div className="missing-items-info">
                              <p>
                                <span className="info-label">Items Affected:</span> 
                                <span className="info-value">{selectedOrder.missingItems.length}</span>
                              </p>
                              <p>
                                <span className="info-label">Refund Amount:</span> 
                                <span className="info-value">R{Number(selectedOrder.refundAmount || 0).toFixed(2)}</span>
                              </p>
                              <p>
                                <span className="info-label">Refund Status:</span> 
                                <span className={`info-value refund-status-${selectedOrder.refundStatus || 'pending'}`}>
                                  {(selectedOrder.refundStatus || 'pending').toUpperCase()}
                                </span>
                              </p>
                              {selectedOrder.driverNote && (
                                <p>
                                  <span className="info-label">Driver Note:</span> 
                                  <span className="info-value driver-note">{selectedOrder.driverNote}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Rating section - only show for completed orders */}
                      {selectedOrder?.status === 'completed' && (
                        <div className="rating-section">
                          <strong>Customer Rating:</strong>
                          {selectedOrder.rating ? (
                            <div className="order-rating">
                              <div className="rating-stars">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <span 
                                    key={star} 
                                    className={`admin-star ${star <= (selectedOrder.rating || 0) ? 'filled' : ''}`}
                                  >
                                    ★
                                  </span>
                                ))}
                                <span className="rating-value">{selectedOrder.rating}/5</span>
                              </div>
                              {selectedOrder.ratingComment && (
                                <div className="rating-comment">
                                  "{selectedOrder.ratingComment}"
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="no-rating">Customer has not rated this order yet</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'ProductManagement' && (
            <div className="product-management-section">
              <div className="product-management-header">
                <h2>Manage Products</h2>
                {/* Product search input */}
                <div className="product-search-container">
                  <input
                    type="text"
                    placeholder="Search by name, brand or ID"
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className="product-search-input"
                  />
                {productSearchQuery && (
                  <button 
                    className="clear-search"
                    onClick={() => setProductSearchQuery('')}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

              {productsState.loading ? <div className="loading-indicator">Loading products...</div> :
                productsState.error ? <div className="error-message">{productsState.error}</div> :
                productsState.products.length === 0 ? <div className="no-products">No products found</div> :
                productsState.filteredProducts.length === 0 ? <div className="no-products">No products matching "{productSearchQuery}"</div> :
                <div className="products-grid">
                  <div className="products-list">
                    <table className="orders-table products-table">
                      <thead><tr><th>Product ID</th><th>Image</th><th>Name</th><th>Category</th><th>Brand</th><th>Price</th><th>Actions</th></tr></thead>
                      <tbody>
                        {productsState.filteredProducts.map(p => (
                          <tr key={p.id || p.product_id}>
                            <td>{(p.id || p.product_id)?.toString().substring(0,10)}...</td>
                            <td>{p.image_url ? <img src={p.image_url} alt={p.name} className="product-thumb"/> : <div className="no-thumb">—</div>}</td>
                            <td>{p.name}</td><td>{p.category}</td><td>{p.brand}</td><td>R{Number(p.price || 0).toFixed(2)}</td>
                            <td><div className="action-buttons"><button onClick={() => openEditProduct(p)} className="view-button">Edit</button></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              }

              {editingProduct && (
                <div className="order-details-overlay" onClick={closeEditProduct}>
                  <div className="order-details-modal" onClick={e => e.stopPropagation()}>
                    <button className="modal-close" onClick={closeEditProduct} aria-label="Close">&times;</button>
                    <h3>Edit Product</h3>
                    <form onSubmit={handleUpdateProduct} className="product-edit-form">
                      <div className="form-group">
                        <label>Product ID</label>
                        <div className="readonly-input">{editingProduct.id || editingProduct.product_id}</div>
                      </div>
                      <div className="form-group">
                        <label>Name</label>
                        <input name="name" value={editProductForm.name} onChange={handleEditProductChange} required />
                      </div>
                      <div className="form-group">
                        <label>Category</label>
                        <input name="category" value={editProductForm.category} onChange={handleEditProductChange} />
                      </div>
                      <div className="form-group">
                        <label>Brand</label>
                        <input name="brand" value={editProductForm.brand} onChange={handleEditProductChange} />
                      </div>
                      <div className="form-group">
                        <label>Price</label>
                        <input name="price" type="number" step="0.01" value={editProductForm.price} onChange={handleEditProductChange} required />
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <textarea className="form-textarea" name="description" value={editProductForm.description} onChange={handleEditProductChange} rows={4} />
                      </div>
                      <div className="form-group file-input-group">
                        <label>Image (leave empty to keep current)</label>
                        <input name="image" type="file" accept="image/*" onChange={handleEditProductImageChange} />{editProductForm.image_url && !editProductForm.imageFile && (<div className="current-image-preview"><img className='current-image' src={editProductForm.image_url} alt="current" /></div>)}
                      </div>
                      <div className="form-actions">
                        <button type="submit" className="form-button" disabled={productImageUploading}>{productImageUploading ? 'Uploading…' : 'Save changes'}</button>
                        <button type="button" className="form-button secondary" onClick={closeEditProduct}>Cancel</button>
                      </div>
                      {productsState.error && <div className="error-message">{productsState.error}</div>}
                      {productsState.success && <div className="success-message">{productsState.success}</div>}
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeSection === 'ManageDrivers' && (
            <div className="manage-drivers-section">
              <div className="section-header">
                <h2>Manage Drivers</h2>
                
                {/* Add tabs for drivers list and cashout requests */}
                <div className="driver-management-tabs">
                  <button 
                    className={`tab-button ${!selectedDriver && !selectedCashout ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedDriver(null);
                      setSelectedCashout(null);
                    }}
                  >
                    All Drivers
                  </button>
                  <button 
                    className={`tab-button ${!!selectedCashout ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedDriver(null);
                      fetchCashoutRequests();
                      setSelectedCashout({ id: 'all' });
                    }}
                  >
                    Cashout Requests
                    {cashoutList.filter(c => c.status === 'pending').length > 0 && (
                      <span className="pending-count">{cashoutList.filter(c => c.status === 'pending').length}</span>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Show cashout requests table when selectedCashout is set */}
              {selectedCashout ? (
                <div className="cashout-requests-container">
                  <h3>Driver Cashout Requests</h3>
                  
                  {cashoutLoading ? (
                    <div className="loading-indicator">Loading cashout requests...</div>
                  ) : cashoutError ? (
                    <div className="error-message">{cashoutError}</div>
                  ) : cashoutList.length === 0 ? (
                    <div className="no-cashouts">No cashout requests found</div>
                  ) : (
                    <div className="cashout-table-container">
                      <table className="cashout-table">
                        <thead>
                          <tr>
                            <th>Request Date</th>
                            <th>Driver</th>
                            <th>Amount</th>
                            <th>Deliveries</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cashoutList.map(cashout => (
                            <tr 
                              key={cashout.id}
                              className={`${cashout.status === 'pending' ? 'pending-row' : ''} ${cashout.status === 'completed' ? 'completed-row' : ''}`}
                            >
                              <td>{formatDate(cashout.createdAt)}</td>
                              <td>{cashout.driverName || 'Unknown'}</td>
                              <td className="amount-cell">R{Number(cashout.amount || 0).toFixed(2)}</td>
                              <td>{cashout.orderCount || 0} deliveries</td>
                              <td>
                                <span className={`cashout-status status-${cashout.status || 'pending'}`}>
                                  {cashout.status === 'completed' ? 'Paid' : 'Pending'}
                                </span>
                                {cashout.paidAt && <div className="paid-date">Paid on {formatDate(cashout.paidAt)}</div>}
                              </td>
                              <td>
                                {cashout.status === 'pending' ? (
                                  <button 
                                    className="pay-button"
                                    onClick={async () => {
                                      setProcessingPayment(true);
                                      try {
                                        const token = await getToken();
                                        await cashoutService.processPayment(token, cashout.id);
                                        setCashoutList(prev => prev.map(c => 
                                          c.id === cashout.id ? { ...c, status: 'completed', paidAt: new Date().toISOString() } : c
                                        ));
                                        fetchDriversList(getToken);
                                        setSelectedCashout(null);
                                      } catch (err: any) {
                                        console.error('Error processing payment:', err);
                                      } finally {
                                        setProcessingPayment(false);
                                      }
                                    }}
                                    disabled={processingPayment}
                                  >
                                    {processingPayment ? 'Processing...' : 'Mark as Paid'}
                                  </button>
                                ) : (
                                  <span className="already-paid">Paid ✓</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                // Original drivers table content here
                <div className="drivers-table-container">
                  <table className="drivers-table">
                    <thead>
                      <tr>
                        <th>Driver Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Vehicle</th>
                        <th>Assigned Orders</th>
                        <th>Accepted Orders</th>
                        <th>Delivered Orders</th>
                        <th>Revenue</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driversList.map(driver => {
                        // Get this driver's orders 
                        const driverId = driver.driver_id || driver.id;
                        const driverOrderCount = ordersState.orders.filter(o => o.driver_id === driverId).length;
                        // Only count orders with status 'delivered' or 'completed' for revenue
                        const driverDeliveredCount = ordersState.orders.filter(o => 
                          o.driver_id === driverId && 
                          (o.status === 'delivered' || o.status === 'completed')
                        ).length;
                        const driverAcceptedCount = ordersState.orders.filter(o => 
                          o.driver_id === driverId && 
                          (o.status === 'processing' || o.status === 'in transit' || o.status === 'delivered' || o.status === 'completed')
                        ).length;
                        // Calculate revenue at R40 per completed delivery
                        const driverRevenue = driverDeliveredCount * 40;
                        
                        return (
                          <tr 
                            key={driverId} 
                            className={selectedDriver?.driver_id === driver.driver_id ? 'selected-row' : ''}
                            onClick={() => setSelectedDriver(driver)}
                          >
                            <td>{driver.full_name || 'Unknown'}</td>
                            <td>{driver.email || 'N/A'}</td>
                            <td>{driver.phone_number || 'N/A'}</td>
                            <td>{driver.vehicle_type} {driver.vehicle_model}</td>
                            <td>{driverOrderCount}</td>
                            <td>{driverAcceptedCount}</td>
                            <td>{driverDeliveredCount}</td>
                            <td className="revenue-cell">R{driverRevenue.toFixed(2)}</td>
                            <td>
                              <div className="action-buttons">
                                <button 
                                  className="view-button" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDriver(driver);
                                  }}
                                >
                                  View Orders
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Driver Orders Modal */}
              {selectedDriver && (
                <div className="order-details-overlay" onClick={() => setSelectedDriver(null)}>
                  <div className="order-details-modal driver-orders-modal" onClick={e => e.stopPropagation()}>
                    {/* Existing modal header */}
                    <button className="modal-close" onClick={() => setSelectedDriver(null)} aria-label="Close">&times;</button>
                    
                    <div className="modal-header">
                      <h3>Driver: {selectedDriver.full_name || selectedDriver.email}</h3>
                      {/* Existing driver info */}
                    </div>
                    
                    {/* Add tabs for orders and payment history */}
                    <div className="driver-modal-tabs">
                      <button 
                        className={`tab-button ${!showPaymentHistory ? 'active' : ''}`}
                        onClick={() => setShowPaymentHistory(false)}
                      >
                        Orders
                      </button>
                      <button 
                        className={`tab-button ${showPaymentHistory ? 'active' : ''}`}
                        onClick={() => setShowPaymentHistory(true)}
                      >
                        Payment History
                      </button>
                    </div>
                    
                    {/* Show payment history when tab is selected */}
                    {showPaymentHistory ? (
                      <div className="payment-history-container">
                        {paymentHistoryLoading ? (
                          <div className="loading-indicator">Loading payment history...</div>
                        ) : driverPaymentHistory.length === 0 ? (
                          <div className="no-payment-history">No payment records found for this driver</div>
                        ) : (
                          <table className="payment-history-table">
                            <thead>
                              <tr>
                                <th>Payment Date</th>
                                <th>Amount</th>
                                <th>Deliveries</th>
                                <th>Request Date</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {driverPaymentHistory.map(payment => (
                                <tr key={payment.id}>
                                  <td>{payment.paidAt ? formatDate(payment.paidAt) : 'N/A'}</td>
                                  <td className="amount-cell">R{Number(payment.amount || 0).toFixed(2)}</td>
                                  <td>{payment.orderCount || 0} deliveries</td>
                                  <td>{formatDate(payment.createdAt)}</td>
                                  <td>
                                    <span className={`payment-status status-${payment.status || 'pending'}`}>
                                      {payment.status === 'completed' ? 'Paid' : 'Pending'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colSpan={2}><strong>Total Paid:</strong></td>
                                <td colSpan={3} className="total-paid">
                                  R{driverPaymentHistory
                                    .filter(p => p.status === 'completed')
                                    .reduce((sum, p) => sum + Number(p.amount || 0), 0)
                                    .toFixed(2)
                                }
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        )}
                      </div>
                    ) : (
                      // Original driver orders content here
                      <>
                        {/* Driver Orders List */}
                        <div className="driver-orders-accordion">
                          {driverOrders.map(order => (
                            <div key={order.id} className="order-accordion-item">
                              <div 
                                className={`order-accordion-header ${expandedOrderId === order.id ? 'expanded' : ''}`}
                                onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                              >
                                <div className="order-accordion-summary">
                                  <div className="order-id">Order #{order.id.substring(0, 8)}</div>
                                  <div className="order-date">{formatDate(order.createdAt)}</div>
                                  <div className="order-customer">
                                    {customerDetails[order.userId]?.name || order.userId.substring(0, 8) + '...'}
                                  </div>
                                  <div className="order-total">R{Number(order.total).toFixed(2)}</div>
                                  <div className={`status-badge ${order.status}`}>{order.status}</div>
                                </div>
                                <div className="accordion-icon">{expandedOrderId === order.id ? '−' : '+'}</div>
                              </div>
                              
                              {expandedOrderId === order.id && (
                                <div className="order-accordion-content">
                                  <div className="order-details-grid">
                                    <div className="detail-column">
                                      <h4>Delivery Address</h4>
                                      <p>{order.deliveryAddress?.street || 'N/A'}</p>
                                      <p>{order.deliveryAddress?.city}, {order.deliveryAddress?.postalCode}</p>
                                    </div>
                                    
                                    <div className="detail-column">
                                      <h4>Delivery Status</h4>
                                      <div className={`delivery-status ${
                                        order.status === 'delivered' ? 'delivered' :
                                        order.status === 'in transit' ? 'in-transit' :
                                        'not-started'}`}
                                      >
                                        {order.status === 'delivered' ? 'Delivered' :
                                         order.status === 'in transit' ? 'In Transit' :
                                         'Not Started'}
                                      </div>
                                      
                                      <div className="payment-status-container">
                                        <h4>Payment Status</h4>
                                        <div className={`payment-status ${
                                          order.status === 'delivered' ? 'paid' : 'unpaid'}`}
                                        >
                                          {order.status === 'delivered' ? 'R40 Paid' : 'Payment Pending'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Order Items Table */}
                                  <div className="order-items-section">
                                    <h4>Order Items</h4>
                                    <table className="items-table driver-items-table">
                                      <thead>
                                        <tr>
                                          <th>Item</th>
                                          <th>Quantity</th>
                                          <th>Price</th>
                                          <th>Total</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {order.items && order.items.map((item: OrderItem, idx: number) => (
                                          <tr key={idx}>
                                            <td>
                                              <div className="item-details">
                                                {item.product?.image_url && (
                                                  <img 
                                                    src={item.product.image_url} 
                                                    alt={item.product.name} 
                                                    className="item-thumbnail" 
                                                  />
                                                )}
                                                <span>{item.product?.name || `Product ${item.productId}`}</span>
                                              </div>
                                            </td>
                                            <td>{item.qty}</td>
                                            <td>R{Number(item.product?.price || 0).toFixed(2)}</td>
                                            <td>R{Number((item.product?.price || 0) * item.qty).toFixed(2)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                      <tfoot>
                                        <tr>
                                          <td colSpan={3}>Subtotal</td>
                                          <td>R{Number(order.subtotal || 0).toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                          <td colSpan={3}>Service Fee</td>
                                          <td>R{Number(order.serviceFee || 0).toFixed(2)}</td>
                                        </tr>
                                        <tr className="total-row">
                                          <td colSpan={3}>Total</td>
                                          <td>R{Number(order.total || 0).toFixed(2)}</td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                  
                                  <div className="order-actions">
                                    <button 
                                      className="view-button" 
                                      onClick={() => {
                                        setSelectedDriver(null);
                                        setSelectedOrder(order);
                                      }}
                                    >
                                      View Full Details
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;