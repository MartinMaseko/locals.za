import { useCallback, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';
import { ordersService } from '../services/ordersService';
import { driversService } from '../services/driversService';
import { cashoutService } from '../services/cashoutService';
import { adminApi } from '../services/adminApi';

/**
 * Custom hook for fetching customer details
 */
export const useFetchCustomerDetails = () => {
  const [customerDetails, setCustomerDetails] = useState<Record<string, any>>({});
  const [loadingCustomer, setLoadingCustomer] = useState<Record<string, boolean>>({});

  const fetchCustomerDetails = useCallback(async (userId: string) => {
    if (!userId || customerDetails[userId] || loadingCustomer[userId]) return;
    
    setLoadingCustomer(prev => ({ ...prev, [userId]: true }));
    try {
      const data = await adminApi.getCustomerDetails(userId);
      const customer = data as { full_name?: string; email?: string; phone_number?: string };
      
      setCustomerDetails(prev => ({
        ...prev,
        [userId]: {
          name: customer.full_name || customer.email || 'Unknown',
          email: customer.email,
          phone: customer.phone_number
        }
      }));
    } catch (err) {
      setCustomerDetails(prev => ({ ...prev, [userId]: { name: 'Unknown Customer' } }));
    } finally {
      setLoadingCustomer(prev => ({ ...prev, [userId]: false }));
    }
  }, [customerDetails, loadingCustomer]);

  return { customerDetails, loadingCustomer, fetchCustomerDetails };
};

/**
 * Custom hook for fetching all drivers
 */
export const useFetchDriversList = () => {
  const [driversList, setDriversList] = useState<any[]>([]);

  const fetchDriversList = useCallback(async (getToken: () => Promise<string>) => {
    try {
      const token = await getToken();
      const drivers = await driversService.fetchAllDrivers(token);
      setDriversList(drivers);
    } catch (err: any) {
      console.error('Error fetching drivers:', err);
    }
  }, []);

  return { driversList, fetchDriversList };
};

/**
 * Custom hook for fetching driver orders
 */
export const useFetchDriverOrders = () => {
  const [driverOrders, setDriverOrders] = useState<any[]>([]);

  const fetchDriverOrders = useCallback(async (getToken: () => Promise<string>, driverId: string) => {
    try {
      const token = await getToken();
      const orders = await ordersService.fetchDriverOrders(token, driverId);
      setDriverOrders(orders);
    } catch (err) {
      console.error('Error fetching driver orders:', err);
      setDriverOrders([]);
    }
  }, []);

  return { driverOrders, fetchDriverOrders };
};

/**
 * Custom hook for fetching driver payment history
 */
export const useFetchPaymentHistory = () => {
  const [driverPaymentHistory, setDriverPaymentHistory] = useState<any[]>([]);
  const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);

  const fetchPaymentHistory = useCallback(async (getToken: () => Promise<string>, driverId: string) => {
    if (!driverId) return;
    
    setPaymentHistoryLoading(true);
    try {
      const token = await getToken();
      const history = await driversService.fetchPaymentHistory(token, driverId);
      setDriverPaymentHistory(history);
    } catch (err) {
      console.error('Error fetching driver payment history:', err);
      setDriverPaymentHistory([]);
    } finally {
      setPaymentHistoryLoading(false);
    }
  }, []);

  return { driverPaymentHistory, paymentHistoryLoading, fetchPaymentHistory };
};

/**
 * Custom hook for managing cashout requests
 */
export const useCashoutRequests = () => {
  const [cashoutList, setCashoutList] = useState<any[]>([]);
  const [cashoutLoading, setCashoutLoading] = useState(false);
  const [cashoutError, setCashoutError] = useState('');

  const fetchCashoutRequests = useCallback(async (getToken?: () => Promise<string>) => {
    setCashoutLoading(true);
    setCashoutError('');
    try {
      let token: string;
      if (getToken) {
        token = await getToken();
      } else {
        const auth = getAuth(app);
        const user = auth.currentUser;
        if (!user) throw new Error('Authentication required');
        token = await user.getIdToken(true);
      }
      const requests = await cashoutService.fetchCashoutRequests(token);
      setCashoutList(requests);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to load cashout requests';
      setCashoutError(errorMsg);
    } finally {
      setCashoutLoading(false);
    }
  }, []);

  return {
    cashoutList,
    setCashoutList,
    cashoutLoading,
    cashoutError,
    fetchCashoutRequests
  };
};
