import axios from 'axios';
import { getAuth } from 'firebase/auth';

const API_URL = import.meta.env.VITE_API_URL;

const getAuthToken = async () => {
  const auth = getAuth();
  const user = auth.currentUser;
  return user ? await user.getIdToken() : null;
};

export const discountService = {
  // Save paid price for a product
  async savePaidPrice(date: string, productId: string, paidPrice: number, unitPrice: number, totalQty: number) {
    const token = await getAuthToken();
    const payload = { date, productId, paidPrice, unitPrice, totalQty };
    
    try {
      const response = await axios.post(
        `${API_URL}/api/discounts/paid-price`,
        payload,
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 30000
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Error saving paid price:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get customer's available discount
  async getCustomerDiscount(userId?: string) {
    const token = await getAuthToken();
    const endpoint = userId 
      ? `${API_URL}/api/discounts/customer/${userId}`
      : `${API_URL}/api/discounts/customer`;
    
    const response = await axios.get(endpoint, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // Apply discount to order
  async applyDiscountToOrder(orderId: string, discountAmount: number) {
    const token = await getAuthToken();
    const response = await axios.post(
      `${API_URL}/api/discounts/apply`,
      { orderId, discountAmount },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  // Get discount analytics
  async getDiscountAnalytics(startDate?: string, endDate?: string) {
    const token = await getAuthToken();
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await axios.get(
      `${API_URL}/api/discounts/analytics?${params.toString()}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  // Get discounts by date (for procurement section)
  async getDiscountsByDate(date: string) {
    const token = await getAuthToken();
    const response = await axios.get(
      `${API_URL}/api/discounts/by-date/${date}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  }
};
