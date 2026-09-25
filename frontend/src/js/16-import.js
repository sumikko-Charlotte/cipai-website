/* >>> file: src/js/16-import.js */
/* ============================================================
   16. 导入：音频音高提取 / MIDI 解析
   ============================================================ */
function extractNotes(f32, sr){
  const frame = 1024, hop = 512;
  const lagMin = Math.max(2, Math.floor(sr/800)), lagMax = Math.floor(sr/80);
  const raw = [];
  for(let off = 0; off + frame <= f32.length; off += hop){
    let sum = 0;
    for(let i = 0; i < frame; i++) sum += f32[off+i]*f32[off+i];
    raw.push({rms:Math.sqrt(sum/frame), freq:0, off:off});
  }
  if(!raw.length) return [];
  const sorted = raw.map(r => r.rms).sort((a,b) => a-b);
  const thr = Math.max(.007, (sorted[Math.floor(sorted.length*.7)] || .01)*.42);

  raw.forEach(r => {
    if(r.rms < thr) return;
    const off = r.off;
    let norm = 0;
    for(let i = 0; i < frame; i++) norm += f32[off+i]*f32[off+i];
    if(norm <= 0) return;
    let bestLag = -1, best = 0;
    for(let lag = lagMin; lag <= lagMax; lag++){
      if(off + lag + frame/2 >= f32.length) break;
      let c = 0;
      for(let i = 0; i < frame/2; i++) c += f32[off+i]*f32[off+i+lag];
      const n = c/norm;
      if(n > best){ best = n; bestLag = lag; }
    }
    if(bestLag > 0 && best > .34) r.freq = sr/bestLag;
  });

  const freqs = raw.map(r => r.freq);
  const filt = freqs.map((f, i) => {
    const w = freqs.slice(Math.max(0,i-2), Math.min(freqs.length, i+3)).filter(v => v > 0);
    if(!w.length) return 0;
    w.sort((a,b) => a-b);
    return w[Math.floor(w.length/2)];
  });

  const notes = [];
  let cur = null;
  filt.forEach((f, i) => {
    const midi = f > 0 ? Math.round(69 + 12*Math.log2(f/440)) : 0;
    if(f > 0 && midi >= 45 && midi <= 88){
      if(cur && Math.abs(cur.midi - midi) <= 1){ cur.frames++; cur.midi = midi; cur.end = i; }
      else { if(cur && cur.frames >= 3) notes.push(cur); cur = {midi:midi, frames:1, start:i, end:i}; }
    } else if(cur){ if(cur.frames >= 3) notes.push(cur); cur = null; }
  });
  if(cur && cur.frames >= 3) notes.push(cur);
  if(!notes.length) return [];

  const t0 = notes[0].start, t1 = notes[notes.length-1].end + 1;
  const span = Math.max(1, t1 - t0);
  return notes.map(n => {
    const s = clamp(Math.round((n.start - t0)/span*GRID_COLS), 0, GRID_COLS-1);
    const e = clamp(Math.round((n.end + 1 - t0)/span*GRID_COLS), s+1, GRID_COLS);
    return {midi:n.midi, start:s, dur:Math.max(1, e - s)};
  });
}

function parseMidi(buffer){
  const dv = new DataView(buffer);
  let p = 0;
  const rd = n => { let s = ''; for(let i = 0; i < n; i++) s += String.fromCharCode(dv.getUint8(p++)); return s; };
  if(rd(4) !== 'MThd') throw new Error('不是标准 MIDI 文件');
  const hlen = dv.getUint32(p); p += 4;
  p += 2;
  const ntrk = dv.getUint16(p); p += 2;
  const div = dv.getUint16(p); p += 2;
  p += Math.max(0, hlen - 6);
  const tracks = [];
  for(let t = 0; t < ntrk && p + 8 <= dv.byteLength; t++){
    if(rd(4) !== 'MTrk') break;
    const len = dv.getUint32(p); p += 4;
    const end = Math.min(p + len, dv.byteLength);
    const notes = [], active = {};
    let tick = 0, status = 0;
    while(p < end){
      let d = 0, b;
      do { b = dv.getUint8(p++); d = (d << 7) | (b & 0x7f); } while(b & 0x80);
      tick += d;
      if(p >= end) break;
      let st = dv.getUint8(p);
      if(st & 0x80){ status = st; p++; } else { st = status; }
      const hi = st & 0xF0;
      if(hi === 0x90 || hi === 0x80){
        const note = dv.getUint8(p++), vel = dv.getUint8(p++);
        if(hi === 0x90 && vel > 0){ (active[note] = active[note] || []).push(tick); }
        else {
          const arr = active[note];
          if(arr && arr.length){
            const on = arr.shift();
            if(tick > on) notes.push({start:on, end:tick, pitch:note});
          }
        }
      }
      else if(hi === 0xA0 || hi === 0xB0 || hi === 0xE0) p += 2;
      else if(hi === 0xC0 || hi === 0xD0) p += 1;
      else if(st === 0xFF || st === 0xF0 || st === 0xF7){
        if(st === 0xFF) p += 1;
        let l = 0, bb;
        do { bb = dv.getUint8(p++); l = (l << 7) | (bb & 0x7f); } while(bb & 0x80);
        p += l;
      }
      else p += 1;
    }
    p = end;
    if(notes.length) tracks.push(notes);
  }
  if(!tracks.length) throw new Error('未找到音符事件');

  const pick = tracks.reduce((a, b) => (b.length > a.length ? b : a), []);
  const maxEnd = Math.max.apply(null, pick.map(n => n.end));
  const cols = new Array(GRID_COLS).fill(null);
  for(let c = 0; c < GRID_COLS; c++){
    const t0 = (c/GRID_COLS)*maxEnd, t1 = ((c+1)/GRID_COLS)*maxEnd;
    let best = null;
    pick.forEach(n => {
      if(n.start < t1 && n.end > t0 && (best === null || n.pitch > best)) best = n.pitch;
    });
    if(best !== null){
      while(best < ROW_LOW) best += 12;
      while(best > ROW_LOW + GRID_ROWS - 1) best -= 12;
      cols[c] = best;
    }
  }
  return {cols:cols, noteCount:pick.length, trackCount:tracks.length};
}
