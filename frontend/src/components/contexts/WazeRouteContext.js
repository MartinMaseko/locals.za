import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useState } from 'react';
const WazeRouteContext = createContext(undefined);
export const WazeRouteProvider = ({ children }) => {
    const [addresses, setAddresses] = useState([]);
    const addAddress = (address) => {
        setAddresses(prev => {
            // Don't add if already exists
            if (prev.some(a => a.id === address.id)) {
                return prev;
            }
            return [...prev, address];
        });
    };
    const removeAddress = (id) => {
        setAddresses(prev => prev.filter(address => address.id !== id));
    };
    const clearAddresses = () => {
        setAddresses([]);
    };
    const hasAddress = (id) => {
        return addresses.some(address => address.id === id);
    };
    return (_jsx(WazeRouteContext.Provider, { value: {
            addresses,
            addAddress,
            removeAddress,
            clearAddresses,
            hasAddress
        }, children: children }));
};
export const useWazeRoute = () => {
    const context = useContext(WazeRouteContext);
    if (context === undefined) {
        throw new Error('useWazeRoute must be used within a WazeRouteProvider');
    }
    return context;
};
