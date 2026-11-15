/* >>> file: src/js/23-staff.js */
/* ============================================================
   23. 五线谱渲染：将网格音符（state.melody）绘制为高音谱表
   纯手写 SVG，零依赖；1 列 = 1 个八分音符，8 列 = 1 小节 4/4
   ============================================================ */
const STAFF = {
  eighthW: 26,          // 每列（八分音符）水平宽度
  step: 6,              // 半线距（线到相邻间）
  colsPerBar: 8,        // 4/4 拍一小节 = 8 个八分音符
  barsPerLine: 4,       // 每行谱表小节数
  headRx: 6, headRy: 4.4,
  stemLen: 42,          // 符干长度 ≈ 3.5 个线间
  diaPc: [0,0,1,1,2,3,4,4,5,5,6,6],   // 音级 → 自然音阶步（黑键取前一个自然音 + 变音记号）
  blackPc: [false,true,false,true,false,false,true,false,true,false,true,false],
  b4Dia: 34,                          // B4（中线）的自然音阶序数 (4*7+6)
  sharpOrder: [5,0,7,2,9,4,11],       // F C G D A E B（升号调号顺序，音级 pc）
  flatOrder: [11,4,9,2,7,0,5],        // B E A D G C F（降号调号顺序）
  sharpPos: {5:4,0:1,7:5,2:2,9:6,4:3,11:7},   // 升号在高音谱表的位置（相对中线 B4 的音阶步）
  flatPos:  {11:0,4:3,9:-1,2:2,7:-2,0:1,5:-3} // 降号在高音谱表的位置
};

// MIDI → 相对中线的音阶步数（+ 在上，B4 = 0，线位于偶数步）
function staffSteps(midi){
  const oct = Math.floor(midi / 12) - 1, pc = mod(midi);
  return (oct * 7 + STAFF.diaPc[pc]) - STAFF.b4Dia;
}
// 调号：（调性根音 pc + 大小调）→ {n: 升降号个数, sharp: 方向}
function keySignature(root, mode){
  if(root == null) return {n:0, sharp:true, pcs:[]};
  const rel = mode === 'minor' ? mod(root + 9) : root;   // 小调取其关系大调
  const MAJ_SHARP = {7:1,2:2,9:3,4:4,11:5,6:6,1:7}, MAJ_FLAT = {5:-1,10:-2,3:-3,8:-4,1:-5}; // G D A E B F# C# / F Bb Eb Ab Db
  let n = 0, sharp = true;
  if(MAJ_SHARP[rel] != null) n = MAJ_SHARP[rel];
  else if(MAJ_FLAT[rel] != null){ n = -MAJ_FLAT[rel]; sharp = false; }
  const order = sharp ? STAFF.sharpOrder : STAFF.flatOrder;
  return {n, sharp, pcs: order.slice(0, n)};
}

// —— 变音记号（全部用路径画，不依赖系统字体）——
function sharpPath(x, y, color){
  color = color || '#222';
  return `<path d="M ${x-3} ${y-7} L ${x-3} ${y+5} M ${x+1.5} ${y-8} L ${x+1.5} ${y+4}" stroke="${color}" stroke-width="1.5"/>` +
         `<path d="M ${x-6} ${y-2} L ${x+5.5} ${y-4} M ${x-6} ${y+3} L ${x+5.5} ${y+1}" stroke="${color}" stroke-width="2.2"/>`;
}
function naturalPath(x, y, color){
  color = color || '#222';
  return `<path d="M ${x-2.5} ${y-7} L ${x-2.5} ${y+4} M ${x+2.5} ${y-4} L ${x+2.5} ${y+7}" stroke="${color}" stroke-width="1.7"/>` +
         `<path d="M ${x-2.5} ${y-1} L ${x+2.5} ${y-2.5} M ${x-2.5} ${y+4} L ${x+2.5} ${y+2.5}" stroke="${color}" stroke-width="1.7"/>`;
}
function flatPath(x, y, color){
  return `<path d="M ${x-1} ${y-9} L ${x-1} ${y+3} C ${x-1} ${y+8.5} ${x+5.5} ${y+8} ${x+5.5} ${y+2.5} C ${x+5.5} ${y-1.5} ${x-1} ${y-0.5} ${x-1} ${y+3} Z" fill="${color || '#222'}"/>`;
}
function accPath(kind, x, y, color){
  return kind === 'sharp' ? sharpPath(x, y, color) : kind === 'natural' ? naturalPath(x, y, color) : flatPath(x, y, color);
}

