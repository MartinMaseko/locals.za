/**
 * Opens Waze with the specified coordinates for navigation
 * @param stops Array of coordinates to navigate to
 */
export const openWazeNavigation = (stops) => {
    if (!stops || stops.length === 0) {
        throw new Error('No valid stops provided');
    }
    try {
        // Get the first stop as the starting point
        const firstStop = stops[0];
        // Waze URLs
        let wazeWebUrl = `https://www.waze.com/ul?ll=${firstStop.lat},${firstStop.lng}&navigate=yes`;
        let wazeAppUrl = `waze://?ll=${firstStop.lat},${firstStop.lng}&navigate=yes`;
        // For multiple stops, try adding them as a query parameter
        if (stops.length > 1) {
            // Format for multiple stops (though Waze may not fully support this)
            const additionalStops = stops.slice(1).map(stop => `${stop.lat},${stop.lng}`).join(',');
            // Add additional parameters
            wazeWebUrl += `&stops=${additionalStops}&z=10&from=locals-za-app`;
            wazeAppUrl += `&stops=${additionalStops}&z=10&from=locals-za-app`;
        }
        console.log('Opening Waze with URL:', wazeAppUrl);
        // Try to open the Waze app first using a hidden iframe
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = wazeAppUrl;
        document.body.appendChild(iframe);
        // Set a timeout to open the web version if the app doesn't open
        setTimeout(() => {
            document.body.removeChild(iframe);
            window.open(wazeWebUrl, '_blank');
        }, 1000);
    }
    catch (error) {
        console.error('Error opening Waze:', error);
        // Fallback to opening the web version
        const firstStop = stops[0];
        window.open(`https://www.waze.com/ul?ll=${firstStop.lat},${firstStop.lng}&navigate=yes`, '_blank');
    }
};
/**
 * Converts addresses to coordinates using Google Maps Geocoding API
 * @param addresses Array of addresses to convert
 * @returns Array of coordinates
 */
export const convertAddressesToCoordinates = async (addresses) => {
    if (!addresses || addresses.length === 0) {
        return [];
    }
    const apiKey = import.meta.env.VITE_APP_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.error('Google Maps API key is missing');
        return [];
    }
    try {
        const results = await Promise.all(addresses.map(async (address) => {
            const encodedAddress = encodeURIComponent(address);
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.status === 'OK' && data.results && data.results.length > 0) {
                const location = data.results[0].geometry.location;
                return {
                    name: address,
                    lat: location.lat,
                    lng: location.lng
                };
            }
            return null;
        }));
        // Filter out any failed geocoding results
        return results.filter((result) => result !== null);
    }
    catch (error) {
        console.error('Error converting addresses to coordinates:', error);
        return [];
    }
};
/**
 * Checks if Waze app is installed on the device
 * This is a best effort check as it's not 100% reliable
 * @returns Promise that resolves to boolean
 */
export const isWazeInstalled = async () => {
    return new Promise((resolve) => {
        // Create hidden iframe to attempt opening Waze
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = 'waze://';
        document.body.appendChild(iframe);
        // Set a timeout to check if we're still on the page
        const timeout = setTimeout(() => {
            document.body.removeChild(iframe);
            resolve(false); // Waze not installed or couldn't be opened
        }, 500);
        // If the page is about to unload, Waze might be opening
        window.addEventListener('beforeunload', () => {
            clearTimeout(timeout);
            resolve(true);
        }, { once: true });
    });
};
