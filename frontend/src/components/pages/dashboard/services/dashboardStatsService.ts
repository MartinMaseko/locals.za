import axios from 'axios';
import { filterOrdersForCalculations } from '../utils/orderStatusUtils';
import type { Order, StatsResponse } from '../types/index';

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Dashboard statistics calculation and fetching
 */
export const dashboardStatsService = {
  /**
   * Fetch dashboard statistics from backend
   */
  fetchStats: async (token: string, period: string): Promise<StatsResponse | null> => {
    try {
      const { data } = await axios.get<StatsResponse>(
        `${API_URL}/api/admin/stats?period=${period}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return data;
    } catch (apiError) {
      console.warn('Stats API not available, calculating locally', apiError);
      return null;
    }
  },

  /**
   * Calculate stats locally from orders
   */
  calculateStatsLocally: (orders: Order[], period: string) => {
    const daysToLookBack = period === 'all' ? 36500 : parseInt(period);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToLookBack);

    // Filter by date
    const filteredOrders = orders.filter(order => {
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

    // Calculate order revenue
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

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      serviceRevenue,
      orderRevenue,
      topProducts
    };
  },

  /**
   * Calculate dashboard stats
   */
  calculateDashboardStats: (orders: Order[]) => {
    // Filter orders before any calculations
    const validOrders = filterOrdersForCalculations(orders);
    
    return {
      totalRevenue: validOrders.reduce((sum, order) => sum + (order.total || 0), 0),
      totalOrders: validOrders.length,
      // ... other calculations using validOrders
    };
  }
};
