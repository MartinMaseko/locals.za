import { useState, useEffect } from 'react';

interface NavigationProps {
  address: string;
  destinationLat?: number;
  destinationLng?: number;
  onClose: () => void;
  onETAUpdate?: (eta: string, arrivalTime?: string) => void;
}

const Navigation = ({ address, destinationLat, destinationLng, onClose, onETAUpdate }: NavigationProps) => {
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [eta, setEta] = useState<string>('Calculating...');
  const [distance, setDistance] = useState<string>('Calculating...');
  const [error, setError] = useState<string>('');
  const [isLocationReady, setIsLocationReady] = useState<boolean>(false);

  // Get current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLat(position.coords.latitude);
          setCurrentLng(position.coords.longitude);
          setIsLocationReady(true);
        },
        (err) => {
          setError(`Error accessing location: ${err.message}`);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
    }
  }, []);

  // Calculate ETA when we have both current and destination coordinates
  useEffect(() => {
    const calculateRoute = async () => {
      // If we have coordinates directly, use them
      if (currentLat && currentLng && destinationLat && destinationLng) {
        try {
          // Calculate a reasonable ETA based on straight-line distance
          const estimatedEta = calculateSimulatedETA(
            currentLat, 
            currentLng, 
            destinationLat, 
            destinationLng
          );
          
          // Also calculate the actual arrival time (not just duration)
          const arrivalTime = calculateArrivalTime(estimatedEta);
          
          setEta(estimatedEta);
          
          // Calculate approximate distance
          const estimatedDistance = calculateSimulatedDistance(
            currentLat, 
            currentLng, 
            destinationLat, 
            destinationLng
          );
          
          setDistance(estimatedDistance);
          
          // Call the callback if provided with both ETA duration and arrival time
          if (onETAUpdate) {
            onETAUpdate(estimatedEta, arrivalTime);
          }
        } catch (error) {
          console.error("Error calculating route:", error);
          setError("Couldn't calculate ETA");
        }
      } 
      // If we only have an address string, use an estimate
      else if (currentLat && currentLng && address) {
        // Set a default ETA for address-based navigation
        setEta('~20-30 min');
        setDistance('Distance unavailable');
        
        if (onETAUpdate) {
          onETAUpdate('~20-30 min');
        }
      }
    };

    if (isLocationReady) {
      calculateRoute();
    }
  }, [currentLat, currentLng, destinationLat, destinationLng, address, onETAUpdate, isLocationReady]);

  // Helper functions for simulated ETA and distance
  const calculateSimulatedETA = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    // Calculate the distance in km
    const distance = calculateHaversineDistance(lat1, lon1, lat2, lon2);
    
    // Assume average speed of 40 km/h in city
    const timeInHours = distance / 40;
    const timeInMinutes = Math.round(timeInHours * 60);
    
    // Format the ETA
    if (timeInMinutes < 60) {
      return `~${timeInMinutes} min`;
    } else {
      const hours = Math.floor(timeInMinutes / 60);
      const mins = timeInMinutes % 60;
      return `~${hours} h ${mins} min`;
    }
  };

  const calculateSimulatedDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const distance = calculateHaversineDistance(lat1, lon1, lat2, lon2);
    return `~${distance.toFixed(1)} km`;
  };

  // Haversine formula to calculate distance between two coordinates
  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Function to open Google Maps
  const openGoogleMaps = () => {
    let mapsUrl = '';
    
    if (currentLat && currentLng) {
      // Use coordinates if available
      if (destinationLat && destinationLng) {
        mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${currentLat},${currentLng}&destination=${destinationLat},${destinationLng}&travelmode=driving`;
      } else {
        // Use address string
        mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${currentLat},${currentLng}&destination=${encodeURIComponent(address)}&travelmode=driving`;
      }
    } else {
      // Fallback if no current location
      mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`;
    }
    
    window.open(mapsUrl, '_blank');
  };

  // Add this helper function to the component
  const calculateArrivalTime = (etaString: string): string => {
    // Extract minutes from the ETA string (e.g., "~30 min" -> 30)
    let minutes = 0;
    
    // Handle both formats: "~30 min" and "~1 h 25 min"
    if (etaString.includes('h')) {
      // Extract hours and minutes
      const hourMatch = etaString.match(/~(\d+)\s*h/);
      const minuteMatch = etaString.match(/(\d+)\s*min/);
      
      if (hourMatch) {
        minutes += parseInt(hourMatch[1]) * 60;
      }
      if (minuteMatch) {
        minutes += parseInt(minuteMatch[1]);
      }
    } else {
      // Just minutes
      const minuteMatch = etaString.match(/~(\d+)\s*min/);
      if (minuteMatch) {
        minutes = parseInt(minuteMatch[1]);
      }
    }
    
    // Calculate arrival time
    const now = new Date();
    const arrivalTime = new Date(now.getTime() + minutes * 60000);
    
    // Format as HH:MM
    return arrivalTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="navigation-overlay">
      <div className="navigation-card">
        <div className="navigation-header">
          <h2>Navigation</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="delivery-address">
          <h3>Destination:</h3>
          <p>{address}</p>
        </div>
        
        <div className="eta-info">
          <div className="eta-item">
            <div className="eta-icon">
              <img width="24" height="24" src="https://img.icons8.com/ios-filled/24/ffb803/time_2.png" alt="time_2"/>
            </div>
            <div className="eta-content">
              <span className="eta-label">Estimated Time:</span>
              <span className="eta-value">{eta}</span>
            </div>
          </div>
          <div className="eta-item">
            <div className="eta-icon">
              <img width="24" height="24" src="https://img.icons8.com/ios-filled/24/ffb803/place-marker.png" alt="place-marker"/>
            </div>
            <div className="eta-content">
              <span className="eta-label">Estimated Distance:</span>
              <span className="eta-value">{distance}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="location-error">
            <p>{error}</p>
            <p>Please allow location access to get accurate directions</p>
          </div>
        )}

        <div className="navigation-actions">
          <button 
            className="open-in-maps-btn"
            onClick={openGoogleMaps}
            disabled={!isLocationReady && !destinationLat}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#FFFFFF">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            Navigate with Google Maps
          </button>
        </div>
      </div>
    </div>
  );
}

export default Navigation;