/* >>> file: src/js/20e-compose-melody.js */
/* ============================================================
   20. 文字配乐 · 五、依字行腔（文本 → 旋律）
   ============================================================ */
function scalePoolOf(rootMidi, scaleKey, lo, hi){
  const iv = SCALES[scaleKey].iv, pool = [];
  for(let oct = -5; oct <= 5; oct++)
    iv.forEach(s => { const p = rootMidi + oct * 12 + s; if(p >= lo && p <= hi) pool.push(p); });
  pool.sort((a, b) => a - b);
  return pool;
}

/* 把分析结果摊平成乐句序列：中文以「字」为单位，英文以「音节」为单位 */
function buildPhrases(a){
  const phrases = [];
  if(a.kind === 'ci'){
    const lc = a.clauses.length, mid = Math.ceil(lc / 2);
    a.clauses.forEach((line, i) => {
      const chars = line.split('');
      phrases.push({
        text:line, label:'第 ' + (i + 1) + ' 句',
        units:chars.map(ch => ({ch, accent:isZe(ch)})),
        rhyme:RHYME_MAP[chars[chars.length - 1]] || '',
        gap:(lc >= 8 && i === mid) ? 2 : 0,
        shift:0, final:(i === lc - 1)
      });
    });
  } else if(a.kind === 'lyric'){
    a.flat.forEach((f, i) => {
      const nxt = a.flat[i + 1];
      phrases.push({
        text:f.text, label:f.label,
        units:f.chars.map(ch => ({ch, accent:isZe(ch)})),
        rhyme:f.rhyme, gap:0, shift:f.chorus ? 2 : 0,
        final:(!nxt || nxt.sec !== f.sec)
      });
    });
  } else {
    a.flat.forEach((f, i) => {
      const units = [], pat = f.pat || '';
      for(let k = 0; k < f.syls; k++) units.push({ch:'♪', accent:pat[k] === '/'});
      const nxt = a.flat[i + 1];
      phrases.push({
        text:f.text, label:'L' + (i + 1), units,
        rhyme:f.tail || '', gap:0, shift:f.chorus ? 2 : 0,
        final:(!nxt || nxt.sec !== f.sec)
      });
    });
  }
  const cnt = {};
  phrases.forEach(p => { if(p.rhyme) cnt[p.rhyme] = (cnt[p.rhyme] || 0) + 1; });
  let main = '', best = 0;
  Object.keys(cnt).forEach(k => { if(cnt[k] > best){ best = cnt[k]; main = k; } });
  return {phrases, mainRhyme:best >= 2 ? main : '', rhymeCount:cnt};
}

/* 依字行腔 + 动机发展：
   首句（≥4 字）的音程走向记为「动机」，后续句按概率对它做原样重复、
   模进（整体平移 2–3 个音级）、倒影（音程取反）或加花变奏，套不上的句子
   回落到弧线法；平声走级进、仄声走跳进；押韵句落主音、非韵句落属音；
   同一韵部的落句复用上一句的终止三音型（韵脚呼应）。
   节奏在「一字一音」骨架上加入：句中切分长音（2 格）、押韵句末附点
   （3–4 格）、约 18% 的句子弱起错位（晚半拍进）、句间随机气口。 */
function motifPhrase(motif, N, startIdx, endIdx, mode, poolLen){
  const src = motif.deltas;
  if(!src.some(d => d !== 0)) return null;          // 动机太平则不用
  const seqShift = (Math.random() < .5 ? -1 : 1) * (2 + (Math.random() < .5 ? 1 : 0));
  const idxs = [];
  let cur = clamp(startIdx + (mode === 'seq' ? seqShift : 0), 0, poolLen - 1);
  for(let k = 0; k < N; k++){
    if(k > 0){
      let d = src[(k - 1) % src.length];
      if(mode === 'inv') d = -d;
      else if(mode === 'var' && Math.random() < .4) d += (Math.random() < .5 ? -1 : 1);
      cur = clamp(cur + d, 0, poolLen - 1);
    }
    idxs.push(cur);
  }
  idxs[N - 1] = clamp(endIdx, 0, poolLen - 1);      // 终止式不变：句末严格落落音
  return idxs;
}

