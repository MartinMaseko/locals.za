import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        cleanupOutdatedCaches: true,
        sourcemap: true
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Create separate chunks for large dependencies
            if (id.includes('firebase')) {
              return 'firebase-vendor'
            }
            return 'vendor'
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    headers: {
      'Content-Security-Policy': `
        default-src 'self';
        img-src 'self' data: https:;
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com;
        connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com;
        frame-src 'self' https://www.googletagmanager.com;
      `.replace(/\s+/g, ' ').trim()
    }
  }
});
