// Crea un'icona nave ciano/ambra per MapLibre
export function createShipImage(map) {
  if (map.hasImage('ais-ship-icon')) return;

  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Disegna sagoma nave (freccia/triangolo nautico)
  ctx.beginPath();
  ctx.moveTo(16, 2);
  ctx.lineTo(26, 28);
  ctx.lineTo(16, 22);
  ctx.lineTo(6, 28);
  ctx.closePath();

  ctx.fillStyle = '#ffb703'; // Accento ambra
  ctx.fill();
  ctx.strokeStyle = '#0a1420';
  ctx.lineWidth = 2;
  ctx.stroke();

  const imageData = ctx.getImageData(0, 0, size, size);
  map.addImage('ais-ship-icon', imageData);
}