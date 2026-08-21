import { useState, useCallback, useRef } from 'react'
import MapView from './components/MapView.jsx'
import LayerPanel from './components/LayerPanel.jsx'
import RoutePlanner from './components/RoutePlanner.jsx'
import OfflinePanel from './components/OfflinePanel.jsx'
import WeatherPanel from './components/WeatherPanel.jsx'
import WindTimeline from './components/WindTimeline.jsx'
import { watchPosition, requestCompass } from './services/geolocation.js'

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
  const [windError, setWindError] = useState(null)

  const [gpsEnabled, setGpsEnabled] = useState(false)
  const [gpsPosition, setGpsPosition] = useState(null) // {lat, lon, accuracyM, heading, headingSource}
  const [gpsError, setGpsError] = useState(null)
  const stopWatchRef = useRef(null)
  const stopCompassRef = useRef(null)
  const compassHeadingRef = useRef(null)

  const handleWindFramesReady = useCallback((times) => {
    setWindTimes(times)
    setWindHourIndex(0)
  }, [])

  const handleMapClick = useCallback((pt) => {
    setWaypoints((wps) => [...wps, pt])
  }, [])

  const handleMoveEnd = useCallback((v) => setView(v), [])

  const toggleGps = useCallback(async () => {
    if (gpsEnabled) {
      stopWatchRef.current?.()
      stopCompassRef.current?.()
      stopWatchRef.current = null
      stopCompassRef.current = null
      compassHeadingRef.current = null
      setGpsEnabled(false)
      setGpsPosition(null)
      setGpsError(null)
      return
    }

    setGpsError(null)
    setGpsEnabled(true)

    // Su iOS il permesso per la bussola va richiesto nello stesso gesto
    // utente (click) del pulsante, non dopo un await della posizione.
    try {
      const stopCompass = await requestCompass((heading) => {
        compassHeadingRef.current = heading
        setGpsPosition((p) => (p ? { ...p, heading, headingSource: 'compass' } : p))
      })
      if (typeof stopCompass === 'function') stopCompassRef.current = stopCompass
    } catch {
      // Bussola non disponibile o permesso negato: si userà il fallback GPS.
    }

    stopWatchRef.current = watchPosition(
      (pos) => {
        setGpsPosition({
          lat: pos.lat,
          lon: pos.lon,
          accuracyM: pos.accuracyM,
          heading: compassHeadingRef.current ?? pos.gpsHeading ?? null,
          headingSource: compassHeadingRef.current != null ? 'compass' : (pos.gpsHeading != null ? 'gps' : null)
        })
      },
      (err) => setGpsError(err.message || 'Posizione non disponibile')
    )
  }, [gpsEnabled])

  // Meteo: segue la posizione GPS se attiva, altrimenti il centro mappa.
  const weatherLat = gpsPosition ? gpsPosition.lat : view.lat
  const weatherLon = gpsPosition ? gpsPosition.lon : view.lon
  const weatherSource = gpsPosition ? 'gps' : 'map'

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

        {gpsEnabled && gpsPosition && (
          <div className="readout">
            <span>POSIZIONE GPS</span>
            <strong>{gpsPosition.lat.toFixed(4)}° {gpsPosition.lon.toFixed(4)}°</strong>
          </div>
        )}

        {gpsEnabled && gpsPosition?.heading != null && (
          <div className="readout">
            <span>PRUA ({gpsPosition.headingSource === 'compass' ? 'bussola' : 'stimata'})</span>
            <strong>{gpsPosition.heading.toFixed(0)}°</strong>
          </div>
        )}

        {gpsEnabled && gpsError && (
          <div className="readout">
            <span>GPS</span>
            <strong style={{ color: 'var(--accent-red)' }}>{gpsError}</strong>
          </div>
        )}

        <div className="console-spacer" />

        <button className={`btn ${gpsEnabled ? 'primary' : ''}`} onClick={toggleGps} style={{ flex: 'none', padding: '7px 14px' }}>
          {gpsEnabled ? 'GPS: ON' : 'Attiva GPS'}
        </button>
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
          onWindError={setWindError}
          gpsPosition={gpsEnabled ? gpsPosition : null}
        />

        <WindTimeline
          enabled={windEnabled}
          onToggle={() => {
            setWindEnabled((v) => !v)
            setWindTimes([])
            setWindError(null)
          }}
          times={windTimes}
          hourIndex={windHourIndex}
          onHourChange={setWindHourIndex}
          onRefresh={() => {
            setWindTimes([])
            setWindError(null)
            setWindRefreshKey((k) => k + 1)
          }}
          error={windError}
        />

        <OfflinePanel currentBBox={toBBox(view, view.zoom)} currentZoom={view.zoom} />
        <LayerPanel layerState={layerState} setLayerState={setLayerState} />
        <RoutePlanner waypoints={waypoints} setWaypoints={setWaypoints} />
        <WeatherPanel lat={weatherLat} lon={weatherLon} source={weatherSource} />

        <div className="mode-hint">Clicca sulla mappa per aggiungere un waypoint alla rotta</div>
      </div>
    </div>
  )
}
