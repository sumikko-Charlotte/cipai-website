/* >>> file: src/js/20g-library-navigation.js */
/* ---------- 页面导航：锚点跳转与滚动高亮 ---------- */
(() => {
  const nav = document.getElementById('stepBar');
  if (!nav) return;

  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const targets = links
    .map(link => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  const activate = targetId => {
    links.forEach(link => {
      const active = link.hash === `#${targetId}`;
      link.classList.toggle('on', active);
      if (active) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    });
  };

  links.forEach(link => {
    link.addEventListener('click', () => activate(link.hash.slice(1)));
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const current = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (current) activate(current.target.id);
    }, { rootMargin: '-18% 0px -68% 0px', threshold: 0 });
    targets.forEach(target => observer.observe(target));
  }
})();

/* ---------- 西方音乐形式资料库：即时搜索 ---------- */
(() => {
  const input = document.getElementById('westernSearch');
  const grid = document.getElementById('westernLibrary');
  const count = document.getElementById('westernCount');
  const empty = document.getElementById('westernEmpty');
  if (!input || !grid || !count || !empty) return;

  const cards = [...grid.querySelectorAll('.western-card')];
  const filter = () => {
    const query = input.value.trim().toLocaleLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const searchable = `${card.dataset.search || ''} ${card.dataset.detail || ''} ${card.textContent}`.toLocaleLowerCase();
      const matches = !query || searchable.includes(query);
      card.hidden = !matches;
      if (matches) visible += 1;
    });
    count.textContent = query ? `显示 ${visible} / ${cards.length} 项` : `共 ${cards.length} 项`;
    empty.hidden = visible !== 0;
  };

  input.addEventListener('input', filter);
  grid.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('.western-details');
    if (!button) return;

    const card = button.closest('.western-card');
    const dialog = document.getElementById('westernDetailDialog');
    if (!card || !(dialog instanceof HTMLDialogElement)) return;
    const title = card.querySelector('h3');
    const englishTitle = title && title.querySelector('span');
    dialog.querySelector('#westernDetailTitle').textContent = title ? title.textContent.trim() : '';
    dialog.querySelector('.western-dialog-detail').textContent = card.dataset.detail || '';
    dialog.querySelector('.western-dialog-summary').textContent = card.querySelector('p').textContent;
    dialog.querySelector('.western-dialog-structure').textContent = card.querySelector('small').textContent;
    dialog.querySelector('.western-web-search').dataset.librarySearch =
      `${title ? title.childNodes[0].textContent.trim() : ''} ${englishTitle ? englishTitle.textContent : ''} 西方音乐形式`;
    dialog.showModal();
  });
  filter();
})();

/* ---------- 资料库：打开浏览器搜索 ---------- */
document.addEventListener('click', event => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const button = target.closest('[data-library-search]');
  if (!button) return;
  const query = button.dataset.librarySearch;
  if (query) window.open('https://www.google.com/search?q=' + encodeURIComponent(query), '_blank', 'noopener,noreferrer');
});

const westernDialog = document.getElementById('westernDetailDialog');
if (westernDialog instanceof HTMLDialogElement) {
  westernDialog.querySelector('.western-dialog-close').addEventListener('click', () => westernDialog.close());
  westernDialog.addEventListener('click', event => {
    if (event.target === westernDialog) westernDialog.close();
  });
}

const cpDetailDialog = document.getElementById('cpDetailDialog');
if (cpDetailDialog instanceof HTMLDialogElement) {
  cpDetailDialog.querySelector('.cp-dialog-close').addEventListener('click', () => cpDetailDialog.close());
  cpDetailDialog.addEventListener('click', event => {
    if (event.target === cpDetailDialog) cpDetailDialog.close();
  });
}
