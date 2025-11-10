const crypto = require('crypto');
const axios = require('axios');
const admin = require('../../firebase');
require('dotenv').config();

/**
 * PayFast Service - Handles all PayFast payment operations
 * 
 * Integration based on PayFast documentation:
 * https://developers.payfast.co.za/docs
 */
class PayfastService {
  constructor() {
    // Load configuration from environment variables
    this.config = {
      merchantId: process.env.PAYFAST_MERCHANT_ID,
      merchantKey: process.env.PAYFAST_MERCHANT_KEY,
      passphrase: process.env.PAYFAST_PASSPHRASE || '',
      returnUrl: process.env.PAYFAST_RETURN_URL,
      cancelUrl: process.env.PAYFAST_CANCEL_URL,
      notifyUrl: process.env.PAYFAST_NOTIFY_URL,
      testMode: false, // Set to production mode
      
      // URLs for sandbox and production environments
      sandboxUrl: 'https://sandbox.payfast.co.za/eng/process',
      productionUrl: 'https://www.payfast.co.za/eng/process',
      
      // Validation URLs
      validateUrlSandbox: 'https://sandbox.payfast.co.za/eng/query/validate',
      validateUrlProduction: 'https://www.payfast.co.za/eng/query/validate'
    };
    
    console.log(`PayFast initialized in ${this.config.testMode ? 'SANDBOX' : 'PRODUCTION'} mode`);
    console.log(`Merchant ID: ${this.config.merchantId}, Merchant Key: ${this.config.merchantKey}`);
    console.log(`Using passphrase: ${this.config.passphrase ? 'Yes' : 'No'}`);
  }
  
  /**
   * Creates a payment request for an order
   * 
   * @param {Object} orderData - The order data from Firestore
   * @param {String} orderId - The order ID
   * @param {String} userId - The user ID (customer)
   * @returns {Object} Payment details including URL and form data
   */
  createPaymentRequest(orderData, orderId, userId) {
    try {
      // Extract customer name from delivery address
      const fullName = orderData.deliveryAddress?.name || 'Customer';
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      // Ensure we have a valid email
      const email = orderData.email || 
        (userId && userId.includes('@') ? userId : `${userId || 'guest'}@locals-za.co.za`);
      
      // Format amount with exactly 2 decimal places
      const amount = parseFloat(orderData.total).toFixed(2);
      
      // Create the payment data object with required fields
      // https://developers.payfast.co.za/docs#request_parameters
      const data = {
        // Merchant details
        merchant_id: this.config.merchantId,
        merchant_key: this.config.merchantKey,
        
        // Return URLs
        return_url: `${this.config.returnUrl}/${orderId}`,
        cancel_url: `${this.config.cancelUrl}/${orderId}`,
        notify_url: this.config.notifyUrl,
        
        // Customer details
        name_first: firstName,
        name_last: lastName,
        email_address: email,
        cell_number: orderData.deliveryAddress?.phone || '',
        
        // Transaction details
        m_payment_id: orderId,
        amount: amount,
        item_name: `LocalsZA Order #${orderId.slice(-6)}`,
        
        // Custom fields for additional data
        custom_str1: userId || '',
        custom_str2: 'web_order',
      };
      
      // Add optional fields only if they have values
      if (orderData.items && orderData.items.length) {
        data.item_description = `Order with ${orderData.items.length} items`;
      }
      
      if (orderData.deliveryAddress?.addressLine) {
        data.custom_str3 = orderData.deliveryAddress.addressLine;
      }
      
      // Add test mode flag if in sandbox mode - must be present BEFORE signature generation
      if (this.config.testMode) {
        data.testing = 'true';
      }

      // --- NORMALIZE/TRIM ALL VALUES BEFORE SIGNING ---
      const normalized = {};
      Object.keys(data).sort().forEach((key) => {
        const v = data[key];
        if (typeof v === 'string') {
          // trim and normalize unicode to a consistent form (NFKC)
          normalized[key] = v.trim().normalize ? v.trim().normalize('NFKC') : v.trim();
        } else if (v === undefined || v === null) {
          normalized[key] = '';
        } else {
          normalized[key] = v;
        }
      });

      // Generate signature using the normalized data
      const signature = this.generateSignature(normalized);
      normalized.signature = signature;

      // Determine the correct payment URL (sandbox or production)
      const paymentUrl = this.config.testMode ? this.config.sandboxUrl : this.config.productionUrl;

      // Return the payment details using the normalized object
      return {
        formData: normalized,
        url: paymentUrl,
        fullUrl: this.buildFullUrl(paymentUrl, normalized)
      };
    } catch (error) {
      console.error('Error creating PayFast payment request:', error);
      throw new Error('Failed to create payment request');
    }
  }
  
  /**
   * Generate MD5 signature for request data - Using PayFast's exact algorithm
   * 
   * @param {Object} data - The payment data
   * @returns {String} MD5 signature
   */
  generateSignature(data) {
    try {
      // Create parameter string
      let pfOutput = "";
      
      // Get the keys and sort them
      const keys = Object.keys(data).sort();
      
      // Build the parameter string exactly as PayFast expects
      for (let key of keys) {
        if (data.hasOwnProperty(key)) {
          if (data[key] !== "" && data[key] !== undefined && data[key] !== null) {
            pfOutput += `${key}=${encodeURIComponent(String(data[key]).trim()).replace(/%20/g, "+")}&`;
          }
        }
      }

      // Remove last ampersand
      let getString = pfOutput.slice(0, -1);
      
      // Add passphrase if it exists
      if (this.config.passphrase !== null && this.config.passphrase !== '') {
        getString += `&passphrase=${encodeURIComponent(this.config.passphrase.trim()).replace(/%20/g, "+")}`;
      }
      
      console.log('Signature string:', getString);
      
      // Generate MD5 hash
      return crypto.createHash("md5").update(getString).digest("hex");
    } catch (error) {
      console.error('Error generating signature:', error);
      throw error;
    }
  }
  
