/* >>> file: src/js/24-result-staff.js */
/* ============================================================
   24. 生成结果 · 五线谱可视化（大谱表 + 固定调数字符头）
   与钢琴卷帘共用同一个播放步进（staffCursor），播放时谱面同步高亮
   ============================================================ */
const RSTAFF = {
  eighthW: 32,          // 每列（八分音符）宽度
  step: 6,              // 半线距
  colsPerBar: 8,        // 4/4 一小节 = 8 个八分音符
  maxBarsPerLine: 4,
  headRx: 7.2, headRy: 5.3,
  stemLen: 40,
  trebleMid: 58,        // 高音谱表中线相对系统顶部
  bassGap: 84,          // 高音谱表中线 → 低音谱表中线
  sysH: 224,
  topPad: 74
};
const DO_NUM = [1,1,2,2,3,4,4,5,5,6,6,7];   // 固定调：C=1 D=2 E=3 F=4 G=5 A=6 B=7（黑键取前一个字母）
const BASS_SHARP_POS = {5:2,0:-3,7:3,2:0,9:4,4:1,11:-1};
const BASS_FLAT_POS  = {11:-1,4:1,9:4,2:0,7:3,0:-3,5:2};
const HEAD_DIGIT = '#2A2117';

/* 低音谱表：中线 D3（midi 50）为 0 */
function bassSteps(midi){
  const oct = Math.floor(midi / 12) - 1, pc = mod(midi);
  return (oct * 7 + STAFF.diaPc[pc]) - (3 * 7 + 1);
}
function voiceColor(voice){
  return voice === 'melody' ? 'var(--accent)' : voice === 'chord' ? 'var(--accent2)' : 'var(--track-bass)';
}

/* —— 谱表装饰（全部用路径绘制，颜色跟随主题） —— */
function bassClefPath(x, yMid, color){
  const f = yMid - 12;   // F3 线
  return `<g fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round">` +
    `<path d="M ${x+20} ${yMid-28} C ${x+6} ${yMid-30} ${x-1} ${yMid-21} ${x+6} ${yMid-13} ` +
          `C ${x+14} ${yMid-5} ${x+16} ${yMid+5} ${x+5} ${yMid+14} ` +
          `C ${x-5} ${yMid+22} ${x-2} ${yMid+31} ${x+11} ${yMid+30}"/>` +
    `<circle cx="${x+14}" cy="${f-2}" r="3.8" fill="${color}" stroke="none"/>` +
    `<circle cx="${x+27}" cy="${f-6}" r="2.4" fill="${color}" stroke="none"/>` +
    `<circle cx="${x+27}" cy="${f+6}" r="2.4" fill="${color}" stroke="none"/>` +
  `</g>`;
}
function bracePath(x, y1, y2){
  const ym = (y1 + y2) / 2;
  return `M ${x+9} ${y1} C ${x+2} ${y1+3} ${x+2} ${y1+14} ${x+2} ${ym-14} ` +
         `C ${x+2} ${ym-6} ${x-1} ${ym-2} ${x-6} ${ym} ` +
         `C ${x-1} ${ym+2} ${x+2} ${ym+6} ${x+2} ${ym+14} ` +
         `C ${x+2} ${y2-14} ${x+2} ${y2-3} ${x+9} ${y2}`;
}
function flagPath(sx, tip, up, color){
  return up
    ? `<path d="M ${sx} ${tip} L ${sx+8} ${tip+4} C ${sx+11} ${tip+9} ${sx+9} ${tip+14} ${sx+2} ${tip+16} L ${sx} ${tip+12} Z" fill="${color}"/>`
    : `<path d="M ${sx} ${tip} L ${sx+8} ${tip-4} C ${sx+11} ${tip-9} ${sx+9} ${tip-14} ${sx+2} ${tip-16} L ${sx} ${tip-12} Z" fill="${color}"/>`;
}

