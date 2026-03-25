const express = require('express');
const request = require('supertest');

// ── Mock all external dependencies ──
jest.mock('../../../firebase', () => {
  const mock = {
    firestore: jest.fn(),
    auth: jest.fn(),
  };
  mock.firestore.FieldValue = { serverTimestamp: jest.fn(() => 'MOCK_TS') };
  return mock;
});

jest.mock('../../middleware/auth', () => {
  // Default: authenticated user
  return jest.fn((req, res, next) => {
    req.user = { uid: 'user-1', isAdmin: false };
    next();
  });
});

jest.mock('../../services/ozowService', () => ({
  createPaymentRequest: jest.fn(),
  processNotification: jest.fn(),
}));

jest.mock('../../utils/notificationHelper', () => ({
  sendOrderStatusMessage: jest.fn().mockResolvedValue(),
}));

const admin = require('../../../firebase');
const authenticateToken = require('../../middleware/auth');
const ozowService = require('../../services/ozowService');
const { sendOrderStatusMessage } = require('../../utils/notificationHelper');
const paymentRoutes = require('../paymentRoutes');

// ── Build a small Express app with the payment router ──
function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/api/payment', paymentRoutes);
  return app;
}

// ═══════════════════════════════════════════════
// POST /api/payment/process/:orderId
// ═══════════════════════════════════════════════
describe('POST /api/payment/process/:orderId', () => {
  let app;
  let mockOrderDoc;
  let mockUpdate;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();

    mockOrderDoc = {
      exists: true,
      data: () => ({ userId: 'user-1', total: 150, email: 'a@b.com' }),
    };
    mockUpdate = jest.fn().mockResolvedValue();

    admin.firestore.mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue(mockOrderDoc),
          update: mockUpdate,
        })),
      })),
    });

    ozowService.createPaymentRequest.mockReturnValue({
      formData: { SiteCode: 'TST', Amount: '150.00' },
      url: 'https://stagingpay.ozow.com',
      paymentId: 'ORD-1',
    });

    // Reset auth mock to default authenticated user
    authenticateToken.mockImplementation((req, res, next) => {
      req.user = { uid: 'user-1', isAdmin: false };
      next();
    });
  });

  test('returns 200 with payment data for valid order owner', async () => {
    const res = await request(app)
      .post('/api/payment/process/ORD-1')
      .set('Authorization', 'Bearer valid-token')
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('formData');
    expect(res.body).toHaveProperty('url', 'https://stagingpay.ozow.com');
    expect(ozowService.createPaymentRequest).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ paymentInitiated: true, paymentProvider: 'ozow' })
    );
  });

  test('returns 404 when order does not exist', async () => {
    mockOrderDoc.exists = false;

    const res = await request(app)
      .post('/api/payment/process/ORD-MISSING')
      .set('Authorization', 'Bearer valid-token')
      .send();

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Order not found');
  });

  test('returns 403 when user does not own the order', async () => {
    authenticateToken.mockImplementation((req, res, next) => {
      req.user = { uid: 'other-user', isAdmin: false };
      next();
    });

    const res = await request(app)
      .post('/api/payment/process/ORD-1')
      .set('Authorization', 'Bearer valid-token')
      .send();

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/not authorized/i);
  });

  test('allows admin to process any order', async () => {
    authenticateToken.mockImplementation((req, res, next) => {
      req.user = { uid: 'admin-user', isAdmin: true };
      next();
    });

    const res = await request(app)
      .post('/api/payment/process/ORD-1')
      .set('Authorization', 'Bearer admin-token')
      .send();

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('formData');
  });

  test('returns 500 when ozowService throws', async () => {
    ozowService.createPaymentRequest.mockImplementation(() => {
      throw new Error('Ozow config missing');
    });

    const res = await request(app)
      .post('/api/payment/process/ORD-1')
      .set('Authorization', 'Bearer valid-token')
      .send();

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Ozow config missing/);
  });
});