function rhythmFor(N, pi, nPh, isRh, zeFin, longOnAccent){
  const durs = new Array(N).fill(1);
  if(N >= 4 && Math.random() < .3){
    /* 切分：句中随机一字拖长至 2 格，跨过拍点 */
    const k = 1 + Math.floor(Math.random() * (N - 2));
    durs[k] = 2;
  }
  let fin = isRh ? (zeFin ? 2 : 3) : (zeFin ? (longOnAccent ? 3 : 1) : 2);
  if(isRh && !zeFin && (pi === nPh - 1 || Math.random() < .35)) fin = 4;   // 附点式落句
  durs[N - 1] = fin;
  return durs;
}

function composeMelody(pack, opt){
  const sc = SCALES[opt.scaleKey];
  const pool = scalePoolOf(opt.rootMidi, opt.scaleKey, opt.lo, opt.hi);
  if(pool.length < 5) return {notes:[], totalSteps:16, truncated:false, poolLen:pool.length, tonicPc:mod(opt.rootMidi), log:[]};
  const tonicPc = mod(opt.rootMidi + opt.modeDeg);
  const pos01 = opt.pos || [.35, .85];
  const center = opt.lo + (opt.hi - opt.lo) * ((pos01[0] + pos01[1]) / 2);
  let tonicIdx = 0, bd = 1e9;
  pool.forEach((p, i) => {
    if(mod(p) !== tonicPc) return;
    const d = Math.abs(p - center);
    if(d < bd){ bd = d; tonicIdx = i; }
  });
  const domIdx = clamp(tonicIdx + (sc.five ? 3 : 4), 0, pool.length - 1);
  const CAP = 196;
  const notes = [], tails = {};
  let pos = 0, truncated = false, rhLines = 0, leapCount = 0, stepCount = 0, pauseCount = 0;
  let weakCount = 0, dotCount = 0, breathCount = 0;
  const motifStats = {rep:0, seq:0, inv:0, var:0, fresh:0};
  let motif = null;
  const longOnAccent = (opt.lang === 'en');   // 英文重读音节落长音，中文仄声字落短音
  const nPh = pack.phrases.length;

  for(let pi = 0; pi < nPh; pi++){
    const ph = pack.phrases[pi];
    if(pos > CAP - 4){ truncated = true; break; }
    pos += (ph.gap || 0);
    if(ph.gap) pauseCount++;
    const units = ph.units;
    if(!units.length) continue;
    const N = units.length;
    const isRh = pack.mainRhyme ? (ph.rhyme === pack.mainRhyme) : !!ph.final;
    const zeFin = units[N - 1].accent;
    const sh = ph.shift || 0;
    /* 乐句音区起伏：句间不在同一高度起句，避免通篇挤在音域上沿 */
    const lineReg = (pi === 0) ? 0 : (pi === nPh - 1 ? -1 : ((pi % 3) - 1) * 2);
    const endIdx = clamp((isRh ? (zeFin ? Math.max(1, tonicIdx - 1) : tonicIdx) : domIdx) + sh, 0, pool.length - 1);
    const baseStart = (pi === 0) ? tonicIdx : (isRh ? tonicIdx + 2 : domIdx);
    const startIdx = clamp(baseStart + lineReg + sh, 0, pool.length - 1);

    /* 弱起：约 18% 的句子整体晚半拍进入，与 4/4 伴奏形成切分错位 */
    if(pi > 0 && N >= 3 && Math.random() < .18){ pos += 1; weakCount++; }

    /* 取音：优先动机发展，套不上再用弧线法 */
    const durs = rhythmFor(N, pi, nPh, isRh, zeFin, longOnAccent);
    if(durs[N - 1] >= 3) dotCount++;
    let idxs = null;
    if(motif && pi > 0 && N >= 3 && Math.random() < (isRh ? .5 : .65)){
      const roll = Math.random();
      const mode = roll < .35 ? 'rep' : (roll < .6 ? 'seq' : (roll < .8 ? 'inv' : 'var'));
      idxs = motifPhrase(motif, N, startIdx, endIdx, mode, pool.length);
      if(idxs) motifStats[mode]++;
    }
    if(!idxs){
      motifStats.fresh++;
      idxs = [];
      let prev = startIdx;
      for(let i = 0; i < N; i++){
        const u = units[i];
        const arc = N === 1 ? 1 : i / (N - 1);
        /* 目标轮廓：在起句音与落句音之间走一条弧线，平声略上扬、仄声略下抑 */
        let vib = Math.sin(Math.PI * arc) * (sc.five ? 2.4 : 3.0) * (opt.leap || 1);
        vib *= u.accent ? -0.78 : 1;
        vib += (Math.random() - .5) * (u.accent ? .6 : 1.15);
        const want = startIdx + (endIdx - startIdx) * arc + vib;
        let idx;
        if(i === N - 1){
          idx = endIdx;                                     // 句末严格落到落音
        } else {
          /* 步幅由声调决定：平声级进（1 度）、仄声跳进（2 度，偶作 3 度） */
          const mag = u.accent ? 2 : 1;
          let dir = want > prev ? 1 : (want < prev ? -1 : (u.accent ? 1 : -1));
          if(i > 0 && Math.abs(want - prev) > mag + 1 && Math.random() < .3) dir = -dir;
          idx = prev + dir * mag;
          if(Math.abs(want - idx) >= 4 && Math.random() < .45) idx = prev + dir * (mag + 1);
        }
        idx = clamp(idx, 0, pool.length - 1);
        idxs.push(idx);
        prev = idx;
      }
    }
    if(pi === 0 && N >= 4 && !motif){
      motif = {deltas:[]};
      for(let k = 1; k < N; k++) motif.deltas.push(idxs[k] - idxs[k - 1]);
    }
    if(isRh){
      rhLines++;
      if(tails[ph.rhyme] && N >= 4){
        const t = tails[ph.rhyme];
        for(let k = 1; k <= t.length && k <= N; k++)
          idxs[N - k] = clamp(endIdx + t[t.length - k], 0, pool.length - 1);
      } else {
        const t = [];
        for(let k = Math.min(3, N); k >= 1; k--) t.push(idxs[N - k] - endIdx);
        tails[ph.rhyme] = t;
      }
    }
    for(let i = 0; i < N; i++){
      if(pos > CAP - 2){ truncated = true; break; }
      const u = units[i];
      const dur = durs[i];
      notes.push({pitch:pool[idxs[i]], start:pos, dur, voice:'melody', ch:u.ch});
      if(Math.abs(idxs[i] - (idxs[i - 1] === undefined ? idxs[i] : idxs[i - 1])) >= 2) leapCount++; else stepCount++;
      pos += dur;
    }
    pos += 1;
    /* 气口：非过片的句间随机多停半拍 */
    if(pi < nPh - 1 && !ph.gap && Math.random() < .2){ pos += 1; breathCount++; }
  }
  return {
    notes, totalSteps:Math.min(pos, CAP), truncated, poolLen:pool.length,
    tonicMidi:pool[tonicIdx], domMidi:pool[domIdx], tonicPc,
    rhLines, leapCount, stepCount, pauseCount, breathCount,
    weakCount, dotCount, motifStats,
    phrases:pack.phrases.length - (truncated ? 1 : 0)
  };
}

