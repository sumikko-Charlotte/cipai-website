/* >>> file: src/js/22-api-client.js */
/* ============================================================
   22. 后端 API 客户端（前后端分离预留）
   ------------------------------------------------------------
   - 本文件是传统脚本（非 ES module），顶层 function 即全局函数，
     页面内联事件与控制台都可直接调用，不要改成模块导出。
   - 加载顺序：必须排在 21-bind-init.js 之后（当前正是如此）。
   - 本文件不改动任何现有 UI 行为；想手动试一下，在浏览器控制台：
       apiHealth().then(console.log)
       apiAnalyzeAudio(某个File或Blob).then(console.log)
   ============================================================ */

/* 后端地址。本地开发是 FastAPI 默认端口；以后若前后端同源部署，
   改成空字符串 '' 即可走相对路径。 */
const API_BASE = 'http://127.0.0.1:8000';

/* 请求超时（毫秒）。离线渲染/上传大文件时可调大。 */
const API_TIMEOUT_MS = 20000;

function apiUrl(path) {
  return API_BASE.replace(/\/+$/, '') + path;
}

/* ---- 健康检查：GET /api/health ------------------------------------
   返回Promise；后端没启动时 reject，错误信息里带了启动提示。 */
async function apiHealth() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(apiUrl('/api/health'), { signal: ctrl.signal });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (err) {
    const why = err.name === 'AbortError' ? '请求超时' : err.message;
    throw new Error('后端不可达（' + API_BASE + '）：' + why +
      '。请先在 backend/ 目录执行 uvicorn app:app --reload');
  } finally {
    clearTimeout(timer);
  }
}

/* ---- 音频分析：POST /api/analyze ----------------------------------
   参数 fileOrBlob：File 或 Blob（比如第 18 节录音得到的 MediaRecorder
   产物），filename 缺省时从 File.name 取，Blob 则用 recording.webm。
   返回后端 JSON；失败时 reject，错误信息可直接展示给用户。 */
async function apiAnalyzeAudio(fileOrBlob, filename) {
  if (!fileOrBlob) return Promise.reject(new Error('apiAnalyzeAudio：未传入音频数据'));

  const fd = new FormData();
  const name = filename || (fileOrBlob && fileOrBlob.name) || 'recording.webm';
  fd.append('audio', fileOrBlob, name);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(apiUrl('/api/analyze'), {
      method: 'POST',
      body: fd,
      signal: ctrl.signal
    });
    /* FastAPI 出错时返回 {detail: "..."}，尽量把信息透传出来 */
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      let detail = '';
      if (data && data.detail) {
        detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      }
      throw new Error('HTTP ' + res.status + (detail ? '：' + detail : ''));
    }
    return data;
  } catch (err) {
    if (err.message && err.message.indexOf('HTTP ') === 0) throw err;
    const why = err.name === 'AbortError' ? '请求超时' : err.message;
    throw new Error('音频分析请求失败（' + API_BASE + '）：' + why);
  } finally {
    clearTimeout(timer);
  }
}

/* ---- 便捷封装：直接把录音 Blob 送去分析 ---------------------------- */
async function apiAnalyzeRecording(blob) {
  return apiAnalyzeAudio(blob, 'recording.webm');
}

console.log('[api-client] 就绪，后端 ' + API_BASE +
  '（apiHealth / apiAnalyzeAudio / apiAnalyzeRecording）');
