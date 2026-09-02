import { clamp, INK, PAPER, TAU } from '../config.js';
import { registerInteraction } from './registry.js';

registerInteraction({
  id: 'the-size-of-the-dot',
  number: '02',
  title: 'The Size of the Dot',
  mode: 'DUOTONE',
  hint: 'MOVE TO GROW THE DOTS',
  cartridge: { body: INK.terracotta, foreground: PAPER.beige },
  screen: { ink: INK.cobalt, paper: PAPER.white },
  previewTime: 2600,
  render({ context, width, height, time, color, pointer }) {
    const cell = Math.min(width, height) / 9.5;
    const columns = Math.max(2, Math.round(width / cell));
    const rows = Math.max(2, Math.round(height / cell));
    const cellWidth = width / columns;
    const cellHeight = height / rows;
    const pointerX = pointer.x * width;
    const pointerY = pointer.y * height;
    const reach = Math.hypot(width, height) * 0.56;

    context.fillStyle = color;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = (column + 0.5) * cellWidth;
        const y = (row + 0.5) * cellHeight;
        const distance = Math.hypot(x - pointerX, y - pointerY) / reach;
        const value = clamp(
          1.04 - distance + 0.2 * Math.sin(time * 0.0012 - distance * 5.5),
          0,
          1,
        );
        if (value < 0.04) continue;
        context.beginPath();
        context.arc(
          x,
          y,
          Math.min(cellWidth, cellHeight) * 0.5 * Math.sqrt(value),
          0,
          TAU,
        );
        context.fill();
      }
    }
  },
});
