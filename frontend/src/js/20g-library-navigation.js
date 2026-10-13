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

/* ---------- 资料库授权录音：播放与停止 ----------
   录音清单来自 20h-library-audio.js（LIBRARY_AUDIO），
   有录音的曲式播录音，没有的回落 20f 的实时合成试听。 */
let libraryRecordingPanel = null;
function stopLibraryRecording(){
  if(!libraryRecordingPanel) return;
  const audio = libraryRecordingPanel.querySelector('audio');
  if(audio){
    audio.pause();
    audio.removeAttribute('src');
    try { audio.load(); } catch(e){ /* 元素已脱离文档时忽略 */ }
  }
  libraryRecordingPanel.remove();
  libraryRecordingPanel = null;
}
function libraryRecordingOf(card){
  if(!card || typeof LIBRARY_AUDIO !== 'object' || !LIBRARY_AUDIO) return null;
  const key = card.dataset.audio;
  return key && LIBRARY_AUDIO[key] ? LIBRARY_AUDIO[key] : null;
}
function playLibraryRecording(entry, host, afterEl){
  if(!entry || !host) return;
  stopLibraryPreview();
  stopLibraryRecording();
  const panel = document.createElement('div');
  panel.className = 'library-audio';
  const audio = document.createElement('audio');
  audio.controls = true;
  audio.preload = 'metadata';
  audio.src = entry.src;
  const credit = document.createElement('p');
  credit.className = 'library-audio-credit';
  credit.textContent = '授权录音 · ' +
    [entry.description, entry.artist, entry.license].filter(Boolean).join(' · ') + ' · ';
  if(entry.source_url){
    const link = document.createElement('a');
    link.href = entry.source_url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Wikimedia Commons 来源';
    credit.appendChild(link);
  }
  panel.append(audio, credit);
  if(afterEl && afterEl.parentNode === host) afterEl.after(panel);
  else host.appendChild(panel);
  libraryRecordingPanel = panel;
  const started = audio.play();
  if(started && started.catch) started.catch(() => {
    setNotice('浏览器拦截了自动播放，请点播放器上的播放键试听。');
  });
  setNotice('正在试听授权录音：' + (entry.description || entry.title) + '（' +
    [entry.artist, entry.license].filter(Boolean).join(' · ') + '）。');
}

