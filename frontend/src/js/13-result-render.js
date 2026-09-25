/* >>> file: src/js/13-result-render.js */
/* ============================================================
   13. 结果渲染
   ============================================================ */
function renderResult(silent){
  const st = STYLES[state.theme];
  document.getElementById('mKey').textContent = PC[state.key.root] + (state.key.mode === 'major' ? ' 大调' : ' 小调');
  document.getElementById('mBpm').innerHTML = state.bpm + '<small>BPM</small>';
  document.getElementById('mChord').textContent = state.chords.length + ' 个';
  document.getElementById('mVoice').innerHTML = state.events.filter(e => e.voice !== 'melody').length + '<small>事件</small>';

  let hit = 0, tot = 0;
  state.melody.forEach(n => {
    const ch = state.chords.find(c => n.start >= c.start && n.start < c.start + c.dur);
    if(!ch) return;
    tot += n.dur;
    if(chordTones(ch.rootPc, ch.type).map(mod).indexOf(mod(n.midi)) !== -1) hit += n.dur;
  });
  document.getElementById('mScore').innerHTML = (tot ? Math.round(hit/tot*62 + 36) : 70) + '<small>/100</small>';
  document.getElementById('resSub').textContent =
    st.name + ' · ' + PATTERN_NAME[st.pat] + ' · ' + INSTRUMENTS[state.chordInst].name + ' + ' + BASS_INSTRUMENTS[state.bassInst].name;

  const strip = document.getElementById('chordStrip');
  strip.innerHTML = '';
  state.chords.forEach(ch => {
    const d = document.createElement('div');
    d.className = 'cblk';
    d.innerHTML = '<div class="cn">' + ch.label + '</div><div class="cr">' + ch.roman + '</div><div class="cb">第 ' + (Math.floor(ch.start/4)+1) + ' 小节</div>';
    d.onclick = () => previewChord(ch);
    strip.appendChild(d);
  });

  const css = getComputedStyle(document.body);
  document.getElementById('lgMel').style.background = css.getPropertyValue('--accent').trim();
  document.getElementById('lgChd').style.background = css.getPropertyValue('--accent2').trim();
  document.getElementById('lgBas').style.background = css.getPropertyValue('--track-bass').trim();

  document.getElementById('result').classList.add('on');
  drawRoll(-1);
  if(!silent) markStep(4);
}
function previewChord(ch){
  const ctx = ensureCtx();
  const master = ctx.createGain();
  master.gain.value = .7;
  master.connect(ctx.destination);
  const step = 60/state.bpm/2, t0 = ctx.currentTime + .05, base = 48 + ch.rootPc;
  chordTones(base + 12, ch.type).forEach((p, i) => playEvent(ctx, master, {pitch:p, start:i*.7, dur:1.6, voice:'chord'}, t0, step));
  playEvent(ctx, master, {pitch:base - 12, start:0, dur:2.2, voice:'bass'}, t0, step);
}
