# NavApp — Web app di navigazione marina

Stack 100% open source / dati gratuiti, pensato per essere esteso.

## Architettura

| Strato | Scelta | Perché |
|---|---|---|
| Motore mappa | MapLibre GL JS | Fork open source di Mapbox GL, WebGL, buon supporto cache offline |
| Frontend | React + Vite | Sviluppo veloce, componenti isolati per ogni pannello |
| Satellite | Esri World Imagery (tile XYZ) | Gratuito, nessuna API key |
| Carta nautica | OpenSeaMap (tile raster) | Boe, fari, profondità, ancoraggi, open data |
| Vento / stato mare | Open-Meteo Marine API | Gratuita, nessuna key, onde + vento |
| Offline | IndexedDB (via `idb`) + PWA (`vite-plugin-pwa`) | Tile scaricate a richiesta per area scelta dall'utente |
| Rotte | Calcolo con `@turf/turf`, export GPX | Standard universale, leggibile da altri plotter |

## Struttura cartelle

```
src/
  components/
    MapView.jsx       # rendering mappa + layer + click per waypoint
    LayerPanel.jsx     # toggle satellite / base OSM / carta nautica
    RoutePlanner.jsx   # lista waypoint, distanza/rotta, export GPX
    OfflinePanel.jsx   # download tile per area corrente
  services/
    tileCache.js       # download e lettura tile da IndexedDB
    weather.js          # fetch Open-Meteo Marine API
    gpx.js               # export rotta in formato GPX
    routeMath.js         # distanza (nm), rotta (bearing), ETA
```

## Come si avvia

```bash
npm install
npm run dev
```

## Cosa manca / prossimi passi

1. **Uso effettivo delle tile offline nella mappa**: al momento `tileCache.js`
   scarica e salva le tile, ma `MapView.jsx` le legge sempre dalla rete.
   Il prossimo passo è un `protocol` MapLibre custom (`addProtocol`) che
   intercetta le richieste tile e, se offline o se la tile è in cache,
   la serve da IndexedDB invece che dalla rete.
2. **Overlay vento/mare sulla mappa** (non solo su singolo waypoint): si può
   aggiungere un layer a frecce/particelle (es. tecnica "wind particles" con
   Canvas/WebGL) usando una griglia di punti Open-Meteo sull'area visibile.
3. **Icone PWA**: aggiungere `public/pwa-192.png` e `public/pwa-512.png`
   (al momento solo referenziate nel manifest, da creare).
4. **Routing "isocrone"** per vela: calcolo rotta ottimale considerando il
   vento previsto lungo il percorso — funzionalità avanzata, da valutare
   dopo che il flusso base è solido.
5. **Persistenza rotte**: salvare le rotte create in IndexedDB (oggi si
   perdono al refresh), con un pannello "le mie rotte".
6. **Import GPX** oltre all'export, per caricare rotte da altri strumenti.

## Note sui limiti d'uso dei dati gratuiti

- Esri World Imagery e OpenSeaMap sono gratuiti per uso personale/basso
  volume; in caso di traffico elevato o uso commerciale, valutare un
  self-hosted tile server (es. tile server locale da estratti OSM) o un
  provider a pagamento.
- Open-Meteo non richiede key ma ha rate limit ragionevoli per uso non
  commerciale; per un'app con molti utenti concorrenti va valutato un
  layer di caching lato backend.
