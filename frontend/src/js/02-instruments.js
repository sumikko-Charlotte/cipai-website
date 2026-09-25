/* >>> file: src/js/02-instruments.js */
/* ============================================================
   2. 乐器库（与风格解耦，可任意替换）
   ============================================================ */
const INSTRUMENTS = {
  piano    :{name:'三角钢琴',  tag:'键盘', osc:[{type:'triangle',det:0,g:.9},{type:'sine',det:0,g:.35,oct:1}], a:.004,d:.85,s:.16,r:.30,cut:3800,drive:0, gain:.13,vib:0},
  epiano   :{name:'电钢琴',    tag:'键盘', osc:[{type:'sine',det:0,g:1},{type:'triangle',det:7,g:.3}],          a:.010,d:.55,s:.30,r:.45,cut:3200,drive:0, gain:.13,vib:0},
  rhodes   :{name:'爵士电钢',  tag:'键盘', osc:[{type:'sine',det:0,g:1},{type:'sine',det:0,g:.35,oct:2}],       a:.008,d:.60,s:.25,r:.40,cut:3400,drive:2, gain:.115,vib:0},
  organ    :{name:'管风琴',    tag:'键盘', osc:[{type:'sine',det:0,g:1},{type:'sine',det:0,g:.5,oct:1},{type:'sine',det:0,g:.25,oct:-1}], a:.020,d:.10,s:.95,r:.25,cut:3000,drive:0,gain:.10,vib:0},
  strings  :{name:'弦乐合奏',  tag:'弓弦', osc:[{type:'sawtooth',det:-7,g:.5},{type:'sawtooth',det:7,g:.5}],   a:.150,d:.55,s:.70,r:.85,cut:2400,drive:0, gain:.10,vib:5},
  nylon    :{name:'尼龙弦吉他',tag:'拨弦', osc:[{type:'triangle',det:0,g:.95},{type:'sine',det:4,g:.3}],       a:.006,d:.42,s:.10,r:.30,cut:2800,drive:0, gain:.15,vib:0},
  steel    :{name:'钢弦吉他',  tag:'拨弦', osc:[{type:'triangle',det:-3,g:.7},{type:'sawtooth',det:5,g:.22}],  a:.004,d:.35,s:.08,r:.26,cut:3400,drive:0, gain:.14,vib:0},
  harp     :{name:'竖琴',      tag:'拨弦', osc:[{type:'sine',det:0,g:1},{type:'triangle',det:0,g:.3,oct:1}],   a:.003,d:.75,s:.06,r:.55,cut:4200,drive:0, gain:.14,vib:0},
  guzheng  :{name:'古筝',      tag:'拨弦', osc:[{type:'triangle',det:0,g:.9},{type:'sine',det:6,g:.32}],       a:.003,d:.60,s:.14,r:.50,cut:4000,drive:0, gain:.14,vib:0},
  flute    :{name:'长笛',      tag:'木管', osc:[{type:'sine',det:0,g:1},{type:'triangle',det:0,g:.16,oct:1}],  a:.070,d:.30,s:.82,r:.35,cut:3000,drive:0, gain:.13,vib:6},
  musicbox :{name:'音乐盒',    tag:'打击', osc:[{type:'sine',det:0,g:1},{type:'sine',det:0,g:.22,oct:2}],      a:.002,d:.90,s:.02,r:.70,cut:5000,drive:0, gain:.13,vib:0},
  saw      :{name:'锯齿合成器',tag:'合成', osc:[{type:'sawtooth',det:-6,g:.6},{type:'sawtooth',det:6,g:.6}],   a:.005,d:.20,s:.45,r:.22,cut:2600,drive:5, gain:.075,vib:0},
  square   :{name:'方波合成器',tag:'合成', osc:[{type:'square',det:0,g:.7},{type:'square',det:9,g:.3}],       a:.002,d:.12,s:.40,r:.14,cut:2400,drive:3, gain:.065,vib:0},
  chip     :{name:'8-bit 芯片',tag:'合成', osc:[{type:'square',det:0,g:.8}],                                   a:.001,d:.08,s:.55,r:.06,cut:6000,drive:0, gain:.055,vib:0},
  distorted:{name:'失真吉他',  tag:'电声', osc:[{type:'sawtooth',det:-4,g:.75},{type:'square',det:6,g:.4}],    a:.004,d:.16,s:.60,r:.20,cut:1700,drive:16,gain:.075,vib:0}
};
const BASS_INSTRUMENTS = {
  acoustic  :{name:'原声贝斯',tag:'拨弦',osc:[{type:'sine',det:0,g:1},{type:'triangle',det:0,g:.3}],      a:.010,d:.60,s:.28,r:.35,cut:900,drive:0,gain:.20,vib:0},
  electric  :{name:'电贝斯',  tag:'电声',osc:[{type:'triangle',det:-4,g:.85},{type:'square',det:5,g:.22}],a:.005,d:.45,s:.34,r:.24,cut:1100,drive:2,gain:.18,vib:0},
  synth     :{name:'合成贝斯',tag:'合成',osc:[{type:'sawtooth',det:0,g:.8},{type:'sine',det:0,g:.7,oct:-1}],a:.003,d:.30,s:.55,r:.18,cut:700,drive:1,gain:.17,vib:0},
  cello     :{name:'大提琴',  tag:'弓弦',osc:[{type:'sawtooth',det:-5,g:.6},{type:'sawtooth',det:5,g:.6}],a:.090,d:.45,s:.72,r:.55,cut:1000,drive:0,gain:.19,vib:4},
  contrabass:{name:'低音提琴',tag:'弓弦',osc:[{type:'triangle',det:0,g:1},{type:'sine',det:0,g:.5,oct:-1}],a:.050,d:.75,s:.50,r:.60,cut:650,drive:0,gain:.21,vib:0}
};
