#!/usr/bin/env node
/**
 * build.js —— 把 frontend/ 源码树合回单文件 HTML。
 *
 * 用法（在 cipai-website 目录下）：
 *   node tools/build.js                  → 输出 dist/index.html
 *   node tools/build.js ../handin.html   → 输出到指定路径
 *   node tools/build.js --check          → 只校验能否构建，不写文件
 *
 * 原理：frontend/index.html 用 <link> / <script src> 引外部文件，
 *      本脚本把它们内联回 <style> / <script>，并把同一类的多个引用
 *      合并成一个标签块（与最初的单文件结构一致）。
 *      每个源文件首行是 `/* >>> file: xxx *​/` 标记，内联时剥离该行，
 *      因此构建结果不携带路径信息，单文件可直接交付。
 *
 * 路径约定：link href 与 script src 都相对 frontend/ 目录解析
 * （样式在 assets/css/，脚本在 src/js/）。
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend');
const EOL = '\n';

const readUtf8 = p => fs.readFileSync(p, 'utf8');

/** 去掉源文件首行的 `/* >>> file: ... *​/` 标记（格式约定，勿改） */
const stripMarker = text => text.replace(/^\/\* >>> file: .*? \*\/\r?\n/, '');

const LINK = '<link\\s+rel="stylesheet"\\s+href="[^"]+"\\s*>';
const SCRIPT = '<script\\s+src="[^"]+"\\s*><\\/script>';

function load(rel, kind) {
  const file = path.join(FRONTEND_DIR, rel);
  if (!fs.existsSync(file)) throw new Error('找不到' + kind + '文件: ' + rel);
  return stripMarker(readUtf8(file));
}

function inline(srcHtml) {
  const used = [];

  // ---- CSS：把连续的 <link> 归并为一个 <style> ----
  const cssRunRe = new RegExp('(?:' + LINK + ')(?:' + EOL + '(?:' + LINK + '))*', 'g');
  let out = srcHtml.replace(cssRunRe, run => {
    const hrefs = [...run.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
    const css = hrefs.map(h => { used.push(h); return load(h, '样式'); }).join(EOL);
    if (css.includes('</style>')) throw new Error('样式内容含 </style>，无法内联');
    return '<style>' + EOL + css + EOL + '</style>';
  });

  // ---- JS：把连续的 <script src> 归并为一个 <script> ----
  const jsRunRe = new RegExp('(?:' + SCRIPT + ')(?:' + EOL + '(?:' + SCRIPT + '))*', 'g');
  out = out.replace(jsRunRe, run => {
    const srcs = [...run.matchAll(/src="([^"]+)"/g)].map(m => m[1]);
    const js = srcs.map(s => { used.push(s); return load(s, '脚本'); }).join(EOL);
    if (js.includes('</script>')) throw new Error('脚本内容含 </script>，无法内联');
    return '<script>' + EOL + js + EOL + '</script>';
  });

  const leftover = out.match(/<link\s+rel="stylesheet"|<script\s+src=/g);
  if (leftover) throw new Error('仍有未内联的引用（引用必须连续排列）: ' + leftover.join(', '));

  return { html: out, used };
}

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const outArg = args.find(a => !a.startsWith('--'));
  const outPath = outArg
    ? path.resolve(process.cwd(), outArg)
    : path.resolve(__dirname, '..', 'dist', 'index.html');

  const srcPath = path.join(FRONTEND_DIR, 'index.html');
  if (!fs.existsSync(srcPath)) throw new Error('找不到 ' + srcPath);

  const { html, used } = inline(readUtf8(srcPath));

  if (checkOnly) {
    console.log('构建校验通过：内联 ' + used.length + ' 个文件，产物 ' + html.length + ' 字符');
    return;
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, html, 'utf8');
  console.log('已生成 ' + outPath);
  console.log('  内联 ' + used.length + ' 个文件（' + used.filter(u => u.startsWith('assets/')).length +
    ' 样式 / ' + used.filter(u => u.startsWith('src/')).length + ' 脚本），共 ' + html.length + ' 字符');
}

main();
