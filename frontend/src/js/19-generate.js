/* >>> file: src/js/19-generate.js */
/* ============================================================
   19. 生成主流程
   ============================================================ */
function markStep(n){
  document.querySelectorAll('.steps .st').forEach(el => {
    const k = +el.dataset.st;
    el.classList.toggle('on', k === n);
    el.classList.toggle('done', k < n);
  });
}
function setProg(i, cls){
  document.querySelectorAll('.pi').forEach(el => {
    const k = +el.dataset.pi;
    el.classList.remove('act','fin');
    if(k < i) el.classList.add('fin');
    if(k === i) el.classList.add(cls || 'act');
  });
}
const resetProg = () => document.querySelectorAll('.pi').forEach(el => el.classList.remove('act','fin'));
function clearLog(){ document.getElementById('alog').innerHTML = ''; }
function logLine(html, dim){
  const p = document.createElement('p');
  if(dim) p.className = 'dim';
  p.innerHTML = html;
  const box = document.getElementById('alog');
  box.appendChild(p); box.scrollTop = box.scrollHeight;
}
function setNotice(t){ const n = document.getElementById('notice'); n.textContent = t; n.classList.add('on'); }
function clearNotice(){ document.getElementById('notice').classList.remove('on'); }

async function generate(){
  if(state.melody.length < 2){
    setNotice('旋律太短了。请先做声音识别、导入文件，或者直接点示例旋律。');
    return;
  }
  clearNotice();
  abortAB(); stopPlay();
  const btn = document.getElementById('goBtn');
  btn.disabled = true; btn.textContent = '分析中…';
  clearLog(); resetProg(); markStep(4);
  const wait = ms => new Promise(r => setTimeout(r, ms));

  setProg(0);
  logLine('输入旋律：<b>' + state.melody.length + '</b> 个音符，总时值 ' + state.melody.reduce((a,b) => a+b.dur, 0) + ' 个八分音符');
  await wait(380);
  setProg(0,'fin');

  setProg(1);
  state.key = detectKey(state.melody);
  logLine('调性判定：Krumhansl 音级轮廓相关 → <b>' + PC[state.key.root] + (state.key.mode === 'major' ? ' 大调' : ' 小调') + '</b>（相关系数 ' + state.key.score.toFixed(3) + '）');
  logLine('调内和弦候选集：' + DIATONIC[state.key.mode].map(c => c.roman).join('  '), true);
  await wait(560);
  setProg(1,'fin');

  setProg(2);
  logLine('HMM 建模：观测 = 每小节音级加权直方图，状态 = ' + DIATONIC[state.key.mode].length + ' 个调内和弦', true);
  logLine('维特比转移概率取自功能和声表，并叠加「' + STYLES[state.theme].name + '」的风格先验', true);
  state.chords = viterbiDecode(state.grid, state.key);
  await wait(640);
  logLine('维特比解码结果：' + state.chords.map(c => c.label + '(' + c.roman + ')').join(' → '));
  setProg(2,'fin');

  setProg(3);
  buildAccompaniment();
  logLine('伴奏音型：<b>' + STYLES[state.theme].name + '</b> · ' + PATTERN_NAME[STYLES[state.theme].pat]);
  logLine('乐器配置：和弦声部 ' + INSTRUMENTS[state.chordInst].name + ' / 低音声部 ' + BASS_INSTRUMENTS[state.bassInst].name);
  logLine('生成伴奏事件 <b>' + state.events.filter(e => e.voice !== 'melody').length + '</b> 个（含和弦与低音声部）');
  await wait(480);
  setProg(3,'fin');

  renderResult(false);
  btn.disabled = false; btn.textContent = '重新生成';
  logLine('完成。可播放试听、切换乐器对比、或导出 MIDI / WAV / JSON。', true);
}
