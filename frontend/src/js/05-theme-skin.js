/* >>> file: src/js/05-theme-skin.js */
/* ============================================================
   5. 换肤
   ============================================================ */
function applyTheme(k){
  const s = STYLES[k], p = PALETTES[s.pal], b = document.body;
  PKEYS.forEach((key, i) => b.style.setProperty('--' + key, p[i]));
  b.style.setProperty('--accent', s.acc);
  b.style.setProperty('--accent2', s.acc2);
  b.style.setProperty('--accentSoft', hexToRgba(s.acc, .13));
  b.style.setProperty('--glow1', hexToRgba(s.acc, .17));
  b.style.setProperty('--glow2', hexToRgba(s.acc2, .13));
  b.style.setProperty('--radius', s.rd + 'px');
  b.style.setProperty('--radius-sm', Math.round(s.rd*.6) + 'px');
  b.style.setProperty('--font', FONTS[s.ft]);
  b.style.setProperty('--texture', TEXTURES[s.fx](hexToRgba(s.acc, .05)));
  b.style.setProperty('--texture-size', TSIZE[s.fx]);
  b.style.setProperty('--texture-op', s.fx === 'none' ? '0' : '1');
  b.style.setProperty('--track-bass', hexToRgba(s.acc, .55));
  b.dataset.theme = k;
}
