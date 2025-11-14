const crypto = require('crypto');
const axios = require('axios');
const admin = require('../../firebase');
const functions = require('firebase-functions');
require('dotenv').config();

/**
 * PayFast Service - Handles all PayFast payment operations
 * 
 * Integration based on PayFast documentation:
 * https://developers.payfast.co.za/docs
 */
class PayfastService {
  constructor() {
    // Load configuration from Firebase Functions config (production) or .env (local)
    const config = functions.config();
    
    this.config = {
      merchantId: config.payfast?.merchant_id || process.env.PAYFAST_MERCHANT_ID,
      merchantKey: config.payfast?.merchant_key || process.env.PAYFAST_MERCHANT_KEY,
      passphrase: config.payfast?.passphrase || process.env.PAYFAST_PASSPHRASE || '',
      returnUrl: config.payfast?.return_url || process.env.PAYFAST_RETURN_URL || 'https://locals-za.co.za/payment/success',
      cancelUrl: config.payfast?.cancel_url || process.env.PAYFAST_CANCEL_URL || 'https://locals-za.co.za/payment/cancelled',
      notifyUrl: config.payfast?.notify_url || process.env.PAYFAST_NOTIFY_URL || 'https://europe-west4-localsza.cloudfunctions.net/api/payment/notify',
      testMode: config.payfast?.test_mode === 'true' || process.env.PAYFAST_TEST_MODE === 'true',
      
      // Correct URLs per PayFast documentation
      sandboxUrl: 'https://sandbox.payfast.co.za/eng/process',
      productionUrl: 'https://www.payfast.co.za/eng/process',
      
      // Validation URLs
      validateUrlSandbox: 'https://sandbox.payfast.co.za/eng/query/validate',
      validateUrlProduction: 'https://www.payfast.co.za/eng/query/validate'
    };
    
    console.log(`PayFast initialized in ${this.config.testMode ? 'SANDBOX' : 'PRODUCTION'} mode`);
    console.log(`Merchant ID: ${this.config.merchantId}`);
    console.log(`Payment URL: ${this.config.testMode ? this.config.sandboxUrl : this.config.productionUrl}`);
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
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Customer';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';
      
      // Ensure we have a valid email
      const email = orderData.email || 
        (userId && userId.includes('@') ? userId : `${userId || 'guest'}@locals-za.co.za`);
      
      // Format amount with exactly 2 decimal places
      const amount = parseFloat(orderData.total).toFixed(2);
      
      // Extract phone number and clean it
      let cellNumber = orderData.deliveryAddress?.phone || '';
      cellNumber = cellNumber.replace(/[^\d]/g, ''); // Remove non-digits
      if (cellNumber.startsWith('0')) {
        cellNumber = '27' + cellNumber.substring(1); // Convert to international format
      }
      if (!cellNumber.startsWith('27')) {
        cellNumber = '27' + cellNumber;
      }
      
      // Create the payment data object with required fields ONLY
      // https://developers.payfast.co.za/docs#step_1_form_fields
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
        
        // Transaction details
        m_payment_id: orderId,
        amount: amount,
        item_name: `Order ${orderId.slice(-8)}`,
        item_description: `${orderData.items?.length || 0} items`,
      };
      
      // Add optional cell number only if valid
      if (cellNumber && cellNumber.length >= 10) {
        data.cell_number = cellNumber;
      }
      
      // Add custom fields for tracking
      if (userId) {
        data.custom_str1 = userId;
      }
      
      // Add custom string with delivery address (max 255 chars)
      if (orderData.deliveryAddress?.addressLine) {
        const addressData = {
          address: orderData.deliveryAddress.addressLine,
          city: orderData.deliveryAddress.city || '',
          postal: orderData.deliveryAddress.postal || ''
        };
        const addressString = JSON.stringify(addressData);
        if (addressString.length <= 255) {
          data.custom_str2 = addressString;
        }
      }

      // Generate signature BEFORE adding test mode flag
      const signature = this.generateSignature(data);
      data.signature = signature;

      // Determine the correct payment URL
      const paymentUrl = this.config.testMode ? this.config.sandboxUrl : this.config.productionUrl;

      console.log('Payment request created:', {
        orderId,
        amount: data.amount,
        merchant_id: data.merchant_id,
        email: data.email_address,
        url: paymentUrl,
        hasSignature: !!signature
      });

