/* >>> file: src/js/08-key-detect.js */
/* ============================================================
   8. 调性判定（Krumhansl 音级轮廓）
   ============================================================ */
const KRUMA_MAJ = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88];
const KRUMA_MIN = [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
function pitchHistogram(melody){
  const h = new Array(12).fill(0);
  melody.forEach(n => { h[mod(n.midi)] += n.dur; });
  const sum = h.reduce((a,b) => a+b, 0) || 1;
  return h.map(v => v/sum);
}
function correlate(a, b){
  const n = a.length;
  const ma = a.reduce((x,y)=>x+y,0)/n, mb = b.reduce((x,y)=>x+y,0)/n;
  let num = 0, da = 0, db = 0;
  for(let i = 0; i < n; i++){
    const x = a[i]-ma, y = b[i]-mb;
    num += x*y; da += x*x; db += y*y;
  }
  return (da && db) ? num/Math.sqrt(da*db) : -1;
}
function detectKey(melody){
  const h = pitchHistogram(melody);
  let best = {root:0, mode:'major', score:-2};
  for(let r = 0; r < 12; r++){
    const cm = correlate(h, KRUMA_MAJ.map((_,i) => h[mod(i - r)]));
    const cn = correlate(h, KRUMA_MIN.map((_,i) => h[mod(i - r)]));
    if(cm > best.score) best = {root:r, mode:'major', score:cm};
    if(cn > best.score) best = {root:r, mode:'minor', score:cn};
  }
  return best;
}
