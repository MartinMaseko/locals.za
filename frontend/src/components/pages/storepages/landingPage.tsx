import { useState } from 'react';
import './landingPage.css';
import ShopriteLogo from '../../assets/images/shopriteCash&CarryLogo.jpg';
import SACashCarryLogo from '../../assets/images/sacc.png';
import LocalsIcon from '../../assets/logos/localsIcon.png';
import OzowLogo from '../../assets/images/OzowLogo.png';

/* ----------------------------------------------------------------------------
 * Receipt-to-Delivery Pitch Mockup (frontend-only)
 * Route: /shoprite-pitch-mockup
 * ----------------------------------------------------------------------------
 * Demonstrates the LocalsZA partner-store user journey:
 *   1) Store Selection
 *   2) Receipt Upload + simulated AI scan
 *   3) Delivery Details + dynamic pricing
 *   4) Secure Payment Handoff
 * All state and calculations are local. No backend calls.
 * -------------------------------------------------------------------------- */

type Step = 1 | 2 | 3 | 4;

interface Store {
  id: string;
  name: string;
  tagline: string;
  initials: string;
  color: string;
  logo?: string;
}

interface OrderState {
  store: Store | null;
  orderNumber: string;
  itemCount: number;
  weightLabel: 'Light' | 'Medium' | 'Heavy';
  address: string;
}

const STORES: Store[] = [
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
];

// Pricing constants (per spec)
const BASE_FARE = 40;
const DISTANCE_KM = 12;
const DISTANCE_RATE = 6;
const WEIGHT_SURCHARGE = 20;
const TOTAL_FEE = BASE_FARE + DISTANCE_KM * DISTANCE_RATE + WEIGHT_SURCHARGE; // R90

const formatRand = (n: number) => `R${n.toFixed(2)}`;

const LandingPage = () => {
  const [step, setStep] = useState<Step>(1);
  const [order, setOrder] = useState<OrderState>({
    store: null,
    orderNumber: '',
    itemCount: 0,
    weightLabel: 'Medium',
    address: '120 Moshoeshoe St, Katlehong',
  });

  // Step 2 sub-states
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Step 4 sub-state
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2500);
  };

  const handleSelectStore = (store: Store) => {
    setOrder(prev => ({ ...prev, store }));
  };

  const handleConfirmStore = () => {
    if (!order.store) return;
    setStep(2);
  };

  const handleStartScan = () => {
    if (scanning) return;
    setScanning(true);
    setScanComplete(false);
    window.setTimeout(() => {
      setScanning(false);
      setScanComplete(true);
      const orderNumber = `#${10000 + Math.floor(Math.random() * 900) + 92}`;
      setOrder(prev => ({
        ...prev,
        orderNumber,
        itemCount: 4,
        weightLabel: 'Medium',
      }));
      showToast('Validated');
    }, 2500);
  };

  const handleProceedToDelivery = () => setStep(3);
  const handleProceedToPayment = () => setStep(4);

  const handlePay = () => {
    setPaymentSuccess(true);
  };

  const handleRestart = () => {
    setStep(1);
    setOrder({
      store: null,
      orderNumber: '',
      itemCount: 0,
      weightLabel: 'Medium',
      address: '120 Moshoeshoe St, Katlehong',
    });
    setScanning(false);
    setScanComplete(false);
    setPaymentSuccess(false);
    setToast(null);
  };

  return (
    <div className="lzpitch-root">
      <header className="lzpitch-header">
        <div className="lzpitch-brand">
          <img src={LocalsIcon} alt="LocalsZA" className="lzpitch-brand-icon" />
          LocalsZA
        </div>
        <div className="lzpitch-step-indicator">Step {step} of 4</div>
      </header>

      <div className="lzpitch-progress">
        <div
          className="lzpitch-progress-bar"
          style={{ width: `${(step / 4) * 100}%` }}
        />
      </div>

      <main className="lzpitch-main">
        {step === 1 && (
          <StoreSelectionStep
            stores={STORES}
            selected={order.store}
            onSelect={handleSelectStore}
            onConfirm={handleConfirmStore}
          />
        )}

        {step === 2 && (
          <ReceiptUploadStep
            store={order.store}
            scanning={scanning}
            scanComplete={scanComplete}
            order={order}
            onScan={handleStartScan}
            onContinue={handleProceedToDelivery}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <DeliveryStep
            order={order}
            onAddressChange={addr =>
              setOrder(prev => ({ ...prev, address: addr }))
            }
            onContinue={handleProceedToPayment}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <PaymentStep
            order={order}
            paid={paymentSuccess}
            onPay={handlePay}
            onRestart={handleRestart}
            onBack={() => setStep(3)}
          />
        )}
      </main>

      {toast && <div className="lzpitch-toast">{toast}</div>}
    </div>
  );
};

