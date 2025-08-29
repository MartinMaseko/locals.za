import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../../../Auth/firebaseClient';
import Logo from '../../assets/logos/LZA ICON.png';
import './AdminStyle.css';
import { format } from 'date-fns';

function generateProductId() {
  return 'PROD-' + Math.floor(1000000000 + Math.random() * 9000000000);
}
function generateDriverId() {
  return 'DRIVER-' + Math.floor(1000000000 + Math.random() * 9000000000);
}

const vehicleTypes = ['van', 'sedan', 'hatch'];
const productCategories = [
  'Hair Extensions','Wigs','Conditioners','Shampoos','Hair Tools','Hair Care',
  'Hair Coloring','Hair Food','Hair Loss Treatments','Hair Styling Products',
  'Moisturizers','Relaxers','Hair Accessories','Hair Growth Products'
];

// Enhanced date formatter to handle different date formats
function formatDate(dateValue: any): string {
  if (!dateValue) return 'N/A';
  
  try {
    // Handle Firestore timestamp objects
    if (typeof dateValue === 'object' && dateValue?.seconds) {
      return format(new Date(dateValue.seconds * 1000), 'yyyy-MM-dd HH:mm');
    }
    
    // Handle string dates
    if (typeof dateValue === 'string') return format(new Date(dateValue), 'yyyy-MM-dd HH:mm');
    
    // Handle Date objects
    if (dateValue instanceof Date) return format(dateValue, 'yyyy-MM-dd HH:mm');
    
    return String(dateValue);
  } catch {
    return 'Invalid Date';
  }
}

interface AdminProfile {
  full_name?: string;
  email: string;
  user_type: string;
}

interface Order {
  id: string;
  userId: string;
  salon_id: string | null;
  items: OrderItem[];
  subtotal: number;
  serviceFee: number;
  total: number;
  deliveryAddress: any;
  status: OrderStatus;
  createdAt: any; // Allow different date formats
  updatedAt: any; // Allow different date formats
  driver_id?: string | null;
}

interface OrderItem {
  productId: string;
  product: any;
  qty: number;
}

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

