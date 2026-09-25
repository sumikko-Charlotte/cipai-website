/* >>> file: src/js/20c-text-parse.js */
/* ============================================================
   20. 文字配乐 · 三、文本解析
   ============================================================ */
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const PUNCT_ALL = /[，。！？；：、,.!?;:""''（）()《》〈〉【】\[\]—…·~～\-_/\\|]/;
function stripPunct(s){ let o = ''; for(const ch of s) if(HANZI.test(ch)) o += ch; return o; }
function splitClauses(txt){
  const out = [];
  txt.split(/[\n\r]+/).forEach(line => {
    let buf = '';
    for(const ch of line){
      if(HANZI.test(ch)) buf += ch;
      else if(buf){ out.push(buf); buf = ''; }
    }
    if(buf) out.push(buf);
  });
  return out;
}
/* 剥离标题：首行不含句读、字数很短、且含已知词牌名时视为标题 */
function extractTitle(txt){
  const lines = txt.split(/[\n\r]+/).map(s => s.trim()).filter(Boolean);
  if(lines.length < 2) return {title:'', body:txt, drop:0};
  const first = lines[0];
  if(/[，。！？；、,.!?;]/.test(first)) return {title:'', body:txt, drop:0};
  const bare = stripPunct(first);
  if(!bare || bare.length > 12) return {title:'', body:txt, drop:0};
  const hit = CI_PAI.some(cp => bare.indexOf(cp.name) >= 0 || (cp.alt || []).some(a => bare.indexOf(a) >= 0));
  if(hit || bare.length <= 6) return {title:first, body:lines.slice(1).join('\n'), drop:1};
  return {title:'', body:txt, drop:0};
}
function splitSections(txt){
  return txt.split(/\n\s*\n/).map(sec =>
    sec.split(/[\n\r]+/).map(s => s.trim()).filter(Boolean)
  ).filter(a => a.length);
}

/* ---- 英文：音节与韵脚启发式 ---- */
function syllEn(word){
  let w = String(word).toLowerCase().replace(/[^a-z]/g, '');
  if(!w) return 0;
  w = w.replace(/(?:[^laeiouy]es|[^td]ed|[^laeiouy]e)$/, '');
  w = w.replace(/^y/, '');
  const m = w.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}
const EN_FUNC = ['a','an','the','and','or','but','of','to','in','on','at','for','with','as','is','are','was','were','be','am','i','you','he','she','it','we','they','my','your','his','her','its','our','their','that','this','if','so','no','not','do','did','does','can','will','would','could','should','when','then','than','from','by','up','down','out','all'];
function stressEn(word, syls){
  const w = String(word).toLowerCase().replace(/[^a-z]/g, '');
  if(EN_FUNC.indexOf(w) >= 0) return -1;
  if(syls <= 2) return 0;
  if(/(?:tion|sion|ity|ical|ial|ious|ient)$/.test(w)) return Math.max(0, syls - 2);
  return 0;
}
function enStressPattern(line){
  const words = line.split(/[\s—–-]+/).filter(Boolean);
  let pat = '';
  let syls = 0;
  words.forEach(w => {
    const n = syllEn(w) || 1;
    const s = stressEn(w, n);
    for(let i = 0; i < n; i++){ pat += (i === s) ? '/' : 'u'; syls++; }
  });
  return {pat, syls};
}
function rhymeTail(word){
  let w = String(word).toLowerCase().replace(/[^a-z]/g, '');
  /* 词尾不发音的 e 会吞掉韵脚（shore → shor），先去掉再取韵尾 */
  if(w.length > 2 && /[^aeiouy]e$/.test(w)) w = w.slice(0, -1);
  const m = w.match(/[aeiouy]+[^aeiouy]*$/);
  if(m) return m[0];
  return w.slice(-2);
}
