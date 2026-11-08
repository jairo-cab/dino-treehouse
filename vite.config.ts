import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1500 },
  plugins: [
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'Dino Treehouse',
        short_name: 'Dino House',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#bfe8ff',
        theme_color: '#7ec850',
        icons: [],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,webp,png,mp3,ogg,json}'] },
    }),
  ],
});
