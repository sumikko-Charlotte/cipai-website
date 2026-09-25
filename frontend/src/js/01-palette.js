/* >>> file: src/js/01-palette.js */
/* ============================================================
   1. 调色板（9 个值 / 套，注入为 CSS 变量）
   ============================================================ */
const PKEYS = ['bg','bg2','surface','surface2','ink','ink2','ink3','border','borderStr'];
const PALETTES = {
  ivory    :['#FBF7EF','#F2E9D9','#FFFFFF','#F8F2E6','#33291C','#6E5C44','#A2907A','rgba(58,46,32,.15)','rgba(58,46,32,.28)'],
  parchment:['#F6F1E4','#ECE3CE','#FFFDF7','#F5EEDD','#3B3320','#756B4E','#A79C82','rgba(59,51,32,.16)','rgba(59,51,32,.30)'],
  cream    :['#FDF6F4','#F6E8E6','#FFFFFF','#FBF0EE','#3A2A2E','#7A6168','#AC959C','rgba(58,42,46,.14)','rgba(58,42,46,.28)'],
  sand     :['#F8F4E8','#EFE6D1','#FFFDF6','#F4EDDB','#33301F','#6C6547','#9C9479','rgba(74,66,43,.16)','rgba(74,66,43,.30)'],
  paper    :['#F5F2EA','#EBE6DA','#FFFFFF','#F7F4ED','#1C1C1C','#5C5A55','#96938C','rgba(31,31,31,.13)','rgba(31,31,31,.30)'],
  fog      :['#F4F6F8','#E7EBF0','#FFFFFF','#EFF3F7','#1F2733','#5A6674','#93A0AE','rgba(31,39,51,.13)','rgba(31,39,51,.26)'],
  charcoal :['#16171A','#1F2126','#232529','#2B2E34','#F2F3F5','#B2B6BE','#7B808A','rgba(255,255,255,.10)','rgba(255,255,255,.24)'],
  ink      :['#0C0C0E','#151518','#191A1E','#212226','#F7F7F8','#A8AAB2','#72747C','rgba(255,255,255,.11)','rgba(255,255,255,.28)'],
  midnight :['#101419','#171D27','#1B2330','#232D3C','#EFE9DC','#B0AA9A','#78736A','rgba(255,255,255,.09)','rgba(255,255,255,.22)'],
  plum     :['#14101B','#1D1728','#241C31','#2D233C','#F1EAF8','#B7A9C6','#7E718F','rgba(255,255,255,.09)','rgba(255,255,255,.24)'],
  ember    :['#150D0C','#1F1210','#271714','#331E19','#F7EBE8','#C9A79F','#8F746D','rgba(255,255,255,.09)','rgba(255,255,255,.24)'],
  neon     :['#080A16','#0E1226','#111634','#182046','#E6F7FF','#96B6CE','#5E7B93','rgba(35,229,219,.18)','rgba(35,229,219,.42)'],
  mocha    :['#1A1512','#231C17','#2B221B','#352A21','#F5EDE3','#C0AE9A','#877A69','rgba(255,255,255,.09)','rgba(255,255,255,.22)'],
  slate    :['#12161C','#1A202A','#212936','#2A3342','#EAF0F8','#A6B4C8','#6E7C90','rgba(255,255,255,.09)','rgba(255,255,255,.22)'],
  dusk     :['#191420','#231B2E','#2A2138','#342948','#F4EEF9','#B9ABC9','#82748F','rgba(255,255,255,.09)','rgba(255,255,255,.24)']
};

const TEXTURES = {
  none:() => 'none',
  v:c => 'repeating-linear-gradient(90deg,' + c + ' 0 1px,transparent 1px 28px)',
  h:c => 'repeating-linear-gradient(0deg,' + c + ' 0 1px,transparent 1px 26px)',
  diag:c => 'repeating-linear-gradient(-45deg,' + c + ' 0 2px,transparent 2px 9px)',
  grid:c => 'repeating-linear-gradient(90deg,' + c + ' 0 1px,transparent 1px 16px),repeating-linear-gradient(0deg,' + c + ' 0 1px,transparent 1px 16px)',
  dots:c => 'radial-gradient(' + c + ' 1px,transparent 1px)'
};
const TSIZE = {none:'auto',v:'auto',h:'auto',diag:'auto',grid:'auto',dots:'14px 14px'};
const FONTS = {
  serif :'Georgia,"KaiTi","楷体","Songti SC",serif',
  kaiti :'Georgia,"KaiTi","楷体",serif',
  songti:'"Songti SC","SimSun","宋体",Georgia,serif',
  sans  :'system-ui,-apple-system,"Microsoft YaHei","微软雅黑",sans-serif',
  bold  :'"Arial Black","Impact","Microsoft YaHei","微软雅黑",system-ui,sans-serif',
  mono  :'Consolas,"Courier New","Microsoft YaHei",monospace'
};
function hexToRgba(hex, a){
  const h = hex.replace('#','');
  return 'rgba(' + parseInt(h.substr(0,2),16) + ',' + parseInt(h.substr(2,2),16) + ',' + parseInt(h.substr(4,2),16) + ',' + a + ')';
}
