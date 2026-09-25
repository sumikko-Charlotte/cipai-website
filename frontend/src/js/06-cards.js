/* >>> file: src/js/06-cards.js */
/* ============================================================
   6. 风格卡片 / 乐器卡片
   ============================================================ */
function renderStyles(){
  const g = document.getElementById('styleGrid');
  g.innerHTML = '';
  STYLE_KEYS.forEach(k => {
    const s = STYLES[k], d = document.createElement('button');
    d.className = 'scard' + (k === state.theme ? ' on' : '');
    d.dataset.style = k;
    d.innerHTML = '<span class="sw"><i style="background:' + s.acc + '"></i><i style="background:' + s.acc2 + '"></i></span>' +
      '<span class="nm">' + s.name + '</span><span class="en">' + s.en + '</span>' +
      '<span class="mt"><span>' + s.bpm + ' BPM</span><span>' + PATTERN_NAME[s.pat] + '</span></span>';
    d.onclick = () => selectStyle(k);
    g.appendChild(d);
  });
  document.getElementById('styleCount').textContent = STYLE_KEYS.length + ' 种风格 · 切换即换肤';
}
function selectStyle(k){
  state.theme = k;
  applyTheme(k);
  const s = STYLES[k];
  document.querySelectorAll('.scard').forEach(el => el.classList.toggle('on', el.dataset.style === k));
  document.getElementById('styleDetail').innerHTML =
    '<h3>' + s.name + '　<span style="color:var(--ink3);font-size:11px;letter-spacing:.08em">' + s.en + '</span></h3>' +
    '<p>' + s.desc + '</p><div class="spec">' +
      '<div><b>' + PATTERN_NAME[s.pat] + '</b>伴奏音型</div>' +
      '<div><b>' + s.bpm + '</b>速度 BPM</div>' +
      '<div><b>' + (s.sev > .6 ? '高' : s.sev > .3 ? '中' : '低') + '</b>七和弦倾向</div>' +
      '<div><b>' + INSTRUMENTS[s.inst].name + '</b>建议乐器</div>' +
    '</div>';
  setChordInst(s.inst, true);
  setBassInst(s.bass, true);
  stopPlay();
  abortAB();
  state.bpm = s.bpm;
  document.getElementById('tempo').value = s.bpm;
  document.getElementById('tempoV').textContent = s.bpm;
  if(state.chords.length && state.key){
    state.chords = viterbiDecode(state.grid, state.key);
    buildAccompaniment();
    renderResult(true);
    logLine('风格切换为 <b>' + s.name + '</b>，和弦序列保持不变，仅重排音型与音色', true);
  } else {
    drawIdleWave();
  }
}
function renderInstruments(){
  const g1 = document.getElementById('instGrid1'), g2 = document.getElementById('instGrid2');
  g1.innerHTML = ''; g2.innerHTML = '';
  Object.keys(INSTRUMENTS).forEach(k => {
    const it = INSTRUMENTS[k], b = document.createElement('button');
    b.className = 'icard' + (k === state.chordInst ? ' on' : '');
    b.dataset.inst = k;
    b.innerHTML = '<span class="inm">' + it.name + '</span><span class="itg">' + it.tag + '</span>';
    b.onclick = () => setChordInst(k);
    g1.appendChild(b);
  });
  Object.keys(BASS_INSTRUMENTS).forEach(k => {
    const it = BASS_INSTRUMENTS[k], b = document.createElement('button');
    b.className = 'icard' + (k === state.bassInst ? ' on' : '');
    b.dataset.bass = k;
    b.innerHTML = '<span class="inm">' + it.name + '</span><span class="itg">' + it.tag + '</span>';
    b.onclick = () => setBassInst(k);
    g2.appendChild(b);
  });
}
function setChordInst(k, silent){
  state.chordInst = k;
  document.querySelectorAll('#instGrid1 .icard').forEach(el => el.classList.toggle('on', el.dataset.inst === k));
  if(!silent) onInstrumentChange('和弦声部 → ' + INSTRUMENTS[k].name + '（' + INSTRUMENTS[k].tag + '）');
}
function setBassInst(k, silent){
  state.bassInst = k;
  document.querySelectorAll('#instGrid2 .icard').forEach(el => el.classList.toggle('on', el.dataset.bass === k));
  if(!silent) onInstrumentChange('低音声部 → ' + BASS_INSTRUMENTS[k].name + '（' + BASS_INSTRUMENTS[k].tag + '）');
}
function onInstrumentChange(msg){
  abortAB();
  stopPlay();
  markStep(3);
  if(state.chords.length && state.key){
    buildAccompaniment();
    renderResult(true);
    logLine('保持调性与和弦序列不变，' + msg, true);
    setTimeout(() => { if(state.events.length) startPlay(); }, 80);
  } else {
    previewInstruments();
  }
}
let abTimerList = [];
function abortAB(){ abTimerList.forEach(t => clearTimeout(t)); abTimerList = []; }
function previewInstruments(){
  const combos = [[state.chordInst, state.bassInst]];
  const ctx = ensureCtx();
  const master = ctx.createGain();
  master.gain.value = .5;
  master.connect(ctx.destination);
  const step = 60/state.bpm/2;
  const t0 = ctx.currentTime + .06;
  [0,5,7,0].forEach((deg, i) => {
    CHORD_TONES.maj.forEach((iv, j) =>
      playEvent(ctx, master, {pitch:60 + deg + iv, start:i*4 + j*.9, dur:1.8, voice:'chord'}, t0, step));
    playEvent(ctx, master, {pitch:36 + deg, start:i*4, dur:3.4, voice:'bass'}, t0, step);
  });
  setNotice('正在试听当前乐器组合：I–IV–V–I。更换乐器即可听到同一和声的不同呈现。');
}
