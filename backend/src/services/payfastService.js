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
      console.log('Using .env for PayFast config');
    }

    this.config = {
      merchantId: String(process.env.PAYFAST_MERCHANT_ID || firebaseConfig.merchant_id || '').trim(),
      merchantKey: String(process.env.PAYFAST_MERCHANT_KEY || firebaseConfig.merchant_key || '').trim(),
      passphrase: String(process.env.PAYFAST_PASSPHRASE || firebaseConfig.passphrase || '').trim(),
      returnUrl: String(process.env.PAYFAST_RETURN_URL || firebaseConfig.return_url || '').trim(),
      cancelUrl: String(process.env.PAYFAST_CANCEL_URL || firebaseConfig.cancel_url || '').trim(),
      notifyUrl: String(process.env.PAYFAST_NOTIFY_URL || firebaseConfig.notify_url || '').trim(),
      testMode: (process.env.PAYFAST_TEST_MODE === 'true') || (firebaseConfig.test_mode === 'true')
    };

    this.paymentUrl = this.config.testMode
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';

    console.log('PayFast Config:', {
      merchantId: this.config.merchantId,
      testMode: this.config.testMode,
      hasPassphrase: !!this.config.passphrase
    });
  }

  /**
   * Generate signature following PayFast documentation EXACTLY
   * Based on: https://developers.payfast.co.za/docs#signature-generation
   */
  generateSignature(data, passPhrase = null) {
    try {
      // Create a copy without the signature field
      const signatureData = { ...data };
      delete signatureData.signature;
      // CRITICAL: merchant_key must NOT be in the signature string
      delete signatureData.merchant_key;

      // Step 1: Sort all keys alphabetically
      const keys = Object.keys(signatureData).sort();
      
      // Step 2: Build the signature string
      const parts = [];
      
      for (const key of keys) {
        let value = signatureData[key];
        
        // Convert to string and trim
        if (value === null || value === undefined) {
          continue;
        }
        
        value = String(value).trim();
        
        // Skip empty values
        if (value === '') {
          continue;
        }
        
        // URL encode the value
        const encoded = encodeURIComponent(value);
        parts.push(`${key}=${encoded}`);
      }
      
      // Step 3: Join with &
      let paramString = parts.join('&');
      
      // Step 4: Add passphrase if it exists
      if (passPhrase) {
        const cleanPass = String(passPhrase).trim();
        if (cleanPass !== '') {
          const encodedPass = encodeURIComponent(cleanPass);
          paramString += `&passphrase=${encodedPass}`;
        }
      }

      console.log('\n=== PayFast Signature Generation ===');
      console.log('Signature string to hash:');
      console.log(paramString);
      console.log('String length:', paramString.length);
      
      // Step 5: Generate MD5 hash (must be lowercase)
      const signature = crypto
        .createHash('md5')
        .update(paramString)
        .digest('hex')
        .toLowerCase();
      
      console.log('Generated MD5 hash:', signature);
      console.log('=====================================\n');
      
      return signature;
      
    } catch (error) {
      console.error('Signature generation error:', error);
      throw error;
    }
  }

  /**
   * Validate PayFast data fields
   */
  validatePaymentData(data) {
    const errors = [];
    
    // Required fields validation
    const requiredFields = {
      'merchant_id': data.merchant_id,
      'merchant_key': data.merchant_key,
      'return_url': data.return_url,
      'cancel_url': data.cancel_url,
      'notify_url': data.notify_url,
      'name_first': data.name_first,
      'name_last': data.name_last,
      'email_address': data.email_address,
      'm_payment_id': data.m_payment_id,
      'amount': data.amount,
      'item_name': data.item_name
    };

    Object.entries(requiredFields).forEach(([field, value]) => {
      if (!value || String(value).trim() === '') {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Specific validations
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      errors.push('Invalid amount: must be positive number');
    }

    const email = data.email_address;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email address format');
    }

    // Length validations
    if (data.name_first && data.name_first.length > 100) {
      errors.push('name_first exceeds 100 characters');
    }
    if (data.name_last && data.name_last.length > 100) {
      errors.push('name_last exceeds 100 characters');
    }
    if (data.email_address && data.email_address.length > 255) {
      errors.push('email_address exceeds 255 characters');
    }
    if (data.item_name && data.item_name.length > 255) {
      errors.push('item_name exceeds 255 characters');
    }

    return errors;
  }

  /**
   * Create payment request
   */
  createPaymentRequest(orderData, orderId, userId) {
    try {
      console.log('=== Creating PayFast Payment Request ===');
      
      // Validate config
      if (!this.config.merchantId || !this.config.merchantKey) {
        throw new Error('PayFast merchant credentials not configured');
      }

      // Parse customer name
      const fullName = String(orderData.deliveryAddress?.name || 'Customer').trim();
      if (fullName.length < 2) {
        throw new Error('Customer name too short');
      }
      
      const nameParts = fullName.split(/\s+/);
      let firstName = nameParts[0] || 'Customer';
      let lastName = nameParts.slice(1).join(' ') || 'User';
      
      // Truncate names to PayFast limits
      firstName = firstName.substring(0, 100);
      lastName = lastName.substring(0, 100);

      // Validate email
      let email = orderData.email || `${userId}@locals-za.co.za`;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        email = `${userId}@locals-za.co.za`;
      }
      email = email.substring(0, 255);

      // Format amount with exactly 2 decimal places
      const amount = parseFloat(orderData.total || 0);
      if (amount <= 0) {
        throw new Error('Invalid order amount');
      }
      const amountString = amount.toFixed(2);

      // Format phone (optional)
      let cellNumber = '';
      const phoneInput = String(orderData.deliveryAddress?.phone || '').replace(/\D/g, '');
      if (phoneInput) {
        if (phoneInput.startsWith('0')) {
          cellNumber = '27' + phoneInput.substring(1);
        } else if (!phoneInput.startsWith('27')) {
          cellNumber = '27' + phoneInput;
        } else {
          cellNumber = phoneInput;
        }
        
        if (cellNumber.length < 10 || cellNumber.length > 15) {
          cellNumber = '';
        }
      }

      // Build payment data object - NOTE: merchant_key is kept for signature generation only
      const paymentDataForSignature = {
        merchant_id: this.config.merchantId,
        merchant_key: this.config.merchantKey,  // For signature only
        return_url: `${this.config.returnUrl}/${orderId}`,
        cancel_url: `${this.config.cancelUrl}/${orderId}`,
        notify_url: this.config.notifyUrl,
        name_first: firstName,
        name_last: lastName,
        email_address: email,
        m_payment_id: orderId,
        amount: amountString,
        item_name: `LocalsZA Order #${orderId.slice(-8)}`.substring(0, 255),
        item_description: `${orderData.items?.length || 0} item(s) from LocalsZA`.substring(0, 255)
      };

      if (cellNumber) {
        paymentDataForSignature.cell_number = cellNumber;
      }

      if (userId && userId !== 'guest' && userId.length <= 255) {
        paymentDataForSignature.custom_str1 = userId;
      }

      // Validate the payment data
      const validationErrors = this.validatePaymentData(paymentDataForSignature);
      if (validationErrors.length > 0) {
        throw new Error('Validation errors: ' + validationErrors.join(', '));
      }

      console.log('Payment data before signature:', JSON.stringify(paymentDataForSignature, null, 2));

      // Generate signature
      const signature = this.generateSignature(paymentDataForSignature, this.config.passphrase);

      // NOW: Build the form data WITHOUT merchant_key
      const formData = {
        merchant_id: this.config.merchantId,
        // merchant_key is NOT sent in the form - only used for signature
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
        signature: signature
      };

      if (cellNumber) {
        formData.cell_number = cellNumber;
      }

      if (userId && userId !== 'guest' && userId.length <= 255) {
        formData.custom_str1 = userId;
      }

      console.log('=== PayFast Payment Request Summary ===');
      console.log('Order ID:', orderId);
      console.log('Amount:', amountString);
      console.log('Test Mode:', this.config.testMode);
      console.log('URL:', this.paymentUrl);
      console.log('Signature:', signature);
      console.log('Form data fields:', Object.keys(formData).length);
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