const crypto = require('crypto');
const axios = require('axios');
const admin = require('../../firebase');

/**
 * PayFast Service - Handles all PayFast payment operations
 * https://developers.payfast.co.za/docs
 * 
 * Strictly follows PayFast's official integration guide
 */
class PayfastService {
  constructor() {
    require('dotenv').config({ path: '.env' });
    
    let firebaseConfig = {};
    try {
      const functions = require('firebase-functions');
      firebaseConfig = functions.config().payfast || {};
    } catch (err) {
      console.log('Firebase config not available, using environment variables');
    }

    this.config = {
      merchantId: process.env.PAYFAST_MERCHANT_ID || firebaseConfig.merchant_id,
      merchantKey: process.env.PAYFAST_MERCHANT_KEY || firebaseConfig.merchant_key,
      passphrase: process.env.PAYFAST_PASSPHRASE || firebaseConfig.passphrase || '',
      returnUrl: process.env.PAYFAST_RETURN_URL || firebaseConfig.return_url,
      cancelUrl: process.env.PAYFAST_CANCEL_URL || firebaseConfig.cancel_url,
      notifyUrl: process.env.PAYFAST_NOTIFY_URL || firebaseConfig.notify_url,
      testMode: process.env.PAYFAST_TEST_MODE === 'true' || firebaseConfig.test_mode === 'true',
      
      sandboxUrl: 'https://sandbox.payfast.co.za/eng/process',
      productionUrl: 'https://www.payfast.co.za/eng/process',
      
      validateUrlSandbox: 'https://sandbox.payfast.co.za/eng/query/validate',
      validateUrlProduction: 'https://www.payfast.co.za/eng/query/validate'
    };
    
    console.log('=== PayFast Service Initialized ===');
    console.log('Mode:', this.config.testMode ? 'SANDBOX' : 'PRODUCTION');
    console.log('Merchant ID:', this.config.merchantId || 'NOT SET');
    console.log('Merchant Key:', this.config.merchantKey ? '***SET***' : 'NOT SET');
    console.log('Passphrase:', this.config.passphrase ? '***SET***' : 'NOT SET');
    console.log('Payment URL:', this.config.testMode ? this.config.sandboxUrl : this.config.productionUrl);
    console.log('===================================');
  }

