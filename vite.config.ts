/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.VITE_BASE_PATH || '/fitmama/';

function appVersion(): string {
  let sha = 'dev';
  try {
    sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || sha;
  } catch {
    /* A build without git still gets a date. */
  }
  return `${sha} · ${new Date().toISOString().slice(0, 10)}`;
}

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      scope: base,
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'],
      manifest: {
        id: base,
        name: 'Fit Mama',
        short_name: 'Fit Mama',
        description: 'Calm rhythm workouts you can do lying on the couch or bed.',
        theme_color: '#FFF8F1',
        background_color: '#FFF8F1',
        display: 'standalone',
        lang: 'en',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2,ico}'],
        navigateFallback: 'index.html',
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
