import { useState, useCallback, useRef } from 'react'
import MapView from './components/MapView.jsx'
import LayerPanel from './components/LayerPanel.jsx'
import RoutePlanner from './components/RoutePlanner.jsx'
import OfflinePanel from './components/OfflinePanel.jsx'
import WeatherPanel from './components/WeatherPanel.jsx'
import ForecastPanel from './components/ForecastPanel.jsx'
import { watchPosition, requestCompass } from './services/geolocation.js'

function toBBox(center, zoom) {
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

  // Modalità Previsioni: 'off' | 'wind' | 'wave'
  const [forecastMode, setForecastMode] = useState('off')

  // Stato Vento
  const [windHourIndex, setWindHourIndex] = useState(0)
  const [windRefreshKey, setWindRefreshKey] = useState(0)
  const [windTimes, setWindTimes] = useState([])
  const [windError, setWindError] = useState(null)

  // Stato Onde
  const [waveHourIndex, setWaveHourIndex] = useState(0)
  const [waveRefreshKey, setWaveRefreshKey] = useState(0)
  const [waveTimes, setWaveTimes] = useState([])
  const [waveError, setWaveError] = useState(null)

  // Stato GPS
  const [gpsEnabled, setGpsEnabled] = useState(false)
  const [gpsPosition, setGpsPosition] = useState(null)
  const [gpsError, setGpsError] = useState(null)
  const stopWatchRef = useRef(null)
  const stopCompassRef = useRef(null)
  const compassHeadingRef = useRef(null)

  const handleWindFramesReady = useCallback((times) => {
    setWindTimes(times)
    setWindHourIndex(0)
  }, [])

  const handleWaveFramesReady = useCallback((times) => {
    setWaveTimes(times)
    setWaveHourIndex(0)
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

    try {
      const stopCompass = await requestCompass((heading) => {
        compassHeadingRef.current = heading
        setGpsPosition((p) => (p ? { ...p, heading, headingSource: 'compass' } : p))
      })
      if (typeof stopCompass === 'function') stopCompassRef.current = stopCompass
    } catch {
      // Bussola non disponibile
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

  const weatherLat = gpsPosition ? gpsPosition.lat : view.lat
  const weatherLon = gpsPosition ? gpsPosition.lon : view.lon
  const weatherSource = gpsPosition ? 'gps' : 'map'

  // Variabili derivate per il pannello ForecastPanel
  const activeTimes = forecastMode === 'wind' ? windTimes : waveTimes
  const activeHourIndex = forecastMode === 'wind' ? windHourIndex : waveHourIndex
  const activeError = forecastMode === 'wind' ? windError : waveError
  const activeLoading = forecastMode !== 'off' && activeTimes.length === 0 && !activeError

  const handleHourChange = (idx) => {
    if (forecastMode === 'wind') setWindHourIndex(idx)
    else if (forecastMode === 'wave') setWaveHourIndex(idx)
  }

  const handleRefresh = () => {
    if (forecastMode === 'wind') {
      setWindTimes([])
      setWindError(null)
      setWindRefreshKey((k) => k + 1)
    } else if (forecastMode === 'wave') {
      setWaveTimes([])
      setWaveError(null)
      setWaveRefreshKey((k) => k + 1)
    }
  }

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
          windEnabled={forecastMode === 'wind'}
          windHourIndex={windHourIndex}
          windRefreshKey={windRefreshKey}
          onWindFramesReady={handleWindFramesReady}
          onWindError={setWindError}
          waveEnabled={forecastMode === 'wave'}
          waveHourIndex={waveHourIndex}
          waveRefreshKey={waveRefreshKey}
          onWaveFramesReady={handleWaveFramesReady}
          onWaveError={setWaveError}
          gpsPosition={gpsEnabled ? gpsPosition : null}
        />

        <ForecastPanel
          mode={forecastMode}
          onModeChange={setForecastMode}
          times={activeTimes}
          hourIndex={activeHourIndex}
          onHourChange={handleHourChange}
          onRefresh={handleRefresh}
          loading={activeLoading}
          error={activeError}
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