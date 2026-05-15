import ShopriteLogo from '../../../assets/images/shopriteCash&CarryLogo.jpg';
import SACashCarryLogo from '../../../assets/images/sacc.png';

export interface Store {
  id: string;
  name: string;
  tagline: string;
  initials: string;
  color: string;
  logo?: string;
}

export interface OrderState {
  store: Store | null;
  orderNumber: string;
  itemCount: number;
  weightLabel: 'Light' | 'Medium' | 'Heavy';
  address: string;
}

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

export const BASE_FARE = 40;
export const DISTANCE_KM = 12;
export const DISTANCE_RATE = 6;
export const WEIGHT_SURCHARGE = 20;
export const TOTAL_FEE = BASE_FARE + DISTANCE_KM * DISTANCE_RATE + WEIGHT_SURCHARGE;

export const formatRand = (n: number) => `R${n.toFixed(2)}`;

export const STEP_PATHS = ['select-store', 'upload-receipt', 'delivery', 'payment'] as const;

export interface WholesaleOutletContext {
  order: OrderState;
  scanning: boolean;
  scanComplete: boolean;
  paymentSuccess: boolean;
  onSelectStore: (store: Store) => void;
  onConfirmStore: () => void;
  onStartScan: () => void;
  onProceedToDelivery: () => void;
  onAddressChange: (addr: string) => void;
  onProceedToPayment: () => void;
  onPay: () => void;
  onRestart: () => void;
}
