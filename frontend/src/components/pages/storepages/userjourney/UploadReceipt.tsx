import { useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import mapLight from '../../../assets/images/mapLight.png';
import type { WholesaleOutletContext } from './wholesale.types';

const MIN_SCALE = 1;
const MAX_SCALE = 1.6;
const ACCEPT = 'image/jpeg,image/png,application/pdf';

const UploadReceipt = () => {
  const navigate = useNavigate();
  const { order, onProceedToDelivery } = useOutletContext<WholesaleOutletContext>();

  const bgRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const detailsInputRef = useRef<HTMLInputElement | null>(null);
  const itemsInputRef = useRef<HTMLInputElement | null>(null);

  // Order details: single file (photo, JPG, PNG or PDF)
  const [detailsFile, setDetailsFile] = useState<File | null>(null);
  const [detailsPreview, setDetailsPreview] = useState<string | null>(null);

  // Order items: multiple files
  const [itemsFiles, setItemsFiles] = useState<File[]>([]);
  const [itemsPreviews, setItemsPreviews] = useState<(string | null)[]>([]);

  const [customerName, setCustomerName] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [contactNumber, setContactNumber] = useState('');

  const canProceed =
    detailsFile !== null &&
    itemsFiles.length > 0 &&
    customerName.trim().length > 0 &&
    deliveryAddress.trim().length > 0 &&
    contactNumber.trim().length > 0;

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

  // Revoke all object URLs on unmount
  useEffect(() => {
    return () => {
      if (detailsPreview) URL.revokeObjectURL(detailsPreview);
      itemsPreviews.forEach(p => { if (p) URL.revokeObjectURL(p); });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDetailsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setDetailsFile(file);
    if (detailsPreview) URL.revokeObjectURL(detailsPreview);
    setDetailsPreview(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  };

  const handleItemsFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    if (incoming.length === 0) return;
    e.target.value = ''; // reset so the same file can be re-picked
    const newPreviews = incoming.map(f =>
      f.type.startsWith('image/') ? URL.createObjectURL(f) : null
    );
    setItemsFiles(prev => [...prev, ...incoming]);
    setItemsPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeItemFile = (index: number) => {
    const preview = itemsPreviews[index];
    if (preview) URL.revokeObjectURL(preview);
    setItemsFiles(prev => prev.filter((_, i) => i !== index));
    setItemsPreviews(prev => prev.filter((_, i) => i !== index));
  };

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
        onClick={() => navigate('/order/select-store')}
      >
        ← Back
      </button>
      <h1 className="step-title">Upload your receipt</h1>
      <p className="step-subtitle">
        From <strong>{order.store?.name}</strong>. Add both receipt photos and your delivery details to continue.
      </p>

      {/* Receipt uploads */}
      <div className="receipt-upload-grid">
        {/* Order details — single file */}
        <div
          className={`receipt-upload-zone${detailsFile ? ' receipt-upload-zone--filled' : ''}`}
          onClick={() => detailsInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && detailsInputRef.current?.click()}
          aria-label="Upload order details"
        >
          <input
            ref={detailsInputRef}
            type="file"
            accept={ACCEPT}
            className="receipt-upload-input"
            style={{ display: 'none' }}
            onChange={handleDetailsFile}
          />
          {detailsFile ? (
            detailsPreview ? (
              <img src={detailsPreview} alt="Order details" className="receipt-upload-preview" />
            ) : (
              <div className="receipt-upload-pdf-info">
                <span className="receipt-upload-pdf-badge">PDF</span>
                <span className="receipt-upload-pdf-name">{detailsFile.name}</span>
              </div>
            )
          ) : (
            <>
              <span className="receipt-upload-label">Order Details</span>
              <span className="receipt-upload-hint">Photo, JPG, PNG or PDF</span>
            </>
          )}
        </div>

        {/* Order items — multiple files */}
        <div
          className={`receipt-upload-zone receipt-upload-zone--multi${itemsFiles.length > 0 ? ' receipt-upload-zone--filled' : ''}`}
          role="region"
          aria-label="Order items uploads"
        >
          <input
            ref={itemsInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="receipt-upload-input"
            style={{ display: 'none' }}
            onChange={handleItemsFiles}
          />
          {itemsFiles.length > 0 ? (
            <>
              <div className="receipt-upload-thumbs">
                {itemsFiles.map((_file, i) => (
                  <div key={i} className="receipt-upload-thumb-wrap">
                    {itemsPreviews[i] ? (
                      <img src={itemsPreviews[i]!} alt={`Slip ${i + 1}`} className="receipt-upload-thumb" />
                    ) : (
                      <div className="receipt-upload-thumb receipt-upload-thumb--pdf">PDF</div>
                    )}
                    <button
                      type="button"
                      className="receipt-upload-thumb-remove"
                      onClick={() => removeItemFile(i)}
                      aria-label={`Remove file ${i + 1}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="receipt-upload-add-more"
                onClick={() => itemsInputRef.current?.click()}
              >
                + Add more
              </button>
            </>
          ) : (
            <button
              type="button"
              className="receipt-upload-zone-inner"
              onClick={() => itemsInputRef.current?.click()}
            >
              <span className="receipt-upload-label">Order Items</span>
              <span className="receipt-upload-hint">Multiple photos, JPG, PNG or PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Delivery details */}
      <div className="receipt-form">
        <div className="receipt-field">
          <label className="receipt-field-label" htmlFor="customerName">Customer Name</label>
          <input
            id="customerName"
            type="text"
            className="receipt-field-input"
            placeholder="Full name"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="receipt-field">
          <label className="receipt-field-label" htmlFor="deliveryAddress">Delivery Address</label>
          <input
            id="deliveryAddress"
            type="text"
            className="receipt-field-input"
            placeholder="Street, area, city"
            value={deliveryAddress}
            onChange={e => setDeliveryAddress(e.target.value)}
            autoComplete="street-address"
          />
        </div>
        <div className="receipt-field">
          <label className="receipt-field-label" htmlFor="contactNumber">Contact Number</label>
          <input
            id="contactNumber"
            type="tel"
            className="receipt-field-input"
            placeholder="e.g. 071 234 5678"
            value={contactNumber}
            onChange={e => setContactNumber(e.target.value)}
            autoComplete="tel"
            inputMode="tel"
          />
        </div>
      </div>

      <button
        type="button"
        className="btn-primary"
        onClick={onProceedToDelivery}
        disabled={!canProceed}
      >
        Continue to Delivery
      </button>
    </section>
  );
};

export default UploadReceipt;
