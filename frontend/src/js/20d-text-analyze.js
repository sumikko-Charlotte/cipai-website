/* >>> file: src/js/20d-text-analyze.js */
/* ============================================================
   20. 文字配乐 · 四、文本分析
   ============================================================ */
/* 词牌匹配：字数（40）+ 句数（20）+ 句式逐句相符（40）三重比对 */
function matchCiPai(clauses){
  const n = clauses.reduce((a, b) => a + b.length, 0);
  const shape = clauses.map(s => s.length);
  const list = CI_PAI.map(cp => {
    const dN = Math.abs(cp.n - n);
    const dL = Math.abs((cp.lines ? cp.lines.length : cp.lc) - shape.length);
    let sc = 0;
    if(cp.lines){
      sc += Math.max(0, 40 - dN * 1.2);
      sc += Math.max(0, 20 - dL * 2.5);
      const m = Math.min(cp.lines.length, shape.length);
      let same = 0;
      for(let i = 0; i < m; i++) if(cp.lines[i] === shape[i]) same++;
      sc += (same / Math.max(cp.lines.length, shape.length)) * 40;
    } else {
      sc += Math.max(0, 55 - dN * 1.5);
      sc += Math.max(0, 30 - dL * 3.0);
      if(dL <= 1) sc += 15;
    }
    return {cp, score:Math.round(clamp(sc, 0, 100))};
  });
  list.sort((a, b) => b.score - a.score);
  return {n, lc:shape.length, shape, list};
}

function rhymeGroupsOf(finals){
  const g = {};
  finals.forEach((ch, i) => {
    const k = RHYME_MAP[ch];
    if(!k) return;
    (g[k] = g[k] || []).push(i);
  });
  let main = '', best = 0;
  Object.keys(g).forEach(k => { if(g[k].length > best){ best = g[k].length; main = k; } });
  return {groups:g, main:best >= 2 ? main : ''};
}

/* ---------- 诗词（词牌）分析 ---------- */
function analyzeCiMode(raw){
  const t = extractTitle(raw);
  const clauses = splitClauses(t.body).filter(s => s.length);
  const m = matchCiPai(clauses);
  if(textMode.force){
    const idx = m.list.findIndex(x => x.cp.name === textMode.force);
    if(idx > 0) m.list.unshift(m.list.splice(idx, 1)[0]);
  }
  const finals = clauses.map(s => s[s.length - 1] || '');
  const rg = rhymeGroupsOf(finals);
  let hit = 0; clauses.forEach(s => { for(const ch of s) if(TONE_MAP[ch]) hit++; });
  const top = m.list[0], alt = m.list[1];
  const cp = top.cp, gd = GONG_MAP[cp.gong] || GONG_MAP.zhonglv;
  const title = t.title || ('未匹配（自由体 ' + m.n + ' 字）');
  return {
    kind:'ci', title, clauses, n:m.n, lc:clauses.length, shape:m.shape,
    candidates:m.list.slice(0, 3), conf:top.score, cp, alt, gong:gd,
    forced:(textMode.force === cp.name ? cp.name : null),
    toneHit:hit, toneTotal:m.n, rhyme:rg, finals
  };
}

/* ---------- 中文歌词分析 ---------- */
function analyzeLyricZhMode(raw){
  const sections = splitSections(raw);
  const lineCount = {};
  sections.forEach(sec => sec.forEach(l => { const k = stripPunct(l); if(k) lineCount[k] = (lineCount[k] || 0) + 1; }));
  let rep = 0;
  const info = sections.map(sec => {
    let r = 0;
    sec.forEach(l => { if(lineCount[stripPunct(l)] > 1) r++; });
    rep += r;
    return {lines:sec, isChorus:r >= Math.max(1, Math.floor(sec.length / 2))};
  });
  const inferred = !info.some(s => s.isChorus) && info.length >= 2;
  if(inferred) info[info.length - 1].isChorus = true;
  let v = 0;
  info.forEach(s => { s.label = s.isChorus ? '副歌' : (v === 0 ? '主歌 A' : v === 1 ? '主歌 B' : '主歌 C'); if(!s.isChorus) v++; });

  const flat = [];
  info.forEach((sec, si) => {
    sec.lines.forEach(l => {
      const chars = stripPunct(l).split('');
      flat.push({sec:si, label:sec.label, chorus:sec.isChorus, text:l, chars,
                 rhyme:RHYME_MAP[chars[chars.length - 1]] || '', len:chars.length});
    });
  });
  const rg = rhymeGroupsOf(flat.map(f => f.chars[f.chars.length - 1] || ''));
  const letters = {}, scheme = [];
  let li = 0;
  flat.forEach(f => {
    const k = f.rhyme || '-';
    if(k === '-'){ scheme.push('·'); return; }
    if(!letters[k]) letters[k] = String.fromCharCode(65 + (li++));
    scheme.push(letters[k]);
  });
  const avg = flat.length ? (flat.reduce((a, b) => a + b.len, 0) / flat.length) : 0;
  return {kind:'lyric', sections:info, flat, rhyme:rg, scheme:scheme.join(' '),
          repeat:rep, inferred, avg, n:flat.reduce((a, b) => a + b.len, 0)};
}

