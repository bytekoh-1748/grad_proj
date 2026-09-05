const registry = [];
const ids = new Set();
const sides = new Set();

function requireText(value, field, id) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TypeError(`Track "${id || 'unknown'}" requires a non-empty ${field}.`);
  }
}

/**
 * 곡 하나 = 판 한 장. 모듈 하나가 겉면과 인터랙션을 함께 소유한다.
 * 앱 껍데기는 이 계약에만 기댄다 — 새 판을 넣어도 무대, 상자, 톤암,
 * 트랜스포트, CSS 는 손대지 않는다.
 */
export function registerTrack(definition) {
  if (!definition || typeof definition !== 'object') {
    throw new TypeError('registerTrack expects a track definition.');
  }

  const { id } = definition;
  requireText(id, 'id', id);
  ['side', 'title', 'artist', 'genre', 'duration', 'hint'].forEach((field) => {
    requireText(definition[field], field, id);
  });

  if (!Array.isArray(definition.wedges) || !definition.wedges.length) {
    throw new TypeError(`Track "${id}" requires at least one vinyl wedge.`);
  }
  definition.wedges.forEach((slice) => {
    if (!Array.isArray(slice) || slice.length !== 3) {
      throw new TypeError(`Track "${id}" wedges must be [fromDeg, toDeg, color].`);
    }
  });

  requireText(definition.label && definition.label.art, 'label.art', id);
  requireText(definition.label && definition.label.paper, 'label.paper', id);
  requireText(definition.scene && definition.scene.ground, 'scene.ground', id);
  requireText(definition.scene && definition.scene.ink, 'scene.ink', id);

  if (!Number.isFinite(definition.bpm) || definition.bpm <= 0) {
    throw new TypeError(`Track "${id}" requires a positive bpm.`);
  }
  if (typeof definition.render !== 'function') {
    throw new TypeError(`Track "${id}" requires a render() function.`);
  }
  if (ids.has(id)) throw new Error(`Duplicate track id: ${id}`);
  if (sides.has(definition.side)) throw new Error(`Duplicate track side: ${definition.side}`);

  const track = Object.freeze({
    ...definition,
    wedges: Object.freeze(definition.wedges.map((slice) => Object.freeze([...slice]))),
    label: Object.freeze({ ...definition.label }),
    scene: Object.freeze({ ...definition.scene }),
  });

  registry.push(track);
  ids.add(track.id);
  sides.add(track.side);
  return track;
}

export function getTracks() {
  return Object.freeze([...registry]);
}
