import { useState, useCallback } from 'react';
import { discountService } from '../services/discountService';

export const useDiscounts = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discountsByDate, setDiscountsByDate] = useState<Record<string, any>>({});
  const [customerDiscount, setCustomerDiscount] = useState({
    availableDiscount: 0,
    totalEarned: 0,
    totalUsed: 0
  });

  const savePaidPrice = useCallback(async (
    date: string,
    productId: string,
    paidPrice: number,
    unitPrice: number,
    totalQty: number
  ) => {
    setLoading(true);
    setError(null);
    try {
      const result = await discountService.savePaidPrice(date, productId, paidPrice, unitPrice, totalQty) as any;
      
      // Update local state
      setDiscountsByDate(prev => ({
        ...prev,
        [date]: {
          ...prev[date],
          [productId]: result.data
        }
      }));
      
      return result;
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Failed to save paid price';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDiscountsByDate = useCallback(async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const discounts = await discountService.getDiscountsByDate(date);
      setDiscountsByDate(prev => ({
        ...prev,
        [date]: discounts
      }));
      return discounts;
    } catch (err: any) {
      // Return empty object if no discounts found (404 is expected)
      if (err?.response?.status === 404) {
        setDiscountsByDate(prev => ({
          ...prev,
          [date]: {}
        }));
        return {};
      }
      const errorMsg = err?.response?.data?.message || 'Failed to fetch discounts';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCustomerDiscount = useCallback(async (userId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const discount = await discountService.getCustomerDiscount(userId) as { availableDiscount: number; totalEarned: number; totalUsed: number; };
      setCustomerDiscount(discount);
      return discount;
    } catch (err: any) {
      console.error('Failed to fetch customer discount:', err);
      console.error('Error response:', err?.response);
      console.error('Error status:', err?.response?.status);
      console.error('Error data:', err?.response?.data);
      // Set default values if fetch fails
      setCustomerDiscount({
        availableDiscount: 0,
        totalEarned: 0,
        totalUsed: 0
      });
      return {
        availableDiscount: 0,
        totalEarned: 0,
        totalUsed: 0
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const applyDiscount = useCallback(async (orderId: string, discountAmount: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await discountService.applyDiscountToOrder(orderId, discountAmount) as { remainingDiscount: number; [key: string]: any };
      
      // Update local customer discount state
      setCustomerDiscount(prev => ({
        ...prev,
        availableDiscount: result.remainingDiscount,
        totalUsed: prev.totalUsed + discountAmount
      }));
      
      return result;
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Failed to apply discount';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    discountsByDate,
    customerDiscount,
    savePaidPrice,
    fetchDiscountsByDate,
    fetchCustomerDiscount,
    applyDiscount
  };
};
