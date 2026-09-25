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
      await analyzeAudioBlob(blob, '哼唱录音');
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

async function analyzeAudioBlob(blob, source){
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
