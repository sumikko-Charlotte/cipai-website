/* >>> file: src/js/20f-cipai-gongdiao.js */
/* ============================================================
   20. 文字配乐 · 六、词牌库与宫调库
   ============================================================ */
function renderCiPaiLib(q){
  const box = document.getElementById('cpList');
  const s = (q || '').trim();
  const nq = parseInt(s, 10);
  const hit = CI_PAI.filter(cp => !s ||
    cp.name.indexOf(s) >= 0 || (cp.alt || []).some(x => x.indexOf(s) >= 0) ||
    (!isNaN(nq) && cp.n === nq));
  box.innerHTML = '';
  if(!hit.length){
    box.innerHTML = '<div style="font-size:12px;color:var(--ink3);line-height:1.9">没有匹配的词牌。可试试「浣溪沙」「念奴娇」，或直接输入字数如「60」。</div>';
    return;
  }
  hit.forEach(cp => {
    const gd = GONG_MAP[cp.gong];
    const b = document.createElement('button');
    b.className = 'cpitem';
    b.innerHTML = '<span class="cnm">' + cp.name + '</span>' +
      '<span class="cmeta">' + cp.n + ' 字 · ' + cp.lc + ' 句 · ' + (cp.kind === 'shi' ? '近体诗' : '词') + '</span>' +
      '<span class="cg">' + gd.name + ' · ' + gd.mood + '</span>';
    b.onclick = () => showCiPai(cp.name);
    box.appendChild(b);
  });
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
      '<button class="chip" onclick="applyCiPai(\'' + cp.name + '\')">按此格律生成旋律</button>' +
      '<button class="chip" onclick="previewGong(\'' + cp.gong + '\')">试听 ' + gd.name + ' 音阶</button>' +
      '<button class="chip" onclick="previewGong(\'' + cp.gong + '\', 1)">试听 ' + MODES5[gd.mode].name + ' 终止式</button>' +
    '</div>';
  d.classList.add('on');
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
  const ctx = ensureCtx();
  const master = ctx.createGain();
  master.gain.value = .5;
  master.connect(ctx.destination);
  const step = 60 / 76 / 2, t0 = ctx.currentTime + .05;
  const rootMidi = 60 - MODES5[gd.mode].deg;
  const iv = SCALES[gd.scale].iv;
  const seq = cad ? [iv[0], iv[2 % iv.length], iv[4 % iv.length], iv[0]] : iv.concat([12]);
  seq.forEach((s, i) =>
    playEvent(ctx, master, {pitch:rootMidi + s, start:i * 2, dur:1.7, voice:'chord'}, t0, step));
  playEvent(ctx, master, {pitch:rootMidi - 12 + MODES5[gd.mode].deg, start:seq.length * 2, dur:4, voice:'bass'}, t0, step);
  setNotice('正在试听「' + gd.name + '」：' + SCALES[gd.scale].name + (cad ? ' 的调式终止式' : ' 音阶上行') +
    '，落于 <b>' + MODES5[gd.mode].name + '</b>。情感色彩：' + gd.mood + '。');
}
function renderGongLib(){
  const g = document.getElementById('gdGrid');
  g.innerHTML = '';
  GONG_DIAO.forEach(gd => {
    const b = document.createElement('button');
    b.className = 'gdcard';
    b.innerHTML = '<span class="g1">' + gd.name + '</span>' +
      '<span class="g2">' + gd.mood + '<br>' + MODES5[gd.mode].name + ' · ' + SCALES[gd.scale].name + '</span>' +
      '<span class="g3">点击试听音阶</span>';
    b.onclick = () => previewGong(gd.k);
    g.appendChild(b);
  });
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
  const c = document.getElementById('cpCollapse');
  c.classList.toggle('on');
  e.target.textContent = c.classList.contains('on') ? '收起词牌库' : '展开词牌库';
  if(c.classList.contains('on')) renderCiPaiLib(document.getElementById('cpSearch').value);
};
