/* >>> file: src/js/03-styles.js */
/* ============================================================
   3. 风格库（16 种）
   ============================================================ */
const STYLES = {
  classical:{name:'悠扬古典',en:'CLASSICAL',pal:'ivory',acc:'#A8763E',acc2:'#C9A227',fx:'v',ft:'serif',rd:16,bpm:72,pat:'arpeggio',inst:'piano',bass:'contrabass',sev:.20,bias:{I:.6,IV:1.0,V:1.0,ii:.6,vi:.3},desc:'分解和弦铺底，和声遵循 I–IV–V–I 的古典功能逻辑。声部平稳、避免大跳，追求气息绵长的听觉感受。'},
  baroque:{name:'巴洛克',en:'BAROQUE',pal:'parchment',acc:'#8C6A22',acc2:'#5B6E3A',fx:'v',ft:'serif',rd:2,bpm:84,pat:'counterpoint',inst:'organ',bass:'cello',sev:.10,bias:{I:.8,IV:.7,V:1.2,ii:.8,vi:.4},desc:'二声部对位织体，低音与高音形成模仿呼应。和声以属持续与终止式为核心，结构感强。'},
  romantic:{name:'浪漫钢琴',en:'ROMANTIC',pal:'dusk',acc:'#E0A0B8',acc2:'#9E86D6',fx:'none',ft:'serif',rd:14,bpm:66,pat:'ballad',inst:'piano',bass:'cello',sev:.60,bias:{I:.7,IV:.9,V:.8,vi:1.1,ii:.7},desc:'宽幅琶音与厚实七和弦，低音长音托底。和声色彩柔和，多用 vi 与 ii 制造情绪张力。'},
  jazz:{name:'轻爵士',en:'JAZZ',pal:'midnight',acc:'#D9A441',acc2:'#8E7CC3',fx:'h',ft:'serif',rd:12,bpm:108,pat:'walking',inst:'epiano',bass:'acoustic',sev:.90,bias:{ii:1.3,V:1.2,V7:1.4,I:.8,vi:.6,IV:.6},desc:'大量七和弦与 ii–V–I 进行，低音走行走低音，和弦落在反拍营造摇摆感。'},
  ballad:{name:'抒情流行',en:'BALLAD',pal:'cream',acc:'#C9557A',acc2:'#8C7BD6',fx:'none',ft:'sans',rd:20,bpm:74,pat:'arpeggio',inst:'epiano',bass:'acoustic',sev:.45,bias:{I:.9,IV:1.0,V:.9,vi:1.0,ii:.6},desc:'干净的分解音型配合电钢琴，前松后紧。和声采用 I–V–vi–IV 的流行走向，情绪开阔。'},
  rock:{name:'现代摇滚',en:'ROCK',pal:'charcoal',acc:'#E8483D',acc2:'#F2A03D',fx:'diag',ft:'bold',rd:4,bpm:132,pat:'power',inst:'distorted',bass:'electric',sev:.05,bias:{I:1.0,IV:.9,V:.9,vi:.8,ii:.2,iii:.2},desc:'强拍柱式和弦配八度低音，波形削波失真。和声以 I–IV–V 与 vi 为核心，强调推进力。'},
  punk:{name:'朋克',en:'PUNK',pal:'ink',acc:'#C6F24E',acc2:'#E8483D',fx:'diag',ft:'bold',rd:0,bpm:168,pat:'block',inst:'distorted',bass:'electric',sev:0,bias:{I:1.2,IV:1.0,V:1.0,vi:.6},desc:'极简三和弦、全程八分强击，几乎不做装饰。和声只在 I–IV–V–vi 之间循环，追求直接与冲劲。'},
  metal:{name:'重金属',en:'METAL',pal:'ember',acc:'#D6D8DC',acc2:'#B02020',fx:'grid',ft:'bold',rd:0,bpm:152,pat:'chug',inst:'distorted',bass:'synth',sev:.10,bias:{I:1.0,V:1.1,vi:.9,IV:.6,ii:.2},desc:'低音弦持续闷击（chugging）叠加厚重失真，低频密集。和声偏暗，常在 i 与 VI 之间游走。'},
  funk:{name:'放克',en:'FUNK',pal:'plum',acc:'#F2994A',acc2:'#4ED6C0',fx:'dots',ft:'sans',rd:8,bpm:104,pat:'funk16',inst:'rhodes',bass:'electric',sev:.75,bias:{I:1.2,ii:1.1,V:1.0,V7:1.2,vi:.6},desc:'十六分切分与大量休止，强调卡点。和弦短促带七度色彩，低音跳跃感强。'},
  citypop:{name:'City Pop',en:'CITYPOP',pal:'slate',acc:'#6FD3E0',acc2:'#F0A5C8',fx:'h',ft:'sans',rd:12,bpm:112,pat:'offbeat',inst:'epiano',bass:'electric',sev:.80,bias:{IV:1.2,V:1.0,vi:1.1,I:.9,ii:.8},desc:'反拍和弦与明亮电钢琴，低音线条流畅。和声多七和弦与九和弦，带都市夜色的通透感。'},
  edm:{name:'电子舞曲',en:'EDM',pal:'neon',acc:'#23E5DB',acc2:'#C447F5',fx:'grid',ft:'mono',rd:6,bpm:126,pat:'pulse',inst:'saw',bass:'synth',sev:.35,bias:{vi:1.2,IV:1.2,I:1.0,V:.9,ii:.4},desc:'四拍脉冲律动骨架，八度跳进低音配合锯齿波和弦刺。和声偏向 vi–IV–I–V 的循环式进行。'},
  lofi:{name:'Lo-Fi 嘻哈',en:'LOFI',pal:'mocha',acc:'#C9A26B',acc2:'#7E9884',fx:'dots',ft:'mono',rd:14,bpm:78,pat:'lazy',inst:'rhodes',bass:'acoustic',sev:.70,bias:{ii:1.1,V:1.1,I:1.0,vi:.9,IV:.8},desc:'慵懒的摇摆八分与松弛低音，和弦厚而模糊。和声常用 ii–V 循环，氛围优先于推进。'},
  chip:{name:'8-bit 游戏',en:'CHIPTUNE',pal:'ink',acc:'#5BE06B',acc2:'#FFD44E',fx:'grid',ft:'mono',rd:0,bpm:144,pat:'chip',inst:'chip',bass:'synth',sev:.10,bias:{I:1.2,IV:1.0,V:1.0,vi:.8,ii:.4},desc:'方波音色与快速琶音，音头干脆、低频跳动。和声简洁明快，是 8 位机时代的典型听感。'},
  folk:{name:'民谣木吉他',en:'FOLK',pal:'sand',acc:'#6B8E4E',acc2:'#B97B3C',fx:'v',ft:'kaiti',rd:18,bpm:96,pat:'fingerpick',inst:'nylon',bass:'acoustic',sev:.15,bias:{I:1.1,V:1.0,vi:1.1,IV:1.1,ii:.5,iii:.3},desc:'低音加分解指弹的经典民谣织体，音色温暖自然。和声采用 I–V–vi–IV 的万能进行。'},
  country:{name:'乡村',en:'COUNTRY',pal:'fog',acc:'#B5713C',acc2:'#5C7C46',fx:'v',ft:'sans',rd:10,bpm:118,pat:'strum',inst:'steel',bass:'acoustic',sev:.25,bias:{I:1.2,IV:1.0,V:1.1,ii:.5,vi:.6},desc:'扫弦为主，重拍明确、律动扎实。和声以 I–IV–V 为主干，偶尔借用 ii 增加色彩。'},
  chinese:{name:'国风民乐',en:'CHINESE',pal:'paper',acc:'#A62B2B',acc2:'#2F6B5E',fx:'h',ft:'songti',rd:2,bpm:80,pat:'guzheng',inst:'guzheng',bass:'cello',sev:0,bias:{I:.8,IV:.5,V:.5,vi:.5},desc:'在五声音阶框架内编排，回避偏音，以五度空灵低音与古筝式琶音为主，和声留白较多。'}
};
const STYLE_KEYS = Object.keys(STYLES);

const PATTERN_NAME = {
  arpeggio:'分解和弦', counterpoint:'二部对位', ballad:'宽幅琶音', walking:'行走低音',
  power:'强拍柱式', block:'八分强击', chug:'低音闷击', funk16:'十六分切分',
  offbeat:'反拍和弦', pulse:'四拍脉冲', lazy:'慵懒摇摆', chip:'快速琶音',
  fingerpick:'低音指弹', strum:'扫弦织体', guzheng:'古筝琶音'
};
