import { INK, PAPER } from '../config.js';
import { registerInteraction } from './registry.js';

registerInteraction({
  id: 'order-of-the-plates',
  number: '05',
  title: 'Order of the Plates',
  mode: 'CHROMATIC + BLACK',
  hint: 'MOVE TO CHANGE WHICH PLATE LANDS FIRST',
  cartridge: { body: INK.mintGreen, foreground: INK.warmCharcoal },
  screen: { ink: INK.warmCharcoal, paper: PAPER.gray },
  previewTime: 7700,
  render({ context, width, height, time, color, pointer }) {
    const size = Math.min(width, height);
    const plateSize = size * 0.5;
    const distance = size * 0.15;
    const angle = time * 0.0006 + (pointer.x - 0.5) * 3.6;
    const columns = Math.max(1, Math.round(width / (size * 0.92)));

    context.fillStyle = color;
    context.globalAlpha = 0.5;
    for (let column = 0; column < columns; column += 1) {
      const centerX = width * (column + 0.5) / columns;
      for (let layer = 0; layer < 2; layer += 1) {
        const direction = layer ? 1 : -1;
        context.fillRect(
          centerX - plateSize / 2 + direction * Math.cos(angle + column) * distance,
          height / 2 - plateSize / 2 + direction * Math.sin(angle + column) * distance,
          plateSize,
          plateSize,
        );
      }
    }
    context.globalAlpha = 1;
  },
});
