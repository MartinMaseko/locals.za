import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import '../landingPage.css';
import type { OrderState, Store, WholesaleOutletContext } from './wholesale.types';
import { STEP_PATHS } from './wholesale.types';
import Navbar from '../navbar/navbar';

const DEFAULT_ORDER: OrderState = {
  store: null,
  orderNumber: '',
  itemCount: 0,
  weightLabel: 'Medium',
  address: '120 Moshoeshoe St, Katlehong',
};

const WholesaleLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [order, setOrder] = useState<OrderState>(DEFAULT_ORDER);
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const stepIndex = Math.max(
    0,
    STEP_PATHS.findIndex(p => location.pathname.endsWith(p)),
  );
  const step = stepIndex + 1;

  const goTo = (index: number) => navigate(`/order/${STEP_PATHS[index]}`);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  const onSelectStore = (store: Store) =>
    setOrder(prev => ({ ...prev, store }));

  const onConfirmStore = () => {
    if (!order.store) return;
    goTo(1);
  };

  const onStartScan = () => {
    if (scanning) return;
    setScanning(true);
    setScanComplete(false);
    window.setTimeout(() => {
      setScanning(false);
      setScanComplete(true);
      const orderNumber = `#${10000 + Math.floor(Math.random() * 900) + 92}`;
      setOrder(prev => ({ ...prev, orderNumber, itemCount: 4, weightLabel: 'Medium' }));
      showToast('Validated');
    }, 2500);
  };

  const onProceedToDelivery = () => goTo(2);

  const onAddressChange = (addr: string) =>
    setOrder(prev => ({ ...prev, address: addr }));

  const onProceedToPayment = () => goTo(3);

  const onPay = () => setPaymentSuccess(true);

  const onRestart = () => {
    setOrder(DEFAULT_ORDER);
    setScanning(false);
    setScanComplete(false);
    setPaymentSuccess(false);
    setToast(null);
    goTo(0);
  };

  const context: WholesaleOutletContext = {
    order,
    scanning,
    scanComplete,
    paymentSuccess,
    onSelectStore,
    onConfirmStore,
    onStartScan,
    onProceedToDelivery,
    onAddressChange,
    onProceedToPayment,
    onPay,
    onRestart,
  };

  return (
    <div className="order-flow">
      {step === 1 && <Navbar />}
      <div className="order-progress-track">
        <div
          className="order-progress-fill"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      <main className="order-content">
        <Outlet context={context} />
      </main>

      {toast && <div className="toast-notification">{toast}</div>}
    </div>
  );
};

export default WholesaleLayout;
