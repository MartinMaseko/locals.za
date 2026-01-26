import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { compression } from 'vite-plugin-compression2'; // Import compression
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    // Add compression to reduce file transfer size
    compression({ algorithms: ['gzip'] }),
    compression({ algorithms: ['brotliCompress'], exclude: [/\.(br)$/, /\.(gz)$/] }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'LocalsZA',
        short_name: 'LocalsZA',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        sourcemap: true,
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
            // Split out heavy libraries
            if (id.includes('firebase')) return 'firebase-core';
            if (id.includes('react-dom')) return 'react-dom'; // Split React DOM
            if (id.includes('react-router')) return 'react-router';
            if (id.includes('slick-carousel')) return 'ui-carousel';
            if (id.includes('react')) return 'react-core';
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
    headers: {
      'Content-Security-Policy': `
        default-src 'self';
        img-src 'self' data: https: blob:;
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://apis.google.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com;
        connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://europe-west4-localsza.cloudfunctions.net https://firebasestorage.googleapis.com https://www.payfast.co.za https://api.payfast.co.za https://www.google-analytics.com https://analytics.google.com https://stats.g.doubleclick.net https://region1.google-analytics.com https://region1.analytics.google.com https://www.googletagmanager.com;
        frame-src 'self' https://www.googletagmanager.com https://apis.google.com https://localsza.firebaseapp.com https://www.payfast.co.za;
        base-uri 'self';
        form-action 'self' https://www.payfast.co.za https://sandbox.payfast.co.za;
      `.replace(/\s+/g, ' ').trim()
    }
  }
});
