/* >>> file: src/js/09-hmm-viterbi.js */
/* ============================================================
   9. HMM + 维特比解码
   ============================================================ */
function barHistogram(cells){
  const h = new Array(12).fill(0);
  let total = 0;
  cells.forEach(m => { if(m !== null){ h[mod(m)] += 1; total++; } });
  if(!total) return {h:new Array(12).fill(0), total:0};
  return {h:h.map(v => v/total), total};
}
function emission(hist, rootPc, type, scalePcs){
  let s = 0;
  const tones = CHORD_TONES[type].map(iv => mod(rootPc + iv));
  for(let pc = 0; pc < 12; pc++){
    const w = hist[pc];
    if(!w) continue;
    if(tones.indexOf(pc) !== -1){ s += w*2.0; if(pc === mod(rootPc)) s += w*.8; }
    else if(scalePcs.indexOf(pc) !== -1) s -= w*.45;
    else s -= w*1.3;
  }
  return s*4.0;
}
function viterbiDecode(grid, key){
  const colsPerBar = 4;
  const nBars = Math.max(1, Math.ceil(GRID_COLS/colsPerBar));
  const mode = key.mode;
  const scalePcs = (mode === 'major' ? [0,2,4,5,7,9,11] : [0,2,3,5,7,8,10]).map(iv => mod(key.root + iv));
  const st = STYLES[state.theme];
  const cands = DIATONIC[mode].map(c => {
    const rootPc = mod(key.root + c.deg);
    let type = c.type;
    if(st.sev > 0 && (type === 'maj' || type === 'min') && Math.random() < st.sev){
      type = (type === 'maj') ? (c.roman === 'V' ? 'dom7' : 'maj7') : 'min7';
    }
    return {rootPc, type, roman:c.roman};
  });
  const trans = TRANS[mode], bias = st.bias || {};
  const bars = [];
  for(let b = 0; b < nBars; b++) bars.push(barHistogram(grid.slice(b*colsPerBar, b*colsPerBar + colsPerBar)));

  const N = cands.length, dp = [], bp = [];
  for(let b = 0; b < nBars; b++){
    dp.push(new Array(N).fill(-1e9)); bp.push(new Array(N).fill(0));
    for(let i = 0; i < N; i++){
      const c = cands[i];
      const emit = emission(bars[b].h, c.rootPc, c.type, scalePcs);
      const sb = bias[c.roman] || 0;
      if(b === 0){ dp[b][i] = emit + sb*1.4; bp[b][i] = -1; }
      else{
        let bestV = -1e9, bestJ = 0;
        for(let j = 0; j < N; j++){
          const t = (trans[cands[j].roman] && trans[cands[j].roman][c.roman] !== undefined) ? trans[cands[j].roman][c.roman] : -.9;
          const v = dp[b-1][j] + t*2.2;
          if(v > bestV){ bestV = v; bestJ = j; }
        }
        dp[b][i] = emit + sb*1.4 + bestV;
        bp[b][i] = bestJ;
      }
    }
  }
  let last = 0;
  for(let i = 1; i < N; i++) if(dp[nBars-1][i] > dp[nBars-1][last]) last = i;
  const idx = new Array(nBars); idx[nBars-1] = last;
  for(let b = nBars-2; b >= 0; b--) idx[b] = bp[b+1][idx[b+1]];

  const out = [];
  idx.forEach((i, b) => {
    const c = cands[i];
    const item = {rootPc:c.rootPc, type:c.type, roman:c.roman, start:b*colsPerBar, dur:colsPerBar, label:chordLabel(c.rootPc, c.type)};
    const prev = out[out.length-1];
    if(prev && prev.label === item.label && prev.start + prev.dur === item.start) prev.dur += item.dur;
    else out.push(item);
  });
  return out;
}
