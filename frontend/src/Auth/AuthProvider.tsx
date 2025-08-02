import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getSession } from './authService';
import supabase from './authService';
import axios from 'axios';

// Define what our Auth context will provide
interface AuthContextType {
  currentUser: any;
  isLoading: boolean;
}

// Define the props for our AuthProvider (children components)
interface AuthProviderProps {
  children: ReactNode;
}

// Create the Auth context
const AuthContext = createContext<AuthContextType | null>(null);

// The AuthProvider wraps the app and provides auth state
export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Store the current user and loading state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Checks if the user is logged in and fetches their profile
    const fetchProfile = async () => {
      setIsLoading(true);
      // Get the current Supabase session
      const { data: { session } } = await getSession();
      if (session) {
        // If logged in, get the JWT token
        const token = session.access_token;
        // Fetch the full user profile from your backend
        const { data: profile } = await axios.get('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Combine Supabase user and backend profile
        setCurrentUser({ ...session.user, ...(profile || {}) });
      } else {
        // If not logged in, set user to null
        setCurrentUser(null);
      }
      setIsLoading(false);
    };
    // Run the profile fetch on mount
    fetchProfile();
    // Listen for auth state changes (login/logout) and refetch profile
    const { data: listener } = supabase.auth.onAuthStateChange(fetchProfile);
    // Clean up the listener when the component unmounts
    return () => { listener?.subscription.unsubscribe(); };
  }, []);

  // Provide the currentUser and isLoading state to the rest of the app
  return (
    <AuthContext.Provider value={{ currentUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the Auth context in other components
export const useAuth = () => useContext(AuthContext);