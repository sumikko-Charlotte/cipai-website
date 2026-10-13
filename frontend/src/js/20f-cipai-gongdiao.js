/* >>> file: src/js/20f-cipai-gongdiao.js */
/* ============================================================
   20. 文字配乐 · 六、词牌库与宫调库
   ============================================================ */
let ciPaiShowAll = false;
let gongShowAll = false;
function renderLibraryNoResults(container, query, category){
  container.replaceChildren();
  const message = document.createElement('span');
  message.textContent = '没有找到相关' + category + (query ? '：“' + query + '”' : '');
  container.appendChild(message);
  if(query){
    const search = document.createElement('button');
    search.className = 'chip library-no-results-search';
    search.type = 'button';
    search.textContent = '在浏览器中继续搜索';
    search.dataset.librarySearch = query + ' ' + category;
    container.appendChild(search);
  }
}
function renderCiPaiLib(q){
  const box = document.getElementById('cpList');
  const s = (q || '').trim();
  const nq = parseInt(s, 10);
  const hit = CI_PAI.filter(cp => !s ||
    cp.name.indexOf(s) >= 0 || (cp.alt || []).some(x => x.indexOf(s) >= 0) ||
    (!isNaN(nq) && cp.n === nq));
  box.innerHTML = '';
  if(!hit.length){
    renderLibraryNoResults(box, s, '词牌');
    const toggle = document.getElementById('cpToggle');
    toggle.textContent = ciPaiShowAll ? '收起至前四个词牌' : '全部展开词牌（' + CI_PAI.length + '）';
    toggle.setAttribute('aria-expanded', String(ciPaiShowAll));
    return;
  }
  hit.forEach((cp, index) => {
    const gd = GONG_MAP[cp.gong];
    const b = document.createElement('button');
    b.className = 'cpitem';
    b.innerHTML = '<span class="cnm">' + cp.name + '</span>' +
      '<span class="cmeta">' + cp.n + ' 字 · ' + cp.lc + ' 句 · ' + (cp.kind === 'shi' ? '近体诗' : '词') + '</span>' +
      '<span class="cg">' + gd.name + ' · ' + gd.mood + '</span>';
    b.hidden = !s && !ciPaiShowAll && index >= 4;
    b.onclick = () => showCiPai(cp.name);
    box.appendChild(b);
  });
  const toggle = document.getElementById('cpToggle');
  toggle.textContent = ciPaiShowAll ? '收起至前四个词牌' : '全部展开词牌（' + hit.length + '）';
  toggle.setAttribute('aria-expanded', String(ciPaiShowAll));
}
let libraryPreviewMaster = null;
let libraryPreviewTimer = 0;
function stopLibraryPreview(){
  if(libraryPreviewTimer) clearTimeout(libraryPreviewTimer);
  libraryPreviewTimer = 0;
  if(libraryPreviewMaster && state.audioCtx && state.audioCtx.state !== 'closed'){
    const master = libraryPreviewMaster;
    libraryPreviewMaster = null;
    master.gain.cancelScheduledValues(state.audioCtx.currentTime);
    master.gain.setTargetAtTime(0, state.audioCtx.currentTime, .025);
    setTimeout(() => master.disconnect(), 150);
  }
}
function playLibraryNotes(events, bpm, label){
  if(!events.length) return;
  stopLibraryPreview();
  const ctx = ensureCtx();
  const master = ctx.createGain();
  master.gain.value = .45;
  master.connect(ctx.destination);
  libraryPreviewMaster = master;
  const stepSec = 30 / bpm;
  const t0 = ctx.currentTime + .04;
  let endStep = 0;
  events.forEach(event => {
    playEvent(ctx, master, event, t0, stepSec);
    endStep = Math.max(endStep, event.start + event.dur);
  });
  libraryPreviewTimer = setTimeout(() => {
    if(libraryPreviewMaster === master){
      master.disconnect();
      libraryPreviewMaster = null;
      libraryPreviewTimer = 0;
    }
  }, (endStep * stepSec + .8) * 1000);
  setNotice('正在试听「' + label + '」的示例旋律。');
}
function previewCiPai(name){
  const cp = CI_PAI.find(item => item.name === name);
  if(!cp) return;
  const gd = GONG_MAP[cp.gong];
  const scale = SCALES[gd.scale].iv;
  const root = 60 - MODES5[gd.mode].deg;
  const contour = [0,2,3,2,1,2,4,3,2,1,0,2,4,5,4,2];
  const lines = cp.lines || [5,7,5,7];
  const events = [];
  let start = 0;
  lines.slice(0, 4).forEach((length, lineIndex) => {
    const count = Math.min(length, 6);
    for(let i = 0; i < count; i++){
      const degree = contour[(lineIndex * 3 + i) % contour.length];
      const pitch = root + scale[degree % scale.length] + (degree >= scale.length ? 12 : 0);
      events.push({pitch, start, dur:i === count - 1 ? 1.4 : .82, voice:'melody'});
      start += i % 3 === 2 ? 1.5 : 1;
    }
    events[events.length - 1].dur = 1.55;
    start += 2;
  });
  playLibraryNotes(events, gd.bpm, cp.name + ' · ' + gd.name);
}
function showCiPai(name){
  const cp = CI_PAI.find(c => c.name === name);
  if(!cp) return;
  const gd = GONG_MAP[cp.gong];
  const d = document.getElementById('cpDetail');
  const skel = cp.lines
    ? cp.lines.map((n, i) => (i + 1 < 10 ? ' ' : '') + (i + 1) + ' │ ' + '○'.repeat(n) + '  ' + n + ' 字').join('\n')
    : '各体句式互异，识别时按字数与句数比对';
  d.innerHTML =
    '<h4>' + cp.name + ' <span class="tag">' + cp.n + ' 字</span><span class="tag">' + cp.lc + ' 句</span>' +
    '<span class="tag">' + (cp.kind === 'shi' ? '近体诗' : '词') + '</span>' +
    '<span class="tag">匹配权重 字数40 · 句数20 · 句式40</span></h4>' +
    '<p><b>别名：</b>' + (cp.alt || []).join(' · ') + '</p>' +
    '<p><b>句式（正体）：</b>' + (cp.lines ? cp.lines.join(' / ') : '—') + '</p>' +
    '<p><b>常见宫调：</b>' + gd.name + '（' + gd.mood + '，见《唱论》）→ ' + MODES5[gd.mode].name + ' · ' + SCALES[gd.scale].name + ' · 建议 ' + STYLES[gd.style].name + '</p>' +
    '<p><b>调性说明：</b>' + gd.note + '</p>' +
    '<p><b>代表句：</b>' + cp.sample + '</p>' +
    '<div class="pl">格律骨架\n' + skel + '</div>' +
    '<div class="cand">' +
      '<button class="chip" onclick="previewGong(\'' + cp.gong + '\')">试听 ' + gd.name + ' 音阶</button>' +
      '<button class="chip" onclick="previewGong(\'' + cp.gong + '\', 1)">试听 ' + MODES5[gd.mode].name + ' 终止式</button>' +
    '</div>';
  const searchButton = document.createElement('button');
  searchButton.className = 'chip';
  searchButton.type = 'button';
  searchButton.dataset.librarySearch = cp.name + ' ' + (cp.alt || []).join(' ') + ' 词牌 格律';
  searchButton.textContent = '在 Google 搜索此词牌';
  d.querySelector('.cand').appendChild(searchButton);
  const previewButton = document.createElement('button');
  previewButton.className = 'chip cipai-preview';
  previewButton.type = 'button';
  previewButton.dataset.cipaiPreview = cp.name;
  previewButton.textContent = '试听词牌旋律';
  d.querySelector('.cand').prepend(previewButton);
  d.classList.add('on');
  document.getElementById('cpDetailDialog').showModal();
}
function applyCiPai(name){
  const cp = CI_PAI.find(c => c.name === name);
  if(!cp) return;
  textMode.cur = 'ci';
  textMode.force = name;
  document.querySelectorAll('#tab-text .presets .chip[data-tmode]').forEach(b => b.classList.toggle('on', b.dataset.tmode === 'ci'));
  const ta = document.getElementById('textIn');
  const cur = ta.value.trim();
  const isTemplate = !cur || /^[○\s，。、·\n]+$/.test(cur);
  if(isTemplate && cp.lines){
    ta.value = cp.lines.map(n => '○'.repeat(n)).join('，') + '。';
  }
  updateTextPlaceholder();
  setNotice('已把词牌格律切到「' + cp.name + '」（' + cp.n + ' 字 / ' + cp.lc + ' 句）。' +
    (isTemplate && cp.lines ? '文本框里是 ○ 格律模板，按位填字后点「分析文本」即可。' : '点「生成旋律并配乐」按此格律定调。'));
  try { analyzeCurrent(); } catch(e){ /* 忽略分析异常，仍可继续生成 */ }
}
function previewGong(key, cad){
  const gd = GONG_MAP[key];
  if(!gd) return;
  const rootMidi = 60 - MODES5[gd.mode].deg;
  const iv = SCALES[gd.scale].iv;
  const seq = cad ? [iv[0], iv[2 % iv.length], iv[4 % iv.length], iv[0]] : iv.concat([12]);
  const events = seq.map((s, i) => ({
    pitch:rootMidi + s, start:i * 2, dur:1.7, voice:'chord'
  }));
  events.push({pitch:rootMidi - 12 + MODES5[gd.mode].deg, start:seq.length * 2, dur:4, voice:'bass'});
  playLibraryNotes(events, 76, gd.name + (cad ? '终止式' : '音阶'));
  setNotice('正在试听「' + gd.name + '」：' + SCALES[gd.scale].name + (cad ? ' 的调式终止式' : ' 音阶上行') +
    '，落于 <b>' + MODES5[gd.mode].name + '</b>。情感色彩：' + gd.mood + '。');
}
function showGongDetail(key){
  const gd = GONG_MAP[key];
  if(!gd) return;
  const dialog = document.getElementById('gongDetailDialog');
  dialog.querySelector('#gongDetailTitle').textContent = gd.name;
  dialog.querySelector('.gong-dialog-mood').textContent = '情感色彩：' + gd.mood;
  dialog.querySelector('.gong-dialog-mode').textContent =
    '调式与音阶：' + MODES5[gd.mode].name + ' · ' + SCALES[gd.scale].name +
    '；建议风格：' + STYLES[gd.style].name + '；建议速度：' + gd.bpm + ' BPM。';
  dialog.querySelector('.gong-dialog-note').textContent = gd.note;
  dialog.querySelector('.gong-dialog-audio-source').textContent =
    '试听说明：以下音阶与终止式由浏览器实时合成，用于表现该宫调的音阶和情绪，不代表唯一的历史旋律。';
  dialog.querySelector('.gong-dialog-preview').dataset.gongPreview = key;
  const search = dialog.querySelector('.gong-dialog-search');
  search.dataset.librarySearch = gd.name + ' ' + gd.mood + ' 宫调 唱论';
  dialog.showModal();
}
function renderGongLib(q){
  const g = document.getElementById('gdGrid');
  const empty = document.getElementById('gongEmpty');
  const search = (q || '').trim().toLocaleLowerCase();
  const matches = GONG_DIAO.filter(gd => [
    gd.name, gd.mood, MODES5[gd.mode].name, SCALES[gd.scale].name, gd.note,
    STYLES[gd.style].name
  ].join(' ').toLocaleLowerCase().includes(search));
  g.innerHTML = '';
  matches.forEach((gd, index) => {
    const card = document.createElement('article');
    card.className = 'gdcard';
    card.hidden = !search && !gongShowAll && index >= 4;
    card.innerHTML = '<span class="g1">' + gd.name + '</span>' +
      '<span class="g2">' + gd.mood + '<br>' + MODES5[gd.mode].name + ' · ' + SCALES[gd.scale].name + '</span>' +
      '<div class="gactions"><button class="chip gong-details" type="button">详细说明</button>' +
      '<button class="chip gong-preview" type="button">试听音阶</button></div>';
    card.querySelector('.gong-details').dataset.gongDetail = gd.k;
    card.querySelector('.gong-preview').dataset.gongPreview = gd.k;
    g.appendChild(card);
  });
  empty.hidden = matches.length !== 0;
  if(!matches.length) renderLibraryNoResults(empty, search ? q.trim() : '', '宫调');
  const toggle = document.getElementById('gongToggle');
  toggle.textContent = gongShowAll ? '收起至前四个宫调' : '全部展开宫调（' + GONG_DIAO.length + '）';
  toggle.setAttribute('aria-expanded', String(gongShowAll));
  document.getElementById('gongCount').textContent = search
    ? '匹配 ' + matches.length + ' / ' + GONG_DIAO.length + ' 项'
    : '共 ' + GONG_DIAO.length + ' 项';
  document.getElementById('cpCount').textContent = CI_PAI.length + ' 个词牌 / 诗体 · ' + GONG_DIAO.length + ' 宫调 · ' + TONE_ALL + ' 个声调字';
}
function renderTextOptions(){
  const fill = (id, obj, def, autoName) => {
    const el = document.getElementById(id);
    el.innerHTML = '';
    if(autoName){ const o = document.createElement('option'); o.value = 'auto'; o.textContent = autoName; el.appendChild(o); }
    Object.keys(obj).forEach(k => {
      const o = document.createElement('option');
      o.value = k;
      o.textContent = obj[k].name;
      el.appendChild(o);
    });
    el.value = def;
  };
  fill('vRange', VOICE_RANGES, 'auto');
  fill('vMood', MOODS, 'auto');
  fill('vScale', SCALES, 'auto', '自动（依宫调）');
}
function updateTextPlaceholder(){
  const ta = document.getElementById('textIn');
  ta.placeholder = textMode.cur === 'ci'
    ? '粘贴一首诗词，例如：\n如梦令·昨夜雨疏风骤\n昨夜雨疏风骤，浓睡不消残酒。试问卷帘人，却道海棠依旧。知否，知否？应是绿肥红瘦。\n\n会自动匹配词牌、推定宫调、标注韵脚与平仄。'
    : textMode.cur === 'lyric'
    ? '粘贴歌词，一行一句，空行分段，例如：\n窗外的雨还在下\n旧照片里谁的短发\n\n如果风知道我在想她\n就替我轻轻说句谎话\n\n系统会切出主歌 / 副歌结构、押韵格式与重复句。'
    : 'Paste lyrics, one line per line, blank line between sections, e.g.:\nI walked alone along the shore\nAnd felt the winter wind again\n\nIf you could hear me call your name\nWould anything be left to say\n\nSyllables, rhyme scheme and meter are detected automatically.';
}

