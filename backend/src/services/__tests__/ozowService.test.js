const crypto = require('crypto');

// ── Set env vars BEFORE anything else ──
const TEST_SITE_CODE = 'TST-00001';
const TEST_PRIVATE_KEY = 'test-private-key-12345';
const TEST_API_KEY = 'test-api-key-67890';

process.env.OZOW_SITE_CODE = TEST_SITE_CODE;
process.env.OZOW_PRIVATE_KEY = TEST_PRIVATE_KEY;
process.env.OZOW_API_KEY = TEST_API_KEY;
process.env.OZOW_IS_TEST = 'true';
process.env.OZOW_SUCCESS_URL = 'https://example.com/success';
process.env.OZOW_CANCEL_URL = 'https://example.com/cancel';
process.env.OZOW_ERROR_URL = 'https://example.com/error';
process.env.OZOW_NOTIFY_URL = 'https://example.com/notify';

// ── Mock firebase-admin ──
jest.mock('../../../firebase', () => {
  const mock = {
    firestore: jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(),
          update: jest.fn(),
        })),
        add: jest.fn(),
      })),
    })),
  };
  mock.firestore.FieldValue = { serverTimestamp: jest.fn(() => 'MOCK_TIMESTAMP') };
  return mock;
});

// Mock axios
jest.mock('axios');
const axios = require('axios');

// Now require the service (picks up env vars + mocks)
const OzowService = require('../ozowService');

// ─────────────────────────────────────────────
// Helper: compute expected SHA512 exactly as Ozow requires
// ─────────────────────────────────────────────
function sha512(input) {
  return crypto.createHash('sha512').update(input.toLowerCase()).digest('hex');
}

// ═══════════════════════════════════════════════
// 1. Configuration
// ═══════════════════════════════════════════════
describe('OzowService — configuration', () => {
  test('reads site code and private key from env', () => {
    expect(OzowService.config.siteCode).toBe(TEST_SITE_CODE);
    expect(OzowService.config.privateKey).toBe(TEST_PRIVATE_KEY);
    expect(OzowService.config.apiKey).toBe(TEST_API_KEY);
  });

  test('uses staging URLs when isTest is true', () => {
    expect(OzowService.config.isTest).toBe(true);
    expect(OzowService.paymentUrl).toBe('https://stagingpay.ozow.com');
    expect(OzowService.apiUrl).toBe('https://stagingapi.ozow.com');
  });
});

// ═══════════════════════════════════════════════
// 2. Request hash generation
// ═══════════════════════════════════════════════
describe('OzowService — generateRequestHash', () => {
  const baseData = {
    SiteCode: TEST_SITE_CODE,
    CountryCode: 'ZA',
    CurrencyCode: 'ZAR',
    Amount: '150.00',
    TransactionReference: 'ORD-12345',
    BankReference: 'LZA-12345',
    Optional1: 'user-abc',
    Optional2: 'user@example.com',
    Optional3: '',
    Optional4: '',
    Optional5: '',
    CancelUrl: 'https://example.com/cancel/ORD-12345',
    ErrorUrl: 'https://example.com/error/ORD-12345',
    SuccessUrl: 'https://example.com/success/ORD-12345',
    NotifyUrl: 'https://example.com/notify',
    IsTest: 'true',
  };

  test('returns a valid SHA512 hex string (128 chars)', () => {
    const hash = OzowService.generateRequestHash(baseData);
    expect(hash).toMatch(/^[0-9a-f]{128}$/);
  });

  test('matches manually computed SHA512 of concatenated fields', () => {
    const expected = sha512(
      baseData.SiteCode +
      baseData.CountryCode +
      baseData.CurrencyCode +
      baseData.Amount +
      baseData.TransactionReference +
      baseData.BankReference +
      baseData.Optional1 +
      baseData.Optional2 +
      '' + '' + '' +
      baseData.CancelUrl +
      baseData.ErrorUrl +
      baseData.SuccessUrl +
      baseData.NotifyUrl +
      baseData.IsTest +
      TEST_PRIVATE_KEY
    );
    expect(OzowService.generateRequestHash(baseData)).toBe(expected);
  });

  test('hash changes when amount differs', () => {
    const hash1 = OzowService.generateRequestHash(baseData);
    const hash2 = OzowService.generateRequestHash({ ...baseData, Amount: '200.00' });
    expect(hash1).not.toBe(hash2);
  });

  test('hash changes when TransactionReference differs', () => {
    const hash1 = OzowService.generateRequestHash(baseData);
    const hash2 = OzowService.generateRequestHash({ ...baseData, TransactionReference: 'ORD-99999' });
    expect(hash1).not.toBe(hash2);
  });
});

