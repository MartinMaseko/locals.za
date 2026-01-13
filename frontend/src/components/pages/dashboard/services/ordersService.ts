import axios from 'axios';
import type { Order } from '../types/index';

const API_URL = import.meta.env.VITE_API_URL;

// Define valid order statuses for business calculations
const VALID_ORDER_STATUSES = ['pending', 'processing', 'in transit', 'completed'];

/**
 * Filter orders to include only valid statuses for business calculations
 * Excludes: 'pending_payment' (abandoned carts) and 'cancelled' orders
 */
const filterValidOrders = (orders: Order[]): Order[] => {
  return orders.filter(order => 
    order.status && VALID_ORDER_STATUSES.includes(order.status.toLowerCase())
  );
};

/**
 * Orders API service for fetching and managing order data
 */
export const ordersService = {
  /**
   * Fetch all orders from backend and filter for valid statuses
   */
  fetchAllOrders: async (token: string): Promise<Order[]> => {
    try {
      const { data } = await axios.get<Order[]>(`${API_URL}/api/orders/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const orders = Array.isArray(data) ? data : [];
      return filterValidOrders(orders);
    } catch (err) {
      console.error('Error fetching all orders:', err);
      return [];
    }
  },

  /**
   * Fetch orders for a specific driver and filter for valid statuses
   */
  fetchDriverOrders: async (token: string, driverId: string): Promise<Order[]> => {
    if (!driverId) return [];
    
    try {
      try {
        const { data } = await axios.get<Order[]>(`${API_URL}/api/orders/driver/${driverId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const orders = Array.isArray(data) ? data : [];
        return filterValidOrders(orders);
      } catch (err: any) {
        console.error('Error fetching driver orders:', err);
        
        // Fallback: If the dedicated endpoint fails, get all orders and filter client-side
        if (err?.response?.status === 403 || err?.response?.status === 404) {
          const { data } = await axios.get<Order[]>(`${API_URL}/api/orders/all`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (Array.isArray(data)) {
            const filteredOrders = filterValidOrders(data);
            return filteredOrders.filter(order => order.driver_id === driverId);
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
   * Get valid order statuses for reference
   */
  getValidOrderStatuses: () => VALID_ORDER_STATUSES
};
