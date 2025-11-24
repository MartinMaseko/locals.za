const crypto = require('crypto');
const axios = require('axios');
const dns = require('dns').promises;
const admin = require('../../firebase');

/**
 * PayFast Integration Service
 * Based on official PayFast documentation: https://developers.payfast.co.za/docs
 */
class PayfastService {
  constructor() {
    require('dotenv').config({ path: '.env' });

    let firebaseConfig = {};
    try {
      const functions = require('firebase-functions');
      firebaseConfig = functions.config().payfast || {};
    } catch (err) {
    }

    this.config = {
      merchantId: String(firebaseConfig.merchant_id || process.env.PAYFAST_MERCHANT_ID || '').trim(),
      merchantKey: String(firebaseConfig.merchant_key || process.env.PAYFAST_MERCHANT_KEY || '').trim(),
      passphrase: '', 
      returnUrl: String(firebaseConfig.return_url || process.env.PAYFAST_RETURN_URL || '').trim(),
      cancelUrl: String(firebaseConfig.cancel_url || process.env.PAYFAST_CANCEL_URL || '').trim(),
      notifyUrl: String(firebaseConfig.notify_url || process.env.PAYFAST_NOTIFY_URL || '').trim(),
      testMode: String(firebaseConfig.test_mode || process.env.PAYFAST_TEST_MODE) === 'true'
    };

    this.paymentUrl = this.config.testMode
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';
  }

  /**
   * Generates the PayFast signature following their exact documentation
   * https://developers.payfast.co.za/docs#signature-generation
   */
  generateSignature(data, passPhrase = null) {
    // Sort keys alphabetically (IMPORTANT)
    const sortedKeys = Object.keys(data).sort();

    // Build parameter string
    let pfOutput = "";
      for (let key of sortedKeys) {
        if(data.hasOwnProperty(key)){
          if (data[key] !== "") {
            pfOutput +=`${key}=${encodeURIComponent(data[key].trim()).replace(/%20/g, "+")}&`
          }
        }
      }

    // Remove last ampersand
    let getString = pfOutput.slice(0, -1);

    // Generate MD5 hash in lowercase
    const signature = crypto.createHash("md5").update(getString).digest("hex");

    console.log('\n=== PayFast Signature Generation ===');
    console.log('Parameter string:', getString);
    console.log('Passphrase used: NO');
    console.log('Generated signature:', signature);
    console.log('===================================\n');

    return signature;
  }

  /**
   * Creates the complete payment request object to be sent to the frontend.
   */
  createPaymentRequest(orderData, orderId, userId) {
    try {
      if (!this.config.merchantId || !this.config.merchantKey) {
        throw new Error('PayFast merchant_id or merchant_key is not configured.');
      }

      const fullName = String(orderData.deliveryAddress?.name || 'Customer').trim();
      const nameParts = fullName.split(/\s+/);
      const firstName = (nameParts[0] || 'Customer').substring(0, 100);
      const lastName = (nameParts.slice(1).join(' ') || 'User').substring(0, 100);
      const email = (orderData.email || `${userId}@locals-za.co.za`).substring(0, 255);
      const amountString = parseFloat(orderData.total || 0).toFixed(2);

      if (parseFloat(amountString) <= 0) {
        throw new Error('Invalid order amount. Must be greater than zero.');
      }

      // Step 1: Build data FOR SIGNATURE (WITH merchant_key, matching PayFast order)
      const dataForSignature = {
        merchant_id: this.config.merchantId,
        merchant_key: this.config.merchantKey,
        return_url: `${this.config.returnUrl}/${orderId}`,
        cancel_url: `${this.config.cancelUrl}/${orderId}`,
        notify_url: this.config.notifyUrl,
        name_first: firstName,
        name_last: lastName,
        email_address: email,
        m_payment_id: orderId,
        amount: amountString,
        item_name: `LocalsZA Order #${orderId.slice(-8)}`.substring(0, 255)
      };

      // Step 2: Generate signature
      const signature = this.generateSignature(dataForSignature, this.config.passphrase);

      // Step 3: Build final form data (SAME ORDER as dataForSignature, add signature at end)
      const formData = {
        merchant_id: this.config.merchantId,
        merchant_key: this.config.merchantKey,
        return_url: `${this.config.returnUrl}/${orderId}`,
        cancel_url: `${this.config.cancelUrl}/${orderId}`,
        notify_url: this.config.notifyUrl,
        name_first: firstName,
        name_last: lastName,
        email_address: email,
        m_payment_id: orderId,
        amount: amountString,
        item_name: `LocalsZA Order #${orderId.slice(-8)}`.substring(0, 255),
        signature: signature
      };

      console.log('=== PayFast Payment Request Summary ===');
      console.log('Data for signature (WITH merchant_key):', dataForSignature);
      console.log('Form data to PayFast (WITH merchant_key + signature):', formData);
      console.log('Passphrase:NOT USED');
      console.log('========================================');

      return {
        formData: formData,
        url: this.paymentUrl,
        paymentId: orderId
      };

    } catch (error) {
      console.error('Error creating PayFast payment request:', error);
      throw error;
    }
  }

