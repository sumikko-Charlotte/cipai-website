/* >>> file: src/js/20a-text-kb.js */
/* ============================================================
   20. 文字配乐 · 一、知识库
   音阶（五声 / 六声 / 七声清乐·雅乐·燕乐）
   ============================================================ */
const SCALES = {
  pent:{name:'五声音阶（宫商角徵羽）', iv:[0,2,4,7,9],      five:true},
  liu :{name:'六声音阶（加清角）',     iv:[0,2,4,5,7,9],    five:true},
  qing:{name:'七声清乐音阶',           iv:[0,2,4,5,7,9,11], five:false},
  ya  :{name:'七声雅乐音阶',           iv:[0,2,4,6,7,9,11], five:false},
  yan :{name:'七声燕乐音阶',           iv:[0,2,4,5,7,9,10], five:false}
};
/* 调式：主音相对「宫音」的半音数（宫=0 商=2 角=4 徵=7 羽=9） */
const MODES5 = {
  gong :{name:'宫调式', deg:0},
  shang:{name:'商调式', deg:2},
  jue  :{name:'角调式', deg:4},
  zhi  :{name:'徵调式', deg:7},
  yu   :{name:'羽调式', deg:9}
};

/* ---- 十七宫调：情感色彩引自元·燕南芝庵《唱论》 ---- */
const GONG_DIAO = [
  {k:'zheng',     name:'正宫',   mood:'惆怅雄壮', mode:'gong', scale:'qing', style:'classical', bpm:66, note:'庄重沉郁，宜写家国之叹、悼古伤今。'},
  {k:'zhonglv',   name:'中吕宫', mood:'高下闪赚', mode:'gong', scale:'qing', style:'classical', bpm:72, note:'起伏跌宕，宜写情绪骤转、情境更迭。'},
  {k:'nanlv',     name:'南吕宫', mood:'感叹伤悲', mode:'yu',   scale:'ya',   style:'chinese',   bpm:60, note:'悲慨低回，宜写离愁别恨、身世飘零。'},
  {k:'xianlv',    name:'仙吕宫', mood:'清新绵邈', mode:'zhi',  scale:'qing', style:'folk',      bpm:76, note:'清朗悠远，宜写山水闲适、轻愁淡怨。'},
  {k:'huangzhong',name:'黄钟宫', mood:'富贵缠绵', mode:'gong', scale:'ya',   style:'classical', bpm:70, note:'明丽堂皇，宜写宴饮盛景、欢会缠绵。'},
  {k:'daogong',   name:'道宫',   mood:'飘逸清幽', mode:'yu',   scale:'qing', style:'lofi',      bpm:64, note:'超然远引，宜写方外之思、清空之境。'},
  {k:'dashi',     name:'大石调', mood:'风流蕴藉', mode:'shang',scale:'qing', style:'ballad',    bpm:74, note:'含蓄多情，宜写相思风月、才子佳人。'},
  {k:'xiaoshi',   name:'小石调', mood:'旖旎妩媚', mode:'zhi',  scale:'yan',  style:'citypop',   bpm:88, note:'柔媚宛转，宜写闺阁春思、花间艳情。'},
  {k:'gaoping',   name:'高平调', mood:'条畅滉漾', mode:'zhi',  scale:'qing', style:'folk',      bpm:84, note:'舒展流动，宜写行旅开阔、田园长调。'},
  {k:'banshe',    name:'般涉调', mood:'拾掇坑堑', mode:'jue',  scale:'qing', style:'chinese',   bpm:78, note:'顿挫铿锵，宜写边塞征戍、慷慨悲歌。'},
  {k:'xiezhi',    name:'歇指调', mood:'急并虚歇', mode:'gong', scale:'qing', style:'chip',      bpm:104,note:'急促断促，宜写急管繁弦、快意短章。'},
  {k:'shangjue',  name:'商角调', mood:'悲伤宛转', mode:'jue',  scale:'ya',   style:'chinese',   bpm:62, note:'哀而不伤，宜写幽怨低诉、故人长别。'},
  {k:'shuang',    name:'双调',   mood:'健捷激袅', mode:'shang',scale:'qing', style:'country',   bpm:96, note:'爽利矫健，宜写豪迈快语、行乐及时。'},
  {k:'shang',     name:'商调',   mood:'凄怆怨慕', mode:'shang',scale:'qing', style:'chinese',   bpm:64, note:'凄清怨慕，宜写秋夜独坐、旧情难遣。'},
  {k:'jue',       name:'角调',   mood:'呜咽悠扬', mode:'jue',  scale:'yan',  style:'chinese',   bpm:58, note:'呜咽绵长，宜写幽咽低吟、羁旅孤怀。'},
  {k:'gongd',     name:'宫调',   mood:'典雅沉重', mode:'gong', scale:'ya',   style:'classical', bpm:68, note:'端凝雅正，宜写庙堂颂赞、礼乐正声。'},
  {k:'yue',       name:'越调',   mood:'陶写冷笑', mode:'jue',  scale:'qing', style:'chinese',   bpm:70, note:'清峭冷峻，宜写讽喻诙谐、冷眼看世。'}
];
const GONG_MAP = {}; GONG_DIAO.forEach(g => GONG_MAP[g.k] = g);

