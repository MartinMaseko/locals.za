import axios from 'axios';
import type { Order } from '../types/index';

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Orders API service for fetching and managing order data
 */
export const ordersService = {
  /**
   * Fetch all orders from backend
   */
  fetchAllOrders: async (token: string): Promise<Order[]> => {
    try {
      const { data } = await axios.get<Order[]>(`${API_URL}/api/orders/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error fetching all orders:', err);
      return [];
    }
  },

  /**
   * Fetch orders for a specific driver
   */
  fetchDriverOrders: async (token: string, driverId: string): Promise<Order[]> => {
    if (!driverId) return [];

    try {
      try {
        const { data } = await axios.get<Order[]>(`${API_URL}/api/orders/driver/${driverId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        return Array.isArray(data) ? data : [];
      } catch (err: any) {
        console.error('Error fetching driver orders:', err);

        if (err?.response?.status === 403 || err?.response?.status === 404) {
          const { data } = await axios.get<Order[]>(`${API_URL}/api/orders/all`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (Array.isArray(data)) {
            return data.filter(order => order.driver_id === driverId);
          }
        }
        return [];
      }
    } catch (err) {
      console.error('Error fetching driver orders:', err);
      return [];
    }
  },

  /**
   * Filter orders by search query (order ID, customer name, or email)
   */
  filterOrders: (orders: Order[], searchQuery: string, customerDetails: any): Order[] => {
    if (!searchQuery.trim()) return orders;
    
    const query = searchQuery.toLowerCase().trim();
    
    return orders.filter(order => {
      // Search by Order ID
      if (order.id?.toLowerCase().includes(query)) return true;
      
      // Search by Customer Name
      const customerName = customerDetails[order.userId]?.name?.toLowerCase();
      if (customerName && customerName.includes(query)) return true;
      
      // Search by Customer Email  
      const customerEmail = customerDetails[order.userId]?.email?.toLowerCase();
      if (customerEmail && customerEmail.includes(query)) return true;
      
      return false;
    });
  }
};
