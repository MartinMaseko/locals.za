import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface DeliveryAddress {
  id: string; // Order ID
  name: string; // Customer name
  address: string; // Full address string
  coordinates?: {
    lat?: number;
    lng?: number;
  };
}

interface WazeRouteContextType {
  addresses: DeliveryAddress[];
  addAddress: (address: DeliveryAddress) => void;
  removeAddress: (id: string) => void;
  clearAddresses: () => void;
  hasAddress: (id: string) => boolean;
}

const WazeRouteContext = createContext<WazeRouteContextType | undefined>(undefined);

export const WazeRouteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);

  const addAddress = (address: DeliveryAddress) => {
    setAddresses(prev => {
      // Don't add if already exists
      if (prev.some(a => a.id === address.id)) {
        return prev;
      }
      return [...prev, address];
    });
  };

  const removeAddress = (id: string) => {
    setAddresses(prev => prev.filter(address => address.id !== id));
  };

  const clearAddresses = () => {
    setAddresses([]);
  };

  const hasAddress = (id: string) => {
    return addresses.some(address => address.id === id);
  };

  return (
    <WazeRouteContext.Provider value={{ 
      addresses, 
      addAddress, 
      removeAddress, 
      clearAddresses,
      hasAddress
    }}>
      {children}
    </WazeRouteContext.Provider>
  );
};

export const useWazeRoute = () => {
  const context = useContext(WazeRouteContext);
  if (context === undefined) {
    throw new Error('useWazeRoute must be used within a WazeRouteProvider');
  }
  return context;
};