/* —— 布局 —— */
function resultStaffLayout(){
  const nBars = Math.max(1, Math.ceil(GRID_COLS / RSTAFF.colsPerBar));
  const barsPerLine = window.innerWidth < 780 ? 2 : RSTAFF.maxBarsPerLine;
  const sig = keySignature(state.key ? state.key.root : null, state.key ? state.key.mode : 'major');
  const barW = RSTAFF.colsPerBar * RSTAFF.eighthW;
  const sigW = sig.n ? sig.n * 10 + 8 : 4;
  const xClef = 34, xSig = xClef + 42;
  const xTime = xSig + sigW + 8;
  const xMusicFirst = xTime + 32, xMusicNext = xSig + sigW + 12;
  const nLines = Math.ceil(nBars / barsPerLine);
  const W = Math.max(xMusicFirst, xMusicNext) + Math.min(barsPerLine, nBars) * barW + 16;
  return {
    nBars, barsPerLine, barW, sig, xClef, xSig, xTime, xMusicFirst, xMusicNext, nLines, W,
    H: RSTAFF.topPad + nLines * RSTAFF.sysH + 12,
    sysTop: i => RSTAFF.topPad + i * RSTAFF.sysH,
    yTreble: i => RSTAFF.topPad + i * RSTAFF.sysH + RSTAFF.trebleMid,
    yBass: i => RSTAFF.topPad + i * RSTAFF.sysH + RSTAFF.trebleMid + RSTAFF.bassGap,
    xFor(col, si){
      const bar = Math.floor(col / RSTAFF.colsPerBar);
      const xBar = (si === 0 ? xMusicFirst : xMusicNext) + (bar - si * barsPerLine) * barW;
      return xBar + (col - bar * RSTAFF.colsPerBar) * RSTAFF.eighthW;
    }
  };
}

/* —— 音符数据：旋律拆小节 / 时值分解；伴奏按列聚成和弦 —— */
function melodyStaffSymbols(){
  const out = [];
  state.melody.forEach(run => {
    let col = run.start, remaining = run.dur;
    while(remaining > 0 && col < GRID_COLS){
      const take = Math.min(remaining, RSTAFF.colsPerBar - (col % RSTAFF.colsPerBar));
      let r = take, c = col;
      [8,4,3,2,1].forEach(u => { while(r >= u){ out.push({midis:[run.midi], col:c, dur:u, voice:'melody', staff:'treble'}); c += u; r -= u; } });
      col += take; remaining -= take;
    }
  });
  return out;
}
function accompanimentStaffSymbols(voice){
  const map = new Map();
  state.events.filter(e => e.voice === voice).forEach(e => {
    const col = Math.max(0, Math.min(GRID_COLS - 1, Math.round(e.start)));
    const staff = (voice === 'bass' || e.pitch < 60) ? 'bass' : 'treble';
    const key = staff + '|' + col;
    const item = map.get(key) || {staff, col, midis:[], dur:0, voice};
    if(item.midis.indexOf(e.pitch) === -1) item.midis.push(e.pitch);
    item.dur = Math.max(item.dur, clamp(Math.round(e.dur), 1, 8));
    map.set(key, item);
  });
  const byStaff = {treble:[], bass:[]};
  map.forEach(item => byStaff[item.staff].push(item));
  ['treble','bass'].forEach(st => {
    const arr = byStaff[st].sort((a,b) => a.col - b.col);
    arr.forEach((item, i) => {
      const nextCol = i + 1 < arr.length ? arr[i+1].col : GRID_COLS;
      item.dur = Math.max(1, Math.min(item.dur, nextCol - item.col, RSTAFF.colsPerBar - (item.col % RSTAFF.colsPerBar)));
    });
  });
  return byStaff.treble.concat(byStaff.bass);
}
/* 同拍相邻、同方向的八分音符连符杠 */
function markMelodyBeams(symbols){
  const eighths = symbols.filter(s => s.voice === 'melody' && s.dur === 1).sort((a,b) => a.col - b.col);
  for(let i = 0; i + 1 < eighths.length; i++){
    const a = eighths[i], b = eighths[i+1];
    if(a._beamWith || b._beamWith) continue;
    if(b.col !== a.col + 1) continue;
    if(Math.floor((a.col % RSTAFF.colsPerBar) / 2) !== Math.floor((b.col % RSTAFF.colsPerBar) / 2)) continue;
    if((staffSteps(a.midis[0]) < 0) !== (staffSteps(b.midis[0]) < 0)) continue;
    a._beamWith = b; b._beamWith = a;
  }
}

