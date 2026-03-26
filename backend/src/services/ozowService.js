const crypto = require('crypto');
const axios = require('axios');
const admin = require('../../firebase');

/**
 * Ozow Pay-by-Bank Integration Service
 * Based on Ozow Hub documentation: https://hub.ozow.com/
 */
class OzowService {
  constructor() {
    this.config = {
      siteCode: String(process.env.OZOW_SITE_CODE || '').trim(),
      privateKey: String(process.env.OZOW_PRIVATE_KEY || '').trim(),
      apiKey: String(process.env.OZOW_API_KEY || '').trim(),
      isTest: process.env.OZOW_IS_TEST === 'true',
      successUrl: String(process.env.OZOW_SUCCESS_URL || '').trim(),
      cancelUrl: String(process.env.OZOW_CANCEL_URL || '').trim(),
      errorUrl: String(process.env.OZOW_ERROR_URL || '').trim(),
      notifyUrl: String(process.env.OZOW_NOTIFY_URL || '').trim(),
    };

    // Ozow API endpoints
    this.paymentUrl = this.config.isTest
      ? 'https://stagingpay.ozow.com'
      : 'https://pay.ozow.com';

    this.apiUrl = this.config.isTest
      ? 'https://stagingapi.ozow.com'
      : 'https://api.ozow.com';
  }

  /**
   * Generate SHA512 hash for Ozow request verification.
   * Ozow requires: concatenate specific fields in order + PrivateKey, then SHA512, lowercase.
   * 
   * Fields in order for payment request hash:
   * SiteCode + CountryCode + CurrencyCode + Amount + TransactionReference + 
   * BankReference + Optional3 + CancelUrl + ErrorUrl + SuccessUrl + NotifyUrl + IsTest + PrivateKey
   */
  generateRequestHash(data) {
    const hashString = [
      data.SiteCode,
      data.CountryCode,
      data.CurrencyCode,
      data.Amount,
      data.TransactionReference,
      data.BankReference,
      data.Optional1 || '',
      data.Optional2 || '',
      data.Optional3 || '',
      data.Optional4 || '',
      data.Optional5 || '',
      data.CancelUrl,
      data.ErrorUrl,
      data.SuccessUrl,
      data.NotifyUrl,
      data.IsTest,
      this.config.privateKey,
    ].join('');

    const hash = crypto.createHash('sha512').update(hashString.toLowerCase()).digest('hex');

    console.log('\n=== Ozow Hash Generation ===');
    console.log('Hash input (redacted key):', hashString.replace(this.config.privateKey, '***'));
    console.log('Generated hash:', hash);
    console.log('============================\n');

    return hash;
  }

  /**
   * Generate SHA512 hash for notification verification.
   * 
   * Fields for notification hash:
   * SiteCode + TransactionId + TransactionReference + Amount + Status + 
   * Optional1 + Optional2 + Optional3 + Optional4 + Optional5 + CurrencyCode + 
   * IsTest + StatusMessage + PrivateKey
   */
  generateNotificationHash(data) {
    const hashString = [
      data.SiteCode,
      data.TransactionId,
      data.TransactionReference,
      data.Amount,
      data.Status,
      data.Optional1 || '',
      data.Optional2 || '',
      data.Optional3 || '',
      data.Optional4 || '',
      data.Optional5 || '',
      data.CurrencyCode,
      data.IsTest,
      data.StatusMessage || '',
      this.config.privateKey,
    ].join('');

    return crypto.createHash('sha512').update(hashString.toLowerCase()).digest('hex');
  }

  /**
   * Creates payment request data for Ozow.
   * Returns URL + form fields to POST to Ozow.
   */
  createPaymentRequest(orderData, orderId, userId) {
    try {
      if (!this.config.siteCode || !this.config.privateKey) {
        throw new Error('Ozow SiteCode or PrivateKey is not configured.');
      }

      const amountString = parseFloat(orderData.total || 0).toFixed(2);

      if (parseFloat(amountString) <= 0) {
        throw new Error('Invalid order amount. Must be greater than zero.');
      }

      // Build Ozow payment request data
      const paymentData = {
        SiteCode: this.config.siteCode,
        CountryCode: 'ZA',
        CurrencyCode: 'ZAR',
        Amount: amountString,
        TransactionReference: orderId,
        BankReference: `LZA-${orderId.slice(-8)}`,
        Optional1: userId,
        Optional2: orderData.email || '',
        Optional3: '',
        Optional4: '',
        Optional5: '',
        CancelUrl: `${this.config.cancelUrl}/${orderId}`,
        ErrorUrl: `${this.config.errorUrl}/${orderId}`,
        SuccessUrl: `${this.config.successUrl}/${orderId}`,
        NotifyUrl: this.config.notifyUrl,
        IsTest: this.config.isTest.toString().toLowerCase(),
      };

      // Generate hash
      const hashCheck = this.generateRequestHash(paymentData);
      paymentData.HashCheck = hashCheck;

      console.log('=== Ozow Payment Request Summary ===');
      console.log('Payment data:', { ...paymentData, HashCheck: hashCheck.substring(0, 20) + '...' });
      console.log('=====================================');

      return {
        formData: paymentData,
        url: this.paymentUrl,
        paymentId: orderId,
      };
    } catch (error) {
      console.error('Error creating Ozow payment request:', error);
      throw error;
    }
  }

