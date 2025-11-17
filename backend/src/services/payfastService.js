const crypto = require('crypto');
const axios = require('axios');
const admin = require('../../firebase');

/**
 * PayFast Integration Service
 * Based on official PayFast documentation: https://developers.payfast.co.za/docs
 */
class PayfastService {
  constructor() {
    require('dotenv').config({ path: '.env' });

    // Helper to clean environment variables
    const clean = (val) => {
      if (!val) return '';
      return String(val).replace(/[\r\n]/g, '').trim();
    };

    let firebaseConfig = {};
    try {
      const functions = require('firebase-functions');
      firebaseConfig = functions.config().payfast || {};
    } catch (err) {
      console.log('Using .env for PayFast config');
    }

    this.config = {
      merchantId: clean(process.env.PAYFAST_MERCHANT_ID || firebaseConfig.merchant_id),
      merchantKey: clean(process.env.PAYFAST_MERCHANT_KEY || firebaseConfig.merchant_key),
      passphrase: clean(process.env.PAYFAST_PASSPHRASE || firebaseConfig.passphrase),
      returnUrl: clean(process.env.PAYFAST_RETURN_URL || firebaseConfig.return_url),
      cancelUrl: clean(process.env.PAYFAST_CANCEL_URL || firebaseConfig.cancel_url),
      notifyUrl: clean(process.env.PAYFAST_NOTIFY_URL || firebaseConfig.notify_url),
      testMode: (process.env.PAYFAST_TEST_MODE === 'true') || (firebaseConfig.test_mode === 'true')
    };

    this.paymentUrl = this.config.testMode
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';

    console.log('PayFast initialized:', this.config.testMode ? 'SANDBOX' : 'PRODUCTION');
  }

  /**
   * Generate signature following PayFast documentation exactly
   * https://developers.payfast.co.za/docs#step_2_signature
   */
  generateSignature(data, passPhrase = null) {
    // Convert all values to strings and remove empty values
    const cleanData = {};
    
    // Process data in alphabetical order by key (PayFast requirement)
    const sortedKeys = Object.keys(data).sort();
    
    for (const key of sortedKeys) {
      const value = data[key];
      // Only include non-empty values
      if (value !== null && value !== undefined && String(value).trim() !== '') {
        cleanData[key] = String(value).trim();
      }
    }

    // Build parameter string
    let paramString = '';
    for (const key of Object.keys(cleanData).sort()) {
      const value = cleanData[key];
      if (paramString) {
        paramString += '&';
      }
      // URL encode both key and value, but replace %20 with +
      paramString += `${encodeURIComponent(key)}=${encodeURIComponent(value)}`.replace(/%20/g, '+');
    }

    // Add passphrase if provided
    if (passPhrase && passPhrase.trim()) {
      paramString += `&passphrase=${encodeURIComponent(passPhrase.trim())}`.replace(/%20/g, '+');
    }

    console.log('PayFast signature string:', paramString);

    // Generate MD5 hash
    const signature = crypto.createHash('md5').update(paramString).digest('hex');
    console.log('Generated signature:', signature);
    
    return signature;
  }

