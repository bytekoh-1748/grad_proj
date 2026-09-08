export function catalog(entries, fields) {
  const ids = new Set();
  return Object.freeze(entries.map(entry => {
    for (const key of ['id', ...fields]) {
      if (typeof entry[key] !== 'string' || !entry[key].trim()) throw new TypeError(`Content requires ${key}.`);
    }
    if (ids.has(entry.id)) throw new Error(`Duplicate content id: ${entry.id}`);
    ids.add(entry.id);
    return Object.freeze({ ...entry });
  }));
}

export function pageItems(items, page, size = 3) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const index = Math.max(0, Math.min(pages - 1, page));
  return { index, pages, items: items.slice(index * size, (index + 1) * size) };
}
