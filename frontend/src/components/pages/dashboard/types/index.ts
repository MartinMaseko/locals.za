// Admin Dashboard Types
// This file centralizes all interface and type definitions used throughout the dashboard

/**
 * Admin user profile information
 */
export interface AdminProfile {
  full_name?: string;
  email: string;
  user_type: string;
}

/**
 * Order status types
 */
export type OrderStatus = 'pending' | 'processing' | 'in transit' | 'delivered' | 'cancelled' | 'completed';

/**
 * Missing item in an order
 * Used when an order item is partially or fully unavailable
 */
export interface MissingItem {
  productId: string;
  productName?: string;
  originalQty?: number;
  availableQty?: number;
  missingQuantity?: number;
  reason?: string;
}

/**
 * Individual item in an order
 */
export interface OrderItem {
  productId: string;
  product: any;
  qty: number;
}

/**
 * Complete order object
 */
export interface Order {
  id: string;
  userId: string;
  salon_id: string | null;
  items: OrderItem[];
  subtotal: number;
  serviceFee: number;
  total: number;
  deliveryAddress: any;
  status: OrderStatus;
  createdAt: any;
  updatedAt: any;
  driver_id?: string | null;
  missingItems?: MissingItem[];
  refundAmount?: number;
  adjustedTotal?: number;
  refundStatus?: 'pending' | 'processed' | 'credited';
  driverNote?: string;
  rating?: number;
  ratingComment?: string;
  ratedAt?: any;
}

/**
 * Dashboard statistics response
 */
export interface DashboardStats {
  serviceRevenue: number;
  orderRevenue: number;
  topProducts: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
}

/**
 * Stats API response type
 */
export type StatsResponse = {
  serviceRevenue?: number;
  orderRevenue?: number;
  driverRevenue?: number;
  salesRepRevenue?: number;
  topProducts?: Array<{ name: string; count: number; revenue: number }>;
};

/**
 * Driver form data
 */
export interface DriverFormData {
  driver_id: string;
  email: string;
  password: string;
  full_name: string;
  phone_number: string;
  vehicle_type: string;
  vehicle_model: string;
  bank_details: string;
  license_number: string;
  license_image: File | null;
}

/**
 * Product form data
 */
export interface ProductFormData {
  product_id: string;
  name: string;
  description: string;
  price: string;
  brand: string;
  category: string;
  image: File | null;
}

/**
 * Edit product form data
 */
export interface EditProductFormData {
  name: string;
  description: string;
  price: string;
  brand: string;
  category: string;
  imageFile: File | null;
  image_url: string;
}

/**
 * Customer details cached data
 */
export interface CustomerDetail {
  name: string;
  email?: string;
  phone?: string;
}

/**
 * Cashout request data
 */
export interface CashoutRequest {
  id: string;
  driverId: string;
  driverName?: string;
  amount: number;
  orderCount?: number;
  status: 'pending' | 'completed';
  createdAt: any;
  paidAt?: string;
}

/**
 * Payment history record for a driver
 */
export interface PaymentHistory {
  id: string;
  driverId: string;
  amount: number;
  orderCount?: number;
  status: 'pending' | 'completed';
  createdAt: any;
  paidAt?: string;
}

/**
 * Token cache for Firebase authentication
 */
export interface TokenCache {
  token: string | null;
  expiryTime: number;
  refreshPromise: Promise<string> | null;
}

/**
 * Active section type for the dashboard
 */
export type DashboardSection = 
  | 'dashboard' 
  | 'drivers' 
  | 'products' 
  | 'admin' 
  | 'orders' 
  | 'ProductManagement' 
  | 'ManageDrivers';

/**
 * Stats period filter type
 */
export type StatsPeriod = '30' | '60' | '90' | 'all';