// 高音谱号（抽象 G 谱号：主笔 + 螺旋）
function clefPath(x, yMid, color){
  const yG = yMid + STAFF.step * 2, cx = x + 8;
  return `<g fill="none" stroke="${color || '#222'}" stroke-width="2.2" stroke-linecap="round">` +
    `<path d="M ${cx+2} ${yMid-40} C ${cx-10} ${yMid-30} ${cx-8} ${yG-10} ${cx} ${yG-6} ` +
          `C ${cx+6} ${yG-3} ${cx+5} ${yG+3} ${cx-1} ${yG+5} ` +
          `C ${cx-8} ${yG+8} ${cx-8} ${yMid+26} ${cx-2} ${yMid+38} ` +
          `C ${cx+1} ${yMid+44} ${cx+8} ${yMid+42} ${cx+7} ${yMid+36}"/>` +
    `<circle cx="${cx+0.5}" cy="${yG-1}" r="5.8"/></g>`;
}

// 把 melody 音符流拆成谱面符号：跨小节拆分 + 时值分解 + 休止符填充
function buildStaffSymbols(){
  const syms = [];
  const at = col => syms.find(s => !s.rest && s.col === col);
  for(const run of state.melody){
    let remaining = run.dur, col = run.start;
    while(remaining > 0){
      const take = Math.min(remaining, STAFF.colsPerBar - (col % STAFF.colsPerBar));
      let r = take, c = col;
      for(const u of [8,4,3,2,1]) while(r >= u){ syms.push({midi:run.midi, col:c, dur:u, rest:false}); c += u; r -= u; }
      col += take; remaining -= take;
    }
  }
  const nBars = Math.max(1, Math.ceil(GRID_COLS / STAFF.colsPerBar));
  for(let b = 0; b < nBars; b++){
    const cols = Math.min(STAFF.colsPerBar, GRID_COLS - b * STAFF.colsPerBar);
    let c = 0;
    while(c < cols){
      const s = at(b * STAFF.colsPerBar + c);
      if(s){ c += s.dur; continue; }
      let g = 1;
      while(c + g < cols && !at(b * STAFF.colsPerBar + c + g)) g++;
      let r = g, cc = c;
      for(const u of [4,2,1]) while(r >= u){ syms.push({rest:true, col:b * STAFF.colsPerBar + cc, dur:u}); cc += u; r -= u; }
      c += g;
    }
  }
  return syms.sort((a, b) => a.col - b.col);
}