/* ---------- 文字 → 网格 → 生成 ---------- */
async function composeText(){
  const a = analyzeCurrent();
  if(!a) return;
  const moodKey = document.getElementById('vMood').value;
  const mood = MOODS[moodKey] || MOODS.auto;
  const range = VOICE_RANGES[document.getElementById('vRange').value] || VOICE_RANGES.auto;
  const scaleSel = document.getElementById('vScale').value;
  const gd = (a.kind === 'ci') ? a.gong : null;
  const log = [];

  let modeKey = gd ? gd.mode : 'zhi';
  let scaleKey = gd ? gd.scale : 'pent';
  let styleKey = gd ? gd.style : 'ballad';
  let bpm = gd ? gd.bpm : 76;
  if(gd) log.push('宫调推定：<b>' + gd.name + '</b>（' + gd.mood + '）→ ' + MODES5[gd.mode].name);
  if(moodKey !== 'auto'){ modeKey = mood.mode; styleKey = mood.style; log.push('情绪覆盖：<b>' + mood.name + '</b> → 改用 ' + MODES5[mood.mode].name); }
  if(scaleSel !== 'auto'){ scaleKey = scaleSel; log.push('音阶指定：<b>' + SCALES[scaleSel].name + '</b>'); }
  else if(moodKey !== 'auto') log.push('音阶沿用宫调默认：' + SCALES[scaleKey].name);

  const lo = range.lo, hi = range.hi;
  const pos01 = mood.pos || [.32, .82];
  const targetCenter = lo + (hi - lo) * ((pos01[0] + pos01[1]) / 2);
  const modeDeg = MODES5[modeKey].deg;
  const rootMidi = Math.round(targetCenter) - modeDeg;

  const pack = buildPhrases(a);
  if(!pack.phrases.length){ setNotice('没能从文本里读出有效的句读，请检查内容。'); return; }
  log.push('句读解析：<b>' + pack.phrases.length + '</b> 句' +
    (pack.mainRhyme ? '，主韵「' + pack.mainRhyme + '」' : '，未检出稳定主韵（改按段落末句落主音）'));

  const mel = composeMelody(pack, {lo, hi, rootMidi, modeDeg, scaleKey, leap:(mood.leap || 1), pos:pos01,
    mainRhyme:pack.mainRhyme, lang:(a.kind === 'en' ? 'en' : 'zh')});
  if(!mel.notes.length){ setNotice('旋律生成失败，请换一段文本重试。'); return; }
  log.push('调式分配：' + MODES5[modeKey].name + ' · ' + SCALES[scaleKey].name +
    '，音域 ' + PC[mod(lo)] + (Math.floor(lo / 12) - 1) + ' – ' + PC[mod(hi)] + (Math.floor(hi / 12) - 1) +
    '（' + range.name + '），可用音级 ' + mel.poolLen + ' 个，主音 ' + PC[mod(mel.tonicMidi)] + '，属音 ' + PC[mod(mel.domMidi)]);
  log.push('依字行腔：平声级进 ' + mel.stepCount + ' 处、仄声跳进 ' + mel.leapCount +
    ' 处；押韵句 ' + mel.rhLines + ' 句落主音，其余落属音；过片停顿 ' + mel.pauseCount + ' 处');
  if(mel.motifStats){
    const ms = mel.motifStats;
    log.push('动机发展：首句动机被后续句引用 ' + (ms.rep + ms.seq + ms.inv + ms.var) + ' 次' +
      '（重复 ' + ms.rep + ' / 模进 ' + ms.seq + ' / 倒影 ' + ms.inv + ' / 变奏 ' + ms.var + '），自由展开 ' + ms.fresh + ' 句；' +
      '弱起切分 ' + mel.weakCount + ' 处、附点落句 ' + mel.dotCount + ' 处、句间气口 ' + mel.breathCount + ' 处');
  }
  if(mel.truncated) log.push('文本较长，已按 196 格上限截断（如需全篇请分段生成）');

  resetGridCols();
  setGridCols(mel.totalSteps, false);
  mel.notes.forEach(n => {
    for(let i = 0; i < n.dur && n.start + i < GRID_COLS; i++) state.grid[n.start + i] = n.pitch;
  });
  const ps = mel.notes.map(n => n.pitch);
  setRollRange(Math.min.apply(null, ps) - 1, Math.max.apply(null, ps) + 1);
  syncRoll(); loadMelodyFromGrid();
  markStep(2);

  selectStyle(styleKey);
  state.bpm = bpm;
  document.getElementById('tempo').value = bpm;
  document.getElementById('tempoV').textContent = bpm;

  const secTag = (a.kind === 'lyric' || a.kind === 'en')
    ? '（' + a.sections.map((s, i) => (s.label || ('段' + (i + 1)))).join(' / ') + '，副歌音区抬高 2 个音级）' : '';
  log.push('词曲对位：以八分音符为骨架，一字/一音节一音；句中偶发切分长音，押韵句末附点延至 3–4 格' + secTag);
  log.push('写入节奏网格：<b>' + GRID_COLS + '</b> 格 × ' + Math.ceil(GRID_COLS / 4) +
    ' 小节，速度 ' + bpm + ' BPM；风格自动切到 <b>' + STYLES[styleKey].name + '</b>');

  setNotice('正在从文本生成旋律…');
  await generate();
  setNotice('已从文本生成 ' + mel.notes.length + ' 个旋律音符（' + GRID_COLS + ' 格 / ' + Math.ceil(GRID_COLS / 4) +
    ' 小节），走的是与哼唱、导入完全相同的和声与伴奏流水线。可试听、换风格或乐器、也可导出。');
  logLine('—— 文字配乐链路 ——', true);
  log.forEach(l => logLine(l, true));
  if(GRID_COLS > 128) logLine('提示：篇幅较长（' + GRID_COLS + ' 格），导出 WAV 需要渲染 ' +
    (GRID_COLS * 60 / bpm / 2).toFixed(0) + ' 秒音频，请耐心等待。', true);
  markStep(4);
}
