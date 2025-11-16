const crypto = require('crypto');
const axios = require('axios');
const admin = require('../../firebase');

/**
 * PayFast Service - Handles all PayFast payment operations
 * https://developers.payfast.co.za/docs
 * 
 * Production: Reads from Firebase config fallback to .env
 * Development: Reads from .env.local
 */
class PayfastService {
  constructor() {
    // Load environment variables with proper fallbacks
    require('dotenv').config({ path: '.env' });
    
    // Try Firebase config first, then environment variables
    let firebaseConfig = {};
    try {
      const functions = require('firebase-functions');
      firebaseConfig = functions.config().payfast || {};
    } catch (err) {
      console.log('Firebase config not available, using environment variables');
    }

    // Build config with proper priority: env > firebase > defaults
    this.config = {
      merchantId: process.env.PAYFAST_MERCHANT_ID || firebaseConfig.merchant_id,
      merchantKey: process.env.PAYFAST_MERCHANT_KEY || firebaseConfig.merchant_key,
      passphrase: process.env.PAYFAST_PASSPHRASE || firebaseConfig.passphrase || '',
      returnUrl: process.env.PAYFAST_RETURN_URL || firebaseConfig.return_url,
      cancelUrl: process.env.PAYFAST_CANCEL_URL || firebaseConfig.cancel_url,
      notifyUrl: process.env.PAYFAST_NOTIFY_URL || firebaseConfig.notify_url,
      
      // Test mode check
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
      const fullName = orderData.deliveryAddress?.name || 'Customer';
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || 'Customer';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';
      
      const email = orderData.email || 
        (userId && userId.includes('@') ? userId : `${userId || 'guest'}@locals-za.co.za`);
      
      const amount = parseFloat(orderData.total).toFixed(2);
      
      let cellNumber = orderData.deliveryAddress?.phone || '';
      cellNumber = cellNumber.replace(/[^\d]/g, '');
      if (cellNumber.startsWith('0')) {
        cellNumber = '27' + cellNumber.substring(1);
      }
      if (!cellNumber.startsWith('27')) {
        cellNumber = '27' + cellNumber;
      }
      
      // Build payment data - exact PayFast format
      const data = {
        merchant_id: this.config.merchantId,
        merchant_key: this.config.merchantKey,
        return_url: `${this.config.returnUrl}/${orderId}`,
        cancel_url: `${this.config.cancelUrl}/${orderId}`,
        notify_url: this.config.notifyUrl,
        name_first: firstName,
        name_last: lastName,
        email_address: email,
        m_payment_id: orderId,
        amount: amount,
        item_name: `Order ${orderId.slice(-8)}`,
        item_description: `${orderData.items?.length || 0} items`,
      };
      
      if (cellNumber && cellNumber.length >= 10) {
        data.cell_number = cellNumber;
      }
      
      if (userId) {
        data.custom_str1 = userId;
      }
      
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

      const signature = this.generateSignature(data);
      data.signature = signature;

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
   * Generate MD5 signature using PayFast's PHP algorithm
   * https://developers.payfast.co.za/docs#signature
   */
  generateSignature(data) {
    try {
      let pfOutput = "";
      const sortedKeys = Object.keys(data).sort();
      
      // Build string with proper encoding (matches PayFast PHP urlencode)
      for (const key of sortedKeys) {
        const value = data[key];
        if (value !== "" && value !== undefined && value !== null) {
          // encodeURIComponent then replace %20 with + (PHP urlencode behavior)
          pfOutput += `${key}=${encodeURIComponent(String(value).trim()).replace(/%20/g, "+")}&`;
        }
      }

      let getString = pfOutput.slice(0, -1);
      
      // Add passphrase if it exists
      if (this.config.passphrase && this.config.passphrase.trim()) {
        getString += `&passphrase=${encodeURIComponent(this.config.passphrase.trim()).replace(/%20/g, "+")}`;
      }
      
      console.log('Signature string (first 100 chars):', getString.substring(0, 100) + '...');
      console.log('Passphrase included:', !!this.config.passphrase);
      
      const signature = crypto.createHash("md5").update(getString).digest("hex");
      console.log('Generated signature:', signature);
      
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
    const paymentData = {...data};
    delete paymentData.signature;
    const calculatedSignature = this.generateSignature(paymentData);
    console.log('Received signature:', receivedSignature);
    console.log('Calculated signature:', calculatedSignature);
    return calculatedSignature === receivedSignature;
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