  /**
   * Creates a payment request for an order
   * https://developers.payfast.co.za/docs#step_1_form_fields
   */
  createPaymentRequest(orderData, orderId, userId) {
    try {
      // Extract name
      const fullName = orderData.deliveryAddress?.name || 'Customer';
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Customer';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';
      
      // Email - MUST be valid email format
      let email = orderData.email || 
        (userId && userId.includes('@') ? userId : `${userId || 'guest'}@locals-za.co.za`);
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        email = `${userId || 'guest'}@locals-za.co.za`;
      }
      
      // Amount - MUST be string with exactly 2 decimal places
      const amount = String(parseFloat(orderData.total).toFixed(2));
      
      // Phone number - convert to E.164 format
      let cellNumber = orderData.deliveryAddress?.phone || '';
      cellNumber = cellNumber.replace(/[^\d]/g, '');
      if (cellNumber.startsWith('0')) {
        cellNumber = '27' + cellNumber.substring(1);
      }
      if (!cellNumber.startsWith('27')) {
        cellNumber = '27' + cellNumber;
      }
      
      // Build payment data - EXACT PayFast format
      // https://developers.payfast.co.za/docs#step_1_form_fields
      const data = {
        // Merchant details (REQUIRED)
        merchant_id: this.config.merchantId,
        merchant_key: this.config.merchantKey,
        
        // Buyer details (REQUIRED)
        name_first: firstName,
        name_last: lastName,
        email_address: email,
        
        // Transaction details (REQUIRED)
        m_payment_id: orderId,
        amount: amount,
        item_name: `Order ${orderId.slice(-8)}`,
        item_description: `${orderData.items?.length || 0} items`,
        
        // Return URLs (REQUIRED) - MUST be full URLs
        return_url: `${this.config.returnUrl}/${orderId}`,
        cancel_url: `${this.config.cancelUrl}/${orderId}`,
        notify_url: this.config.notifyUrl,
      };
      
      // Optional fields only if valid
      if (cellNumber && cellNumber.length >= 10) {
        data.cell_number = cellNumber;
      }
      
      // Custom string for user tracking (optional)
      if (userId && userId !== 'guest') {
        data.custom_str1 = userId.substring(0, 255); // Ensure max 255 chars
      }

      // Validate URLs are full URLs
      if (!data.return_url.startsWith('http')) {
        throw new Error('return_url must be a full URL');
      }
      if (!data.cancel_url.startsWith('http')) {
        throw new Error('cancel_url must be a full URL');
      }
      if (!data.notify_url.startsWith('http')) {
        throw new Error('notify_url must be a full URL');
      }
      
      // Generate signature
      const signature = this.generateSignature(data);
      data.signature = signature;

      const paymentUrl = this.config.testMode ? this.config.sandboxUrl : this.config.productionUrl;

      // Comprehensive logging for debugging
      console.log('=== PayFast Payment Request ===');
      console.log('Order ID:', orderId);
      console.log('Amount (string):', data.amount, typeof data.amount);
      console.log('Email:', data.email_address);
      console.log('Return URL:', data.return_url);
      console.log('Cancel URL:', data.cancel_url);
      console.log('Notify URL:', data.notify_url);
      console.log('Payment URL:', paymentUrl);
      console.log('Signature generated:', !!signature);
      console.log('All fields:', Object.keys(data).sort());
      console.log('================================');

      // Log final payload that will be sent to PayFast
      console.log('=== Final PayFast Payload ===');
      Object.keys(data).sort().forEach(key => {
        console.log(`${key}: ${data[key]} (${typeof data[key]})`);
      });
      console.log('=============================');

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
   * Generate MD5 signature - EXACT PayFast algorithm
   * https://developers.payfast.co.za/docs#signature
   * 
   * KEY: Use %20 for spaces, NOT +
   */
  generateSignature(data) {
    try {
      let pfOutput = "";
      
      // Sort keys alphabetically
      const sortedKeys = Object.keys(data).sort();
      
      // Build querystring - NO spaces, use %20
      for (const key of sortedKeys) {
        const value = data[key];
        
        // Skip empty values and signature
        if (value !== "" && value !== undefined && value !== null && key !== 'signature') {
          // CRITICAL: Use encodeURIComponent without replacing %20 with +
          // PayFast expects RFC 3986 encoding: %20 for spaces
          const encoded = encodeURIComponent(String(value).trim());
          pfOutput += `${key}=${encoded}&`;
        }
      }

      // Remove last ampersand
      let getString = pfOutput.slice(0, -1);
      
      // Append passphrase DIRECTLY without & or encoding
      if (this.config.passphrase && this.config.passphrase.trim()) {
        getString += this.config.passphrase.trim();
      }
      
      console.log('=== Signature Generation Debug ===');
      console.log('Data keys (sorted):', sortedKeys.join(', '));
      console.log('Querystring (first 150 chars):', getString.substring(0, 150) + '...');
      console.log('Passphrase appended:', !!this.config.passphrase);
      console.log('Full string length:', getString.length);
      console.log('===================================');
      
      // Generate MD5 hash
      const signature = crypto.createHash("md5").update(getString).digest("hex");
      
      console.log('Generated MD5 signature:', signature);
      console.log('Signature length:', signature.length);
      
      return signature;
    } catch (error) {
      console.error('Error generating signature:', error);
      throw error;
    }
  }
  
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
  
  verifySignature(data, receivedSignature) {
    try {
      const paymentData = {...data};
      delete paymentData.signature;
      
      const calculatedSignature = this.generateSignature(paymentData);
      
      console.log('=== Signature Verification ===');
      console.log('Received signature:  ', receivedSignature);
      console.log('Calculated signature:', calculatedSignature);
      console.log('Match:', calculatedSignature === receivedSignature);
      console.log('==============================');
      
      return calculatedSignature === receivedSignature;
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }
  
  async validateWithPayfast(data) {
    try {
      const validateUrl = this.config.testMode ?
        this.config.validateUrlSandbox :
        this.config.validateUrlProduction;
      
      const validateData = Object.keys(data)
        .map(key => `${key}=${encodeURIComponent(data[key])}`)
        .join('&');
      
      const response = await axios.post(validateUrl, validateData, {
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        timeout: 10000
      });
      
      return response.data.trim() === 'VALID';
    } catch (error) {
      console.error('Error validating with PayFast:', error);
      return false;
    }
  }
  
  async processItn(data) {
    try {
      const signature = data.signature;
      const isSignatureValid = this.verifySignature(data, signature);
      
      if (!isSignatureValid) {
        console.error('Invalid signature in ITN');
        return { success: false, error: 'Invalid signature' };
      }
      
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
      
      await admin.firestore().collection('payment_notifications').add({
        orderId,
        paymentData: data,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        environment: this.config.testMode ? 'sandbox' : 'production'
      });
      
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

module.exports = new PayfastService();