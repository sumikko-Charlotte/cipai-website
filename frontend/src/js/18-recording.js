/* >>> file: src/js/18-recording.js */
/* ============================================================
   18. 录音与声音识别
   ============================================================ */
let mediaRec = null, chunks = [], analyser = null, rafWave = 0;
async function toggleRec(){
  const btn = document.getElementById('recBtn');
  const txt = document.getElementById('recTxt');
  const hint = document.getElementById('recHint');
  if(mediaRec && mediaRec.state === 'recording'){ mediaRec.stop(); return; }
  try{
    const stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false, noiseSuppression:false}});
    const ctx = ensureCtx();
    const src = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    const time = new Float32Array(analyser.fftSize);
    let frames = 0;
    const loop = () => {
      analyser.getFloatTimeDomainData(time);
      drawWave(time);
      let sum = 0;
      for(let i = 0; i < time.length; i++) sum += time[i]*time[i];
      const rms = Math.sqrt(sum/time.length);
      document.getElementById('lvlBar').style.width = clamp(rms*260, 0, 100) + '%';
      if(frames++ % 5 === 0){
        const f = quickPitch(time, ctx.sampleRate);
        const el = document.getElementById('liveNote'), fe = document.getElementById('liveFreq');
        if(f > 0){
          const m = Math.round(69 + 12*Math.log2(f/440));
          el.textContent = PC[mod(m)] + (Math.floor(m/12) - 1);
          fe.textContent = f.toFixed(1) + ' Hz · MIDI ' + m;
        } else {
          el.textContent = '—';
          fe.textContent = '未检出稳定音高';
        }
      }
      rafWave = requestAnimationFrame(loop);
    };
    loop();

    chunks = [];
    mediaRec = new MediaRecorder(stream);
    mediaRec.ondataavailable = e => chunks.push(e.data);
    mediaRec.onstop = async () => {
      cancelAnimationFrame(rafWave);
      stream.getTracks().forEach(t => t.stop());
      btn.classList.remove('rec');
      txt.textContent = '按下开始哼唱';
      document.getElementById('lvlBar').style.width = '0%';
      hint.innerHTML = '录制完成，正在做音高追踪与音符切分…';
      const blob = new Blob(chunks, {type: chunks[0] ? chunks[0].type : 'audio/webm'});
      /* 暂存：录音留在页面里，可随时重听 */
      if(lastHumURL) URL.revokeObjectURL(lastHumURL);
      lastHumBlob = blob;
      lastHumName = '哼唱 ' + new Date().toLocaleString('zh-CN', {hour12:false});
      lastHumURL = URL.createObjectURL(blob);
      const au = document.getElementById('humAudio');
      if(au){
        au.src = lastHumURL;
        document.getElementById('humSave').classList.add('on');
      }
      await analyzeAudioBlob(blob, '哼唱录音', true);
    };
    mediaRec.start();
    btn.classList.add('rec');
    txt.textContent = '正在录音… 点击结束';
    hint.innerHTML = '保持自然哼唱，单声部效果最好。左侧会实时显示当前检测到的音高。';
    markStep(2);
  }catch(e){
    setNotice('无法访问麦克风（' + (e && e.message ? e.message : e) + '）。你可以在「手动编辑」里点格子绘入旋律，或使用示例旋律。');
  }
}

async function analyzeAudioBlob(blob, source, isHum){
  try{
    const ctx = ensureCtx();
    const arr = await blob.arrayBuffer();
    const audio = await ctx.decodeAudioData(arr.slice(0));
    let sr = audio.sampleRate, data = audio.getChannelData(0);
    if(sr > 22050){
      const f = Math.floor(sr/22050), out = new Float32Array(Math.floor(data.length/f));
      for(let i = 0; i < out.length; i++) out[i] = data[i*f];
      data = out; sr = sr/f;
    }
    const notes = extractNotes(data, sr);
    if(notes.length >= 3){
      const cv2 = document.getElementById('waveCanvas2');
      if(cv2) cv2.style.display = 'block';
      applyDetectedMelody(notes);
      drawWave(data);
      if(isHum){
        const hr = document.getElementById('humResult');
        if(hr){
          hr.querySelector('span').textContent = '从哼唱中识别出 ' + notes.length + ' 个音符，已量化到节奏网格';
          hr.classList.add('on');
        }
      }
      setNotice('从' + source + '中识别出 ' + notes.length + ' 个音符，已量化到 16 格节奏网格。可在「手动编辑」里微调。');
    } else {
      setNotice('音高追踪结果不理想（可能噪声较大或音域超出范围）。已切换为示例旋律，你可以手动修正。');
      applyPreset('twinkle');
    }
  }catch(e){
    setNotice('音频解析失败：' + (e && e.message ? e.message : e) + '。已回退到示例旋律。');
    applyPreset('twinkle');
  }
}

function applyDetectedMelody(notes){
  resetGridCols();
  resetRollRange();
  notes.forEach(n => {
    for(let i = 0; i < n.dur && n.start + i < GRID_COLS; i++){
      if(state.grid[n.start + i] === null) state.grid[n.start + i] = n.midi;
    }
  });
  syncRoll(); loadMelodyFromGrid(); markStep(2);
}

