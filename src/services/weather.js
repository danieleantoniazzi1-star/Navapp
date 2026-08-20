// weather.js
//
// Fonte: Open-Meteo Marine API — gratuita, nessuna API key richiesta,
// dati onde/vento/mare aggiornati da modelli meteorologici globali.
// Doc: https://open-meteo.com/en/docs/marine-weather-api
//
// Nota: questo servizio richiede connettività. Per l'uso offline, i dati
// vanno scaricati PRIMA di uscire in mare (vedi downloadForecastForRoute)
// e salvati come JSON in IndexedDB/localStorage insieme alla rotta.

const MARINE_BASE = 'https://marine-api.open-meteo.com/v1/marine'
const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast'

/**
 * Ottiene stato del mare (onde) + vento per un punto.
 * Combina due endpoint: marine (onde) e forecast standard (vento a 10m).
 */
export async function getMarineConditions(lat, lon) {
  const marineUrl = `${MARINE_BASE}?latitude=${lat}&longitude=${lon}` +
    `&hourly=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_period`

  const windUrl = `${FORECAST_BASE}?latitude=${lat}&longitude=${lon}` +
    `&hourly=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kn`

  const [marineRes, windRes] = await Promise.all([
    fetch(marineUrl),
    fetch(windUrl)
  ])

  if (!marineRes.ok || !windRes.ok) {
    throw new Error('Richiesta meteo fallita')
  }

  const marine = await marineRes.json()
  const wind = await windRes.json()

  return normalizeConditions(marine, wind)
}

function normalizeConditions(marine, wind) {
  const times = marine?.hourly?.time ?? []
  return times.map((time, i) => ({
    time,
    waveHeightM: marine.hourly.wave_height?.[i] ?? null,
    waveDirectionDeg: marine.hourly.wave_direction?.[i] ?? null,
    wavePeriodS: marine.hourly.wave_period?.[i] ?? null,
    swellHeightM: marine.hourly.swell_wave_height?.[i] ?? null,
    windSpeedKn: wind.hourly?.wind_speed_10m?.[i] ?? null,
    windDirectionDeg: wind.hourly?.wind_direction_10m?.[i] ?? null,
    windGustsKn: wind.hourly?.wind_gusts_10m?.[i] ?? null
  }))
}

/**
 * Come getMarineConditions, ma restituisce solo la voce oraria più vicina
 * all'istante corrente — comoda per un readout "condizioni adesso".
 */
export async function getCurrentConditions(lat, lon) {
  const all = await getMarineConditions(lat, lon)
  if (all.length === 0) return null
  const now = Date.now()
  return all.reduce((closest, c) => {
    const diff = Math.abs(new Date(c.time).getTime() - now)
    const closestDiff = Math.abs(new Date(closest.time).getTime() - now)
    return diff < closestDiff ? c : closest
  }, all[0])
}

/**
 * Scarica le previsioni per ogni waypoint di una rotta, per poterle
 * consultare offline durante la navigazione.
 */
export async function downloadForecastForRoute(waypoints) {
  const results = await Promise.all(
    waypoints.map(async (wp) => ({
      lat: wp.lat,
      lon: wp.lon,
      conditions: await getMarineConditions(wp.lat, wp.lon)
    }))
  )
  return results
}
