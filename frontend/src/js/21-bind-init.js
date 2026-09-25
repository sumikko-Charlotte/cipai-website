/* >>> file: src/js/21-bind-init.js */
/* ============================================================
   21. 事件绑定与初始化
   ============================================================ */
document.getElementById('tabs').addEventListener('click', e => {
  const b = e.target.closest('.tab');
  if(!b) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t === b));
  document.querySelectorAll('.tabbody').forEach(t => t.classList.remove('on'));
  document.getElementById('tab-' + b.dataset.tab).classList.add('on');
  setTimeout(() => { drawIdleWave(); if(state.events.length) drawRoll(-1); }, 30);
});
document.getElementById('recBtn').onclick = toggleRec;

const dz = document.getElementById('dropzone');
dz.onclick = () => document.getElementById('fileInput').click();
['dragenter','dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
['dragleave','drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
dz.addEventListener('drop', e => { if(e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });
document.getElementById('fileInput').onchange = e => handleFile(e.target.files[0]);

document.getElementById('clearRoll').onclick = () => {
  state.grid = new Array(GRID_COLS).fill(null);
  syncRoll(); loadMelodyFromGrid(); clearNotice();
};
document.querySelectorAll('.chip[data-preset]').forEach(b => { b.onclick = () => applyPreset(b.dataset.preset); });
document.getElementById('goBtn').onclick = generate;
document.getElementById('abBtn').onclick = abCompare;

document.getElementById('playBtn').onclick = () => { if(playState.playing) stopPlay(); else startPlay(); };
document.getElementById('stopBtn').onclick = () => { abortAB(); stopPlay(); };
document.getElementById('tempo').oninput = e => {
  state.bpm = +e.target.value;
  document.getElementById('tempoV').textContent = state.bpm;
};
document.getElementById('vol').oninput = e => { if(playState.master) playState.master.gain.value = (+e.target.value)/100*.9; };

document.getElementById('dlMidi').onclick = exportMidi;
document.getElementById('dlWav').onclick = exportWav;
document.getElementById('dlJson').onclick = exportJson;

window.addEventListener('resize', () => { if(state.events.length) drawRoll(-1); else drawIdleWave(); });

renderStyles();
renderInstruments();
renderRoll();
selectStyle('classical');
applyPreset('pop');
drawIdleWave();
renderTextOptions();
renderCiPaiLib('');
renderGongLib();
updateTextPlaceholder();
document.getElementById('textIn').value = DEMO_TEXT.ci;
logLine('就绪。录入旋律 → 选风格 → 配乐器 → 生成，然后可导出 MIDI / WAV / JSON。', true);
logLine('文字配乐：把诗词或歌词粘进「文字配乐」，或直接在下方词牌库里搜词牌与宫调。', true);