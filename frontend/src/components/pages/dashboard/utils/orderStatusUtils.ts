export const ORDER_STATUS_CONFIG = {
  VALID_STATUSES: ['pending', 'processing', 'in transit', 'completed'],
  BUYER_VISIBLE_STATUSES: ['processing'],
  EXCLUDED_STATUSES: ['pending_payment', 'cancelled']
} as const;

export type ValidOrderStatus = typeof ORDER_STATUS_CONFIG.VALID_STATUSES[number];
export type BuyerVisibleStatus = typeof ORDER_STATUS_CONFIG.BUYER_VISIBLE_STATUSES[number];

/**
 * Check if an order status is valid for business calculations
 */
export const isValidOrderStatus = (status: string): boolean => {
  return ORDER_STATUS_CONFIG.VALID_STATUSES.includes(status.toLowerCase() as ValidOrderStatus);
};

/**
 * Check if an order status should be visible to buyers
 */
export const isBuyerVisibleStatus = (status: string): boolean => {
  return ORDER_STATUS_CONFIG.BUYER_VISIBLE_STATUSES.includes(status.toLowerCase() as BuyerVisibleStatus);
};

/**
 * Filter orders for business calculations (excludes pending_payment and cancelled)
 */
export const filterOrdersForCalculations = <T extends { status: string }>(orders: T[]): T[] => {
  return orders.filter(order => isValidOrderStatus(order.status));
};

/**
 * Filter orders for buyer visibility (only processing orders)
 */
export const filterOrdersForBuyers = <T extends { status: string }>(orders: T[]): T[] => {
  return orders.filter(order => isBuyerVisibleStatus(order.status));
};

export const filterOrdersForProcurement = <T extends { status: string }>(orders: T[]): T[] => {
  return orders.filter(order => 
    order.status && order.status.toLowerCase() === 'processing'
  );
};