import { useState, useCallback } from 'react'
import MapView from './components/MapView.jsx'
import LayerPanel from './components/LayerPanel.jsx'
import RoutePlanner from './components/RoutePlanner.jsx'
import OfflinePanel from './components/OfflinePanel.jsx'
import WeatherPanel from './components/WeatherPanel.jsx'
import WindTimeline from './components/WindTimeline.jsx'

function toBBox(center, zoom) {
  // Bounding box approssimato attorno al centro, per la stima area offline.
  // Approssimazione volutamente semplice: sufficiente per definire l'area
  // da scaricare, non per calcoli di precisione cartografica.
  const span = 4 / Math.pow(2, zoom) * 40
  return {
    minLon: center.lon - span,
    maxLon: center.lon + span,
    minLat: center.lat - span,
    maxLat: center.lat + span
  }
}

export default function App() {
  const [layerState, setLayerState] = useState({
    satellite: true,
    osmBase: false,
    seamark: true,
    seamarkOpacity: 0.9
  })
  const [waypoints, setWaypoints] = useState([])
  const [view, setView] = useState({ lon: 12.5, lat: 43.6, zoom: 6 })

  const [windEnabled, setWindEnabled] = useState(false)
  const [windHourIndex, setWindHourIndex] = useState(0)
  const [windRefreshKey, setWindRefreshKey] = useState(0)
  const [windTimes, setWindTimes] = useState([])

  const handleWindFramesReady = useCallback((times) => {
    setWindTimes(times)
    setWindHourIndex(0)
  }, [])

  const handleMapClick = useCallback((pt) => {
    setWaypoints((wps) => [...wps, pt])
  }, [])

  const handleMoveEnd = useCallback((v) => setView(v), [])

  return (
    <div className="app-shell">
      <header className="console-bar">
        <div className="console-brand">
          <span className="dot" />
          NAVAPP
        </div>

        <div className="readout">
          <span>LAT / LON</span>
          <strong>{view.lat.toFixed(4)}° {view.lon.toFixed(4)}°</strong>
        </div>

        <div className="readout">
          <span>ZOOM</span>
          <strong>{view.zoom.toFixed(1)}</strong>
        </div>

        <div className="readout">
          <span>WAYPOINT</span>
          <strong>{waypoints.length}</strong>
        </div>

        <div className="console-spacer" />
      </header>

      <div className="map-area">
        <MapView
          onMapClick={handleMapClick}
          onMoveEnd={handleMoveEnd}
          waypoints={waypoints}
          layerState={layerState}
          windEnabled={windEnabled}
          windHourIndex={windHourIndex}
          windRefreshKey={windRefreshKey}
          onWindFramesReady={handleWindFramesReady}
        />

        <WindTimeline
          enabled={windEnabled}
          onToggle={() => setWindEnabled((v) => !v)}
          times={windTimes}
          hourIndex={windHourIndex}
          onHourChange={setWindHourIndex}
          onRefresh={() => setWindRefreshKey((k) => k + 1)}
        />

        <OfflinePanel currentBBox={toBBox(view, view.zoom)} currentZoom={view.zoom} />
        <LayerPanel layerState={layerState} setLayerState={setLayerState} />
        <RoutePlanner waypoints={waypoints} setWaypoints={setWaypoints} />
        <WeatherPanel lat={view.lat} lon={view.lon} />

        <div className="mode-hint">Clicca sulla mappa per aggiungere un waypoint alla rotta</div>
      </div>
    </div>
  )
}
