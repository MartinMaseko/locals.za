import { useEffect, useRef, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { Store, WholesaleOutletContext } from './wholesale.types';
import { api } from '../../../../utils/api';
import mapBanner from '../../../assets/images/mapDark.png';

const MIN_SCALE = 1;
const MAX_SCALE = 1.6;

const SelectStore = () => {
  const { order, onSelectStore, onConfirmStore } =
    useOutletContext<WholesaleOutletContext>();

  const [query, setQuery] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const bgRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const fetchStores = useCallback(() => {
    setLoading(true);
    setError(false);
    api.get<Store[]>('/api/stores')
      .then(res => {
        const normalised: Store[] = res.data.map(s => ({
          ...s,
          logo: s.logoUrl ?? s.logo,
        }));
        setStores(normalised);
        setError(false);
      })
      .catch(() => {
        setStores([]);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStores(); }, [fetchStores]);

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

  if (loading) {
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
          <div className="store-connection-state">
            <div className="store-connection-spinner" />
            <p className="store-connection-msg">Loading stores…</p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
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
          <div className="store-connection-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="#FFB803" strokeWidth="1.5"/>
              <path d="M12 7v5.5" stroke="#FFB803" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="12" cy="16.5" r="1" fill="#FFB803"/>
            </svg>
            <h2 className="store-connection-title">Could not load stores</h2>
            <p className="store-connection-msg">
              Check your connection and try again.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={fetchStores}
            >
              Try again
            </button>
          </div>
        </div>
      </section>
    );
  }

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
