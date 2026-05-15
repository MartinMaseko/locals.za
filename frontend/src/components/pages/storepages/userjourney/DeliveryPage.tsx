import { useEffect, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import mapLight from '../../../assets/images/mapLight.png';
import type { WholesaleOutletContext } from './wholesale.types';
import {
  BASE_FARE,
  DISTANCE_KM,
  DISTANCE_RATE,
  WEIGHT_SURCHARGE,
  TOTAL_FEE,
  formatRand,
} from './wholesale.types';

const MIN_SCALE = 1;
const MAX_SCALE = 1.6;

const DeliveryPage = () => {
  const navigate = useNavigate();
  const { order, onAddressChange, onProceedToPayment } =
    useOutletContext<WholesaleOutletContext>();

  const bgRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const update = () => {
      rafRef.current = null;
      const el = bgRef.current;
      if (!el) return;

      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, window.scrollY / max));

      const scale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * progress;
      const translateY = -progress * 40;

      el.style.transform = `translate3d(0, ${translateY}px, 0) scale(${scale})`;
    };

    const onScroll = () => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <section className="step-body">
      <div
        ref={bgRef}
        className="step-map-light-bg"
        style={{ backgroundImage: `url(${mapLight})` }}
        aria-hidden="true"
      />
      <div className="step-map-light-overlay" aria-hidden="true" />
      <button
        type="button"
        className="step-back-btn"
        onClick={() => navigate('/order/upload-receipt')}
      >
        ← Back
      </button>
      <h1 className="step-title">Delivery details</h1>
      <p className="step-subtitle">
        Confirm where the driver should bring your order.
      </p>

      <div className="delivery-map">
        <div className="delivery-map-canvas" aria-hidden="true">
          <svg
            className="delivery-map-svg"
            viewBox="0 0 400 240"
            preserveAspectRatio="xMidYMid slice"
          >
            <rect width="400" height="240" fill="#e8e0d8" />
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
            <rect x="80"  y="80"  width="120" height="80"  fill="#c8e6c9" opacity="0.6" />
            <ellipse cx="140" cy="120" rx="40" ry="28" fill="#a5d6a7" opacity="0.7" />
            <rect x="0"   y="62"  width="400" height="16" fill="#fff" />
            <rect x="0"   y="162" width="400" height="16" fill="#fff" />
            <rect x="62"  y="0"   width="16"  height="240" fill="#fff" />
            <rect x="202" y="0"   width="16"  height="240" fill="#fff" />
            <rect x="302" y="0"   width="16"  height="240" fill="#fff" />
            <line x1="0" y1="70" x2="400" y2="70" stroke="#f5c542" strokeWidth="1" strokeDasharray="12 8" opacity="0.6" />
            <line x1="0" y1="170" x2="400" y2="170" stroke="#f5c542" strokeWidth="1" strokeDasharray="12 8" opacity="0.6" />
            <line x1="70" y1="0" x2="70" y2="240" stroke="#f5c542" strokeWidth="1" strokeDasharray="12 8" opacity="0.6" />
            <line x1="210" y1="0" x2="210" y2="240" stroke="#f5c542" strokeWidth="1" strokeDasharray="12 8" opacity="0.6" />
            <line x1="310" y1="0" x2="310" y2="240" stroke="#f5c542" strokeWidth="1" strokeDasharray="12 8" opacity="0.6" />
            <polyline points="70,40 70,70 210,70 210,130 260,130 260,170 320,170" stroke="#E30613" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
            <polyline points="70,40 70,70 210,70 210,130 260,130 260,170 320,170" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 5" opacity="0.7" />
            <circle cx="70" cy="40" r="10" fill="#FFE000" stroke="#1a1a1a" strokeWidth="2" />
            <text x="70" y="44" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1a1a1a">S</text>
            <circle cx="320" cy="170" r="12" fill="#E30613" stroke="#fff" strokeWidth="2.5" />
            <circle cx="320" cy="170" r="4" fill="#fff" />
            <rect x="16" y="220" width="60" height="3" fill="#9ca3af" rx="1" />
            <text x="16" y="216" fontSize="8" fill="#6b7280" fontFamily="monospace">0</text>
            <text x="66" y="216" fontSize="8" fill="#6b7280" fontFamily="monospace">1 km</text>
            <text x="384" y="236" fontSize="7" fill="#9ca3af" textAnchor="end" fontFamily="sans-serif">© OpenStreetMap</text>
          </svg>
        </div>

        <div className="delivery-map-overlay">
          <div className="delivery-route-pill">
            <div className="delivery-route-node">
              <span className="delivery-route-dot delivery-route-dot--store" />
              <span className="delivery-route-label">
                {order.store?.name ?? 'Store'}
              </span>
            </div>
            <div className="delivery-route-connector" />
            <div className="delivery-route-node">
              <span className="delivery-route-dot delivery-route-dot--dest" />
              <span className="delivery-route-label">{order.address}</span>
            </div>
          </div>
          <div className="delivery-distance-badge">
            🚚 {DISTANCE_KM} km · ~15 min
          </div>
        </div>
      </div>

      <div className="delivery-address-form">
        <label className="delivery-address-label" htmlFor="delivery-address-input">
          Delivery address
        </label>
        <input
          id="delivery-address-input"
          type="text"
          className="delivery-address-input"
          value={order.address}
          onChange={e => onAddressChange(e.target.value)}
        />

        <div className="delivery-price-breakdown">
          <div className="delivery-price-row">
            <span>Base fare</span>
            <span>{formatRand(BASE_FARE)}</span>
          </div>
          <div className="delivery-price-row">
            <span>Distance ({DISTANCE_KM} km × {formatRand(DISTANCE_RATE)})</span>
            <span>{formatRand(DISTANCE_KM * DISTANCE_RATE)}</span>
          </div>
          <div className="delivery-price-row">
            <span>Weight surcharge ({order.weightLabel})</span>
            <span>{formatRand(WEIGHT_SURCHARGE)}</span>
          </div>
          <div className="delivery-price-divider" />
          <div className="delivery-price-row total">
            <span>Total delivery fee</span>
            <strong>{formatRand(TOTAL_FEE)}</strong>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn-primary"
        onClick={onProceedToPayment}
        disabled={!order.address.trim()}
      >
        Continue to Payment
      </button>
    </section>
  );
};

export default DeliveryPage;
