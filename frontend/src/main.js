import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';
// Register service worker with error handling
registerSW({
    onNeedRefresh() {
        // Handle PWA update available
    },
    onOfflineReady() {
        // Handle PWA offline ready
    },
    onRegisteredSW() {
        // Handle SW registered
    },
    onRegisterError(error) {
        console.error('SW registration failed:', error);
    }
});
createRoot(document.getElementById('root')).render(_jsx(StrictMode, { children: _jsx(App, {}) }));