/* ---------- 文字配乐：事件绑定 ---------- */
document.querySelectorAll('#tab-text .chip[data-tmode]').forEach(b => {
  b.onclick = () => {
    textMode.cur = b.dataset.tmode;
    textMode.force = null;
    document.querySelectorAll('#tab-text .chip[data-tmode]').forEach(x => x.classList.toggle('on', x === b));
    updateTextPlaceholder();
    document.getElementById('anlCard').classList.remove('on');
    clearNotice();
    const ta = document.getElementById('textIn');
    if(!ta.value.trim()) ta.value = DEMO_TEXT[textMode.cur] || '';
  };
});
document.getElementById('demoTextBtn').onclick = () => {
  const ta = document.getElementById('textIn');
  ta.value = DEMO_TEXT[textMode.cur] || '';
  document.getElementById('anlCard').classList.remove('on');
  clearNotice();
};
document.getElementById('analyzeBtn').onclick = () => {
  textMode.force = null;
  try { analyzeCurrent(); } catch(e){ setNotice('分析出错：' + (e && e.message ? e.message : e)); }
};
document.getElementById('composeBtn').onclick = () => {
  textMode.force = null;
  composeText().catch(e => setNotice('配乐失败：' + (e && e.message ? e.message : e)));
};
document.getElementById('cpSearch').oninput = e => renderCiPaiLib(e.target.value);
document.getElementById('cpToggle').onclick = e => {
  ciPaiShowAll = !ciPaiShowAll;
  renderCiPaiLib(document.getElementById('cpSearch').value);
};
document.getElementById('gongToggle').onclick = () => {
  gongShowAll = !gongShowAll;
  renderGongLib(document.getElementById('gongSearch').value);
};
document.getElementById('gongSearch').oninput = e => renderGongLib(e.target.value);