/* —— 单个音符 / 和弦 —— */
function paintStaffNote(sym, x, yMid, sig){
  const sts = sym.midis.map(m => sym.staff === 'treble' ? staffSteps(m) : bassSteps(m));
  const ys = sts.map(st => yMid - st * RSTAFF.step);
  const color = voiceColor(sym.voice);
  const ink = 'var(--ink)';
  const filled = sym.dur < 4;
  let svg = `<g class="snote v-${sym.voice}" data-v="${sym.voice}" data-s="${sym.col}" data-d="${sym.dur}" data-x="${x}" data-y="${ys.reduce((a,b)=>a+b,0)/ys.length}">`;

  // 加线
  const led = new Set();
  sts.forEach(st => {
    if(st > 4) for(let l = 6; l <= st; l += 2) led.add(l);
    if(st < -4) for(let l = -6; l >= st; l -= 2) led.add(l);
  });
  led.forEach(l => {
    const ly = yMid - l * RSTAFF.step;
    svg += `<line x1="${x-11}" y1="${ly}" x2="${x+11}" y2="${ly}" stroke="${ink}" stroke-width="1"/>`;
  });

  // 变音记号
  let accN = 0;
  const accSeen = new Set();
  sym.midis.forEach((m, i) => {
    const pc = mod(m), inSig = sig.pcs.includes(pc);
    let kind = null;
    if(STAFF.blackPc[pc] && !inSig) kind = sig.sharp ? 'sharp' : 'flat';
    else if(!STAFF.blackPc[pc] && inSig) kind = 'natural';
    if(!kind) return;
    const id = kind + '@' + Math.round(ys[i]);
    if(accSeen.has(id)) return;
    accSeen.add(id);
    svg += accPath(kind, x - 17 - accN * 10, ys[i], ink);
    accN++;
  });

  // 符头 + 固定调数字
  const seen = new Set();
  sym.midis.forEach((m, i) => {
    const id = m + '/' + sts[i];
    if(seen.has(id)) return;
    seen.add(id);
    const y = ys[i];
    svg += `<ellipse class="nh" cx="${x}" cy="${y}" rx="${RSTAFF.headRx}" ry="${RSTAFF.headRy}" ` +
           `transform="rotate(-14 ${x} ${y})" fill="${filled ? color : 'var(--bg2)'}" stroke="${color}" stroke-width="1.3"/>`;
    svg += `<text class="nd" x="${x}" y="${y + 2.7}" font-size="7.6" font-weight="700" text-anchor="middle" ` +
           `fill="${filled ? HEAD_DIGIT : color}" style="pointer-events:none">${DO_NUM[mod(m)]}</text>`;
  });

  // 附点
  if(sym.dur === 3 || sym.dur === 6){
    svg += `<circle cx="${x + RSTAFF.headRx + 4}" cy="${Math.min(...ys) - 1}" r="1.7" fill="${color}"/>`;
  }

  // 符干 / 符尾
  let stem = null;
  if(sym.dur < 8){
    const up = sts.reduce((a,b) => a + b, 0) / sts.length < 0;
    const sx = x + (up ? RSTAFF.headRx - 1 : -RSTAFF.headRx + 1);
    const yTop = Math.min(...ys), yBot = Math.max(...ys);
    const tip = up ? yTop - RSTAFF.stemLen : yBot + RSTAFF.stemLen;
    svg += `<line x1="${sx}" y1="${up ? yBot : yTop}" x2="${sx}" y2="${tip}" stroke="${color}" stroke-width="1.5"/>`;
    stem = {sx, tip, up};
    if(sym.dur === 1 && !sym._beamWith) svg += flagPath(sx, tip, up, color);
  }
  return {svg: svg + '</g>', stem};
}

