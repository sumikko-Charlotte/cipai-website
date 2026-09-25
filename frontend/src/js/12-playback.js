/* >>> file: src/js/12-playback.js */
/* ============================================================
   12. 播放控制 / 卷帘绘制
   ============================================================ */
function startPlay(){
  stopPlay();
  if(!state.events.length) return;
  const ctx = ensureCtx();
  const master = ctx.createGain();
  master.gain.value = (+document.getElementById('vol').value)/100 * .9;
  master.connect(ctx.destination);
  playState.master = master;
  playState.stepSec = 60/state.bpm/2;
  const t0 = ctx.currentTime + .12;
  state.events.forEach(ev => playEvent(ctx, master, ev, t0, playState.stepSec));
  playState.startedAt = t0;
  playState.playing = true;
  document.getElementById('playBtn').textContent = '暂停';
  tick();
}
function tick(){
  cancelAnimationFrame(playState.raf);
  const ctx = state.audioCtx;
  const draw = () => {
    const step = (ctx.currentTime - playState.startedAt)/playState.stepSec;
    drawRoll(step);
    const bar = Math.floor(step/4);
    document.querySelectorAll('.cblk').forEach((b, i) => b.classList.toggle('now', i === bar));
    if(step >= GRID_COLS + 1.2){ stopPlay(); return; }
    playState.raf = requestAnimationFrame(draw);
  };
  draw();
}
function stopPlay(){
  cancelAnimationFrame(playState.raf);
  if(playState.master){ try{ playState.master.disconnect(); }catch(e){} playState.master = null; }
  playState.playing = false;
  const btn = document.getElementById('playBtn');
  if(btn) btn.textContent = '播放';
  if(state.events.length) drawRoll(-1);
}
function drawRoll(playStep){
  const cv = document.getElementById('rollCanvas');
  if(!cv || cv.offsetParent === null) return;
  const dpr = window.devicePixelRatio || 1;
  const W = cv.clientWidth, H = cv.clientHeight;
  cv.width = W*dpr; cv.height = H*dpr;
  const g = cv.getContext('2d');
  g.setTransform(dpr,0,0,dpr,0,0);
  g.clearRect(0,0,W,H);
  const css = getComputedStyle(document.body);
  const cB = css.getPropertyValue('--border').trim();
  const cBs = css.getPropertyValue('--border-str').trim();
  const cMel = css.getPropertyValue('--accent').trim();
  const cChd = css.getPropertyValue('--accent2').trim();
  const cBas = css.getPropertyValue('--track-bass').trim();

  let lo = 48, hi = 76;
  if(state.events.length){
    const ps = state.events.map(e => e.pitch);
    lo = Math.min.apply(null, ps) - 2;
    hi = Math.max.apply(null, ps) + 2;
  }
  const span = Math.max(12, hi - lo);
  const padL = 6, padR = 6, padT = 8, padB = 8;
  const x0 = e => padL + (e.start/GRID_COLS)*(W - padL - padR);
  const x1 = e => padL + ((e.start + e.dur)/GRID_COLS)*(W - padL - padR);
  const y = p => H - padB - ((p - lo)/span)*(H - padT - padB);

  for(let c = 0; c <= GRID_COLS; c++){
    const x = padL + (c/GRID_COLS)*(W - padL - padR);
    g.strokeStyle = (c % 4 === 0) ? cBs : cB;
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(x,0); g.lineTo(x,H); g.stroke();
  }
  state.events.forEach(ev => {
    const col = ev.voice === 'bass' ? cBas : (ev.voice === 'chord' ? cChd : cMel);
    const yy = y(ev.pitch), h = Math.max(3, (H - padT - padB)/span*.72);
    g.fillStyle = col;
    g.globalAlpha = ev.voice === 'chord' ? .72 : .95;
    const rx = x0(ev), rw = Math.max(3, x1(ev) - x0(ev) - 1);
    g.beginPath();
    if(g.roundRect) g.roundRect(rx, yy - h/2, rw, h, 2); else g.rect(rx, yy - h/2, rw, h);
    g.fill();
    g.globalAlpha = 1;
  });
  if(playStep >= 0){
    const x = padL + clamp(playStep/GRID_COLS, 0, 1)*(W - padL - padR);
    g.strokeStyle = cMel; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x,0); g.lineTo(x,H); g.stroke();
  }
}
