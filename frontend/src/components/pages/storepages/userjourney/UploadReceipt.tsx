import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import mapLight from '../../../assets/images/mapLight.png';
import type { ReceiptFormData, WholesaleOutletContext } from './wholesale.types';

const GOOGLE_MAPS_KEY = (import.meta.env.VITE_APP_GOOGLE_MAPS_API_KEY ?? '') as string;

// ── Google Places loader (module-level singleton) ─────────────────────────────

interface PlacePrediction {
  description: string;
  place_id: string;
}

let _gmapsPromise: Promise<void> | null = null;

const loadGoogleMaps = (): Promise<void> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = window as any;
  if (g.google?.maps?.places?.AutocompleteSuggestion) return Promise.resolve();
  if (_gmapsPromise) return _gmapsPromise;
  _gmapsPromise = new Promise<void>((resolve, reject) => {
    const cb = '__localsza_gmaps_cb__';
    // Maps JS API invokes this callback once the core is ready — importLibrary
    // is guaranteed to exist at that point (unlike in onload with loading=async).
    g[cb] = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (g.google.maps.importLibrary as (lib: string) => Promise<any>)('places')
        .then(() => resolve())
        .catch(reject)
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        .finally(() => { delete g[cb]; });
    };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&loading=async&callback=${cb}`;
    s.async = true;
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    s.onerror = () => { delete g[cb]; reject(new Error('Google Maps failed to load')); };
    document.head.appendChild(s);
  });
  return _gmapsPromise;
};

// ── Google Places autocomplete hook ──────────────────────────────────────────

const useGooglePlacesAutocomplete = (query: string, enabled: boolean) => {
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const debounceRef = useRef<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionTokenRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) return;
    loadGoogleMaps()
      .then(() => setReady(true))
      .catch(() => {});
  }, []);

  const search = useCallback(async (q: string) => {
    if (!ready || !q.trim() || q.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const places = (window as any).google.maps.places;
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new places.AutocompleteSessionToken();
      }
      const result = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: q,
        sessionToken: sessionTokenRef.current,
        includedRegionCodes: ['ZA'],
      });
      setSuggestions(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result.suggestions as any[]).map((s: any) => ({
          description: s.placePrediction.text.text,
          place_id: s.placePrediction.placeId,
        }))
      );
    } catch {
      setSuggestions([]);
    }
  }, [ready]);

  useEffect(() => {
    if (!enabled) { setSuggestions([]); return; }
    if (debounceRef.current != null) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => search(query), 300);
    return () => { if (debounceRef.current != null) clearTimeout(debounceRef.current); };
  }, [query, enabled, search]);

  const geocodePlaceId = async (placeId: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const places = (window as any).google.maps.places;
      const place = new places.Place({ id: placeId });
      await place.fetchFields({ fields: ['location'] });
      const loc = place.location;
      if (!loc) return null;
      sessionTokenRef.current = null; // session ends after place detail fetch
      return { lat: loc.lat() as number, lng: loc.lng() as number };
    } catch {
      return null;
    }
  };

  const clear = () => setSuggestions([]);

  return { suggestions, clear, geocodePlaceId };
};

// ── Parallax constants ────────────────────────────────────────────────────────

const MIN_SCALE = 1;
const MAX_SCALE = 1.6;
const ACCEPT = 'image/jpeg,image/png,application/pdf';

// ── Component ─────────────────────────────────────────────────────────────────

const UploadReceipt = () => {
  const navigate = useNavigate();
  const { order, onSetReceiptData, onProceedToDelivery } =
    useOutletContext<WholesaleOutletContext>();

  const bgRef           = useRef<HTMLDivElement | null>(null);
  const rafRef          = useRef<number | null>(null);
  const detailsInputRef = useRef<HTMLInputElement | null>(null);
  const itemsInputRef   = useRef<HTMLInputElement | null>(null);

  // ─── File state ────────────────────────────────────────────────────────────
  const [detailsFile, setDetailsFile]     = useState<File | null>(null);
  const [detailsPreview, setDetailsPreview] = useState<string | null>(null);
  const [itemsFiles, setItemsFiles]       = useState<File[]>([]);
  const [itemsPreviews, setItemsPreviews] = useState<(string | null)[]>([]);

  // ─── Customer info ─────────────────────────────────────────────────────────
  const [customerName, setCustomerName]       = useState(order.customerName);
  const [deliveryAddress, setDeliveryAddress] = useState(order.address);
  const [contactNumber, setContactNumber]     = useState(order.contactNumber);
  const [addressCoords, setAddressCoords]     = useState<{ lat: number; lng: number } | null>(
    order.addressLat && order.addressLng
      ? { lat: order.addressLat, lng: order.addressLng }
      : null,
  );

  useEffect(() => { setCustomerName(order.customerName); }, [order.customerName]);
  useEffect(() => { setDeliveryAddress(order.address); }, [order.address]);
  useEffect(() => { setContactNumber(order.contactNumber); }, [order.contactNumber]);

  const [addressFocused, setAddressFocused] = useState(false);
  const { suggestions, clear: clearSuggestions, geocodePlaceId } =
    useGooglePlacesAutocomplete(deliveryAddress, addressFocused);

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
      addressLat: addressCoords?.lat,
      addressLng: addressCoords?.lng,
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
            onChange={e => {
              setDeliveryAddress(e.target.value);
              setAddressCoords(null); // clear coords — user typed manually
              clearSuggestions();
            }}
            onFocus={() => setAddressFocused(true)}
            onBlur={() => setTimeout(() => setAddressFocused(false), 200)}
            autoComplete="off"
          />
          {/* Google Places suggestions */}
          {suggestions.length > 0 && addressFocused && (
            <ul className="address-suggestions">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  className="address-suggestion-item"
                  onMouseDown={async () => {
                    setDeliveryAddress(s.description);
                    clearSuggestions();
                    setAddressFocused(false);
                    const coords = await geocodePlaceId(s.place_id);
                    setAddressCoords(coords);
                  }}
                >
                  {s.description}
                </li>
              ))}
            </ul>
          )}
          {addressCoords && (
            <p className="receipt-address-resolved">
              ✓ Address located
            </p>
          )}
          {!GOOGLE_MAPS_KEY && (
            <p className="receipt-address-hint">
              Address search unavailable — VITE_APP_GOOGLE_MAPS_API_KEY not set.
            </p>
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
