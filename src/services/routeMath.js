import { point, distance, bearing } from '@turf/turf'

/** Distanza tra due waypoint in miglia nautiche. */
export function legDistanceNm(a, b) {
  return distance(point([a.lon, a.lat]), point([b.lon, b.lat]), { units: 'nauticalmiles' })
}

/** Rotta (bearing) in gradi veri da a verso b, 0-360. */
export function legBearingDeg(a, b) {
  const b1 = bearing(point([a.lon, a.lat]), point([b.lon, b.lat]))
  return (b1 + 360) % 360
}

/** Somma delle distanze di tutte le tratte di una rotta. */
export function totalDistanceNm(waypoints) {
  let total = 0
  for (let i = 1; i < waypoints.length; i++) {
    total += legDistanceNm(waypoints[i - 1], waypoints[i])
  }
  return total
}

/** Tempo stimato di navigazione in ore, data una velocità in nodi. */
export function estimatedHours(distanceNm, speedKn) {
  if (!speedKn) return null
  return distanceNm / speedKn
}
