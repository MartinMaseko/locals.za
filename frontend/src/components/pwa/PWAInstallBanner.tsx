/**
 * PWAInstallBanner
 *
 * Bottom-sheet install prompt.
 *
 * Auto-show: fires 2.5 s after the user lands on /order/select-store (first visit only).
 * Manual:    call `triggerPWAInstall()` from anywhere (e.g. the navbar "Install App" option).
 *
 * Chrome/Android  → native `beforeinstallprompt` flow
 * iOS Safari      → manual "Share → Add to Home Screen" instructions sheet
 *
 * Dismissed state is persisted in localStorage for 14 days.
 * Never shown when the app is already running in standalone/installed mode.
 *
 * Exports
 * -------
 *   default          PWAInstallBanner  — mount once in App.tsx
 *   triggerPWAInstall()               — imperatively show the install UI
 *   usePWAInstallAvailable()          — hook: returns true when install is possible
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import './PWAInstallBanner.css';

// ── Types ──────────────────────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ── Module-level state ─────────────────────────────────────────────────────────
// `beforeinstallprompt` can fire before React mounts — capture it immediately.

let _deferredPrompt: BeforeInstallPromptEvent | null = null;
const _promptSubscribers: Array<(e: BeforeInstallPromptEvent) => void> = [];

// Manual trigger: the mounted component registers its show callback here.
let _showSheet: (() => void) | null = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e as BeforeInstallPromptEvent;
    _promptSubscribers.forEach(fn => fn(_deferredPrompt!));
  });
  window.addEventListener('appinstalled', () => {
    _deferredPrompt = null;
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const DISMISS_KEY    = 'lza-pwa-dismissed';
const DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as any).standalone === true;

const isDismissed = (): boolean => {
  const v = localStorage.getItem(DISMISS_KEY);
  if (!v) return false;
  return Date.now() - parseInt(v, 10) < DISMISS_TTL_MS;
};

const isIOS = (): boolean =>
  /iPhone|iPad|iPod/i.test(navigator.userAgent) && !(window as any).MSStream;

const isMobile = (): boolean => window.innerWidth <= 820;

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Imperatively trigger the install UI from anywhere in the app.
 * Chrome/Android: fires the native browser install dialog.
 * iOS: shows the "Share → Add to Home Screen" instructions sheet.
 */
export const triggerPWAInstall = (): void => {
  if (isStandalone()) return;
  if (_deferredPrompt) {
    _deferredPrompt.prompt();
    return;
  }
  // iOS or fallback — show the instructions sheet
  _showSheet?.();
};

/**
 * Hook: returns true when the app can be installed (or iOS instructions can be shown).
 * Use this to show/hide "Install App" UI elements.
 */
export const usePWAInstallAvailable = (): boolean => {
  const [available, setAvailable] = useState(
    () => !isStandalone() && (_deferredPrompt !== null || isIOS()),
  );

  useEffect(() => {
    if (isStandalone()) return;
    if (isIOS()) { setAvailable(true); return; }

    const onPrompt = () => setAvailable(true);
    const onInstalled = () => setAvailable(false);

    if (_deferredPrompt) { setAvailable(true); return; }

    _promptSubscribers.push(onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      const i = _promptSubscribers.indexOf(onPrompt);
      if (i >= 0) _promptSubscribers.splice(i, 1);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return available;
};

// ── iOS Share icon (SVG) ──────────────────────────────────────────────────────

const IOSShareIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="15"
    height="15"
    fill="#FFB803"
    style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 2px -1px' }}
    aria-hidden="true"
  >
    <path d="M12 2.5l-4 4h2.5v7h3v-7H16L12 2.5z"/>
    <path d="M17 12v6H7v-6H5v8h14v-8h-2z"/>
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────

const PWAInstallBanner: React.FC = () => {
  const [visible, setVisible]   = useState(false);
  const [ios, setIos]           = useState(false);
  const promptRef               = useRef<BeforeInstallPromptEvent | null>(_deferredPrompt);
  const location                = useLocation();

  // Register the manual-trigger callback while this component is mounted
  useEffect(() => {
    _showSheet = () => {
      setIos(isIOS());
      setVisible(true);
    };
    return () => { _showSheet = null; };
  }, []);

  // Auto-show logic — only on /order/select-store, 2.5 s delay, first visit only
  useEffect(() => {
    if (!location.pathname.startsWith('/order/select-store')) return;
    if (isStandalone() || isDismissed() || !isMobile()) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    if (isIOS()) {
      setIos(true);
      timer = setTimeout(() => setVisible(true), 2500);
      return () => { if (timer) clearTimeout(timer); };
    }

    // Chrome / Android / Edge — wait for deferred prompt
    const show = (e: BeforeInstallPromptEvent) => {
      promptRef.current = e;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setVisible(true), 2500);
    };

    if (_deferredPrompt) {
      promptRef.current = _deferredPrompt;
      timer = setTimeout(() => setVisible(true), 2500);
    } else {
      _promptSubscribers.push(show);
    }

    return () => {
      if (timer) clearTimeout(timer);
      const i = _promptSubscribers.indexOf(show);
      if (i >= 0) _promptSubscribers.splice(i, 1);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  }, []);

  const install = useCallback(async () => {
    if (!promptRef.current) return;
    try {
      await promptRef.current.prompt();
      const { outcome } = await promptRef.current.userChoice;
      _deferredPrompt = null;
      promptRef.current = null;
      outcome === 'accepted' ? setVisible(false) : dismiss();
    } catch {
      dismiss();
    }
  }, [dismiss]);

  if (!visible) return null;

  return (
    <div className="pwa-banner" role="dialog" aria-modal="true" aria-label="Install LocalsZA app">
      {/* Backdrop tap to dismiss */}
      <div className="pwa-banner__backdrop" onClick={dismiss} aria-hidden="true" />

      <div className="pwa-banner__sheet">
        {/* Drag handle */}
        <div className="pwa-banner__handle" aria-hidden="true" />

        {/* Header row */}
        <div className="pwa-banner__header">
          <img
            className="pwa-banner__icon"
            src="/assets/icons/icon-192x192.png"
            alt="LocalsZA icon"
          />
          <div className="pwa-banner__meta">
            <p className="pwa-banner__title">LocalsZA</p>
            <p className="pwa-banner__sub">Delivery Service · Sameday Delivery</p>
          </div>
          <button
            className="pwa-banner__close"
            onClick={dismiss}
            aria-label="Dismiss install prompt"
          >
            ✕
          </button>
        </div>

        {/* iOS: manual instructions */}
        {ios ? (
          <>
            <div className="pwa-banner__ios-box">
              <p className="pwa-banner__ios-text">
                Tap the <IOSShareIcon /><strong> Share</strong> button,
                then select <strong>"Add to Home Screen"</strong>.
              </p>
              <div className="pwa-banner__ios-arrow" aria-hidden="true">↓</div>
            </div>
            <button className="pwa-banner__btn-later" onClick={dismiss}>
              Got it
            </button>
          </>
        ) : (
          /* Chrome / Android: native prompt */
          <div className="pwa-banner__actions">
            <button className="pwa-banner__btn-install" onClick={install}>
              Install App
            </button>
            <button className="pwa-banner__btn-later" onClick={dismiss}>
              Not now
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PWAInstallBanner;
