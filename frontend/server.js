#!/usr/bin/env node
/**
 * server.js —— 前端静态站点开发/预览服务器（零依赖）
 *
 * 用法：
 *   node server.js [--host 127.0.0.1] [--port 7100]
 *   npm run dev -- --port 7100        （Kimi Work 预览卡片走这条）
 *
 * 只服务本目录（frontend/）下的文件，带基本 MIME 类型。
 * 作为模块引入时导出 { createServer }，不自动监听（供自测）。
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.mid': 'audio/midi',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf'
};

function createServer(){
  return http.createServer((req, res) => {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if(urlPath === '/') urlPath = '/index.html';
    const file = path.normalize(path.join(ROOT, urlPath));
    if(!file.startsWith(ROOT)){ res.writeHead(403); res.end('Forbidden'); return; }
    fs.readFile(file, (err, data) => {
      if(err){ res.writeHead(404); res.end('Not Found: ' + urlPath); return; }
      const headers = {
        'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Accept-Ranges': 'bytes'
      };
      const range = req.headers.range;
      if(range){
        const match = /^bytes=(\d*)-(\d*)$/.exec(range);
        if(!match){
          res.writeHead(416, { 'Content-Range': 'bytes */' + data.length });
          res.end();
          return;
        }
        let start = match[1] ? Number(match[1]) : 0;
        let end = match[2] ? Number(match[2]) : data.length - 1;
        if(!match[1] && match[2]){
          start = Math.max(0, data.length - end);
          end = data.length - 1;
        }
        if(start >= data.length || end < start){
          res.writeHead(416, { 'Content-Range': 'bytes */' + data.length });
          res.end();
          return;
        }
        end = Math.min(end, data.length - 1);
        headers['Content-Range'] = 'bytes ' + start + '-' + end + '/' + data.length;
        headers['Content-Length'] = end - start + 1;
        res.writeHead(206, headers);
        res.end(req.method === 'HEAD' ? undefined : data.subarray(start, end + 1));
        return;
      }
      headers['Content-Length'] = data.length;
      res.writeHead(200, headers);
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
}

function main(){
  const args = process.argv.slice(2);
  const pick = (name, dflt) => {
    const i = args.indexOf('--' + name);
    return i !== -1 && args[i + 1] ? args[i + 1] : dflt;
  };
  const host = pick('host', process.env.HOST || '127.0.0.1');
  const port = parseInt(pick('port', process.env.PORT || '7100'), 10);
  const srv = createServer();
  srv.listen(port, host, () => {
    console.log('前端已启动： http://' + host + ':' + port + '/  （根目录 ' + ROOT + '）');
  });
}

if(require.main === module) main();
else module.exports = { createServer };
