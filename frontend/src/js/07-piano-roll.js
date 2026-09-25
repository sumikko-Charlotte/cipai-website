/* >>> file: src/js/07-piano-roll.js */
/* ============================================================
   7. 钢琴卷帘
   ============================================================ */
function renderRoll(){
  const keys = document.getElementById('rollKeys'), grid = document.getElementById('rollGrid');
  keys.innerHTML = ''; grid.innerHTML = '';
  grid.style.minWidth = Math.max(0, GRID_COLS * 13) + 'px';
  for(let i = 0; i < GRID_ROWS; i++){
    const midi = ROW_LOW + (GRID_ROWS - 1 - i);
    const kd = document.createElement('div');
    if(isBlack(midi)) kd.className = 'black';
    kd.textContent = (mod(midi) === 0 || mod(midi) === 7) ? PC[mod(midi)] : '';
    keys.appendChild(kd);
    const row = document.createElement('div');
    row.className = 'rollrow';
    for(let c = 0; c < GRID_COLS; c++){
      const cell = document.createElement('div');
      cell.className = 'rollcell' + (isBlack(midi) ? ' black' : '');
      cell.dataset.col = c; cell.dataset.midi = midi;
      if(state.grid[c] === midi) cell.classList.add('on');
      cell.onclick = () => {
        state.grid[c] = (state.grid[c] === midi) ? null : midi;
        syncRoll(); loadMelodyFromGrid(); clearNotice(); markStep(2);
      };
      row.appendChild(cell);
    }
    grid.appendChild(row);
  }
}
function syncRoll(){
  document.querySelectorAll('.rollcell').forEach(cell => {
    cell.classList.toggle('on', state.grid[+cell.dataset.col] === +cell.dataset.midi);
  });
}
function loadMelodyFromGrid(){
  state.melody = [];
  let run = null;
  for(let c = 0; c < GRID_COLS; c++){
    const m = state.grid[c];
    if(m === null){ run = null; continue; }
    if(run && run.midi === m) run.dur++;
    else { run = {midi:m, start:c, dur:1}; state.melody.push(run); }
  }
}
function applyPreset(key){
  const p = PRESETS[key];
  resetGridCols();
  resetRollRange();
  let c = 0;
  p.notes.forEach(([m, len]) => { for(let i = 0; i < len && c < GRID_COLS; i++, c++) state.grid[c] = m; });
  syncRoll(); loadMelodyFromGrid();
  setNotice('已载入示例旋律「' + p.name + '」，可直接点「生成伴奏」试听。');
  markStep(2);
}
