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
        'browserconfig.xml',
        'sw-custom.js',
        'assets/pex-green-logo.png',
        'assets/pex-green-logo.svg',
      ],
      manifest: {
        name: 'Paramount Exports — Stationery & Cleaning Inventory',
        short_name: 'Paramount',
        description: 'Automated stationery and cleaning stock management system with offline-first persistence and PWA installation.',
        theme_color: '#0f172a',
        background_color: '#f8fafc',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui', 'browser'],
        orientation: 'any',
        start_url: '/',
        scope: '/',
        id: '/',
        dir: 'ltr',
        lang: 'en-US',
        categories: ['business', 'productivity', 'utilities'],
        prefer_related_applications: false,
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          {
            name: 'Master Stock Ledger',
            short_name: 'Stock',
            url: '/?tab=simulator',
            description: 'View current inventory ledger, physical counts, and unit balances',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Receive Goods (GRN)',
            short_name: 'Receive',
            url: '/?tab=simulator&action=delivery',
            description: 'Log supplier deliveries and generate Goods Received Notes',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Issue Requests (SIV)',
            short_name: 'Issue',
            url: '/?tab=simulator&action=issue',
            description: 'Process departmental stock requests and issue vouchers',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Stock Reconciliation',
            short_name: 'Adjustment',
            url: '/?tab=simulator&action=adjustment',
            description: 'Submit and verify physical count adjustments',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Executive Dashboard',
            short_name: 'Dashboard',
            url: '/?tab=dashboard',
            description: 'View inventory valuation, turnover, and demand forecasting',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Audit Log Analytics',
            short_name: 'Audit',
            url: '/?tab=audit',
            description: 'View full movement trail, voucher records, and tamper-proof logs',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,txt,woff2,wasm}'],
        globIgnores: ['**/sql-wasm-inline-*.js'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        importScripts: ['sw-custom.js'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-charts': ['recharts', 'd3'],
          'vendor-icons': ['lucide-react'],
          'vendor-pdf': ['jspdf'],
          'vendor-motion': ['motion'],
          'vendor-db': ['idb', 'sql.js'],
        },
      },
    },
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true as const,
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {},
  },
}));
