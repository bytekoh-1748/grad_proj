import { clamp, INK, PAPER } from '../config.js';
import { registerInteraction } from './registry.js';

registerInteraction({
  id: 'density-of-one-ink',
  number: '04',
  title: 'Density of One Ink',
  mode: 'ONE INK',
  hint: 'MOVE UP AND DOWN TO SET THE DENSITY',
  cartridge: { body: INK.signalRed, foreground: PAPER.white },
  screen: { ink: INK.signalRed, paper: PAPER.white },
  previewTime: 6000,
  render({ context, width, height, time, color, pointer }) {
    const rows = 9;
    const rowHeight = height / rows;

    context.fillStyle = color;
    for (let row = 0; row < rows; row += 1) {
      const position = (row + 0.5) / rows;
      context.globalAlpha = clamp(
        1.06
          - Math.abs(position - pointer.y) * 2.2
          + 0.13 * Math.sin(time * 0.0007 + position * 6),
        0.05,
        1,
      );
      context.fillRect(0, row * rowHeight, width, rowHeight * 0.99);
    }
    context.globalAlpha = 1;
  },
});
