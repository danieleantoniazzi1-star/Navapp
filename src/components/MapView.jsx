import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { registerOfflineProtocol } from '../services/mapProtocol'
import 'maplibre-gl/dist/maplibre-gl.css'
import { buildGrid, fetchWindGrid } from '../services/windGrid'
import { fetchWaveGrid } from '../services/waveGrid'

// Registra il protocollo offline per la cache IndexedDB
registerOfflineProtocol()

const SOURCES = {
  satellite: {
    type: 'raster',
    tiles: [
      'offline://satellite/{z}/{x}/{y}?url=https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    ],
    tileSize: 256,
    attribution: 'Esri, Maxar, Earthstar Geographics'
  },
  osmBase: {
    type: 'raster',
    tiles: [
      'offline://osmBase/{z}/{x}/{y}?url=https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    ],
    tileSize: 256,
    attribution: '© OpenStreetMap contributors'
  },
  seamark: {
    type: 'raster',
    tiles: [
      'offline://seamark/{z}/{x}/{y}?url=https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'
    ],
    tileSize: 256,
    attribution: '© OpenSeaMap contributors'
  }
}

const INITIAL_STYLE = {
  version: 8,
  // FONDAMENTALE: i glyphs permettono a MapLibre di renderizzare il testo (nomi navi).
  // Senza questa riga, qualsiasi layer con un 'text-field' si nasconde.
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    satellite: SOURCES.satellite,
    osmBase: SOURCES.osmBase,
    seamark: SOURCES.seamark
  },
  layers: [
    { id: 'satellite', type: 'raster', source: 'satellite', layout: { visibility: 'visible' } },
    { id: 'osmBase', type: 'raster', source: 'osmBase', layout: { visibility: 'none' } },
    { id: 'seamark', type: 'raster', source: 'seamark', paint: { 'raster-opacity': 0.9 }, layout: { visibility: 'visible' } }
  ]
}

const EMPTY_FC = { type: 'FeatureCollection', features: [] }

function ensureArrowIcon(map) {
  if (map.hasImage('wind-arrow')) return
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(size / 2, 3)
  ctx.lineTo(size - 7, size - 8)
  ctx.lineTo(size / 2, size - 16)
  ctx.lineTo(7, size - 8)
  ctx.closePath()
  ctx.fill()
  map.addImage('wind-arrow', ctx.getImageData(0, 0, size, size), { sdf: true })
}

function ensureShipIcon(map) {
  if (map.hasImage('ais-ship-icon')) return
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')

  // Disegna la sagoma della nave
  ctx.beginPath()
  ctx.moveTo(16, 2)
  ctx.lineTo(26, 28)
  ctx.lineTo(16, 22)
  ctx.lineTo(6, 28)
  ctx.closePath()

  ctx.fillStyle = '#ffb703'
  ctx.fill()
  ctx.strokeStyle = '#0a1420'
  ctx.lineWidth = 2
  ctx.stroke()

  map.addImage('ais-ship-icon', ctx.getImageData(0, 0, size, size))
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const l1 = (lat1 * Math.PI) / 180
  const l2 = (lat2 * Math.PI) / 180
  const y = Math.sin(dLon) * Math.cos(l2)
  const x = Math.cos(l1) * Math.sin(l2) - Math.sin(l1) * Math.cos(l2) * Math.cos(dLon)
  let brng = (Math.atan2(y, x) * 180) / Math.PI
  return (Math.round(brng) + 360) % 360
}

export default function MapView({
  onMapClick,
  onMoveEnd,
  waypoints,
  layerState,
  windEnabled,
  windHourIndex,
  windRefreshKey,
  onWindFramesReady,
  onWindError,
  waveEnabled,
  waveHourIndex,
  waveRefreshKey,
  onWaveFramesReady,
  onWaveError,
  gpsPosition,
  aisEnabled = false,
  aisApiKey = '',
  onAisError,
  onAisStatus
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const windFramesRef = useRef([])
  const waveFramesRef = useRef([])
  const gpsMarkerRef = useRef(null)

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: INITIAL_STYLE,
      center: [12.5, 43.6],
      zoom: 6,
      attributionControl: true
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')
    mapRef.current = map

    map.on('load', () => {
      ensureArrowIcon(map)
      ensureShipIcon(map)

      // Layer Vento
      map.addSource('wind-grid', { type: 'geojson', data: EMPTY_FC })
      map.addLayer({
        id: 'wind-grid-layer',
        type: 'symbol',
        source: 'wind-grid',
        layout: {
          'icon-image': 'wind-arrow',
          'icon-size': ['interpolate', ['linear'], ['get', 'speed'], 0, 0.3, 15, 0.6, 35, 0.9],
          'icon-rotate': ['+', ['get', 'direction'], 180],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          visibility: windEnabled ? 'visible' : 'none'
        },
        paint: {
          'icon-color': [
            'interpolate', ['linear'], ['get', 'speed'],
            0, '#3fe0d0',
            15, '#ffb703',
            30, '#ff5d5d'
          ],
          'icon-opacity': 0.95
        }
      })

      // Layer Onde
      map.addSource('wave-grid', { type: 'geojson', data: EMPTY_FC })
      map.addLayer({
        id: 'wave-grid-layer',
        type: 'symbol',
        source: 'wave-grid',
        layout: {
          'icon-image': 'wind-arrow',
          'icon-size': ['interpolate', ['linear'], ['get', 'height'], 0, 0.35, 1.5, 0.65, 3.0, 0.95],
          'icon-rotate': ['+', ['get', 'direction'], 180],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          visibility: waveEnabled ? 'visible' : 'none'
        },
        paint: {
          'icon-color': [
            'interpolate', ['linear'], ['get', 'height'],
            0, '#3fe0d0',
            1.5, '#ffb703',
            3.0, '#ff5d5d'
          ],
          'icon-opacity': 0.95
        }
      })

      // Layer AIS Navi
      map.addSource('ais-vessels', { type: 'geojson', data: EMPTY_FC })
      map.addLayer({
        id: 'ais-vessels-layer',
        type: 'symbol',
        source: 'ais-vessels',
        layout: {
          'icon-image': 'ais-ship-icon',
          'icon-size': 0.85,
          'icon-rotate': ['get', 'cog'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Regular'], // Deve corrispondere al font caricato in INITIAL_STYLE
          'text-size': 10,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          visibility: aisEnabled ? 'visible' : 'none'
        },
        paint: {
          'text-color': '#e7f1f6',
          'text-halo-color': '#0a1420',
          'text-halo-width': 1
        }
      })
    })

    map.on('click', (e) => onMapClick?.({ lon: e.lngLat.lng, lat: e.lngLat.lat }))
    map.on('moveend', () => {
      const c = map.getCenter()
      onMoveEnd?.({ lon: c.lng, lat: c.lat, zoom: map.getZoom() })
    })

    return () => map.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Visibilità layer mappa base
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    map.setLayoutProperty('satellite', 'visibility', layerState.satellite ? 'visible' : 'none')
    map.setLayoutProperty('osmBase', 'visibility', layerState.osmBase ? 'visible' : 'none')
    map.setLayoutProperty('seamark', 'visibility', layerState.seamark ? 'visible' : 'none')
    map.setPaintProperty('seamark', 'raster-opacity', layerState.seamarkOpacity)
  }, [layerState])

  // Disegna waypoint (WP1 in giallo chiaro #ffe066)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    waypoints.forEach((wp, i) => {
      const el = document.createElement('div')
      el.style.width = '14px'
      el.style.height = '14px'
      el.style.borderRadius = '50%'
      el.style.background = i === 0 ? '#ffe066' : '#ffb703'
      el.style.border = '2px solid #0a1420'
      el.style.boxShadow = '0 0 6px rgba(0,0,0,0.6)'
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([wp.lon, wp.lat])
        .addTo(map)
      markersRef.current.push(marker)
    })

    const drawRoute = () => {
      const geojson = {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: waypoints.map((w) => [w.lon, w.lat]) }
      }
      if (map.getSource('route-line')) {
        map.getSource('route-line').setData(geojson)
      } else if (waypoints.length > 1) {
        map.addSource('route-line', { type: 'geojson', data: geojson })
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route-line',
          paint: { 'line-color': '#ffb703', 'line-width': 2, 'line-dasharray': [2, 1] }
        })
      }
    }

    if (map.getSource('wind-grid') || map.isStyleLoaded()) drawRoute()
    else map.once('load', drawRoute)
  }, [waypoints])

  // Toggle visibilità vento e onde
  useEffect(() => {
    const map = mapRef.current
    if (map && map.getLayer('wind-grid-layer')) {
      map.setLayoutProperty('wind-grid-layer', 'visibility', windEnabled ? 'visible' : 'none')
    }
  }, [windEnabled])

  useEffect(() => {
    const map = mapRef.current
    if (map && map.getLayer('wave-grid-layer')) {
      map.setLayoutProperty('wave-grid-layer', 'visibility', waveEnabled ? 'visible' : 'none')
    }
  }, [waveEnabled])

  // WebSocket Live Stream AIS Navi
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (map.getLayer('ais-vessels-layer')) {
      map.setLayoutProperty('ais-vessels-layer', 'visibility', aisEnabled ? 'visible' : 'none')
    }

    if (!aisEnabled || !aisApiKey) {
      const src = map.getSource('ais-vessels')
      if (src) src.setData(EMPTY_FC)
      onAisStatus?.('idle')
      return
    }

    let socket = null
    let cancelled = false
    const vesselsMap = new Map()

    const connectAis = () => {
      onAisError?.(null)
      onAisStatus?.('connecting')

      try {
        socket = new WebSocket('wss://stream.aisstream.io/v0/stream')
      } catch (err) {
        console.error('[AIS] Impossibile creare la connessione WebSocket:', err)
        onAisError?.('Impossibile creare la connessione WebSocket: ' + (err.message || err))
        onAisStatus?.('error')
        return
      }

      socket.onopen = () => {
        if (cancelled) return
        console.log('[AIS] WebSocket connesso, invio sottoscrizione...')
        onAisStatus?.('connected')

        const b = map.getBounds()
        let boundingBox = [[37.0, 8.0], [45.5, 19.0]]

        if (b) {
          // Estende l'area di 2 gradi rispetto allo schermo per coprire navi in avvicinamento
          const minLat = Math.max(-90, b.getSouth() - 2)
          const minLon = Math.max(-180, b.getWest() - 2)
          const maxLat = Math.min(90, b.getNorth() + 2)
          const maxLon = Math.min(180, b.getEast() + 2)
          boundingBox = [[minLat, minLon], [maxLat, maxLon]]
        }

        const subscription = {
          APIKey: aisApiKey,
          BoundingBoxes: [boundingBox]
        }
        console.log('[AIS] Sottoscrizione inviata:', subscription)
        socket.send(JSON.stringify(subscription))
      }

      // FONDAMENTALE: senza questo handler, un fallimento del socket (rete,
      // certificato, blocco firewall/proxy) passa completamente inosservato.
      socket.onerror = (event) => {
        console.error('[AIS] Errore WebSocket:', event)
        onAisError?.('Errore di connessione al servizio AIS. Controlla la rete o riprova più tardi.')
        onAisStatus?.('error')
      }

      // FONDAMENTALE: aisstream.io chiude la connessione (spesso subito dopo
      // onopen) quando la chiave API non è valida o quando si superano i
      // limiti dell'account gratuito. Senza onclose, questo evento era invisibile.
      socket.onclose = (event) => {
        if (cancelled) return
        console.warn('[AIS] WebSocket chiuso.', 'code:', event.code, 'reason:', event.reason, 'wasClean:', event.wasClean)
        if (!event.wasClean || event.code !== 1000) {
          onAisError?.(
            `Connessione AIS interrotta (code ${event.code}${event.reason ? ': ' + event.reason : ''}). ` +
            'Possibili cause: chiave API non valida, limiti account gratuito, o formato BoundingBox rifiutato.'
          )
        }
        onAisStatus?.('closed')
      }

      // Il parsing JSON e la gestione esplicita di data.error stanno FUORI
      // dal try/catch generico, così un pacchetto malformato isolato non
      // nasconde più un errore reale (es. { "error": "invalid API key" }).
      socket.onmessage = (event) => {
        let data
        try {
          data = JSON.parse(event.data)
        } catch (parseErr) {
          console.warn('[AIS] Pacchetto non-JSON ignorato:', event.data)
          return
        }

        // aisstream.io risponde con { "error": "..." } quando la chiave o la
        // richiesta non sono valide. Questo NON deve essere ingoiato in silenzio.
        if (data && data.error) {
          console.error('[AIS] Errore restituito dal server:', data.error)
          onAisError?.('aisstream.io ha rifiutato la richiesta: ' + data.error)
          onAisStatus?.('error')
          return
        }

        const meta = data.MetaData
        const type = data.MessageType

        if (!type || !data.Message || !(type in data.Message)) {
          // Messaggio di tipo non gestito/inatteso: logghiamo per diagnosi
          // ma non è un errore bloccante.
          console.log('[AIS] Messaggio ignorato (tipo non gestito):', type, data)
          return
        }

        const report = data.Message[type]

        // Verifica che il report contenga coordinate valide
        if (report && 'Latitude' in report && 'Longitude' in report && report.Latitude < 90) {
          const mmsi = report.UserID || meta?.MMSI
          if (!mmsi) return

          vesselsMap.set(mmsi, {
            mmsi: mmsi,
            name: meta?.ShipName?.trim() || `MMSI ${mmsi}`,
            lat: report.Latitude,
            lon: report.Longitude,
            cog: report.Cog || 0,
            sog: report.Sog || 0,
            updatedAt: Date.now()
          })

          // Pulisce le navi obsolete (> 15 minuti)
          const cutoff = Date.now() - 15 * 60 * 1000
          for (const [key, v] of vesselsMap.entries()) {
            if (v.updatedAt < cutoff) vesselsMap.delete(key)
          }

          const geojson = {
            type: 'FeatureCollection',
            features: Array.from(vesselsMap.values()).map((v) => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [v.lon, v.lat]
              },
              properties: {
                mmsi: v.mmsi,
                name: v.name,
                cog: v.cog,
                sog: v.sog
              }
            }))
          }

          const src = map.getSource('ais-vessels')
          if (src) src.setData(geojson)
          onAisStatus?.('receiving')
        }
      }
    }

    if (map.getSource('ais-vessels') || map.isStyleLoaded()) {
      connectAis()
    } else {
      map.once('load', connectAis)
    }

    return () => {
      cancelled = true
      if (socket) {
        // Rimuoviamo gli handler prima di chiudere per evitare che onclose
        // scateni un onAisError fantasma durante lo smontaggio del componente.
        socket.onopen = null
        socket.onmessage = null
        socket.onerror = null
        socket.onclose = null
        socket.close()
      }
      vesselsMap.clear()
    }
  }, [aisEnabled, aisApiKey])

  // Fetch dati vento
  useEffect(() => {
    const map = mapRef.current
    if (!map || !windEnabled) return
    let cancelled = false

    const run = async () => {
      onWindError?.(null)
      try {
        const b = map.getBounds()
        if (!b) return
        const bbox = { minLon: b.getWest(), minLat: b.getSouth(), maxLon: b.getEast(), maxLat: b.getNorth() }
        
        const points = buildGrid(bbox, 12, 12)

        const { times, frames } = await fetchWindGrid(points)
        if (cancelled) return
        if (!times || !times.length) {
          onWindError?.('Nessun dato ricevuto per quest\'area.')
          return
        }
        windFramesRef.current = frames
        onWindFramesReady?.(times)

        const src = map.getSource('wind-grid')
        if (src && frames[0]) src.setData(frames[0])
      } catch (err) {
        if (cancelled) return
        onWindError?.(err.message || 'Richiesta fallita')
      }
    }

    if (map.getSource('wind-grid') || map.isStyleLoaded()) run()
    else map.once('load', run)

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windEnabled, windRefreshKey])

  // Fetch dati onde
  useEffect(() => {
    const map = mapRef.current
    if (!map || !waveEnabled) return
    let cancelled = false

    const run = async () => {
      onWaveError?.(null)
      try {
        const b = map.getBounds()
        if (!b) return
        const bbox = { minLon: b.getWest(), minLat: b.getSouth(), maxLon: b.getEast(), maxLat: b.getNorth() }
        
        const points = buildGrid(bbox, 12, 12)

        const { times, frames } = await fetchWaveGrid(points)
        if (cancelled) return
        if (!times || !times.length) {
          onWaveError?.('Nessun dato mare disponibile.')
          return
        }
        waveFramesRef.current = frames
        onWaveFramesReady?.(times)

        const src = map.getSource('wave-grid')
        if (src && frames[0]) src.setData(frames[0])
      } catch (err) {
        if (cancelled) return
        onWaveError?.(err.message || 'Richiesta fallita')
      }
    }

    if (map.getSource('wave-grid') || map.isStyleLoaded()) run()
    else map.once('load', run)

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waveEnabled, waveRefreshKey])

  // Slider frame vento
  useEffect(() => {
    const map = mapRef.current
    const frame = windFramesRef.current[windHourIndex]
    const src = map?.getSource('wind-grid')
    if (src && frame) src.setData(frame)
  }, [windHourIndex])

  // Slider frame onde
  useEffect(() => {
    const map = mapRef.current
    const frame = waveFramesRef.current[waveHourIndex]
    const src = map?.getSource('wave-grid')
    if (src && frame) src.setData(frame)
  }, [waveHourIndex])

  // Marker GPS con Goniometro orientato geograficamente
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!gpsPosition) {
      gpsMarkerRef.current?.remove()
      gpsMarkerRef.current = null
      if (map.getSource('gps-target-line')) {
        map.getSource('gps-target-line').setData({ type: 'FeatureCollection', features: [] })
      }
      return
    }

    const targetWp = waypoints && waypoints.length > 0 ? waypoints[0] : null
    const bearingToTarget = targetWp
      ? calculateBearing(gpsPosition.lat, gpsPosition.lon, targetWp.lat, targetWp.lon)
      : null

    const updateGpsLine = () => {
      const lineGeojson = targetWp ? {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [gpsPosition.lon, gpsPosition.lat],
            [targetWp.lon, targetWp.lat]
          ]
        }
      } : { type: 'FeatureCollection', features: [] }

      if (map.getSource('gps-target-line')) {
        map.getSource('gps-target-line').setData(lineGeojson)
      } else if (targetWp) {
        map.addSource('gps-target-line', { type: 'geojson', data: lineGeojson })
        map.addLayer({
          id: 'gps-target-line',
          type: 'line',
          source: 'gps-target-line',
          paint: {
            'line-color': '#3fe0d0',
            'line-width': 2,
            'line-dasharray': [3, 2]
          }
        })
      }
    }

    if (map.isStyleLoaded()) updateGpsLine()
    else map.once('load', updateGpsLine)

    const ticksSvg = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => {
      const rad = ((deg - 90) * Math.PI) / 180
      const x1 = 130 + 92 * Math.cos(rad)
      const y1 = 130 + 92 * Math.sin(rad)
      const x2 = 130 + 104 * Math.cos(rad)
      const y2 = 130 + 104 * Math.sin(rad)
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#000000" stroke-width="2.5"/>`
    }).join('')

    let targetPointerHtml = ''
    if (bearingToTarget != null) {
      const rad = ((bearingToTarget - 90) * Math.PI) / 180
      const tx = 130 + 100 * Math.cos(rad)
      const ty = 130 + 100 * Math.sin(rad)

      targetPointerHtml = `
        <line x1="130" y1="130" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}" stroke="#ffb703" stroke-width="3" stroke-dasharray="4 2"/>
        <g transform="translate(${tx.toFixed(1)}, ${ty.toFixed(1)}) rotate(${bearingToTarget})">
          <polygon points="0,-9 6,6 -6,6" fill="#ffb703" stroke="#0a1420" stroke-width="1.5"/>
        </g>
        <g transform="translate(130, 238)">
          <rect x="-28" y="-10" width="56" height="18" rx="4" fill="#0a1420" stroke="#ffb703" stroke-width="1.5"/>
          <text x="0" y="2" fill="#ffb703" font-size="11" font-weight="bold" font-family="'IBM Plex Mono', monospace" text-anchor="middle" dominant-baseline="middle">${bearingToTarget}°</text>
        </g>
      `
    }

    const headingTransform = gpsPosition.heading != null ? `rotate(${gpsPosition.heading}deg)` : 'rotate(0deg)'
    const headingOpacity = gpsPosition.heading != null ? '1' : '0'

    const htmlContent = `
      <div style="position: relative; width: 260px; height: 260px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
        <svg width="260" height="260" viewBox="0 0 260 260" style="position: absolute; top:0; left:0; filter: drop-shadow(0px 0px 2.5px rgba(255, 255, 255, 0.9));">
          <circle cx="130" cy="130" r="104" stroke="#000000" stroke-width="2.5" fill="none" stroke-dasharray="3 3"/>
          ${ticksSvg}
          <text x="130" y="18" fill="#000000" font-size="14" font-weight="bold" font-family="'IBM Plex Mono', monospace" text-anchor="middle">N</text>
          <text x="246" y="135" fill="#000000" font-size="12" font-weight="bold" font-family="'IBM Plex Mono', monospace" text-anchor="middle">E</text>
          <text x="130" y="252" fill="#000000" font-size="12" font-weight="bold" font-family="'IBM Plex Mono', monospace" text-anchor="middle">S</text>
          <text x="14" y="135" fill="#000000" font-size="12" font-weight="bold" font-family="'IBM Plex Mono', monospace" text-anchor="middle">W</text>
          ${targetPointerHtml}
        </svg>

        <div style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; transition: transform 0.3s ease; transform: ${headingTransform}; opacity: ${headingOpacity};">
          <div style="width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-bottom: 22px solid #3fe0d0; transform: translateY(-44px); filter: drop-shadow(0 0 3px rgba(0,0,0,0.8));"></div>
        </div>

        <div style="width: 14px; height: 14px; background: #3fe0d0; border: 2.5px solid #0a1420; border-radius: 50%; box-shadow: 0 0 8px #3fe0d0, 0 0 4px rgba(0,0,0,0.8); z-index: 5;"></div>
      </div>
    `

    if (!gpsMarkerRef.current) {
      const el = document.createElement('div')
      el.innerHTML = htmlContent
      gpsMarkerRef.current = new maplibregl.Marker({
        element: el,
        anchor: 'center',
        rotationAlignment: 'map',
        pitchAlignment: 'map'
      })
        .setLngLat([gpsPosition.lon, gpsPosition.lat])
        .addTo(map)
    } else {
      gpsMarkerRef.current.getElement().innerHTML = htmlContent
      gpsMarkerRef.current.setLngLat([gpsPosition.lon, gpsPosition.lat])
    }
  }, [gpsPosition, waypoints])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div id="map-canvas" ref={containerRef} style={{ width: '100%', height: '100%' }} />

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center', // Fixato warning camelCase per React
          width: '28px',
          height: '28px',
          filter: 'drop-shadow(0px 0px 2px rgba(255, 255, 255, 0.8))'
        }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="5" stroke="#000000" strokeWidth="2" />
          <circle cx="14" cy="14" r="1" fill="#000000" />
          <line x1="14" y1="2" x2="14" y2="8" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
          <line x1="14" y1="20" x2="14" y2="26" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
          <line x1="2" y1="14" x2="8" y2="14" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
          <line x1="20" y1="14" x2="26" y2="14" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}
