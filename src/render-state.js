// Snap at a sub-pixel tolerance so settled scenes have a finite end.
export function settle(value, target, dt, duration, reduced = false, epsilon = .0001) {
  const next = reduced ? target : value + (target - value) * (1 - Math.exp(-dt / duration));
  return Math.abs(target - next) < epsilon ? target : next;
}

// Geometry and spinning artwork have separate invalidation paths.
export class RenderState {
  changed(values) {
    const changed = !this.previous || values.some((value, i) => value !== this.previous[i]);
    this.previous = values;
    return changed;
  }
}
