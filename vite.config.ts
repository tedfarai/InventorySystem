import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: '.',
        filename: 'sw.js',
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.svg',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'maskable-icon.png',
          'PEX_Green_(2).png',
          'PEX_Green_(2).svg',
          'assets/pex-green-logo.png',
          'assets/pex-green-logo.svg',
        ],
        manifest: {
          name: 'Stationery & Cleaning Inventory — PWA Offline Procurement',
          short_name: 'ProcureSim',
          description: '100% Offline-capable Excel Procurement, Inventory Management & Stock Adjustment Progressive Web App',
          theme_color: '#0f172a',
          background_color: '#f8fafc',
          display: 'standalone',
          orientation: 'any',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'maskable-icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
          shortcuts: [
            {
              name: 'Master Stock',
              url: '/?tab=simulator',
              description: 'View current inventory ledger and balances',
            },
            {
              name: 'Stock Adjustment',
              url: '/?tab=simulator&action=adjustment',
              description: 'Perform verified stock reconciliation',
            },
            {
              name: 'Requisitions & Issues',
              url: '/?tab=simulator&action=issue',
              description: 'Create and dispatch material requests',
            },
            {
              name: 'Audit & Analytics',
              url: '/?tab=audit',
              description: 'View complete transaction and movement history',
            },
          ],
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,txt,woff2,wasm}'],
          maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MiB for SQLite WASM and complete offline bundle
        },
      }),
    ],
    build: {
      chunkSizeWarningLimit: 2500,
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
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
