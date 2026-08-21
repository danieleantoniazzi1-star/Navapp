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

## 📱 Caratteristiche & UI Responsive

### 1. PWA Nativa Fullscreen & Icone Adattive
* **Schermo Intero**: Configurato `display: 'fullscreen'` nel manifest di Vite per nascondere la barra di stato e la barra di navigazione di Android/iOS.
* **Maskable Icon**: Implementate icone con `purpose: 'any maskable'` e sfondo pieno scuro (`#0b1622`) per eliminare il contorno o il badge bianco nel menu di Android.

### 2. Layout Responsive per Mobile (Modalità Portrait)
* **Console Bar a 2 Righe**: Telemetria principale (Lat/Lon, Zoom, Waypoint) nella riga superiore e pulsanti di controllo immediato nella riga inferiore per evitare sovrapposizioni su schermi stretti.
* **Bottom Sheets**: I pannelli fluttuanti (*Rotta*, *Layer*, *Meteo*) si trasformano in schede ancorate in basso con angoli arrotondati, per una gestione nativa tramite swipe/scroll.
* **Pannello Previsioni Vento**: Svincolato dall'ancoraggio verticale (`bottom: auto`), compattando il contenitore scuro attorno agli elementi per azzerare gli spazi vuoti sopra e sotto.
* **Suggerimenti di Navigazione**: Il popup `mode-hint` ("*Clicca sulla mappa per aggiungere un waypoint*") è posizionato in alto subito sotto la barra strumenti per non coprire il pannello di gestione rotta.

---

## 🗺️ Funzionalità Principali

* **Pianificazione Rotta**: Creazione dinamica di waypoint sulla mappa con calcolo automatico della distanza totale (NM) e rotta magnetica/vera.
* **Esportazione Rotte**: Download immediato delle rotte tracciate in formato `.gpx` e `.json`.
* **Overlay Meteo & Animazione Vento**: Selezione dei modelli di previsione vento e onde con slider temporale integrato.
* **Mappa Offline**: Intercettazione del protocollo `offline://` per il recupero dei riquadri geografici (tile) memorizzati localmente in IndexedDB.

---

## 🚀 Sviluppo Locale & Build

### Comandi principali

```bash
# Installazione dipendenze
npm install

# Avvio del server di sviluppo
npm run dev

# Compilazione per la produzione
npm run build