/* ---------- Step 1 ---------- */
const StoreSelectionStep = ({
  stores,
  selected,
  onSelect,
  onConfirm,
}: {
  stores: Store[];
  selected: Store | null;
  onSelect: (s: Store) => void;
  onConfirm: () => void;
}) => (
  <section className="lzpitch-step">
    <h1 className="lzpitch-title">Choose a partner store</h1>
    <p className="lzpitch-subtitle">
      Select where you bought from. We'll fetch your receipt and arrange delivery.
    </p>

    <div className="lzpitch-store-grid">
      {stores.map(store => {
        const active = selected?.id === store.id;
        return (
          <button
            key={store.id}
            type="button"
            className={`lzpitch-store-card${active ? ' is-active' : ''}`}
            onClick={() => onSelect(store)}
            aria-pressed={active}
          >
            <div
              className="lzpitch-store-logo"
              style={{ backgroundColor: store.color }}
            >
              {store.logo ? (
                <img
                  src={store.logo}
                  alt={store.name}
                  className="lzpitch-store-logo-img"
                />
              ) : (
                store.initials
              )}
            </div>
            <div className="lzpitch-store-name">{store.name}</div>
            <div className="lzpitch-store-tag">{store.tagline}</div>
            {active && <div className="lzpitch-store-check">✓</div>}
          </button>
        );
      })}
    </div>

    <button
      type="button"
      className="lzpitch-primary-btn"
      disabled={!selected}
      onClick={onConfirm}
    >
      Select Store
    </button>
  </section>
);

/* ---------- Step 2 ---------- */
const ReceiptUploadStep = ({
  store,
  scanning,
  scanComplete,
  order,
  onScan,
  onContinue,
  onBack,
}: {
  store: Store | null;
  scanning: boolean;
  scanComplete: boolean;
  order: OrderState;
  onScan: () => void;
  onContinue: () => void;
  onBack: () => void;
}) => (
  <section className="lzpitch-step">
    <button type="button" className="lzpitch-back" onClick={onBack}>
      ← Back
    </button>
    <h1 className="lzpitch-title">Upload your receipt</h1>
    <p className="lzpitch-subtitle">
      From <strong>{store?.name}</strong>. We'll validate it with AI in seconds.
    </p>

    <div className="lzpitch-receipt-frame">
      <div className="lzpitch-mock-receipt" aria-hidden="true">
        <div className="lzpitch-receipt-header">{store?.name ?? 'STORE'}</div>
        <div className="lzpitch-receipt-line short" />
        <div className="lzpitch-receipt-line" />
        <div className="lzpitch-receipt-line" />
        <div className="lzpitch-receipt-line short" />
        <div className="lzpitch-receipt-line" />
        <div className="lzpitch-receipt-line short" />
        <div className="lzpitch-receipt-total">TOTAL  R 412.50</div>
        {scanning && <div className="lzpitch-scan-line" />}
        {scanComplete && (
          <div className="lzpitch-scan-stamp">VERIFIED</div>
        )}
      </div>
    </div>

    {!scanComplete && (
      <button
        type="button"
        className="lzpitch-primary-btn"
        onClick={onScan}
        disabled={scanning}
      >
        {scanning ? 'Scanning receipt…' : 'Take Photo / Upload Receipt'}
      </button>
    )}

    {scanComplete && (
      <>
        <div className="lzpitch-summary-card">
          <div className="lzpitch-summary-row">
            <span>Order</span>
            <strong>{order.orderNumber}</strong>
          </div>
          <div className="lzpitch-summary-row">
            <span>Items detected</span>
            <strong>{order.itemCount}</strong>
          </div>
          <div className="lzpitch-summary-row">
            <span>Estimated weight</span>
            <strong>{order.weightLabel}</strong>
          </div>
        </div>
        <button
          type="button"
          className="lzpitch-primary-btn"
          onClick={onContinue}
        >
          Continue to Delivery
        </button>
      </>
    )}
  </section>
);

