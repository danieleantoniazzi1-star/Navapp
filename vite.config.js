import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// NavApp - configurazione base.
// Il caching delle TILE mappa (satellite/nautiche/meteo) NON passa da questo
// service worker generico: viene gestito manualmente in src/services/tileCache.js
// tramite IndexedDB, perché l'utente sceglie esplicitamente quali riquadri
// geografici scaricare (diversamente la cache crescerebbe senza controllo).
// Questo plugin PWA si occupa solo di rendere installabile l'app e di
// mettere in cache l'app shell (HTML/JS/CSS) per l'avvio offline.
export default defineConfig({
  base: '/Navapp/', 
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'NavApp - Navigazione Marina',
        short_name: 'NavApp',
        description: 'Navigazione marina offline: mappa satellitare, carte nautiche, meteo mare, pianificazione rotte',
        theme_color: '#0b1622',
        background_color: '#0b1622',
        display: 'fullscreen',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        // App shell only: le tile hanno la loro pipeline dedicata (tileCache.js)
        globPatterns: ['**/*.{js,css,html,svg}']
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  }
})
