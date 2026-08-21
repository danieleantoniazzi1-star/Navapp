import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// 📌 SCRIVI QUI LA VERSIONE (Incrementala a ogni nuovo commit)
const APP_VERSION = '1.0.1'

export default defineConfig({
  base: '/Navapp/', 
  // Inietta la versione nel codice React (disponibile ovunque come __APP_VERSION__)
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION)
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: `NavApp v${APP_VERSION} - Navigazione Marittima`,
        short_name: 'NavApp',
        description: 'Navigazione marittima offline: mappa satellitare, carte nautiche, meteo mare, pianificazione rotte',
        theme_color: '#0b1622',
        background_color: '#0b1622',
        display: 'fullscreen',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true, // Cancella subito le vecchie cache al riavvio dell'app
        globPatterns: ['**/*.{js,css,html,svg}']
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  }
})