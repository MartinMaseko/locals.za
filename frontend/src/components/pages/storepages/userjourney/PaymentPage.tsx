import { useNavigate, useOutletContext } from 'react-router-dom';
import OzowLogo from '../../../assets/images/OzowLogo.png';
import mapLightVersion from '../../../assets/images/mapLightversion.webp';
import type { WholesaleOutletContext } from './wholesale.types';
import { TOTAL_FEE, formatRand } from './wholesale.types';

const PaymentPage = () => {
  const navigate = useNavigate();
  const { order, paymentSuccess, onPay, onRestart } =
    useOutletContext<WholesaleOutletContext>();

  return (
    <section className="step-body">
      <div
        className="step-map-light-bg"
        style={{ backgroundImage: `url(${mapLightVersion})` }}
        aria-hidden="true"
      />
      <div className="step-map-light-overlay" aria-hidden="true" />
      {!paymentSuccess && (
        <button
          type="button"
          className="step-back-btn"
          onClick={() => navigate('/order/delivery')}
        >
          ← Back
        </button>
      )}
      <h1 className="step-title">Secure payment</h1>
      <p className="step-subtitle">
        Pay your delivery fee. Your driver is dispatched immediately on confirmation.
      </p>

      <div className="payment-total-card">
        <span>Amount due</span>
        <strong>{formatRand(TOTAL_FEE)}</strong>
      </div>

      <button type="button" className="btn-pay-ozow" onClick={onPay}>
        Pay {formatRand(TOTAL_FEE)} via Ozow
      </button>

      <div className="payment-trust-logos">
        <img src={OzowLogo} alt="Ozow" className="payment-ozow-logo" />
      </div>

      {paymentSuccess && (
        <div className="success-modal-overlay" role="dialog" aria-modal="true">
          <div className="success-modal">
            <div className="success-modal-icon">✓</div>
            <h2 className="success-modal-title">Payment Successful</h2>
            <p className="success-modal-text">
              Driver dispatched to <strong>{order.store?.name}</strong>.
              <br />
              Order {order.orderNumber} is on the way to {order.address}.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={onRestart}
            >
              Restart Demo
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default PaymentPage;