  /**
   * Verify ITN signature
   */
  verifySignature(data, receivedSignature) {
    try {
      // Remove signature from data for recalculation
      const dataForVerification = { ...data };
      delete dataForVerification.signature;

      // Sort keys alphabetically
      const sortedKeys = Object.keys(dataForVerification).sort();

      // Build parameter string (same as payment request)
      let paramString = "";
      for (let key of sortedKeys) {
        if (dataForVerification.hasOwnProperty(key)) {
          if (dataForVerification[key] !== "") {
            paramString += `${key}=${encodeURIComponent(String(dataForVerification[key]).trim()).replace(/%20/g, "+")}&`;
          }
        }
      }

      // Remove last ampersand
      paramString = paramString.slice(0, -1);

      // Generate MD5 hash
      const calculatedSignature = crypto.createHash("md5").update(paramString).digest("hex");

      console.log('=== PayFast Signature Verification ===');
      console.log('Received:', receivedSignature);
      console.log('Calculated:', calculatedSignature);
      console.log('Match:', calculatedSignature === receivedSignature);
      console.log('=====================================');

      return calculatedSignature === receivedSignature;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
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
        data[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
      }
    });

    return data;
  }

  /**
   * Validate request IP is from PayFast
   */
  async validateIp(req) {
    try {
      const validHosts = [
        'www.payfast.co.za',
        'sandbox.payfast.co.za',
        'w1w.payfast.co.za',
        'w2w.payfast.co.za'
      ];

      let validIps = [];
      const pfIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

      console.log('Validating IP:', pfIp);

      // Lookup all PayFast IPs
      for (const host of validHosts) {
        try {
          const addresses = await dns.lookup(host, { all: true });
          const ips = addresses.map(item => item.address);
          validIps = [...validIps, ...ips];
          console.log(`IPs for ${host}:`, ips);
        } catch (err) {
          console.error(`DNS lookup failed for ${host}:`, err.message);
        }
      }

      // Remove duplicates
      const uniqueIps = [...new Set(validIps)];
      console.log('Valid PayFast IPs:', uniqueIps);

      const isValid = uniqueIps.includes(pfIp);
      console.log(`IP ${pfIp} is ${isValid ? 'VALID' : 'INVALID'}`);

      return isValid;
    } catch (error) {
      console.error('IP validation error:', error);
      return false;
    }
  }

  /**
   * Validate payment with PayFast server
   */
  async validateWithPayfast(data) {
    try {
      const validateUrl = this.config.testMode
        ? 'https://sandbox.payfast.co.za/eng/query/validate'
        : 'https://www.payfast.co.za/eng/query/validate';

      // Build form data for PayFast validation
      const params = Object.keys(data)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(String(data[key]))}`)
        .join('&');

      console.log('Sending validation to PayFast...');

      const response = await axios.post(validateUrl, params, {
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'LocalsZA-PaymentProcessor/1.0'
        },
        timeout: 10000
      });

      const isValid = response.data.trim() === 'VALID';
      console.log('PayFast validation response:', response.data.trim());

      return isValid;
    } catch (error) {
      console.error('PayFast validation error:', error.message);
      return false;
    }
  }

  /**
   * Process ITN callback with full security validation
   */
  async processItn(data, req) {
    try {
      console.log('=== Processing PayFast ITN ===');
      console.log('Payment ID:', data.m_payment_id);
      console.log('Status:', data.payment_status);

      // Step 1: Validate IP address
      const validIp = await this.validateIp(req);
      if (!validIp) {
        console.error('Invalid IP address for ITN');
        return { success: false, error: 'Invalid IP address' };
      }

      // Step 2: Verify signature
      if (!this.verifySignature(data, data.signature)) {
        console.error('Invalid signature');
        return { success: false, error: 'Invalid signature' };
      }

      // Step 3: Validate with PayFast server
      const isValid = await this.validateWithPayfast(data);
      if (!isValid) {
        console.error('Server validation failed');
        return { success: false, error: 'Server validation failed' };
      }

      console.log('============================');
      console.log('All validations passed');

      // Process the payment...
      const orderId = data.m_payment_id;
      if (!orderId) {
        return { success: false, error: 'Missing order ID' };
      }

      // Update order in database
      const orderRef = admin.firestore().collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return { success: false, error: 'Order not found' };
      }

      // Log ITN for audit
      await admin.firestore().collection('payment_notifications').add({
        orderId,
        paymentData: data,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        environment: this.config.testMode ? 'sandbox' : 'production',
        verified: true,
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      });

      // Update order status
      const paymentStatus = data.payment_status;
      const updateData = {
        paymentData: data,
        paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentVerified: true
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
      }

      await orderRef.update(updateData);

      return {
        success: true,
        orderId,
        status: paymentStatus,
        userId: orderDoc.data().userId
      };

    } catch (error) {
      console.error('PayFast ITN processing error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PayfastService();