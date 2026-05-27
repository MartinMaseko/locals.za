import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../../../utils/api';
import '../landingPage.css';
import type {
  DeliveryQuote,
  OrderState,
  ReceiptFormData,
  Store,
  WholesaleOutletContext,
} from './wholesale.types';
import { STEP_PATHS } from './wholesale.types';
import Navbar from '../navbar/navbar';
import OrderProgress from './OrderProgress';

/** localStorage key for the in-progress order draft. */
const STORAGE_KEY = 'lza_order_draft';

const DEFAULT_ORDER: OrderState = {
  store: null,
  customerName: '',
  contactNumber: '',
  address: '',
  receiptBlobUrls: [],
  deliveryQuote: null,
  orderId: null,
  orderNumber: '',
};

const WholesaleLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Hydrate from localStorage so the funnel survives back-navigation and refreshes
  const [order, setOrder] = useState<OrderState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_ORDER, ...JSON.parse(saved) } : DEFAULT_ORDER;
    } catch {
      return DEFAULT_ORDER;
    }
  });

  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Persist to localStorage whenever order changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    } catch {
      // Storage quota exceeded or private browsing — non-fatal
    }
  }, [order]);

  const stepIndex = STEP_PATHS.findIndex(p => location.pathname.endsWith(p));
  const isInFlow = stepIndex !== -1;
  const step = Math.max(1, stepIndex + 1);

  const goTo = (index: number) => navigate(`/order/${STEP_PATHS[index]}`);


  // ─── Step handlers ───────────────────────────────────────────────────────────

  const onSelectStore = (store: Store) =>
    setOrder(prev => ({
      ...prev,
      store,
      // Changing store changes the pickup location — any cached quote is now stale.
      deliveryQuote: prev.store?.id === store.id ? prev.deliveryQuote : null,
    }));

  const onConfirmStore = () => {
    if (!order.store) return;
    goTo(1);
  };

  const onSetReceiptData = (data: ReceiptFormData) =>
    setOrder(prev => ({
      ...prev,
      ...data,
      // Invalidate the cached quote whenever the delivery address changes so
      // DeliveryPage always re-fetches for the new address.
      deliveryQuote: prev.address === data.address ? prev.deliveryQuote : null,
    }));

  const onProceedToDelivery = () => goTo(2);

  const onAddressChange = (addr: string) =>
    setOrder(prev => ({ ...prev, address: addr }));

  /** DeliveryPage calls this when the quote API returns successfully. */
  const onSetDeliveryQuote = (quote: DeliveryQuote) =>
    setOrder(prev => ({ ...prev, deliveryQuote: quote }));

  const onProceedToPayment = () => goTo(3);

  const onPay = async () => {
    if (!order.store || !order.deliveryQuote) return;
    setPaying(true);
    setPayError(null);

    try {
      // Step 1: Persist the order to Cosmos so initiate has something to load
      const orderRes = await api.post<{ id: string; order_number: string }>('/api/orders', {
        storeId: order.store.id,
        deliveryFee: order.deliveryQuote.totalFee,
        total: order.deliveryQuote.totalFee,
        distanceKm: order.deliveryQuote.distanceKm,
        weightClass: order.deliveryQuote.weightClass,
        deliveryAddress: { street: order.address },
      });
      const orderId = orderRes.data.id;
      setOrder(prev => ({ ...prev, orderId, orderNumber: orderRes.data.order_number ?? '' }));

      // Step 2: Get Ozow payment payload
      const initRes = await api.post<{ postUrl: string; fields: Record<string, string> }>(
        `/api/payment/initiate/${orderId}`
      );
      const { postUrl, fields } = initRes.data;

      // Step 3: Build a hidden form and submit — browser navigates to Ozow
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = postUrl;
      for (const [key, value] of Object.entries(fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
      // Browser navigates away — code below will not run
    } catch {
      setPayError('Could not initiate payment. Please check your connection and try again.');
      setPaying(false);
    }
  };

  const onRestart = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ok */ }
    setOrder(DEFAULT_ORDER);
    setPaymentSuccess(false);
    setToast(null);
    goTo(0);
  };

  // ─── Outlet context ──────────────────────────────────────────────────────────

  const context: WholesaleOutletContext = {
    order,
    paymentSuccess,
    paying,
    payError,
    onSelectStore,
    onConfirmStore,
    onSetReceiptData,
    onProceedToDelivery,
    onAddressChange,
    onSetDeliveryQuote,
    onProceedToPayment,
    onPay,
    onRestart,
  };

  return (
    <div className="order-flow">
      {step === 1 && <Navbar />}

      {/* Progress tracker — hidden on non-funnel routes (e.g. payment-result) */}
      {isInFlow && (
        <OrderProgress step={step} dark={step === 1} />
      )}

      <main className="order-content">
        <Outlet context={context} />
      </main>

      {toast && <div className="toast-notification">{toast}</div>}
    </div>
  );
};

export default WholesaleLayout;
