import { legDistanceNm, legBearingDeg, totalDistanceNm, estimatedHours } from '../services/routeMath'
import { downloadGPX } from '../services/gpx'

export default function RoutePlanner({ waypoints, setWaypoints, cruiseSpeedKn = 6 }) {
  const removeWaypoint = (idx) => {
    setWaypoints((wps) => wps.filter((_, i) => i !== idx))
  }

  const clearAll = () => setWaypoints([])

  const total = totalDistanceNm(waypoints)
  const hours = estimatedHours(total, cruiseSpeedKn)

  return (
    <div className="panel route-panel">
      <h3>Pianificazione rotta</h3>

      {waypoints.length === 0 ? (
        <p className="route-empty">
          Clicca sulla mappa per aggiungere waypoint e costruire la rotta.
        </p>
      ) : (
        <div>
          {waypoints.map((wp, i) => {
            const prev = waypoints[i - 1]
            return (
              <div className="waypoint-row" key={i}>
                <span className="idx">WP{i + 1}</span>
                <span className="coord">
                  {wp.lat.toFixed(4)}, {wp.lon.toFixed(4)}
                </span>
                {prev && (
                  <span className="coord">
                    {legDistanceNm(prev, wp).toFixed(1)} nm · {legBearingDeg(prev, wp).toFixed(0)}°
                  </span>
                )}
                <button className="btn danger" onClick={() => removeWaypoint(i)} style={{ flex: 'none', padding: '2px 6px' }}>
                  ✕
                </button>
              </div>
            )
          })}

          <div className="route-summary">
            <span>Distanza totale</span>
            <strong>{total.toFixed(1)} nm</strong>
          </div>
          {hours != null && (
            <div className="route-summary">
              <span>Tempo stimato @ {cruiseSpeedKn} kn</span>
              <strong>{hours.toFixed(1)} h</strong>
            </div>
          )}

          <div className="route-actions">
            <button className="btn" onClick={clearAll}>Svuota rotta</button>
            <button className="btn primary" onClick={() => downloadGPX(waypoints, 'Rotta NavApp')}>
              Esporta GPX
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
