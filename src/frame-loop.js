export class FrameLoop {
  constructor(update, onError) {
    this.update = update;
    this.onError = onError;
    this.abort = new AbortController();
    document.addEventListener('visibilitychange', () => {
      this.previous = null;
      if (document.hidden) cancelAnimationFrame(this.frame);
      else if (this.running) this.frame = requestAnimationFrame(this.tick);
    }, { signal: this.abort.signal });
  }

  tick = now => {
    if (!this.running || document.hidden) return;
    const dt = this.previous == null ? 0 : Math.min(60, now - this.previous);
    this.previous = now;
    try { this.update(dt, now); }
    catch (error) { this.stop(); this.onError(error); return; }
    this.frame = requestAnimationFrame(this.tick);
  };

  start() {
    if (this.running) return;
    this.running = true;
    this.previous = null;
    if (!document.hidden) this.frame = requestAnimationFrame(this.tick);
  }
  stop() { this.running = false; cancelAnimationFrame(this.frame); }
  destroy() { this.stop(); this.abort.abort(); }
}
