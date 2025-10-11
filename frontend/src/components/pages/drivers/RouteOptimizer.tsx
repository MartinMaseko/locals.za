import React, { useState, useEffect } from 'react';
import { openWazeNavigation, convertAddressesToCoordinates } from '../../../utils/wazeHelper';
import './driverStyles.css';
import { getAuth, onAuthStateChanged } from 'firebase/auth';


interface Delivery {
  orderId: string;  
  address: string;  
  customerName: string;  // Changed from customer_name
  status: string;
  coordinates?: {
    lat: number;
    lng: number;
  } | null;
}

const RouteOptimizer: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDeliveries, setSelectedDeliveries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  // First, get the auth token
  useEffect(() => {
    const auth = getAuth();
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const idToken = await user.getIdToken(true);
          setToken(idToken);
          localStorage.setItem('token', idToken); // Update localStorage token
        } catch (error) {
          console.error("Error getting ID token:", error);
          // Fall back to localStorage
          const storedToken = localStorage.getItem('token');
          if (storedToken) {
            setToken(storedToken);
          }
        }
      } else {
        // User is not logged in with Firebase
        // Try to get token from localStorage
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          setToken(storedToken);
        } else {
          setError('Authentication token not found. Please login again.');
        }
      }
    });
    
    return () => unsubscribe();
  }, []);
  
  // Fetch assigned deliveries when token is available
  useEffect(() => {
    if (!token) return;
    
    const fetchDeliveries = async () => {
      setIsLoading(true);
      try {
        // Try the basic deliveries endpoint first - more likely to work without special indexes
        const basicResponse = await fetch('/api/drivers/me/deliveries', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (basicResponse.ok) {
          const data = await basicResponse.json();
          console.log('Fetched basic deliveries:', data);
          
          // Filter out delivered/cancelled orders
          const activeDeliveries = data.filter((delivery: Delivery) => 
            delivery.status !== 'delivered' && delivery.status !== 'cancelled'
          );
          
          setDeliveries(activeDeliveries);
          setError(null);
          
          // Even though we got basic deliveries, try to get the ones with coordinates
          // but don't wait for it or block the UI
          fetchDeliveriesWithCoordinates();
          
          setIsLoading(false);
          return;
        }
        
        // If basic endpoint fails, try the coordinates endpoint
        await fetchDeliveriesWithCoordinates();
        
      } catch (error) {
        console.error('Error fetching deliveries:', error);
        setError('Failed to fetch deliveries. Please try again later.');
        setIsLoading(false);
      }
    };
    
    const fetchDeliveriesWithCoordinates = async () => {
      try {
        const response = await fetch('/api/drivers/me/deliveries/coordinates', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          if (response.status === 403) {
            setError('You are not authorized to access this data. Please login again.');
          } else if (response.status === 400 || response.status === 500) {
            console.error(`Coordinates endpoint failed: ${response.status}. This is likely due to a missing Firestore index.`);
            // Don't set error here as we'll try the fallback
          } else {
            setError(`Failed to fetch deliveries: ${response.status}`);
          }
          return;
        }
        
        const data = await response.json();
        console.log('Fetched deliveries with coordinates:', data);
        
        setDeliveries(data); // This endpoint already filters out delivered/cancelled
        setError(null);
      } catch (error: any) {
        // Check if the error is related to Firestore indexes
        if (error.message?.includes('FAILED_PRECONDITION') || 
            error.message?.includes('requires an index') || 
            error.message?.includes('index.html?create_composite')) {
          console.error('Missing Firestore index. Please create the required index:', error);
        } else {
          console.error('Error fetching deliveries with coordinates:', error);
        }
        // Don't set error state here as we've already tried the basic endpoint
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDeliveries();
  }, [token]);
  
  const handleSelectDelivery = (orderId: string) => { // Changed parameter from id to orderId
    if (selectedDeliveries.includes(orderId)) {
      setSelectedDeliveries(selectedDeliveries.filter(item => item !== orderId));
    } else {
      setSelectedDeliveries([...selectedDeliveries, orderId]);
    }
  };
  
  const startNavigation = async () => {
    setIsLoading(true);
    try {
      // Check if we have coordinates available first
      const selectedDeliveryObjects = deliveries.filter(d => selectedDeliveries.includes(d.orderId)); // Changed from d.id
      
      // If any selected delivery has coordinates, use those directly
      const hasCoordinates = selectedDeliveryObjects.some(d => d.coordinates && d.coordinates.lat && d.coordinates.lng);
      
      if (hasCoordinates) {
        // Use stored coordinates for deliveries that have them
        const stopsWithCoordinates = selectedDeliveryObjects.map(d => ({
          name: d.customerName,
          lat: d.coordinates?.lat || 0,
          lng: d.coordinates?.lng || 0
        })).filter(stop => stop.lat !== 0 && stop.lng !== 0);
        
        if (stopsWithCoordinates.length > 0) {
          openWazeNavigation(stopsWithCoordinates);
          setIsLoading(false);
          return;
        }
      }
      
      // Fall back to geocoding addresses if no coordinates are available
      const selectedAddresses = selectedDeliveryObjects.map(d => d.address); // Changed from d.delivery_address
      
      if (selectedAddresses.length === 0) {
        alert('Please select at least one delivery address');
        setIsLoading(false);
        return;
      }
      
      // Convert addresses to coordinates
      const stopsWithCoordinates = await convertAddressesToCoordinates(selectedAddresses);
      
      // Check if we got valid coordinates back
      if (!stopsWithCoordinates || stopsWithCoordinates.length === 0) {
        throw new Error("Failed to convert addresses to coordinates");
      }
      
      // Open Waze with the stops
      openWazeNavigation(stopsWithCoordinates);
    } catch (error) {
      console.error('Failed to start navigation:', error);
      alert('Failed to start navigation. Please try again.');
    }
    setIsLoading(false);
  };
  
  return (
    <div className="route-optimizer">
      <h2>Optimize Delivery Route</h2>
      <p>Select deliveries to include in your route:</p>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="delivery-list">
        {isLoading ? (
          <div className="loading-indicator">Loading deliveries...</div>
        ) : deliveries.length === 0 ? (
          <p>{error ? 'Error loading deliveries' : 'No pending deliveries found'}</p>
        ) : (
          deliveries.map(delivery => (
            <div 
              key={delivery.orderId} // Changed from delivery.id
              className={`delivery-item ${selectedDeliveries.includes(delivery.orderId) ? 'selected' : ''}`}
              onClick={() => handleSelectDelivery(delivery.orderId)}
            >
              <div className="delivery-info">
                <h3>{delivery.customerName}</h3> // Changed from customer_name
                <p>{delivery.address}</p> // Changed from delivery_address
                <span className={`status ${delivery.status}`}>{delivery.status}</span>
                {delivery.coordinates && (
                  <small className="coordinates-badge">
                    Has location data
                  </small>
                )}
              </div>
              <input 
                type="checkbox" 
                checked={selectedDeliveries.includes(delivery.orderId)} // Changed from delivery.id
                onChange={() => {}} // Handled by the div click
              />
            </div>
          ))
        )}
      </div>
      
      <button 
        className="navigation-button" 
        onClick={startNavigation}
        disabled={selectedDeliveries.length === 0 || isLoading}
      >
        {isLoading ? 'Loading...' : `Navigate with Waze (${selectedDeliveries.length})`}
      </button>
      
      <div className="waze-note">
        <p>Note: This will open the Waze app if installed on your device.</p>
      </div>
    </div>
  );
};

export default RouteOptimizer;