function renderStaffSVG(){
  const sig = keySignature(state.key ? state.key.root : null, state.key ? state.key.mode : 'major');
  const syms = buildStaffSymbols();
  const nBars = Math.max(1, Math.ceil(GRID_COLS / STAFF.colsPerBar));
  const nLines = Math.ceil(nBars / STAFF.barsPerLine);
  const barW = STAFF.colsPerBar * STAFF.eighthW + 10;
  const xClef = 16, sigW = sig.n * 9 + 8, tsW = 26;
  const xMusic1 = xClef + 34 + sigW + tsW, xMusicN = xClef + 34 + 8;
  const W = Math.max(xMusic1, xMusicN) + Math.min(STAFF.barsPerLine, nBars) * barW + 10;
  const headerH = 30, lineH = 98, topPad = 48, botPad = 50;
  const H = headerH + nLines * lineH + 8;
  const yMid0 = headerH + topPad;
  const keyText = state.key ? (PC[state.key.root] + (state.key.mode === 'major' ? ' 大调' : ' 小调')) : 'C';
  let out = `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMin meet" font-family="inherit">`;
  out += `<text x="8" y="18" font-size="13" fill="#8a8a7a">五线谱 · 网格实时渲染</text>`;
  out += `<text x="${W-8}" y="18" font-size="12" fill="#8a8a7a" text-anchor="end">1 = ${keyText.replace(' ', '')} · 4/4 · ♩ = ${state.bpm} BPM</text>`;

  for(let li = 0; li < nLines; li++){
    const yMid = yMid0 + li * lineH, yTop = yMid - 24, yBot = yMid + 24;
    const xMusic = li === 0 ? xMusic1 : xMusicN;
    // 五条线
    for(let l = 0; l < 5; l++) out += `<line x1="${xClef-6}" y1="${yTop + l * 12}" x2="${W - 8}" y2="${yTop + l * 12}" stroke="#222" stroke-width="1"/>`;
    out += clefPath(xClef, yMid);
    if(li === 0){
      let ax = xClef + 36;
      const pos = sig.sharp ? STAFF.sharpPos : STAFF.flatPos;
      sig.pcs.forEach(pc => {
        out += accPath(sig.sharp ? 'sharp' : 'flat', ax, yMid - pos[pc] * STAFF.step);
        ax += 9;
      });
      out += `<text x="${ax + 8}" y="${yMid - 3}" font-size="15" font-weight="700" fill="#222" text-anchor="middle">4</text>`;
      out += `<text x="${ax + 8}" y="${yMid + 15}" font-size="15" font-weight="700" fill="#222" text-anchor="middle">4</text>`;
    }
    // 本行小节
    const barFrom = li * STAFF.barsPerLine, barTo = Math.min(nBars, barFrom + STAFF.barsPerLine);
    for(let b = barFrom; b < barTo; b++){
      const xBar = xMusic + (b - barFrom) * barW;
      const barSyms = syms.filter(s => s.col >= b * STAFF.colsPerBar && s.col < (b + 1) * STAFF.colsPerBar);
      for(const s of barSyms){
        const cx = xBar + (s.col % STAFF.colsPerBar) * STAFF.eighthW + s.dur * STAFF.eighthW / 2;
        if(s.rest){ out += restSymbol(cx, s.dur, yMid); continue; }
        out += noteSymbol(s, cx, yMid, sig);
      }
      // 符杠：同拍相邻、同方向的八分音符连成一杠；落单的画符尾
      const eis = barSyms.filter(s => !s.rest && s.dur === 1 && s._stem);
      const beamed = new Set();
      for(let i = 0; i + 1 < eis.length; i++){
        const a = eis[i], b2 = eis[i + 1];
        if(a._stem.up !== b2._stem.up || b2.col !== a.col + 1) continue;
        if(Math.floor((a.col % STAFF.colsPerBar) / 2) !== Math.floor((b2.col % STAFF.colsPerBar) / 2)) continue;
        const x1 = Math.min(a._stem.sx, b2._stem.sx), x2 = Math.max(a._stem.sx, b2._stem.sx);
        out += a._stem.up
          ? `<rect x="${x1}" y="${Math.min(a._stem.tip, b2._stem.tip) - 5.5}" width="${x2 - x1}" height="5.5" fill="#222"/>`
          : `<rect x="${x1}" y="${Math.max(a._stem.tip, b2._stem.tip)}" width="${x2 - x1}" height="5.5" fill="#222"/>`;
        beamed.add(a); beamed.add(b2);
      }
      for(const e of eis){
        if(beamed.has(e)) continue;
        const {sx, tip, up} = e._stem;
        out += up
          ? `<path d="M ${sx} ${tip} L ${sx + 8} ${tip + 3.5} C ${sx + 11} ${tip + 8} ${sx + 9} ${tip + 13} ${sx + 2} ${tip + 15} L ${sx} ${tip + 12} Z" fill="#222"/>`
          : `<path d="M ${sx} ${tip} L ${sx + 8} ${tip - 3.5} C ${sx + 11} ${tip - 8} ${sx + 9} ${tip - 13} ${sx + 2} ${tip - 15} L ${sx} ${tip - 12} Z" fill="#222"/>`;
      }
      // 小节线
      const bx = xBar + STAFF.colsPerBar * STAFF.eighthW + 5;
      const last = b === nBars - 1;
      out += `<line x1="${bx}" y1="${yTop}" x2="${bx}" y2="${yBot}" stroke="#222" stroke-width="${last ? 1 : 1}"/>`;
      if(last) out += `<line x1="${bx + 3.5}" y1="${yTop}" x2="${bx + 3.5}" y2="${yBot}" stroke="#222" stroke-width="3"/>`;
    }
  }
  return out + '</svg>';
}

