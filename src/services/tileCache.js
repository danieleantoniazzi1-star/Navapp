// tileCache.js
//
// Gestisce il download e la lettura di tile mappa (satellite, nautiche, base)
// per l'uso offline. Le tile scaricate vengono salvate in IndexedDB come
// Blob, indicizzate per sorgente/z/x/y.
//
// Perché IndexedDB e non il Cache Storage del service worker?
// Perché vogliamo controllo esplicito su COSA viene scaricato (un'area
// geografica scelta dall'utente, non tutto ciò che passa dalla rete), e
// vogliamo poter mostrare quanto spazio occupa ogni "pacchetto area"
// scaricato, per poterlo cancellare in modo mirato.

import { openDB } from 'idb'

const DB_NAME = 'navapp-tiles'
const DB_VERSION = 1
const STORE = 'tiles'

let dbPromise = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE, { keyPath: 'key' })
        store.createIndex('by-region', 'regionId')
      }
    })
  }
  return dbPromise
}

function tileKey(sourceId, z, x, y) {
  return `${sourceId}/${z}/${x}/${y}`
}

/** Converte lat/lon + zoom in indici tile (schema slippy map standard). */
export function lonLatToTile(lon, lat, z) {
  const x = Math.floor(((lon + 180) / 360) * Math.pow(2, z))
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, z)
  )
  return { x, y }
}

/** Elenca tutte le tile (x,y) necessarie per coprire un bounding box a un dato zoom. */
export function tilesForBBox(bbox, z) {
  const { minLon, minLat, maxLon, maxLat } = bbox
  const nw = lonLatToTile(minLon, maxLat, z)
  const se = lonLatToTile(maxLon, minLat, z)
  const tiles = []
  for (let x = nw.x; x <= se.x; x++) {
    for (let y = nw.y; y <= se.y; y++) {
      tiles.push({ z, x, y })
    }
  }
  return tiles
}

/**
 * Scarica e salva tutte le tile di una sorgente per un bbox, su un range di zoom.
 * onProgress(done, total) viene chiamato ad ogni tile completata.
 */
export async function downloadRegion({ regionId, sourceId, urlTemplate, bbox, minZoom, maxZoom, onProgress }) {
  const db = await getDB()
  let allTiles = []
  for (let z = minZoom; z <= maxZoom; z++) {
    allTiles = allTiles.concat(tilesForBBox(bbox, z))
  }

  let done = 0
  const total = allTiles.length

  // Download sequenziale a piccoli lotti per non saturare la rete/il device.
  const CONCURRENCY = 6
  let cursor = 0

  async function worker() {
    while (cursor < allTiles.length) {
      const i = cursor++
      const { z, x, y } = allTiles[i]
      const url = urlTemplate.replace('{z}', z).replace('{x}', x).replace('{y}', y)
      try {
        const res = await fetch(url)
        if (res.ok) {
          const blob = await res.blob()
          await db.put(STORE, {
            key: tileKey(sourceId, z, x, y),
            regionId,
            sourceId,
            z, x, y,
            blob,
            savedAt: Date.now()
          })
        }
      } catch (err) {
        // Tile singola fallita: non blocchiamo l'intero download regione.
        console.warn('Tile non scaricata', sourceId, z, x, y, err)
      }
      done++
      onProgress?.(done, total)
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  return { total, regionId }
}

/** Recupera una tile dalla cache locale, o null se non presente. */
export async function getCachedTile(sourceId, z, x, y) {
  const db = await getDB()
  const record = await db.get(STORE, tileKey(sourceId, z, x, y))
  return record ? record.blob : null
}

/** Elimina tutte le tile associate a una regione scaricata. */
export async function deleteRegion(regionId) {
  const db = await getDB()
  const tx = db.transaction(STORE, 'readwrite')
  const index = tx.store.index('by-region')
  let cursor = await index.openCursor(IDBKeyRange.only(regionId))
  let count = 0
  while (cursor) {
    await cursor.delete()
    count++
    cursor = await cursor.continue()
  }
  await tx.done
  return count
}

/** Stima lo spazio occupato in totale dalla cache tile (in byte). */
export async function estimateCacheSize() {
  if (navigator.storage?.estimate) {
    const { usage } = await navigator.storage.estimate()
    return usage
  }
  return null
}
