import maplibregl from 'maplibre-gl'
import { getCachedTile } from './tileCache'

let isRegistered = false

export function registerOfflineProtocol() {
  if (isRegistered) return

  maplibregl.addProtocol('offline', async (params, abortController) => {
    const urlPartIndex = params.url.indexOf('?url=')
    if (urlPartIndex === -1) throw new Error("URL di fallback non fornito")

    const customPath = params.url.substring(0, urlPartIndex)
    const fallbackUrl = params.url.substring(urlPartIndex + 5)

    const parts = customPath.replace('offline://', '').split('/')
    const sourceId = parts[0]
    const z = parseInt(parts[1], 10)
    const x = parseInt(parts[2], 10)
    const y = parseInt(parts[3], 10)

    try {
      // 1. Cerca nella cache locale IndexedDB
      const cachedBlob = await getCachedTile(sourceId, z, x, y)
      if (cachedBlob) {
        return { data: await cachedBlob.arrayBuffer() }
      }

      // 2. Fallback su rete se online
      if (navigator.onLine) {
        const response = await fetch(fallbackUrl, { signal: abortController.signal })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        
        const blob = await response.blob()
        return { data: await blob.arrayBuffer() }
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.warn(`Tile non recuperata: ${sourceId} ${z}/${x}/${y}`, error)
      }
    }

    throw new Error('Tile non trovata in cache e rete offline')
  })

  isRegistered = true
}