const registry = [];
const ids = new Set();
const numbers = new Set();

function requireText(value, field, id) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`Interaction "${id || 'unknown'}" requires a non-empty ${field}.`);
  }
}

function requireColors(colors, field, id, names) {
  if (!colors || typeof colors !== 'object') {
    throw new TypeError(`Interaction "${id}" requires ${field} colors.`);
  }
  names.forEach((name) => requireText(colors[name], `${field}.${name}`, id));
}

/**
 * Registers one self-contained interaction cartridge.
 * The app shell only depends on this contract; individual renderers never need
 * to edit the shelf, insertion sequence, input handling, or shared CSS.
 */
export function registerInteraction(definition) {
  if (!definition || typeof definition !== 'object') {
    throw new TypeError('registerInteraction expects an interaction definition.');
  }

  const { id } = definition;
  requireText(id, 'id', id);
  ['number', 'title', 'mode', 'hint'].forEach((field) => {
    requireText(definition[field], field, id);
  });
  requireColors(definition.cartridge, 'cartridge', id, ['body', 'foreground']);
  requireColors(definition.screen, 'screen', id, ['ink', 'paper']);

  if (typeof definition.render !== 'function') {
    throw new TypeError(`Interaction "${id}" requires a render() function.`);
  }
  if (ids.has(id)) throw new Error(`Duplicate interaction id: ${id}`);
  if (numbers.has(definition.number)) {
    throw new Error(`Duplicate interaction number: ${definition.number}`);
  }

  const interaction = Object.freeze({
    ...definition,
    previewTime: Number.isFinite(definition.previewTime) ? definition.previewTime : 0,
    cartridge: Object.freeze({ ...definition.cartridge }),
    screen: Object.freeze({ ...definition.screen }),
  });

  registry.push(interaction);
  ids.add(interaction.id);
  numbers.add(interaction.number);
  return interaction;
}

export function getInteractions() {
  return Object.freeze([...registry]);
}
