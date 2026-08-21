import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { buildGrid, fetchWindGrid } from '../services/windGrid'
import { fetchWaveGrid } from '../services/waveGrid'

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
  gpsPosition
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
            30, '#ff5d5d'
          ],
          'icon-opacity': 0.95
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

  // Disegna waypoint
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
        const points = buildGrid(bbox, 8, 8)

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
        const points = buildGrid(bbox, 8, 8)

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

  // Marker GPS
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

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div id="map-canvas" ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* MIRINO NERO AL CENTRO MAFFA */}
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
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          filter: 'drop-shadow(0px 0px 2px rgba(255, 255, 255, 0.8))'
        }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          {/* Cerchio centrale */}
          <circle cx="14" cy="14" r="5" stroke="#000000" strokeWidth="2" />
          {/* Punto centrale */}
          <circle cx="14" cy="14" r="1" fill="#000000" />
          {/* Reticolo */}
          <line x1="14" y1="2" x2="14" y2="8" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
          <line x1="14" y1="20" x2="14" y2="26" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
          <line x1="2" y1="14" x2="8" y2="14" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
          <line x1="20" y1="14" x2="26" y2="14" stroke="#000000" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}