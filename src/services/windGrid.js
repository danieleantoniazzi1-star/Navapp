// windGrid.js
//
// Costruisce una griglia di punti su un'area visibile e scarica il vento
// orario per TUTTI i punti in un'unica richiesta batch (Open-Meteo supporta
// liste di lat/lon separate da virgola in un solo URL — evita decine di
// chiamate separate per ogni punto della griglia).

const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast'
const FETCH_TIMEOUT_MS = 15000
const MAX_HOURS = 24

/** Genera una griglia regolare di punti dentro un bounding box. */
export function buildGrid(bbox, cols = 4, rows = 4) {
  const { minLon, minLat, maxLon, maxLat } = bbox
  const points = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lon = minLon + (c / (cols - 1)) * (maxLon - minLon)
      const lat = minLat + (r / (rows - 1)) * (maxLat - minLat)
      points.push({ lat, lon })
    }
  }
  return points
}

/** Promise che si rifiuta sempre dopo `ms` millisecondi, a prescindere da
 * cosa stia facendo la fetch — garanzia di non restare bloccati per sempre
 * anche se AbortController/fetch si comportano in modo imprevisto. */
function hardTimeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout: nessuna risposta dal servizio meteo entro 15s')), ms)
  })
}

/**
 * Scarica vento (velocità in nodi + direzione) per tutti i punti della
 * griglia, per le prossime ore.
 * Restituisce { times, frames } dove frames[i] è un GeoJSON FeatureCollection
 * pronto per essere passato a una sorgente MapLibre — un frame per ogni ora.
 */
export async function fetchWindGrid(points) {
  const lats = points.map((p) => p.lat.toFixed(3)).join(',')
  const lons = points.map((p) => p.lon.toFixed(3)).join(',')
  // Nota: niente parametro forecast_hours qui — con richieste multi-location
  // alcune combinazioni di parametri hanno dato risposte anomale in test;
  // chiediamo l'intervallo di default e tagliamo alle prime MAX_HOURS ore
  // lato client, più semplice e affidabile.
  const url = `${FORECAST_BASE}?latitude=${lats}&longitude=${lons}` +
    `&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=kn`

  console.debug('[windGrid] richiesta:', url)

  let res
  try {
    res = await Promise.race([fetch(url), hardTimeout(FETCH_TIMEOUT_MS)])
  } catch (err) {
    console.error('[windGrid] fetch fallita:', err)
    throw new Error(err.message || 'Impossibile contattare il servizio meteo')
  }

  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body?.reason ? `: ${body.reason}` : ''
    } catch {
      // risposta non JSON, ignoriamo
    }
    throw new Error(`Servizio meteo non disponibile (HTTP ${res.status})${detail}`)
  }

  const data = await res.json()

  // Con più location, Open-Meteo restituisce un array di risposte (una per punto).
  const perPoint = Array.isArray(data) ? data : [data]
  const allTimes = perPoint[0]?.hourly?.time ?? []
  const times = allTimes.slice(0, MAX_HOURS)

  if (times.length === 0) {
    throw new Error('Risposta del servizio meteo vuota o inattesa')
  }

  const frames = times.map((time, hourIdx) => ({
    type: 'FeatureCollection',
    features: perPoint.map((pointData, i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [points[i].lon, points[i].lat] },
      properties: {
        speed: pointData.hourly?.wind_speed_10m?.[hourIdx] ?? 0,
        direction: pointData.hourly?.wind_direction_10m?.[hourIdx] ?? 0
      }
    }))
  }))

  return { times, frames }
}
