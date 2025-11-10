import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useWazeRoute } from '../../../components/contexts/WazeRouteContext';
import './driverStyles.css';
const Navigation = ({ onClose }) => {
    const { addresses, removeAddress } = useWazeRoute();
    const [error, setError] = useState('');
    // Function to open Waze with multiple stops
    const openWazeMultiStop = () => {
        if (addresses.length === 0) {
            setError('No addresses added for navigation');
            return;
        }
        try {
            // Get the first address with valid coordinates, if any
            const addressWithCoords = addresses.find(addr => addr.coordinates &&
                typeof addr.coordinates.lat === 'number' &&
                typeof addr.coordinates.lng === 'number');
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
            }
            else if (addresses.length === 1) {
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
        }
        catch (error) {
            console.error('Error opening Waze:', error);
            setError('Failed to open Waze. Please try again or open Waze manually.');
            // Always try web version as a fallback
            try {
                const address = encodeURIComponent(addresses[0].address);
                window.open(`https://www.waze.com/ul?q=${address}&navigate=yes`, '_blank');
            }
            catch (e) {
                console.error('Failed to open web fallback:', e);
            }
        }
    };
    return (_jsx("div", { className: "navigation-overlay", children: _jsxs("div", { className: "navigation-card", children: [_jsxs("div", { className: "navigation-header", children: [_jsx("h2", { children: "Route Planning" }), _jsx("button", { className: "close-btn", onClick: onClose, children: "\u00D7" })] }), _jsxs("div", { className: "saved-addresses", children: [_jsxs("h3", { children: ["Delivery Stops (", addresses.length, ")"] }), addresses.length === 0 ? (_jsxs("div", { className: "no-addresses", children: [_jsx("p", { children: "No delivery addresses added yet." }), _jsx("p", { children: "Add addresses from order details to create a route." })] })) : (_jsx("div", { className: "address-list", children: addresses.map((address) => (_jsxs("div", { className: "address-item", children: [_jsxs("div", { className: "address-info", children: [_jsx("div", { className: "address-customer", children: address.name }), _jsx("div", { className: "address-text", children: address.address })] }), _jsx("button", { className: "remove-address-btn", onClick: () => removeAddress(address.id), "aria-label": "Remove address", children: "\u00D7" })] }, address.id))) }))] }), error && (_jsx("div", { className: "navigation-error", children: _jsx("p", { children: error }) })), _jsx("div", { className: "navigation-actions", children: _jsxs("button", { className: "waze-navigation-btn", onClick: openWazeMultiStop, disabled: addresses.length === 0, children: [_jsx("img", { src: "https://img.icons8.com/color/24/000000/waze.png", alt: "Waze", className: "waze-icon" }), "Navigate with Waze"] }) }), _jsxs("div", { className: "waze-note", children: [_jsx("p", { children: "Note: This will open the Waze app if installed, otherwise it will open in your browser." }), _jsx("p", { children: "Waze supports up to 10 stops in a single route." })] })] }) }));
};
export default Navigation;