// Active sections 
const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'dashboard'|'drivers'|'products'|'admin'|'orders'|'ProductManagement'|'ManageDrivers'>('dashboard');

  // driver form
  const [driverForm, setDriverForm] = useState({
    driver_id: generateDriverId(), email: '', password: '', full_name: '', phone_number: '',
    vehicle_type: '', vehicle_model: '', bank_details: '', license_number: '', license_image: null as File | null
  });
  const [driverError, setDriverError] = useState('');
  const [driverSuccess, setDriverSuccess] = useState('');

  // product add form
  const [productForm, setProductForm] = useState({
    product_id: generateProductId(), name: '', description: '', price: '', brand: '', category: '', image: null as File | null
  });
  const [productError, setProductError] = useState('');
  const [productSuccess, setProductSuccess] = useState('');

  // products management
  const [productsList, setProductsList] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editProductForm, setEditProductForm] = useState({
    name: '', description: '', price: '', brand: '', category: '', imageFile: null as File | null, image_url: ''
  });
  const [productImageUploading, setProductImageUploading] = useState(false);

  // orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');

  // customers cache
  const [customerDetails, setCustomerDetails] = useState<Record<string, any>>({});
  const [loadingCustomer, setLoadingCustomer] = useState<Record<string, boolean>>({});

  // drivers list and dropdown
  const [drivers, setDrivers] = useState<Array<{id: string; name: string}>>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);

  // product search
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [filteredProductsList, setFilteredProductsList] = useState<any[]>([]);

  // dashboard stats
  const [statsPeriod, setStatsPeriod] = useState<'30'|'60'|'90'|'all'>('30');
  const [dashboardStats, setDashboardStats] = useState({
    serviceRevenue: 0,
    orderRevenue: 0,
    topProducts: [] as {name: string, count: number, revenue: number}[]
  });

  // drivers management
  const [driversList, setDriversList] = useState<any[]>([]);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversError, setDriversError] = useState('');
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [driverOrders, setDriverOrders] = useState<Order[]>([]);
  const [driverOrdersLoading, setDriverOrdersLoading] = useState(false);

  // helpers
  const getToken = async () => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) throw new Error('Authentication required');
    return await user.getIdToken(true);
  };

  // Accordion expanded order state for ManageDrivers section
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // auth check
  useEffect(() => {
    const auth = getAuth(app);
    setLoading(true);
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) { navigate('/adminlogin'); return; }
      try {
        const token = await user.getIdToken();
        const { data } = await axios.get<AdminProfile>('/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
        if (data?.user_type !== 'admin') { navigate('/adminlogin'); return; }
        setAdmin(data);
      } catch (err) {
        navigate('/adminlogin');
      } finally { setLoading(false); }
    });
    return () => unsub();
  }, [navigate]);

  // fetch orders
  const fetchOrders = useCallback(async () => {
    if (!admin) return;
    setOrderLoading(true); setOrderError('');
    try {
      const token = await getToken();
      const url = orderStatusFilter ? `/api/orders/all?status=${encodeURIComponent(orderStatusFilter)}` : '/api/orders/all';
      const { data } = await axios.get<Order[]>(url, { headers: { Authorization: `Bearer ${token}` } });
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setOrderError(err?.response?.data?.error || err?.message || 'Failed to load orders');
    } finally { setOrderLoading(false); }
  }, [admin, orderStatusFilter]);

  useEffect(() => {
    if (activeSection === 'orders' && admin) fetchOrders();
  }, [activeSection, admin, fetchOrders]);

  // search / filter orders
  useEffect(() => {
    const q = (orderSearchQuery || '').trim().toLowerCase();
    let list = orders.slice();
    if (q) list = list.filter(o => o.id?.toLowerCase().includes(q));
    setFilteredOrders(list);
  }, [orders, orderSearchQuery]);

  // fetch single customer details
  const fetchCustomerDetails = useCallback(async (userId: string) => {
    if (!userId || customerDetails[userId] || loadingCustomer[userId]) return;
    setLoadingCustomer(prev => ({ ...prev, [userId]: true }));
    try {
      const token = await getToken();
      const { data } = await axios.get(`/api/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      const userData = data as { full_name?: string; email?: string; phone_number?: string };
      setCustomerDetails(prev => ({
        ...prev,
        [userId]: {
          name: userData.full_name || userData.email || 'Unknown',
          email: userData.email,
          phone: userData.phone_number
        }
      }));
    } catch (err) {
      setCustomerDetails(prev => ({ ...prev, [userId]: { name: 'Unknown Customer' } }));
    } finally { setLoadingCustomer(prev => ({ ...prev, [userId]: false })); }
  }, [customerDetails, loadingCustomer]);

  useEffect(() => {
    if (selectedOrder?.userId) fetchCustomerDetails(selectedOrder.userId);
  }, [selectedOrder, fetchCustomerDetails]);

  // fetch drivers
  const fetchDrivers = useCallback(async () => {
    setLoadingDrivers(true);
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/drivers', { headers: { Authorization: `Bearer ${token}` } });
      if (Array.isArray(data)) {
        setDrivers(data.map((d: any) => ({ id: d.driver_id || d.id, name: d.full_name || d.email || d.id })));
      } else setDrivers([]);
    } catch (err) {
      console.error('fetchDrivers error', err);
    } finally { setLoadingDrivers(false); }
  }, []);

  useEffect(() => {
    if (activeSection === 'orders') fetchDrivers();
  }, [activeSection, fetchDrivers]);

  // assign/unassign driver
  const assignDriverToOrder = async (orderId: string, driverId: string | null) => {
    setOrderError('');
    try {
      const token = await getToken();
      await axios.put(`/api/orders/${orderId}/assign-driver`, { driver_id: driverId }, { headers: { Authorization: `Bearer ${token}` } });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, driver_id: driverId } : o));
      if (selectedOrder?.id === orderId) setSelectedOrder(prev => prev ? { ...prev, driver_id: driverId } : null);
    } catch (err: any) {
      setOrderError(err?.response?.data?.error || err?.message || 'Failed to update assignment');
    }
  };

  // update order status
  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    setOrderError('');
    try {
      const token = await getToken();
      await axios.put(`/api/orders/${orderId}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      if (selectedOrder?.id === orderId) setSelectedOrder(prev => prev ? { ...prev, status } : null);
    } catch (err: any) {
      setOrderError(err?.response?.data?.error || err?.message || 'Failed to update order status');
    }
  };

  // close dropdown on outside click
  useEffect(() => {
    if (!showDriverDropdown) return;
    const onDocClick = (ev: MouseEvent) => {
      const dropdown = document.querySelector('.driver-dropdown');
      const button = document.querySelector('.assign-button');
      if (dropdown && button && !dropdown.contains(ev.target as Node) && !button.contains(ev.target as Node)) {
        setShowDriverDropdown(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showDriverDropdown]);

  // products fetch/update
  const fetchProducts = useCallback(async () => {
    setProductsLoading(true); setProductsError('');
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/products', { headers: { Authorization: `Bearer ${token}` } });
      setProductsList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setProductsError(err?.response?.data?.error || err?.message || 'Failed to load products');
    } finally { setProductsLoading(false); }
  }, []);

  useEffect(() => {
    if (activeSection === 'ProductManagement') fetchProducts();
  }, [activeSection, fetchProducts]);

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
    setProductError(''); setProductSuccess('');
    try {
      const token = await getToken();
      let imageUrl = editProductForm.image_url || '';

      // upload image if new file selected
      if (editProductForm.imageFile) {
        setProductImageUploading(true);
        try {
          const storage = getStorage(app);
          const imageRef = ref(storage, `products/${(editingProduct.id || editingProduct.product_id)}_${Date.now()}_${editProductForm.imageFile.name}`);
          await uploadBytes(imageRef, editProductForm.imageFile);
          imageUrl = await getDownloadURL(imageRef);
        } catch (uploadErr) {
          console.error('Image upload failed', uploadErr);
          throw new Error('Image upload failed');
        } finally {
          setProductImageUploading(false);
        }
      }

      // ensure id used is the Firestore doc id if present, fallback to product_id
      const docId = editingProduct.id || editingProduct.product_id;
      if (!docId) throw new Error('Missing product id');

      // normalize price to number
      const parsedPrice = Number(editProductForm.price);
      if (isNaN(parsedPrice)) {
        throw new Error('Price must be a valid number');
      }

      // Create a clean payload with proper types
      const payload = {
        name: editProductForm.name.trim(),
        description: editProductForm.description.trim(),
        price: parsedPrice,
        brand: editProductForm.brand.trim(),
        category: editProductForm.category.trim(),
        image_url: imageUrl
      };

      console.log('Sending payload:', payload);

      // Send the request
      await axios.put(`/api/products/${docId}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Update local state first
      setProductsList(prev => prev.map(p => 
        (p.id === docId || p.product_id === docId) ? { ...p, ...payload } : p
      ));

      setProductSuccess('Product updated successfully');
      closeEditProduct();
    } catch (err: any) {
      console.error('handleUpdateProduct error', err);
      const errorResponse = err.response?.data;
      let errorMessage = 'Failed to update product';
      
      if (typeof errorResponse === 'string') {
        errorMessage = errorResponse;
      } else if (errorResponse?.error) {
        errorMessage = errorResponse.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setProductError(errorMessage);
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
    setDriverError(''); setDriverSuccess('');
    try {
      const auth = getAuth(app);
      const userCredential = await createUserWithEmailAndPassword(auth, driverForm.email, driverForm.password);
      const driverUid = userCredential.user.uid;
      const token = await auth.currentUser?.getIdToken(true);
      if (!token) throw new Error('Authentication token required');
      let licenseImageUrl = '';
      if (driverForm.license_image) {
        const storage = getStorage(app);
        const imageRef = ref(storage, `driver-licenses/${driverUid}/${Date.now()}_${driverForm.license_image.name}`);
        await uploadBytes(imageRef, driverForm.license_image);
        licenseImageUrl = await getDownloadURL(imageRef);
      }
      await axios.post('/api/drivers/register', {
        driver_id: driverForm.driver_id, firebase_uid: driverUid,
        full_name: driverForm.full_name, phone_number: driverForm.phone_number,
        user_type: 'driver', vehicle_type: driverForm.vehicle_type, vehicle_model: driverForm.vehicle_model,
        bank_details: driverForm.bank_details, license_number: driverForm.license_number, license_image_url: licenseImageUrl
      }, { headers: { Authorization: `Bearer ${token}` }});
      setDriverSuccess('Driver registered successfully!');
      setDriverForm({ driver_id: generateDriverId(), email: '', password: '', full_name: '', phone_number: '', vehicle_type: '', vehicle_model: '', bank_details: '', license_number: '', license_image: null });
    } catch (err: any) {
      setDriverError(err?.response?.data?.error || err?.message || 'Driver registration failed');
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
    setProductError(''); setProductSuccess('');
    try {
      const token = await getToken();
      let productImageUrl = '';
      if (productForm.image) {
        const storage = getStorage(app);
        const imageRef = ref(storage, `products/${productForm.product_id || productForm.name}_${Date.now()}`);
        await uploadBytes(imageRef, productForm.image);
        productImageUrl = await getDownloadURL(imageRef);
      }
      await axios.post('/api/products', {
        product_id: productForm.product_id, name: productForm.name, description: productForm.description,
        price: productForm.price, brand: productForm.brand, category: productForm.category, image_url: productImageUrl
      }, { headers: { Authorization: `Bearer ${token}` }});
      setProductSuccess('Product added successfully!');
      setProductForm({ product_id: generateProductId(), name: '', description: '', price: '', brand: '', category: '', image: null });
    } catch (err: any) {
      setProductError(err?.response?.data?.error || err?.message || 'Product creation failed');
    }
  };

  // promote user
  const [promoteUid, setPromoteUid] = useState('');
  const [promoteMsg, setPromoteMsg] = useState('');
  const handlePromoteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPromoteMsg('');
    try {
      await axios.post('/api/auth/promote-admin', { uid: promoteUid });
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

  // UseEffect to filter products based on search query
  useEffect(() => {
    const query = (productSearchQuery || '').trim().toLowerCase();
    if (!query) {
      setFilteredProductsList(productsList);
    } else {
      const filtered = productsList.filter(p => 
        (p.name && p.name.toLowerCase().includes(query)) ||
        (p.brand && p.brand.toLowerCase().includes(query)) ||
        ((p.id || p.product_id) && (p.id || p.product_id).toString().toLowerCase().includes(query))
      );
      setFilteredProductsList(filtered);
    }
  }, [productsList, productSearchQuery]);

  // Modify fetchDashboardStats in adminDashboard.tsx
  const fetchDashboardStats = useCallback(async () => {
    if (!admin) return;
    
    try {
      const token = await getToken();
      
      // Get stats from the backend endpoint
      try {
        type StatsResponse = {
          serviceRevenue?: number;
          orderRevenue?: number;
          topProducts?: { name: string; count: number; revenue: number }[];
        };
        const { data } = await axios.get<StatsResponse>(`/api/admin/stats?period=${statsPeriod}`, { 
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (data) {
          setDashboardStats({
            serviceRevenue: Number(data.serviceRevenue || 0),
            orderRevenue: Number(data.orderRevenue || 0),
            topProducts: Array.isArray(data.topProducts) ? data.topProducts : []
          });
          return;
        }
      } catch (apiError) {
        console.warn('Stats API not available, calculating locally', apiError);
      }
      
      // Fallback: Calculate stats locally
      console.log('Calculating stats locally');
      const allOrders = await fetchAllOrders();
      
      const daysToLookBack = statsPeriod === 'all' ? 36500 : parseInt(statsPeriod);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToLookBack);
      
      // Filter by date
      const filteredOrders = allOrders.filter(order => {
        if (!order.createdAt) return false;
        const orderDate = order.createdAt instanceof Date 
          ? order.createdAt 
          : typeof order.createdAt === 'string'
            ? new Date(order.createdAt)
            : order.createdAt?.seconds 
              ? new Date(order.createdAt.seconds * 1000)
              : null;
        return orderDate && orderDate >= cutoffDate;
      });
      
      // Calculate service revenue
      const serviceRevenue = filteredOrders.reduce((sum, order) => 
        sum + (Number(order.serviceFee) || 0), 0);
      
      // Calculate order revenue (excluding service fee)
      const orderRevenue = filteredOrders.reduce((sum, order) => 
        sum + (Number(order.subtotal) || 0), 0);
      
      // Calculate top products
      const productSales: Record<string, {name: string, count: number, revenue: number}> = {};
      
      filteredOrders.forEach(order => {
        if (!order.items) return;
        
        order.items.forEach(item => {
          const productId = item.productId;
          if (!productId) return;
          
          const productName = item.product?.name || `Product ${productId}`;
          const qty = Number(item.qty) || 0;
          const itemPrice = Number(item.product?.price || 0);
          
          if (!productSales[productId]) {
            productSales[productId] = {
              name: productName,
              count: 0,
              revenue: 0
            };
          }
          
          productSales[productId].count += qty;
          productSales[productId].revenue += itemPrice * qty;
        });
      });
      
      // Sort by count (quantity sold)
      const topProducts = Object.values(productSales)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      
      setDashboardStats({
        serviceRevenue,
        orderRevenue,
        topProducts
      });
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      // Set default values on error
      setDashboardStats({
        serviceRevenue: 0,
        orderRevenue: 0,
        topProducts: []
      });
    }
  }, [admin, statsPeriod]);

  // Add a helper function to fetch all orders
  const fetchAllOrders = async (): Promise<Order[]> => {
    try {
      const token = await getToken();
      const { data } = await axios.get<Order[]>('/api/orders/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching all orders:', err);
      return [];
    }
  };

  useEffect(() => {
    if (activeSection === 'dashboard' && admin) fetchDashboardStats();
  }, [activeSection, admin, fetchDashboardStats, statsPeriod]);

  // fetch all drivers
  const fetchDriversList = useCallback(async () => {
    setDriversLoading(true);
    setDriversError('');
    try {
      const token = await getToken();
      const { data } = await axios.get('/api/drivers/all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (Array.isArray(data)) {
        setDriversList(data);
      } else {
        setDriversList([]);
      }
    } catch (err: any) {
      console.error('Error fetching drivers:', err);
      setDriversError(err?.response?.data?.error || err?.message || 'Failed to load drivers');
    } finally {
      setDriversLoading(false);
    }
  }, []);

  // fetch orders for a driver
  const fetchDriverOrders = useCallback(async (driverId: string) => {
    if (!driverId) return;
    
    setDriverOrdersLoading(true);
    try {
      const token = await getToken();
      
      try {
        const { data } = await axios.get<Order[]>(`/api/orders/driver/${driverId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setDriverOrders(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error('Error fetching driver orders:', err);
        
        // Fallback: If the dedicated endpoint fails, get all orders and filter client-side
        if (err?.response?.status === 403 || err?.response?.status === 404) {
          const { data } = await axios.get<Order[]>('/api/orders/all', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (Array.isArray(data)) {
            const driverOrders = data.filter(order => order.driver_id === driverId);
            setDriverOrders(driverOrders);
          } else {
            setDriverOrders([]);
          }
        } else {
          setDriverOrders([]);
        }
      }
    } catch (err) {
      console.error('Error fetching driver orders:', err);
      setDriverOrders([]);
    } finally {
      setDriverOrdersLoading(false);
    }
  }, []);

  // load drivers when section is activated
  useEffect(() => {
    if (activeSection === 'ManageDrivers') {
      fetchDriversList();
    }
  }, [activeSection, fetchDriversList]);

  // fetch orders when a driver is selected
  useEffect(() => {
    if (selectedDriver) {
      fetchDriverOrders(selectedDriver.driver_id || selectedDriver.id);
    }
  }, [selectedDriver, fetchDriverOrders]);

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
                <div className="welcome-message">User: {admin?.full_name || admin?.email}</div>
                
                {/* Add time period filters */}
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
                <div className="stat-card"><h3>Products</h3><p className="stat-number">{productsList.length}</p></div>
                <div className="stat-card"><h3>Drivers</h3><p className="stat-number">{drivers.length}</p></div>
                <div className="stat-card"><h3>Orders</h3><p className="stat-number">{orders.length}</p></div>
                
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
                {driverError && <div className="error-message">{driverError}</div>}
                {driverSuccess && <div className="success-message">{driverSuccess}</div>}
              </form>
            </div>
          )}

          {activeSection === 'products' && (
            <div className="product-form-section">
              <h2>Add New Product</h2>
              <form onSubmit={handleAddProduct} className="admin-form">
                <div className="form-group"><input name="product_id" type="text" placeholder="Product ID" value={productForm.product_id} readOnly className="readonly-input" /></div>
                <div className="form-group"><input name="name" type="text" placeholder="Product Name" value={productForm.name} onChange={handleProductChange} required /></div>
                <div className="form-group"><input name="brand" type="text" placeholder="Brand" value={productForm.brand} onChange={handleProductChange} required /></div>
                <div className="form-group"><select name="category" value={productForm.category} onChange={handleProductChange} required><option value="">Select Category</option>{productCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                <div className="form-group"><input name="description" type="text" placeholder="Description" value={productForm.description} onChange={handleProductChange} required /></div>
                <div className="form-group"><input name="price" type="number" placeholder="Price" value={productForm.price} onChange={handleProductChange} required /></div>
                <div className="form-group file-input-group"><label>Product Image:</label><input name="image" type="file" accept="image/*" onChange={handleProductImageChange} /></div>
                <button type="submit" className="form-button">Add Product</button>
                {productError && <div className="error-message">{productError}</div>}
                {productSuccess && <div className="success-message">{productSuccess}</div>}
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
                    <select value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)}><option value="">All Orders</option><option value="pending">Pending</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select>
                    <button onClick={fetchOrders} className="refresh-button">Refresh</button>
                  </div>
                </div>
              </div>

              {orderLoading ? <div className="loading-indicator">Loading orders...</div> :
                orderError ? <div className="error-message">{orderError}</div> :
                filteredOrders.length === 0 ? <div className="no-orders">{orderSearchQuery ? `No orders match "${orderSearchQuery}"` : 'No orders found'}</div> :
                <div className="orders-grid"><div className="orders-list">
                  <table className="orders-table">
                    <thead><tr><th>Order ID</th><th>Date</th><th>Customer</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {filteredOrders.map(order => (
                        <tr key={order.id} onClick={() => setSelectedOrder(order)} className={selectedOrder?.id === order.id ? 'selected' : ''}>
                          <td>{order.id?.substring(0,8)}...</td>
                          <td>{formatDate(order.createdAt)}</td>
                          <td>{order.userId?.substring(0,8)}...</td>
                          <td>R{Number(order.total || 0).toFixed(2)}</td>
                          <td><div className={`status-badge ${order.status}`}>{order.status}</div></td>
                          <td><div className="action-buttons"><button onClick={(e)=>{e.stopPropagation(); setSelectedOrder(order);}} className="view-button">View</button></div></td>
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
                            <button onClick={() => { updateOrderStatus(selectedOrder.id,'processing'); }} className="status-btn processing">Processing</button>
                            <button onClick={() => { updateOrderStatus(selectedOrder.id,'shipped'); }} className="status-btn shipped">Shipped</button>
                            <button onClick={() => { updateOrderStatus(selectedOrder.id,'delivered'); }} className="status-btn delivered">Delivered</button>
                            <button onClick={() => { updateOrderStatus(selectedOrder.id,'cancelled'); }} className="status-btn cancelled">Cancel</button>
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
                              <div className="assigned-driver"><span className="driver-label">Assigned to driver:</span><span className="driver-name">{drivers.find(d => d.id === selectedOrder.driver_id)?.name || selectedOrder.driver_id}</span></div>
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
                              {loadingDrivers ? <div className="dropdown-loading">Loading drivers...</div> :
                                drivers.length === 0 ? <div className="dropdown-empty">No drivers available</div> :
                                  <div className="dropdown-list">
                                    {selectedOrder.driver_id && <div className="dropdown-item unassign" onClick={() => { assignDriverToOrder(selectedOrder.id, null); setShowDriverDropdown(false); }}><span className="unassign-icon">❌</span> Remove Driver</div>}
                                    {drivers.map(d => <div key={d.id} className={`dropdown-item ${selectedOrder.driver_id === d.id ? 'selected' : ''}`} onClick={() => { assignDriverToOrder(selectedOrder.id, d.id); setShowDriverDropdown(false); }}>{d.name}</div>)}
                                  </div>}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="items-section">
                        <strong>Order Items:</strong>
                        <table className="items-table">
                          <thead><tr><th>Item</th><th>Qty</th><th>Price</th></tr></thead>
                          <tbody>{selectedOrder.items.map((it, idx) => (<tr key={idx}><td>{it.product?.name || `Product ${it.productId}`}</td><td>{it.qty}</td><td>{it.product?.price ? `R${(it.product.price * it.qty).toFixed(2)}` : 'N/A'}</td></tr>))}</tbody>
                          <tfoot><tr><td colSpan={2}>Subtotal</td><td>R{Number(selectedOrder.subtotal).toFixed(2)}</td></tr><tr><td colSpan={2}>Service Fee</td><td>R{Number(selectedOrder.serviceFee).toFixed(2)}</td></tr><tr className="total-row"><td colSpan={2}>Total</td><td>R{Number(selectedOrder.total).toFixed(2)}</td></tr></tfoot>
                        </table>
                      </div>
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

              {productsLoading ? <div className="loading-indicator">Loading products...</div> :
                productsError ? <div className="error-message">{productsError}</div> :
                productsList.length === 0 ? <div className="no-products">No products found</div> :
                filteredProductsList.length === 0 ? <div className="no-products">No products matching "{productSearchQuery}"</div> :
                <div className="products-grid">
                  <div className="products-list">
                    <table className="orders-table products-table">
                      <thead><tr><th>Product ID</th><th>Image</th><th>Name</th><th>Category</th><th>Brand</th><th>Price</th><th>Actions</th></tr></thead>
                      <tbody>
                        {filteredProductsList.map(p => (
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
                      {productError && <div className="error-message">{productError}</div>}
                      {productSuccess && <div className="success-message">{productSuccess}</div>}
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
              </div>
              
              {driversLoading ? (
                <div className="loading-indicator">Loading drivers...</div>
              ) : driversError ? (
                <div className="error-message">{driversError}</div>
              ) : driversList.length === 0 ? (
                <div className="no-drivers">No drivers registered in the system</div>
              ) : (
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
                        const driverOrderCount = orders.filter(o => o.driver_id === (driver.driver_id || driver.id)).length;
                        const driverDeliveredCount = orders.filter(o => 
                          o.driver_id === (driver.driver_id || driver.id) && o.status === 'delivered'
                        ).length;
                        const driverAcceptedCount = orders.filter(o => 
                          o.driver_id === (driver.driver_id || driver.id) && 
                          (o.status === 'processing' || o.status === 'shipped' || o.status === 'delivered')
                        ).length;
                        const driverRevenue = driverDeliveredCount * 40;
                        
                        return (
                          <tr 
                            key={driver.driver_id || driver.id} 
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
                    <button 
                      className="modal-close" 
                      onClick={() => setSelectedDriver(null)} 
                      aria-label="Close"
                    >
                      &times;
                    </button>
                    
                    <div className="modal-header">
                      <h3>Orders for {selectedDriver.full_name || selectedDriver.email}</h3>
                      <div className="driver-quick-info">
                        <div className="info-chip">
                          <span className="label">Vehicle:</span>
                          <span>{selectedDriver.vehicle_type} {selectedDriver.vehicle_model}</span>
                        </div>
                        <div className="info-chip">
                          <span className="label">Phone:</span>
                          <span>{selectedDriver.phone_number || 'N/A'}</span>
                        </div>
                        <div className="info-chip revenue">
                          <span className="label">Total Earnings:</span>
                          <span>R{(driverOrders.filter(order => order.status === 'delivered').length * 40).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {driverOrdersLoading ? (
                      <div className="loading-indicator">Loading orders...</div>
                    ) : driverOrders.length === 0 ? (
                      <div className="no-orders">No orders assigned to this driver</div>
                    ) : (
                      <>
                        <div className="orders-summary">
                          <div className="summary-card">
                            <div className="summary-number">{driverOrders.length}</div>
                            <div className="summary-label">Total Assigned</div>
                          </div>
                          <div className="summary-card">
                            <div className="summary-number">
                              {driverOrders.filter(order => 
                                order.status === 'processing' || order.status === 'shipped'
                              ).length}
                            </div>
                            <div className="summary-label">In Progress</div>
                          </div>
                          <div className="summary-card">
                            <div className="summary-number">
                              {driverOrders.filter(order => order.status === 'delivered').length}
                            </div>
                            <div className="summary-label">Delivered</div>
                          </div>
                          <div className="summary-card">
                            <div className="summary-number">
                              {driverOrders.filter(order => order.status === 'cancelled').length}
                            </div>
                            <div className="summary-label">Cancelled</div>
                          </div>
                        </div>
                        
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
                                        order.status === 'shipped' ? 'in-transit' :
                                        'not-started'}`}
                                      >
                                        {order.status === 'delivered' ? 'Delivered' :
                                         order.status === 'shipped' ? 'In Transit' :
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
                                        {order.items && order.items.map((item, idx) => (
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