function paintStaffBar(barSyms, si, L){
  const order = {bass:0, chord:1, melody:2};
  const list = barSyms.slice().sort((a,b) => (order[a.voice] - order[b.voice]) || (a.col - b.col));
  let svg = '';
  list.forEach(sym => {
    const x = L.xFor(sym.col, si) + sym.dur * RSTAFF.eighthW / 2;
    const yMid = sym.staff === 'treble' ? L.yTreble(si) : L.yBass(si);
    const painted = paintStaffNote(sym, x, yMid, L.sig);
    svg += painted.svg;
    if(painted.stem) sym._stem = painted.stem;
  });
  // 符杠
  list.forEach(sym => {
    if(!sym._beamWith || !sym._stem || !sym._beamWith._stem) return;
    const other = sym._beamWith;
    const color = voiceColor(sym.voice);
    const x1 = Math.min(sym._stem.sx, other._stem.sx), x2 = Math.max(sym._stem.sx, other._stem.sx);
    svg += sym._stem.up
      ? `<rect x="${x1}" y="${Math.min(sym._stem.tip, other._stem.tip) - 6}" width="${x2-x1}" height="6" fill="${color}"/>`
      : `<rect x="${x1}" y="${Math.max(sym._stem.tip, other._stem.tip)}" width="${x2-x1}" height="6" fill="${color}"/>`;
  });
  return svg;
}

function drawKeySignature(sig, x, yMid, staff, ink){
  if(!sig.n) return '';
  const pos = staff === 'treble'
    ? (sig.sharp ? STAFF.sharpPos : STAFF.flatPos)
    : (sig.sharp ? BASS_SHARP_POS : BASS_FLAT_POS);
  let out = '';
  sig.pcs.forEach((pc, i) => {
    out += accPath(sig.sharp ? 'sharp' : 'flat', x + i * 10, yMid - (pos[pc] || 0) * RSTAFF.step, ink);
  });
  return out;
}

