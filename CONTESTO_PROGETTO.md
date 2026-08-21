# NavApp — Contesto Progetto

Web app di navigazione marina (PWA) per diportisti/velisti, con estetica da strumentazione di bordo (chartplotter scuro, ambra/ciano/giallo, font IBM Plex Mono).
Solo dati e librerie gratuite/open source — nessuna API a pagamento.

## Stack tecnico
| Livello | Scelta |
|---|---|
| Frontend | React 18 + Vite |
| Mappa | MapLibre GL JS |
| Satellite | Esri World Imagery (tile XYZ pubbliche, no key) |
| Carta nautica | OpenSeaMap (tile raster: boe, fari, profondità) |
| Vento/mare | Open-Meteo Forecast API + Marine API (gratuite, no key) |
| Offline tile | IndexedDB via libreria `idb` |
| PWA | `vite-plugin-pwa` (app shell offline) |
| Calcoli rotta | `@turf/turf` + `routeMath.js` (distanze nm, bearing, ETA) |
| Posizione | Geolocation API browser + DeviceOrientationEvent (bussola) |

## Stato attuale (Ultimo aggiornamento: UI Top-Bar Toggles)
L'applicazione ha un'interfaccia **completamente pulita**: all'avvio la mappa occupa il 100% dello schermo senza sovrapposizioni o menu coprenti.

- **Barra Superiore (Console Bar)**:
  - Readout strumenti: Telemetria Lat/Lon, Zoom, Conteggio Waypoint, Posizione GPS e Prua bussola.
  - Pulsanti toggle dedicati: `OFFLINE`, `LIVELLI`, `ROTTA`, `PREVISIONI`, `METEO`, `GPS`.
- **Gestione Overlay**: Tutti i pannelli fluttuanti (`OfflinePanel`, `LayerPanel`, `RoutePlanner`, `ForecastPanel`, `WeatherPanel`) sono gestiti a comparsa su richiesta via stato in `App.jsx`, preservando lo stile nativo `index.css`.
- **Mappa Offline & Protocollo**: Intercettazione `offline://` con decodifica URL per le tile salvate in IndexedDB.
- **Previsioni Vento/Mare**: Griglia di simulazione 12x12 con overlay dinamico e timeline di riproduzione temporale in `ForecastPanel`.
- **GPS & Bussola**: Marcatore ancorato geograficamente con freccia direzionale/bussola reale.

## Prossimi Step
1. **PWA (Manifest e Icone)**: Inserimento file `pwa-192.png`, `pwa-512.png` in `/public` e configurazione `vite.config.js`.
2. **Persistenza Rotte**: Salvataggio ed esportazione GPX/JSON dei Waypoint in `localStorage` o `idb`.