import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'LocalsZA',
        short_name: 'LocalsZA',
        start_url: '.',
        display: 'standalone',
        background_color: '#f8f9fa',
        theme_color: '#ffb803',
        description: 'LocalsZA Progressive Web App',
        icons: [
          {
            src: '/assets/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/assets/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    }),
  ],
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        assetFileNames: (assetInfo) => {
          if (!assetInfo.name) return 'assets/[name][extname]';
          
          const { name } = assetInfo;
          const extType = name.split('.').pop();

          // Handle component assets
          if (name.includes('components/assets/')) {
            const cleanPath = name.replace('src/', '');
            return cleanPath;
          }

          // Handle other assets
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(extType || '')) {
            return `assets/images/[name][extname]`;
          }
          
          if (/css/i.test(extType || '')) {
            return `assets/css/[name][extname]`;
          }

          return 'assets/[name][extname]';
        },
        chunkFileNames: 'assets/js/[name].js',
        entryFileNames: 'assets/js/[name].js',
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    },
    headers: {
      'Content-Security-Policy': `
        default-src 'self';
        img-src 'self' data: https:;
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
        font-src 'self' https://fonts.gstatic.com;
        connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com;
        frame-src 'self' https://www.googletagmanager.com;
      `.replace(/\s+/g, ' ').trim()
    }
  }
});
