// windGrid.js
//
// Costruisce una griglia di punti su un'area visibile e scarica il vento
// orario per TUTTI i punti in un'unica richiesta batch (Open-Meteo supporta
// liste di lat/lon separate da virgola in un solo URL — evita decine di
// chiamate separate per ogni punto della griglia).

const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast'

/** Genera una griglia regolare di punti dentro un bounding box. */
export function buildGrid(bbox, cols = 7, rows = 7) {
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

/**
 * Scarica vento (velocità in nodi + direzione) per tutti i punti della
 * griglia, per le prossime `hoursAhead` ore.
 * Restituisce { times, frames } dove frames[i] è un GeoJSON FeatureCollection
 * pronto per essere passato a una sorgente MapLibre — un frame per ogni ora.
 */
export async function fetchWindGrid(points, hoursAhead = 24) {
  const lats = points.map((p) => p.lat.toFixed(3)).join(',')
  const lons = points.map((p) => p.lon.toFixed(3)).join(',')
  const url = `${FORECAST_BASE}?latitude=${lats}&longitude=${lons}` +
    `&hourly=wind_speed_10m,wind_direction_10m&wind_speed_unit=kn&forecast_hours=${hoursAhead}`

  const res = await fetch(url)
  if (!res.ok) throw new Error('Richiesta griglia vento fallita')
  const data = await res.json()

  // Con più location, Open-Meteo restituisce un array di risposte (una per punto).
  const perPoint = Array.isArray(data) ? data : [data]
  const times = perPoint[0]?.hourly?.time ?? []

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
