import axios from 'axios';
import { getAuthToken } from '../Auth/authService';

// Create axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token to all requests
api.interceptors.request.use(
  (config) => {
    // For auth endpoints, don't need token
    if (config.url?.includes('/auth/')) {
      return config;
    }

    // Get token from session storage directly to avoid async operation
    const token = sessionStorage.getItem('authToken');
    
    // Add token to request header
    if (token) {
      // Make sure headers object exists
      if (!config.headers) {
        config.headers = {};
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.config) {
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    
    // Type guard to check if _retry property exists
    if (
      error.response?.status === 401 && 
      !('_retry' in originalRequest) // Check if property doesn't exist
    ) {
      // Add _retry property
      Object.defineProperty(originalRequest, '_retry', {
        value: true,
        writable: true,
        enumerable: true,
      });
      
      // Get a fresh token and retry (use Promise chain instead of async/await)
      return getAuthToken().then(token => {
        if (token) {
          // Retry with new token
          if (!originalRequest.headers) {
            originalRequest.headers = {};
          }
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
        return Promise.reject(error);
      }).catch(() => {
        return Promise.reject(error);
      });
    }
    
    return Promise.reject(error);
  }
);

export default api;