function buildResultStaffSVG(){
  const L = resultStaffLayout();
  const melody = melodyStaffSymbols();
  markMelodyBeams(melody);
  const symbols = melody.concat(accompanimentStaffSymbols('chord'), accompanimentStaffSymbols('bass'));
  const byBar = new Map();
  symbols.forEach(s => {
    const b = Math.floor(s.col / RSTAFF.colsPerBar);
    if(!byBar.has(b)) byBar.set(b, []);
    byBar.get(b).push(s);
  });
  const ink = 'var(--ink)', ink3 = 'var(--ink3)';
  const keyName = state.key ? PC[state.key.root] + (state.key.mode === 'major' ? ' 大调' : ' 小调') : 'C 大调';
  let out = `<svg viewBox="0 0 ${L.W} ${L.H}" width="100%" preserveAspectRatio="xMidYMin meet" role="img" aria-label="五线谱预览">` +
    `<defs>` +
      `<radialGradient id="staffGlow" cx="50%" cy="50%" r="50%">` +
        `<stop offset="0%" stop-color="#FFFDF4" stop-opacity="1"/>` +
        `<stop offset="18%" stop-color="#FFE9AE" stop-opacity=".95"/>` +
        `<stop offset="45%" stop-color="#F5B95F" stop-opacity=".5"/>` +
        `<stop offset="100%" stop-color="#E89B3C" stop-opacity="0"/>` +
      `</radialGradient>` +
      `<filter id="staffSoft" x="-80%" y="-80%" width="260%" height="260%">` +
        `<feGaussianBlur stdDeviation="2.4"/>` +
      `</filter>` +
    `</defs>`;
  out += `<text x="12" y="20" font-size="12.5" fill="${ink3}">五线谱 · 大谱表（旋律 / 和弦 / 低音）</text>`;
  out += `<text x="${L.W-12}" y="20" font-size="11.5" fill="${ink3}" text-anchor="end">固定调数字 C=1 · ${keyName} · 4/4</text>`;

  for(let si = 0; si < L.nLines; si++){
    const yT = L.yTreble(si), yB = L.yBass(si);
    const yTtop = yT - 24, yBbot = yB + 24;
    const barFrom = si * L.barsPerLine, barTo = Math.min(L.nBars, barFrom + L.barsPerLine);
    const xMusic = si === 0 ? L.xMusicFirst : L.xMusicNext;
    const xEnd = xMusic + (barTo - barFrom) * L.barW;

    out += `<path d="${bracePath(14, yTtop, yBbot)}" fill="none" stroke="${ink}" stroke-width="1.4"/>`;
    for(let l = 0; l < 5; l++){
      out += `<line x1="${L.xClef - 12}" y1="${yTtop + l*12}" x2="${xEnd}" y2="${yTtop + l*12}" stroke="${ink}" stroke-width="1"/>`;
      out += `<line x1="${L.xClef - 12}" y1="${yB - 24 + l*12}" x2="${xEnd}" y2="${yB - 24 + l*12}" stroke="${ink}" stroke-width="1"/>`;
    }
    out += clefPath(L.xClef, yT, ink);
    out += bassClefPath(L.xClef, yB, ink);
    out += drawKeySignature(L.sig, L.xSig, yT, 'treble', ink);
    out += drawKeySignature(L.sig, L.xSig, yB, 'bass', ink);
    if(si === 0){
      [yT, yB].forEach(ym => {
        out += `<text x="${L.xTime + 8}" y="${ym - 3}" font-size="15" font-weight="700" fill="${ink}" text-anchor="middle">4</text>`;
        out += `<text x="${L.xTime + 8}" y="${ym + 15}" font-size="15" font-weight="700" fill="${ink}" text-anchor="middle">4</text>`;
      });
    }
    for(let b = barFrom; b < barTo; b++){
      const xBar = xMusic + (b - barFrom) * L.barW;
      out += `<text x="${xBar + 3}" y="${yTtop - 6}" font-size="10" fill="${ink3}">${b + 1}</text>`;
      out += paintStaffBar(byBar.get(b) || [], si, L);
    }
    for(let b = barFrom; b < barTo; b++){
      const xBarEnd = xMusic + (b - barFrom + 1) * L.barW;
      out += `<line x1="${xBarEnd}" y1="${yTtop}" x2="${xBarEnd}" y2="${yBbot}" stroke="${ink}" stroke-width="1"/>`;
      if(b === L.nBars - 1) out += `<line x1="${xBarEnd + 4}" y1="${yTtop}" x2="${xBarEnd + 4}" y2="${yBbot}" stroke="${ink}" stroke-width="3"/>`;
    }
  }
  out += `<g class="staff-glow-layer" pointer-events="none">` +
    ['melody','chord','bass'].map(v =>
      `<g class="glow-orb" data-orb="${v}" opacity="0">` +
        `<g class="orb-tail"><circle r="19" fill="url(#staffGlow)" opacity=".5"/></g>` +
        `<circle r="28" fill="url(#staffGlow)"/>` +
        `<circle class="orb-core" r="3.4" fill="#FFFDF2" filter="url(#staffSoft)"/>` +
      `</g>`).join('') +
  `</g>`;
  out += `<line class="playcursor" x1="0" y1="0" x2="0" y2="0" stroke="var(--accent)" stroke-width="1.8" opacity="0" pointer-events="none"/>`;
  return out + '</svg>';
}

/* —— 渲染与播放同步 —— */
let staffScoreRefs = {layout:null, cursor:null, orbs:[], notes:[], lastCol:null};

function renderResultStaff(){
  const box = document.getElementById('staffBoxResult');
  if(!box || box.style.display === 'none') return;
  if(!state.events.length){
    box.innerHTML = '<div class="staff-empty">生成伴奏后，这里会显示旋律 / 和弦 / 低音的五线谱。</div>';
    staffScoreRefs = {layout:null, cursor:null, orbs:[], notes:[], lastCol:null};
    return;
  }
  box.innerHTML = buildResultStaffSVG();
  const svg = box.querySelector('svg');
  staffScoreRefs = {
    layout: resultStaffLayout(),
    cursor: svg.querySelector('.playcursor'),
    notes: Array.prototype.slice.call(svg.querySelectorAll('.snote')),
    orbs: ['melody','chord','bass'].map(v => ({
      voice: v, x: 0, y: 0, tx: 0, ty: 0, op: 0, seen: false,
      el: svg.querySelector(`[data-orb="${v}"]`)
    })).filter(o => o.el),
    lastCol: null
  };
  staffCursor(-1);
}

