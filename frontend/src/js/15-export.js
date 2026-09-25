/* >>> file: src/js/15-export.js */
/* ============================================================
   15. 导出：MIDI / WAV / JSON
   ============================================================ */
function vlq(n){
  const b = [n & 0x7f];
  n >>= 7;
  while(n > 0){ b.unshift((n & 0x7f) | 0x80); n >>= 7; }
  return b;
}
const be32 = v => [(v>>>24)&255,(v>>>16)&255,(v>>>8)&255,v&255];
const be16 = v => [(v>>>8)&255,v&255];
const s2b  = s => { const a = []; for(let i = 0; i < s.length; i++) a.push(s.charCodeAt(i) & 255); return a; };

function buildMidiBlob(){
  const PPQ = 480, UNIT = PPQ/2, us = Math.round(60000000/state.bpm);
  const tracks = [
    {name:'Melody', voice:'melody', program:0},
    {name:'Chords', voice:'chord',  program:0},
    {name:'Bass',   voice:'bass',   program:32}
  ];
  const out = [];
  out.push.apply(out, s2b('MThd')); out.push.apply(out, be32(6));
  out.push.apply(out, be16(1)); out.push.apply(out, be16(3)); out.push.apply(out, be16(PPQ));

  tracks.forEach((tr, ti) => {
    const evs = [];
    if(ti === 0){
      evs.push({tick:0, data:[0xFF,0x51,0x03,(us>>16)&255,(us>>8)&255,us&255]});
      evs.push({tick:0, data:[0xFF,0x58,0x04,4,2,24,8]});
    }
    evs.push({tick:0, data:[0xFF,0x03].concat(vlq(tr.name.length), s2b(tr.name))});
    evs.push({tick:0, data:[0xC0, tr.program]});
    state.events.filter(e => e.voice === tr.voice).forEach(n => {
      const on = Math.round(n.start*UNIT), off = Math.round((n.start + n.dur)*UNIT);
      const pitch = clamp(n.pitch, 0, 127);
      const vel = tr.voice === 'melody' ? 96 : (tr.voice === 'bass' ? 84 : 74);
      evs.push({tick:on,  data:[0x90, pitch, vel]});
      evs.push({tick:off, data:[0x80, pitch, 0]});
    });
    evs.push({tick:Math.round(GRID_COLS*UNIT), data:[0xFF,0x2F,0x00]});
    evs.sort((a,b) => a.tick - b.tick || (a.data[0] & 0xF0) - (b.data[0] & 0xF0));
    const body = [];
    let last = 0;
    evs.forEach(e => {
      body.push.apply(body, vlq(Math.max(0, e.tick - last)));
      body.push.apply(body, e.data);
      last = e.tick;
    });
    out.push.apply(out, s2b('MTrk')); out.push.apply(out, be32(body.length)); out.push.apply(out, body);
  });
  return new Blob([new Uint8Array(out)], {type:'audio/midi'});
}
function encodeWav(buf){
  const nCh = Math.min(2, buf.numberOfChannels), len = buf.length, sr = buf.sampleRate;
  const dataBytes = len*nCh*2;
  const ab = new ArrayBuffer(44 + dataBytes), v = new DataView(ab);
  const ws = (o, s) => { for(let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0,'RIFF'); v.setUint32(4, 36 + dataBytes, true); ws(8,'WAVE');
  ws(12,'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nCh, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr*nCh*2, true); v.setUint16(32, nCh*2, true); v.setUint16(34, 16, true);
  ws(36,'data'); v.setUint32(40, dataBytes, true);
  const ch = [];
  for(let c = 0; c < nCh; c++) ch.push(buf.getChannelData(c));
  let off = 44;
  for(let i = 0; i < len; i++) for(let c = 0; c < nCh; c++){
    const s = clamp(ch[c][i], -1, 1);
    v.setInt16(off, s < 0 ? s*0x8000 : s*0x7FFF, true);
    off += 2;
  }
  return new Blob([ab], {type:'audio/wav'});
}
async function renderOffline(bpm){
  const step = 60/bpm/2, dur = GRID_COLS*step + 3.0, sr = 44100;
  const octx = new OfflineAudioContext(2, Math.ceil(sr*dur), sr);
  const master = octx.createGain();
  master.gain.value = (+document.getElementById('vol').value)/100 * .9;
  master.connect(octx.destination);
  state.events.forEach(ev => playEvent(octx, master, ev, .05, step));
  return await octx.startRendering();
}
function download(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 900);
}
function stamp(){
  const d = new Date(), p = n => String(n).padStart(2,'0');
  return '' + d.getFullYear() + p(d.getMonth()+1) + p(d.getDate()) + '_' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
}
function baseName(){
  return 'accompaniment_' + STYLES[state.theme].en.replace(/[^A-Za-z]/g,'') + '_' + state.chordInst + '_' + stamp();
}
function exportMidi(){
  if(!state.events.length) return;
  download(buildMidiBlob(), baseName() + '.mid');
  logLine('已导出 MIDI：包含旋律 / 和弦 / 低音三个轨道，可在 DAW 中继续编辑', true);
}
function exportJson(){
  if(!state.events.length) return;
  const data = {
    style: state.theme,
    styleName: STYLES[state.theme].name,
    key: {root:PC[state.key.root], mode:state.key.mode, correlation:+state.key.score.toFixed(4)},
    bpm: state.bpm,
    timeSignature: '4/4',
    gridUnit: 'eighth note',
    instruments: {chord:state.chordInst, bass:state.bassInst},
    chords: state.chords.map(c => ({bar:Math.floor(c.start/4)+1, label:c.label, roman:c.roman, rootPc:c.rootPc, type:c.type})),
    melody: state.melody.map(n => ({midi:n.midi, name:mname(n.midi), start:n.start, dur:n.dur})),
    events: state.events.map(e => ({voice:e.voice, midi:e.pitch, name:mname(e.pitch), start:e.start, dur:e.dur}))
  };
  download(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}), baseName() + '.json');
  logLine('已导出 JSON：包含调性、和弦、旋律与全部伴奏事件，可直接喂给 Python 服务端', true);
}
async function exportWav(){
  if(!state.events.length) return;
  const btn = document.getElementById('dlWav');
  const old = btn.textContent;
  btn.textContent = '渲染中…'; btn.disabled = true;
  try{
    const buf = await renderOffline(state.bpm);
    download(encodeWav(buf), baseName() + '.wav');
    logLine('已导出 WAV：' + buf.duration.toFixed(2) + ' 秒 / 44.1kHz / 16bit 立体声' +
      (buf.duration > 60 ? '（长篇，文件较大）' : ''), true);
  }catch(e){
    setNotice('音频渲染失败：' + (e && e.message ? e.message : e));
  }
  btn.textContent = old; btn.disabled = false;
}
