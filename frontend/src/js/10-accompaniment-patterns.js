/* >>> file: src/js/10-accompaniment-patterns.js */
/* ============================================================
   10. 伴奏音型编排（16 种织体）
   ============================================================ */
function buildAccompaniment(){
  const st = STYLES[state.theme];
  const evs = [];
  state.melody.forEach(n => evs.push({pitch:n.midi, start:n.start, dur:n.dur, voice:'melody'}));

  state.chords.forEach(ch => {
    const base = 48 + ch.rootPc;
    const tones = CHORD_TONES[ch.type];
    const up = tones.map(iv => base + 12 + iv);
    const s = ch.start, d = ch.dur, bp = base - 12;

    evs.push({pitch:bp, start:s, dur:Math.min(d, 4), voice:'bass'});
    if(d >= 8) evs.push({pitch:bp, start:s + d/2, dur:d/2, voice:'bass'});

    switch(st.pat){
      case 'arpeggio':{
        const seq = [0,1,2,1,0,1,2,1,2,1,0,1,2,1,2,1];
        let i = 0;
        for(let t = s; t < s + d; t += 1) evs.push({pitch:up[seq[i++ % seq.length]], start:t, dur:1.4, voice:'chord'});
        break;
      }
      case 'counterpoint':{
        for(let t = s; t < s + d; t += 1){
          const top = ((t - s) % 2 === 0);
          evs.push({pitch: top ? up[(t - s) % up.length] : base + 12 + tones[(t - s) % tones.length], start:t, dur:1.6, voice:'chord'});
        }
        break;
      }
      case 'ballad':{
        const wide = tones.map(iv => base + 12 + iv).concat(tones.map(iv => base + 24 + iv));
        let i = 0;
        for(let t = s; t < s + d; t += 2){
          evs.push({pitch:wide[i % wide.length], start:t, dur:2.8, voice:'chord'});
          evs.push({pitch:wide[(i + 2) % wide.length], start:t + .5, dur:2.4, voice:'chord'});
          i++;
        }
        break;
      }
      case 'walking':{
        for(let t = s; t < s + d; t += 4){
          up.forEach(p => evs.push({pitch:p, start:t, dur:1.3, voice:'chord'}));
          up.forEach(p => evs.push({pitch:p, start:t + 2.66, dur:1.1, voice:'chord'}));
        }
        const sc = [0,3,5,7,10];
        for(let t = s; t < s + d; t += 2) evs.push({pitch:base - 12 + sc[Math.floor(Math.random()*sc.length)], start:t, dur:1.7, voice:'bass'});
        break;
      }
      case 'power':{
        for(let t = s; t < s + d; t += 2) up.forEach(p => evs.push({pitch:p, start:t, dur:1.75, voice:'chord'}));
        evs.push({pitch:bp, start:s, dur:1, voice:'bass'});
        evs.push({pitch:bp, start:s + 2, dur:1, voice:'bass'});
        break;
      }
      case 'block':{
        for(let t = s; t < s + d; t += 1){
          up.forEach(p => evs.push({pitch:p, start:t, dur:.85, voice:'chord'}));
          evs.push({pitch:bp, start:t, dur:.85, voice:'bass'});
        }
        break;
      }
      case 'chug':{
        for(let t = s; t < s + d; t += .5){
          evs.push({pitch:bp, start:t, dur:.45, voice:'bass'});
          if(Math.abs((t - s) % 1) < .01) up.forEach(p => evs.push({pitch:p, start:t, dur:1.7, voice:'chord'}));
        }
        break;
      }
      case 'funk16':{
        const pat = [1,0,1,1,0,1,0,1,1,0,1,0,1,1,0,1];
        for(let t = s; t < s + d; t += .5){
          const k = Math.round((t - s)*2);
          if(pat[k % pat.length]) evs.push({pitch:up[k % up.length], start:t, dur:.45, voice:'chord'});
        }
        for(let t = s; t < s + d; t += 1) evs.push({pitch:bp + (Math.random() < .3 ? 12 : 0), start:t + .5, dur:.6, voice:'bass'});
        break;
      }
      case 'offbeat':{
        for(let t = s; t < s + d; t += 2){
          up.forEach(p => evs.push({pitch:p, start:t + 1, dur:1.1, voice:'chord'}));
          evs.push({pitch:bp, start:t, dur:1.6, voice:'bass'});
        }
        break;
      }
      case 'pulse':{
        for(let t = s; t < s + d; t += 2) up.forEach(p => evs.push({pitch:p, start:t, dur:.95, voice:'chord'}));
        for(let t = s; t < s + d; t += 1) evs.push({pitch:Math.abs(t % 4) < .01 ? bp : bp + 12, start:t, dur:.8, voice:'bass'});
        break;
      }
      case 'lazy':{
        for(let t = s; t < s + d; t += 4){
          up.forEach(p => evs.push({pitch:p, start:t, dur:2.6, voice:'chord'}));
          up.forEach(p => evs.push({pitch:p, start:t + 2.7, dur:1.9, voice:'chord'}));
        }
        for(let t = s; t < s + d; t += 2) evs.push({pitch:bp, start:t + .3, dur:1.8, voice:'bass'});
        break;
      }
      case 'chip':{
        const seq = tones.concat(tones).map((iv, i) => base + 12 + iv + (i >= tones.length ? 12 : 0));
        let i = 0;
        for(let t = s; t < s + d; t += .5) evs.push({pitch:seq[i++ % seq.length], start:t, dur:.42, voice:'chord'});
        for(let t = s; t < s + d; t += 1) evs.push({pitch:bp, start:t, dur:.8, voice:'bass'});
        break;
      }
      case 'fingerpick':{
        const seq = [0,2,1,2,0,2,1,2];
        let i = 0;
        for(let t = s; t < s + d; t += 1){
          const isB = (i % 4 === 0);
          evs.push({pitch: isB ? bp : up[seq[i % seq.length]], start:t, dur:1.5, voice:(isB ? 'bass' : 'chord')});
          i++;
        }
        break;
      }
      case 'strum':{
        const pat = [1,0,1,1,0,1,1,0];
        let i = 0;
        for(let t = s; t < s + d; t += 1){
          if(pat[i % pat.length]) up.forEach((p, j) => evs.push({pitch:p, start:t + j*.045, dur:1.3, voice:'chord'}));
          i++;
        }
        for(let t = s; t < s + d; t += 2) evs.push({pitch:bp, start:t, dur:1.6, voice:'bass'});
        break;
      }
      case 'guzheng':{
        const pts = [0,2,4,7,9].map(iv => base + 12 + iv);
        const seq = [0,1,2,3,4,3,2,1];
        let i = 0;
        for(let t = s; t < s + d; t += 1) evs.push({pitch:pts[seq[i++ % seq.length]], start:t, dur:1.2, voice:'chord'});
        break;
      }
    }
  });

  evs.sort((a,b) => a.start - b.start || (a.voice === 'bass' ? -1 : 1));
  state.events = evs;
}
