import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

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

export default function MapView({ onMapClick, onMoveEnd, waypoints, layerState }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])

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

  return <div id="map-canvas" ref={containerRef} />
}
