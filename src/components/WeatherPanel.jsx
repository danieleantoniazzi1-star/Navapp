import { useState, useCallback, useEffect, useRef } from 'react'
import { getCurrentConditions } from '../services/weather'

// Direzione vento/onde arriva come "da dove soffia/proviene" (standard
// meteorologico). La freccia nel pannello punta invece "verso dove va",
// quindi ruotiamo di +180° per un colpo d'occhio più intuitivo in barca.
function toArrowRotation(fromDeg) {
  return (fromDeg + 180) % 360
}

// Distanza approssimata in km tra due punti (sufficiente solo per decidere
// se la posizione si è spostata abbastanza da giustificare un nuovo fetch,
// non per calcoli di navigazione).
function roughDistanceKm(a, b) {
  if (!a || !b) return Infinity
  const dLat = a.lat - b.lat
  const dLon = a.lon - b.lon
  return Math.sqrt(dLat * dLat + dLon * dLon) * 111
}

const REFETCH_THRESHOLD_KM = 3

export default function WeatherPanel({ lat, lon, source }) {
  const [conditions, setConditions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const lastFetchedRef = useRef(null)

  const fetchNow = useCallback(async () => {
    if (lat == null || lon == null) return
    setLoading(true)
    setError(null)
    try {
      const c = await getCurrentConditions(lat, lon)
      setConditions(c)
      lastFetchedRef.current = { lat, lon }
    } catch (err) {
      setError('Meteo non disponibile (verifica la connessione)')
    } finally {
      setLoading(false)
    }
  }, [lat, lon])

  // Aggiorna automaticamente quando la posizione (GPS o centro mappa) si
  // sposta abbastanza da rendere la previsione precedente poco rilevante.
  useEffect(() => {
    if (lat == null || lon == null) return
    if (roughDistanceKm(lastFetchedRef.current, { lat, lon }) < REFETCH_THRESHOLD_KM) return
    fetchNow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon])

  return (
    <div className="panel weather-panel">
      <h3>Vento &amp; mare · {source === 'gps' ? 'posizione GPS' : 'centro mappa'}</h3>

      {!conditions && !loading && !error && (
        <p className="route-empty">Recupero condizioni per la posizione attuale…</p>
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

      <button className="btn primary" style={{ width: '100%', marginTop: 10 }} onClick={fetchNow} disabled={loading}>
        Aggiorna
      </button>
    </div>
  )
}
