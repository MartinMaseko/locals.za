import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Cashout API service for managing payment requests
 */
export const cashoutService = {
  /**
   * Fetch all cashout requests
   */
  fetchCashoutRequests: async (token: string): Promise<any[]> => {
    try {
      const { data } = await axios.get(`${API_URL}/api/admin/cashouts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return Array.isArray(data) ? data : [];
    } catch (err: any) {
      console.error('Error fetching cashout requests:', err);
      throw new Error(err?.response?.data?.error || err?.message || 'Failed to load cashout requests');
    }
  },

  /**
   * Process a driver payment
   */
  processPayment: async (token: string, cashoutId: string) => {
    return axios.put(`${API_URL}/api/admin/cashouts/${cashoutId}/complete`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};
