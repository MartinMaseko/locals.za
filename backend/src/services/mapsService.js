const axios = require('axios');

/**
 * Maps service for handling Google Maps API operations
 */
class MapsService {
  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
  }

  /**
   * Get directions and ETA information
   */
  async getDirections(originLat, originLng, destLat, destLng, mode = 'driving') {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&mode=${mode}&key=${this.apiKey}`
      );
      
      return response.data;
    } catch (error) {
      console.error('Error fetching directions from Google Maps API:', error);
      throw new Error('Failed to fetch directions');
    }
  }

  /**
   * Geocode an address to get coordinates
   */
  async geocodeAddress(address) {
    try {
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`
      );
      
      return response.data;
    } catch (error) {
      console.error('Error geocoding address with Google Maps API:', error);
      throw new Error('Failed to geocode address');
    }
  }
}

module.exports = new MapsService();