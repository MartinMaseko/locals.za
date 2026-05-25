import { useNavigate, useOutletContext } from 'react-router-dom';
import OzowLogo from '../../../assets/images/OzowLogo.png';
import mapLightVersion from '../../../assets/images/mapLightversion.webp';
import type { WholesaleOutletContext } from './wholesale.types';
import { formatRand } from './wholesale.types';

const PaymentPage = () => {
  const navigate = useNavigate();
  const { order, paying, payError, onPay, onRestart } =
    useOutletContext<WholesaleOutletContext>();

  const amountDue = order.deliveryQuote?.totalFee ?? 0;

  return (
    <section className="step-body">
      <div
        className="step-map-light-bg"
        style={{ backgroundImage: `url(${mapLightVersion})` }}
        aria-hidden="true"
      />
      <div className="step-map-light-overlay" aria-hidden="true" />

      {!paying && (
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
        <strong>{formatRand(amountDue)}</strong>
      </div>

      {payError && (
        <p className="delivery-quote-error" style={{ textAlign: 'center', marginBottom: '1rem' }}>
          {payError}
        </p>
      )}

      <button
        type="button"
        className="btn-pay-ozow"
        onClick={onPay}
        disabled={paying || amountDue <= 0}
      >
        {paying ? 'Redirecting to Ozow…' : `Pay ${formatRand(amountDue)} via Ozow`}
      </button>

      <div className="payment-trust-logos">
        <img src={OzowLogo} alt="Ozow" className="payment-ozow-logo" />
      </div>

      <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#888', marginTop: '0.5rem' }}>
        You will be redirected to Ozow's secure payment page.
      </p>

      <button
        type="button"
        className="step-back-btn"
        style={{ marginTop: '2rem', display: 'block', textAlign: 'center' }}
        onClick={onRestart}
      >
        Cancel &amp; start over
      </button>
    </section>
  );
};

export default PaymentPage;
