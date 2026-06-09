import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Use the hand-crafted manifest.webmanifest in /public instead of generating one.
      // This avoids duplicating manifest entries and keeps icons pointing to correct paths.
      manifest: false,
      includeAssets: ['locals-favicon.svg', 'assets/icons/icon-192x192.png', 'assets/icons/icon-512x512.png'],
      workbox: {
        cleanupOutdatedCaches: true,
        sourcemap: true,
        // Skip waiting and claim clients immediately
        skipWaiting: true,
        clientsClaim: true,
        // Cache Google Fonts to improve LCP on repeat visits
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Azure API — Network First, short cache so data stays fresh
          {
            urlPattern: /^https:\/\/localsza-api.*\.azurewebsites\.net\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'azure-api-cache',
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 2 // 2 minutes max stale
              },
              cacheableResponse: {
                statuses: [200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  build: {
    sourcemap: false, // Disable sourcemaps in production to reduce upload size (does not affect performance, but good practice)
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Split out heavy libraries first (order matters — most specific first)
            if (id.includes('firebase'))            return 'firebase-core';
            if (id.includes('react-dom'))           return 'react-dom';
            if (id.includes('react-router'))        return 'react-router';
            if (id.includes('azure-maps-control'))  return 'azure-maps';
            if (id.includes('@supabase'))            return 'supabase';
            if (id.includes('date-fns'))             return 'date-fns';
            if (id.includes('axios'))                return 'axios';
            if (id.includes('slick-carousel'))       return 'ui-carousel';
            if (id.includes('react'))                return 'react-core';
            return 'vendor';
          }
          // Existing page splitting
          if (id.includes('pages/buyers')) return 'buyers';
          if (id.includes('pages/dashboard')) return 'dashboard';
          if (id.includes('pages/drivers')) return 'drivers';
          if (id.includes('pages/sales')) return 'sales';
          if (id.includes('pages/storepages')) return 'store';
        }
      }
    },
    chunkSizeWarningLimit: 800
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://localsza-api-a7eegch0fxfjh3at.southafricanorth-01.azurewebsites.net',
        changeOrigin: true,
        secure: true,
      },
    },
    headers: {
      'Content-Security-Policy': `
        default-src 'self';
        img-src 'self' data: https: blob: https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://region1.google-analytics.com https://www.googletagmanager.com;
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://apis.google.com https://maps.googleapis.com https://stats.g.doubleclick.net https://ssl.google-analytics.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com https://atlas.microsoft.com https://*.atlas.microsoft.com;
        connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://europe-west4-localsza.cloudfunctions.net https://firebasestorage.googleapis.com https://maps.googleapis.com https://places.googleapis.com https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://region1.google-analytics.com https://region1.analytics.google.com https://www.googletagmanager.com https://localsza-api.azurewebsites.net https://localsza-api-a7eegch0fxfjh3at.southafricanorth-01.azurewebsites.net https://atlas.microsoft.com https://*.atlas.microsoft.com;
        worker-src 'self' blob:;
        frame-src 'self' https://www.googletagmanager.com https://apis.google.com https://localsza.firebaseapp.com https://www.payfast.co.za/ https://sandbox.payfast.co.za/;
        object-src 'none';
        base-uri 'self';
        form-action 'self' https://www.payfast.co.za/eng/process https://sandbox.payfast.co.za/eng/process;
      `.replace(/\s+/g, ' ').trim()
    }
  }
});
