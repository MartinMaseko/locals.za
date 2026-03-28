import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Drivers API service for managing driver data
 */
export const driversService = {
  /**
   * Fetch all drivers
   */
  fetchAllDrivers: async (token: string): Promise<any[]> => {
    try {
      const { data } = await axios.get(`${API_URL}/api/drivers/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error('Error fetching drivers:', err);
      return [];
    }
  },

  /**
   * Fetch driver payment history
   */
  fetchPaymentHistory: async (token: string, driverId: string): Promise<any[]> => {
    if (!driverId) return [];
    
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/drivers/${driverId}/payments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching driver payment history:', err);
      return [];
    }
  },

  /**
   * Fetch all orders for all drivers (for dashboard statistics)
   */
  fetchAllDriverOrders: async (token: string): Promise<any[]> => {
    try {
      const { data } = await axios.get(`${API_URL}/api/orders/drivers/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error('Error fetching all driver orders:', err);
      return [];
    }
  },

  /**
   * Fetch orders for a specific driver
   */
  fetchDriverOrders: async (token: string, driverId: string): Promise<any[]> => {
    if (!driverId) return [];
    
    try {
      const { data } = await axios.get(`${API_URL}/api/orders/driver/${driverId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error('Error fetching driver orders:', err);
      return [];
    }
  },

  /**
   * Register a new driver
   */
  registerDriver: async (token: string, driverData: any) => {
    return axios.post(`${API_URL}/api/drivers/register`, driverData, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};
