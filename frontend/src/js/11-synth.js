/* >>> file: src/js/11-synth.js */
/* ============================================================
   11. 合成器
   ============================================================ */
function ensureCtx(){
  if(!state.audioCtx) state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if(state.audioCtx.state === 'suspended') state.audioCtx.resume();
  return state.audioCtx;
}
function makeDrive(ctx, amount){
  const ws = ctx.createWaveShaper();
  const n = 1024, curve = new Float32Array(n), k = amount;
  for(let i = 0; i < n; i++){
    const x = (i*2)/n - 1;
    curve[i] = (1 + k)*x / (1 + k*Math.abs(x));
  }
  ws.curve = curve; ws.oversample = '2x';
  return ws;
}
function instDef(voice){
  if(voice === 'bass') return BASS_INSTRUMENTS[state.bassInst];
  const b = INSTRUMENTS[state.chordInst];
  if(voice === 'melody'){
    return {osc:b.osc, a:Math.max(.008, b.a), d:b.d*.7, s:b.s, r:b.r*.8, cut:b.cut,
            drive:Math.max(0, b.drive*.4), gain:b.gain*1.15, vib:b.vib};
  }
  return b;
}
function playEvent(ctx, dest, ev, t0, secPerStep){
  const def = instDef(ev.voice);
  if(!def) return;
  const t = t0 + ev.start*secPerStep;
  const dur = Math.max(.07, ev.dur*secPerStep);

  const g = ctx.createGain();
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = def.cut || 2600;
  lp.Q.value = .7;

  const peak = def.gain || .12;
  const a = Math.max(.002, def.a), d = def.d, sus = def.s, rel = def.r;
  const tA = t + a, tD = tA + d;
  const tR = Math.max(tD + .012, t + dur);
  const tEnd = tR + rel;

  g.gain.setValueAtTime(.0001, t);
  g.gain.linearRampToValueAtTime(peak, tA);
  g.gain.linearRampToValueAtTime(peak*sus, tD);
  g.gain.setValueAtTime(peak*sus, tR);
  g.gain.linearRampToValueAtTime(.0001, tEnd);

  let head = lp;
  if(def.drive > 0){
    const dr = makeDrive(ctx, def.drive);
    lp.connect(dr); head = dr;
  }
  head.connect(g); g.connect(dest);

  let vibGain = null;
  if(def.vib > 0){
    const vo = ctx.createOscillator(), vg = ctx.createGain();
    vo.frequency.value = 5.2; vg.gain.value = def.vib;
    vo.connect(vg); vo.start(t); vo.stop(tEnd + .05);
    vibGain = vg;
  }
  (def.osc || [{type:'triangle',det:0,g:1}]).forEach(o => {
    const osc = ctx.createOscillator(), og = ctx.createGain();
    osc.type = o.type;
    osc.frequency.value = mtof(ev.pitch + (o.oct ? o.oct*12 : 0));
    osc.detune.value = o.det || 0;
    og.gain.value = o.g || 1;
    if(vibGain) vibGain.connect(osc.detune);
    osc.connect(og); og.connect(lp);
    osc.start(t); osc.stop(tEnd + .08);
  });
}