      return {
        formData: data,
        url: paymentUrl,
        paymentId: orderId
      };
    } catch (error) {
      console.error('Error creating PayFast payment request:', error);
      throw new Error('Failed to create payment request: ' + error.message);
    }
  }
  
  /**
   * Generate MD5 signature for request data - PayFast's exact algorithm
   * https://developers.payfast.co.za/docs#signature
   * 
   * @param {Object} data - The payment data
   * @returns {String} MD5 signature
   */
  generateSignature(data) {
    try {
      // Create parameter string
      let pfOutput = "";
      
      // Sort keys alphabetically (case-sensitive)
      const sortedKeys = Object.keys(data).sort();
      
      // Build the parameter string
      for (const key of sortedKeys) {
        const value = data[key];
        // Skip empty values
        if (value !== "" && value !== undefined && value !== null) {
          // URL encode the value using PHP's urlencode equivalent
          pfOutput += `${key}=${encodeURIComponent(String(value).trim()).replace(/%20/g, "+")}&`;
        }
      }

      // Remove last ampersand
      let getString = pfOutput.slice(0, -1);
      
      // Add passphrase if it exists
      if (this.config.passphrase) {
        getString += `&passphrase=${encodeURIComponent(this.config.passphrase.trim()).replace(/%20/g, "+")}`;
      }
      
      console.log('Signature string (first 100 chars):', getString.substring(0, 100) + '...');
      
      // Generate MD5 hash
      const signature = crypto.createHash("md5").update(getString).digest("hex");
      
      console.log('Generated signature:', signature);
      
      return signature;
    } catch (error) {
      console.error('Error generating signature:', error);
      throw error;
    }
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
    
    // Generate signature
    const calculatedSignature = this.generateSignature(paymentData);
    
    console.log('Received signature:', receivedSignature);
    console.log('Calculated signature:', calculatedSignature);
    
    // Compare signatures
    return calculatedSignature === receivedSignature;
  }
  
  /**
   * Validate ITN with PayFast server
   * 
   * @param {Object} data - ITN data
   * @returns {Promise<Boolean>} Validation result
   */
  async validateWithPayfast(data) {
    try {
      const validateUrl = this.config.testMode ?
        this.config.validateUrlSandbox :
        this.config.validateUrlProduction;
      
      const validateData = Object.keys(data)
        .map(key => `${key}=${encodeURIComponent(data[key])}`)
        .join('&');
      
      const response = await axios.post(validateUrl, validateData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      });
      
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
      // Extract and verify signature
      const signature = data.signature;
      const isSignatureValid = this.verifySignature(data, signature);
      
      if (!isSignatureValid) {
        console.error('Invalid signature in ITN');
        return { success: false, error: 'Invalid signature' };
      }
      
      // Get order ID
      const orderId = data.m_payment_id;
      if (!orderId) {
        return { success: false, error: 'No order ID in ITN data' };
      }
      
      // Get order from Firestore
      const orderRef = admin.firestore().collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();
      
      if (!orderDoc.exists) {
        console.error(`Order ${orderId} not found`);
        return { success: false, error: 'Order not found' };
      }
      
      const orderData = orderDoc.data();
      const userId = orderData.userId || data.custom_str1;
      
      // Store ITN for audit trail
      await admin.firestore().collection('payment_notifications').add({
        orderId,
        paymentData: data,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        environment: this.config.testMode ? 'sandbox' : 'production'
      });
      
      // Process based on payment status
      const paymentStatus = data.payment_status;
      const updateData = {
        paymentData: data,
        paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      switch (paymentStatus) {
        case 'COMPLETE':
          updateData.status = 'pending';
          updateData.paymentStatus = 'paid';
          updateData.paymentCompleted = true;
          updateData.paymentCompletedAt = admin.firestore.FieldValue.serverTimestamp();
          updateData.pf_payment_id = data.pf_payment_id;
          break;
          
        case 'FAILED':
          updateData.status = 'payment_failed';
          updateData.paymentStatus = 'failed';
          break;
          
        case 'CANCELLED':
          updateData.status = 'cancelled';
          updateData.paymentStatus = 'cancelled';
          break;
          
        default:
          updateData.paymentStatus = paymentStatus.toLowerCase();
      }
      
      // Update order
      await orderRef.update(updateData);
      
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