import { INK, PAPER, TAU } from '../config.js';
import { registerInteraction } from './registry.js';

registerInteraction({
  id: 'out-of-register',
  number: '01',
  title: 'Out of Register',
  mode: 'OVERPRINT',
  hint: 'DRAG TO PULL THE PLATES APART',
  cartridge: { body: INK.ultramarine, foreground: PAPER.white },
  screen: { ink: INK.ultramarine, paper: PAPER.white },
  previewTime: 900,
  render({ context, width, height, time, color, pointer }) {
    const size = Math.min(width, height);
    const offsetX = pointer.dx * size * 0.3 + Math.sin(time * 0.0006) * size * 0.014;
    const offsetY = pointer.dy * size * 0.3 + Math.cos(time * 0.0008) * size * 0.014;

    context.fillStyle = color;
    context.strokeStyle = color;
    context.lineWidth = size * 0.017;

    for (let layer = 0; layer < 2; layer += 1) {
      const direction = layer ? 0.5 : -0.5;
      context.globalAlpha = 0.56;
      context.beginPath();
      context.arc(
        width * 0.5 + offsetX * direction,
        height * 0.4 + offsetY * direction,
        size * 0.19,
        0,
        TAU,
      );
      context.fill();

      for (let line = 0; line < 3; line += 1) {
        const y = height * 0.66 + line * size * 0.082 + offsetY * direction;
        context.beginPath();
        context.moveTo(width * 0.14 + offsetX * direction, y);
        context.lineTo(width * 0.86 + offsetX * direction, y);
        context.stroke();
      }
    }
    context.globalAlpha = 1;
  },
});