/* ---------- Step 3 ---------- */
const DeliveryStep = ({
  order,
  onAddressChange,
  onContinue,
  onBack,
}: {
  order: OrderState;
  onAddressChange: (addr: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) => (
  <section className="lzpitch-step">
    <button type="button" className="lzpitch-back" onClick={onBack}>
      ← Back
    </button>
    <h1 className="lzpitch-title">Delivery details</h1>
    <p className="lzpitch-subtitle">
      Confirm where the driver should bring your order.
    </p>

    {/* CSS/SVG mock map — no iframe, no CSP issues */}
    <div className="lzpitch-map-wrapper">
      <div className="lzpitch-map-canvas" aria-hidden="true">
        {/* Road grid */}
        <svg className="lzpitch-map-svg" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
          {/* background */}
          <rect width="400" height="240" fill="#e8e0d8" />
          {/* blocks */}
          <rect x="0"   y="0"   width="80"  height="60"  fill="#f0ebe3" />
          <rect x="100" y="0"   width="100" height="60"  fill="#f0ebe3" />
          <rect x="220" y="0"   width="80"  height="60"  fill="#f0ebe3" />
          <rect x="320" y="0"   width="80"  height="60"  fill="#f0ebe3" />
          <rect x="0"   y="80"  width="60"  height="80"  fill="#f0ebe3" />
          <rect x="80"  y="80"  width="120" height="80"  fill="#f0ebe3" />
          <rect x="220" y="80"  width="70"  height="80"  fill="#f0ebe3" />
          <rect x="310" y="80"  width="90"  height="80"  fill="#f0ebe3" />
          <rect x="0"   y="180" width="80"  height="60"  fill="#f0ebe3" />
          <rect x="100" y="180" width="80"  height="60"  fill="#f0ebe3" />
          <rect x="200" y="180" width="90"  height="60"  fill="#f0ebe3" />
          <rect x="310" y="180" width="90"  height="60"  fill="#f0ebe3" />
          {/* park */}
          <rect x="80"  y="80"  width="120" height="80"  fill="#c8e6c9" opacity="0.6" />
          <ellipse cx="140" cy="120" rx="40" ry="28" fill="#a5d6a7" opacity="0.7" />
          {/* main roads horizontal */}
          <rect x="0"   y="62"  width="400" height="16" fill="#fff" />
          <rect x="0"   y="162" width="400" height="16" fill="#fff" />
          {/* main roads vertical */}
          <rect x="62"  y="0"   width="16"  height="240" fill="#fff" />
          <rect x="202" y="0"   width="16"  height="240" fill="#fff" />
          <rect x="302" y="0"   width="16"  height="240" fill="#fff" />
          {/* road centre lines */}
          <line x1="0" y1="70" x2="400" y2="70" stroke="#f5c542" strokeWidth="1" strokeDasharray="12 8" opacity="0.6"/>
          <line x1="0" y1="170" x2="400" y2="170" stroke="#f5c542" strokeWidth="1" strokeDasharray="12 8" opacity="0.6"/>
          <line x1="70" y1="0" x2="70" y2="240" stroke="#f5c542" strokeWidth="1" strokeDasharray="12 8" opacity="0.6"/>
          <line x1="210" y1="0" x2="210" y2="240" stroke="#f5c542" strokeWidth="1" strokeDasharray="12 8" opacity="0.6"/>
          <line x1="310" y1="0" x2="310" y2="240" stroke="#f5c542" strokeWidth="1" strokeDasharray="12 8" opacity="0.6"/>
          {/* route path */}
          <polyline points="70,40 70,70 210,70 210,130 260,130 260,170 320,170" stroke="#E30613" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>
          <polyline points="70,40 70,70 210,70 210,130 260,130 260,170 320,170" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 5" opacity="0.7"/>
          {/* store pin */}
          <circle cx="70" cy="40" r="10" fill="#FFE000" stroke="#1a1a1a" strokeWidth="2"/>
          <text x="70" y="44" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1a1a1a">S</text>
          {/* destination pin */}
          <circle cx="320" cy="170" r="12" fill="#E30613" stroke="#fff" strokeWidth="2.5"/>
          <circle cx="320" cy="170" r="4"  fill="#fff"/>
          {/* scale bar */}
          <rect x="16" y="220" width="60" height="3" fill="#9ca3af" rx="1"/>
          <text x="16" y="216" fontSize="8" fill="#6b7280" fontFamily="monospace">0</text>
          <text x="66" y="216" fontSize="8" fill="#6b7280" fontFamily="monospace">1 km</text>
          {/* OSM attribution */}
          <text x="384" y="236" fontSize="7" fill="#9ca3af" textAnchor="end" fontFamily="sans-serif">© OpenStreetMap</text>
        </svg>
      </div>

      {/* Route overlay pill */}
      <div className="lzpitch-map-overlay">
        <div className="lzpitch-route-pill">
          <div className="lzpitch-route-node store">
            <span className="lzpitch-route-dot store-dot" />
            <span className="lzpitch-route-label">
              {order.store?.name ?? 'Store'}
            </span>
          </div>
          <div className="lzpitch-route-line" />
          <div className="lzpitch-route-node dest">
            <span className="lzpitch-route-dot dest-dot" />
            <span className="lzpitch-route-label">{order.address}</span>
          </div>
        </div>
        <div className="lzpitch-map-distance-badge">
          🚚 {DISTANCE_KM} km · ~15 min
        </div>
      </div>
    </div>

    <div className="lzpitch-form">
      <label className="lzpitch-label" htmlFor="lzpitch-address">
        Delivery address
      </label>
      <input
        id="lzpitch-address"
        type="text"
        className="lzpitch-input"
        value={order.address}
        onChange={e => onAddressChange(e.target.value)}
      />

      <div className="lzpitch-price-card">
        <div className="lzpitch-price-row">
          <span>Base fare</span>
          <span>{formatRand(BASE_FARE)}</span>
        </div>
        <div className="lzpitch-price-row">
          <span>
            Distance ({DISTANCE_KM} km × {formatRand(DISTANCE_RATE)})
          </span>
          <span>{formatRand(DISTANCE_KM * DISTANCE_RATE)}</span>
        </div>
        <div className="lzpitch-price-row">
          <span>Weight surcharge ({order.weightLabel})</span>
          <span>{formatRand(WEIGHT_SURCHARGE)}</span>
        </div>
        <div className="lzpitch-price-divider" />
        <div className="lzpitch-price-row total">
          <span>Total delivery fee</span>
          <strong>{formatRand(TOTAL_FEE)}</strong>
        </div>
      </div>
    </div>

    <button
      type="button"
      className="lzpitch-primary-btn"
      onClick={onContinue}
      disabled={!order.address.trim()}
    >
      Continue to Payment
    </button>
  </section>
);

/* ---------- Step 4 ---------- */
const PaymentStep = ({
  order,
  paid,
  onPay,
  onRestart,
  onBack,
}: {
  order: OrderState;
  paid: boolean;
  onPay: () => void;
  onRestart: () => void;
  onBack: () => void;
}) => (
  <section className="lzpitch-step">
    {!paid && (
      <button type="button" className="lzpitch-back" onClick={onBack}>
        ← Back
      </button>
    )}
    <h1 className="lzpitch-title">Secure payment</h1>
    <p className="lzpitch-subtitle">
      Pay your delivery fee. Your driver is dispatched immediately on confirmation.
    </p>

    <div className="lzpitch-pay-amount">
      <span>Amount due</span>
      <strong>{formatRand(TOTAL_FEE)}</strong>
    </div>

    <button type="button" className="lzpitch-pay-btn" onClick={onPay}>
      Pay {formatRand(TOTAL_FEE)} via Ozow
    </button>

    <div className="lzpitch-trust">
      <img src={OzowLogo} alt="Ozow" className="lzpitch-ozow-logo" />
    </div>

    {paid && (
      <div className="lzpitch-modal-overlay" role="dialog" aria-modal="true">
        <div className="lzpitch-modal">
          <div className="lzpitch-modal-icon">✓</div>
          <h2 className="lzpitch-modal-title">Payment Successful</h2>
          <p className="lzpitch-modal-text">
            Driver dispatched to <strong>{order.store?.name}</strong>.
            <br />
            Order {order.orderNumber} is on the way to {order.address}.
          </p>
          <button
            type="button"
            className="lzpitch-primary-btn"
            onClick={onRestart}
          >
            Restart Demo
          </button>
        </div>
      </div>
    )}
  </section>
);

export default LandingPage;