  /**
   * Create payment request following PayFast form requirements
   */
  createPaymentRequest(orderData, orderId, userId) {
    try {
      // Validate required config
      if (!this.config.merchantId || !this.config.merchantKey) {
        throw new Error('PayFast merchant credentials not configured');
      }

      // Parse customer name
      const fullName = String(orderData.deliveryAddress?.name || 'Customer').trim();
      const nameParts = fullName.split(/\s+/);
      const firstName = nameParts[0] || 'Customer';
      const lastName = nameParts.slice(1).join(' ') || 'User';

      // Validate and format email
      let email = orderData.email || `${userId}@locals-za.co.za`;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        email = `${userId}@locals-za.co.za`;
      }

      // Format amount as string with exactly 2 decimal places
      const amount = parseFloat(orderData.total || 0).toFixed(2);
      if (parseFloat(amount) <= 0) {
        throw new Error('Invalid order amount');
      }

      // Format phone number (optional field)
      let cellNumber = String(orderData.deliveryAddress?.phone || '').replace(/\D/g, '');
      if (cellNumber.startsWith('0')) {
        cellNumber = '27' + cellNumber.substring(1);
      } else if (cellNumber && !cellNumber.startsWith('27')) {
        cellNumber = '27' + cellNumber;
      }

      // Build payment data object - ORDER MATTERS for signature!
      const paymentData = {};

      // Required merchant details
      paymentData.merchant_id = this.config.merchantId;
      paymentData.merchant_key = this.config.merchantKey;
      
      // Required URLs
      paymentData.return_url = `${this.config.returnUrl}/${orderId}`;
      paymentData.cancel_url = `${this.config.cancelUrl}/${orderId}`;
      paymentData.notify_url = this.config.notifyUrl;
      
      // Required buyer details
      paymentData.name_first = firstName;
      paymentData.name_last = lastName;
      paymentData.email_address = email;
      
      // Required transaction details
      paymentData.m_payment_id = orderId;
      paymentData.amount = amount;
      paymentData.item_name = `LocalsZA Order ${orderId.slice(-8)}`;
      paymentData.item_description = `${orderData.items?.length || 0} items from LocalsZA`;

      // Optional fields - only add if they have valid values
      if (cellNumber && cellNumber.length >= 10) {
        paymentData.cell_number = cellNumber;
      }

      if (userId && userId !== 'guest') {
        // Limit custom_str1 to 255 characters
        paymentData.custom_str1 = userId.substring(0, 255);
      }

      // Generate signature with passphrase
      const passphrase = this.config.passphrase || null;
      paymentData.signature = this.generateSignature(paymentData, passphrase);

      console.log('=== PayFast Payment Request Created ===');
      console.log('Order ID:', orderId);
      console.log('Amount:', amount);
      console.log('Email:', email);
      console.log('Test Mode:', this.config.testMode);
      console.log('==========================================');

      return {
        formData: paymentData,
        url: this.paymentUrl,
        paymentId: orderId
      };

    } catch (error) {
      console.error('Error creating PayFast payment request:', error);
      throw new Error('Failed to create payment: ' + error.message);
    }
  }

  /**
   * Verify ITN signature
   */
  verifySignature(data, receivedSignature) {
    // Create a copy of data without the signature
    const verifyData = { ...data };
    delete verifyData.signature;

    // Calculate signature using the same method
    const calculatedSignature = this.generateSignature(verifyData, this.config.passphrase);

    console.log('=== PayFast Signature Verification ===');
    console.log('Received signature:', receivedSignature);
    console.log('Calculated signature:', calculatedSignature);
    console.log('Signatures match:', calculatedSignature === receivedSignature);
    console.log('=====================================');

    return calculatedSignature === receivedSignature;
  }

  /**
   * Parse ITN data from POST body
   */
  parseItnData(body) {
    const data = {};
    const bodyString = body.toString();
    
    bodyString.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value !== undefined) {
        // Decode URL encoded values
        data[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
      }
    });

    return data;
  }

  /**
   * Validate payment with PayFast server
   */
  async validateWithPayfast(data) {
    try {
      const validateUrl = this.config.testMode
        ? 'https://sandbox.payfast.co.za/eng/query/validate'
        : 'https://www.payfast.co.za/eng/query/validate';

      // Create parameter string for validation
      const params = Object.keys(data)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
        .join('&');

      const response = await axios.post(validateUrl, params, {
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'LocalsZA Payment Processor'
        },
        timeout: 10000
      });

      const isValid = response.data.trim() === 'VALID';
      console.log('PayFast validation result:', isValid ? 'VALID' : 'INVALID');
      return isValid;
    } catch (error) {
      console.error('PayFast validation error:', error.message);
      return false;
    }
  }

  /**
   * Process ITN callback from PayFast
   */
  async processItn(data) {
    try {
      console.log('=== Processing PayFast ITN ===');
      console.log('Payment ID:', data.m_payment_id);
      console.log('Payment Status:', data.payment_status);
      console.log('============================');

      // Step 1: Verify signature
      if (!this.verifySignature(data, data.signature)) {
        console.error('PayFast ITN signature verification failed');
        return { success: false, error: 'Invalid signature' };
      }

      // Step 2: Validate with PayFast server
      const isValid = await this.validateWithPayfast(data);
      if (!isValid) {
        console.error('PayFast server validation failed');
        return { success: false, error: 'Server validation failed' };
      }

      const orderId = data.m_payment_id;
      if (!orderId) {
        return { success: false, error: 'Missing order ID' };
      }

      // Step 3: Get and update order
      const orderRef = admin.firestore().collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return { success: false, error: 'Order not found' };
      }

      // Step 4: Log ITN for audit trail
      await admin.firestore().collection('payment_notifications').add({
        orderId,
        paymentData: data,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        environment: this.config.testMode ? 'sandbox' : 'production',
        verified: true
      });

      // Step 5: Update order based on payment status
      const paymentStatus = data.payment_status;
      const updateData = {
        paymentData: data,
        paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentVerified: true
      };

      let newOrderStatus;
      if (paymentStatus === 'COMPLETE') {
        updateData.status = 'pending';
        updateData.paymentStatus = 'paid';
        updateData.paymentCompleted = true;
        updateData.paymentCompletedAt = admin.firestore.FieldValue.serverTimestamp();
        updateData.pf_payment_id = data.pf_payment_id;
        newOrderStatus = 'pending';
      } else if (paymentStatus === 'FAILED') {
        updateData.status = 'payment_failed';
        updateData.paymentStatus = 'failed';
        newOrderStatus = 'payment_failed';
      } else if (paymentStatus === 'CANCELLED') {
        updateData.status = 'cancelled';
        updateData.paymentStatus = 'cancelled';
        newOrderStatus = 'cancelled';
      } else {
        updateData.paymentStatus = paymentStatus.toLowerCase();
        newOrderStatus = paymentStatus.toLowerCase();
      }

      await orderRef.update(updateData);

      console.log(`Order ${orderId} updated with payment status: ${paymentStatus}`);

      return {
        success: true,
        orderId,
        status: paymentStatus,
        newOrderStatus,
        userId: orderDoc.data().userId
      };

    } catch (error) {
      console.error('PayFast ITN processing error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PayfastService();