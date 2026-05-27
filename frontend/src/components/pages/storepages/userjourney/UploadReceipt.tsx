import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import mapLight from '../../../assets/images/mapLight.png';
import type { ReceiptFormData, WholesaleOutletContext } from './wholesale.types';

const AZURE_MAPS_KEY = (import.meta.env.VITE_AZURE_MAPS_KEY ?? '') as string;

interface AddressSuggestion {
  label: string;
  position: { lat: number; lon: number };
}

const useAddressAutocomplete = (query: string, enabled: boolean) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const debounceRef = useRef<number | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 3 || !AZURE_MAPS_KEY ||
        AZURE_MAPS_KEY === 'ADD_YOUR_AZURE_MAPS_KEY_HERE') {
      setSuggestions([]);
      return;
    }
    try {
      const url = 'https://atlas.microsoft.com/search/address/json' +
                  '?api-version=1.0' +
                  `&query=${encodeURIComponent(q)}` +
                  '&countrySet=ZA&typeahead=true&limit=5' +
                  `&subscription-key=${AZURE_MAPS_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: AddressSuggestion[] = (data.results ?? []).map((r: any) => ({
        label: r.address?.freeformAddress ?? '',
        position: { lat: r.position?.lat ?? 0, lon: r.position?.lon ?? 0 },
      })).filter((r: AddressSuggestion) => r.label);
      setSuggestions(results);
    } catch {
      setSuggestions([]);
    }
  }, []);

  useEffect(() => {
    if (!enabled) { setSuggestions([]); return; }
    if (debounceRef.current != null) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => search(query), 320);
    return () => { if (debounceRef.current != null) clearTimeout(debounceRef.current); };
  }, [query, enabled, search]);

  const clear = () => setSuggestions([]);
  return { suggestions, clear };
};

const MIN_SCALE = 1;
const MAX_SCALE = 1.6;
const ACCEPT = 'image/jpeg,image/png,application/pdf';

const UploadReceipt = () => {
  const navigate = useNavigate();
  const { order, onSetReceiptData, onProceedToDelivery } =
    useOutletContext<WholesaleOutletContext>();

  const bgRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const detailsInputRef = useRef<HTMLInputElement | null>(null);
  const itemsInputRef = useRef<HTMLInputElement | null>(null);

  // ─── File state ────────────────────────────────────────────────────────────
  const [detailsFile, setDetailsFile] = useState<File | null>(null);
  const [detailsPreview, setDetailsPreview] = useState<string | null>(null);
  const [itemsFiles, setItemsFiles] = useState<File[]>([]);
  const [itemsPreviews, setItemsPreviews] = useState<(string | null)[]>([]);

  // ─── Customer info (initialised from persisted order state) ───────────────
  const [customerName, setCustomerName] = useState(order.customerName);
  const [deliveryAddress, setDeliveryAddress] = useState(order.address);
  const [contactNumber, setContactNumber] = useState(order.contactNumber);

  // Keep form fields in sync with the committed order state so that going back
  // and changing the store (or any other upstream field) is reflected here.
  useEffect(() => { setCustomerName(order.customerName); }, [order.customerName]);
  useEffect(() => { setDeliveryAddress(order.address); }, [order.address]);
  useEffect(() => { setContactNumber(order.contactNumber); }, [order.contactNumber]);
  const [addressFocused, setAddressFocused] = useState(false);
  const { suggestions, clear: clearSuggestions } = useAddressAutocomplete(
    deliveryAddress, addressFocused
  );

  // ─── Parallax background ──────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      rafRef.current = null;
      const el = bgRef.current;
      if (!el) return;
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, window.scrollY / max));
      el.style.transform = `translate3d(0, ${-progress * 40}px, 0) scale(${MIN_SCALE + (MAX_SCALE - MIN_SCALE) * progress})`;
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

  // Revoke local object URLs on unmount
  useEffect(() => {
    return () => {
      if (detailsPreview) URL.revokeObjectURL(detailsPreview);
      itemsPreviews.forEach(p => { if (p) URL.revokeObjectURL(p); });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── File handlers ────────────────────────────────────────────────────────
  const handleDetailsFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setDetailsFile(file);
    if (detailsPreview) URL.revokeObjectURL(detailsPreview);
    setDetailsPreview(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  };

  const handleItemsFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    if (incoming.length === 0) return;
    e.target.value = '';
    setItemsFiles(prev => [...prev, ...incoming]);
    setItemsPreviews(prev => [
      ...prev,
      ...incoming.map(f => f.type.startsWith('image/') ? URL.createObjectURL(f) : null),
    ]);
  };

  const removeItemFile = (index: number) => {
    const preview = itemsPreviews[index];
    if (preview) URL.revokeObjectURL(preview);
    setItemsFiles(prev => prev.filter((_, i) => i !== index));
    setItemsPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Proceed ──────────────────────────────────────────────────────────────
  const allFiles = detailsFile ? [detailsFile, ...itemsFiles] : [...itemsFiles];

  const canProceed =
    allFiles.length > 0 &&
    customerName.trim().length > 0 &&
    deliveryAddress.trim().length > 0 &&
    contactNumber.trim().length > 0;

  const handleProceed = () => {
    if (!canProceed) return;
    const previewUrls = [detailsPreview, ...itemsPreviews].filter((p): p is string => p !== null);
    const data: ReceiptFormData = {
      customerName,
      contactNumber,
      address: deliveryAddress,
      receiptBlobUrls: previewUrls,
    };
    onSetReceiptData(data);
    onProceedToDelivery();
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
        ←
      </button>

      <h1 className="step-title">Upload your receipt</h1>
      <p className="step-subtitle">
        From <strong>{order.store?.name}</strong>. Upload clear photos of your receipt — our team
        will verify the details after you place your order.
      </p>

      {/* ── Receipt uploads ──────────────────────────────────────────────────── */}
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
                    >×</button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="receipt-upload-add-more"
                onClick={() => itemsInputRef.current?.click()}
              >+ Add more</button>
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

      {/* ── Photo quality note ───────────────────────────────────────────────── */}
      <div className="receipt-clarity-note">
        <p className="receipt-clarity-heading">Make sure your photos are clear:</p>
        <ul className="receipt-clarity-list">
          <li>Store name visible</li>
          <li>Items and quantities readable</li>
          <li>Total amount shown</li>
        </ul>
      </div>

      {/* ── Customer info ────────────────────────────────────────────────────── */}
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
        <div className="receipt-field receipt-field--autocomplete">
          <label className="receipt-field-label" htmlFor="deliveryAddress">Delivery Address</label>
          <input
            id="deliveryAddress"
            type="text"
            className="receipt-field-input"
            placeholder="Street, suburb, city"
            value={deliveryAddress}
            onChange={e => { setDeliveryAddress(e.target.value); clearSuggestions(); }}
            onFocus={() => setAddressFocused(true)}
            onBlur={() => setTimeout(() => setAddressFocused(false), 150)}
            autoComplete="off"
          />
          {suggestions.length > 0 && addressFocused && (
            <ul className="address-suggestions">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  className="address-suggestion-item"
                  onMouseDown={() => {
                    setDeliveryAddress(s.label);
                    clearSuggestions();
                    setAddressFocused(false);
                  }}
                >
                  {s.label}
                </li>
              ))}
            </ul>
          )}
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

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <button
        type="button"
        className="btn-primary"
        disabled={!canProceed}
        onClick={handleProceed}
      >
        Get Delivery Price
      </button>
      {!canProceed && (
        <p className="receipt-scan-hint">
          Upload at least one receipt and fill in all your details to continue.
        </p>
      )}
    </section>
  );
};

export default UploadReceipt;
