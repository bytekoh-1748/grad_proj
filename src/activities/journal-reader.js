import { journal } from '../content/journal.js';
import { catalog, pageItems } from '../content/catalog.js';

export class JournalReader {
  constructor(root, content = journal) {
    this.content = content;
    this.articles = catalog(content.articles, ['title', 'tag', 'intro', 'text']);
    this.root = root.querySelector('#newspaper');
    this.dialog = document.getElementById('article-reader');
    this.abort = new AbortController();
    const options = { signal: this.abort.signal };
    this.root.querySelector('h2').textContent = content.title;
    const labels = this.root.querySelectorAll('.paper-top span');
    labels[0].textContent = content.kicker;
    labels[1].textContent = content.edition;
    this.root.querySelector('.paper-lead h3').textContent = content.leadTitle;
    this.root.querySelector('.paper-lead p').textContent = content.leadText;
    this.root.addEventListener('click', event => {
      const button = event.target.closest('[data-article]');
      if (button) this.read(button.dataset.article);
    }, options);
    this.root.querySelector('#paper-prev').addEventListener('click', () => this.render(this.page - 1), options);
    this.root.querySelector('#paper-next').addEventListener('click', () => this.render(this.page + 1), options);
    document.getElementById('close-article').addEventListener('click', () => this.dialog.close(), options);
    this.render(0);
  }

  render(page) {
    const result = pageItems(this.articles, page);
    this.page = result.index;
    const nodes = result.items.map(article => {
      const button = document.createElement('button');
      button.dataset.article = article.id;
      for (const [tag, value] of [['span', article.tag], ['h4', article.title], ['p', article.intro], ['b', '읽기 ↗']]) {
        const node = document.createElement(tag);
        node.textContent = value;
        button.append(node);
      }
      return button;
    });
    this.root.querySelector('.paper-articles').replaceChildren(...nodes);
    this.root.querySelector('#paper-page').textContent = this.articles.length ? `${this.page + 1} / ${result.pages}` : '아직 기사가 없어요.';
    this.root.querySelector('#paper-prev').disabled = this.page === 0;
    this.root.querySelector('#paper-next').disabled = this.page === result.pages - 1;
  }

  read(id) {
    const article = this.articles.find(item => item.id === id);
    if (!article) return;
    this.dialog.querySelector('h2').textContent = article.title;
    this.dialog.querySelector('.article-tag').textContent = `${article.tag} · ${this.content.edition}`;
    this.dialog.querySelector('.article-body').replaceChildren(...article.text.split(/\n\s*\n/).map(text => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      return paragraph;
    }));
    if (!this.dialog.open) this.dialog.showModal();
  }

  destroy() { this.abort.abort(); this.dialog.close(); }
}
