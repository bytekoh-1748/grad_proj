export class MusicPlayer {
  constructor({ tracks, room, reduced, say }) {
    Object.assign(this, { tracks, room, reduced, say });
    this.selected = 0;
    this.state = 'loading';
    this.generation = 0;
    this.elapsed = this.visualTime = this.lastArt = 0;
    this.autoTour = false;
    this.playButton = room.querySelector('[data-act=play]');
    this.stopButton = room.querySelector('[data-act=stop]');
  }

  attach(world) { this.world = world; }
  get track() { return this.tracks[this.selected]; }
  get available() { return this.world?.activity === 'music' && this.state !== 'loading'; }

  sync() {
    this.room.dataset.state = this.state;
    this.room.dataset.track = this.track.id;
    this.playButton.disabled = ['loading', 'cueing', 'docking', 'returning'].includes(this.state);
    this.playButton.setAttribute('aria-pressed', String(this.state === 'playing'));
    this.playButton.setAttribute('aria-label', this.state === 'playing' ? '일시정지' : this.state === 'paused' ? '이어서 재생' : '재생');
    this.stopButton.disabled = ['loading', 'cued', 'returning'].includes(this.state);
  }

  updateTitle() {
    const words = this.track.title.toUpperCase().split(' ');
    let split = 1, balance = Infinity;
    for (let i = 1; i < words.length; i++) {
      const delta = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
      if (delta < balance) { balance = delta; split = i; }
    }
    const title = document.getElementById('track-title');
    title.replaceChildren(document.createTextNode(words.slice(0, split).join(' ')));
    if (words.length > 1) title.append(document.createElement('br'), document.createTextNode(words.slice(split).join(' ')));
    document.getElementById('track-artist').textContent = this.track.artist;
    document.getElementById('track-meta').replaceChildren(document.createTextNode(this.track.duration), document.createElement('br'), document.createTextNode(`${this.track.bpm} BPM`));
    this.titleAnimation?.cancel();
    if (!this.reduced) this.titleAnimation = document.getElementById('title-copy').animate(
      [{ opacity: .15, translate: '-12px 7px' }, { opacity: 1, translate: '0 0' }],
      { duration: 420, easing: 'ease-out' },
    );
    this.artDirty = true;
    this.sync();
  }

  reset() {
    ++this.generation;
    this.autoTour = false;
    this.elapsed = this.visualTime = this.armDelay = 0;
    this.state = 'cued';
    this.world.playing = false;
    this.world.artTarget = 0;
    this.world.setArm(false);
    this.world.select(this.selected);
    this.artDirty = true;
    this.sync();
  }

  async choose(index) {
    if (!this.available || !this.tracks[index] || (index === this.selected && this.state === 'cued')) return;
    const token = ++this.generation;
    this.selected = index;
    this.state = 'cueing';
    this.elapsed = this.visualTime = this.armDelay = 0;
    this.autoTour = this.world.playing = false;
    this.world.artTarget = 0;
    this.world.setArm(false);
    this.world.setView('listen');
    this.updateTitle();
    const done = await this.world.select(index);
    if (!done || token !== this.generation) return;
    this.state = 'cued';
    this.sync();
    this.say(`${this.track.title} 선택`);
  }

  next(delta) { return this.choose((this.selected + delta + this.tracks.length) % this.tracks.length); }

  async play() {
    if (!this.available) return;
    if (this.state === 'playing' || this.state === 'paused') {
      const playing = this.state === 'paused';
      this.state = playing ? 'playing' : 'paused';
      this.world.playing = playing;
      this.world.armLiftTarget = playing ? 0 : 24;
      this.autoTour = false;
      this.sync();
      this.say(playing ? '이어서 재생' : '일시정지');
      return;
    }
    if (this.state !== 'cued') return;
    const token = ++this.generation;
    this.state = 'docking';
    this.sync();
    this.world.setView('deck');
    const done = await this.world.dock();
    if (!done || token !== this.generation) return;
    this.world.setArm(true);
    // Advance with visible animation time; no detached timeout can restart playback.
    this.armDelay = this.reduced ? 0 : 750;
    if (this.reduced) this.beginPlayback();
  }

  beginPlayback() {
    this.state = 'playing';
    this.world.playing = true;
    this.elapsed = this.visualTime = 0;
    this.world.artTarget = 1;
    this.artDirty = true;
    this.autoTour = !this.reduced;
    this.sync();
    this.say(`${this.track.title} 재생 장면 시작`);
  }

  async stop() {
    if (!this.available || ['cued', 'returning'].includes(this.state)) return;
    const token = ++this.generation;
    this.state = 'returning';
    this.armDelay = 0;
    this.autoTour = this.world.playing = false;
    this.world.artTarget = 0;
    this.world.setArm(false);
    this.world.setView('listen');
    this.sync();
    const done = await this.world.cue();
    if (!done || token !== this.generation) return;
    this.elapsed = this.visualTime = 0;
    this.state = 'cued';
    this.sync();
    this.say('재생을 멈췄어요.');
  }

  changeView(view) {
    if (!this.available) return;
    this.autoTour = false;
    this.world.setView(view, true);
    this.world.artTarget = view === 'wall' || ['playing', 'paused'].includes(this.state) ? 1 : 0;
    this.artDirty = true;
  }

  step(dt) {
    if (this.state === 'docking' && this.armDelay > 0) {
      this.armDelay = Math.max(0, this.armDelay - dt);
      if (!this.armDelay) this.beginPlayback();
    }
    if (this.state === 'playing') {
      this.elapsed += dt;
      this.visualTime += dt;
      this.world.setArm(true, this.elapsed / this.track.durationMs);
      if (this.autoTour && this.elapsed > 4300) { this.world.setView('wall'); this.autoTour = false; }
      if (this.elapsed >= this.track.durationMs) this.stop();
    } else if (this.world.view === 'wall' && this.state !== 'paused' && !this.reduced) this.visualTime += dt;
  }

  draw(now) {
    // Keep the previous artwork intact while it fades out; paint the next track
    // before its plane becomes visible again.
    if (!this.world.artTarget) return;
    const pointer = this.world.pointer;
    const signature = [this.track.id, this.reduced ? 0 : this.visualTime, pointer.x, pointer.y, pointer.dx, pointer.dy, pointer.down].join(':');
    if (!this.artDirty && (signature === this.artSignature || now - this.lastArt < 1000 / 30)) return;
    this.world.drawTrack(this.track, this.reduced ? 0 : this.visualTime, Math.min(60, now - (this.lastArt || now)));
    this.lastArt = now;
    this.artSignature = signature;
    this.artDirty = false;
  }

  destroy() { ++this.generation; this.armDelay = 0; this.titleAnimation?.cancel(); }
}