function handleFile(file){
  if(!file) return;
  const isMidi = /\.(mid|midi)$/i.test(file.name);
  if(isMidi){
    const fr = new FileReader();
    fr.onload = () => {
      try{
        resetGridCols();
        resetRollRange();
        const r = parseMidi(fr.result);
        state.grid = r.cols.slice();
        syncRoll(); loadMelodyFromGrid();
        const cv2 = document.getElementById('waveCanvas2');
        if(cv2) cv2.style.display = 'none';
        drawIdleWave();
        setNotice('已解析 MIDI 文件「' + file.name + '」：抽取音符最多的轨道（' + r.noteCount + ' 个音符），按最高音单音化后量化到网格。');
        markStep(2);
      }catch(e){
        setNotice('MIDI 解析失败：' + (e && e.message ? e.message : e) + '。');
      }
    };
    fr.readAsArrayBuffer(file);
  } else {
    analyzeAudioBlob(file, '音频文件「' + file.name + '」');
  }
}


/* ---------- 哼唱录音保存：暂存 / 本地库（IndexedDB）/ 导出 ---------- */
let lastHumBlob = null, lastHumURL = null, lastHumName = '';
const HUM_DB = 'hum-recordings', HUM_STORE = 'recs';
let humDb = null;

function idbOpen(){
  return new Promise((res, rej) => {
    if(humDb) return res(humDb);
    const rq = indexedDB.open(HUM_DB, 1);
    rq.onupgradeneeded = () => { rq.result.createObjectStore(HUM_STORE, {keyPath:'id', autoIncrement:true}); };
    rq.onsuccess = () => { humDb = rq.result; res(humDb); };
    rq.onerror = () => rej(rq.error);
  });
}
function humLibAll(){
  return idbOpen().then(db => new Promise((res, rej) => {
    const rq = db.transaction(HUM_STORE).objectStore(HUM_STORE).getAll();
    rq.onsuccess = () => res(rq.result || []);
    rq.onerror = () => rej(rq.error);
  }));
}
function humLibPut(rec){
  return idbOpen().then(db => new Promise((res, rej) => {
    const rq = db.transaction(HUM_STORE, 'readwrite').objectStore(HUM_STORE).put(rec);
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  }));
}
function humLibDel(id){
  return idbOpen().then(db => new Promise((res, rej) => {
    const rq = db.transaction(HUM_STORE, 'readwrite').objectStore(HUM_STORE).delete(id);
    rq.onsuccess = () => res();
    rq.onerror = () => rej(rq.error);
  }));
}

function downloadBlob(blob, name){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ext = (blob.type && blob.type.indexOf('ogg') !== -1) ? '.ogg' : '.webm';
  a.href = url;
  a.download = name.replace(/[\\/:*?"<>|]/g, '_') + ext;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function exportHum(){
  if(!lastHumBlob){ setNotice('还没有可导出的录音，先录一段哼唱。'); return; }
  downloadBlob(lastHumBlob, lastHumName);
}

async function saveHumToLocal(){
  if(!lastHumBlob){ setNotice('还没有可保存的录音，先录一段哼唱。'); return; }
  try{
    await humLibPut({name:lastHumName, ts:Date.now(), blob:lastHumBlob});
    renderHumLib();
    setNotice('已存入本地录音库「' + lastHumName + '」——刷新或重开浏览器后仍在，可随时重听或导出。');
  }catch(e){
    setNotice('存入本地库失败（浏览器可能禁用了本地存储）：' + (e && e.message ? e.message : e));
  }
}

async function renderHumLib(){
  const box = document.getElementById('humLib');
  if(!box) return;
  let list = [];
  try{ list = await humLibAll(); }catch(e){ box.innerHTML = ''; return; }
  box.innerHTML = '';
  if(!list.length) return;
  const cap = document.createElement('div');
  cap.className = 'hs-tip';
  cap.textContent = '本地录音库（保存在浏览器 IndexedDB，共 ' + list.length + ' 条，刷新后仍在）：';
  box.appendChild(cap);
  list.sort((a, b) => b.ts - a.ts).forEach(rec => {
    const row = document.createElement('div');
    row.className = 'hl-item';
    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = rec.name + ' · ' + (rec.blob.size / 1048576).toFixed(1) + ' MB';
    const au = document.createElement('audio');
    au.controls = true;
    au.preload = 'metadata';
    au.src = URL.createObjectURL(rec.blob);
    const exp = document.createElement('button');
    exp.className = 'chip';
    exp.textContent = '导出';
    exp.onclick = () => downloadBlob(rec.blob, rec.name);
    const del = document.createElement('button');
    del.className = 'chip';
    del.textContent = '删除';
    del.onclick = async () => {
      await humLibDel(rec.id);
      URL.revokeObjectURL(au.src);
      renderHumLib();
      setNotice('已从本地库删除「' + rec.name + '」。');
    };
    row.appendChild(nm);
    row.appendChild(au);
    row.appendChild(exp);
    row.appendChild(del);
    box.appendChild(row);
  });
}

/* 识别结果 → 手动编辑：切选项卡、滚动到网格、闪烁提示 */
function jumpToEdit(){
  switchTab('edit');
  setTimeout(() => {
    const r = document.querySelector('#tab-edit .roll');
    if(!r) return;
    r.scrollIntoView({behavior:'smooth', block:'center'});
    r.classList.add('flash');
    setTimeout(() => r.classList.remove('flash'), 2300);
  }, 80);
}