/* ---------- 西方音乐形式资料库：即时搜索 ---------- */
(() => {
  const input = document.getElementById('westernSearch');
  const grid = document.getElementById('westernLibrary');
  const count = document.getElementById('westernCount');
  const empty = document.getElementById('westernEmpty');
  if (!input || !grid || !count || !empty) return;

  const cards = [...grid.querySelectorAll('.western-card')];
  cards.forEach((card, index) => {
    const actions = card.querySelector('.western-actions');
    const preview = document.createElement('button');
    preview.className = 'chip western-preview';
    preview.type = 'button';
    preview.textContent = libraryRecordingOf(card) ? '试听授权录音' : '试听曲式示例';
    preview.dataset.westernPreview = String(index);
    actions.prepend(preview);
  });
  const playWesternDemo = card => {
    stopLibraryPreview();
    stopLibraryRecording();
    const title = card.querySelector('h3').textContent.toLocaleLowerCase();
    const isBlues = title.includes('blues') || title.includes('布鲁斯');
    const scale = isBlues ? [0,3,5,6,7,10,12] : [0,2,4,7,9,12];
    const root = 60;
    const phraseA = [0,2,4,2,1,3,2,0];
    const phraseB = [4,3,5,4,2,1,4,0];
    const phraseC = [0,3,5,4,2,4,1,0];
    let form;
    if (title.includes('rondo') || title.includes('回旋')) form = ['A','B','A','C','A'];
    else if (title.includes('fugue') || title.includes('赋格')) form = ['A','A5','B','A'];
    else if (title.includes('canon') || title.includes('卡农')) form = ['A','A5','A'];
    else if (title.includes('variation') || title.includes('变奏') || title.includes('passacaglia') || title.includes('chaconne')) form = ['A','Avar','Avar2','A'];
    else if (title.includes('sonata') || title.includes('奏鸣')) form = ['A','B','A'];
    else if (title.includes('sonnet') || title.includes('十四行')) form = ['A','B'];
    else if (title.includes('chant') || title.includes('圣咏')) form = ['A','A'];
    else if (title.includes('binary') || title.includes('二部')) form = ['A','B'];
    else if (title.includes('ternary') || title.includes('三部') || title.includes('minuet') || title.includes('小步舞') || title.includes('scherzo') || title.includes('谐谑')) form = ['A','B','A'];
    else if (title.includes('blues') || title.includes('布鲁斯')) form = ['12bar'];
    else if (title.includes('aaba')) form = ['A','A','B','A'];
    else if (title.includes('strophic') || title.includes('分节')) form = ['A','A','A'];
    else if (title.includes('through-composed') || title.includes('通谱')) form = ['A','B','C'];
    else if (title.includes('verse') || title.includes('主歌')) form = ['A','B','A','B','C','B'];
    else if (title.includes('aria') || title.includes('咏叹')) form = ['A','B','A'];
    else if (title.includes('ritornello') || title.includes('里托内罗')) form = ['A','B','A','C','A'];
    else if (title.includes('suite') || title.includes('组曲')) form = ['A','B','C','D'];
    else form = ['A','B','A'];

    const events = [];
    let start = 0;
    form.forEach((part, phraseIndex) => {
      if (part === '12bar') {
        const bars = [0,0,0,0,3,3,0,0,4,3,0,4];
        bars.forEach((degree, barIndex) => {
          const barStart = barIndex * 4;
          [0,2,4,2].forEach((step, noteIndex) => events.push({
            pitch:root + scale[(step + degree) % scale.length],
            start:barStart + noteIndex,
            dur:.82,
            voice:'melody'
          }));
          events.push({pitch:root + scale[degree % scale.length] - 12, start:barStart, dur:3.5, voice:'bass'});
          [0,2,4].forEach(chordDegree => events.push({
            pitch:root + scale[(chordDegree + degree) % scale.length],
            start:barStart, dur:3.5, voice:'chord'
          }));
        });
        start = bars.length * 4;
        return;
      }
      let motif = part === 'B' || part === 'C' || part === 'D' ? phraseB : phraseA;
      if (part === 'C') motif = phraseC;
      const transpose = part === 'A5' ? 7 : 0;
      if (part === 'Avar') motif = [0,3,4,5,2,4,1,0];
      if (part === 'Avar2') motif = [0,2,5,4,3,2,1,0];
      motif.forEach((degree, noteIndex) => {
        events.push({
          pitch:root + scale[degree % scale.length] + transpose,
          start:start + noteIndex,
          dur:noteIndex === motif.length - 1 ? 1.5 : .82,
          voice:'melody'
        });
      });
      const bassDegree = phraseIndex % 2 === 0 ? 0 : 3;
      events.push({pitch:root + scale[bassDegree % scale.length] - 12, start, dur:6.5, voice:'bass'});
      [0,2,4].forEach(degree => events.push({
        pitch:root + scale[(degree + bassDegree) % scale.length],
        start, dur:5.5, voice:'chord'
      }));
      start += 10;
    });
    playLibraryNotes(events, isBlues ? 108 : 96, card.querySelector('h3').textContent.trim());
  };
  let showAll = false;
  const toggle = document.getElementById('westernToggle');
  const filter = () => {
    const query = input.value.trim().toLocaleLowerCase();
    let visible = 0;
    let matching = 0;
    cards.forEach((card, index) => {
      const searchable = `${card.dataset.search || ''} ${card.dataset.detail || ''} ${card.textContent}`.toLocaleLowerCase();
      const matches = !query || searchable.includes(query);
      if (matches) matching += 1;
      const shown = matches && (Boolean(query) || showAll || index < 4);
      card.hidden = !shown;
      if (shown) visible += 1;
    });
    count.textContent = query ? `显示 ${visible} 项 / 匹配 ${matching} 项` : `显示 ${visible} / ${cards.length} 项`;
    empty.hidden = matching !== 0;
    if (!matching) renderLibraryNoResults(empty, input.value.trim(), '西方音乐形式');
    toggle.textContent = showAll ? '收起至前四个西方形式' : `全部展开西方形式（${cards.length}）`;
    toggle.setAttribute('aria-expanded', String(showAll));
  };

  input.addEventListener('input', filter);
  toggle.addEventListener('click', () => {
    showAll = !showAll;
    filter();
  });
  grid.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const previewButton = target.closest('.western-preview');
    if (previewButton) {
      const card = previewButton.closest('.western-card');
      if (card) {
        const entry = libraryRecordingOf(card);
        if (entry) playLibraryRecording(entry, card);
        else playWesternDemo(card);
      }
      return;
    }
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
    const dialogPreview = dialog.querySelector('.western-preview');
    dialogPreview.dataset.westernPreview = String(cards.indexOf(card));
    dialogPreview.textContent = libraryRecordingOf(card) ? '试听授权录音' : '试听曲式示例';
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
  westernDialog.addEventListener('close', stopLibraryRecording);
}

const cpDetailDialog = document.getElementById('cpDetailDialog');
if (cpDetailDialog instanceof HTMLDialogElement) {
  cpDetailDialog.querySelector('.cp-dialog-close').addEventListener('click', () => cpDetailDialog.close());
  cpDetailDialog.addEventListener('click', event => {
    if (event.target === cpDetailDialog) cpDetailDialog.close();
  });
}

const gongDialog = document.getElementById('gongDetailDialog');
if (gongDialog instanceof HTMLDialogElement) {
  gongDialog.querySelector('.western-dialog-close').addEventListener('click', () => gongDialog.close());
  gongDialog.addEventListener('click', event => {
    if (event.target === gongDialog) gongDialog.close();
  });
}

document.addEventListener('click', event => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const cpPreview = target.closest('[data-cipai-preview]');
  if (cpPreview) {
    stopLibraryRecording();
    previewCiPai(cpPreview.dataset.cipaiPreview);
    return;
  }
  const gongDetail = target.closest('[data-gong-detail]');
  if (gongDetail) {
    showGongDetail(gongDetail.dataset.gongDetail);
    return;
  }
  const gongPreview = target.closest('[data-gong-preview]');
  if (gongPreview) {
    stopLibraryRecording();
    previewGong(gongPreview.dataset.gongPreview);
  }
  const westernPreview = target.closest('.western-dialog .western-preview');
  if (westernPreview) {
    const index = Number(westernPreview.dataset.westernPreview);
    const card = document.querySelectorAll('#westernLibrary .western-card')[index];
    if (!card) return;
    const entry = libraryRecordingOf(card);
    const dialog = westernPreview.closest('.western-dialog');
    if (entry && dialog) {
      playLibraryRecording(entry, dialog, dialog.querySelector('.western-dialog-structure'));
    } else {
      card.querySelector('.western-preview').click();
    }
  }
});
