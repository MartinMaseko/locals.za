import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from './firebaseClient';
import LogoAnime from '../components/assets/logos/locals-svg.gif';
const AuthContext = createContext({
    currentUser: null,
    userLoading: true,
    accessToken: null,
    refreshUserToken: async () => null,
});
// Hook for easy context use
export const useAuth = () => useContext(AuthContext);
export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userLoading, setUserLoading] = useState(true);
    const [accessToken, setAccessToken] = useState(null);
    // Add this function to force token refresh when needed
    const refreshUserToken = async () => {
        if (!auth.currentUser)
            return null;
        try {
            const newToken = await auth.currentUser.getIdToken(true);
            setAccessToken(newToken);
            sessionStorage.setItem('authToken', newToken);
            localStorage.setItem('authTokenTimestamp', Date.now().toString());
            return newToken;
        }
        catch (error) {
            console.error("Failed to refresh token:", error);
            return null;
        }
    };
    // Check for authentication in localStorage on mount
    useEffect(() => {
        // Try to restore session from IndexedDB (Firebase's persistence storage)
        const checkPersistedAuth = async () => {
            // This will trigger onAuthStateChanged if persistence data exists
            await auth.authStateReady();
        };
        checkPersistedAuth();
    }, []);
    useEffect(() => {
        // This listener persists across page refreshes as long as the token is valid
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            setCurrentUser(user);
            if (user) {
                try {
                    // Get fresh token
                    const token = await user.getIdToken(true);
                    setAccessToken(token);
                    // Store in both sessionStorage and localStorage (timestamp)
                    sessionStorage.setItem('authToken', token);
                    localStorage.setItem('authTokenTimestamp', Date.now().toString());
                }
                catch (error) {
                    console.error("Error getting token:", error);
                    sessionStorage.removeItem('authToken');
                    localStorage.removeItem('authTokenTimestamp');
                }
            }
            else {
                setAccessToken(null);
                sessionStorage.removeItem('authToken');
                localStorage.removeItem('authTokenTimestamp');
            }
            setUserLoading(false);
        });
        // Cleanup subscription
        return unsubscribe;
    }, []);
    // Add token refresh mechanism on tab focus
    useEffect(() => {
        const handleFocus = async () => {
            if (auth.currentUser) {
                const timestampStr = localStorage.getItem('authTokenTimestamp');
                if (timestampStr) {
                    const timestamp = parseInt(timestampStr, 10);
                    const now = Date.now();
                    // If token is more than 30 minutes old, refresh it
                    if (now - timestamp > 30 * 60 * 1000) {
                        await refreshUserToken();
                    }
                }
            }
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);
    // Show loading state
    if (userLoading) {
        return (_jsxs("div", { className: 'loading-container', children: [_jsx("img", { src: LogoAnime, alt: "Loading...", className: "loading-gif" }), "Loading..."] }));
    }
    return (_jsx(AuthContext.Provider, { value: {
            currentUser,
            userLoading,
            accessToken,
            refreshUserToken
        }, children: children }));
};
