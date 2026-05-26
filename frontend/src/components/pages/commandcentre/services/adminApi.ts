import { api } from '../../../../utils/api';

// ─── Store ────────────────────────────────────────────────────────────────────

export interface AdminStore {
  id: string;
  name: string;
  tagline: string;
  initials: string;
  color: string;
  logoUrl?: string;
  address: string;
  lat: number;
  lng: number;
  active: boolean;
}

export type StoreForm = Omit<AdminStore, 'id'> & { id?: string };

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface AdminOrder {
  id: string;
  order_number: string;
  user_id?: string;
  store_id: string;
  status: string;
  delivery_fee: number;
  total: number;
  driver_id?: string;
  created_at: string;
  updated_at: string;
}

// ─── Payments ────────────────────────────────────────────────────────────────

export interface AdminPayment {
  id: string;
  order_id: string;
  user_id?: string;
  amount: number;
  status: string;
  ozow_transaction_id?: string;
  created_at: string;
  updated_at: string;
}

// ─── Receipts ────────────────────────────────────────────────────────────────

export interface AdminReceipt {
  id: string;
  orderId: string;
  blobUrl: string;
  storeName?: string;
  total?: number;
  weightClass: string;
  qualityScore: number;
  /** pending | confirmed | rejected */
  status?: string;
  adminNote?: string;
  reviewedAt?: string;
  parsedAt: string;
}

// ─── Drivers ─────────────────────────────────────────────────────────────────

export interface AdminDriver {
  driverId: string;
  name: string;
  phone: string;
  completedTrips: number;
  estimatedPayout: number;
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface DashboardSummary {
  ordersThisWeek: number;
  activeDeliveries: number;
  pendingReceipts: number;
  weeklyRevenue: number;
  recentOrders: AdminOrder[];
}

export interface MetricsSummary {
  period: string;
  totalOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  deliveryRate: number;
  cancellationRate: number;
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

export interface PricingConfigForm {
  baseFare: number;
  lightRatePerKm: number;
  mediumRatePerKm: number;
  heavyRatePerKm: number;
  bulkRatePerKm: number;
  lightWeightFee: number;
  mediumWeightFee: number;
  heavyWeightFee: number;
  bulkWeightFee: number;
  rushMultiplier: number;
  poolDiscount: number;
  minimumFare: number;
  /** Flat amount added to every delivery to cover current fuel cost (ZAR). */
  fuelLevy: number;
  /** Admin-managed keyword → kg/unit overrides supplementing the OCR service defaults. */
  weightOverrides: Record<string, number>;
  petrolNote?: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface UserNotification {
  id: string;
  userId: string;
  type: 'order' | 'order_status' | 'driver_alert' | 'delivery_pin';
  title: string;
  body: string;
  imageUrl?: string;
  orderId?: string;
  orderStatus?: string;
  includeRating: boolean;
  pin?: string;
  read: boolean;
  createdAt: string;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const adminApi = {
  // ── Stores ──────────────────────────────────────────────────────────────────
  getStores: () =>
    api.get<AdminStore[]>('/api/admin/stores').then(r => r.data),

  uploadStoreLogo: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ url: string }>('/api/admin/upload-logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data.url);
  },

  createStore: (store: StoreForm) =>
    api.post<AdminStore>('/api/stores', store).then(r => r.data),

  updateStore: (id: string, store: StoreForm) =>
    api.put<AdminStore>(`/api/stores/${id}`, { ...store, id }).then(r => r.data),

  deactivateStore: (id: string) =>
    api.patch<AdminStore>(`/api/stores/${id}/deactivate`).then(r => r.data),

  activateStore: (id: string) =>
    api.patch<AdminStore>(`/api/stores/${id}/activate`).then(r => r.data),

  deleteStore: (id: string) =>
    api.delete(`/api/stores/${id}`),

  // ── Dashboard ────────────────────────────────────────────────────────────────
  getDashboard: () =>
    api.get<DashboardSummary>('/api/admin/dashboard').then(r => r.data),

  // ── Orders ───────────────────────────────────────────────────────────────────
  getOrders: (status?: string) =>
    api.get<{ orders: AdminOrder[] }>('/api/admin/orders', { params: { status, limit: 100 } })
      .then(r => r.data.orders),

  // ── Payments ─────────────────────────────────────────────────────────────────
  getPayments: () =>
    api.get<{ payments: AdminPayment[] }>('/api/admin/payments', { params: { limit: 100 } })
      .then(r => r.data.payments),

  // ── Receipts ─────────────────────────────────────────────────────────────────
  getReceipts: (status?: string) =>
    api.get<{ receipts: AdminReceipt[] }>('/api/admin/receipts', { params: { status } })
      .then(r => r.data.receipts),

  reviewReceipt: (id: string, status: 'confirmed' | 'rejected', note?: string) =>
    api.patch<AdminReceipt>(`/api/admin/receipts/${id}`, { status, note }).then(r => r.data),

  // ── Deliveries ───────────────────────────────────────────────────────────────
  getDeliveries: () =>
    api.get<{ deliveries: AdminOrder[] }>('/api/admin/deliveries').then(r => r.data.deliveries),

  assignDriver: (orderId: string, driverId: string) =>
    api.patch<AdminOrder>(`/api/admin/deliveries/${orderId}/assign`, { driverId }).then(r => r.data),

  // ── Driver revenue ───────────────────────────────────────────────────────────
  getDriverRevenue: () =>
    api.get<{ drivers: AdminDriver[] }>('/api/admin/drivers/revenue').then(r => r.data.drivers),

  // ── Metrics ──────────────────────────────────────────────────────────────────
  getMetrics: () =>
    api.get<MetricsSummary>('/api/admin/metrics').then(r => r.data),

  // ── Pricing ──────────────────────────────────────────────────────────────────
  getPricing: () =>
    api.get<PricingConfigForm>('/api/admin/pricing').then(r => r.data),

  savePricing: (config: PricingConfigForm) =>
    api.put<PricingConfigForm>('/api/admin/pricing', config).then(r => r.data),
};

// ─── User-facing notification calls (used by messagesPage) ───────────────────

export const notificationApi = {
  getAll: () =>
    api.get<{ notifications: UserNotification[] }>('/api/notifications')
      .then(r => r.data.notifications),

  getUnreadCount: () =>
    api.get<{ count: number }>('/api/notifications/unread-count').then(r => r.data.count),

  markRead: (id: string) =>
    api.patch<UserNotification>(`/api/notifications/${id}/read`).then(r => r.data),

  markAllRead: () =>
    api.patch<{ updated: number }>('/api/notifications/read-all').then(r => r.data),
};