  /**
   * Verify notification hash from Ozow callback.
   */
  verifyNotificationHash(data) {
    try {
      const calculatedHash = this.generateNotificationHash(data);
      const receivedHash = (data.Hash || data.HashCheck || '').toLowerCase();

      console.log('=== Ozow Notification Hash Verification ===');
      console.log('Received:', receivedHash);
      console.log('Calculated:', calculatedHash);
      console.log('Match:', calculatedHash === receivedHash);
      console.log('============================================');

      return calculatedHash === receivedHash;
    } catch (error) {
      console.error('Hash verification error:', error);
      return false;
    }
  }

  /**
   * Check transaction status via Ozow API (Step 3 - recommended).
   * GET /GetTransactionByReference?siteCode={siteCode}&transactionReference={ref}
   */
  async checkTransactionStatus(transactionReference) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/GetTransactionByReference`,
        {
          params: {
            siteCode: this.config.siteCode,
            transactionReference: transactionReference,
          },
          headers: {
            Accept: 'application/json',
            ApiKey: this.config.apiKey,
          },
          timeout: 10000,
        }
      );

      console.log('Ozow status check response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Ozow status check error:', error.message);
      return null;
    }
  }

  /**
   * Process Ozow notification callback.
   * 
   * Ozow notification statuses:
   * - "Complete" = payment successful
   * - "Cancelled" = user cancelled
   * - "Error" = payment error
   * - "Abandoned" = user abandoned
   * - "PendingInvestigation" = under review
   */
  async processNotification(data) {
    try {
      console.log('=== Processing Ozow Notification ===');
      console.log('TransactionReference:', data.TransactionReference);
      console.log('Status:', data.Status);
      console.log('TransactionId:', data.TransactionId);

      // Step 1: Verify hash
      if (!this.verifyNotificationHash(data)) {
        console.error('Invalid hash');
        return { success: false, error: 'Invalid hash' };
      }

      // Step 2: Verify site code matches
      if (data.SiteCode !== this.config.siteCode) {
        console.error('Site code mismatch');
        return { success: false, error: 'Site code mismatch' };
      }

      // Step 3 (recommended): Verify with Ozow API
      const apiStatus = await this.checkTransactionStatus(data.TransactionReference);
      if (apiStatus && apiStatus.status && 
          apiStatus.status.toLowerCase() !== data.Status.toLowerCase()) {
        console.error('Status mismatch between notification and API');
        return { success: false, error: 'Status mismatch' };
      }

      const orderId = data.TransactionReference;
      if (!orderId) {
        return { success: false, error: 'Missing order ID (TransactionReference)' };
      }

      // Update order in database
      const orderRef = admin.firestore().collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        return { success: false, error: 'Order not found' };
      }

      // Log notification for audit
      await admin.firestore().collection('payment_notifications').add({
        orderId,
        paymentData: data,
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        provider: 'ozow',
        environment: this.config.isTest ? 'staging' : 'production',
        verified: true,
      });

      // Map Ozow status to your order status
      const ozowStatus = (data.Status || '').toLowerCase();
      const updateData = {
        paymentData: data,
        paymentProvider: 'ozow',
        paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        paymentVerified: true,
      };

      if (ozowStatus === 'complete') {
        updateData.status = 'pending';
        updateData.paymentStatus = 'paid';
        updateData.paymentCompleted = true;
        updateData.paymentCompletedAt = admin.firestore.FieldValue.serverTimestamp();
        updateData.ozow_transaction_id = data.TransactionId;
        updateData.transaction_id = data.TransactionId;
      } else if (ozowStatus === 'cancelled' || ozowStatus === 'abandoned') {
        updateData.status = 'cancelled';
        updateData.paymentStatus = 'cancelled';
      } else if (ozowStatus === 'error') {
        updateData.status = 'payment_failed';
        updateData.paymentStatus = 'failed';
      } else if (ozowStatus === 'pendinginvestigation') {
        updateData.status = 'pending_payment';
        updateData.paymentStatus = 'pending_investigation';
      }

      await orderRef.update(updateData);

      console.log('=== Notification processed successfully ===');

      return {
        success: true,
        orderId,
        status: data.Status,
        newOrderStatus: updateData.status,
        userId: orderDoc.data().userId,
      };
    } catch (error) {
      console.error('Ozow notification processing error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new OzowService();