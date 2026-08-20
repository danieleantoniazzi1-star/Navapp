// gpx.js
// Esporta una rotta (lista di waypoint {lat, lon, name}) in formato GPX 1.1,
// standard universale leggibile da plotter, app di navigazione, ecc.

export function routeToGPX(waypoints, routeName = 'Rotta NavApp') {
  const wptTags = waypoints
    .map(
      (wp, i) => `  <wpt lat="${wp.lat}" lon="${wp.lon}">
    <name>${wp.name || `WP${i + 1}`}</name>
  </wpt>`
    )
    .join('\n')

  const rteptTags = waypoints
    .map((wp, i) => `    <rtept lat="${wp.lat}" lon="${wp.lon}"><name>${wp.name || `WP${i + 1}`}</name></rtept>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="NavApp" xmlns="http://www.topografix.com/GPX/1/1">
${wptTags}
  <rte>
    <name>${routeName}</name>
${rteptTags}
  </rte>
</gpx>`
}

export function downloadGPX(waypoints, routeName) {
  const gpx = routeToGPX(waypoints, routeName)
  const blob = new Blob([gpx], { type: 'application/gpx+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${(routeName || 'rotta').replace(/\s+/g, '_')}.gpx`
  a.click()
  URL.revokeObjectURL(url)
}
