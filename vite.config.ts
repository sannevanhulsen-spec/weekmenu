import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// data/ is served as-is: recipes.json, ingredients.json, nevo.json, prices/latest.json, icons/.
export default defineConfig({
  base: '/weekmenu/',
  publicDir: 'data',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Weekmenu',
        short_name: 'Weekmenu',
        lang: 'nl',
        display: 'standalone',
        start_url: '/weekmenu/',
        theme_color: '#16804a',
        background_color: '#ffffff',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png}'],
        // Data changes daily: network first, cached copy when offline.
        runtimeCaching: [{ urlPattern: /\.json$/, handler: 'NetworkFirst', options: { cacheName: 'data' } }],
      },
    }),
  ],
  test: { environment: 'node' },
});
