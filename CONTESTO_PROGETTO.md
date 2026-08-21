# NavApp — Web App di Navigazione Marina

NavApp è una Progressive Web App (PWA) progettata per la navigazione da diporto e la vela. Riproduce l'estetica e la chiarezza di un chartplotter di bordo (interfaccia scura, dettagli ciano/ambra, tipografia monospaziata) sfruttando esclusivamente API, dati geografici e librerie open source/gratuite.

---

## 🛠️ Stack Tecnico

| Componente | Tecnologia / Provider |
|---|---|
| **Core Frontend** | React 18 + Vite |
| **Mappa & Rendering** | MapLibre GL JS |
| **Mappa Satellitare** | Esri World Imagery (XYZ Tile pubbliche) |
| **Layer Nautico** | OpenSeaMap (boe, fari, gavitelli, batimetriche) |
| **Meteo & Mare** | Open-Meteo Forecast & Marine API (Gratuite, no API Key) |
| **PWA & Offline** | `vite-plugin-pwa` + Service Worker + IndexedDB (`idb`) |
| **Hosting & CI/CD** | GitHub Pages + GitHub Actions (`deploy.yml`) |
| **Calcoli di Navigazione** | `@turf/turf` + `routeMath.js` (Miglia nautiche, Bearing, ETA) |
| **Sensori di Bordo** | HTML5 Geolocation API + DeviceOrientationEvent (Bussola) |

---

## 📱 Caratteristiche, PWA & UI Responsive

### 1. PWA Nativa Fullscreen & Gestione Cache
* **Schermo Intero**: Configurato `display: 'fullscreen'` nel manifest per nascondere le barre di sistema Android/iOS.
* **Maskable Icon**: Icone adattive con `purpose: 'any maskable'` e sfondo pieno scuro (`#0b1622`) per prevenire contorni o badge bianchi su Android.
* **Versione Dinamica**: Iniezione automatica della costante `APP_VERSION` definita in `vite.config.js`.
* **Auto-Update Cache**: Integrazione di `cleanupOutdatedCaches: true` in Workbox per eliminare la vecchia cache CSS/JS al riavvio dell'app.

### 2. Layout Multi-Dispositivo (360px – 2560px+)
* **Smartphone & Tablet Portrait (fino a 1024px)**:
  * Console bar compatta su 2 righe (telemetria in alto, controlli in basso).
  * Pannelli fluttuanti trasformati in *Bottom Sheets* ancorati in basso con angoli arrotondati.
  * Pannello previsioni vento svincolato in altezza (`bottom: auto`, `height: auto`) per azzerare gli spazi vuoti sopra e sotto i controlli.
* **Smartphone Landscape (Altezza < 500px)**: Dimensioni e padding ridotti per conservare la massima visibilità della mappa.
* **Notebook & Desktop (1280px – 2560px+)**: Layout da chartplotter widescreen con pannelli trasparenti agli angoli.

---

## 🗺️ Funzionalità Principali

* **Pianificazione Rotta**: Creazione dinamica di waypoint sulla mappa con calcolo di distanza totale (NM), rotta magnetica/vera ed ETA.
* **Esportazione Rotte**: Download immediato delle rotte in formato `.gpx` e `.json`.
* **Overlay Meteo & Animazione Vento**: Visualizzazione dei modelli vento e onde con slider temporale integrato.
* **Mappa Offline**: Intercettazione del protocollo `offline://` per il recupero delle tile geografiche salvate in IndexedDB.

---

## 🚀 Sviluppo Locale & Versionamento

### Gestione Versione
Per aggiornare la versione rilasciata della PWA, incrementa il valore all'inizio di `vite.config.js`:
```javascript
const APP_VERSION = '1.0.1'