// ═══════════════════════════════════════════════
// POST /api/payment/notify (Ozow callback)
// ═══════════════════════════════════════════════
describe('POST /api/payment/notify', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  test('returns 200 and sends notification on successful processing', async () => {
    ozowService.processNotification.mockResolvedValue({
      success: true,
      orderId: 'ORD-1',
      status: 'Complete',
      newOrderStatus: 'pending',
      userId: 'user-1',
    });

    const res = await request(app)
      .post('/api/payment/notify')
      .type('form')
      .send({
        TransactionReference: 'ORD-1',
        Status: 'Complete',
        TransactionId: 'txn-001',
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/processed successfully/i);
    expect(sendOrderStatusMessage).toHaveBeenCalledWith('user-1', 'ORD-1', 'pending');
  });

  test('returns 200 with JSON body too', async () => {
    ozowService.processNotification.mockResolvedValue({
      success: true,
      orderId: 'ORD-2',
      status: 'Complete',
      newOrderStatus: 'pending',
      userId: 'user-2',
    });

    const res = await request(app)
      .post('/api/payment/notify')
      .set('Content-Type', 'application/json')
      .send({
        TransactionReference: 'ORD-2',
        Status: 'Complete',
        TransactionId: 'txn-002',
      });

    expect(res.status).toBe(200);
  });

  test('returns 400 when processing fails', async () => {
    ozowService.processNotification.mockResolvedValue({
      success: false,
      error: 'Invalid hash',
    });

    const res = await request(app)
      .post('/api/payment/notify')
      .type('form')
      .send({ Status: 'Complete' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid hash');
  });

  test('still returns 200 even if user notification fails', async () => {
    ozowService.processNotification.mockResolvedValue({
      success: true,
      orderId: 'ORD-3',
      status: 'Complete',
      newOrderStatus: 'pending',
      userId: 'user-3',
    });
    sendOrderStatusMessage.mockRejectedValue(new Error('FCM error'));

    const res = await request(app)
      .post('/api/payment/notify')
      .type('form')
      .send({ TransactionReference: 'ORD-3', Status: 'Complete' });

    // Should still return 200 — notification failure is non-blocking
    expect(res.status).toBe(200);
  });

  test('skips user notification when userId is absent', async () => {
    ozowService.processNotification.mockResolvedValue({
      success: true,
      orderId: 'ORD-4',
      status: 'Cancelled',
      newOrderStatus: 'cancelled',
      userId: null,
    });

    const res = await request(app)
      .post('/api/payment/notify')
      .type('form')
      .send({ TransactionReference: 'ORD-4', Status: 'Cancelled' });

    expect(res.status).toBe(200);
    expect(sendOrderStatusMessage).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════
// GET /api/payment/status/:orderId
// ═══════════════════════════════════════════════
describe('GET /api/payment/status/:orderId', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();

    authenticateToken.mockImplementation((req, res, next) => {
      req.user = { uid: 'user-1', isAdmin: false };
      next();
    });

    admin.firestore.mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              userId: 'user-1',
              status: 'pending',
              paymentStatus: 'paid',
              paymentCompleted: true,
              ozow_transaction_id: 'txn-001',
              transaction_id: 'txn-001',
            }),
          }),
        })),
      })),
    });
  });

  test('returns payment status for order owner', async () => {
    const res = await request(app)
      .get('/api/payment/status/ORD-1')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      orderId: 'ORD-1',
      status: 'pending',
      paymentStatus: 'paid',
      paymentCompleted: true,
      ozow_transaction_id: 'txn-001',
      transaction_id: 'txn-001',
    });
  });

  test('returns 404 for non-existent order', async () => {
    admin.firestore.mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({ exists: false }),
        })),
      })),
    });

    const res = await request(app)
      .get('/api/payment/status/ORD-MISSING')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });

  test('returns 403 for non-owner, non-admin user', async () => {
    authenticateToken.mockImplementation((req, res, next) => {
      req.user = { uid: 'other-user', isAdmin: false };
      next();
    });

    const res = await request(app)
      .get('/api/payment/status/ORD-1')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(403);
  });
});
