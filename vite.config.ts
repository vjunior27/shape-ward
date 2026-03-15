/// <reference types="vitest" />
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [
    react(),
    visualizer({ filename: 'bundle-stats.html', open: false, gzipSize: true }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['trainova-icon.svg', 'apple-touch-icon.png', 'favicon.ico'],
      manifest: {
        name: 'Trainova — AI Fitness Coach',
        short_name: 'Trainova',
        description: 'Forje seu corpo com precisão de IA. Diário de treino, nutrição e coach TitanAI.',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['fitness', 'health', 'lifestyle'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },
          {
            urlPattern: /^https:\/\/generativelanguage\.googleapis\.com/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 2592000 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
  // NOTE: GEMINI_API_KEY is intentionally NOT defined here.
  // All AI calls go through the Firebase Cloud Function (chatWithTitan),
  // never directly from the client. Exposing the key via `define` would
  // bake it into the public JS bundle.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
            'firebase/functions',
            'firebase/messaging',
          ],
        },
      },
    },
  },
});
