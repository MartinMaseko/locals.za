import { useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '../../../../Auth/firebaseClient';

// Token cache using a closure to maintain state across renders
let tokenCache = { 
  token: null as string | null, 
  expiryTime: 0, 
  refreshPromise: null as Promise<string> | null 
};

/**
 * Custom hook for managing Firebase authentication tokens
 * Implements token caching and automatic refresh
 */
export const useTokenManagement = () => {
  const getToken = useCallback(async () => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) throw new Error('Authentication required');
    
    const now = Date.now();
    
    // Return cached token if still valid (with 5 minute buffer)
    if (tokenCache.token && tokenCache.expiryTime > now + 300000) {
      return tokenCache.token;
    }
    
    // If token refresh is already in progress, wait for it
    if (tokenCache.refreshPromise) {
      return tokenCache.refreshPromise;
    }
    
    // Start new token refresh
    tokenCache.refreshPromise = user.getIdToken(true).then(token => {
      tokenCache.token = token;
      tokenCache.expiryTime = now + 3600000;
      tokenCache.refreshPromise = null;
      return token;
    }).catch(error => {
      tokenCache.refreshPromise = null;
      throw error;
    });
    
    return tokenCache.refreshPromise;
  }, []);

  return { getToken };
};