// ═══════════════════════════════════════════════
// 3. Notification hash generation & verification
// ═══════════════════════════════════════════════
describe('OzowService — notification hash', () => {
  const notifData = {
    SiteCode: TEST_SITE_CODE,
    TransactionId: 'txn-001',
    TransactionReference: 'ORD-12345',
    Amount: '150.00',
    Status: 'Complete',
    Optional1: '',
    Optional2: '',
    Optional3: '',
    Optional4: '',
    Optional5: '',
    CurrencyCode: 'ZAR',
    IsTest: 'true',
    StatusMessage: '',
  };

  test('generateNotificationHash returns valid SHA512', () => {
    const hash = OzowService.generateNotificationHash(notifData);
    expect(hash).toMatch(/^[0-9a-f]{128}$/);
  });

  test('verifyNotificationHash returns true for correct Hash', () => {
    const correctHash = OzowService.generateNotificationHash(notifData);
    expect(OzowService.verifyNotificationHash({ ...notifData, Hash: correctHash })).toBe(true);
  });

  test('verifyNotificationHash returns true for correct HashCheck', () => {
    const correctHash = OzowService.generateNotificationHash(notifData);
    expect(OzowService.verifyNotificationHash({ ...notifData, HashCheck: correctHash })).toBe(true);
  });

  test('verifyNotificationHash returns false for tampered data', () => {
    const correctHash = OzowService.generateNotificationHash(notifData);
    const tampered = { ...notifData, Amount: '999.00', Hash: correctHash };
    expect(OzowService.verifyNotificationHash(tampered)).toBe(false);
  });

  test('verifyNotificationHash returns false for garbage hash', () => {
    expect(OzowService.verifyNotificationHash({ ...notifData, Hash: 'badhash' })).toBe(false);
  });
});

