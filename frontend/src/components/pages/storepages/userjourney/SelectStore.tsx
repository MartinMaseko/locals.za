import { useEffect, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { Store, WholesaleOutletContext } from './wholesale.types';
import { STORES } from './wholesale.types';
import { api } from '../../../../utils/api';
import mapBanner from '../../../assets/images/mapDark.png';

const MIN_SCALE = 1;     // zoomed-out 
const MAX_SCALE = 1.6;   // zoomed-in 

const SelectStore = () => {
  const { order, onSelectStore, onConfirmStore } =
    useOutletContext<WholesaleOutletContext>();

  const [query, setQuery] = useState('');
  // Start with the local fallback array — replaced if the API responds
  const [stores, setStores] = useState<Store[]>(STORES);
  const [storeError, setStoreError] = useState<string | null>(null);
  const bgRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // Fetch live store list from the API, fall back to local STORES on failure
  useEffect(() => {
    api.get<Store[]>('/api/stores')
      .then(res => {
        // Normalise logoUrl → logo so the UI works the same for both sources
        const normalised: Store[] = res.data.map(s => ({
          ...s,
          logo: s.logoUrl ?? s.logo,
        }));
        setStores(normalised.length > 0 ? normalised : STORES);
        setStoreError(null);
      })
      .catch(() => {
        // API unavailable — silently use the local list
        setStoreError('Using local store list — connect to update');
      });
  }, []);

  const isSearching = query.trim().length > 0;
  const filtered = isSearching
    ? stores.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.tagline.toLowerCase().includes(query.toLowerCase()),
      )
    : stores.slice(0, 10);

  useEffect(() => {
    const update = () => {
      rafRef.current = null;
      const el = bgRef.current;
      if (!el) return;

      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, window.scrollY / max));

      const scale = MIN_SCALE + (MAX_SCALE - MIN_SCALE) * progress;
      const translateY = -progress * 40; // subtle parallax shift

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
    <section className="step-body select-store">
      <div
        ref={bgRef}
        className="select-store__map-bg"
        style={{ backgroundImage: `url(${mapBanner})` }}
        aria-hidden="true"
      />
      <div className="select-store__map-overlay" aria-hidden="true" />

      <div className="select-store__content">
      <h1 className="step-title">Choose a partner store</h1>
      <p className="step-subtitle">
        Select where you bought from. We'll fetch your receipt and arrange delivery.
      </p>

      {storeError && (
        <p className="store-api-notice">{storeError}</p>
      )}

      <div className="store-search-wrap">
        <span className="store-search-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M13 13L17.5 17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </span>
        <input
          type="search"
          className="store-search-input"
          placeholder="Search stores…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          aria-label="Search stores"
        />
        {query && (
          <button
            type="button"
            className="store-search-clear"
            onClick={() => setQuery('')}
            aria-label="Clear search"
          >✕</button>
        )}
      </div>

      <div className="store-grid">
        {filtered.length === 0 && (
          <p className="store-search-empty">No stores match "{query}"</p>
        )}
        {filtered.map(store => {
          const active = order.store?.id === store.id;
          return (
            <button
              key={store.id}
              type="button"
              className={`store-card${active ? ' store-card--selected' : ''}`}
              onClick={() => onSelectStore(store)}
              aria-pressed={active}
            >
              <div
                className="store-logo"
                style={{ backgroundColor: store.color }}
              >
                {store.logo ? (
                  <img
                    src={store.logo}
                    alt={store.name}
                    className="store-logo-img"
                  />
                ) : (
                  store.initials
                )}
              </div>
              <div className="store-name">{store.name}</div>
              <div className="store-tagline">{store.tagline}</div>
              {active && <div className="store-selected-badge">✓</div>}
            </button>
          );
        })}
      </div>

      {!isSearching && stores.length > 10 && (
        <p className="store-search-hint">
          Showing 10 of {stores.length} stores — search to find others
        </p>
      )}

      <button
        type="button"
        className="btn-primary"
        disabled={!order.store}
        onClick={onConfirmStore}
      >
        Select Store
      </button>
      </div>

    </section>
  );
};

export default SelectStore;
