// Service WebSocket per AISStream.io
let socket = null;
const vessels = new Map();

export function startAisStream(apiKey, bbox, onUpdate) {
  if (socket) stopAisStream();

  // Bounding box predefinita: Tirreno e Adriatico [[LatMin, LonMin], [LatMax, LonMax]]
  const bounds = bbox || [[37.0, 8.0], [45.5, 19.0]];

  try {
    socket = new WebSocket('wss://stream.aisstream.io/v0/stream');

    socket.onopen = () => {
      const subscription = {
        APIKey: apiKey,
        BoundingBoxes: [bounds]
      };
      socket.send(JSON.stringify(subscription));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.MessageType === 'PositionReport') {
          const report = data.Message.PositionReport;
          const meta = data.MetaData;

          // Aggiorna o inserisce la nave nella mappa locale
          vessels.set(report.UserID, {
            mmsi: report.UserID,
            name: meta.ShipName?.trim() || `MMSI ${report.UserID}`,
            lat: report.Latitude,
            lon: report.Longitude,
            cog: report.Cog || 0,
            sog: report.Sog || 0,
            updatedAt: Date.now()
          });

          // Pulisce le navi non aggiornate da più di 15 minuti
          const cutoff = Date.now() - 15 * 60 * 1000;
          for (const [mmsi, v] of vessels.entries()) {
            if (v.updatedAt < cutoff) vessels.delete(mmsi);
          }

          // Genera il payload GeoJSON per MapLibre
          const geojson = {
            type: 'FeatureCollection',
            features: Array.from(vessels.values()).map((v) => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [v.lon, v.lat]
              },
              properties: {
                mmsi: v.mmsi,
                name: v.name,
                cog: v.cog,
                sog: v.sog
              }
            }))
          };

          onUpdate(geojson);
        }
      } catch (err) {
        console.error('AIS decode error:', err);
      }
    };

    socket.onerror = (err) => console.error('AIS WebSocket error:', err);
  } catch (err) {
    console.error('Inizializzazione AIS fallita:', err);
  }
}

export function stopAisStream() {
  if (socket) {
    socket.close();
    socket = null;
  }
  vessels.clear();
}