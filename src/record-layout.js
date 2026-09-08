import { OBJECTS } from './floor-scene.js';

// Keep a bounded shelf. Previous/next navigation reaches every record in the catalog.
export function recordSlots(count, selected, capacity = OBJECTS.stack.length) {
  if (!Number.isInteger(count) || count < 1 || !Number.isInteger(selected) || selected < 0 || selected >= count) {
    throw new RangeError('A record shelf needs a valid selection.');
  }
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > OBJECTS.stack.length) throw new RangeError('Invalid shelf capacity.');
  const others = Array.from({ length: count }, (_, index) => index).filter(index => index !== selected);
  const start = Math.min(Math.floor(selected / capacity) * capacity, Math.max(0, others.length - capacity));
  const page = others.slice(start, start + capacity);
  return new Map(page.map((index, slot) => [index, { ...OBJECTS.stack[slot], z: 12 + slot * 10, rank: slot + 1 }]));
}
