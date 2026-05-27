import ShopriteLogo from '../../../assets/images/shopriteCash&CarryLogo.jpg';
import SACashCarryLogo from '../../../assets/images/sacc.png';

// ─── Store ────────────────────────────────────────────────────────────────────

export interface Store {
  id: string;
  name: string;
  tagline: string;
  initials: string;
  color: string;
  logo?: string;     // local module asset (fallback STORES array)
  logoUrl?: string;  // Azure Blob URL (API-fetched stores)
  address?: string;   // used by Maps / Quote API as pickup origin
  lat?: number;
  lng?: number;
}

// ─── OCR result (matches /api/receipts/parse response) ───────────────────────

export interface OcrResultItem {
  description: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  estimatedKg: number;
}

export interface OcrResult {
  blobUrl: string;
  orderNumber?: string;
  storeName?: string;
  date?: string;
  subtotal?: number;
  total?: number;
  items: OcrResultItem[];
  estimatedWeightKg: number;
  /** "light" | "medium" | "heavy" | "bulk" */
  weightClass: string;
  /** 0–1 confidence score — warn user to re-upload if below 0.6 */
  qualityScore: number;
  warnings: string[];
}

// ─── Delivery quote (matches /api/quotes/delivery response) ──────────────────

export interface DeliveryQuote {
  baseFare: number;
  distanceKm: number;
  ratePerKm: number;
  weightFee: number;
  weightClass: string;
  isRush: boolean;
  isPool: boolean;
  rushMultiplier: number;
  poolDiscount: number;
  totalFee: number;
  estimatedMinutes: number;
  // Azure Maps route data — used by the frontend map component
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  /** Route polyline as [longitude, latitude] pairs (GeoJSON order). */
  routePoints: [number, number][];
}

// ─── Order state (travels through the WholesaleLayout funnel) ─────────────────

export interface OrderState {
  store: Store | null;
  // Step 2 — receipt upload & customer info
  customerName: string;
  contactNumber: string;
  address: string;           // delivery address
  receiptBlobUrls: string[]; // client-side preview URLs (object URLs) from uploaded images
  // Step 3 — delivery quote from API
  deliveryQuote: DeliveryQuote | null;
  // Step 4 — payment
  orderId: string | null;
  orderNumber: string;
}

// ─── Data shape UploadReceipt passes up to WholesaleLayout ───────────────────

export interface ReceiptFormData {
  customerName: string;
  contactNumber: string;
  address: string;
  receiptBlobUrls: string[];
}

// ─── Context provided by WholesaleLayout to all child pages ──────────────────

export interface WholesaleOutletContext {
  order: OrderState;
  paymentSuccess: boolean;
  paying: boolean;
  payError: string | null;
  onSelectStore: (store: Store) => void;
  onConfirmStore: () => void;
  /** Called by UploadReceipt after the user confirms the review panel. */
  onSetReceiptData: (data: ReceiptFormData) => void;
  onProceedToDelivery: () => void;
  onAddressChange: (addr: string) => void;
  /** Called by DeliveryPage when the quote API returns successfully. */
  onSetDeliveryQuote: (quote: DeliveryQuote) => void;
  onProceedToPayment: () => void;
  onPay: () => Promise<void>;
  onRestart: () => void;
}

// ─── Fallback store list (shown while API loads or if API is unavailable) ─────

export const STORES: Store[] = [
  {
    id: 'shoprite',
    name: 'Shoprite Cash and Carry SW Vosloorus',
    tagline: 'Bulk groceries & essentials',
    initials: 'SR',
    color: '#FFE000',
    logo: ShopriteLogo,
  },
  {
    id: 'shoprite-springs',
    name: 'Shoprite Cash and Carry SW Springs',
    tagline: 'Spaza shop staples',
    initials: 'SS',
    color: '#FFE000',
    logo: ShopriteLogo,
  },
  {
    id: 'sa-cash-and-carry',
    name: 'SA Cash and Carry',
    tagline: 'Wholesale groceries & essentials',
    initials: 'SC',
    color: '#E30613',
    logo: SACashCarryLogo,
  },
  {
    id: 'metro-wholesale-soweto',
    name: 'Metro Wholesale Soweto',
    tagline: 'Everyday bulk staples',
    initials: 'MW',
    color: '#1565C0',
  },
  {
    id: 'katlehong-cash-carry',
    name: 'Katlehong Cash & Carry',
    tagline: 'Fresh produce & dry goods',
    initials: 'KC',
    color: '#2E7D32',
  },
  {
    id: 'thokoza-wholesale',
    name: 'Thokoza Wholesale Depot',
    tagline: 'Township trader supplies',
    initials: 'TW',
    color: '#6A1B9A',
  },
  {
    id: 'germiston-trade-centre',
    name: 'Germiston Trade Centre',
    tagline: 'Bulk beverages & snacks',
    initials: 'GT',
    color: '#BF360C',
  },
  {
    id: 'tsakane-general',
    name: 'Tsakane General Suppliers',
    tagline: 'Household & cleaning bulk',
    initials: 'TG',
    color: '#00695C',
  },
  {
    id: 'alex-wholesale',
    name: 'Alexandra Wholesale Hub',
    tagline: 'Fast-moving consumer goods',
    initials: 'AW',
    color: '#F57F17',
  },
  {
    id: 'tembisa-depot',
    name: 'Tembisa Depot & Supplies',
    tagline: 'Rice, oil & bulk essentials',
    initials: 'TD',
    color: '#37474F',
  },
  {
    id: 'duduza-cash-carry',
    name: 'Duduza Cash & Carry',
    tagline: 'Spaza restocking specialists',
    initials: 'DC',
    color: '#880E4F',
  },
  {
    id: 'vosloorus-trade-hub',
    name: 'Vosloorus Trade Hub',
    tagline: 'Confectionery & frozen goods',
    initials: 'VT',
    color: '#1B5E20',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const formatRand = (n: number): string => `R${n.toFixed(2)}`;

export const STEP_PATHS = ['select-store', 'upload-receipt', 'delivery', 'payment'] as const;
