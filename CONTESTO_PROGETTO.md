# NavApp — Contesto progetto (per riprendere in una nuova chat)

> Se stai iniziando una nuova conversazione con Claude per continuare questo
> progetto, incolla questo file (o allega semplicemente il repository) come
> primo messaggio. Contiene tutto il contesto necessario.

## Cos'è

Web app di navigazione marina (PWA) per diportisti/velisti, con estetica da
strumentazione di bordo (chartplotter scuro, ambra/ciano, IBM Plex Mono).
Solo dati e librerie gratuite/open source — nessuna API a pagamento.

## Stack tecnico

| Livello | Scelta |
|---|---|
| Frontend | React 18 + Vite |
| Mappa | MapLibre GL JS |
| Satellite | Esri World Imagery (tile XYZ pubbliche, no key) |
| Carta nautica | OpenSeaMap (tile raster: boe, fari, profondità) |
| Vento/mare | Open-Meteo Marine API + Forecast API (gratuite, no key) |
| Offline tile | IndexedDB via libreria `idb` |
| PWA | `vite-plugin-pwa` (app shell offline) |
| Calcoli rotta | `@turf/turf` (distanza, rotta/bearing) |
| Posizione | Geolocation API browser + DeviceOrientationEvent (bussola) |

## Ambiente di sviluppo dell'utente

- Windows, Git Bash (con Git GUI/TortoiseGit disponibili)
- Node.js + npm installati (v24.19 / npm 11.17 al momento dell'ultimo test)
- Repo GitHub privato: `danieleantoniazzi1-star/Navapp`
- Flusso di lavoro: Claude produce codice/zip → utente estrae e sostituisce
  i file nella cartella locale (che contiene `.git`) → `npm install` +
  `npm run dev` per testare → `git add -A && git commit && git push`
- **Importante**: l'utente non è uno sviluppatore esperto. Le istruzioni
  vanno date passo-passo, senza dare per scontata familiarità con git/npm.
  In passato si sono verificati: cancellazione accidentale di `.git` con
  `rm -rf`, upload via drag&drop nel browser GitHub che appiattisce le
  cartelle (va sempre usato git da terminale, mai upload manuale sul sito).

## Struttura cartelle

```
navapp/
  src/
    App.jsx                    # componente principale, stato globale, layout
    main.jsx
    index.css                  # tutti gli stili (tema chartplotter)
    components/
      MapView.jsx               # mappa MapLibre: layer base, click waypoint,
                                 # overlay vento (simbol layer), marker GPS
      LayerPanel.jsx             # toggle satellite/base OSM/carta nautica
      RoutePlanner.jsx            # lista waypoint, distanza/rotta, export GPX
      OfflinePanel.jsx             # download tile per area corrente
      WeatherPanel.jsx              # meteo (vento+onde) per posizione attuale
      WindTimeline.jsx               # toggle overlay vento + slider 24h
    services/
      tileCache.js                # IndexedDB: download/lettura tile offline
      weather.js                   # Open-Meteo Marine: condizioni puntuali
      windGrid.js                   # Open-Meteo batch: griglia vento per overlay
      geolocation.js                 # Geolocation API + bussola dispositivo
      gpx.js                          # export rotta in formato GPX
      routeMath.js                     # distanza (nm), rotta (bearing), ETA
```

## Stato attuale (funzionante)

- Mappa satellitare + carta nautica OpenSeaMap con toggle e opacità regolabile
- Click sulla mappa → crea waypoint, calcola distanza/rotta tra i punti, ETA
- Export rotta in GPX
- Pannello "Area offline": scarica le tile della vista corrente in IndexedDB
- Pannello "Vento & mare": mostra condizioni per la posizione attuale (GPS se
  attivo, altrimenti centro mappa), si auto-aggiorna quando ci si sposta di
  più di ~3 km, pulsante "Aggiorna" per forzare
- Overlay vento a griglia (toggle "VENTO" in alto) con frecce colorate
  (ciano→ambra→rosso per intensità) e slider temporale scorrevole (24h)
- Posizione GPS: pulsante "Attiva GPS" nella barra in alto, mostra un
  marcatore sulla mappa con freccia di prua (bussola del dispositivo se
  disponibile, altrimenti stimata dal "course over ground" del GPS quando
  ci si muove; nessuna freccia se nessuna delle due è disponibile)

## Cosa NON è ancora collegato

1. **Le tile offline non vengono lette in navigazione.** `tileCache.js`
   scarica e salva le tile in IndexedDB, ma `MapView.jsx` continua a
   leggerle sempre dalla rete. Serve un `protocol` custom di MapLibre
   (`map.addProtocol(...)`) che intercetti le richieste tile e, se la tile
   è già in cache o non c'è connessione, la serva da IndexedDB. **Questo è
   il pezzo più importante rimasto da fare per l'uso reale in barca.**
2. **Icone PWA mancanti**: il manifest in `vite.config.js` referenzia
   `pwa-192.png` e `pwa-512.png` che non esistono ancora in `public/`.
3. **Persistenza rotte**: le rotte create si perdono al refresh (non sono
   salvate in IndexedDB come le tile).
4. **Routing isocrone per vela**: rotta ottimale in base al vento previsto
   lungo il percorso — funzionalità avanzata, da valutare più avanti.
5. **Import GPX** (oggi c'è solo export).
6. **Griglia vento a risoluzione adattiva**: oggi è fissa (4×4) sull'area
   inquadrata al momento dell'attivazione; potrebbe essere più densa/rada
   in base allo zoom.

## Problema aperto da verificare

L'overlay vento, in un test precedente, è rimasto bloccato su "Caricamento
previsione…" oltre il timeout di 15 secondi previsto. È stata fatta una
riscrittura difensiva di `windGrid.js` (timeout "duro" con `Promise.race`,
richiesta semplificata senza `forecast_hours`, griglia ridotta a 4×4=16
punti, `console.debug` dell'URL richiesto). **Da verificare con l'utente se
il problema persiste** — se sì, il prossimo passo è chiedere di aprire la
Console del browser (F12) durante il test per leggere l'errore reale
(probabile causa: CORS, rate limit dell'API gratuita, o formato risposta
inatteso quando si richiedono molte location in batch).

## Note su limiti dei dati gratuiti

- Esri World Imagery e OpenSeaMap: uso libero per basso volume/personale;
  per traffico alto o uso commerciale valutare self-hosting o provider a
  pagamento.
- Open-Meteo: nessuna key ma rate limit ragionevoli per uso non commerciale;
  per molti utenti concorrenti servirebbe un layer di cache lato backend.
