import { INK, PAPER } from '../config.js';
import { registerInteraction } from './registry.js';

registerInteraction({
  id: 'room-on-the-paper',
  number: '03',
  title: 'Room on the Paper',
  mode: 'DUOTONE',
  hint: 'MOVE TO PUSH THE TYPE ASIDE',
  cartridge: { body: INK.botanicalGreen, foreground: PAPER.beige },
  screen: { ink: INK.botanicalGreen, paper: PAPER.beige },
  previewTime: 4300,
  render({ context, width, height, time, color, pointer }) {
    const rows = 11;
    const rowHeight = height / rows;
    const push = (pointer.x - 0.5) * 2;

    context.fillStyle = color;
    for (let row = 0; row < rows; row += 1) {
      const offset = (
        push * 0.3 + Math.sin(time * 0.0009 + row * 0.7) * 0.1
      ) * width;
      const barWidth = width * (0.24 + 0.26 * Math.abs(Math.sin(row * 1.3)));
      context.globalAlpha = row % 2 ? 0.92 : 0.5;
      context.fillRect(
        width * 0.5 - barWidth / 2 + offset,
        row * rowHeight + rowHeight * 0.24,
        barWidth,
        rowHeight * 0.52,
      );
    }
    context.globalAlpha = 1;
  },
});
