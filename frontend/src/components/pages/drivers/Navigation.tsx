import { useState } from 'react';
import { useWazeRoute } from '../../../components/contexts/WazeRouteContext';
import './driverStyles.css';

interface NavigationProps {
  onClose: () => void;
}

const Navigation = ({ onClose }: NavigationProps) => {
  const { addresses, removeAddress } = useWazeRoute();
  const [error, setError] = useState<string>('');
  
  // Function to open Waze with multiple stops
  const openWazeMultiStop = () => {
    if (addresses.length === 0) {
      setError('No addresses added for navigation');
      return;
    }
    
    try {
      // Get the first address with valid coordinates, if any
      const addressWithCoords = addresses.find(addr => 
        addr.coordinates && 
        typeof addr.coordinates.lat === 'number' && 
        typeof addr.coordinates.lng === 'number'
      );

      // Format all addresses for the URL
      const formattedAddresses = addresses.map(addr => encodeURIComponent(addr.address)).join(',');
      
      // Build Waze URLs - for both app and web
      // Try to use coordinates if available, otherwise just use text addresses
      let wazeAppUrl = 'waze://?navigate=yes';
      let wazeWebUrl = 'https://www.waze.com/ul?navigate=yes';
      
      // If we have coordinates for at least the first address
      if (addressWithCoords?.coordinates?.lat && addressWithCoords?.coordinates?.lng) {
        // Add coordinates
        wazeAppUrl += `&ll=${addressWithCoords.coordinates.lat},${addressWithCoords.coordinates.lng}&z=10`;
        wazeWebUrl += `&ll=${addressWithCoords.coordinates.lat},${addressWithCoords.coordinates.lng}&z=10`;
      }
      
      // Add addresses to both URLs
      if (addresses.length > 1) {
        // For multiple addresses
        wazeAppUrl += `&q=${formattedAddresses}`;
        wazeWebUrl += `&q=${formattedAddresses}`;
      } else if (addresses.length === 1) {
        // For single address
        wazeAppUrl += `&q=${encodeURIComponent(addresses[0].address)}`;
        wazeWebUrl += `&q=${encodeURIComponent(addresses[0].address)}`;
      }
      
      // First try to open Waze app
      console.log("Attempting to open Waze app with URL:", wazeAppUrl);
      
      // Create a hidden iframe to try opening the app URL
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = wazeAppUrl;
      document.body.appendChild(iframe);
      
      // Set a timeout to remove the iframe and open the web version as fallback
      setTimeout(() => {
        document.body.removeChild(iframe);
        
        // Open the web version in a new tab
        console.log("Opening Waze web version:", wazeWebUrl);
        window.open(wazeWebUrl, '_blank');
      }, 1000); // 1 second should be enough to see if the app opens
      
    } catch (error) {
      console.error('Error opening Waze:', error);
      setError('Failed to open Waze. Please try again or open Waze manually.');
      
      // Always try web version as a fallback
      try {
        const address = encodeURIComponent(addresses[0].address);
        window.open(`https://www.waze.com/ul?q=${address}&navigate=yes`, '_blank');
      } catch (e) {
        console.error('Failed to open web fallback:', e);
      }
    }
  };

  return (
    <div className="navigation-overlay">
      <div className="navigation-card">
        <div className="navigation-header">
          <h2>Route Planning</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="saved-addresses">
          <h3>Delivery Stops ({addresses.length})</h3>
          
          {addresses.length === 0 ? (
            <div className="no-addresses">
              <p>No delivery addresses added yet.</p>
              <p>Add addresses from order details to create a route.</p>
            </div>
          ) : (
            <div className="address-list">
              {addresses.map((address) => (
                <div key={address.id} className="address-item">
                  <div className="address-info">
                    <div className="address-customer">{address.name}</div>
                    <div className="address-text">{address.address}</div>
                  </div>
                  <button 
                    className="remove-address-btn"
                    onClick={() => removeAddress(address.id)}
                    aria-label="Remove address"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="navigation-error">
            <p>{error}</p>
          </div>
        )}

        <div className="navigation-actions">
          <button 
            className="waze-navigation-btn"
            onClick={openWazeMultiStop}
            disabled={addresses.length === 0}
          >
            <img 
              src="https://img.icons8.com/color/24/000000/waze.png" 
              alt="Waze"
              className="waze-icon" 
            />
            Navigate with Waze
          </button>
        </div>
        
        <div className="waze-note">
          <p>Note: This will open the Waze app if installed, otherwise it will open in your browser.</p>
          <p>Waze supports up to 10 stops in a single route.</p>
        </div>
      </div>
    </div>
  );
};

export default Navigation;