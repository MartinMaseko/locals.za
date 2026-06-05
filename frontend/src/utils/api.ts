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

    // Command Centre login stores token in localStorage; regular Firebase login uses sessionStorage.
    // When a command centre session is active, always prefer the localStorage commandadmin token
    // so a stale Firebase token in sessionStorage doesn't shadow it.
    const isCommandCentre = localStorage.getItem('commandCentreAuth') === 'true';
    const token = isCommandCentre
      ? localStorage.getItem('authToken')
      : (sessionStorage.getItem('authToken') || localStorage.getItem('authToken'));
    
    // Add token to request header
    if (token) {
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