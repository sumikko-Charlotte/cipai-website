#!/usr/bin/env node
/**
 * test-compose-diversity.js —— 无头测试 20e-compose-melody.js 的 composeMelody
 *
 * 用法（在 ai-accompaniment/ 目录下）：
 *   node tools/test-compose-diversity.js          → 新版（工作区）vs 旧版（git main）多样性对比
 *
 * 指标：
 *   - 同一段文本连续生成 RUNS 次，两两计算「逐步同音率」（同一拍上音高相同的比例）
 *   - 旧版弧线法预期同音率很高（每条旋律形状几乎一致），动机版应显著下降
 *   - 同时校验终止式：押韵句最后一个音必须落在主音上
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const JS = p => path.join(ROOT, 'frontend', 'src', 'js', p);
const RUNS = 8;

function loadCompose(which){
  let src;
  if(which === 'old'){
    src = execSync('git show main:frontend/src/js/20e-compose-melody.js', { cwd: ROOT, encoding: 'utf8' });
  } else {
    src = fs.readFileSync(JS('20e-compose-melody.js'), 'utf8');
  }
  const base = ['00-music-core.js', '20a-text-kb.js', '20b-tone-rhyme.js']
    .map(f => fs.readFileSync(JS(f), 'utf8')).join('\n');
  const sandbox = {};
  const fn = new Function(base + '\n' + src + '\nreturn {composeMelody, buildPhrases};');
  return fn.call(sandbox);
}

/* 手工构造的歌词 pack：8 句、5–7 字、主韵 ang，平(非仄)仄混合 */
function makePack(){
  const lines = [
    { chs: '月落乌啼霜满天', rhyme: 'ang', accent: [1, 1, 0, 1, 0, 1, 0] },
    { chs: '江枫渔火对愁眠', rhyme: 'ang', accent: [0, 0, 1, 1, 1, 1, 0] },
    { chs: '姑苏城外寒山寺', rhyme: '',   accent: [0, 0, 1, 1, 1, 1, 0] },
    { chs: '夜半钟声到客船', rhyme: 'ang', accent: [1, 1, 0, 0, 1, 1, 0] },
    { chs: '秋水共长天一色', rhyme: '',   accent: [0, 1, 1, 0, 0, 1, 0] },
    { chs: '落霞与孤鹜齐飞', rhyme: '',   accent: [1, 0, 1, 0, 1, 0, 0] },
    { chs: '渔舟唱晚响穷滨', rhyme: '',   accent: [1, 0, 1, 1, 1, 1, 0] },
    { chs: '雁阵惊寒声断衡阳', rhyme: 'ang', accent: [1, 1, 0, 1, 0, 1, 1, 0] }
  ];
  const phrases = lines.map((L, i) => ({
    text: L.chs, label: '第 ' + (i + 1) + ' 句',
    units: L.chs.split('').map((ch, k) => ({ ch, accent: !!L.accent[k] })),
    rhyme: L.rhyme, gap: 0, shift: 0, final: (i === lines.length - 1)
  }));
  return { phrases, mainRhyme: 'ang', rhymeCount: { ang: 4 } };
}

function toGrid(mel){
  const g = new Array(mel.totalSteps).fill(null);
  mel.notes.forEach(n => { for(let i = 0; i < n.dur && n.start + i < g.length; i++) g[n.start + i] = n.pitch; });
  return g;
}

function similarity(a, b){
  const n = Math.max(a.length, b.length);
  let same = 0, tot = 0;
  for(let i = 0; i < n; i++){
    const x = a[i] === undefined ? null : a[i];
    const y = b[i] === undefined ? null : b[i];
    if(x === null && y === null) continue;
    tot++;
    if(x === y) same++;
  }
  return tot ? same / tot : 0;
}

function evaluate(which){
  const { composeMelody } = loadCompose(which);
  const opt = { lo: 62, hi: 84, rootMidi: 62, modeDeg: 0, scaleKey: 'pent',
    leap: 1, pos: [.35, .85], mainRhyme: 'ang', lang: 'zh' };
  const grids = [], stats = [];
  for(let r = 0; r < RUNS; r++){
    const mel = composeMelody(makePack(), opt);
    grids.push(toGrid(mel));
    stats.push(mel);
  }
  let sum = 0, pairs = 0;
  for(let i = 0; i < RUNS; i++) for(let j = i + 1; j < RUNS; j++){
    sum += similarity(grids[i], grids[j]); pairs++;
  }
  /* 终止式校验：notes 按「逐句逐字」顺序写入，按下标顺序消费即可对齐每句
     （不能按 ch 匹配：同一个字可能在多个句子出现，会取错句） */
  let cadenceOK = true;
  stats.forEach(mel => {
    const pack = makePack();
    let cursor = 0;
    pack.phrases.forEach(ph => {
      const slice = mel.notes.slice(cursor, cursor + ph.units.length);
      cursor += ph.units.length;
      const last = slice[slice.length - 1];
      if(ph.rhyme === 'ang' && last && last.pitch !== mel.tonicMidi) cadenceOK = false;
    });
  });
  const avg = (sum / pairs * 100).toFixed(1);
  const ms = stats[0].motifStats;
  return { avg, cadenceOK, ms,
    weak: stats.reduce((a, s) => a + (s.weakCount || 0), 0),
    dots: stats.reduce((a, s) => a + (s.dotCount || 0), 0),
    lens: grids.map(g => g.length) };
}

const oldR = evaluate('old');
const newR = evaluate('new');
console.log('== 同一段文本连续生成 ' + RUNS + ' 次，两两「逐步同音率」==');
console.log('旧版（纯弧线法）：平均同音率 ' + oldR.avg + '%，终止式全部正确：' + oldR.cadenceOK);
console.log('新版（动机发展）：平均同音率 ' + newR.avg + '%，终止式全部正确：' + newR.cadenceOK);
if(newR.ms) console.log('新版动机统计（首跑）：重复 ' + newR.ms.rep + ' / 模进 ' + newR.ms.seq +
  ' / 倒影 ' + newR.ms.inv + ' / 变奏 ' + newR.ms.var + ' / 自由展开 ' + newR.ms.fresh);
console.log('新版 ' + RUNS + ' 跑累计：弱起 ' + newR.weak + ' 处，附点落句 ' + newR.dots + ' 处');