/* ---------- 英文歌词分析 ---------- */
function analyzeEnMode(raw){
  const sections = splitSections(raw);
  const flat = [];
  sections.forEach((sec, si) => {
    sec.forEach(l => {
      const sp = enStressPattern(l);
      const words = l.split(/\s+/).filter(Boolean);
      const lastW = words[words.length - 1] || '';
      flat.push({sec:si, text:l, syls:sp.syls, pat:sp.pat, tail:rhymeTail(lastW), lastW});
    });
  });
  const letters = {}, scheme = [];
  let li = 0;
  flat.forEach(f => {
    if(!letters[f.tail]) letters[f.tail] = String.fromCharCode(65 + (li++));
    scheme.push(letters[f.tail]);
  });
  let iam = 0, tro = 0;
  flat.forEach(f => {
    for(let i = 0; i + 1 < f.pat.length; i += 2){
      if(f.pat[i] === 'u' && f.pat[i+1] === '/') iam++;
      else if(f.pat[i] === '/' && f.pat[i+1] === 'u') tro++;
    }
  });
  const meter = iam > tro * 1.25 ? '抑扬格倾向（iambic）' : tro > iam * 1.25 ? '扬抑格倾向（trochaic）' : '音步自由（free）';
  const total = flat.reduce((a, b) => a + b.syls, 0);
  return {kind:'en', sections, flat, scheme:scheme.join(' '), meter,
          sylTotal:total, avg:flat.length ? total / flat.length : 0};
}