// ═══════════════════════════════════════════════
// 4. createPaymentRequest
// ═══════════════════════════════════════════════
describe('OzowService — createPaymentRequest', () => {
  test('returns formData, url, and paymentId', () => {
    const orderData = { total: 250, email: 'buyer@test.com' };
    const result = OzowService.createPaymentRequest(orderData, 'ORD-ABCDEFGH', 'user-123');

    expect(result).toHaveProperty('formData');
    expect(result).toHaveProperty('url', 'https://stagingpay.ozow.com');
    expect(result).toHaveProperty('paymentId', 'ORD-ABCDEFGH');
  });

  test('formData has all required Ozow fields', () => {
    const orderData = { total: 100, email: 'test@test.com' };
    const { formData } = OzowService.createPaymentRequest(orderData, 'ORD-00000001', 'uid-1');

    expect(formData.SiteCode).toBe(TEST_SITE_CODE);
    expect(formData.CountryCode).toBe('ZA');
    expect(formData.CurrencyCode).toBe('ZAR');
    expect(formData.Amount).toBe('100.00');
    expect(formData.TransactionReference).toBe('ORD-00000001');
    expect(formData.BankReference).toBe('LZA-00000001');
    expect(formData.Optional1).toBe('uid-1');
    expect(formData.Optional2).toBe('test@test.com');
    expect(formData.IsTest).toBe('true');
    expect(formData.HashCheck).toMatch(/^[0-9a-f]{128}$/);
  });

  test('formats amount to 2 decimal places', () => {
    const { formData } = OzowService.createPaymentRequest({ total: 99.9 }, 'ORD-12345678', 'u1');
    expect(formData.Amount).toBe('99.90');
  });

  test('appends orderId to success/cancel/error URLs', () => {
    const { formData } = OzowService.createPaymentRequest({ total: 50 }, 'ORD-XYZXYZXY', 'u1');
    expect(formData.SuccessUrl).toBe('https://example.com/success/ORD-XYZXYZXY');
    expect(formData.CancelUrl).toBe('https://example.com/cancel/ORD-XYZXYZXY');
    expect(formData.ErrorUrl).toBe('https://example.com/error/ORD-XYZXYZXY');
  });

  test('throws when total is 0', () => {
    expect(() => OzowService.createPaymentRequest({ total: 0 }, 'ORD-10000001', 'u1'))
      .toThrow('Invalid order amount');
  });

  test('throws when total is negative', () => {
    expect(() => OzowService.createPaymentRequest({ total: -10 }, 'ORD-10000001', 'u1'))
      .toThrow('Invalid order amount');
  });

  test('throws when siteCode is missing', () => {
    const origSiteCode = OzowService.config.siteCode;
    OzowService.config.siteCode = '';
    expect(() => OzowService.createPaymentRequest({ total: 100 }, 'ORD-10000001', 'u1'))
      .toThrow('SiteCode or PrivateKey is not configured');
    OzowService.config.siteCode = origSiteCode;
  });
});

// ═══════════════════════════════════════════════
// 5. checkTransactionStatus
// ═══════════════════════════════════════════════
describe('OzowService — checkTransactionStatus', () => {
  beforeEach(() => {
    axios.get.mockReset();
  });

  test('calls Ozow API with correct params and headers', async () => {
    axios.get.mockResolvedValue({ data: { status: 'Complete' } });

    await OzowService.checkTransactionStatus('ORD-123');

    expect(axios.get).toHaveBeenCalledWith(
      'https://stagingapi.ozow.com/GetTransactionByReference',
      expect.objectContaining({
        params: { siteCode: TEST_SITE_CODE, transactionReference: 'ORD-123' },
        headers: { Accept: 'application/json', ApiKey: TEST_API_KEY },
        timeout: 10000,
      })
    );
  });

  test('returns API response data on success', async () => {
    axios.get.mockResolvedValue({ data: { status: 'Complete', amount: '150.00' } });
    const result = await OzowService.checkTransactionStatus('ORD-123');
    expect(result).toEqual({ status: 'Complete', amount: '150.00' });
  });

  test('returns null on API error', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));
    const result = await OzowService.checkTransactionStatus('ORD-123');
    expect(result).toBeNull();
  });
});

