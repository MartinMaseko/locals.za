import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';

const API_URL = import.meta.env.VITE_API_URL;

// Token cache to prevent excessive refreshes
let cachedToken: string | null = null;
let tokenExpiryTime: number = 0;
let tokenRefreshPromise: Promise<string> | null = null;

const getToken = async () => {
  const auth = getAuth(app);
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required');
  
  const now = Date.now();
  
  // Return cached token if still valid (with 5 minute buffer)
  if (cachedToken && tokenExpiryTime > now + 300000) {
    return cachedToken;
  }
  
  // If token refresh is already in progress, wait for it
  if (tokenRefreshPromise) {
    return tokenRefreshPromise;
  }
  
  // Start new token refresh
  tokenRefreshPromise = user.getIdToken(true).then(token => {
    cachedToken = token;
    // Tokens typically expire in 1 hour
    tokenExpiryTime = now + 3600000;
    tokenRefreshPromise = null;
    return token;
  }).catch(error => {
    tokenRefreshPromise = null;
    throw error;
  });
  
  return tokenRefreshPromise;
};

// Auth APIs
export const adminApi = {
  // Auth
  getAdminProfile: async () => {
    const token = await getToken();
    const { data } = await axios.get(`${API_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return data;
  },

  promoteToAdmin: async (uid: string) => {
    const token = await getToken();
    const { data } = await axios.post(`${API_URL}/api/auth/promote-admin`, { uid }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return data;
  },

  promoteToSalesRep: async (username: string, email: string, password: string) => {
    const token = await getToken();
    return axios.post(`${API_URL}/api/admin/promote-sales-rep`, { username, email, password }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  getSalesReps: async () => {
    const token = await getToken();
    const { data } = await axios.get(`${API_URL}/api/admin/sales-reps`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return Array.isArray(data) ? data : [];
  },

  getSalesRepDetails: async (salesRepId: string) => {
    const token = await getToken();
    const { data } = await axios.get(`${API_URL}/api/admin/sales-reps/${salesRepId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return data;
  },

  // Orders
  getOrders: async (status?: string) => {
    const token = await getToken();
    const url = status 
      ? `${API_URL}/api/orders/all?status=${encodeURIComponent(status)}`
      : `${API_URL}/api/orders/all`;
    const { data } = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Filter out pending_payment and cancelled orders at API level
    const filteredData = Array.isArray(data) 
      ? data.filter(order => 
          order && 
          order.status && 
          !['pending_payment', 'cancelled'].includes(order.status.toLowerCase())
        )
      : [];
    
    return filteredData;
  },

  updateOrderStatus: async (orderId: string, status: string) => {
    const token = await getToken();
    const { data } = await axios.put(
      `${API_URL}/api/orders/${orderId}/status`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data;
  },

  assignDriver: async (orderId: string, driverId: string | null) => {
    const token = await getToken();
    const { data } = await axios.put(
      `${API_URL}/api/orders/${orderId}/assign-driver`,
      { driver_id: driverId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data;
  },

  getCustomerDetails: async (userId: string) => {
    const token = await getToken();
    const { data } = await axios.get(`${API_URL}/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return data;
  },

  // Products
  getProducts: async () => {
    const token = await getToken();
    const { data } = await axios.get(`${API_URL}/api/products`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return Array.isArray(data) ? data : [];
  },

  createProduct: async (product: any) => {
    const token = await getToken();
    const { data } = await axios.post(`${API_URL}/api/products`, product, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return data;
  },

  updateProduct: async (productId: string, updates: any) => {
    const token = await getToken();
    const { data } = await axios.put(
      `${API_URL}/api/products/${productId}`,
      updates,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    return data;
  },

  // Drivers
  getDrivers: async () => {
    const token = await getToken();
    const { data } = await axios.get(`${API_URL}/api/drivers`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return Array.isArray(data) ? data : [];
  },

  getAllDrivers: async () => {
    const token = await getToken();
    const { data } = await axios.get(`${API_URL}/api/drivers/all`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return Array.isArray(data) ? data : [];
  },

  registerDriver: async (driver: any) => {
    const token = await getToken();
    const { data } = await axios.post(`${API_URL}/api/drivers/register`, driver, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return data;
  },

  getDriverOrders: async (driverId: string) => {
    const token = await getToken();
    try {
      const { data } = await axios.get(`${API_URL}/api/orders/driver/${driverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      // Fallback: get all orders and filter client-side
      if (err?.response?.status === 403 || err?.response?.status === 404) {
        const { data } = await axios.get(`${API_URL}/api/orders/all`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        return Array.isArray(data) ? data.filter(o => o.driver_id === driverId) : [];
      }
      throw err;
    }
  },

  getDriverPaymentHistory: async (driverId: string) => {
    const token = await getToken();
    const { data } = await axios.get(`${API_URL}/api/admin/drivers/${driverId}/payments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return Array.isArray(data) ? data : [];
  },

  // Stats
  getUserCount: async () => {
    const token = await getToken();
    const { data } = await axios.get(`${API_URL}/api/admin/stats/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return data;
  },

  getDashboardStats: async (period: string) => {
    const token = await getToken();
    const { data } = await axios.get(`${API_URL}/api/admin/stats?period=${period}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return data;
  },

  // Cashouts
  getCashoutRequests: async () => {
    const token = await getToken();
    const { data } = await axios.get(`${API_URL}/api/admin/cashouts`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return Array.isArray(data) ? data : [];
  },

  processPayment: async (cashoutId: string) => {
    const token = await getToken();
    const { data } = await axios.put(
      `${API_URL}/api/admin/cashouts/${cashoutId}/complete`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data;
  }
};
