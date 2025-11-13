import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from '../../../Auth/firebaseClient';
import Logo from '../../assets/logos/LZA ICON.png';
import './AdminStyle.css';
import { format } from 'date-fns';
const API_URL = import.meta.env.VITE_API_URL;
function generateProductId() {
    return 'PROD-' + Math.floor(1000000000 + Math.random() * 9000000000);
}
function generateDriverId() {
    return 'DRIVER-' + Math.floor(1000000000 + Math.random() * 9000000000);
}
const vehicleTypes = ['van', 'sedan', 'hatch'];
const productCategories = [
    // Fast-Moving Consumer Goods (FMCG) Categories
    'Beverages',
    'Groceries & Pantry',
    'Spices & Seasoning',
    'Canned Foods',
    'Sugar',
    'Flour',
    'Cooking Oils & Fats',
    'Rice',
    'Maize Meal',
    'Snacks & Confectionery',
    'Household Cleaning & Goods',
    'Laundry Supplies',
    'Personal Care',
    'Food Packaging',
    'Sauces',
    // Hair Care & Cosmetics Categories
    'Shampoos & Cleansers',
    'Conditioners & Treatments',
    'Relaxers & Perm Kits',
    'Hair Styling Products',
    'Hair Food & Oils',
    'Hair Coloring'
];
// FormatDate function to handle more data formats:
function formatDate(dateValue) {
    if (!dateValue)
        return 'N/A';
    try {
        // Handle Firestore timestamp objects
        if (typeof dateValue === 'object' && dateValue?.toDate) {
            return format(dateValue.toDate(), 'yyyy-MM-dd HH:mm');
        }
        if (typeof dateValue === 'object' && dateValue?.seconds) {
            return format(new Date(dateValue.seconds * 1000), 'yyyy-MM-dd HH:mm');
        }
        // Handle string dates
        if (typeof dateValue === 'string')
            return format(new Date(dateValue), 'yyyy-MM-dd HH:mm');
        // Handle Date objects
        if (dateValue instanceof Date)
            return format(dateValue, 'yyyy-MM-dd HH:mm');
        return String(dateValue);
    }
    catch (error) {
        console.log('Date formatting error:', error, 'Value:', dateValue);
        return 'Invalid Date';
    }
}
// Active sections 
const AdminDashboard = () => {
    const navigate = useNavigate();
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('dashboard');
    // driver form
    const [driverForm, setDriverForm] = useState({
        driver_id: generateDriverId(), email: '', password: '', full_name: '', phone_number: '',
        vehicle_type: '', vehicle_model: '', bank_details: '', license_number: '', license_image: null
    });
    const [driverError, setDriverError] = useState('');
    const [driverSuccess, setDriverSuccess] = useState('');
    // product add form
    const [productForm, setProductForm] = useState({
        product_id: generateProductId(), name: '', description: '', price: '', brand: '', category: '', image: null
    });
    const [productError, setProductError] = useState('');
    const [productSuccess, setProductSuccess] = useState('');
    // products management
    const [productsList, setProductsList] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [productsError, setProductsError] = useState('');
    const [editingProduct, setEditingProduct] = useState(null);
    const [editProductForm, setEditProductForm] = useState({
        name: '', description: '', price: '', brand: '', category: '', imageFile: null, image_url: ''
    });
    const [productImageUploading, setProductImageUploading] = useState(false);
    // orders
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [orderLoading, setOrderLoading] = useState(false);
    const [orderError, setOrderError] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderStatusFilter, setOrderStatusFilter] = useState('');
    const [orderSearchQuery, setOrderSearchQuery] = useState('');
    const [userCount, setUserCount] = useState(0);
    // customers cache
    const [customerDetails, setCustomerDetails] = useState({});
    const [loadingCustomer, setLoadingCustomer] = useState({});
    // drivers list and dropdown
    const [drivers, setDrivers] = useState([]);
    const [loadingDrivers, setLoadingDrivers] = useState(false);
    const [showDriverDropdown, setShowDriverDropdown] = useState(false);
    // product search
    const [productSearchQuery, setProductSearchQuery] = useState('');
    const [filteredProductsList, setFilteredProductsList] = useState([]);
    // dashboard stats
    const [statsPeriod, setStatsPeriod] = useState('30');
    const [dashboardStats, setDashboardStats] = useState({
        serviceRevenue: 0,
        orderRevenue: 0,
        topProducts: []
    });
    // drivers management
    const [driversList, setDriversList] = useState([]);
    const [_driversLoading, setDriversLoading] = useState(false);
    const [_driversError, setDriversError] = useState('');
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [driverOrders, setDriverOrders] = useState([]);
    const [_driverOrdersLoading, setDriverOrdersLoading] = useState(false);
    // cashouts management
    const [cashoutList, setCashoutList] = useState([]);
    const [cashoutLoading, setCashoutLoading] = useState(false);
    const [cashoutError, setCashoutError] = useState('');
    const [selectedCashout, setSelectedCashout] = useState(null);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [showPaymentHistory, setShowPaymentHistory] = useState(false);
    // helpers
    const getToken = async () => {
        const auth = getAuth(app);
        const user = auth.currentUser;
        if (!user)
            throw new Error('Authentication required');
        return await user.getIdToken(true);
    };
    // Accordion expanded order state for ManageDrivers section
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    // auth check
    useEffect(() => {
        const auth = getAuth(app);
        setLoading(true);
        const unsub = auth.onAuthStateChanged(async (user) => {
            if (!user) {
                navigate('/adminlogin');
                return;
            }
            try {
                const token = await user.getIdToken();
                const { data } = await axios.get(`${API_URL}/api/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
                if (data?.user_type !== 'admin') {
                    navigate('/adminlogin');
                    return;
                }
                setAdmin(data);
            }
            catch (err) {
                navigate('/adminlogin');
            }
            finally {
                setLoading(false);
            }
        });
        return () => unsub();
    }, [navigate]);
    // fetch orders
    const fetchOrders = useCallback(async () => {
        if (!admin)
            return;
        setOrderLoading(true);
        setOrderError('');
        try {
            const token = await getToken();
            const url = orderStatusFilter ? `${API_URL}/api/api/orders/all?status=${encodeURIComponent(orderStatusFilter)}` : `${API_URL}/api/api/orders/all`;
            const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
            setOrders(Array.isArray(data) ? data : []);
        }
        catch (err) {
            setOrderError(err?.response?.data?.error || err?.message || 'Failed to load orders');
        }
        finally {
            setOrderLoading(false);
        }
    }, [admin, orderStatusFilter]);
    useEffect(() => {
        if (activeSection === 'orders' && admin)
            fetchOrders();
    }, [activeSection, admin, fetchOrders]);
    // Fetch user count function
    const fetchUserCount = useCallback(async () => {
        try {
            const token = await getToken();
            const { data } = await axios.get(`${API_URL}/api/api/admin/stats/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUserCount(data.count);
        }
        catch (err) {
            console.error('Error fetching user count:', err);
            setUserCount(0);
        }
    }, []);
    useEffect(() => {
        if (activeSection === 'dashboard' && admin) {
            fetchUserCount();
        }
    }, [activeSection, admin, fetchUserCount]);
    // search / filter orders
    useEffect(() => {
        const q = (orderSearchQuery || '').trim().toLowerCase();
        let list = orders.slice();
        if (q)
            list = list.filter(o => o.id?.toLowerCase().includes(q));
        setFilteredOrders(list);
    }, [orders, orderSearchQuery]);
    // fetch single customer details
    const fetchCustomerDetails = useCallback(async (userId) => {
        if (!userId || customerDetails[userId] || loadingCustomer[userId])
            return;
        setLoadingCustomer(prev => ({ ...prev, [userId]: true }));
        try {
            const token = await getToken();
            const { data } = await axios.get(`${API_URL}/api/api/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
            const userData = data;
            setCustomerDetails(prev => ({
                ...prev,
                [userId]: {
                    name: userData.full_name || userData.email || 'Unknown',
                    email: userData.email,
                    phone: userData.phone_number
                }
            }));
        }
        catch (err) {
            setCustomerDetails(prev => ({ ...prev, [userId]: { name: 'Unknown Customer' } }));
        }
        finally {
            setLoadingCustomer(prev => ({ ...prev, [userId]: false }));
        }
    }, [customerDetails, loadingCustomer]);
    useEffect(() => {
        if (selectedOrder?.userId)
            fetchCustomerDetails(selectedOrder.userId);
    }, [selectedOrder, fetchCustomerDetails]);
    // fetch drivers
    const fetchDrivers = useCallback(async () => {
        setLoadingDrivers(true);
        try {
            const token = await getToken();
            const { data } = await axios.get(`${API_URL}/api/api/drivers`, { headers: { Authorization: `Bearer ${token}` } });
            if (Array.isArray(data)) {
                setDrivers(data.map((d) => ({ id: d.driver_id || d.id, name: d.full_name || d.email || d.id })));
            }
            else
                setDrivers([]);
        }
        catch (err) {
            console.error('fetchDrivers error', err);
        }
        finally {
            setLoadingDrivers(false);
        }
    }, []);
    useEffect(() => {
        if (activeSection === 'orders')
            fetchDrivers();
    }, [activeSection, fetchDrivers]);
    // assign/unassign driver
    const assignDriverToOrder = async (orderId, driverId) => {
        setOrderError('');
        try {
            const token = await getToken();
            await axios.put(`${API_URL}/api/api/orders/${orderId}/assign-driver`, { driver_id: driverId }, { headers: { Authorization: `Bearer ${token}` } });
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, driver_id: driverId } : o));
            if (selectedOrder?.id === orderId)
                setSelectedOrder(prev => prev ? { ...prev, driver_id: driverId } : null);
        }
        catch (err) {
            setOrderError(err?.response?.data?.error || err?.message || 'Failed to update assignment');
        }
    };
    // update order status
    const updateOrderStatus = async (orderId, status) => {
        setOrderError('');
        try {
            const token = await getToken();
            await axios.put(`${API_URL}/api/api/orders/${orderId}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
            if (selectedOrder?.id === orderId)
                setSelectedOrder(prev => prev ? { ...prev, status } : null);
        }
        catch (err) {
            setOrderError(err?.response?.data?.error || err?.message || 'Failed to update order status');
        }
    };
    // close dropdown on outside click
    useEffect(() => {
        if (!showDriverDropdown)
            return;
        const onDocClick = (ev) => {
            const dropdown = document.querySelector('.driver-dropdown');
            const button = document.querySelector('.assign-button');
            if (dropdown && button && !dropdown.contains(ev.target) && !button.contains(ev.target)) {
                setShowDriverDropdown(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [showDriverDropdown]);
    // products fetch/update
    const fetchProducts = useCallback(async () => {
        setProductsLoading(true);
        setProductsError('');
        try {
            const token = await getToken();
            const { data } = await axios.get(`${API_URL}/api/api/products`, { headers: { Authorization: `Bearer ${token}` } });
            setProductsList(Array.isArray(data) ? data : []);
        }
        catch (err) {
            setProductsError(err?.response?.data?.error || err?.message || 'Failed to load products');
        }
        finally {
            setProductsLoading(false);
        }
    }, []);
    useEffect(() => {
        if (activeSection === 'ProductManagement')
            fetchProducts();
    }, [activeSection, fetchProducts]);
    const openEditProduct = (prod) => {
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
    const handleEditProductChange = (e) => {
        const { name, value } = e.target;
        setEditProductForm(prev => ({ ...prev, [name]: value }));
    };
    const handleEditProductImageChange = (e) => {
        setEditProductForm(prev => ({ ...prev, imageFile: e.target.files?.[0] || null }));
    };
    const handleUpdateProduct = async (e) => {
        if (e)
            e.preventDefault();
        if (!editingProduct)
            return;
        setProductError('');
        setProductSuccess('');
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
                }
                catch (uploadErr) {
                    console.error('Image upload failed', uploadErr);
                    throw new Error('Image upload failed');
                }
                finally {
                    setProductImageUploading(false);
                }
            }
            // ensure id used is the Firestore doc id if present, fallback to product_id
            const docId = editingProduct.id || editingProduct.product_id;
            if (!docId)
                throw new Error('Missing product id');
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
            await axios.put(`${API_URL}/api/api/products/${docId}`, payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            // Update local state first
            setProductsList(prev => prev.map(p => (p.id === docId || p.product_id === docId) ? { ...p, ...payload } : p));
            setProductSuccess('Product updated successfully');
            closeEditProduct();
        }
        catch (err) {
            console.error('handleUpdateProduct error', err);
            const errorResponse = err.response?.data;
            let errorMessage = 'Failed to update product';
            if (typeof errorResponse === 'string') {
                errorMessage = errorResponse;
            }
            else if (errorResponse?.error) {
                errorMessage = errorResponse.error;
            }
            else if (err.message) {
                errorMessage = err.message;
            }
            setProductError(errorMessage);
            setProductImageUploading(false);
        }
    };
    // register driver
    const handleDriverChange = (e) => {
        const { name, value } = e.target;
        setDriverForm(prev => ({ ...prev, [name]: value }));
    };
    const handleDriverImageChange = (e) => {
        setDriverForm(prev => ({ ...prev, license_image: e.target.files?.[0] || null }));
    };
    const handleRegisterDriver = async (e) => {
        e.preventDefault();
        setDriverError('');
        setDriverSuccess('');
        try {
            const auth = getAuth(app);
            const userCredential = await createUserWithEmailAndPassword(auth, driverForm.email, driverForm.password);
            const driverUid = userCredential.user.uid;
            const token = await auth.currentUser?.getIdToken(true);
            if (!token)
                throw new Error('Authentication token required');
            let licenseImageUrl = '';
            if (driverForm.license_image) {
                const storage = getStorage(app);
                const imageRef = ref(storage, `driver-licenses/${driverUid}/${Date.now()}_${driverForm.license_image.name}`);
                await uploadBytes(imageRef, driverForm.license_image);
                licenseImageUrl = await getDownloadURL(imageRef);
            }
            await axios.post(`${API_URL}/api/api/drivers/register`, {
                driver_id: driverForm.driver_id, firebase_uid: driverUid,
                full_name: driverForm.full_name, phone_number: driverForm.phone_number,
                user_type: 'driver', vehicle_type: driverForm.vehicle_type, vehicle_model: driverForm.vehicle_model,
                bank_details: driverForm.bank_details, license_number: driverForm.license_number, license_image_url: licenseImageUrl
            }, { headers: { Authorization: `Bearer ${token}` } });
            setDriverSuccess('Driver registered successfully!');
            setDriverForm({ driver_id: generateDriverId(), email: '', password: '', full_name: '', phone_number: '', vehicle_type: '', vehicle_model: '', bank_details: '', license_number: '', license_image: null });
        }
        catch (err) {
            setDriverError(err?.response?.data?.error || err?.message || 'Driver registration failed');
        }
    };
    // product add handlers
    const handleProductChange = (e) => {
        const { name, value } = e.target;
        setProductForm(prev => ({ ...prev, [name]: value }));
    };
    const handleProductImageChange = (e) => {
        setProductForm(prev => ({ ...prev, image: e.target.files?.[0] || null }));
    };
    const handleAddProduct = async (e) => {
        e.preventDefault();
        setProductError('');
        setProductSuccess('');
        try {
            const token = await getToken();
            let productImageUrl = '';
            if (productForm.image) {
                try {
                    console.log('Starting image upload');
                    const auth = getAuth(app);
                    console.log('Current user:', auth.currentUser?.uid);
                    const storage = getStorage(app);
                    const imageRef = ref(storage, `products/${productForm.product_id}_${Date.now()}`);
                    console.log('Image reference created:', imageRef.fullPath);
                    await uploadBytes(imageRef, productForm.image);
                    console.log('Upload successful');
                    productImageUrl = await getDownloadURL(imageRef);
                }
                catch (uploadErr) {
                    console.error('Image upload failed:', uploadErr);
                    console.error('Error code:', uploadErr.code);
                    console.error('Error message:', uploadErr.message);
                    // Continue without image if upload fails
                    setProductError(`Image upload failed: ${uploadErr.message}. Product will be created without an image.`);
                }
            }
            await axios.post(`${API_URL}/api/api/products`, {
                product_id: productForm.product_id,
                name: productForm.name,
                description: productForm.description,
                price: productForm.price,
                brand: productForm.brand,
                category: productForm.category,
                image_url: productImageUrl
            }, { headers: { Authorization: `Bearer ${token}` } });
            setProductSuccess('Product added successfully!');
            setProductForm({ product_id: generateProductId(), name: '', description: '', price: '', brand: '', category: '', image: null });
        }
        catch (err) {
            console.error('Product creation error:', err);
            setProductError(err?.response?.data?.error || err?.message || 'Product creation failed');
        }
    };
    // promote user
    const [promoteUid, setPromoteUid] = useState('');
    const [promoteMsg, setPromoteMsg] = useState('');
    const handlePromoteAdmin = async (e) => {
        e.preventDefault();
        setPromoteMsg('');
        try {
            await axios.post(`${API_URL}/api/api/auth/promote-admin`, { uid: promoteUid });
            setPromoteMsg('User promoted to admin!');
            setPromoteUid('');
        }
        catch (err) {
            setPromoteMsg(err?.response?.data?.error || 'Promotion failed');
        }
    };
    // sign out
    const handleSignOut = async () => {
        try {
            const auth = getAuth(app);
            await signOut(auth);
            navigate('/adminlogin');
        }
        catch (err) {
            console.error('Sign out error', err);
        }
    };
    // keyboard close modal
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') {
            setSelectedOrder(null);
            setEditingProduct(null);
            setShowDriverDropdown(false);
        } };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);
    // UseEffect to filter products based on search query
    useEffect(() => {
        const query = (productSearchQuery || '').trim().toLowerCase();
        if (!query) {
            setFilteredProductsList(productsList);
        }
        else {
            const filtered = productsList.filter(p => (p.name && p.name.toLowerCase().includes(query)) ||
                (p.brand && p.brand.toLowerCase().includes(query)) ||
                ((p.id || p.product_id) && (p.id || p.product_id).toString().toLowerCase().includes(query)));
            setFilteredProductsList(filtered);
        }
    }, [productsList, productSearchQuery]);
    // FetchDashboardStats for adminDashboard.tsx
    const fetchDashboardStats = useCallback(async () => {
        if (!admin)
            return;
        try {
            const token = await getToken();
            // Get stats from the backend endpoint
            try {
                const { data } = await axios.get(`${API_URL}/api/api/admin/stats?period=${statsPeriod}`, {
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
            }
            catch (apiError) {
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
                if (!order.createdAt)
                    return false;
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
            const serviceRevenue = filteredOrders.reduce((sum, order) => sum + (Number(order.serviceFee) || 0), 0);
            // Calculate order revenue (excluding service fee)
            const orderRevenue = filteredOrders.reduce((sum, order) => sum + (Number(order.subtotal) || 0), 0);
            // Calculate top products
            const productSales = {};
            filteredOrders.forEach(order => {
                if (!order.items)
                    return;
                order.items.forEach(item => {
                    const productId = item.productId;
                    if (!productId)
                        return;
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
        }
        catch (err) {
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
    const fetchAllOrders = async () => {
        try {
            const token = await getToken();
            const { data } = await axios.get(`${API_URL}/api/api/orders/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return Array.isArray(data) ? data : [];
        }
        catch (err) {
            console.error('Error fetching all orders:', err);
            return [];
        }
    };
    useEffect(() => {
        if (activeSection === 'dashboard' && admin)
            fetchDashboardStats();
    }, [activeSection, admin, fetchDashboardStats, statsPeriod]);
    // fetch all drivers
    const fetchDriversList = useCallback(async () => {
        setDriversLoading(true);
        setDriversError('');
        try {
            const token = await getToken();
            const { data } = await axios.get(`${API_URL}/api/api/drivers/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (Array.isArray(data)) {
                setDriversList(data);
            }
            else {
                setDriversList([]);
            }
        }
        catch (err) {
            console.error('Error fetching drivers:', err);
            setDriversError(err?.response?.data?.error || err?.message || 'Failed to load drivers');
        }
        finally {
            setDriversLoading(false);
        }
    }, []);
    // fetch orders for a driver
    const fetchDriverOrders = useCallback(async (driverId) => {
        if (!driverId)
            return;
        setDriverOrdersLoading(true);
        try {
            const token = await getToken();
            try {
                const { data } = await axios.get(`${API_URL}/api/api/orders/driver/${driverId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setDriverOrders(Array.isArray(data) ? data : []);
            }
            catch (err) {
                console.error('Error fetching driver orders:', err);
                // Fallback: If the dedicated endpoint fails, get all orders and filter client-side
                if (err?.response?.status === 403 || err?.response?.status === 404) {
                    const { data } = await axios.get(`${API_URL}/api/api/orders/all`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (Array.isArray(data)) {
                        const driverOrders = data.filter(order => order.driver_id === driverId);
                        setDriverOrders(driverOrders);
                    }
                    else {
                        setDriverOrders([]);
                    }
                }
                else {
                    setDriverOrders([]);
                }
            }
        }
        catch (err) {
            console.error('Error fetching driver orders:', err);
            setDriverOrders([]);
        }
        finally {
            setDriverOrdersLoading(false);
        }
    }, []);
    // fetch payment history for a driver
    const [driverPaymentHistory, setDriverPaymentHistory] = useState([]);
    const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);
    const fetchDriverPaymentHistory = async (driverId) => {
        if (!driverId)
            return;
        setPaymentHistoryLoading(true);
        try {
            const token = await getToken();
            const { data } = await axios.get(`${API_URL}/api/api/admin/drivers/${driverId}/payments`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDriverPaymentHistory(Array.isArray(data) ? data : []);
        }
        catch (err) {
            console.error('Error fetching driver payment history:', err);
            setDriverPaymentHistory([]);
        }
        finally {
            setPaymentHistoryLoading(false);
        }
    };
    // fetch cashout requests
    const fetchCashoutRequests = useCallback(async () => {
        setCashoutLoading(true);
        setCashoutError('');
        try {
            const token = await getToken();
            const { data } = await axios.get(`${API_URL}/api/api/admin/cashouts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCashoutList(Array.isArray(data) ? data : []);
        }
        catch (err) {
            console.error('Error fetching cashout requests:', err);
            setCashoutError(err?.response?.data?.error || err?.message || 'Failed to load cashout requests');
        }
        finally {
            setCashoutLoading(false);
        }
    }, []);
    // process a driver payment
    const processDriverPayment = async (cashoutId) => {
        if (!cashoutId)
            return;
        setProcessingPayment(true);
        try {
            const token = await getToken();
            await axios.put(`${API_URL}/api/api/admin/cashouts/${cashoutId}/complete`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Update the local state
            setCashoutList(prev => prev.map(c => c.id === cashoutId ? { ...c, status: 'completed', paidAt: new Date().toISOString() } : c));
            // Also refresh the drivers list to show updated payment status
            if (activeSection === 'ManageDrivers') {
                fetchDriversList();
            }
            // Show success message or notification here if needed
        }
        catch (err) {
            console.error('Error processing payment:', err);
            // Show error message
        }
        finally {
            setProcessingPayment(false);
            setSelectedCashout(null);
        }
    };
    // fetch data when section is activated
    useEffect(() => {
        if (activeSection === 'ManageDrivers') {
            fetchDriversList();
            fetchCashoutRequests();
        }
    }, [activeSection, fetchDriversList, fetchCashoutRequests]);
    // fetch orders when a driver is selected
    useEffect(() => {
        if (selectedDriver) {
            fetchDriverOrders(selectedDriver.driver_id || selectedDriver.id);
            // Also fetch payment history for this driver
            fetchDriverPaymentHistory(selectedDriver.driver_id || selectedDriver.id);
        }
    }, [selectedDriver, fetchDriverOrders]);
    // auth check
    useEffect(() => {
        const auth = getAuth(app);
        setLoading(true);
        const unsub = auth.onAuthStateChanged(async (user) => {
            if (!user) {
                navigate('/adminlogin');
                return;
            }
            try {
                const token = await user.getIdToken();
                const { data } = await axios.get(`${API_URL}/api/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
                if (data?.user_type !== 'admin') {
                    navigate('/adminlogin');
                    return;
                }
                setAdmin(data);
            }
            catch (err) {
                navigate('/adminlogin');
            }
            finally {
                setLoading(false);
            }
        });
        return () => unsub();
    }, [navigate]);
    if (loading)
        return _jsx("div", { className: "admin-loading", children: "Loading dashboard..." });
    // Render
    return (_jsx("div", { className: "admin-dashboard", children: _jsxs("div", { className: "admin-layout", children: [_jsxs("div", { className: "admin-sidebar", children: [_jsxs("div", { className: "admin-header", children: [_jsx("img", { src: Logo, className: 'dashLogo', alt: 'Logo' }), _jsx("h3", { children: "Dashboard" }), _jsx("div", { className: "admin-info", children: admin?.full_name || admin?.email })] }), _jsxs("nav", { className: "admin-nav", children: [_jsx("button", { className: `nav-item ${activeSection === 'dashboard' ? 'active' : ''}`, onClick: () => setActiveSection('dashboard'), children: "Dashboard" }), _jsx("button", { className: `nav-item ${activeSection === 'drivers' ? 'active' : ''}`, onClick: () => setActiveSection('drivers'), children: "Register Driver" }), _jsx("button", { className: `nav-item ${activeSection === 'ManageDrivers' ? 'active' : ''}`, onClick: () => setActiveSection('ManageDrivers'), children: "Manage Drivers" }), _jsx("button", { className: `nav-item ${activeSection === 'products' ? 'active' : ''}`, onClick: () => setActiveSection('products'), children: "Add Product" }), _jsx("button", { className: `nav-item ${activeSection === 'ProductManagement' ? 'active' : ''}`, onClick: () => setActiveSection('ProductManagement'), children: "Manage Products" }), _jsx("button", { className: `nav-item ${activeSection === 'admin' ? 'active' : ''}`, onClick: () => setActiveSection('admin'), children: "Promote to Admin" }), _jsx("button", { className: `nav-item ${activeSection === 'orders' ? 'active' : ''}`, onClick: () => setActiveSection('orders'), children: "Manage Orders" }), _jsx("div", { className: "nav-spacer" }), _jsx("button", { className: "nav-item signout-btn", onClick: handleSignOut, children: "Sign Out" })] })] }), _jsxs("div", { className: "admin-content", children: [activeSection === 'dashboard' && (_jsxs("div", { className: "dashboard-overview", children: [_jsxs("div", { className: 'dashboard-overview-header', children: [_jsx("div", { className: 'dashboard-overview-title', children: "Dashboard Overview" }), _jsxs("div", { className: "welcome-message", children: ["User: ", admin?.full_name || admin?.email] }), _jsxs("div", { className: "stats-period-filter", children: [_jsx("label", { children: "Period: " }), _jsxs("div", { className: "period-options", children: [_jsx("button", { className: `period-option ${statsPeriod === '30' ? 'active' : ''}`, onClick: () => setStatsPeriod('30'), children: "30 Days" }), _jsx("button", { className: `period-option ${statsPeriod === '60' ? 'active' : ''}`, onClick: () => setStatsPeriod('60'), children: "60 Days" }), _jsx("button", { className: `period-option ${statsPeriod === '90' ? 'active' : ''}`, onClick: () => setStatsPeriod('90'), children: "90 Days" }), _jsx("button", { className: `period-option ${statsPeriod === 'all' ? 'active' : ''}`, onClick: () => setStatsPeriod('all'), children: "All Time" })] })] })] }), _jsxs("div", { className: "dashboard-stats", children: [_jsxs("div", { className: "stat-card", children: [_jsx("h3", { children: "Products" }), _jsx("p", { className: "stat-number", children: productsList.length })] }), _jsxs("div", { className: "stat-card", children: [_jsx("h3", { children: "Drivers" }), _jsx("p", { className: "stat-number", children: drivers.length })] }), _jsxs("div", { className: "stat-card", children: [_jsx("h3", { children: "Orders" }), _jsx("p", { className: "stat-number", children: orders.length })] }), _jsxs("div", { className: "stat-card", children: [_jsx("h3", { children: "Service Revenue" }), _jsxs("p", { className: "stat-number", children: ["R", dashboardStats.serviceRevenue.toFixed(2)] }), _jsxs("p", { className: "stat-period", children: ["Last ", statsPeriod === 'all' ? 'all time' : `${statsPeriod} days`] })] }), _jsxs("div", { className: "stat-card", children: [_jsx("h3", { children: "Order Revenue" }), _jsxs("p", { className: "stat-number", children: ["R", dashboardStats.orderRevenue.toFixed(2)] }), _jsxs("p", { className: "stat-period", children: ["Last ", statsPeriod === 'all' ? 'all time' : `${statsPeriod} days`] })] }), _jsxs("div", { className: "stat-card", children: [_jsx("h3", { children: "Users" }), _jsx("p", { className: "stat-number", children: userCount }), _jsx("p", { className: "stat-period", children: "Total registered users" })] }), _jsxs("div", { className: "stat-card", children: [_jsx("h3", { children: "Driver Payments" }), _jsxs("p", { className: "stat-number", children: ["R", (orders.filter(o => (o.status === 'delivered' || o.status === 'completed') && o.driver_id).length * 40).toFixed(2)] }), _jsx("p", { className: "stat-period", children: "Total driver payments" })] }), _jsxs("div", { className: "stat-card top-products", children: [_jsx("h3", { children: "Top Selling Products" }), dashboardStats.topProducts.length > 0 ? (dashboardStats.topProducts.map((product, idx) => (_jsxs("div", { className: "stat-product", children: [_jsx("span", { className: "product-name", children: product.name }), _jsxs("span", { className: "product-count", children: [product.count, " sold"] })] }, idx)))) : (_jsx("p", { className: "no-data", children: "No product data" })), _jsxs("p", { className: "stat-period", children: ["Last ", statsPeriod === 'all' ? 'all time' : `${statsPeriod} days`] })] })] })] })), activeSection === 'drivers' && (_jsxs("div", { className: "driver-form-section", children: [_jsx("h2", { children: "Register New Driver" }), _jsxs("form", { onSubmit: handleRegisterDriver, className: "admin-form", children: [_jsx("div", { className: "form-group", children: _jsx("input", { name: "email", type: "email", placeholder: "Driver Email", value: driverForm.email, onChange: handleDriverChange, required: true }) }), _jsx("div", { className: "form-group", children: _jsx("input", { name: "password", type: "password", placeholder: "Password", value: driverForm.password, onChange: handleDriverChange, required: true }) }), _jsx("div", { className: "form-group", children: _jsx("input", { name: "full_name", type: "text", placeholder: "Full Name", value: driverForm.full_name, onChange: handleDriverChange, required: true }) }), _jsx("div", { className: "form-group", children: _jsx("input", { name: "phone_number", type: "tel", placeholder: "Phone Number", value: driverForm.phone_number, onChange: handleDriverChange, required: true }) }), _jsx("div", { className: "form-group", children: _jsxs("select", { name: "vehicle_type", value: driverForm.vehicle_type, onChange: handleDriverChange, required: true, className: 'form-select', children: [_jsx("option", { value: "", children: "Select Vehicle Type" }), vehicleTypes.map(t => _jsx("option", { value: t, children: t }, t))] }) }), _jsx("div", { className: "form-group", children: _jsx("input", { name: "vehicle_model", type: "text", placeholder: "Vehicle Model", value: driverForm.vehicle_model, onChange: handleDriverChange, required: true }) }), _jsx("div", { className: "form-group", children: _jsx("input", { name: "bank_details", type: "text", placeholder: "Bank Details", value: driverForm.bank_details, onChange: handleDriverChange, required: true }) }), _jsx("div", { className: "form-group", children: _jsx("input", { name: "license_number", type: "text", placeholder: "License Number", value: driverForm.license_number, onChange: handleDriverChange, required: true }) }), _jsxs("div", { className: "form-group file-input-group", children: [_jsx("label", { children: "License Image:" }), _jsx("input", { name: "license_image", type: "file", accept: "image/*", onChange: handleDriverImageChange })] }), _jsx("button", { type: "submit", className: "form-button", children: "Register Driver" }), driverError && _jsx("div", { className: "error-message", children: driverError }), driverSuccess && _jsx("div", { className: "success-message", children: driverSuccess })] })] })), activeSection === 'products' && (_jsxs("div", { className: "product-form-section", children: [_jsx("h2", { children: "Add New Product" }), _jsxs("form", { onSubmit: handleAddProduct, className: "admin-form", children: [_jsx("div", { className: "form-group", children: _jsx("input", { name: "product_id", type: "text", placeholder: "Product ID", value: productForm.product_id, readOnly: true, className: "readonly-input" }) }), _jsx("div", { className: "form-group", children: _jsx("input", { name: "name", type: "text", placeholder: "Product Name", value: productForm.name, onChange: handleProductChange, required: true }) }), _jsx("div", { className: "form-group", children: _jsx("input", { name: "brand", type: "text", placeholder: "Brand", value: productForm.brand, onChange: handleProductChange, required: true }) }), _jsx("div", { className: "form-group", children: _jsxs("select", { name: "category", value: productForm.category, onChange: handleProductChange, required: true, children: [_jsx("option", { value: "", children: "Select Category" }), productCategories.map(cat => _jsx("option", { value: cat, children: cat }, cat))] }) }), _jsx("div", { className: "form-group", children: _jsx("input", { name: "description", type: "text", placeholder: "Description", value: productForm.description, onChange: handleProductChange, required: true }) }), _jsx("div", { className: "form-group", children: _jsx("input", { name: "price", type: "number", placeholder: "Price", value: productForm.price, onChange: handleProductChange, required: true }) }), _jsxs("div", { className: "form-group file-input-group", children: [_jsx("label", { children: "Product Image:" }), _jsx("input", { name: "image", type: "file", accept: "image/*", onChange: handleProductImageChange })] }), _jsx("button", { type: "submit", className: "form-button", children: "Add Product" }), productError && _jsx("div", { className: "error-message", children: productError }), productSuccess && _jsx("div", { className: "success-message", children: productSuccess })] })] })), activeSection === 'admin' && (_jsxs("div", { className: "admin-promotion-section", children: [_jsx("h2", { children: "Promote User to Admin" }), _jsxs("form", { onSubmit: handlePromoteAdmin, className: "admin-form", children: [_jsx("div", { className: "form-group", children: _jsx("input", { type: "text", placeholder: "Firebase UID", value: promoteUid, onChange: e => setPromoteUid(e.target.value), required: true }) }), _jsx("button", { type: "submit", className: "form-button", children: "Promote to Admin" }), promoteMsg && _jsx("div", { className: promoteMsg.includes('failed') ? "error-message" : "success-message", children: promoteMsg })] })] })), activeSection === 'orders' && (_jsxs("div", { className: "orders-section", children: [_jsxs("div", { className: "orders-header", children: [_jsx("h2", { children: "Manage Orders" }), _jsx("div", { className: "order-search", children: _jsx("input", { type: "text", placeholder: "Search by Order ID", value: orderSearchQuery, onChange: e => setOrderSearchQuery(e.target.value), className: "order-search-input" }) }), _jsx("div", { className: "orders-controls", children: _jsxs("div", { className: "orders-filter", children: [_jsxs("select", { value: orderStatusFilter, onChange: e => setOrderStatusFilter(e.target.value), children: [_jsx("option", { value: "", children: "All Orders" }), _jsx("option", { value: "pending", children: "Pending" }), _jsx("option", { value: "processing", children: "Processing" }), _jsx("option", { value: "in transit", children: "In Transit" }), _jsx("option", { value: "completed", children: "Completed" }), _jsx("option", { value: "cancelled", children: "Cancelled" })] }), _jsx("button", { onClick: fetchOrders, className: "refresh-button", children: "Refresh" })] }) })] }), orderLoading ? _jsx("div", { className: "loading-indicator", children: "Loading orders..." }) :
                                    orderError ? _jsx("div", { className: "error-message", children: orderError }) :
                                        filteredOrders.length === 0 ? _jsx("div", { className: "no-orders", children: orderSearchQuery ? `No orders match "${orderSearchQuery}"` : 'No orders found' }) :
                                            _jsx("div", { className: "orders-grid", children: _jsx("div", { className: "orders-list", children: _jsxs("table", { className: "orders-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Order ID" }), _jsx("th", { children: "Date" }), _jsx("th", { children: "Customer" }), _jsx("th", { children: "Total" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Rating" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: filteredOrders.map(order => (_jsxs("tr", { onClick: () => setSelectedOrder(order), className: selectedOrder?.id === order.id ? 'selected' : '', children: [_jsxs("td", { children: [order.id?.substring(0, 8), "..."] }), _jsx("td", { children: formatDate(order.createdAt) }), _jsxs("td", { children: [order.userId?.substring(0, 8), "..."] }), _jsxs("td", { children: ["R", Number(order.total || 0).toFixed(2)] }), _jsx("td", { children: _jsx("div", { className: `status-badge ${order.status}`, children: order.status }) }), _jsx("td", { children: order.status === 'completed' ? (order.rating ? (_jsx("div", { className: "table-rating", children: _jsx("div", { className: "table-stars", children: [1, 2, 3, 4, 5].map((star) => (_jsx("span", { className: `table-star ${star <= (order.rating || 0) ? 'filled' : ''}`, children: "\u2605" }, star))) }) })) : (_jsx("span", { className: "no-table-rating", children: "Not rated" }))) : (_jsx("span", { children: "\u2014" })) }), _jsx("td", { children: _jsx("div", { className: "action-buttons", children: _jsx("button", { onClick: (e) => { e.stopPropagation(); setSelectedOrder(order); }, className: "view-button", children: "View" }) }) })] }, order.id))) })] }) }) }), selectedOrder && (_jsx("div", { className: "order-details-overlay", onClick: () => { setSelectedOrder(null); setShowDriverDropdown(false); }, children: _jsxs("div", { className: "order-details-modal", onClick: e => e.stopPropagation(), children: [_jsx("button", { className: "modal-close", onClick: () => { setSelectedOrder(null); setShowDriverDropdown(false); }, "aria-label": "Close", children: "\u00D7" }), _jsx("h3", { children: "Order Details" }), _jsxs("div", { className: "order-info", children: [_jsxs("div", { className: "order-header", children: [_jsxs("div", { children: [_jsx("strong", { children: "Order ID:" }), " ", selectedOrder.id] }), _jsxs("div", { children: [_jsx("strong", { children: "Date:" }), " ", formatDate(selectedOrder.createdAt)] })] }), _jsxs("div", { className: "customer-info", children: [loadingCustomer[selectedOrder.userId] ? _jsx("div", { className: "customer-name-loading", children: "Loading customer info..." }) :
                                                                customerDetails[selectedOrder.userId] ? _jsxs("div", { className: "customer-name", children: [_jsx("strong", { children: "Customer Name:" }), " ", customerDetails[selectedOrder.userId].name] }) : null, _jsxs("div", { children: [_jsx("strong", { children: "Customer ID:" }), " ", selectedOrder.userId] })] }), _jsxs("div", { className: "status-section", children: [_jsxs("div", { className: "current-status", children: [_jsx("strong", { children: "Status:" }), _jsx("div", { className: `status-badge ${selectedOrder.status}`, children: selectedOrder.status })] }), _jsxs("div", { className: "status-actions", children: [_jsx("strong", { children: "Update Status:" }), _jsxs("div", { className: "status-buttons", children: [_jsx("button", { onClick: () => { updateOrderStatus(selectedOrder.id, 'processing'); }, className: "status-btn processing", children: "Processing" }), _jsx("button", { onClick: () => { updateOrderStatus(selectedOrder.id, 'in transit'); }, className: "status-btn shipped", children: "In Transit" }), _jsx("button", { onClick: () => { updateOrderStatus(selectedOrder.id, 'delivered'); }, className: "status-btn delivered", children: "Delivered" }), _jsx("button", { onClick: () => { updateOrderStatus(selectedOrder.id, 'cancelled'); }, className: "status-btn cancelled", children: "Cancel" })] })] })] }), _jsxs("div", { className: "delivery-info", children: [_jsx("strong", { children: "Delivery Address:" }), _jsxs("div", { className: "address", children: [selectedOrder.deliveryAddress?.street, ", ", selectedOrder.deliveryAddress?.city, ", ", selectedOrder.deliveryAddress?.postalCode] })] }), _jsxs("div", { className: "driver-section", children: [_jsx("strong", { children: "Driver Assignment:" }), _jsxs("div", { className: "driver-info", children: [selectedOrder.driver_id ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "assigned-driver", children: [_jsx("span", { className: "driver-label", children: "Assigned to driver:" }), _jsx("span", { className: "driver-name", children: drivers.find(d => d.id === selectedOrder.driver_id)?.name || selectedOrder.driver_id })] }), _jsx("button", { onClick: () => setShowDriverDropdown(s => !s), className: "assign-button", children: "Reassign Driver" })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { children: "No driver assigned" }), _jsx("button", { onClick: () => setShowDriverDropdown(s => !s), className: "assign-button", children: "Assign Driver" })] })), showDriverDropdown && (_jsx("div", { className: "driver-dropdown", children: loadingDrivers ? _jsx("div", { className: "dropdown-loading", children: "Loading drivers..." }) :
                                                                            drivers.length === 0 ? _jsx("div", { className: "dropdown-empty", children: "No drivers available" }) :
                                                                                _jsxs("div", { className: "dropdown-list", children: [selectedOrder.driver_id && _jsxs("div", { className: "dropdown-item unassign", onClick: () => { assignDriverToOrder(selectedOrder.id, null); setShowDriverDropdown(false); }, children: [_jsx("span", { className: "unassign-icon", children: "\u274C" }), " Remove Driver"] }), drivers.map(d => _jsx("div", { className: `dropdown-item ${selectedOrder.driver_id === d.id ? 'selected' : ''}`, onClick: () => { assignDriverToOrder(selectedOrder.id, d.id); setShowDriverDropdown(false); }, children: d.name }, d.id))] }) }))] })] }), _jsxs("div", { className: "items-section", children: [_jsx("strong", { children: "Order Items:" }), _jsxs("table", { className: "items-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Item" }), _jsx("th", { children: "Qty" }), _jsx("th", { children: "Price" }), _jsx("th", { children: "Status" })] }) }), _jsx("tbody", { children: selectedOrder.items.map((it, idx) => {
                                                                            // Check if this item has any missing quantities
                                                                            const missingItem = selectedOrder.missingItems?.find((mi) => mi.productId === it.productId);
                                                                            const isFullyAvailable = !missingItem;
                                                                            const isPartiallyAvailable = missingItem && typeof missingItem.missingQuantity === 'number' && missingItem.missingQuantity < it.qty;
                                                                            return (_jsxs("tr", { className: isFullyAvailable ? '' : 'missing-item-row', children: [_jsx("td", { children: it.product?.name || `Product ${it.productId}` }), _jsxs("td", { children: [it.qty, isPartiallyAvailable && typeof missingItem?.missingQuantity === 'number' && (_jsxs("span", { className: "available-qty-note", children: ["(", it.qty - missingItem.missingQuantity, " available)"] }))] }), _jsx("td", { children: it.product?.price ? `R${(it.product.price * it.qty).toFixed(2)}` : 'N/A' }), _jsx("td", { className: "item-status-cell", children: isFullyAvailable ? (_jsx("span", { className: "item-status available", children: "Available" })) : isPartiallyAvailable ? (_jsxs("span", { className: "item-status partial", children: ["Partially Available", _jsxs("div", { className: "item-status-tooltip", children: [missingItem.missingQuantity, " out of ", it.qty, " missing", _jsx("br", {}), "Reason: ", missingItem.reason] })] })) : (_jsxs("span", { className: "item-status missing", children: ["Not Available", _jsxs("div", { className: "item-status-tooltip", children: ["Reason: ", missingItem.reason] })] })) })] }, idx));
                                                                        }) }), _jsxs("tfoot", { children: [_jsxs("tr", { children: [_jsx("td", { colSpan: 2, children: "Subtotal" }), _jsxs("td", { colSpan: 2, children: ["R", Number(selectedOrder.subtotal).toFixed(2)] })] }), _jsxs("tr", { children: [_jsx("td", { colSpan: 2, children: "Service Fee" }), _jsxs("td", { colSpan: 2, children: ["R", Number(selectedOrder.serviceFee).toFixed(2)] })] }), (selectedOrder.refundAmount || 0) > 0 && (_jsxs("tr", { className: "refund-row", children: [_jsx("td", { colSpan: 2, children: "Refund for Missing Items" }), _jsxs("td", { colSpan: 2, className: "refund-amount", children: ["-R", Number(selectedOrder.refundAmount).toFixed(2)] })] })), _jsxs("tr", { className: "total-row", children: [_jsx("td", { colSpan: 2, children: "Total" }), _jsxs("td", { colSpan: 2, children: ["R", Number(selectedOrder.adjustedTotal || selectedOrder.total).toFixed(2), selectedOrder.adjustedTotal && selectedOrder.adjustedTotal !== selectedOrder.total && (_jsxs("span", { className: "original-price", children: [_jsx("br", {}), " was R", Number(selectedOrder.total).toFixed(2)] }))] })] })] })] }), selectedOrder.missingItems && selectedOrder.missingItems.length > 0 && (_jsxs("div", { className: "missing-items-summary", children: [_jsx("h4", { children: "Missing Items Summary" }), _jsxs("div", { className: "missing-items-info", children: [_jsxs("p", { children: [_jsx("span", { className: "info-label", children: "Items Affected:" }), _jsx("span", { className: "info-value", children: selectedOrder.missingItems.length })] }), _jsxs("p", { children: [_jsx("span", { className: "info-label", children: "Refund Amount:" }), _jsxs("span", { className: "info-value", children: ["R", Number(selectedOrder.refundAmount || 0).toFixed(2)] })] }), _jsxs("p", { children: [_jsx("span", { className: "info-label", children: "Refund Status:" }), _jsx("span", { className: `info-value refund-status-${selectedOrder.refundStatus || 'pending'}`, children: (selectedOrder.refundStatus || 'pending').toUpperCase() })] }), selectedOrder.driverNote && (_jsxs("p", { children: [_jsx("span", { className: "info-label", children: "Driver Note:" }), _jsx("span", { className: "info-value driver-note", children: selectedOrder.driverNote })] }))] })] }))] }), selectedOrder?.status === 'completed' && (_jsxs("div", { className: "rating-section", children: [_jsx("strong", { children: "Customer Rating:" }), selectedOrder.rating ? (_jsxs("div", { className: "order-rating", children: [_jsxs("div", { className: "rating-stars", children: [[1, 2, 3, 4, 5].map((star) => (_jsx("span", { className: `admin-star ${star <= (selectedOrder.rating || 0) ? 'filled' : ''}`, children: "\u2605" }, star))), _jsxs("span", { className: "rating-value", children: [selectedOrder.rating, "/5"] })] }), selectedOrder.ratingComment && (_jsxs("div", { className: "rating-comment", children: ["\"", selectedOrder.ratingComment, "\""] }))] })) : (_jsx("div", { className: "no-rating", children: "Customer has not rated this order yet" }))] }))] })] }) }))] })), activeSection === 'ProductManagement' && (_jsxs("div", { className: "product-management-section", children: [_jsxs("div", { className: "product-management-header", children: [_jsx("h2", { children: "Manage Products" }), _jsxs("div", { className: "product-search-container", children: [_jsx("input", { type: "text", placeholder: "Search by name, brand or ID", value: productSearchQuery, onChange: (e) => setProductSearchQuery(e.target.value), className: "product-search-input" }), productSearchQuery && (_jsx("button", { className: "clear-search", onClick: () => setProductSearchQuery(''), "aria-label": "Clear search", children: "\u2715" }))] })] }), productsLoading ? _jsx("div", { className: "loading-indicator", children: "Loading products..." }) :
                                    productsError ? _jsx("div", { className: "error-message", children: productsError }) :
                                        productsList.length === 0 ? _jsx("div", { className: "no-products", children: "No products found" }) :
                                            filteredProductsList.length === 0 ? _jsxs("div", { className: "no-products", children: ["No products matching \"", productSearchQuery, "\""] }) :
                                                _jsx("div", { className: "products-grid", children: _jsx("div", { className: "products-list", children: _jsxs("table", { className: "orders-table products-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Product ID" }), _jsx("th", { children: "Image" }), _jsx("th", { children: "Name" }), _jsx("th", { children: "Category" }), _jsx("th", { children: "Brand" }), _jsx("th", { children: "Price" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: filteredProductsList.map(p => (_jsxs("tr", { children: [_jsxs("td", { children: [(p.id || p.product_id)?.toString().substring(0, 10), "..."] }), _jsx("td", { children: p.image_url ? _jsx("img", { src: p.image_url, alt: p.name, className: "product-thumb" }) : _jsx("div", { className: "no-thumb", children: "\u2014" }) }), _jsx("td", { children: p.name }), _jsx("td", { children: p.category }), _jsx("td", { children: p.brand }), _jsxs("td", { children: ["R", Number(p.price || 0).toFixed(2)] }), _jsx("td", { children: _jsx("div", { className: "action-buttons", children: _jsx("button", { onClick: () => openEditProduct(p), className: "view-button", children: "Edit" }) }) })] }, p.id || p.product_id))) })] }) }) }), editingProduct && (_jsx("div", { className: "order-details-overlay", onClick: closeEditProduct, children: _jsxs("div", { className: "order-details-modal", onClick: e => e.stopPropagation(), children: [_jsx("button", { className: "modal-close", onClick: closeEditProduct, "aria-label": "Close", children: "\u00D7" }), _jsx("h3", { children: "Edit Product" }), _jsxs("form", { onSubmit: handleUpdateProduct, className: "product-edit-form", children: [_jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Product ID" }), _jsx("div", { className: "readonly-input", children: editingProduct.id || editingProduct.product_id })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Name" }), _jsx("input", { name: "name", value: editProductForm.name, onChange: handleEditProductChange, required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Category" }), _jsx("input", { name: "category", value: editProductForm.category, onChange: handleEditProductChange })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Brand" }), _jsx("input", { name: "brand", value: editProductForm.brand, onChange: handleEditProductChange })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Price" }), _jsx("input", { name: "price", type: "number", step: "0.01", value: editProductForm.price, onChange: handleEditProductChange, required: true })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { children: "Description" }), _jsx("textarea", { className: "form-textarea", name: "description", value: editProductForm.description, onChange: handleEditProductChange, rows: 4 })] }), _jsxs("div", { className: "form-group file-input-group", children: [_jsx("label", { children: "Image (leave empty to keep current)" }), _jsx("input", { name: "image", type: "file", accept: "image/*", onChange: handleEditProductImageChange }), editProductForm.image_url && !editProductForm.imageFile && (_jsx("div", { className: "current-image-preview", children: _jsx("img", { className: 'current-image', src: editProductForm.image_url, alt: "current" }) }))] }), _jsxs("div", { className: "form-actions", children: [_jsx("button", { type: "submit", className: "form-button", disabled: productImageUploading, children: productImageUploading ? 'Uploading…' : 'Save changes' }), _jsx("button", { type: "button", className: "form-button secondary", onClick: closeEditProduct, children: "Cancel" })] }), productError && _jsx("div", { className: "error-message", children: productError }), productSuccess && _jsx("div", { className: "success-message", children: productSuccess })] })] }) }))] })), activeSection === 'ManageDrivers' && (_jsxs("div", { className: "manage-drivers-section", children: [_jsxs("div", { className: "section-header", children: [_jsx("h2", { children: "Manage Drivers" }), _jsxs("div", { className: "driver-management-tabs", children: [_jsx("button", { className: `tab-button ${!selectedDriver && !selectedCashout ? 'active' : ''}`, onClick: () => {
                                                        setSelectedDriver(null);
                                                        setSelectedCashout(null);
                                                    }, children: "All Drivers" }), _jsxs("button", { className: `tab-button ${!!selectedCashout ? 'active' : ''}`, onClick: () => {
                                                        setSelectedDriver(null);
                                                        fetchCashoutRequests();
                                                        setSelectedCashout({ id: 'all' });
                                                    }, children: ["Cashout Requests", cashoutList.filter(c => c.status === 'pending').length > 0 && (_jsx("span", { className: "pending-count", children: cashoutList.filter(c => c.status === 'pending').length }))] })] })] }), selectedCashout ? (_jsxs("div", { className: "cashout-requests-container", children: [_jsx("h3", { children: "Driver Cashout Requests" }), cashoutLoading ? (_jsx("div", { className: "loading-indicator", children: "Loading cashout requests..." })) : cashoutError ? (_jsx("div", { className: "error-message", children: cashoutError })) : cashoutList.length === 0 ? (_jsx("div", { className: "no-cashouts", children: "No cashout requests found" })) : (_jsx("div", { className: "cashout-table-container", children: _jsxs("table", { className: "cashout-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Request Date" }), _jsx("th", { children: "Driver" }), _jsx("th", { children: "Amount" }), _jsx("th", { children: "Deliveries" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: cashoutList.map(cashout => (_jsxs("tr", { className: `${cashout.status === 'pending' ? 'pending-row' : ''} ${cashout.status === 'completed' ? 'completed-row' : ''}`, children: [_jsx("td", { children: formatDate(cashout.createdAt) }), _jsx("td", { children: cashout.driverName || 'Unknown' }), _jsxs("td", { className: "amount-cell", children: ["R", Number(cashout.amount || 0).toFixed(2)] }), _jsxs("td", { children: [cashout.orderCount || 0, " deliveries"] }), _jsxs("td", { children: [_jsx("span", { className: `cashout-status status-${cashout.status || 'pending'}`, children: cashout.status === 'completed' ? 'Paid' : 'Pending' }), cashout.paidAt && _jsxs("div", { className: "paid-date", children: ["Paid on ", formatDate(cashout.paidAt)] })] }), _jsx("td", { children: cashout.status === 'pending' ? (_jsx("button", { className: "pay-button", onClick: () => processDriverPayment(cashout.id), disabled: processingPayment, children: processingPayment ? 'Processing...' : 'Mark as Paid' })) : (_jsx("span", { className: "already-paid", children: "Paid \u2713" })) })] }, cashout.id))) })] }) }))] })) : (
                                // Original drivers table content here
                                _jsx("div", { className: "drivers-table-container", children: _jsxs("table", { className: "drivers-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Driver Name" }), _jsx("th", { children: "Email" }), _jsx("th", { children: "Phone" }), _jsx("th", { children: "Vehicle" }), _jsx("th", { children: "Assigned Orders" }), _jsx("th", { children: "Accepted Orders" }), _jsx("th", { children: "Delivered Orders" }), _jsx("th", { children: "Revenue" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: driversList.map(driver => {
                                                    // Get this driver's orders 
                                                    const driverId = driver.driver_id || driver.id;
                                                    const driverOrderCount = orders.filter(o => o.driver_id === driverId).length;
                                                    // Only count orders with status 'delivered' or 'completed' for revenue
                                                    const driverDeliveredCount = orders.filter(o => o.driver_id === driverId &&
                                                        (o.status === 'delivered' || o.status === 'completed')).length;
                                                    const driverAcceptedCount = orders.filter(o => o.driver_id === driverId &&
                                                        (o.status === 'processing' || o.status === 'in transit' || o.status === 'delivered' || o.status === 'completed')).length;
                                                    // Calculate revenue at R40 per completed delivery
                                                    const driverRevenue = driverDeliveredCount * 40;
                                                    return (_jsxs("tr", { className: selectedDriver?.driver_id === driver.driver_id ? 'selected-row' : '', onClick: () => setSelectedDriver(driver), children: [_jsx("td", { children: driver.full_name || 'Unknown' }), _jsx("td", { children: driver.email || 'N/A' }), _jsx("td", { children: driver.phone_number || 'N/A' }), _jsxs("td", { children: [driver.vehicle_type, " ", driver.vehicle_model] }), _jsx("td", { children: driverOrderCount }), _jsx("td", { children: driverAcceptedCount }), _jsx("td", { children: driverDeliveredCount }), _jsxs("td", { className: "revenue-cell", children: ["R", driverRevenue.toFixed(2)] }), _jsx("td", { children: _jsx("div", { className: "action-buttons", children: _jsx("button", { className: "view-button", onClick: (e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedDriver(driver);
                                                                        }, children: "View Orders" }) }) })] }, driverId));
                                                }) })] }) })), selectedDriver && (_jsx("div", { className: "order-details-overlay", onClick: () => setSelectedDriver(null), children: _jsxs("div", { className: "order-details-modal driver-orders-modal", onClick: e => e.stopPropagation(), children: [_jsx("button", { className: "modal-close", onClick: () => setSelectedDriver(null), "aria-label": "Close", children: "\u00D7" }), _jsx("div", { className: "modal-header", children: _jsxs("h3", { children: ["Driver: ", selectedDriver.full_name || selectedDriver.email] }) }), _jsxs("div", { className: "driver-modal-tabs", children: [_jsx("button", { className: `tab-button ${!showPaymentHistory ? 'active' : ''}`, onClick: () => setShowPaymentHistory(false), children: "Orders" }), _jsx("button", { className: `tab-button ${showPaymentHistory ? 'active' : ''}`, onClick: () => setShowPaymentHistory(true), children: "Payment History" })] }), showPaymentHistory ? (_jsx("div", { className: "payment-history-container", children: paymentHistoryLoading ? (_jsx("div", { className: "loading-indicator", children: "Loading payment history..." })) : driverPaymentHistory.length === 0 ? (_jsx("div", { className: "no-payment-history", children: "No payment records found for this driver" })) : (_jsxs("table", { className: "payment-history-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Payment Date" }), _jsx("th", { children: "Amount" }), _jsx("th", { children: "Deliveries" }), _jsx("th", { children: "Request Date" }), _jsx("th", { children: "Status" })] }) }), _jsx("tbody", { children: driverPaymentHistory.map(payment => (_jsxs("tr", { children: [_jsx("td", { children: payment.paidAt ? formatDate(payment.paidAt) : 'N/A' }), _jsxs("td", { className: "amount-cell", children: ["R", Number(payment.amount || 0).toFixed(2)] }), _jsxs("td", { children: [payment.orderCount || 0, " deliveries"] }), _jsx("td", { children: formatDate(payment.createdAt) }), _jsx("td", { children: _jsx("span", { className: `payment-status status-${payment.status || 'pending'}`, children: payment.status === 'completed' ? 'Paid' : 'Pending' }) })] }, payment.id))) }), _jsx("tfoot", { children: _jsxs("tr", { children: [_jsx("td", { colSpan: 2, children: _jsx("strong", { children: "Total Paid:" }) }), _jsxs("td", { colSpan: 3, className: "total-paid", children: ["R", driverPaymentHistory
                                                                                .filter(p => p.status === 'completed')
                                                                                .reduce((sum, p) => sum + Number(p.amount || 0), 0)
                                                                                .toFixed(2)] })] }) })] })) })) : (
                                            // Original driver orders content here
                                            _jsx(_Fragment, { children: _jsx("div", { className: "driver-orders-accordion", children: driverOrders.map(order => (_jsxs("div", { className: "order-accordion-item", children: [_jsxs("div", { className: `order-accordion-header ${expandedOrderId === order.id ? 'expanded' : ''}`, onClick: () => setExpandedOrderId(expandedOrderId === order.id ? null : order.id), children: [_jsxs("div", { className: "order-accordion-summary", children: [_jsxs("div", { className: "order-id", children: ["Order #", order.id.substring(0, 8)] }), _jsx("div", { className: "order-date", children: formatDate(order.createdAt) }), _jsx("div", { className: "order-customer", children: customerDetails[order.userId]?.name || order.userId.substring(0, 8) + '...' }), _jsxs("div", { className: "order-total", children: ["R", Number(order.total).toFixed(2)] }), _jsx("div", { className: `status-badge ${order.status}`, children: order.status })] }), _jsx("div", { className: "accordion-icon", children: expandedOrderId === order.id ? '−' : '+' })] }), expandedOrderId === order.id && (_jsxs("div", { className: "order-accordion-content", children: [_jsxs("div", { className: "order-details-grid", children: [_jsxs("div", { className: "detail-column", children: [_jsx("h4", { children: "Delivery Address" }), _jsx("p", { children: order.deliveryAddress?.street || 'N/A' }), _jsxs("p", { children: [order.deliveryAddress?.city, ", ", order.deliveryAddress?.postalCode] })] }), _jsxs("div", { className: "detail-column", children: [_jsx("h4", { children: "Delivery Status" }), _jsx("div", { className: `delivery-status ${order.status === 'delivered' ? 'delivered' :
                                                                                            order.status === 'in transit' ? 'in-transit' :
                                                                                                'not-started'}`, children: order.status === 'delivered' ? 'Delivered' :
                                                                                            order.status === 'in transit' ? 'In Transit' :
                                                                                                'Not Started' }), _jsxs("div", { className: "payment-status-container", children: [_jsx("h4", { children: "Payment Status" }), _jsx("div", { className: `payment-status ${order.status === 'delivered' ? 'paid' : 'unpaid'}`, children: order.status === 'delivered' ? 'R40 Paid' : 'Payment Pending' })] })] })] }), _jsxs("div", { className: "order-items-section", children: [_jsx("h4", { children: "Order Items" }), _jsxs("table", { className: "items-table driver-items-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Item" }), _jsx("th", { children: "Quantity" }), _jsx("th", { children: "Price" }), _jsx("th", { children: "Total" })] }) }), _jsx("tbody", { children: order.items && order.items.map((item, idx) => (_jsxs("tr", { children: [_jsx("td", { children: _jsxs("div", { className: "item-details", children: [item.product?.image_url && (_jsx("img", { src: item.product.image_url, alt: item.product.name, className: "item-thumbnail" })), _jsx("span", { children: item.product?.name || `Product ${item.productId}` })] }) }), _jsx("td", { children: item.qty }), _jsxs("td", { children: ["R", Number(item.product?.price || 0).toFixed(2)] }), _jsxs("td", { children: ["R", Number((item.product?.price || 0) * item.qty).toFixed(2)] })] }, idx))) }), _jsxs("tfoot", { children: [_jsxs("tr", { children: [_jsx("td", { colSpan: 3, children: "Subtotal" }), _jsxs("td", { children: ["R", Number(order.subtotal || 0).toFixed(2)] })] }), _jsxs("tr", { children: [_jsx("td", { colSpan: 3, children: "Service Fee" }), _jsxs("td", { children: ["R", Number(order.serviceFee || 0).toFixed(2)] })] }), _jsxs("tr", { className: "total-row", children: [_jsx("td", { colSpan: 3, children: "Total" }), _jsxs("td", { children: ["R", Number(order.total || 0).toFixed(2)] })] })] })] })] }), _jsx("div", { className: "order-actions", children: _jsx("button", { className: "view-button", onClick: () => {
                                                                                setSelectedDriver(null);
                                                                                setSelectedOrder(order);
                                                                            }, children: "View Full Details" }) })] }))] }, order.id))) }) }))] }) }))] }))] })] }) }));
};
export default AdminDashboard;