// ═══════════════════════════════════════════════
// 6. processNotification — full flow
// ═══════════════════════════════════════════════
describe('OzowService — processNotification', () => {
  let mockOrderRef;
  let mockOrderDoc;
  let mockAdd;

  beforeEach(() => {
    axios.get.mockReset();

    mockOrderDoc = { exists: true, data: () => ({ userId: 'user-1', status: 'pending_payment' }) };
    mockOrderRef = { get: jest.fn().mockResolvedValue(mockOrderDoc), update: jest.fn().mockResolvedValue() };
    mockAdd = jest.fn().mockResolvedValue({ id: 'notif-1' });

    const mockAdmin = require('../../../firebase');
    mockAdmin.firestore.mockReturnValue({
      collection: jest.fn((name) => {
        if (name === 'orders') return { doc: jest.fn().mockReturnValue(mockOrderRef) };
        if (name === 'payment_notifications') return { add: mockAdd };
        return { doc: jest.fn(), add: jest.fn() };
      }),
    });

    // Default: Ozow API confirms the status
    axios.get.mockResolvedValue({ data: { status: 'Complete' } });
  });

  function buildNotification(overrides = {}) {
    const base = {
      SiteCode: TEST_SITE_CODE,
      TransactionId: 'txn-001',
      TransactionReference: 'ORD-12345',
      Amount: '150.00',
      Status: 'Complete',
      Optional1: '',
      Optional2: '',
      Optional3: '',
      Optional4: '',
      Optional5: '',
      CurrencyCode: 'ZAR',
      IsTest: 'true',
      StatusMessage: '',
    };
    const merged = { ...base, ...overrides };
    merged.Hash = OzowService.generateNotificationHash(merged);
    return merged;
  }

  test('processes successful Complete notification', async () => {
    const data = buildNotification({ Status: 'Complete' });
    const result = await OzowService.processNotification(data);

    expect(result.success).toBe(true);
    expect(result.orderId).toBe('ORD-12345');
    expect(result.status).toBe('Complete');
    expect(result.newOrderStatus).toBe('pending');
    expect(mockOrderRef.update).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentStatus: 'paid',
        paymentCompleted: true,
        status: 'pending',
        ozow_transaction_id: 'txn-001',
      })
    );
  });

  test('processes Cancelled notification', async () => {
    axios.get.mockResolvedValue({ data: { status: 'Cancelled' } });
    const data = buildNotification({ Status: 'Cancelled' });
    const result = await OzowService.processNotification(data);

    expect(result.success).toBe(true);
    expect(result.newOrderStatus).toBe('cancelled');
    expect(mockOrderRef.update).toHaveBeenCalledWith(
      expect.objectContaining({ paymentStatus: 'cancelled', status: 'cancelled' })
    );
  });

  test('processes Error notification', async () => {
    axios.get.mockResolvedValue({ data: { status: 'Error' } });
    const data = buildNotification({ Status: 'Error' });
    const result = await OzowService.processNotification(data);

    expect(result.success).toBe(true);
    expect(result.newOrderStatus).toBe('payment_failed');
  });

  test('processes Abandoned notification', async () => {
    axios.get.mockResolvedValue({ data: { status: 'Abandoned' } });
    const data = buildNotification({ Status: 'Abandoned' });
    const result = await OzowService.processNotification(data);

    expect(result.success).toBe(true);
    expect(result.newOrderStatus).toBe('cancelled');
  });

  test('processes PendingInvestigation notification', async () => {
    axios.get.mockResolvedValue({ data: { status: 'PendingInvestigation' } });
    const data = buildNotification({ Status: 'PendingInvestigation' });
    const result = await OzowService.processNotification(data);

    expect(result.success).toBe(true);
    expect(result.newOrderStatus).toBe('pending_payment');
  });

  test('rejects notification with invalid hash', async () => {
    const data = buildNotification();
    data.Hash = 'tampered_hash_value';
    const result = await OzowService.processNotification(data);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid hash');
  });

  test('rejects notification with wrong site code', async () => {
    const data = buildNotification({ SiteCode: 'WRONG-CODE' });
    const result = await OzowService.processNotification(data);
    expect(result.success).toBe(false);
  });

  test('rejects when API status disagrees with notification', async () => {
    axios.get.mockResolvedValue({ data: { status: 'Cancelled' } });
    const data = buildNotification({ Status: 'Complete' });
    const result = await OzowService.processNotification(data);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Status mismatch');
  });

  test('rejects when order not found', async () => {
    mockOrderDoc.exists = false;
    const data = buildNotification();
    const result = await OzowService.processNotification(data);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Order not found');
  });

  test('logs payment notification for audit', async () => {
    const data = buildNotification();
    await OzowService.processNotification(data);

    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'ORD-12345',
        provider: 'ozow',
        verified: true,
      })
    );
  });

  test('continues if Ozow API check returns null (network issue)', async () => {
    axios.get.mockRejectedValue(new Error('timeout'));
    const data = buildNotification();
    const result = await OzowService.processNotification(data);

    expect(result.success).toBe(true);
  });
});
