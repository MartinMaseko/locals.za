import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../../utils/api';
import mapLightVersion from '../../../assets/images/mapLightversion.webp';

type ResultStatus = 'success' | 'cancelled' | 'error';

interface PaymentDoc {
  status: string;
}

const STORAGE_KEY = 'lza_order_draft';

const PaymentResult = ({ status }: { status: ResultStatus }) => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);
  const [polling, setPolling] = useState(status === 'success');

  useEffect(() => {
    if (status !== 'success' || !orderId) return;

    let attempts = 0;
    const MAX = 10;
    const id = window.setInterval(async () => {
      attempts++;
      try {
        const res = await api.get<PaymentDoc>(`/api/payment/status/${orderId}`);
        const s = res.data.status;
        if (s === 'paid' || s === 'complete') {
          setConfirmed(true);
          setPolling(false);
          clearInterval(id);
          try { localStorage.removeItem(STORAGE_KEY); } catch { /* ok */ }
        } else if (attempts >= MAX) {
          setPolling(false);
          clearInterval(id);
        }
      } catch {
        if (attempts >= MAX) {
          setPolling(false);
          clearInterval(id);
        }
      }
    }, 2000);

    return () => clearInterval(id);
  }, [orderId, status]);

  const handleRestart = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ok */ }
    navigate('/order/select-store');
  };

  return (
    <section className="step-body">
      <div
        className="step-map-light-bg"
        style={{ backgroundImage: `url(${mapLightVersion})` }}
        aria-hidden="true"
      />
      <div className="step-map-light-overlay" aria-hidden="true" />

      <div className="success-modal-overlay" role="dialog" aria-modal="true">
        <div className="success-modal">

          {status === 'success' && (
            <>
              <div className="success-modal-icon">{polling ? '⏳' : '✓'}</div>
              <h2 className="success-modal-title">
                {polling ? 'Confirming payment…' : 'Payment Confirmed!'}
              </h2>
              <p className="success-modal-text">
                {polling
                  ? 'Verifying with Ozow — this takes a few seconds.'
                  : confirmed
                    ? `Your driver has been dispatched. Reference: ${orderId?.slice(-8).toUpperCase()}`
                    : 'Payment received. Your driver will be dispatched shortly.'}
              </p>
              {!polling && (
                <button type="button" className="btn-primary" onClick={handleRestart}>
                  Place Another Order
                </button>
              )}
            </>
          )}

          {status === 'cancelled' && (
            <>
              <div className="success-modal-icon" style={{ color: '#888' }}>✕</div>
              <h2 className="success-modal-title">Payment Cancelled</h2>
              <p className="success-modal-text">
                You cancelled the Ozow payment. Your order details are saved.
              </p>
              <button type="button" className="btn-primary" onClick={() => navigate('/order/payment')}>
                Try Again
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="success-modal-icon" style={{ color: '#E30613' }}>!</div>
              <h2 className="success-modal-title">Payment Failed</h2>
              <p className="success-modal-text">
                Something went wrong with your Ozow payment. Please try again or contact support.
              </p>
              <button type="button" className="btn-primary" onClick={() => navigate('/order/payment')}>
                Try Again
              </button>
            </>
          )}

          <button
            type="button"
            className="step-back-btn"
            style={{ marginTop: '1.25rem', display: 'block' }}
            onClick={handleRestart}
          >
            Return to Home
          </button>
        </div>
      </div>
    </section>
  );
};

export default PaymentResult;