/* ---------- 分析结果卡片 ---------- */
function renderAnalysis(a){
  const box = document.getElementById('anlCard');
  if(!box) return;
  let h = '';
  if(a.kind === 'ci'){
    const cp = a.cp, lg = (a.lc >= 12 || a.n > 70);
    h += '<h4>诗词格律分析 <span class="tag">' + (a.forced ? '已指定 ' : (a.conf >= 82 ? '识别为 ' : '最接近 ')) + cp.name + '</span>' +
         '<span class="tag">匹配度 ' + a.conf + '%</span>' +
         '<span class="tag">' + (cp.kind === 'shi' ? '近体诗' : '词') + '</span>' +
         (lg ? '<span class="tag">长篇</span>' : '') + '</h4>';
    h += '<div class="kv">' +
         '<div><b>' + a.n + ' 字</b>总字数</div>' +
         '<div><b>' + a.lc + ' 句</b>句数</div>' +
         '<div><b>' + a.gong.name + '</b>常见宫调</div>' +
         '<div><b>' + a.gong.mood + '</b>宫调情感</div></div>';
    h += '<p><b>句式：</b>' + a.shape.join(' / ') + (cp.lines ? '　（正体：' + cp.lines.join(' / ') + '）' : '') + '</p>';
    h += '<p><b>别名：</b>' + (cp.alt || []).join(' · ') + '　　<b>代表句：</b>' + cp.sample + '</p>';
    h += '<p><b>宫调拟定：</b>' + a.gong.name + '（' + a.gong.mood + '）→ ' +
         MODES5[a.gong.mode].name + ' · ' + SCALES[a.gong.scale].name + '　' + a.gong.note + '</p>';
    h += '<p><b>声调收录：</b>' + a.toneHit + ' / ' + a.toneTotal + ' 字（' +
         Math.round(a.toneHit / Math.max(1, a.toneTotal) * 100) + '%），未收录字按「平」中性处理</p>';
    h += '<p><b>韵脚：</b>' + a.finals.map((f, i) => f + '(' + (RHYME_MAP[f] || '未收') + ')').join('　') +
         (a.rhyme.main ? '　→ 主韵 <b>' + a.rhyme.main + '</b>' : '　→ 未检出稳定主韵') + '</p>';
    h += '<p class="cad">平仄：<br>';
    a.clauses.forEach(s => {
      h += s.split('').map(c => toneMark(c)).join('') + '<br>';
      h += s + '<br>';
    });
    h += '</p>';
    if(a.candidates.length > 1){
      h += '<div class="cand"><span class="lbl">备选词牌</span>' +
           a.candidates.slice(1).map(c => '<button class="chip" onclick="applyCiPai(\'' + c.cp.name + '\')">' +
             c.cp.name + ' ' + c.score + '%</button>').join('') + '</div>';
    }
  } else if(a.kind === 'lyric'){
    h += '<h4>中文歌词结构分析 <span class="tag">' + a.sections.length + ' 段 · ' + a.flat.length + ' 句</span>' +
         '<span class="tag">' + a.n + ' 字</span>' +
         (a.repeat ? '<span class="tag">重复句 ' + a.repeat + '</span>' : '<span class="tag">无重复段</span>') + '</h4>';
    h += '<div class="kv">' +
         '<div><b>' + a.flat.length + ' 句</b>总句数</div>' +
         '<div><b>' + a.avg.toFixed(1) + ' 字</b>平均句长</div>' +
         '<div><b>' + (a.rhyme.main || '未检出') + '</b>主韵</div>' +
         '<div><b>' + (a.sections.filter(s => s.isChorus).length) + ' 段</b>副歌</div></div>';
    h += '<p><b>推定结构：</b>' + a.sections.map(s => s.label + '(' + s.lines.length + '句)').join(' → ') +
         (a.inferred ? '　（未检出重复段，末段按副歌处理）' : '') + '</p>';
    h += '<p><b>押韵格式：</b>' + a.scheme + '</p>';
    h += '<div class="lines">';
    a.flat.forEach((f, i) => {
      h += '<div class="ln"><span class="no">' + (i + 1) + '</span><span class="tx">' + f.text +
           '</span><span class="rh">' + f.label + ' · ' + f.len + '字' + (f.rhyme ? ' · ' + f.rhyme : '') + '</span></div>';
    });
    h += '</div>';
  } else {
    h += '<h4>English Lyrics Analysis <span class="tag">' + a.sections.length + ' section(s) · ' + a.flat.length + ' lines</span>' +
         '<span class="tag">' + a.sylTotal + ' syllables</span></h4>';
    h += '<div class="kv">' +
         '<div><b>' + a.flat.length + '</b>lines</div>' +
         '<div><b>' + a.avg.toFixed(1) + '</b>syllables / line</div>' +
         '<div><b>' + a.scheme + '</b>rhyme scheme</div>' +
         '<div><b>' + a.meter.replace(/（.*?）/, '') + '</b>meter</div></div>';
    h += '<p><b>Rhyme scheme：</b>' + a.scheme + '　·　<b>Meter：</b>' + a.meter +
         '　（「/」重音、「u」轻音）</p>';
    h += '<div class="lines">';
    a.flat.forEach((f, i) => {
      h += '<div class="ln"><span class="no">' + (i + 1) + '</span><span class="tx">' + f.text +
           '</span><span class="rh">' + f.syls + ' syl · ' + f.pat + '</span></div>';
    });
    h += '</div>';
  }
  box.innerHTML = h;
  box.classList.add('on');
  return a;
}

function analyzeCurrent(){
  const raw = document.getElementById('textIn').value.trim();
  if(!raw){ setNotice('先在文本框里粘贴一段文字。'); return null; }
  let a;
  if(textMode.cur === 'ci') a = analyzeCiMode(raw);
  else if(textMode.cur === 'lyric') a = analyzeLyricMode_safe(raw);
  else a = analyzeEnMode(raw);
  textMode.last = a;
  renderAnalysis(a);
  clearNotice();
  markStep(2);
  return a;
}
function analyzeLyricMode_safe(raw){
  const a = analyzeLyricZhMode(raw);
  if(a.flat.length < 2){
    const c = analyzeCiMode(raw);
    c.kind = 'ci';
    c.note = '文本过短，按诗词格律处理';
    return c;
  }
  return a;
}
