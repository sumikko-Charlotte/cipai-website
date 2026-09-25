/* >>> file: src/js/14-ab-compare.js */
/* ============================================================
   14. A/B 对比：同和声、不同乐器
   ============================================================ */
function abCompare(){
  if(!state.events.length){ setNotice('先生成一次伴奏，再来做 A/B 对比。'); return; }
  abortAB(); stopPlay();
  const combos = [
    [state.chordInst, state.bassInst],
    ['epiano', 'acoustic'],
    ['nylon', 'acoustic'],
    ['strings', 'cello'],
    ['distorted', 'electric']
  ];
  const step = 60/state.bpm/2;
  const dur = (GRID_COLS*step + 1.1) * 1000;
  setNotice('A/B 对比中：同一段和弦序列，依次用 5 种乐器组合演奏。');
  combos.forEach((c, i) => {
    const t = setTimeout(() => {
      state.chordInst = c[0]; state.bassInst = c[1];
      document.querySelectorAll('#instGrid1 .icard').forEach(el => el.classList.toggle('on', el.dataset.inst === c[0]));
      document.querySelectorAll('#instGrid2 .icard').forEach(el => el.classList.toggle('on', el.dataset.bass === c[1]));
      buildAccompaniment();
      startPlay();
      logLine('A/B 对比 · 第 ' + (i+1) + ' 组：' + INSTRUMENTS[c[0]].name + ' + ' + BASS_INSTRUMENTS[c[1]].name, true);
    }, i*dur);
    abTimerList.push(t);
  });
}
