// geolocation.js
//
// Due sorgenti di direzione, in ordine di preferenza:
// 1. Bussola del dispositivo (DeviceOrientationEvent) — la più precisa,
//    disponibile su smartphone. Su iOS 13+ richiede un permesso esplicito
//    innescato da un gesto utente (per questo va richiesta dentro il click
//    dell'utente sul pulsante GPS, non in automatico).
// 2. "Course over ground" del GPS (coords.heading) — direzione di
//    movimento calcolata dal GPS stesso; disponibile solo quando ci si
//    muove a velocità sufficiente. Buon fallback quando la bussola non c'è
//    (es. desktop/laptop, o permesso negato).
// Se nessuna delle due è disponibile, la posizione viene mostrata senza
// freccia di prua.

/** Avvia il tracking continuo della posizione GPS. Restituisce una funzione
 * per fermarlo. */
export function watchPosition(onUpdate, onError) {
  if (!navigator.geolocation) {
    onError?.(new Error('Geolocalizzazione non supportata da questo browser'))
    return () => {}
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => {
      onUpdate({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracyM: pos.coords.accuracy,
        gpsHeading: typeof pos.coords.heading === 'number' && !Number.isNaN(pos.coords.heading)
          ? pos.coords.heading
          : null,
        speedMs: pos.coords.speed ?? null
      })
    },
    (err) => onError?.(err),
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
  )
  return () => navigator.geolocation.clearWatch(id)
}

/**
 * Richiede (se serve) il permesso e avvia l'ascolto della bussola.
 * Va chiamata sincronamente dentro un gesto utente (click) su iOS.
 * Restituisce una funzione per fermare l'ascolto, o null se non disponibile/negato.
 */
export async function requestCompass(onHeading) {
  const handler = (e) => {
    // iOS espone webkitCompassHeading, già riferito al nord vero, orario 0-360.
    // Gli altri browser espongono "alpha" (antiorario): va convertito.
    let heading = null
    if (typeof e.webkitCompassHeading === 'number') {
      heading = e.webkitCompassHeading
    } else if (typeof e.alpha === 'number') {
      heading = (360 - e.alpha) % 360
    }
    if (heading != null) onHeading(heading)
  }

  const RequestPermissionAPI = typeof DeviceOrientationEvent !== 'undefined'
    ? DeviceOrientationEvent.requestPermission
    : null

  if (typeof RequestPermissionAPI === 'function') {
    try {
      const permission = await RequestPermissionAPI()
      if (permission !== 'granted') return null
    } catch {
      return null
    }
    window.addEventListener('deviceorientation', handler, true)
    return () => window.removeEventListener('deviceorientation', handler, true)
  }

  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) {
    return null
  }

  const eventName = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation'
  window.addEventListener(eventName, handler, true)
  return () => window.removeEventListener(eventName, handler, true)
}
