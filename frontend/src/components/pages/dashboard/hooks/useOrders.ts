import { useState, useCallback, useMemo } from 'react';
import { adminApi } from '../services/adminApi';
import { ordersService } from '../services/ordersService';
import { filterOrdersForCalculations } from '../utils/orderStatusUtils';
import type { Order, OrderStatus } from '../types/index';

export const useOrders = () => {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customerDetails, setCustomerDetails] = useState<Record<string, any>>({});

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
      
      // Fetch customer details for all orders to enable name/email search
      await fetchCustomerDetailsForOrders(data);
      
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomerDetailsForOrders = useCallback(async (ordersList: Order[]) => {
    const uniqueUserIds = [...new Set(ordersList.map(order => order.userId).filter(Boolean))];
    
    const detailsPromises = uniqueUserIds.map(async (userId) => {
      try {
        const data = await adminApi.getCustomerDetails(userId);
        const customer = data as { full_name?: string; email?: string; phone_number?: string };
        return {
          userId,
          details: {
            name: customer.full_name || customer.email || 'Unknown',
            email: customer.email,
            phone: customer.phone_number
          }
        };
      } catch (err) {
        return {
          userId,
          details: { name: 'Unknown Customer', email: '', phone: '' }
        };
      }
    });

    const results = await Promise.all(detailsPromises);
    const newCustomerDetails = results.reduce((acc, { userId, details }) => {
      acc[userId] = details;
      return acc;
    }, {} as Record<string, any>);

    setCustomerDetails(prev => ({ ...prev, ...newCustomerDetails }));
  }, []);

  const updateStatus = useCallback(async (orderId: string, status: OrderStatus) => {
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
    if (!query.trim()) {
      setFilteredOrders(orders);
    } else {
      // Use the ordersService filterOrders method that searches by ID, name, and email
      const filtered = ordersService.filterOrders(orders, query, customerDetails);
      setFilteredOrders(filtered);
    }
  }, [orders, customerDetails]);

  // Since API already filters, we can use for business calculations directly
  const validOrders = useMemo(() => {
    return filterOrdersForCalculations(allOrders);
  }, [allOrders]);
  
  return {
    orders: validOrders, // Return filtered orders for business calculations
    allOrders, // Return all API-filtered orders
    filteredOrders,
    customerDetails, // Return customer details for search functionality
    loading,
    error,
    setError,
    fetchOrders,
    updateStatus,
    assignDriver,
    filterByQuery
  };
};
