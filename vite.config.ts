import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-icon.png',
        'assets/pex-green-logo.png',
        'assets/pex-green-logo.svg',
      ],
      manifest: {
        name: 'Paramount Exports Inventory',
        short_name: 'Paramount',
        description: 'Inventory and stock management app with offline support and installable PWA behavior.',
        theme_color: '#0f172a',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        id: '/',
        lang: 'en-US',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          { name: 'Master Stock', url: '/?tab=simulator', description: 'View current inventory ledger and balances' },
          { name: 'Stock Adjustment', url: '/?tab=simulator&action=adjustment', description: 'Perform verified stock reconciliation' },
          { name: 'Requisitions & Issues', url: '/?tab=simulator&action=issue', description: 'Create and dispatch material requests' },
          { name: 'Audit & Analytics', url: '/?tab=audit', description: 'View transaction and movement history' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,txt,woff2,wasm}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
  ],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-xlsx': ['xlsx'],
          'vendor-pdf': ['jspdf'],
          'vendor-motion': ['motion'],
          'vendor-db': ['idb', 'sql.js'],
        },
      },
    },
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
}));
