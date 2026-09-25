/* >>> file: src/js/04-presets-state.js */
/* ============================================================
   4. 预设旋律 / 全局状态
   ============================================================ */
/* 网格长度与音域范围都是可变的：哼唱片段用 16 格 / C4–D5，
   诗词与歌词可以展开到上百格、跨两个八度，以适配不同歌唱声部。 */
let GRID_COLS = 16, GRID_ROWS = 15, ROW_LOW = 60;
const GRID_COLS_MAX = 208;

function setGridCols(n, keep){
  const nn = clamp(Math.ceil(n/4)*4, 8, GRID_COLS_MAX);
  const old = state.grid.slice();
  if(!keep) old.length = 0;
  state.grid = new Array(nn).fill(null);
  for(let i = 0; i < Math.min(nn, old.length); i++) state.grid[i] = old[i];
  GRID_COLS = nn;
}
function resetGridCols(){ GRID_COLS = 16; state.grid = new Array(16).fill(null); }

function setRollRange(lo, hi){
  lo = clamp(Math.round(lo), 24, 96);
  hi = clamp(Math.round(hi), lo + 11, 108);
  ROW_LOW = lo; GRID_ROWS = hi - lo + 1;
  const rh = GRID_ROWS > 30 ? 9 : GRID_ROWS > 24 ? 10 : GRID_ROWS > 18 ? 12 : 15;
  document.documentElement.style.setProperty('--rowh', rh + 'px');
  renderRoll();
}
function resetRollRange(){ setRollRange(60, 74); }

const PRESETS = {
  twinkle :{name:'小星星',  notes:[[60,1],[60,1],[67,1],[67,1],[69,1],[69,1],[67,2],[65,1],[65,1],[64,1],[64,1],[62,1],[62,1],[60,2]]},
  happy   :{name:'生日快乐',notes:[[67,1],[67,1],[69,2],[67,2],[72,2],[71,2],[67,1],[67,1],[69,2],[67,2]]},
  pop     :{name:'流行旋律',notes:[[69,2],[67,2],[64,2],[62,2],[64,2],[62,2],[60,4]]},
  chinese :{name:'五声音阶',notes:[[62,2],[64,2],[67,2],[69,2],[74,2],[69,2],[67,2],[64,2]]},
  jazzline:{name:'爵士线条',notes:[[72,2],[71,2],[69,2],[67,2],[65,2],[64,2],[62,4]]},
  ballad  :{name:'抒情线条',notes:[[64,4],[67,3],[69,5],[67,4]]}
};

const state = {
  theme:'classical', chordInst:'piano', bassInst:'contrabass',
  grid:new Array(GRID_COLS).fill(null), melody:[], key:null,
  chords:[], events:[], bpm:90, audioCtx:null
};
const playState = {raf:0, master:null, startedAt:0, stepSec:1, playing:false, abQueue:null, abTimer:null};
