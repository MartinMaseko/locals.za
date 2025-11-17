const crypto = require('crypto');
const axios = require('axios');
const admin = require('../../firebase');

/**
 * PayFast Integration Service
 * Strictly follows: https://developers.payfast.co.za/docs
 * Reference: Node.js code snippets from PayFast documentation
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
   * Generate signature following PayFast docs exactly
   * https://developers.payfast.co.za/docs#step_2_signature
   */
  generateSignature(data, passPhrase = null) {
    // Create parameter string
    let pfOutput = "";
    for (let key in data) {
      if (data.hasOwnProperty(key)) {
        if (data[key] !== "") {
          pfOutput += `${key}=${encodeURIComponent(data[key].trim()).replace(/%20/g, "+")}&`;
        }
      }
    }

    // Remove last ampersand
    let getString = pfOutput.slice(0, -1);
    
    // Append passphrase if provided
    if (passPhrase !== null) {
      getString += `&passphrase=${encodeURIComponent(passPhrase.trim()).replace(/%20/g, "+")}`;
    }

    console.log('Signature string:', getString);

    // Generate MD5 hash
    return crypto.createHash("md5").update(getString).digest("hex");
  }

  /**
   * Create payment request following PayFast form example
   * https://developers.payfast.co.za/docs#step_1_form_fields
   */
  createPaymentRequest(orderData, orderId, userId) {
    try {
      // Parse name
      const fullName = String(orderData.deliveryAddress?.name || 'Customer').trim();
      const nameParts = fullName.split(/\s+/);
      const firstName = nameParts[0] || 'Customer';
      const lastName = nameParts.slice(1).join(' ') || 'User';

      // Validate email
      let email = orderData.email || `${userId}@locals-za.co.za`;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        email = `${userId}@locals-za.co.za`;
      }

      // Format amount as string with 2 decimals
      const amount = parseFloat(orderData.total).toFixed(2);

      // Format phone (optional field)
      let cellNumber = String(orderData.deliveryAddress?.phone || '').replace(/\D/g, '');
      if (cellNumber.startsWith('0')) {
        cellNumber = '27' + cellNumber.substring(1);
      } else if (cellNumber && !cellNumber.startsWith('27')) {
        cellNumber = '27' + cellNumber;
      }

      // Build data object in PayFast order (important!)
      const myData = {};
      
      // Merchant details
      myData['merchant_id'] = this.config.merchantId;
      myData['merchant_key'] = this.config.merchantKey;
      myData['return_url'] = `${this.config.returnUrl}/${orderId}`;
      myData['cancel_url'] = `${this.config.cancelUrl}/${orderId}`;
      myData['notify_url'] = this.config.notifyUrl;
      
      // Buyer details
      myData['name_first'] = firstName;
      myData['name_last'] = lastName;
      myData['email_address'] = email;
      
      // Transaction details
      myData['m_payment_id'] = orderId;
      myData['amount'] = amount;
      myData['item_name'] = `Order#${orderId.slice(-8)}`;
      myData['item_description'] = `${orderData.items?.length || 0} items`;

      // Optional fields - only add if valid
      if (cellNumber && cellNumber.length >= 10) {
        myData['cell_number'] = cellNumber;
      }

      if (userId && userId !== 'guest') {
        myData['custom_str1'] = userId.substring(0, 255);
      }

      // Generate signature with passphrase if set
      const myPassphrase = this.config.passphrase || null;
      myData['signature'] = this.generateSignature(myData, myPassphrase);

      console.log('=== PayFast Payment Request ===');
      console.log('Order:', orderId);
      console.log('Amount:', amount);
      console.log('Email:', email);
      console.log('Signature:', myData['signature']);
      console.log('===============================');

      return {
        formData: myData,
        url: this.paymentUrl,
        paymentId: orderId
      };

    } catch (error) {
      console.error('Error creating payment request:', error);
      throw new Error('Failed to create payment: ' + error.message);
    }
  }

  /**
   * Verify ITN signature
   */
  verifySignature(data, receivedSignature) {
    const paymentData = { ...data };
    delete paymentData.signature;

    const calculatedSignature = this.generateSignature(
      paymentData,
      this.config.passphrase || null
    );

    console.log('Signature verification:');
    console.log('Received:', receivedSignature);
    console.log('Calculated:', calculatedSignature);
    console.log('Match:', calculatedSignature === receivedSignature);

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
        data[key] = decodeURIComponent(value.replace(/\+/g, ' '));
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

      const params = Object.keys(data)
        .map(key => `${key}=${encodeURIComponent(data[key])}`)
        .join('&');

      const response = await axios.post(validateUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000
      });

      return response.data.trim() === 'VALID';
    } catch (error) {
      console.error('PayFast validation error:', error);
      return false;
    }
  }

  /**
   * Process ITN callback from PayFast
   */
  async processItn(data) {
    try {
      // Verify signature
      if (!this.verifySignature(data, data.signature)) {
        console.error('Invalid ITN signature');
        return { success: false, error: 'Invalid signature' };
      }

      const orderId = data.m_payment_id;
      if (!orderId) {
        return { success: false, error: 'Missing order ID' };
      }

      // Get order from Firestore
      const orderRef = admin.firestore().collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return { success: false, error: 'Order not found' };
      }

      // Log ITN for records
      await admin.firestore().collection('payment_notifications').add({
        orderId,
        paymentData: data,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        environment: this.config.testMode ? 'sandbox' : 'production'
      });

      // Update order based on payment status
      const paymentStatus = data.payment_status;
      const updateData = {
        paymentData: data,
        paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (paymentStatus === 'COMPLETE') {
        updateData.status = 'pending';
        updateData.paymentStatus = 'paid';
        updateData.paymentCompleted = true;
        updateData.paymentCompletedAt = admin.firestore.FieldValue.serverTimestamp();
        updateData.pf_payment_id = data.pf_payment_id;
      } else if (paymentStatus === 'FAILED') {
        updateData.status = 'payment_failed';
        updateData.paymentStatus = 'failed';
      } else if (paymentStatus === 'CANCELLED') {
        updateData.status = 'cancelled';
        updateData.paymentStatus = 'cancelled';
      } else {
        updateData.paymentStatus = paymentStatus.toLowerCase();
      }

      await orderRef.update(updateData);

      return {
        success: true,
        orderId,
        status: paymentStatus,
        newOrderStatus: updateData.status
      };

    } catch (error) {
      console.error('ITN processing error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PayfastService();