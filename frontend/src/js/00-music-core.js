/* >>> file: src/js/00-music-core.js */
/* ============================================================
   0. 音乐基础工具
   ============================================================ */
const PC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const BLACK = [1,3,6,8,10];
const mod = n => ((n % 12) + 12) % 12;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const isBlack = m => BLACK.indexOf(mod(m)) !== -1;
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));

const CHORD_TONES = {
  maj:[0,4,7], min:[0,3,7], dim:[0,3,6], aug:[0,4,8], sus4:[0,5,7],
  maj7:[0,4,7,11], min7:[0,3,7,10], dom7:[0,4,7,10], m7b5:[0,3,6,10]
};
const CHORD_SUF = {maj:'',min:'m',dim:'dim',aug:'aug',sus4:'sus4',maj7:'maj7',min7:'m7',dom7:'7',m7b5:'m7b5'};
const chordLabel = (pc, type) => PC[mod(pc)] + CHORD_SUF[type];
const chordTones = (rootMidi, type) => CHORD_TONES[type].map(iv => rootMidi + iv);

const DIATONIC = {
  major:[{deg:0,type:'maj',roman:'I'},{deg:2,type:'min',roman:'ii'},{deg:4,type:'min',roman:'iii'},
         {deg:5,type:'maj',roman:'IV'},{deg:7,type:'maj',roman:'V'},{deg:7,type:'dom7',roman:'V7'},
         {deg:9,type:'min',roman:'vi'}],
  minor:[{deg:0,type:'min',roman:'i'},{deg:3,type:'maj',roman:'III'},{deg:5,type:'min',roman:'iv'},
         {deg:7,type:'maj',roman:'V'},{deg:7,type:'min',roman:'v'},{deg:8,type:'maj',roman:'VI'},
         {deg:10,type:'maj',roman:'VII'}]
};
const TRANS = {
  major:{
    I:{IV:1.6,V:2.6,vi:1.5,ii:1.6,iii:.8,V7:2.6}, ii:{V:2.6,V7:3.0,IV:.8,I:.3,vi:.6},
    iii:{vi:2.0,IV:1.6,ii:.8}, IV:{V:2.6,V7:2.6,ii:1.0,I:1.5,vi:.8},
    V:{I:3.5,vi:1.5,IV:.5,ii:.4}, V7:{I:3.6,vi:1.6,IV:.5},
    vi:{ii:2.0,IV:2.0,V:1.5,iii:.5,I:.3}
  },
  minor:{
    i:{iv:1.6,V:2.4,VI:1.8,VII:1.6,III:1.2,v:1.4}, III:{VI:1.8,VII:1.6,iv:1.2,i:.8},
    iv:{V:2.4,i:2.0,VII:1.0,VI:.8}, V:{i:3.2,VI:1.6,iv:.6}, v:{i:2.0,VI:1.4,VII:1.2},
    VI:{VII:2.0,iv:1.6,V:1.4,i:1.0}, VII:{i:2.2,III:1.6,VI:1.2}
  }
};
