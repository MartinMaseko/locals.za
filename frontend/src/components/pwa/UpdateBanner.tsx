import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import './UpdateBanner.css';

const UpdateBanner: React.FC = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (!registration) return;
      registration.update();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update();
      });
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="update-banner" role="alert" aria-live="polite">
      <span className="update-banner__msg">
        Please refresh the page to apply the latest updates.
      </span>
      <button
        className="update-banner__btn"
        onClick={() => updateServiceWorker(true)}
      >
        Refresh
      </button>
    </div>
  );
};

export default UpdateBanner;
