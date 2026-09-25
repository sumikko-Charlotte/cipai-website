/* >>> file: src/js/17-waveform-pitch.js */
/* ============================================================
   17. 波形绘制 / 实时音高
   ============================================================ */
const WAVE_IDS = ['waveCanvas','waveCanvas2'];
function drawWave(data){
  WAVE_IDS.forEach(id => {
    const cv = document.getElementById(id);
    if(!cv || cv.offsetParent === null) return;
    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth, H = cv.clientHeight;
    cv.width = W*dpr; cv.height = H*dpr;
    const g = cv.getContext('2d');
    g.setTransform(dpr,0,0,dpr,0,0);
    g.clearRect(0,0,W,H);
    const css = getComputedStyle(document.body);
    g.strokeStyle = css.getPropertyValue('--border-str').trim();
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(0,H/2); g.lineTo(W,H/2); g.stroke();
    if(!data || !data.length) return;
    const n = Math.min(data.length, 1400), stride = Math.max(1, Math.floor(data.length/n));
    g.strokeStyle = css.getPropertyValue('--accent').trim();
    g.lineWidth = 1.6;
    g.beginPath();
    for(let i = 0; i < n; i++){
      const x = i*(W/n), y = H/2 - clamp(data[i*stride], -1, 1)*(H/2 - 6);
      i ? g.lineTo(x,y) : g.moveTo(x,y);
    }
    g.stroke();
  });
}
function drawIdleWave(){
  WAVE_IDS.forEach(id => {
    const cv = document.getElementById(id);
    if(!cv || cv.offsetParent === null) return;
    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth, H = cv.clientHeight;
    cv.width = W*dpr; cv.height = H*dpr;
    const g = cv.getContext('2d');
    g.setTransform(dpr,0,0,dpr,0,0);
    g.clearRect(0,0,W,H);
    g.strokeStyle = getComputedStyle(document.body).getPropertyValue('--accent').trim();
    g.globalAlpha = .32; g.lineWidth = 1.4;
    g.beginPath();
    for(let x = 0; x < W; x++){
      const y = H/2 + Math.sin(x/26)*7*Math.sin(x/97);
      x ? g.lineTo(x,y) : g.moveTo(x,y);
    }
    g.stroke();
    g.globalAlpha = 1;
  });
}
function quickPitch(buf, sr){
  let bestLag = -1, best = 0, norm = 0;
  for(let i = 0; i < buf.length; i++) norm += buf[i]*buf[i];
  if(norm <= 0) return 0;
  const lagMin = Math.max(2, Math.floor(sr/800)), lagMax = Math.floor(sr/70);
  for(let lag = lagMin; lag <= lagMax; lag++){
    let c = 0;
    for(let i = 0; i < buf.length - lag; i++) c += buf[i]*buf[i+lag];
    const n = c/norm;
    if(n > best){ best = n; bestLag = lag; }
  }
  return (bestLag > 0 && best > .3) ? sr/bestLag : 0;
}
