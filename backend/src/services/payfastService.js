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

    // Add debugging to confirm
    console.log('PayFast Merchant ID:', this.config.merchantId);
    console.log('PayFast Merchant key:', this.config.merchantKey);
    console.log('PayFast Return URL:', this.config.returnUrl);
    console.log('PayFast Cancel URL:', this.config.cancelUrl);
    console.log('PayFast Notify URL:', this.config.notifyUrl);
    console.log('PayFast Test Mode:', this.config.testMode);
  }

  /**
   * Generates the PayFast signature following their exact documentation
   * https://developers.payfast.co.za/docs#signature-generation
   */
  generateSignature(data, passPhrase = null) {
    // Force passphrase to null
    passPhrase = null;
    
    // Remove signature field from data copy
    const signatureData = { ...data };
    delete signatureData.signature;

    // Sort keys alphabetically
    const keys = Object.keys(signatureData).sort();

    // Create parameter string exactly as PayFast docs specify
    let pfOutput = "";
    
    // Build parameter string - PayFast uses for...in loop (no sorting)
        for (const key of keys) {
        const value = signatureData[key];
        if (value !== "" && value !== null && value !== undefined) {
          const trimmedValue = String(value).trim();
          if (trimmedValue !== "") {
            const encodedValue = encodeURIComponent(trimmedValue).replace(/%20/g, "+");
            pfOutput += `${key}=${encodedValue}&`;
          }
        }
      }
    }

    // Remove last ampersand
    let paramString = pfOutput.slice(0, -1);

    // Generate MD5 hash in lowercase
    const signature = crypto.createHash("md5").update(paramString).digest("hex").toLowerCase();

    console.log('\n=== PayFast Signature Generation ===');
    console.log('Parameter string:', paramString);
    console.log('Passphrase used:', passPhrase ? 'YES' : 'NO');
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

      // 1. Assemble ALL data that will be sent in the form.
      // This time, we correctly include merchant_key.
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
        item_description: `${orderData.items?.length || 0} item(s) from LocalsZA`.substring(0, 255),
      };

      // Add optional fields if they exist
      if (userId && userId !== 'guest') {
        formData.custom_str1 = userId.substring(0, 255);
      }
      const phoneInput = String(orderData.deliveryAddress?.phone || '').replace(/\D/g, '');
      if (phoneInput) {
        formData.cell_number = phoneInput.startsWith('0') ? '27' + phoneInput.substring(1) : phoneInput;
      }

      // 2. Generate the signature using this complete data object.
      formData.signature = this.generateSignature(formData, this.config.passphrase);

      console.log('=== PayFast Payment Request Summary ===');
      console.log('Form data being sent to frontend:', formData);
      console.log('========================================');

      // 3. Return the complete object to the frontend.
      return {
        formData: formData,
        url: this.paymentUrl,
        paymentId: orderId
      };

    } catch (error) {
      console.error('Error creating PayFast payment request:', error);
      throw error; // Re-throw to be caught by the calling function
    }
  }

  /**
   * Verify ITN signature
   */
  verifySignature(data, receivedSignature) {
    try {
      const calculatedSignature = this.generateSignature(data, this.config.passphrase);
      const isValid = calculatedSignature === receivedSignature;

      console.log('=== PayFast Signature Verification ===');
      console.log('Received:', receivedSignature);
      console.log('Calculated:', calculatedSignature);
      console.log('Match:', isValid);
      console.log('=====================================');

      return isValid;
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
   * Validate payment with PayFast server
   */
  async validateWithPayfast(data) {
    try {
      const validateUrl = this.config.testMode
        ? 'https://sandbox.payfast.co.za/eng/query/validate'
        : 'https://www.payfast.co.za/eng/query/validate';

      const params = Object.keys(data)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
        .join('&');

      const response = await axios.post(validateUrl, params, {
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'LocalsZA-PaymentProcessor/1.0'
        },
        timeout: 10000
      });

      return response.data.trim() === 'VALID';
    } catch (error) {
      console.error('PayFast validation error:', error.message);
      return false;
    }
  }

  /**
   * Process ITN callback
   */
  async processItn(data) {
    try {
      console.log('=== Processing PayFast ITN ===');
      console.log('Payment ID:', data.m_payment_id);
      console.log('Status:', data.payment_status);
      console.log('============================');

      // Verify signature
      if (!this.verifySignature(data, data.signature)) {
        return { success: false, error: 'Invalid signature' };
      }

      // Validate with PayFast
      const isValid = await this.validateWithPayfast(data);
      if (!isValid) {
        return { success: false, error: 'Server validation failed' };
      }

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
        verified: true
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