import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import mapLight from '../../../assets/images/mapLight.png';
import type { DeliveryQuote, WholesaleOutletContext } from './wholesale.types';
import { formatRand } from './wholesale.types';
import { api } from '../../../../utils/api';
// Azure Maps Control — CSS bundled by Vite
import 'azure-maps-control/dist/atlas.min.css';
import type * as AtlasTypes from 'azure-maps-control';

const MIN_SCALE = 1;
const MAX_SCALE = 1.6;
const AZURE_MAPS_KEY = (import.meta.env.VITE_AZURE_MAPS_KEY ?? '') as string;

// ── Azure Maps route map component ─────────────────────────────────────────────

interface RouteMapProps {
  quote: DeliveryQuote;
  storeName: string;
}

const RouteMap: React.FC<RouteMapProps> = ({ quote, storeName }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<AtlasTypes.Map | null>(null);
  const dsRef        = useRef<AtlasTypes.source.DataSource | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialise map once — Azure Maps needs a live DOM element
  useEffect(() => {
    if (!containerRef.current || mapRef.current || !AZURE_MAPS_KEY) return;

    let disposed = false;

    import('azure-maps-control').then((atlas) => {
      if (disposed || !containerRef.current) return;

      const map = new atlas.Map(containerRef.current, {
        center: [
          (quote.originLng + quote.destLng) / 2,
          (quote.originLat + quote.destLat) / 2,
        ],
        zoom: 10,
        authOptions: {
          authType: 'subscriptionKey' as AtlasTypes.AuthenticationType,
          subscriptionKey: AZURE_MAPS_KEY,
        },
        style: 'road',
        language: 'en-ZA',
        renderWorldCopies: false,
      });

      map.events.add('ready', () => {
        if (disposed) return;

        // Route line layer
        const ds = new atlas.source.DataSource();
        map.sources.add(ds);
        map.layers.add(new atlas.layer.LineLayer(ds, 'route-line', {
          strokeColor: '#E30613',
          strokeWidth: 4,
          strokeDashArray: [1, 0],
        }));

        dsRef.current = ds;
        mapRef.current = map;
        setMapReady(true);
      });
    });

    return () => {
      disposed = true;
      mapRef.current?.dispose();
      mapRef.current = null;
      dsRef.current  = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // init once

  // Update route whenever quote data changes and map is ready
  useEffect(() => {
    if (!mapReady || !mapRef.current || !dsRef.current) return;

    import('azure-maps-control').then((atlas) => {
      const map = mapRef.current;
      const ds  = dsRef.current;
      if (!map || !ds) return;

      // Clear previous route + markers
      ds.clear();
      map.markers.clear();

      // Draw route polyline
      if (quote.routePoints.length > 1) {
        ds.add(new atlas.data.Feature(new atlas.data.LineString(quote.routePoints)));
      }

      // Store origin marker
      map.markers.add(new atlas.HtmlMarker({
        color: '#FFE000',
        text: 'S',
        position: [quote.originLng, quote.originLat],
      }));

      // Destination marker
      map.markers.add(new atlas.HtmlMarker({
        color: '#E30613',
        text: 'D',
        position: [quote.destLng, quote.destLat],
      }));

      // Fit the camera to show full route + markers
      const allPositions: AtlasTypes.data.Position[] = [
        [quote.originLng, quote.originLat],
        [quote.destLng,   quote.destLat],
        ...quote.routePoints,
      ];
      const bbox = atlas.data.BoundingBox.fromPositions(allPositions);
      map.setCamera({ bounds: bbox, padding: 55, duration: 600 });
    });
  }, [mapReady, quote.routePoints, quote.originLat, quote.originLng,
      quote.destLat, quote.destLng, storeName]);

  if (!AZURE_MAPS_KEY || AZURE_MAPS_KEY === 'ADD_YOUR_AZURE_MAPS_KEY_HERE') {
    return (
      <div className="delivery-map-placeholder" aria-label="Map unavailable">
        <span>Map key not yet configured</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="delivery-map-azure"
      aria-label="Delivery route map"
    />
  );
};

// ── Main page ───────────────────────────────────────────────────────────────────

const DeliveryPage = () => {
  const navigate = useNavigate();
  const { order, onAddressChange, onSetDeliveryQuote, onProceedToPayment } =
    useOutletContext<WholesaleOutletContext>();

  const bgRef      = useRef<HTMLDivElement | null>(null);
  const rafRef     = useRef<number | null>(null);
  const debounceRef = useRef<number | null>(null);

  const [localAddress, setLocalAddress] = useState(order.address);
  const [quote, setQuote]               = useState<DeliveryQuote | null>(order.deliveryQuote);

  // Sync with parent order state so going back and changing the store or address
  // is reflected here without needing a full unmount/remount cycle.
  useEffect(() => { setLocalAddress(order.address); }, [order.address]);
  useEffect(() => { setQuote(order.deliveryQuote); }, [order.deliveryQuote]);
  const [fetchingQuote, setFetchingQuote] = useState(false);
  const [quoteError, setQuoteError]     = useState<string | null>(null);

  // ─── Parallax background ────────────────────────────────────────────────────
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
      if (rafRef.current  != null) window.cancelAnimationFrame(rafRef.current);
      if (debounceRef.current != null) clearTimeout(debounceRef.current);
    };
  }, []);

  // ─── Quote fetch ─────────────────────────────────────────────────────────────
  const fetchQuote = useCallback(async (address: string) => {
    if (!address.trim() || !order.store) return;
    setFetchingQuote(true);
    setQuoteError(null);

    try {
      const res = await api.post<DeliveryQuote>('/api/quotes/delivery', {
        storeId: order.store.id,
        dropoffAddress: address,
        isRush: false,
        isPool: false,
      });
      setQuote(res.data);
      onSetDeliveryQuote(res.data);
    } catch {
      setQuoteError('Could not calculate delivery cost. Check the address and try again.');
    } finally {
      setFetchingQuote(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.store]);

  // Auto-fetch on mount if we have an address but no persisted quote
  useEffect(() => {
    if (localAddress && !order.deliveryQuote) fetchQuote(localAddress);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddressChange = (addr: string) => {
    setLocalAddress(addr);
    onAddressChange(addr);
    if (debounceRef.current != null) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => fetchQuote(addr), 800);
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
        onClick={() => navigate('/order/upload-receipt')}
      >
        ←
      </button>

      <h1 className="step-title">Delivery details</h1>
      <p className="step-subtitle">
        Confirm where the driver should bring your order from{' '}
        <strong>{order.store?.name}</strong>.
      </p>

      {/* ── Live Azure Maps route display ─────────────────────────────────────── */}
      <div className="delivery-map">
        {quote && quote.routePoints?.length > 0 ? (
          <RouteMap quote={quote} storeName={order.store?.name ?? 'Store'} />
        ) : (
          /* Skeleton placeholder while quote is loading or address not entered */
          <div className="delivery-map-canvas" aria-hidden="true">
            <svg className="delivery-map-svg" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
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
              <polyline
                points="70,40 70,70 210,70 210,130 260,130 260,170 320,170"
                stroke="#E30613" strokeWidth="4" fill="none"
                strokeLinecap="round" strokeLinejoin="round" opacity="0.85"
              />
              <circle cx="70" cy="40" r="10" fill="#FFE000" stroke="#1a1a1a" strokeWidth="2" />
              <text x="70" y="44" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1a1a1a">S</text>
              <circle cx="320" cy="170" r="12" fill="#E30613" stroke="#fff" strokeWidth="2.5" />
              <circle cx="320" cy="170" r="4" fill="#fff" />
              {fetchingQuote && (
                <text x="200" y="125" textAnchor="middle" fontSize="11" fill="#555" fontFamily="sans-serif">
                  Calculating route…
                </text>
              )}
            </svg>
          </div>
        )}

        {/* Route info pill overlay */}
        <div className="delivery-map-overlay">
          <div className="delivery-route-pill">
            <div className="delivery-route-node">
              <span className="delivery-route-dot delivery-route-dot--store" />
              <span className="delivery-route-label">{order.store?.name ?? 'Store'}</span>
            </div>
            <div className="delivery-route-connector" />
            <div className="delivery-route-node">
              <span className="delivery-route-dot delivery-route-dot--dest" />
              <span className="delivery-route-label">{localAddress || 'Enter address below'}</span>
            </div>
          </div>
          {quote && (
            <div className="delivery-distance-badge">
              {quote.distanceKm} km
            </div>
          )}
        </div>
      </div>

      {/* ── Address input + pricing ───────────────────────────────────────────── */}
      <div className="delivery-address-form">
        <label className="delivery-address-label" htmlFor="delivery-address-input">
          Delivery address
        </label>
        <input
          id="delivery-address-input"
          type="text"
          className="delivery-address-input"
          placeholder="Street, suburb, city"
          value={localAddress}
          onChange={e => handleAddressChange(e.target.value)}
          autoComplete="street-address"
        />

        {fetchingQuote && (
          <p className="delivery-quote-loading">Calculating delivery cost…</p>
        )}
        {quoteError && !fetchingQuote && (
          <p className="delivery-quote-error">{quoteError}</p>
        )}
        {!quote && !fetchingQuote && !quoteError && localAddress.trim() && (
          <p className="delivery-quote-hint">Fetching delivery estimate…</p>
        )}

        {/* Live pricing breakdown */}
        {quote && !fetchingQuote && (
          <div className="delivery-price-breakdown">
            <div className="delivery-price-row">
              <span>Base fare</span>
              <span>{formatRand(quote.baseFare)}</span>
            </div>
            <div className="delivery-price-row">
              <span>Distance: {quote.distanceKm} km × {formatRand(quote.ratePerKm)}/km</span>
              <span>{formatRand(quote.distanceKm * quote.ratePerKm)}</span>
            </div>
            {quote.weightFee > 0 && (
              <div className="delivery-price-row">
                <span>Handling fee</span>
                <span>{formatRand(quote.weightFee)}</span>
              </div>
            )}
            {quote.isRush && (
              <div className="delivery-price-row">
                <span>Rush surcharge (×{quote.rushMultiplier})</span>
                <span>applied</span>
              </div>
            )}
            {quote.isPool && (
              <div className="delivery-price-row">
                <span>Pool discount (×{quote.poolDiscount})</span>
                <span>applied</span>
              </div>
            )}
            <div className="delivery-price-divider" />
            <div className="delivery-price-row total">
              <span>Total delivery fee</span>
              <strong>{formatRand(quote.totalFee)}</strong>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn-primary"
        onClick={onProceedToPayment}
        disabled={!localAddress.trim() || !quote || fetchingQuote}
      >
        Continue to Payment
      </button>
    </section>
  );
};

export default DeliveryPage;