// 单个音符符号（符头 / 符干 / 附点 / 变音记号 / 加线）
function noteSymbol(s, cx, yMid, sig){
  const st = staffSteps(s.midi), y = yMid - st * STAFF.step;
  const pc = mod(s.midi), black = STAFF.blackPc[pc];
  let g = '';
  // 加线
  if(st > 4) for(let l = 6; l <= st; l += 2) g += `<line x1="${cx-9}" y1="${yMid - l * STAFF.step}" x2="${cx+9}" y2="${yMid - l * STAFF.step}" stroke="#222" stroke-width="1"/>`;
  if(st < -4) for(let l = -6; l >= st; l -= 2) g += `<line x1="${cx-9}" y1="${yMid - l * STAFF.step}" x2="${cx+9}" y2="${yMid - l * STAFF.step}" stroke="#222" stroke-width="1"/>`;
  // 变音记号：调号外黑键 → 升号；调号内自然音 → 还原号；调号方向为降且黑键非调内 → 降号
  const inSig = sig.pcs.includes(pc);
  let acc = '';
  if(black && !inSig) acc = sig.sharp ? 'sharp' : 'flat';
  if(!black && inSig) acc = 'natural';
  if(acc) g += accPath(acc, cx - 15, y);
  // 附点
  if(s.dur === 3 || s.dur === 6){
    const onLine = (Math.round((yMid - y) / STAFF.step) % 2) === 0;
    g += `<circle cx="${cx + 11}" cy="${onLine ? y - STAFF.step : y}" r="1.8" fill="#222"/>`;
  }
  // 符头 + 符干
  const hollow = s.dur >= 4;
  const rx = s.dur >= 8 ? 7.6 : STAFF.headRx, ry = s.dur >= 8 ? 5 : STAFF.headRy;
  g += `<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(-16 ${cx} ${y})" fill="${hollow ? '#fff' : '#222'}" stroke="#222" stroke-width="1.4"/>`;
  if(s.dur < 8){
    const up = st < 0;                     // 中线以下符干朝上（右侧），以上朝下（左侧）
    const sx = cx + (up ? 5 : -5);
    const tip = up ? y - STAFF.stemLen : y + STAFF.stemLen;
    g += `<line x1="${sx}" y1="${y}" x2="${sx}" y2="${tip}" stroke="#222" stroke-width="1.4"/>`;
    s._stem = {sx, tip, up, cx};
  }
  return g;
}

// 休止符（v1：八分 / 四分 / 二分）
function restSymbol(cx, dur, yMid){
  if(dur >= 4) return `<rect x="${cx - 6.5}" y="${yMid - 4}" width="13" height="4" fill="#222"/>`;
  if(dur === 2) return `<path d="M ${cx-4} ${yMid-8} C ${cx+4} ${yMid-10} ${cx+5} ${yMid-2} ${cx-2} ${yMid} C ${cx-6} ${yMid+2} ${cx-4} ${yMid+8} ${cx+3} ${yMid+6}" fill="none" stroke="#222" stroke-width="2.2" stroke-linecap="round"/>`;
  return `<path d="M ${cx-2} ${yMid+9} L ${cx+1.5} ${yMid-3}" stroke="#222" stroke-width="2.4" stroke-linecap="round"/><circle cx="${cx+2.5}" cy="${yMid-8}" r="1.9" fill="#222"/>`;
}

// —— 交互 ——
let staffVisible = false;
function toggleStaff(){
  const box = document.getElementById('staffBox'), btn = document.getElementById('staffBtn');
  staffVisible = !staffVisible;
  btn.classList.toggle('on', staffVisible);
  if(!staffVisible){ box.style.display = 'none'; return; }
  loadMelodyFromGrid();
  if(!state.melody.length){ setNotice('请先点击方格输入音符，再查看五线谱。'); staffVisible = false; btn.classList.remove('on'); return; }
  renderStaff();
  box.style.display = 'block';
  box.scrollIntoView({behavior:'smooth', block:'nearest'});
}
function renderStaff(){
  loadMelodyFromGrid();
  const box = document.getElementById('staffBox');
  if(!state.melody.length){ box.innerHTML = '<div style="padding:12px;color:#8a8a7a;font-size:12px">网格为空 —— 输入音符后此处实时显示五线谱。</div>'; return; }
  box.innerHTML = renderStaffSVG();
}
document.getElementById('staffBtn').onclick = toggleStaff;
// 谱面可见时，网格有任何改动都重绘
['click'].forEach(ev => document.addEventListener(ev, e => {
  if(!staffVisible) return;
  if(e.target.closest && (e.target.closest('#rollGrid') || e.target.closest('#clearRoll') || e.target.closest('.chip[data-preset]') || e.target.closest('#tempo'))) renderStaff();
}));
