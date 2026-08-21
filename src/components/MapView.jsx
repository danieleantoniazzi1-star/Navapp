import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { buildGrid, fetchWindGrid } from '../services/windGrid'

// Fonti dati, tutte gratuite/open:
// - Base + satellite: Esri World Imagery (tile pubbliche, uso libero)
// - Nautica: OpenSeaMap (overlay boe/fari/profondità su base OSM)
const SOURCES = {
  satellite: {
    type: 'raster',
    tiles: [
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    ],
    tileSize: 256,
    attribution: 'Esri, Maxar, Earthstar Geographics'
  },
  osmBase: {
    type: 'raster',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    tileSize: 256,
    attribution: '© OpenStreetMap contributors'
  },
  seamark: {
    type: 'raster',
    tiles: ['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'],
    tileSize: 256,
    attribution: '© OpenSeaMap contributors'
  }
}

const INITIAL_STYLE = {
  version: 8,
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

/** Disegna un'icona a freccia (triangolo) e la registra come immagine SDF,
 * così il colore può essere pilotato dai dati (velocità vento) via CSS-like
 * expression invece che dover generare un'immagine per ogni colore. */
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

export default function MapView({ onMapClick, onMoveEnd, waypoints, layerState, windEnabled, windHourIndex, windRefreshKey, onWindFramesReady, onWindError, gpsPosition }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const windFramesRef = useRef([])
  const gpsMarkerRef = useRef(null)

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: INITIAL_STYLE,
      center: [12.5, 43.6], // centro Adriatico/Tirreno come default di partenza
      zoom: 6,
      attributionControl: true
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')
    mapRef.current = map

    map.on('load', () => {
      ensureArrowIcon(map)
      map.addSource('wind-grid', { type: 'geojson', data: EMPTY_FC })
      map.addLayer({
        id: 'wind-grid-layer',
        type: 'symbol',
        source: 'wind-grid',
        layout: {
          'icon-image': 'wind-arrow',
          // dimensione icona proporzionale all'intensità del vento
          'icon-size': ['interpolate', ['linear'], ['get', 'speed'], 0, 0.35, 15, 0.6, 35, 1],
          // i dati arrivano come direzione "da cui soffia": +180 per farla
          // puntare "verso dove va", più intuitivo a colpo d'occhio
          'icon-rotate': ['+', ['get', 'direction'], 180],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          visibility: 'none'
        },
        paint: {
          // scala colore: calma (ciano) → forte (ambra) → burrasca (rosso)
          'icon-color': [
            'interpolate', ['linear'], ['get', 'speed'],
            0, '#3fe0d0',
            15, '#ffb703',
            30, '#ff5d5d'
          ],
          'icon-opacity': 0.9
        }
      })
    })

    map.on('click', (e) => {
      onMapClick?.({ lon: e.lngLat.lng, lat: e.lngLat.lat })
    })
    map.on('moveend', () => {
      const c = map.getCenter()
      onMoveEnd?.({ lon: c.lng, lat: c.lat, zoom: map.getZoom() })
    })

    return () => map.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Applica visibilità/opacità layer quando cambia lo stato dei toggle
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    map.setLayoutProperty('satellite', 'visibility', layerState.satellite ? 'visible' : 'none')
    map.setLayoutProperty('osmBase', 'visibility', layerState.osmBase ? 'visible' : 'none')
    map.setLayoutProperty('seamark', 'visibility', layerState.seamark ? 'visible' : 'none')
    map.setPaintProperty('seamark', 'raster-opacity', layerState.seamarkOpacity)
  }, [layerState])

  // Disegna waypoint + linea rotta
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
      el.style.background = i === 0 ? '#3fe0d0' : '#ffb703'
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

    if (map.isStyleLoaded()) drawRoute()
    else map.once('load', drawRoute)
  }, [waypoints])

  // Mostra/nasconde il layer vento
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.getLayer('wind-grid-layer')) return
    map.setLayoutProperty('wind-grid-layer', 'visibility', windEnabled ? 'visible' : 'none')
  }, [windEnabled])

  // Scarica la griglia vento per l'area visibile quando si attiva l'overlay
  // o quando l'utente chiede esplicitamente un aggiornamento (windRefreshKey)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !windEnabled) return
    let cancelled = false

    const run = async () => {
      onWindError?.(null)
      try {
        const b = map.getBounds()
        const bbox = { minLon: b.getWest(), minLat: b.getSouth(), maxLon: b.getEast(), maxLat: b.getNorth() }
        const points = buildGrid(bbox, 4, 4)
        console.debug('[wind] bbox', bbox, 'punti griglia', points.length)

        const { times, frames } = await fetchWindGrid(points)
        if (cancelled) return
        if (!times.length) {
          onWindError?.('Nessun dato ricevuto per quest\'area.')
          return
        }
        windFramesRef.current = frames
        onWindFramesReady?.(times)
        const src = map.getSource('wind-grid')
        if (src && frames[0]) src.setData(frames[0])
      } catch (err) {
        if (cancelled) return
        console.error('[wind] errore nel recupero della griglia vento:', err)
        onWindError?.(err.message || 'Richiesta fallita')
      }
    }

    if (map.isStyleLoaded()) run()
    else map.once('load', run)

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windEnabled, windRefreshKey])

  // Cambia il frame mostrato quando si sposta lo slider temporale
  useEffect(() => {
    const map = mapRef.current
    const frame = windFramesRef.current[windHourIndex]
    const src = map?.getSource('wind-grid')
    if (src && frame) src.setData(frame)
  }, [windHourIndex])

  // Marker posizione GPS con freccia di prua (bussola o direzione stimata dal movimento)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (!gpsPosition) {
      gpsMarkerRef.current?.remove()
      gpsMarkerRef.current = null
      return
    }

    if (!gpsMarkerRef.current) {
      const el = document.createElement('div')
      el.className = 'gps-marker'
      el.innerHTML = '<div class="gps-heading"><div class="gps-arrow"></div></div><div class="gps-dot"></div>'
      gpsMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([gpsPosition.lon, gpsPosition.lat])
        .addTo(map)
    } else {
      gpsMarkerRef.current.setLngLat([gpsPosition.lon, gpsPosition.lat])
    }

    const headingEl = gpsMarkerRef.current.getElement().querySelector('.gps-heading')
    if (headingEl) {
      if (gpsPosition.heading != null) {
        headingEl.style.opacity = '1'
        headingEl.style.transform = `rotate(${gpsPosition.heading}deg)`
      } else {
        headingEl.style.opacity = '0'
      }
    }
  }, [gpsPosition])

  return <div id="map-canvas" ref={containerRef} />
}
