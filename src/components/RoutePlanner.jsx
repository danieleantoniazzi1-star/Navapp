import { useState } from 'react'
import { legDistanceNm, legBearingDeg, totalDistanceNm, estimatedHours } from '../services/routeMath'
import { downloadGPX } from '../services/gpx'

export default function RoutePlanner({ waypoints, setWaypoints, cruiseSpeedKn = 6 }) {
  const [speed, setSpeed] = useState(cruiseSpeedKn)

  const removeWaypoint = (idx) => {
    setWaypoints((wps) => wps.filter((_, i) => i !== idx))
  }

  const clearAll = () => setWaypoints([])

  const total = totalDistanceNm(waypoints)
  const currentSpeed = Math.max(0.1, Number(speed) || 1)
  const hours = estimatedHours(total, currentSpeed)

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
            <div className="route-summary" style={{ alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Tempo stimato @</span>
                <input
                  type="number"
                  min="0.5"
                  max="50"
                  step="0.5"
                  value={speed}
                  onChange={(e) => setSpeed(e.target.value)}
                  style={{
                    width: '45px',
                    background: '#0a1420',
                    border: '1px solid #3fe0d0',
                    color: '#ffb703',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontWeight: 'bold',
                    textAlign: 'center',
                    borderRadius: '3px',
                    padding: '2px 0',
                    fontSize: '12px'
                  }}
                />
                <span>kn</span>
              </div>
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