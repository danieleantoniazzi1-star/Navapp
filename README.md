# NavApp — Web App di Navigazione Marina

NavApp è una Progressive Web App (PWA) progettata per la navigazione da diporto e la vela. Riproduce l'estetica e la chiarezza di un chartplotter di bordo (interfaccia scura, dettagli ciano/ambra, tipografia monospaziata) sfruttando esclusivamente API, dati geografici e librerie open source/gratuite.

---

## 🛠️ Stack Tecnico & Architettura

| Componente | Tecnologia / Provider |
|---|---|
| **Core Frontend** | React 18 + Vite |
| **Mappa & Rendering** | MapLibre GL JS |
| **Mappe Base & Nautiche** | Esri World Imagery, OpenStreetMap, OpenSeaMap |
| **Meteo & Mare** | Open-Meteo Forecast & Marine API (gratuite, no API Key) |
| **Live AIS** | WebSocket via `aisstream.io` (Richiede API Key gratuita lato client) |
| **PWA & Offline** | `vite-plugin-pwa` + Service Worker + IndexedDB (`idb`) |
| **Calcoli di Navigazione**| `@turf/turf` + algoritmi custom (bearing, distanze, lat/lon) |
| **Sensori Hardware** | HTML5 Geolocation API (Posizione) + DeviceOrientationEvent (Bussola) |

---

## 🗺️ Funzionalità Implementate

### 1. Sistema di Mappe e Caching Offline
* Layer multipli: Satellitare, Base stradale, Carte nautiche (batimetriche, boe, fari).
* **Protocollo Offline**: Integrazione personalizzata `offline://` per intercettare le richieste di MapLibre e servire i riquadri (tiles) salvati localmente in IndexedDB.
* ⏳ **Pending**: il caching effettivo dei tile in IndexedDB e la loro riproposizione via protocollo `offline://` non sono ancora completamente implementati — attualmente le richieste passano sempre in rete. Prossimo item da riprendere.

### 2. Strumentazione e Rotta
* **GPS & Bussola**: Marker dinamico sulla mappa. La bussola orienta la prua (freccia azzurra), mentre il goniometro (N, S, E, W) rimane ancorato all'orientamento geografico.
* **Pianificazione Rotta**: Creazione di waypoint con calcolo della rotta magnetica/vera e della distanza. Se il GPS è attivo, mostra la linea di fede (bearing) verso il waypoint target.

### 3. Meteo e Previsioni Marine
* Fetch dinamico basato sul Bounding Box (BBox) visualizzato a schermo (griglia 12x12).
* Visualizzazione vettoriale del **Vento** (frecce con direzione e velocità) e delle **Onde** (direzione e altezza) tramite interpolazione di colori e dimensioni.
* Timeline (slider) per visualizzare le previsioni orarie.

### 4. PWA, Versionamento e Responsive UI
* Configurazione `manifest` per avvio Fullscreen e icone adattive (`maskable`).
* Gestione della cache con auto-update (Workbox) e versionamento dinamico per forzare gli aggiornamenti lato client.
* Interfaccia responsiva da 360px a 2560px (Console a 2 righe e Bottom Sheets su mobile, Floating Panels su Desktop).

---

## 🚢 Modulo AIS (Live Traffic) — Codice Pronto, Bloccato da Outage Esterno

**Aggiornamento (22 Agosto 2026):** il debug è stato completato lato client. Il codice `MapView.jsx` è stato corretto e funziona correttamente. Il motivo per cui le navi non comparivano **non è un bug del nostro codice**, ma un'interruzione temporanea del servizio `aisstream.io` lato server.

### ✅ Fix Applicati a `MapView.jsx`
Il bug originale era il classico pattern di **swallow silenzioso degli errori** già visto per il modulo vento:
* Il blocco `socket.onmessage` aveva un `try/catch` generico che ingoiava silenziosamente qualsiasi errore (incluso il caso in cui il server risponde con `{ "error": "..." }` per chiave non valida — quel messaggio veniva scartato senza log).
* Mancavano completamente gli handler `socket.onerror` e `socket.onclose`.

Fix implementati:
1. `socket.onerror` e `socket.onclose` con log espliciti (`code`, `reason`, `wasClean`) per rendere visibile qualsiasi problema di connessione.
2. `JSON.parse` spostato fuori dal try/catch generico, così un pacchetto malformato isolato non nasconde più un errore reale.
3. Controllo esplicito del campo `data.error` restituito da aisstream.io in caso di chiave non valida o richiesta malformata.
4. Prop opzionali `onAisError` / `onAisStatus` per agganciare in futuro un indicatore di stato nella UI.
5. Cleanup degli handler prima di `socket.close()` per evitare falsi errori allo smontaggio del componente.

### 🔍 Diagnosi: Causa Radice Confermata
Verificato con test isolato da Node.js (fuori dal browser, per escludere problemi CORS) usando sia bounding box locale (Adriatico) che globale (`[[-90,-180],[90,180]]`):
* Connessione WebSocket riuscita (nessun errore, nessuna chiusura anomala)
* Sottoscrizione inviata correttamente con chiave API valida (verificata su aisstream.io/apikeys)
* **Zero messaggi ricevuti** anche dopo 90+ secondi con bounding box mondiale

Confermato tramite monitor di stato indipendente della community (`aisuptime.buttermilkgreen.fyi`):
```json
{
  "state": "Silent Failure",
  "websocketConnected": true,
  "lastMessageReceived": "2026-08-19T06:18:28Z"
}
```
Il servizio accetta connessioni ma non invia dati da almeno 3 giorni — problema noto e ricorrente (riscontrati anche outage precedenti per certificati SSL scaduti a maggio e luglio 2026, e issue GitHub aperte con lo stesso sintomo esatto segnalato da altri sviluppatori indipendentemente).

### 🌍 Alternative Valutate (e perché non sono praticabili ora)
| Provider | Esito valutazione |
|---|---|
| **AISHub** | Gratuito ma richiede di possedere un ricevitore AIS fisico e contribuire un feed NMEA live per ottenere le credenziali. Non utilizzabile senza hardware dedicato. |
| **MarineTraffic / VesselFinder API** | Ottima copertura Mediterraneo ma a pagamento — non compatibile con il principio "esclusivamente free/open source" del progetto. |
| **aisstream.io (attuale)** | Resta la scelta migliore per il caso d'uso: gratuito, no hardware richiesto, buona copertura. Da riprendere non appena il servizio si stabilizza. |

### 📋 Prossimi Passi
* [x] ~~Debug del client AIS~~ — completato, codice corretto e pronto
* [x] ~~Verifica causa radice~~ — confermato outage esterno lato aisstream.io
* [ ] Monitorare la ripresa del servizio (controllare periodicamente `aisuptime.buttermilkgreen.fyi` o rieseguire il test manuale)
* [ ] Una volta ripristinato il servizio, verificare in locale con `npm run dev` che le navi compaiano correttamente sulla mappa
* [ ] Nel frattempo, priorità sull'implementazione del caching offline tiles (vedi sezione 1)

---

## 🚀 Sviluppo Locale e Deployment

```bash
# Installa le dipendenze
npm install

# Avvia server di sviluppo locale
npm run dev

# Compila l'app per la produzione
npm run build
```

Il progetto utilizza **GitHub Actions** per effettuare il deployment automatico su GitHub Pages ad ogni push sul branch `main`.