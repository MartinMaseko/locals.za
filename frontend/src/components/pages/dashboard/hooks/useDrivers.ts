import { useState, useCallback } from 'react';
import { adminApi } from '../services/adminApi';

export const useDrivers = () => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [allDrivers, setAllDrivers] = useState<any[]>([]);
  const [driverOrders, setDriverOrders] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getDrivers();
      setDrivers(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAllDrivers();
      setAllDrivers(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load drivers');
    } finally {
      setLoading(false);
    }
  }, []);

  const registerDriver = useCallback(async (driverData: any) => {
    setError('');
    setSuccess('');
    try {
      await adminApi.registerDriver(driverData);
      setSuccess('Driver registered successfully!');
      return true;
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Driver registration failed');
      return false;
    }
  }, []);

  const fetchDriverOrders = useCallback(async (driverId: string) => {
    try {
      const data = await adminApi.getDriverOrders(driverId);
      setDriverOrders(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load driver orders');
    }
  }, []);

  const fetchPaymentHistory = useCallback(async (driverId: string) => {
    try {
      const data = await adminApi.getDriverPaymentHistory(driverId);
      setPaymentHistory(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load payment history');
    }
  }, []);

  return {
    drivers,
    allDrivers,
    driverOrders,
    paymentHistory,
    loading,
    error,
    success,
    setError,
    setSuccess,
    fetchDrivers,
    fetchAllDrivers,
    registerDriver,
    fetchDriverOrders,
    fetchPaymentHistory
  };
};
