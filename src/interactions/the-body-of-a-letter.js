import { clamp, FACE_FONT, INK, PAPER } from '../config.js';
import { registerInteraction } from './registry.js';

const GLYPHS = 'AERTNSOMU0123456789@#%&*';

registerInteraction({
  id: 'the-body-of-a-letter',
  number: '06',
  title: 'The Body of a Letter',
  mode: 'OVERPRINT',
  hint: 'MOVE TO UNSETTLE THE LETTERS',
  cartridge: { body: INK.cyan, foreground: PAPER.white },
  screen: { ink: INK.brickRed, paper: PAPER.gray },
  previewTime: 9400,
  render({ context, width, height, time, color, pointer }) {
    const cell = Math.min(width, height) / 3.1;
    const columns = Math.max(1, Math.round(width / cell));
    const rows = Math.max(1, Math.round(height / cell));
    const cellWidth = width / columns;
    const cellHeight = height / rows;
    const pointerX = pointer.x * width;
    const pointerY = pointer.y * height;
    const reach = Math.hypot(width, height) * 0.42;

    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `700 ${Math.min(cellWidth, cellHeight) * 0.94}px ${FACE_FONT}`;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = (column + 0.5) * cellWidth;
        const y = (row + 0.5) * cellHeight;
        const proximity = clamp(
          1 - Math.hypot(x - pointerX, y - pointerY) / reach,
          0,
          1,
        );
        const spin = time * 0.0007 * (1 + proximity * 8) + row * 13 + column * 7;
        context.globalAlpha = 0.26
          + 0.64 * Math.abs(Math.sin(time * 0.0009 + (row + column) * 0.8));
        context.fillText(GLYPHS[Math.floor(Math.abs(spin)) % GLYPHS.length], x, y);
      }
    }
    context.globalAlpha = 1;
  },
});
