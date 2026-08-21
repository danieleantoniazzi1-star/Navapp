import { buildGrid } from './windGrid'

/**
 * Recupera l'altezza, la direzione e il periodo delle onde per la griglia di punti.
 * Usa l'endpoint gratuito Open-Meteo Marine API.
 */
export async function fetchWaveGrid(points) {
  if (!points || !points.length) return { times: [], frames: [] }

  const lats = points.map((p) => p.lat.toFixed(4)).join(',')
  const lons = points.map((p) => p.lon.toFixed(4)).join(',')

  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lats}&longitude=${lons}&hourly=wave_height,wave_direction,wave_period&forecast_days=2`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Errore API Mare (${res.status})`)

  const data = await res.json()
  const responses = Array.isArray(data) ? data : [data]

  const firstHourly = responses[0]?.hourly
  if (!firstHourly || !firstHourly.time) return { times: [], frames: [] }

  // Consideriamo le prime 25 ore (dalla corrente alle 24h successive)
  const times = firstHourly.time.slice(0, 25)

  const frames = times.map((t, timeIdx) => {
    const features = points
      .map((pt, ptIdx) => {
        const h = responses[ptIdx]?.hourly
        const height = h?.wave_height?.[timeIdx] ?? 0
        const direction = h?.wave_direction?.[timeIdx] ?? 0
        const period = h?.wave_period?.[timeIdx] ?? 0

        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [pt.lon, pt.lat] },
          properties: { height, direction, period }
        }
      })
      .filter((f) => f.properties.height !== null)

    return { type: 'FeatureCollection', features }
  })

  return { times, frames }
}