import { useState, useCallback } from 'react'
import { getCurrentConditions } from '../services/weather'

// Direzione vento/onde arriva come "da dove soffia/proviene" (standard
// meteorologico). La freccia nel pannello punta invece "verso dove va",
// quindi ruotiamo di +180° per un colpo d'occhio più intuitivo in barca.
function toArrowRotation(fromDeg) {
  return (fromDeg + 180) % 360
}

export default function WeatherPanel({ lat, lon }) {
  const [conditions, setConditions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchHere = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const c = await getCurrentConditions(lat, lon)
      setConditions(c)
    } catch (err) {
      setError('Meteo non disponibile (verifica la connessione)')
    } finally {
      setLoading(false)
    }
  }, [lat, lon])

  return (
    <div className="panel weather-panel">
      <h3>Vento &amp; mare</h3>

      {!conditions && !loading && !error && (
        <p className="route-empty">
          Inquadra un punto in mare e premi "Aggiorna" per vedere vento e stato del mare previsti lì.
        </p>
      )}

      {loading && <p className="route-empty">Richiesta in corso…</p>}
      {error && <p className="route-empty" style={{ color: 'var(--accent-red)' }}>{error}</p>}

      {conditions && !loading && (
        <div className="weather-readouts">
          <div className="weather-row">
            <div className="weather-arrow" style={{ transform: `rotate(${toArrowRotation(conditions.windDirectionDeg ?? 0)}deg)` }}>
              ↑
            </div>
            <div className="weather-values">
              <span className="weather-label">Vento</span>
              <strong>{conditions.windSpeedKn?.toFixed(0) ?? '—'} kn</strong>
              <span className="weather-sub">
                da {conditions.windDirectionDeg?.toFixed(0) ?? '—'}° · raffiche {conditions.windGustsKn?.toFixed(0) ?? '—'} kn
              </span>
            </div>
          </div>

          <div className="weather-row">
            <div className="weather-arrow wave" style={{ transform: `rotate(${toArrowRotation(conditions.waveDirectionDeg ?? 0)}deg)` }}>
              ↑
            </div>
            <div className="weather-values">
              <span className="weather-label">Onde</span>
              <strong>{conditions.waveHeightM?.toFixed(1) ?? '—'} m</strong>
              <span className="weather-sub">
                periodo {conditions.wavePeriodS?.toFixed(0) ?? '—'} s · swell {conditions.swellHeightM?.toFixed(1) ?? '—'} m
              </span>
            </div>
          </div>

          <p className="weather-time">Previsione per: {new Date(conditions.time).toLocaleString('it-IT')}</p>
        </div>
      )}

      <button className="btn primary" style={{ width: '100%', marginTop: 10 }} onClick={fetchHere} disabled={loading}>
        Aggiorna su questo punto
      </button>
    </div>
  )
}
