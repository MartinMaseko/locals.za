import { useState, useCallback, useMemo } from 'react';
import { adminApi } from '../services/adminApi';
import { filterOrdersForCalculations } from '../utils/orderStatusUtils';

interface Order {
  id: string;
  userId: string;
  salon_id: string | null;
  items: any[];
  subtotal: number;
  serviceFee: number;
  total: number;
  deliveryAddress: any;
  status: string;
  createdAt: any;
  updatedAt: any;
  driver_id?: string | null;
  missingItems?: any[];
  refundAmount?: number;
  adjustedTotal?: number;
  refundStatus?: string;
  driverNote?: string;
  rating?: number;
  ratingComment?: string;
  ratedAt?: any;
}

export const useOrders = () => {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchOrders = useCallback(async (statusFilter = '') => {
    setLoading(true);
    setError('');
    try {
      // adminApi.getOrders() already filters out pending_payment and cancelled orders
      const data = await adminApi.getOrders();
      
      setAllOrders(data);
      
      // Apply status filter if provided
      if (statusFilter) {
        const filtered = data.filter(order => 
          order.status && order.status.toLowerCase() === statusFilter.toLowerCase()
        );
        setOrders(filtered);
        setFilteredOrders(filtered);
      } else {
        setOrders(data);
        setFilteredOrders(data);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (orderId: string, status: string) => {
    try {
      await adminApi.updateOrderStatus(orderId, status);
      setOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, status } : o)
      );
      setFilteredOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, status } : o)
      );
      setAllOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, status } : o)
      );
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to update status');
    }
  }, []);

  const assignDriver = useCallback(async (orderId: string, driverId: string | null) => {
    try {
      await adminApi.assignDriver(orderId, driverId);
      setOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, driver_id: driverId } : o)
      );
      setFilteredOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, driver_id: driverId } : o)
      );
      setAllOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, driver_id: driverId } : o)
      );
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to assign driver');
    }
  }, []);

  const filterByQuery = useCallback((query: string) => {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(o => o.id?.toLowerCase().includes(q)));
    }
  }, [orders]);

  // Since API already filters, we can use for business calculations directly
  const validOrders = useMemo(() => {
    return filterOrdersForCalculations(allOrders);
  }, [allOrders]);
  
  return {
    orders: validOrders, // Return filtered orders for business calculations
    allOrders, // Return all API-filtered orders
    filteredOrders,
    loading,
    error,
    setError,
    fetchOrders,
    updateStatus,
    assignDriver,
    filterByQuery
  };
};
