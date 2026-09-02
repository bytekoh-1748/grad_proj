import { IDLE_POINTER } from './config.js';

const SIGNATURE_PATH = 'M3 27 C 9 9, 15 5, 17 15 C 19 25, 13 30, 12 23 C 11 15, 21 9, 30 19 '
  + 'C 36 25, 41 23, 45 13 C 48 5, 53 7, 51 17 C 49 27, 43 30, 45 21 '
  + 'C 47 12, 59 9, 67 18 C 73 24, 80 22, 97 11';

const sampleCanvas = document.createElement('canvas');
const sampleContext = sampleCanvas.getContext('2d', { willReadFrequently: true });

export function createCartridgeFace(interaction, width) {
  const face = document.createElement('div');
  face.className = 'face';
  face.style.setProperty('--w', `${width}px`);
  face.style.setProperty('--h', `${width / 0.76}px`);
  face.style.setProperty('--body', interaction.cartridge.body);
  face.style.setProperty('--fg', interaction.cartridge.foreground);

  face.innerHTML = `
    <span class="face-grip">${'<i></i>'.repeat(14)}</span>
    <canvas class="face-art"></canvas>
    <h3 class="face-title"><span>Interaction</span>${interaction.title}</h3>
    <div class="face-meta">
      <span><b>MODE</b><em>${interaction.mode}</em></span>
      <span><b>CART</b><em>NO. ${interaction.number}</em></span>
    </div>
    <svg class="face-sign" viewBox="0 0 100 34" preserveAspectRatio="xMinYMid meet" aria-hidden="true">
      <path d="${SIGNATURE_PATH}" />
    </svg>
    <span class="face-rule"></span>
    <span class="face-shade"></span>
  `;

  return face;
}

/** Paints a low-resolution sample of an interaction as the cartridge artwork. */
export function paintCartridgeArt(canvas, interaction) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;

  const columns = 30;
  const rows = 13;
  const supersampling = 4;
  sampleCanvas.width = columns * supersampling;
  sampleCanvas.height = rows * supersampling;
  sampleContext.clearRect(0, 0, sampleCanvas.width, sampleCanvas.height);
  sampleContext.save();
  interaction.render({
    context: sampleContext,
    width: sampleCanvas.width,
    height: sampleCanvas.height,
    time: interaction.previewTime,
    color: '#ffffff',
    pointer: IDLE_POINTER,
  });
  sampleContext.restore();

  const pixels = sampleContext.getImageData(
    0,
    0,
    sampleCanvas.width,
    sampleCanvas.height,
  ).data;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  const context = canvas.getContext('2d');
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const squareSize = Math.min(cellWidth, cellHeight) * 0.76;
  context.fillStyle = interaction.cartridge.foreground;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      let alpha = 0;
      for (let y = 0; y < supersampling; y += 1) {
        for (let x = 0; x < supersampling; x += 1) {
          const pixel = (
            ((row * supersampling + y) * sampleCanvas.width)
            + column * supersampling
            + x
          ) * 4;
          alpha += pixels[pixel + 3];
        }
      }

      const coverage = alpha / (supersampling * supersampling * 255);
      if (coverage < 0.06) continue;
      context.globalAlpha = 0.2 + 0.8 * Math.min(1, coverage * 1.3);
      context.fillRect(
        column * cellWidth + (cellWidth - squareSize) / 2,
        row * cellHeight + (cellHeight - squareSize) / 2,
        squareSize,
        squareSize,
      );
    }
  }
  context.globalAlpha = 1;
}