function staffCursor(step){
  const refs = staffScoreRefs;
  if(!refs || !refs.cursor || !refs.cursor.isConnected) return;
  if(step < 0){
    refs.cursor.setAttribute('opacity', '0');
    refs.notes.forEach(g => g.classList.remove('active', 'future'));
    refs.orbs.forEach(o => { o.op = 0; o.seen = false; o.el.style.opacity = '0'; });
    refs.lastCol = null;
    return;
  }
  const L = refs.layout;
  const col = clamp(step, 0, GRID_COLS);
  let bar = Math.floor(col / RSTAFF.colsPerBar);
  if(bar >= L.nBars) bar = L.nBars - 1;
  const si = Math.floor(bar / L.barsPerLine);
  const x = L.xFor(Math.min(col, GRID_COLS - 0.001), si);
  const top = L.sysTop(si) + RSTAFF.trebleMid - 30;
  const bottom = L.sysTop(si) + RSTAFF.trebleMid + RSTAFF.bassGap + 26;
  refs.cursor.setAttribute('x1', x); refs.cursor.setAttribute('x2', x);
  refs.cursor.setAttribute('y1', top); refs.cursor.setAttribute('y2', bottom);
  refs.cursor.setAttribute('opacity', '0.85');
  const c = Math.floor(step);
  if(c !== refs.lastCol){
    refs.lastCol = c;
    refs.notes.forEach(g => {
      const s = +g.dataset.s, d = +g.dataset.d;
      g.classList.toggle('active', step >= s && step < s + d);
      g.classList.toggle('future', step < s);
    });
  }
  updateStaffGlow(refs, step);
}

/* 常驻光球：逐帧缓动飞向当前发声的音符，拖尾形成丝滑跳跃 */
function updateStaffGlow(refs, step){
  if(!refs.orbs.length) return;
  const acc = {};
  refs.notes.forEach(g => {
    const s = +g.dataset.s, d = +g.dataset.d;
    if(step < s || step >= s + d) return;
    const a = acc[g.dataset.v] || (acc[g.dataset.v] = {x:0, y:0, n:0});
    a.x += +g.dataset.x; a.y += +g.dataset.y; a.n++;
  });
  refs.orbs.forEach(o => {
    const t = acc[o.voice];
    if(t){
      const tx = t.x / t.n, ty = t.y / t.n;
      if(!o.seen){ o.x = tx; o.y = ty; o.tx = tx; o.ty = ty; o.seen = true; }
      o.x += (tx - o.x) * 0.22;
      o.y += (ty - o.y) * 0.22;
      o.op += (1 - o.op) * 0.25;
    }else{
      o.op += (0 - o.op) * 0.14;
    }
    o.tx += (o.x - o.tx) * 0.12;
    o.ty += (o.y - o.ty) * 0.12;
    o.el.setAttribute('transform', `translate(${o.x.toFixed(2)} ${o.y.toFixed(2)})`);
    o.el.style.opacity = o.op.toFixed(3);
    const tail = o.el.querySelector('.orb-tail');
    if(tail) tail.setAttribute('transform', `translate(${(o.tx - o.x).toFixed(2)} ${(o.ty - o.y).toFixed(2)})`);
  });
}

function toggleResultStaff(){
  const box = document.getElementById('staffBoxResult'), btn = document.getElementById('staffResultBtn');
  const open = box.style.display === 'none';
  box.style.display = open ? 'block' : 'none';
  btn.classList.toggle('on', open);
  if(open){
    renderResultStaff();
    box.scrollIntoView({behavior:'smooth', block:'nearest'});
  }else{
    staffCursor(-1);
  }
}
document.getElementById('staffResultBtn').onclick = toggleResultStaff;