/* ---- 词牌 / 诗体格律库（正体字数，句式以字数序列表示） ---- */
const CI_PAI = [
  {name:'忆江南',kind:'ci',n:27,lc:5,lines:[3,5,7,7,5],alt:['望江南','江南好','梦江南'],gong:'xianlv',sample:'日出江花红胜火，春来江水绿如蓝'},
  {name:'如梦令',kind:'ci',n:33,lc:7,lines:[6,6,5,6,2,2,6],alt:['忆仙姿','宴桃源','比梅'],gong:'zhonglv',sample:'知否，知否，应是绿肥红瘦'},
  {name:'相见欢',kind:'ci',n:36,lc:7,lines:[6,3,9,3,3,3,9],alt:['乌夜啼','秋夜月','上西楼'],gong:'nanlv',sample:'无言独上西楼，月如钩'},
  {name:'长相思',kind:'ci',n:36,lc:8,lines:[3,3,7,5,3,3,7,5],alt:['吴山青','山渐青','双红豆'],gong:'shuang',sample:'山一程，水一程，身向榆关那畔行'},
  {name:'生查子',kind:'ci',n:40,lc:8,lines:[5,5,5,5,5,5,5,5],alt:['楚云深','梅和柳','晴色入青山'],gong:'zhonglv',sample:'去年元夜时，花市灯如昼'},
  {name:'点绛唇',kind:'ci',n:41,lc:9,lines:[4,7,4,5,4,5,3,4,5],alt:['点樱桃','十八香','南浦月'],gong:'xianlv',sample:'和羞走，倚门回首，却把青梅嗅'},
  {name:'浣溪沙',kind:'ci',n:42,lc:6,lines:[7,7,7,7,7,7],alt:['满院春','东风寒','踏花天'],gong:'zhonglv',sample:'无可奈何花落去，似曾相识燕归来'},
  {name:'卜算子',kind:'ci',n:44,lc:8,lines:[5,5,7,5,5,5,7,5],alt:['缺月挂疏桐','百尺楼','眉峰碧'],gong:'xianlv',sample:'我住长江头，君住长江尾'},
  {name:'菩萨蛮',kind:'ci',n:44,lc:8,lines:[7,7,5,5,5,5,5,5],alt:['子夜歌','重叠金','花间意'],gong:'zhonglv',sample:'平林漠漠烟如织，寒山一带伤心碧'},
  {name:'采桑子',kind:'ci',n:44,lc:8,lines:[7,4,4,7,7,4,4,7],alt:['丑奴儿','罗敷媚','醉梦迷'],gong:'xianlv',sample:'少年不识愁滋味，爱上层楼'},
  {name:'清平乐',kind:'ci',n:46,lc:8,lines:[4,5,7,6,6,6,6,6],alt:['清平乐令','忆萝月','醉东风'],gong:'yue',sample:'茅檐低小，溪上青青草'},
  {name:'西江月',kind:'ci',n:50,lc:8,lines:[6,6,7,6,6,6,7,6],alt:['白蘋香','步虚词','江月令'],gong:'zhonglv',sample:'明月别枝惊鹊，清风半夜鸣蝉'},
  {name:'醉花阴',kind:'ci',n:52,lc:10,lines:[7,5,5,4,5,7,5,5,4,5],alt:['醉花阴令'],gong:'zhonglv',sample:'莫道不消魂，帘卷西风，人比黄花瘦'},
  {name:'浪淘沙令',kind:'ci',n:54,lc:10,lines:[5,4,7,7,4,5,4,7,7,4],alt:['卖花声','过龙门','浪淘沙'],gong:'xiezhi',sample:'流水落花春去也，天上人间'},
  {name:'鹧鸪天',kind:'ci',n:55,lc:9,lines:[7,7,7,7,3,3,7,7,7],alt:['思佳客','思越人','剪朝霞'],gong:'dashi',sample:'舞低杨柳楼心月，歌尽桃花扇底风'},
  {name:'玉楼春',kind:'ci',n:56,lc:8,lines:[7,7,7,7,7,7,7,7],alt:['木兰花','春晓曲','惜春容'],gong:'shuang',sample:'绿杨烟外晓寒轻，红杏枝头春意闹'},
  {name:'南乡子',kind:'ci',n:56,lc:10,lines:[5,7,7,2,7,5,7,7,2,7],alt:['好离乡','蕉叶怨'],gong:'zhonglv',sample:'千古兴亡多少事？悠悠，不尽长江滚滚流'},
  {name:'虞美人',kind:'ci',n:56,lc:8,lines:[7,5,7,9,7,5,7,9],alt:['一江春水','玉壶冰','虞美人令'],gong:'zhonglv',sample:'问君能有几多愁？恰似一江春水向东流'},
  {name:'鹊桥仙',kind:'ci',n:56,lc:10,lines:[4,4,6,7,7,4,4,6,7,7],alt:['鹊桥仙令','忆人人','金风玉露相逢曲'],gong:'xianlv',sample:'两情若是久长时，又岂在朝朝暮暮'},
  {name:'踏莎行',kind:'ci',n:58,lc:10,lines:[4,4,7,7,7,4,4,7,7,7],alt:['踏雪行','柳长春','喜朝天'],gong:'zhonglv',sample:'郴江幸自绕郴山，为谁流下潇湘去'},
  {name:'蝶恋花',kind:'ci',n:60,lc:10,lines:[7,4,5,7,7,7,4,5,7,7],alt:['鹊踏枝','凤栖梧','黄金缕','卷珠帘'],gong:'shang',sample:'衣带渐宽终不悔，为伊消得人憔悴'},
  {name:'一剪梅',kind:'ci',n:60,lc:12,lines:[7,4,4,7,4,4,7,4,4,7,4,4],alt:['腊梅香','玉簟秋'],gong:'huangzhong',sample:'此情无计可消除，才下眉头，却上心头'},
  {name:'临江仙',kind:'ci',n:60,lc:10,lines:[7,6,7,5,5,7,6,7,5,5],alt:['谢新恩','雁后归','画屏春'],gong:'xianlv',sample:'古今多少事，都付笑谈中'},
  {name:'定风波',kind:'ci',n:62,lc:11,lines:null,alt:['卷春空','定风流','醉琼枝'],gong:'shuang',sample:'回首向来萧瑟处，归去，也无风雨也无晴'},
  {name:'破阵子',kind:'ci',n:62,lc:10,lines:[6,6,7,7,5,6,6,7,7,5],alt:['十拍子','破阵乐'],gong:'shuang',sample:'了却君王天下事，赢得生前身后名'},
  {name:'渔家傲',kind:'ci',n:62,lc:10,lines:[7,7,7,3,7,7,7,7,3,7],alt:['吴门柳','荆溪咏','游仙咏'],gong:'banshe',sample:'四面边声连角起。千嶂里，长烟落日孤城闭'},
  {name:'苏幕遮',kind:'ci',n:62,lc:14,lines:[3,3,4,5,7,4,5,3,3,4,5,7,4,5],alt:['古调歌','鬓云松令','云雾敛'],gong:'banshe',sample:'明月楼高休独倚，酒入愁肠，化作相思泪'},
  {name:'青玉案',kind:'ci',n:67,lc:13,lines:[7,3,3,7,4,4,5,7,7,7,4,4,5],alt:['横塘路','西湖路','青莲池上客'],gong:'zhonglv',sample:'众里寻他千百度，蓦然回首，那人却在，灯火阑珊处'},
  {name:'江城子',kind:'ci',n:70,lc:16,lines:[7,3,3,4,5,7,3,3,7,3,3,4,5,7,3,3],alt:['江神子','村意远','水晶帘'],gong:'shuang',sample:'十年生死两茫茫，不思量，自难忘'},
  {name:'满江红',kind:'ci',n:93,lc:18,lines:null,alt:['上江虹','念良游','伤春曲'],gong:'xianlv',sample:'三十功名尘与土，八千里路云和月'},
  {name:'水调歌头',kind:'ci',n:95,lc:19,lines:null,alt:['元会曲','凯歌','台城游'],gong:'zhonglv',sample:'但愿人长久，千里共婵娟'},
  {name:'声声慢',kind:'ci',n:97,lc:18,lines:null,alt:['凤求凰','胜胜慢','人在楼上'],gong:'xianlv',sample:'寻寻觅觅，冷冷清清，凄凄惨惨戚戚'},
  {name:'念奴娇',kind:'ci',n:100,lc:22,lines:null,alt:['百字令','大江东去','酹江月'],gong:'dashi',sample:'大江东去，浪淘尽，千古风流人物'},
  {name:'雨霖铃',kind:'ci',n:103,lc:19,lines:null,alt:['雨霖铃慢'],gong:'shuang',sample:'今宵酒醒何处？杨柳岸，晓风残月'},
  {name:'永遇乐',kind:'ci',n:104,lc:22,lines:null,alt:['消息'],gong:'xiezhi',sample:'想当年，金戈铁马，气吞万里如虎'},
  {name:'沁园春',kind:'ci',n:114,lc:25,lines:null,alt:['寿星明','洞庭春色','东仙'],gong:'banshe',sample:'数风流人物，还看今朝'},
  {name:'五言绝句',kind:'shi',n:20,lc:4,lines:[5,5,5,5],alt:['五绝'],gong:'zheng',sample:'空山不见人，但闻人语响'},
  {name:'七言绝句',kind:'shi',n:28,lc:4,lines:[7,7,7,7],alt:['七绝'],gong:'zheng',sample:'两个黄鹂鸣翠柳，一行白鹭上青天'},
  {name:'五言律诗',kind:'shi',n:40,lc:8,lines:[5,5,5,5,5,5,5,5],alt:['五律'],gong:'huangzhong',sample:'国破山河在，城春草木深'},
  {name:'七言律诗',kind:'shi',n:56,lc:8,lines:[7,7,7,7,7,7,7,7],alt:['七律'],gong:'huangzhong',sample:'无边落木萧萧下，不尽长江滚滚来'}
];