  /**
   * Build full URL with query parameters
   * 
   * @param {String} baseUrl - Base URL
   * @param {Object} data - Query parameters
   * @returns {String} Full URL with query string
   */
  buildFullUrl(baseUrl, data) {
    const encodeRFC1738 = (v) => encodeURIComponent(String(v)).replace(/%20/g, '+');
    const queryString = Object.keys(data)
      .sort()
      .map(key => `${encodeRFC1738(key)}=${encodeRFC1738(data[key] === undefined || data[key] === null ? '' : data[key])}`)
      .join('&');
    
    return `${baseUrl}?${queryString}`;
  }
  
  /**
   * Parse raw ITN data from PayFast
   * 
   * @param {Buffer|String} body - Raw request body
   * @returns {Object} Parsed ITN data
   */
  parseItnData(body) {
    const bodyString = body.toString();
    const data = {};
    
    bodyString.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        data[key] = decodeURIComponent(value.replace(/\+/g, ' '));
      }
    });
    
    return data;
  }
  
  /**
   * Verify signature in ITN data
   * 
   * @param {Object} data - ITN data
   * @param {String} receivedSignature - Signature from ITN
   * @returns {Boolean} Is signature valid
   */
  verifySignature(data, receivedSignature) {
    // Create a copy of the data without the signature
    const paymentData = {...data};
    delete paymentData.signature;
    
    // Generate signature using PayFast's algorithm
    const calculatedSignature = this.generateSignature(paymentData);
    
    console.log('Received signature:', receivedSignature);
    console.log('Calculated signature:', calculatedSignature);
    
    // Compare signatures
    return calculatedSignature === receivedSignature;
  }
  
  /**
   * Validate ITN with PayFast server (security check)
   * 
   * @param {Object} data - ITN data
   * @returns {Promise<Boolean>} Validation result
   */
  async validateWithPayfast(data) {
    try {
      // Only perform validation in production mode
      if (this.config.testMode) {
        console.log('Skipping server validation in test mode');
        return true;
      }
      
      // Get validation URL based on mode
      const validateUrl = this.config.testMode ?
        this.config.validateUrlSandbox :
        this.config.validateUrlProduction;
      
      // Format data for validation request
      const validateData = Object.keys(data)
        .map(key => `${key}=${encodeURIComponent(data[key])}`)
        .join('&');
      
      // Send validation request to PayFast
      const response = await axios.post(validateUrl, validateData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': validateData.length
        },
        timeout: 10000 // 10 second timeout
      });
      
      // Check validation response
      return response.data.trim() === 'VALID';
    } catch (error) {
      console.error('Error validating with PayFast:', error);
      return false;
    }
  }
  
  /**
   * Process ITN (Instant Transaction Notification) from PayFast
   * 
   * @param {Object} data - ITN data
   * @returns {Promise<Object>} Processing result
   */
  async processItn(data) {
    try {
      // Extract signature
      const signature = data.signature;
      
      // Verify signature
      const isSignatureValid = this.verifySignature(data, signature);
      if (!isSignatureValid) {
        console.error('Invalid signature in ITN');
        return { success: false, error: 'Invalid signature' };
      }
      
      // 4. Get order details from Firestore
      const orderId = data.m_payment_id;
      if (!orderId) {
        return { success: false, error: 'No order ID in ITN data' };
      }
      
      const orderRef = admin.firestore().collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();
      
      if (!orderDoc.exists) {
        console.error(`Order ${orderId} not found`);
        return { success: false, error: 'Order not found' };
      }
      
      const orderData = orderDoc.data();
      const userId = orderData.userId || data.custom_str1;
      
      // 5. Store the ITN notification for audit trail
      await admin.firestore().collection('payment_notifications').add({
        orderId,
        paymentData: data,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        environment: this.config.testMode ? 'sandbox' : 'production'
      });
      
      // 6. Process based on payment status
      const paymentStatus = data.payment_status;
      const updateData = {
        paymentData: data,
        paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      switch (paymentStatus) {
        case 'COMPLETE':
          updateData.status = 'pending'; // Change from pending_payment to pending
          updateData.paymentStatus = 'paid';
          updateData.paymentCompleted = true;
          updateData.paymentCompletedAt = admin.firestore.FieldValue.serverTimestamp();
          updateData.pf_payment_id = data.pf_payment_id;
          updateData.transaction_id = data.transaction_id;
          break;
          
        case 'FAILED':
          updateData.status = 'payment_failed';
          updateData.paymentStatus = 'failed';
          updateData.paymentFailedAt = admin.firestore.FieldValue.serverTimestamp();
          break;
          
        case 'CANCELLED':
          updateData.status = 'cancelled';
          updateData.paymentStatus = 'cancelled';
          updateData.paymentCancelledAt = admin.firestore.FieldValue.serverTimestamp();
          break;
          
        default:
          updateData.paymentStatus = paymentStatus.toLowerCase();
          console.log(`Unhandled payment status: ${paymentStatus}`);
      }
      
      // 7. Update the order in Firestore
      await orderRef.update(updateData);
      
      // 8. Return success with details
      return {
        success: true,
        orderId,
        status: paymentStatus,
        userId,
        newOrderStatus: updateData.status
      };
    } catch (error) {
      console.error('Error processing ITN:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export a singleton instance
module.exports = new PayfastService();