import { useState } from 'react'
import { downloadRegion } from '../services/tileCache'

// Sorgenti scaricabili offline: stesse URL template usate in MapView.
const DOWNLOADABLE_SOURCES = [
  {
    id: 'satellite',
    label: 'Satellite',
    urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  },
  {
    id: 'seamark',
    label: 'Carta nautica',
    urlTemplate: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'
  }
]

// Il vento/mare NON viene "scaricato a tile": essendo un dato numerico
// puntuale (vedi weather.js), per l'offline si scarica la previsione sui
// waypoint della rotta corrente, non un layer raster su area.

export default function OfflinePanel({ currentBBox, currentZoom }) {
  const [sourceId, setSourceId] = useState('satellite')
  const [maxZoom, setMaxZoom] = useState(Math.min(14, Math.round(currentZoom) + 3))
  const [progress, setProgress] = useState(null)
  const [status, setStatus] = useState('')

  const source = DOWNLOADABLE_SOURCES.find((s) => s.id === sourceId)

  const estimatedTiles = () => {
    // Stima grezza per informare l'utente prima di lanciare il download.
    const minZ = Math.round(currentZoom)
    let count = 0
    for (let z = minZ; z <= maxZoom; z++) {
      const factor = Math.pow(4, z - minZ)
      count += factor
    }
    return count
  }

  const startDownload = async () => {
    setStatus('Download in corso…')
    setProgress({ done: 0, total: 0 })
    const regionId = `${sourceId}-${Date.now()}`
    try {
      const result = await downloadRegion({
        regionId,
        sourceId,
        urlTemplate: source.urlTemplate,
        bbox: currentBBox,
        minZoom: Math.round(currentZoom),
        maxZoom,
        onProgress: (done, total) => setProgress({ done, total })
      })
      setStatus(`Completato: ${result.total} tile salvate per uso offline.`)
    } catch (err) {
      setStatus('Errore durante il download. Riprova con un\'area più piccola.')
    }
  }

  return (
    <div className="panel offline-panel">
      <h3>Area offline</h3>
      <p className="offline-status">
        Scarica la vista corrente della mappa per navigare senza connessione.
        Sposta/zooma la mappa per inquadrare l'area, poi avvia il download.
      </p>

      <div className="layer-row">
        <span>Sorgente</span>
        <select
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          style={{ background: 'var(--bg-panel-raised)', color: 'var(--text-primary)', border: '1px solid var(--line-grid)', borderRadius: 4 }}
        >
          {DOWNLOADABLE_SOURCES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="layer-row">
        <span>Zoom max dettaglio</span>
        <input
          type="range"
          min={currentZoom}
          max={Math.min(18, currentZoom + 6)}
          value={maxZoom}
          onChange={(e) => setMaxZoom(parseInt(e.target.value, 10))}
        />
      </div>

      <p className="offline-status">~{estimatedTiles().toLocaleString('it-IT')} tile stimate</p>

      {progress && (
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: progress.total ? `${(100 * progress.done) / progress.total}%` : '2%' }}
          />
        </div>
      )}

      <button className="btn primary" style={{ width: '100%' }} onClick={startDownload}>
        Scarica quest'area
      </button>

      {status && <p className="offline-status">{status}</p>}
    </div>
  )
}
