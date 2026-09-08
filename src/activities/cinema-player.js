import { films } from '../content/films.js';
import { catalog } from '../content/catalog.js';

export class CinemaPlayer {
  constructor(root, entries = films) {
    this.entries = [...catalog(entries, ['title'])];
    for (const film of this.entries) {
      if (film.kind !== 'demo' && (typeof film.src !== 'string' || !film.src.trim())) throw new TypeError(`Film ${film.id} needs src.`);
    }
    this.video = root.querySelector('#local-film');
    this.demo = root.querySelector('#film-demo');
    this.playButton = root.querySelector('#film-play');
    this.select = root.querySelector('#film-select');
    this.name = root.querySelector('#film-name');
    this.status = root.querySelector('#film-status');
    this.file = root.querySelector('#film-file');
    this.abort = new AbortController();
    this.generation = 0;
    const options = { signal: this.abort.signal };
    this.playButton.addEventListener('click', () => this.toggle(), options);
    root.querySelector('#film-open').addEventListener('click', () => this.file.click(), options);
    this.file.addEventListener('change', () => { this.addFiles([...this.file.files]); this.file.value = ''; }, options);
    this.select.addEventListener('change', () => this.choose(this.select.value), options);
    this.video.addEventListener('play', () => this.setPlaying(true), options);
    for (const event of ['pause', 'ended']) this.video.addEventListener(event, () => this.setPlaying(false), options);
    this.video.addEventListener('error', () => {
      if (!this.video.error) return;
      this.setPlaying(false);
      this.status.textContent = '이 영상을 불러오거나 재생할 수 없어요. 다른 영상을 골라 주세요.';
    }, options);
    this.renderList();
    this.choose(this.entries[0]?.id);
  }

  renderList() {
    this.select.replaceChildren(...this.entries.map(film => new Option(film.title, film.id)));
    this.select.disabled = !this.entries.length;
  }

  choose(id) {
    this.pause();
    if (this.objectURL) URL.revokeObjectURL(this.objectURL);
    this.objectURL = null;
    this.current = this.entries.find(film => film.id === id);
    this.video.removeAttribute('src');
    this.video.removeAttribute('poster');
    const demo = this.current?.kind === 'demo';
    this.demo.hidden = !demo;
    this.video.hidden = !this.current || demo;
    this.playButton.disabled = !this.current;
    this.name.textContent = this.current?.title ?? '영상을 추가해 주세요.';
    this.status.textContent = '';
    if (this.current) {
      this.select.value = id;
      if (!demo) {
        this.video.preload = 'metadata';
        if (this.current.file) this.objectURL = URL.createObjectURL(this.current.file);
        this.video.src = this.objectURL ?? this.current.src;
        if (this.current.poster) this.video.poster = this.current.poster;
        if (this.current.file) this.status.textContent = '선택한 영상은 이 기기에서만 재생됩니다.';
      }
    }
    this.video.load();
  }

  addFiles(files) {
    const added = files.filter(file => file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv)$/i.test(file.name))
      .map(file => ({ id: `local-${crypto.randomUUID()}`, title: file.name, file }));
    if (!added.length) { this.status.textContent = '영상 파일을 골라 주세요.'; return; }
    this.entries.push(...added);
    this.renderList();
    this.choose(added[0].id);
  }

  setPlaying(playing) {
    this.playing = playing;
    this.demo.dataset.playing = String(playing);
    this.playButton.setAttribute('aria-pressed', String(playing));
    this.playButton.textContent = playing ? 'Ⅱ 일시정지' : '▶ 필름 재생';
  }

  async toggle() {
    if (!this.current) return;
    if (this.current.kind === 'demo') { this.setPlaying(!this.playing); return; }
    if (!this.video.paused) { this.pause(); return; }
    const token = ++this.generation;
    try { await this.video.play(); }
    catch { if (token === this.generation) this.status.textContent = '영상을 재생할 수 없어요. 형식을 확인하거나 다시 재생해 주세요.'; }
  }

  pause() { ++this.generation; this.video.pause(); this.setPlaying(false); }
  destroy() {
    this.pause();
    this.abort.abort();
    this.video.removeAttribute('src');
    this.video.load();
    if (this.objectURL) URL.revokeObjectURL(this.objectURL);
    this.entries = [];
  }
}
