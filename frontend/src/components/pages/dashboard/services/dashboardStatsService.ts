import axios from 'axios';
import type { Order, StatsResponse } from '../types/index';

const API_URL = import.meta.env.VITE_API_URL;

export const dashboardStatsService = {
  fetchStats: async (token: string, period: string): Promise<StatsResponse | null> => {
    try {
      const { data } = await axios.get<StatsResponse>(
        `${API_URL}/api/admin/stats?period=${period}&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // 10 products even if API returns more
      if (data && data.topProducts) {
        data.topProducts = data.topProducts.slice(0, 10);
      }
      return data;
    } catch (apiError) {
      console.warn('Stats API not available, calculating locally', apiError);
      return null;
    }
  },

  calculateStatsLocally: (orders: Order[], period: string) => {
    const daysToLookBack = period === 'all' ? 36500 : parseInt(period);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToLookBack);

    // Filter by date only
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

    // Service revenue: R78 per order
    const serviceRevenue = filteredOrders.length * 78;

    // Order revenue: sum of subtotals for all orders
    const orderRevenue = filteredOrders.reduce((sum, order) =>
      sum + (Number(order.subtotal) || 0), 0);

    // Calculate top products
    const productSales: Record<string, { name: string; count: number; revenue: number }> = {};

    filteredOrders.forEach(order => {
      if (!order.items) return;

      order.items.forEach(item => {
        const productId = item.productId;
        if (!productId) return;

        const productName = item.product?.name || `Product ${productId}`;
        const qty = Number(item.qty) || 0;
        const itemPrice = Number(item.product?.price || 0);

        if (!productSales[productId]) {
          productSales[productId] = { name: productName, count: 0, revenue: 0 };
        }

        productSales[productId].count += qty;
        productSales[productId].revenue += itemPrice * qty;
      });
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    console.log(`Stats calculation for ${period}:`, {
      totalOrdersReceived: orders.length,
      dateFilteredOrders: filteredOrders.length,
      serviceRevenue,
      orderRevenue,
      topProductsCount: topProducts.length
    });

    return { serviceRevenue, orderRevenue, topProducts };
  },

  calculateDashboardStats: (orders: Order[]) => {
    return {
      totalRevenue: orders.reduce((sum, order) => sum + (order.total || 0), 0),
      totalOrders: orders.length,
    };
  }
};
