/* =========================================================
   takofarm.js（畑 / roten.jsのseed_token方式に完全統一・安定版）
   ✅ 在庫キー: tf_v1_inv（rotenと共通）
   ✅ seed_tokenキー: tf_v1_seedtokens（rotenと共通 / {ver,tokens:[{token,collabId,issuedAt,status}]}）
   ✅ コラボ種IDは roten と同じ: seed_collab
   ✅ 過去コラボ種(seed_colabo等)は完全撤去（邪魔をしない）
   ✅ コラボ種は「invの数」ではなく「ISSUED token本数」で表示/消費
   ✅ 植える：ISSUED token を1本PLANTEDにして plot.seedToken に保持（必要ならGAS plant）
   ✅ 収穫：GAS harvest(seedToken)でカード確定 → 図鑑保存 → tokenをHARVESTED
========================================================= */
(() => {
  console.log("✅ takofarm.js loaded", new Date().toISOString());
  "use strict";

  // =========================
  // マス画像（状態ごと）
  // =========================
  const PLOT_IMG = {
    EMPTY: "https://ul.h3z.jp/muPEAkao.png",

    // 通常成長
    GROW1: "https://ul.h3z.jp/BrHRk8C4.png",
    GROW2: "https://ul.h3z.jp/tD4LUB6F.png",

    // ✅ コラボ成長（GIF）
    COLLAB_GROW1: "https://ul.h3z.jp/cq1soJdm.gif",
    COLLAB_GROW2: "https://ul.h3z.jp/I6Iu4J32.gif",

    READY: "https://ul.h3z.jp/AmlnQA1b.png",
    BURN:  "https://ul.h3z.jp/q9hxngx6.png",

    // ✅ SR保証系（※コラボ/固定タネでは出さない）
    GROW2_SR65:  "https://ul.h3z.jp/HfpFoeBk.png",
    GROW2_SR100: "https://ul.h3z.jp/tBVUoc8w.png"
  };

  // =========================
  // LocalStorage Keys
  // =========================
  const LS = {
    state:  "tf_v1_state",
    book:   "tf_v1_book",
    player: "tf_v1_player",
    inv:    "tf_v1_inv",
    loadout:"tf_v1_loadout",
    octo:   "roten_v1_octo",
    seedTokens: "tf_v1_seedtokens",
  };

  // =========================
  // GAS（roten.jsと同じにする）
  // =========================
  const GAS_URL = "https://script.google.com/macros/s/AKfycbwFhJjpj0IidOYf95dyANLFYnIYTuPFFaAKOVxmfGmWJW-9AsCGQBsW90uEitpIpcdm/exec";
  const GAS_KEY = "takopi-serial-2026";

  // ✅ roten.jsと同じ “コラボ種ID”
  const SEED_COLLAB_ID = "seed_collab";

  // =========================
  // 育成時間など
  // =========================
  const BASE_GROW_MS = 5 * 60 * 60 * 1000;      // 5時間
  const READY_TO_BURN_MS = 24 * 60 * 60 * 1000; // READYから焦げまで
  const TICK_MS = 1000;

  // ベース（使わないなら水ratesが優先）
  const BASE_RARITY_RATE = { N:70, R:20, SR:8, UR:1.8, LR:0.2 };

  // =========================================================
  // ✅ カードプール（あなたの現行のまま）
  // （※長いのでここは「貼り付けてOK」状態で残します）
  // =========================================================
  const CARD_POOLS = {
    N: [
      { no:"TN-005", name:"たこ焼きタワー112", img:"https://ul.h3z.jp/LoXMSiYd.jpg" },
      { no:"TN-006", name:"塩顔パレード焼き", img:"https://ul.h3z.jp/7L7rcrnM.jpg" },
      { no:"TN-009", name:"塩マヨ露天焼き", img:"https://ul.h3z.jp/bF9QmTE8.jpg" },
      { no:"TN-011", name:"チーズ火山焼き", img:"https://ul.h3z.jp/BEj3BIcP.jpg" },
      { no:"TN-012", name:"揚げ玉会議焼き", img:"https://ul.h3z.jp/vVw2FjQp.jpg" },
      { no:"TN-013", name:"くたびれ塩こしょう焼き", img:"https://ul.h3z.jp/DlX5pLJ5.jpg" },
      { no:"TN-016", name:"たこ焼き、発射オーライ", img:"https://ul.h3z.jp/50WYMkYw.jpg" },
      { no:"TN-018", name:"ゆのかわの主", img:"https://ul.h3z.jp/mkLBMxIT.jpg" },
      { no:"TN-019", name:"誤入店トラップ", img:"https://ul.h3z.jp/YfON5rBJ.jpg" },
      { no:"TN-021", name:"たこ焼き、流れて候", img:"https://ul.h3z.jp/O4s1VpWd.jpg" },
      { no:"TN-023", name:"芝生かたこ焼きか大会", img:"https://ul.h3z.jp/FZcOaXY8.jpg" },
      { no:"TN-024", name:"温泉女神のありがた迷惑", img:"https://ul.h3z.jp/A6WhBsqj.jpg" },
      { no:"TN-026", name:"たこ焼き48回リボ払い", img:"https://ul.h3z.jp/hz7JXyky.jpg" },
      { no:"TN-027", name:"全身たこ焼きダイエット", img:"https://ul.h3z.jp/FQ3poZLg.jpg" },
      { no:"TN-028", name:"自己啓発たこ塾《井上諒プロ🎯》", img:"https://ul.h3z.jp/sPChFFlG.jpg" },
      { no:"TN-029", name:"カロリーゼロ理論《仁木治プロ🎯》", img:"https://ul.h3z.jp/4HEbt3YP.jpg" },
      { no:"TN-031", name:"行列の最後尾が別県", img:"https://ul.h3z.jp/LBdFqlLI.jpg" },
      { no:"TN-034", name:"エシカル過剰焼き", img:"https://ul.h3z.jp/KRkSq4WD.jpg" },
      { no:"TN-036", name:"マヨネーズ詐欺", img:"https://ul.h3z.jp/NzVgPYdG.jpg" },
      { no:"TN-037", name:"勘違いデート", img:"https://ul.h3z.jp/riYYAnEi.jpg" },
      { no:"TN-041", name:"玉の上にも三年", img:"https://ul.h3z.jp/pQg0jZMy.jpg" },
      { no:"TN-043", name:"転生したら即売れたこ焼き", img:"https://ul.h3z.jp/I3JWnpoL.jpg" },
      { no:"TN-046", name:"ごますりたこ焼き", img:"https://ul.h3z.jp/tuLsTiaz.jpg" },
      { no:"TN-048", name:"店主反撃レビュー《佐俣雄一郎🎯》", img:"https://ul.h3z.jp/ge8b4cQ5.jpg" },
    ],
    R: [
      { no:"TN-002", name:"熱々地獄の給たこ所", img:"https://ul.h3z.jp/otr0dAQi.jpg" },
      { no:"TN-003", name:"爆走！たこ焼きライダー菜々", img:"https://ul.h3z.jp/06HrUPMT.jpg" },
      { no:"TN-008", name:"明太ギャラクシー焼き", img:"https://ul.h3z.jp/xye1uAfV.jpg" },
      { no:"TN-014", name:"世界たこ焼き釣り選手権大会", img:"https://ul.h3z.jp/cyekwiam.jpg" },
      { no:"TN-017", name:"たこ焼きマニフェスト", img:"https://ul.h3z.jp/zeSwFyjz.jpg" },
      { no:"TN-022", name:"たこ焼きダーツインフェルノ《對馬裕佳子プロ🎯》", img:"https://ul.h3z.jp/Prf7KxRk.jpg" },
      { no:"TN-032", name:"国境超えた恋", img:"https://ul.h3z.jp/9AZcVNmR.jpg" },
      { no:"TN-035", name:"デリバリー長距離便", img:"https://ul.h3z.jp/z0xhODVy.jpg" },
      { no:"TN-038", name:"恋落ちマッチング", img:"https://ul.h3z.jp/BPEoWjuY.jpg" },
      { no:"TN-042", name:"たこ焼きループザループ", img:"https://ul.h3z.jp/vxKamb6f.jpg" },
      { no:"TN-044", name:"白い契約(稲石裕プロ🎯)", img:"https://ul.h3z.jp/bC1B4WkQ.jpg" },
      { no:"TN-047", name:"ボスゲート", img:"https://ul.h3z.jp/GHWrtaYk.jpg" },
    ],
    SR: [
      { no:"TN-004", name:"見えるフリ焼き", img:"https://ul.h3z.jp/irs6Sxoy.jpg" },
      { no:"TN-010", name:"焼ク者ノ証", img:"https://ul.h3z.jp/6A2LOn4A.jpg" },
      { no:"TN-015", name:"顔コイン", img:"https://ul.h3z.jp/7GUyGDU1.jpg" },
      { no:"TN-020", name:"ピック不要の真実", img:"https://ul.h3z.jp/Bu1pk4ul.jpg" },
      { no:"TN-030", name:"ガチャたこ焼き", img:"https://ul.h3z.jp/kFpjcqSv.jpg" },
      { no:"TN-039", name:"ドローン誤配達", img:"https://ul.h3z.jp/70A10oHf.jpg" },
      { no:"TN-040", name:"推し活たこ団扇", img:"https://ul.h3z.jp/jY5MVsrt.jpg" },
      { no:"TN-049", name:"たこ焼きの御神体", img:"https://ul.h3z.jp/GQ8H0lGq.jpg" },
    ],
    UR: [
      { no:"TN-001", name:"黒き真珠イカさま焼き", img:"assets/images/1stcard/001ur1.png" },
      { no:"TN-007", name:"ローソク出せ！", img:"assets/images/1stcard/007ur1.png" },
      { no:"TN-033", name:"鉄板のビーナス", img:"assets/images/1stcard/033ur1.png" },
      { no:"TN-045", name:"ドリームファイト", img:"assets/images/1stcard/045ur1.png" },
    ],
    LR: [
      { no:"TN-025", name:"たこ焼き化石in函館山", img:"https://ul.h3z.jp/NEuFQ7PB.png" },
      { no:"TN-050", name:"焼かれし記憶、ソースに還る", img:"assets/images/1stcard/050lr1.png" },
    ],
  };

  // =========================================================
  // ✅ 種（roten.jsと合わせる / 旧seed_colabo等は削除）
  // =========================================================
  const SEEDS = [
    { id:"seed_random",  name:"なに出るタネ", desc:"何が育つかは完全ランダム。\n店主も知らない。", factor:1.00, img:"https://ul.h3z.jp/gnyvP580.png", fx:"完全ランダム" },
    { id:"seed_shop",    name:"店頭タネ",     desc:"店で生まれたタネ。\n店頭ナンバーを宿している。", factor:1.00, img:"https://ul.h3z.jp/IjvuhWoY.png", fx:"店頭の気配" },
    { id:"seed_line",    name:"回線タネ",     desc:"画面の向こうから届いたタネ。\nクリックすると芽が出る。", factor:1.00, img:"https://ul.h3z.jp/AonxB5x7.png", fx:"回線由来" },
    { id:"seed_special", name:"たこぴのタネ", desc:"このタネを植えたら、\n必ず「たこぴ8枚」から出る。", factor:1.00, img:"https://ul.h3z.jp/29OsEvjf.png", fx:"たこぴ専用8枚" },

    { id:"seed_bussasari", name:"ブッ刺さりタネ", desc:"刺さるのは心だけ。\n出るのは5枚だけ（全部N）。", factor:1.05, img:"https://ul.h3z.jp/MjWkTaU3.png", fx:"刺さり固定5枚" },
    { id:"seed_namara_kawasar", name:"なまら買わさるタネ", desc:"気付いたら買ってる。\n12枚固定（内訳：LR/UR/SR/R/N）。", factor:1.08, img:"https://ul.h3z.jp/yiqHzfi0.png", fx:"買わさり固定12枚" },

    // ✅ これが “roten.jsのシリアル種” と同じID
    { id:SEED_COLLAB_ID, name:"【コラボ】シリアルのタネ", desc:"購入不可。\nシリアルで seed_token が増える。\n畑で植えると結果が確定しているカードが出る。", factor:1.00, img:"https://ul.h3z.jp/wbnwoTzm.png", fx:"サーバー確定" },
  ];

  const WATERS = [
    { id:"water_plain_free", name:"ただの水", desc:"無料・UR/LRなし。\n無課金の基準。", factor:1.00, fx:"基準（水）", img:"https://ul.h3z.jp/13XdhuHi.png", rates:{ N:62.5, R:31.2, SR:6.3, UR:0, LR:0 } },
    { id:"water_nice", name:"なんか良さそうな水", desc:"ちょい上振れ・LRなし。\n初心者の背中押し。", factor:0.98, fx:"ちょい上振れ", img:"https://ul.h3z.jp/3z04ypEd.png", rates:{ N:57.2, R:31.8, SR:8.9, UR:2.1, LR:0 } },
    { id:"water_suspicious", name:"怪しい水", desc:"現実準拠・標準。\n実パックと同じ空気。", factor:0.95, fx:"標準（現実準拠）", img:"https://ul.h3z.jp/wtCO9mec.png", rates:{ N:61.5, R:30.8, SR:6.15, UR:1.03, LR:0.51 } },
    { id:"water_overdo", name:"やりすぎな水", desc:"勝負水・現実より上。\n体感で強い。", factor:0.90, fx:"勝負", img:"https://ul.h3z.jp/vsL9ggf6.png", rates:{ N:49.7, R:31.9, SR:12.8, UR:4.1, LR:1.5 } },
    { id:"water_regret", name:"押さなきゃよかった水", desc:"確定枠・狂気。\n事件製造機（SNS向け）", factor:1.00, fx:"事件", img:"https://ul.h3z.jp/L0nafMOp.png", rates:{ N:99.97, R:0, SR:0, UR:0, LR:0.03 } },
  ];

  // ✅ 肥料は “時短だけ”
  const FERTS = [
    { id:"fert_agedama", name:"ただの揚げ玉", desc:"時短0。\n（今は見た目だけ）", factor:1.00, fx:"時短 0%", img:"https://ul.h3z.jp/9p5fx53n.png", burnCardUp:0.12, rawCardChance:0.00, skipGrowAnim:false },
    { id:"fert_feel", name:"気のせい肥料", desc:"早くなった気がする。\n気のせいかもしれない。", factor:0.95, fx:"時短 5%", img:"https://ul.h3z.jp/XqFTb7sw.png", burnCardUp:0.00, rawCardChance:0.00, skipGrowAnim:false },
    { id:"fert_guts", name:"根性論ぶち込み肥料", desc:"理由はない。\n気合いだ。", factor:0.80, fx:"時短 20%", img:"https://ul.h3z.jp/bT9ZcNnS.png", burnCardUp:0.00, rawCardChance:0.00, skipGrowAnim:false },
    { id:"fert_skip", name:"工程すっ飛ばし肥料", desc:"途中は、\n見なかったことにした。", factor:0.60, fx:"時短 40%", img:"https://ul.h3z.jp/FqPzx12Q.png", burnCardUp:0.00, rawCardChance:0.01, skipGrowAnim:true },
    { id:"fert_timeno", name:"時間を信じない肥料", desc:"最終兵器・禁忌。\n（今は時短だけ）", factor:0.10, fx:"時短 90〜100%", img:"https://ul.h3z.jp/l2njWY57.png", burnCardUp:0.00, rawCardChance:0.03, skipGrowAnim:true },
  ];

  // =========================
  // ★たこぴのタネ専用（8枚）
  // =========================
  const TAKOPI_SEED_POOL = [
    { id:"TP-001", name:"届け！たこぴ便", img:"https://ul.h3z.jp/rjih1Em9.png", rarity:"N" },
    { id:"TP-002", name:"ハロウィンたこぴ", img:"https://ul.h3z.jp/hIDWKss0.png", rarity:"N" },
    { id:"TP-003", name:"紅葉たこぴ", img:"https://ul.h3z.jp/G05m1hbT.png", rarity:"N" },
    { id:"TP-004", name:"クリスマスたこぴ", img:"https://ul.h3z.jp/FGEKvxhK.png", rarity:"N" },
    { id:"TP-005", name:"お年玉たこぴ", img:"https://ul.h3z.jp/OPz58Wt6.png", rarity:"N" },
    { id:"TP-006", name:"バレンタインたこぴ", img:"https://ul.h3z.jp/J0kj3CLb.png", rarity:"N" },
    { id:"TP-007", name:"花見たこぴ", img:"https://ul.h3z.jp/KrCy4WQb.png", rarity:"UR" },
    { id:"TP-008", name:"入学たこぴ", img:"https://ul.h3z.jp/DidPdK9b.png", rarity:"UR" },
  ];

  // =========================
  // ✅ ブッ刺さりタネ：専用5種（全部N固定）
  // =========================
  const BUSSASARI_POOL = [
    { id:"BS-001", name:"たこ焼きダーツインフェルノ《對馬裕佳子》", img:"https://ul.h3z.jp/l5roYZJ4.png", rarity:"N" },
    { id:"BS-002", name:"店主反撃レビュー《佐俣雄一郎》", img:"https://ul.h3z.jp/BtOTLlSo.png", rarity:"N" },
    { id:"BS-003", name:"自己啓発タコ塾《井上諒》", img:"https://ul.h3z.jp/P5vsAste.png", rarity:"N" },
    { id:"BS-004", name:"カロリーゼロ理論《仁木治》", img:"https://ul.h3z.jp/ZGBzzH2r.png", rarity:"N" },
    { id:"BS-005", name:"白い契約《稲石裕》", img:"https://ul.h3z.jp/nmiaCKae.png", rarity:"N" },
  ];

  // =========================
  // ✅ なまら買わさるタネ：専用12種（レア内訳固定）
  // =========================
  const NAMARA_POOL = [
    { id:"NK-001", name:"イカさま焼き", img:"https://ul.h3z.jp/1UB3EY1B.png",  rarity:"LR" },
    { id:"NK-002", name:"定番のソース", img:"https://ul.h3z.jp/MBZcFmq9.png",  rarity:"N"  },
    { id:"NK-003", name:"すっぴん", img:"https://ul.h3z.jp/A6botkfp.png",  rarity:"N"  },
    { id:"NK-004", name:"チーズソースマヨ", img:"https://ul.h3z.jp/MmkNjIJM.png",  rarity:"SR" },
    { id:"NK-005", name:"めんたいマヨ", img:"https://ul.h3z.jp/9oc1iVPt.png",  rarity:"SR" },
    { id:"NK-006", name:"ねぎ味噌", img:"https://ul.h3z.jp/vf60iccW.png",  rarity:"SR" },
    { id:"NK-007", name:"牡蠣だし醤油", img:"https://ul.h3z.jp/zwVHhrgx.png",  rarity:"SR" },
    { id:"NK-008", name:"塩こしょう", img:"https://ul.h3z.jp/KlgnlC2H.png",  rarity:"UR" },
    { id:"NK-009", name:"辛口ソース", img:"https://ul.h3z.jp/OavcxTBn.png",  rarity:"R"  },
    { id:"NK-010", name:"ぶっかけ揚げ玉からしマヨ", img:"https://ul.h3z.jp/CcOw6yLq.png", rarity:"SR" },
    { id:"NK-011", name:"塩マヨペッパー", img:"https://ul.h3z.jp/7UJoTCe7.png", rarity:"R"  },
    { id:"NK-012", name:"てりたま", img:"https://ul.h3z.jp/MU6ehdTH.png", rarity:"SR" },
  ];

  // =========================================================
  // レベル・XP
  // =========================================================
  const MAX_PLOTS = 25;
  const START_UNLOCK = 3;
  const XP_BY_RARITY = { N:20, R:40, SR:80, UR:160, LR:300, SP:0, COL:0 };

  function xpNeedForLevel(level){
    return 120 + (level - 1) * 50 + Math.floor(Math.pow(level - 1, 1.6) * 20);
  }
  function defaultPlayer(){ return { ver:1, level:1, xp:0, unlocked:START_UNLOCK }; }

  function loadPlayer(){
    try{
      const raw = localStorage.getItem(LS.player);
      if(!raw) return defaultPlayer();
      const p = JSON.parse(raw);
      if(!p || typeof p !== "object") return defaultPlayer();
      const lvl = Math.max(1, Number(p.level||1));
      const xp  = Math.max(0, Number(p.xp||0));
      const unl = Math.min(MAX_PLOTS, Math.max(START_UNLOCK, Number(p.unlocked||START_UNLOCK)));
      return { ver:1, level:lvl, xp:xp, unlocked:unl };
    }catch(e){ return defaultPlayer(); }
  }
  function savePlayer(p){ localStorage.setItem(LS.player, JSON.stringify(p)); }
  let player = loadPlayer();

  // =========================================================
  // 在庫（tf_v1_inv / rotenと共通）
  // =========================================================
  function defaultInv(){
    const inv = { ver:1, seed:{}, water:{}, fert:{} };
    for(const x of SEEDS)  inv.seed[x.id]  = 0;
    for(const x of WATERS) inv.water[x.id] = 0;
    for(const x of FERTS)  inv.fert[x.id]  = 0;
    return inv;
  }
  function loadInv(){
    try{
      const raw = localStorage.getItem(LS.inv);
      if(!raw) return defaultInv();
      const obj = JSON.parse(raw);
      if(!obj || typeof obj !== "object") return defaultInv();
      obj.seed  = obj.seed  || {};
      obj.water = obj.water || {};
      obj.fert  = obj.fert  || {};
      // キー補完
      for(const x of SEEDS)  if(!(x.id in obj.seed))  obj.seed[x.id]=0;
      for(const x of WATERS) if(!(x.id in obj.water)) obj.water[x.id]=0;
      for(const x of FERTS)  if(!(x.id in obj.fert))  obj.fert[x.id]=0;
      obj.ver = 1;
      return obj;
    }catch(e){
      return defaultInv();
    }
  }
  function saveInv(inv){ localStorage.setItem(LS.inv, JSON.stringify(inv)); }

  function invGet(inv, kind, id){
    const box = inv?.[kind] || {};
    const n = Number(box[id] ?? 0);
    return Number.isFinite(n) ? n : 0;
  }
  function invAdd(inv, kind, id, delta){
    if(!inv[kind]) inv[kind] = {};
    const cur = Number(inv[kind][id] ?? 0);
    inv[kind][id] = Math.max(0, cur + delta);
  }
  function invDec(inv, kind, id){
    const cur = invGet(inv, kind, id);
    if(cur <= 0) return false;
    invAdd(inv, kind, id, -1);
    return true;
  }

  // =========================================================
  // ✅ seed_token（roten.jsと同じ構造）
  // =========================================================
  function seedTokensDefault(){
    return { ver:1, tokens:[] }; // tokens: [{token, collabId, issuedAt, status}]
  }
  function loadSeedTokensBox(){
    try{
      const raw = localStorage.getItem(LS.seedTokens);
      if(!raw) return seedTokensDefault();
      const obj = JSON.parse(raw);
      if(!obj || typeof obj !== "object") return seedTokensDefault();
      obj.ver = 1;
      obj.tokens = Array.isArray(obj.tokens) ? obj.tokens : [];
      // normalize
      obj.tokens = obj.tokens.map(t => ({
        token: String(t?.token || "").trim(),
        collabId: String(t?.collabId || "").trim() || null,
        issuedAt: Number(t?.issuedAt || Date.now()),
        status: String(t?.status || "ISSUED").trim().toUpperCase(),
      })).filter(x => x.token);
      // unique
      const seen = new Set();
      obj.tokens = obj.tokens.filter(x => (seen.has(x.token) ? false : (seen.add(x.token), true)));
      return obj;
    }catch(e){
      return seedTokensDefault();
    }
  }
  function saveSeedTokensBox(box){
    const b = box && typeof box === "object" ? box : seedTokensDefault();
    b.ver = 1;
    b.tokens = Array.isArray(b.tokens) ? b.tokens : [];
    localStorage.setItem(LS.seedTokens, JSON.stringify(b));
  }

  function countTokensByStatus(status){
    status = String(status||"").toUpperCase();
    const box = loadSeedTokensBox();
    return box.tokens.filter(t => String(t.status||"").toUpperCase() === status).length;
  }
  function countIssuedTokens(){
    return countTokensByStatus("ISSUED");
  }
  function countIssuedTokensByCollab(){
    const box = loadSeedTokensBox();
    const map = {};
    for(const t of box.tokens){
      if(String(t.status||"").toUpperCase() !== "ISSUED") continue;
      const c = String(t.collabId || "unknown");
      map[c] = (map[c]||0) + 1;
    }
    return map;
  }

  // ✅ rotenの「沼回避」思想：inv.seed[seed_collab] を token本数で同期
  // 畑側は「使える本数」を優先し ISSUED本数を採用（rotenに戻ると総数上書きされても、畑はISSUEDで判断する）
  function syncCollabSeedToInv(){
    const inv = loadInv();
    inv.seed = inv.seed || {};
    inv.seed[SEED_COLLAB_ID] = countIssuedTokens();
    saveInv(inv);
  }

  // ✅ ISSUED token を1本PLANTEDにして plotへ
  function takeOneIssuedToken(){
    const box = loadSeedTokensBox();
    const idx = box.tokens.findIndex(t => String(t.status||"").toUpperCase() === "ISSUED");
    if(idx < 0) return null;
    const picked = box.tokens[idx];
    box.tokens[idx] = { ...picked, status:"PLANTED" };
    saveSeedTokensBox(box);
    syncCollabSeedToInv();
    return picked; // {token, collabId, ...}
  }

  // ✅ plotに入ってるtokenをHARVESTEDへ
  function markTokenHarvested(token){
    token = String(token||"").trim();
    if(!token) return;
    const box = loadSeedTokensBox();
    const idx = box.tokens.findIndex(t => t.token === token);
    if(idx >= 0){
      box.tokens[idx] = { ...box.tokens[idx], status:"HARVESTED" };
      saveSeedTokensBox(box);
      syncCollabSeedToInv();
    }
  }

  // ✅ plotに入ってるtokenをISSUEDへ戻す（植え失敗のロールバック用）
  function rollbackTokenToIssued(token){
    token = String(token||"").trim();
    if(!token) return;
    const box = loadSeedTokensBox();
    const idx = box.tokens.findIndex(t => t.token === token);
    if(idx >= 0){
      box.tokens[idx] = { ...box.tokens[idx], status:"ISSUED" };
      saveSeedTokensBox(box);
      syncCollabSeedToInv();
    }
  }

  // =========================================================
  // ✅ オクト
  // =========================================================
  function loadOcto(){
    const n = Number(localStorage.getItem(LS.octo) ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  function saveOcto(n){
    localStorage.setItem(LS.octo, String(Math.max(0, Math.floor(Number(n) || 0))));
  }

  // =========================================================
  // ✅ ロードアウト
  // =========================================================
  function defaultLoadout(){ return { ver:1, seedId:null, waterId:null, fertId:null }; }
  function loadLoadout(){
    try{
      const raw = localStorage.getItem(LS.loadout);
      if(!raw) return defaultLoadout();
      const obj = JSON.parse(raw);
      if(!obj || typeof obj !== "object") return defaultLoadout();
      return {
        ver:1,
        seedId:  obj.seedId  || null,
        waterId: obj.waterId || null,
        fertId:  obj.fertId  || null,
      };
    }catch(e){
      return defaultLoadout();
    }
  }
  function saveLoadout(l){ localStorage.setItem(LS.loadout, JSON.stringify(l)); }
  let loadout = loadLoadout();

  // =========================================================
  // ✅ state / book
  // =========================================================
  const defaultPlot  = () => ({ state:"EMPTY" });
  const defaultState = () => ({ ver:1, plots: Array.from({length:MAX_PLOTS}, defaultPlot) });

  function loadState(){
    try{
      const raw = localStorage.getItem(LS.state);
      if(!raw) return defaultState();
      const obj = JSON.parse(raw);
      if(!obj || !Array.isArray(obj.plots) || obj.plots.length !== MAX_PLOTS) return defaultState();
      obj.ver = 1;
      return obj;
    }catch(e){ return defaultState(); }
  }
  function saveState(s){ localStorage.setItem(LS.state, JSON.stringify(s)); }

  function loadBook(){
    try{
      const raw = localStorage.getItem(LS.book);
      if(!raw) return { ver:1, got:{} };
      const obj = JSON.parse(raw);
      if(!obj || typeof obj.got !== "object") return { ver:1, got:{} };
      obj.ver = 1;
      obj.got = obj.got || {};
      return obj;
    }catch(e){ return { ver:1, got:{} }; }
  }
  function saveBook(b){ localStorage.setItem(LS.book, JSON.stringify(b)); }

  // =========================================================
  // utils
  // =========================================================
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  function pad2(n){ return String(n).padStart(2,"0"); }
  function fmtRemain(ms){
    if(ms <= 0) return "00:00:00";
    const s = Math.floor(ms/1000);
    const hh = Math.floor(s/3600);
    const mm = Math.floor((s%3600)/60);
    const ss = s%60;
    return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
  }
  function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }

  // =========================================================
  // ✅ GAS helper（rotenと同じ思想：ヘッダ無しでPOST）
  // =========================================================
  async function gasPost(payload){
    const res = await fetch(GAS_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if(!res.ok) throw new Error("通信エラー: HTTP " + res.status);
    const txt = await res.text();
    let json;
    try{ json = JSON.parse(txt); }catch(e){ throw new Error("JSON parse failed: " + txt); }
    return json;
  }

  async function gasPlant(token){
    // GAS側がplant APIを持ってる前提（無ければok扱いにして進める）
    try{
      const data = await gasPost({ api:"plant", apiKey:GAS_KEY, token, app:"farm", ts:Date.now() });
      if(data && data.ok === false) throw new Error(data.error || "plant failed");
      return data || { ok:true };
    }catch(e){
      // plantが未実装でも畑は止めない（沼回避）
      return { ok:true, note:String(e?.message||"") };
    }
  }

  async function gasHarvest(token){
    const data = await gasPost({ api:"harvest", apiKey:GAS_KEY, token, app:"farm", ts:Date.now() });
    if(!data || data.ok === false) throw new Error(data?.error || "harvest failed");
    // 期待：{ok:true, card:{cardId,name,img,rarity,collabId?}} もしくは {ok:true, cardId,name,img,rarity}
    const card = data.card || data;
    return {
      collabId: String(card.collabId || data.collabId || "").trim() || null,
      id: String(card.cardId || card.id || "").trim(),
      name: String(card.name || "").trim() || "NO NAME",
      img: String(card.img || card.image || card.photo || "").trim(),
      rarity: String(card.rarity || "").trim() || "COL",
    };
  }

  // =========================================================
  // ✅ 水だけでレアが決まる（植えた時点で確定）
  // =========================================================
  function pickRarityWithWater(waterId){
    const w = WATERS.find(x => x.id === waterId);
    if (w && w.rates) {
      const rates = w.rates;
      const keys = ["N","R","SR","UR","LR"];
      let total = 0;
      for (const k of keys) total += Math.max(0, Number(rates[k] ?? 0));
      if (total <= 0) return "N";
      let r = Math.random() * total;
      for (const k of keys) {
        r -= Math.max(0, Number(rates[k] ?? 0));
        if (r <= 0) return k;
      }
      return "N";
    }
    const keys = Object.keys(BASE_RARITY_RATE);
    let total = 0;
    for (const k of keys) total += Math.max(0, BASE_RARITY_RATE[k]);
    let r = Math.random() * total;
    for (const k of keys){
      r -= Math.max(0, BASE_RARITY_RATE[k]);
      if (r <= 0) return k;
    }
    return "N";
  }

  // =========================================================
  // 種ごとに「出るTN番号」を制限
  // =========================================================
  function makeTNSet(from, to){
    const set = new Set();
    for(let i=from;i<=to;i++){
      set.add(`TN-${String(i).padStart(3,"0")}`);
    }
    return set;
  }
  const SHOP_TN_SET = makeTNSet(1, 25);
  const LINE_TN_SET = makeTNSet(26, 50);

  function filterPoolBySeed(seedId, pool){
    if(!Array.isArray(pool)) return [];
    if(seedId === "seed_shop") return pool.filter(c => SHOP_TN_SET.has(c.no));
    if(seedId === "seed_line") return pool.filter(c => LINE_TN_SET.has(c.no));
    return pool;
  }
  function getPoolByRarity(rarity){
    const p = (CARD_POOLS && CARD_POOLS[rarity]) ? CARD_POOLS[rarity] : [];
    return Array.isArray(p) ? p : [];
  }
  function fallbackPickBySeed(seedId, startRarity){
    const order = ["LR","UR","SR","R","N"];
    const startIdx = order.indexOf(startRarity);
    const list = (startIdx >= 0) ? order.slice(startIdx) : order;
    for(const r of list){
      const pool = filterPoolBySeed(seedId, getPoolByRarity(r));
      if(pool.length) return { rarity:r, card: pick(pool) };
    }
    const baseN = getPoolByRarity("N");
    return { rarity:"N", card: pick(baseN.length ? baseN : [{no:"TN-000",name:"NO DATA",img:""}]) };
  }

  // =========================================================
  // 固定タネ抽選
  // =========================================================
  function pickBussasariReward(){
    const c = pick(BUSSASARI_POOL);
    return { id:c.id, name:c.name, img:c.img, rarity:"N" };
  }
  function pickNamaraReward(){
    const c = pick(NAMARA_POOL);
    return { id:c.id, name:c.name, img:c.img, rarity:c.rarity };
  }

  // =========================================================
  // 肥料SP抽選（植えた瞬間に確定）
  // =========================================================
  function pickFertSPIfAny(p){
    if(!p) return null;
    const fert = FERTS.find(x => x.id === (p.fertId || null));
    if(!fert) return null;

    const burnP = Number(fert.burnCardUp ?? 0);
    if (burnP > 0 && Math.random() < burnP) {
      return { id:"SP-BURN", name:"焼きすぎたカード", img:"https://ul.h3z.jp/VSQupsYH.png", rarity:"SP" };
    }

    const rawP = Number(fert.rawCardChance ?? 0);
    if (rawP > 0 && Math.random() < rawP) {
      return { id:"SP-RAW", name:"ドロドロ生焼けカード", img:"https://ul.h3z.jp/5E5NpGKP.png", rarity:"SP" };
    }

    return null;
  }

  // =========================================================
  // ✅ 報酬抽選（コラボは “ローカル抽選禁止”：GAS harvestで確定）
  // =========================================================
  function drawRewardForPlotLocal(p){
    // まず肥料SP（最優先）
    const sp = pickFertSPIfAny(p);
    if(sp) return sp;

    // 固定タネ
    if (p && p.seedId === "seed_special") {
      const c = pick(TAKOPI_SEED_POOL);
      return { id:c.id, name:c.name, img:c.img, rarity:(c.rarity || "N") };
    }
    if (p && p.seedId === "seed_bussasari") {
      return pickBussasariReward();
    }
    if (p && p.seedId === "seed_namara_kawasar") {
      return pickNamaraReward();
    }

    // 通常抽選
    const rarity = (p && p.fixedRarity) ? p.fixedRarity : pickRarityWithWater(p ? p.waterId : null);
    const seedId = p ? p.seedId : null;
    const filtered = filterPoolBySeed(seedId, getPoolByRarity(rarity));
    const picked = (filtered.length)
      ? { rarity, card: pick(filtered) }
      : fallbackPickBySeed(seedId, rarity);

    const c = picked.card;
    return { id:c.no, name:c.name, img:c.img, rarity: picked.rarity };
  }

  // =========================================================
  // XP / レベル報酬（最低限）
  // =========================================================
  function addXP(amount){
    if(!Number.isFinite(amount) || amount <= 0) return;
    player.xp += Math.floor(amount);
    while(player.xp >= xpNeedForLevel(player.level)){
      player.xp -= xpNeedForLevel(player.level);
      player.level += 1;
      if(player.unlocked < MAX_PLOTS) player.unlocked += 1;
      // レベルアップ報酬は“現状維持”したいならここに入れる（今回は崩さない）
    }
    savePlayer(player);
  }

  // =========================================================
  // DOM（あなたのHTML前提：不足は即エラー）
  // =========================================================
  const farmEl   = document.getElementById("farm");
  const stBook   = document.getElementById("stBook");
  const stGrow   = document.getElementById("stGrow");
  const stReady  = document.getElementById("stReady");
  const stBurn   = document.getElementById("stBurn");

  const stLevel  = document.getElementById("stLevel");
  const stXP     = document.getElementById("stXP");
  const stXpLeft = document.getElementById("stXpLeft");
  const stXpNeed = document.getElementById("stXpNeed");
  const stXpBar  = document.getElementById("stXpBar");
  const stUnlock = document.getElementById("stUnlock");

  const equipSeedBtn  = document.getElementById("equipSeed");
  const equipWaterBtn = document.getElementById("equipWater");
  const equipFertBtn  = document.getElementById("equipFert");

  const equipSeedImg  = document.getElementById("equipSeedImg");
  const equipWaterImg = document.getElementById("equipWaterImg");
  const equipFertImg  = document.getElementById("equipFertImg");

  const equipSeedName  = document.getElementById("equipSeedName");
  const equipWaterName = document.getElementById("equipWaterName");
  const equipFertName  = document.getElementById("equipFertName");

  const equipSeedCnt  = document.getElementById("equipSeedCnt");
  const equipWaterCnt = document.getElementById("equipWaterCnt");
  const equipFertCnt  = document.getElementById("equipFertCnt");

  const modal  = document.getElementById("modal");
  const mTitle = document.getElementById("mTitle");
  const mBody  = document.getElementById("mBody");
  const mClose = document.getElementById("mClose");

  const __missing = [];
  if(!farmEl) __missing.push("#farm");
  if(!stBook) __missing.push("#stBook");
  if(!stGrow) __missing.push("#stGrow");
  if(!stReady) __missing.push("#stReady");
  if(!stBurn) __missing.push("#stBurn");
  if(!stLevel) __missing.push("#stLevel");
  if(!stXP) __missing.push("#stXP");
  if(!stXpLeft) __missing.push("#stXpLeft");
  if(!stXpNeed) __missing.push("#stXpNeed");
  if(!stXpBar) __missing.push("#stXpBar");
  if(!stUnlock) __missing.push("#stUnlock");

  if(!equipSeedBtn) __missing.push("#equipSeed");
  if(!equipWaterBtn) __missing.push("#equipWater");
  if(!equipFertBtn) __missing.push("#equipFert");

  if(!equipSeedImg) __missing.push("#equipSeedImg");
  if(!equipWaterImg) __missing.push("#equipWaterImg");
  if(!equipFertImg) __missing.push("#equipFertImg");

  if(!equipSeedName) __missing.push("#equipSeedName");
  if(!equipWaterName) __missing.push("#equipWaterName");
  if(!equipFertName) __missing.push("#equipFertName");

  if(!equipSeedCnt) __missing.push("#equipSeedCnt");
  if(!equipWaterCnt) __missing.push("#equipWaterCnt");
  if(!equipFertCnt) __missing.push("#equipFertCnt");

  if(!modal) __missing.push("#modal");
  if(!mTitle) __missing.push("#mTitle");
  if(!mBody) __missing.push("#mBody");
  if(!mClose) __missing.push("#mClose");

  if(__missing.length){
    console.error("❌ 必須DOMが見つからない:", __missing.join(", "));
    alert("HTMLに必須IDが足りません: " + __missing.join(", "));
    return;
  }

  // =========================================================
  // モーダル（閉じる＝確定できる仕組みは維持）
  // =========================================================
  let __harvestCommitFn = null;

  function setHarvestCommit(fn){
    __harvestCommitFn = (typeof fn === "function") ? fn : null;
  }
  function clearHarvestCommit(){
    __harvestCommitFn = null;
  }
  function closeModalOrCommit(){
    if(__harvestCommitFn){
      const fn = __harvestCommitFn;
      __harvestCommitFn = null;
      fn();
      return;
    }
    closeModal();
  }

  function openModal(title, html){
    mTitle.textContent = title;
    mBody.innerHTML = html;
    modal.setAttribute("aria-hidden","false");
    document.body.style.overflow = "hidden";
  }
  function closeModal(){
    modal.setAttribute("aria-hidden","true");
    mBody.innerHTML = "";
    document.body.style.overflow = "";
    clearHarvestCommit();
  }
  mClose.addEventListener("click", closeModalOrCommit);
  modal.addEventListener("click", (e)=>{ if(e.target === modal) closeModalOrCommit(); });
  document.addEventListener("keydown", (e)=>{ if(e.key === "Escape") closeModalOrCommit(); });

  // =========================================================
  // 状態
  // =========================================================
  let state  = loadState();
  let book   = loadBook();
  let inv    = loadInv();

  // =========================================================
  // 描画：装備表示（コラボはISSUED token本数）
  // =========================================================
  function renderLoadout(){
    syncCollabSeedToInv(); // ✅ 先に同期
    inv = loadInv();
    loadout = loadLoadout();

    const seed  = SEEDS.find(x=>x.id===loadout.seedId)  || null;
    const water = WATERS.find(x=>x.id===loadout.waterId) || null;
    const fert  = FERTS.find(x=>x.id===loadout.fertId)  || null;

    if(seed){
      equipSeedImg.src = seed.img;
      equipSeedName.textContent = seed.name;
      if(seed.id === SEED_COLLAB_ID){
        equipSeedCnt.textContent = `×${countIssuedTokens()}`;
      }else{
        equipSeedCnt.textContent = `×${invGet(inv,"seed",seed.id)}`;
      }
    }else{
      equipSeedImg.src = PLOT_IMG.EMPTY;
      equipSeedName.textContent = "未装備";
      equipSeedCnt.textContent = "×0";
    }

    if(water){
      equipWaterImg.src = water.img;
      equipWaterName.textContent = water.name;
      equipWaterCnt.textContent = `×${invGet(inv,"water",water.id)}`;
    }else{
      equipWaterImg.src = PLOT_IMG.EMPTY;
      equipWaterName.textContent = "未装備";
      equipWaterCnt.textContent = "×0";
    }

    if(fert){
      equipFertImg.src = fert.img;
      equipFertName.textContent = fert.name;
      equipFertCnt.textContent = `×${invGet(inv,"fert",fert.id)}`;
    }else{
      equipFertImg.src = PLOT_IMG.EMPTY;
      equipFertName.textContent = "未装備";
      equipFertCnt.textContent = "×0";
    }
  }

  // =========================================================
  // 装備選択モーダル（コラボ種はISSUED token本数）
  // =========================================================
  function openPickGrid(kind){
    syncCollabSeedToInv();
    inv = loadInv();
    loadout = loadLoadout();

    const isSeed  = (kind === "seed");
    const isWater = (kind === "water");
    const isFert  = (kind === "fert");

    const items = isSeed ? SEEDS : isWater ? WATERS : FERTS;
    const invType = isSeed ? "seed" : isWater ? "water" : "fert";
    const title = isSeed ? "種を選ぶ" : isWater ? "水を選ぶ" : "肥料を選ぶ";

    const cells = items.map(x => {
      let cnt = invGet(inv, invType, x.id);
      if(isSeed && x.id === SEED_COLLAB_ID) cnt = countIssuedTokens();
      const disabled = (cnt <= 0);
      const selected =
        (isSeed && loadout.seedId === x.id) ||
        (isWater && loadout.waterId === x.id) ||
        (isFert && loadout.fertId === x.id);

      return `
        <button class="pickCell ${selected ? "is-on":""}" data-id="${x.id}" ${disabled ? "disabled":""}>
          <img src="${x.img}" alt="">
          <div class="pickName">${x.name}</div>
          <div class="pickCnt">×${cnt}</div>
          <div class="pickFx">${x.fx || ""}</div>
        </button>
      `;
    }).join("");

    openModal(title, `
      <div class="pickGrid">${cells}</div>
      <div class="pickRow">
        <button class="btn" id="pickClear">外す</button>
        <button class="btn" id="pickClose">閉じる</button>
      </div>
      <style>
        .pickGrid{display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px;}
        .pickCell{border:1px solid rgba(255,255,255,.18); background:rgba(0,0,0,.18); border-radius:14px; padding:10px; color:#fff; text-align:left}
        .pickCell.is-on{outline:2px solid rgba(127,208,255,.55);}
        .pickCell:disabled{opacity:.42}
        .pickCell img{width:100%; aspect-ratio:1/1; object-fit:contain; image-rendering:auto; border-radius:12px; background:rgba(255,255,255,.04)}
        .pickName{font-weight:900; margin-top:8px; font-size:14px}
        .pickCnt{opacity:.8; font-weight:900; margin-top:2px}
        .pickFx{opacity:.7; font-size:12px; margin-top:6px; line-height:1.3}
        .pickRow{display:flex; gap:10px; margin-top:12px;}
        .pickRow .btn{flex:1; height:42px; border-radius:14px;}
      </style>
    `);

    const root = mBody;
    root.querySelectorAll(".pickCell").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-id");
        if(isSeed) loadout.seedId = id;
        if(isWater) loadout.waterId = id;
        if(isFert) loadout.fertId = id;
        saveLoadout(loadout);
        closeModal();
        renderLoadout();
        renderFarm();
      });
    });

    root.querySelector("#pickClear")?.addEventListener("click", ()=>{
      if(isSeed) loadout.seedId = null;
      if(isWater) loadout.waterId = null;
      if(isFert) loadout.fertId = null;
      saveLoadout(loadout);
      closeModal();
      renderLoadout();
      renderFarm();
    });
    root.querySelector("#pickClose")?.addEventListener("click", closeModal);
  }

  equipSeedBtn.addEventListener("click", ()=>openPickGrid("seed"));
  equipWaterBtn.addEventListener("click", ()=>openPickGrid("water"));
  equipFertBtn.addEventListener("click", ()=>openPickGrid("fert"));

  // =========================================================
  // farm 描画
  // =========================================================
  function plotImgFor(p){
    if(!p || p.state === "EMPTY") return PLOT_IMG.EMPTY;

    const isCollab = (p.seedId === SEED_COLLAB_ID);

    if(p.state === "GROW1") return isCollab ? PLOT_IMG.COLLAB_GROW1 : PLOT_IMG.GROW1;
    if(p.state === "GROW2") return isCollab ? PLOT_IMG.COLLAB_GROW2 : PLOT_IMG.GROW2;
    if(p.state === "READY") return PLOT_IMG.READY;
    if(p.state === "BURN") return PLOT_IMG.BURN;
    return PLOT_IMG.EMPTY;
  }

  function calcCounts(){
    let grow=0, ready=0, burn=0;
    for(const p of state.plots){
      if(p.state === "GROW1" || p.state === "GROW2") grow++;
      if(p.state === "READY") ready++;
      if(p.state === "BURN") burn++;
    }
    const got = book?.got || {};
    let bookCount = 0;
    for(const k of Object.keys(got)){
      const c = Number(got[k]?.count || 0);
      if(c > 0) bookCount += c;
    }
    return { grow, ready, burn, bookCount };
  }

  function renderStats(){
    const { grow, ready, burn, bookCount } = calcCounts();
    stBook.textContent  = String(bookCount);
    stGrow.textContent  = String(grow);
    stReady.textContent = String(ready);
    stBurn.textContent  = String(burn);

    stLevel.textContent = String(player.level);
    stUnlock.textContent = String(player.unlocked);

    const need = xpNeedForLevel(player.level);
    stXpNeed.textContent = String(need);
    stXP.textContent = String(player.xp);
    stXpLeft.textContent = String(Math.max(0, need - player.xp));
    const ratio = need > 0 ? clamp(player.xp / need, 0, 1) : 0;
    stXpBar.style.width = `${Math.round(ratio*100)}%`;
  }

  function renderFarm(){
    syncCollabSeedToInv();
    state = loadState();
    inv = loadInv();
    loadout = loadLoadout();
    renderLoadout();

    const cells = state.plots.map((p, i) => {
      const locked = (i >= player.unlocked);
      const img = locked ? PLOT_IMG.EMPTY : plotImgFor(p);
      const label =
        locked ? "LOCK" :
        (p.state === "EMPTY") ? "空" :
        (p.state === "GROW1" || p.state === "GROW2") ? "育成中" :
        (p.state === "READY") ? "収穫" :
        (p.state === "BURN") ? "焦げ" : "";

      return `
        <button class="plot ${locked?"is-locked":""}" data-i="${i}" type="button" ${locked?"disabled":""}>
          <img src="${img}" alt="">
          <div class="plotLabel">${label}</div>
        </button>
      `;
    }).join("");

    farmEl.innerHTML = `
      <div class="plots">${cells}</div>
      <style>
        .plots{display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:10px;}
        @media (max-width:520px){ .plots{grid-template-columns:repeat(3,minmax(0,1fr));} }
        .plot{border:1px solid rgba(255,255,255,.16); background:rgba(0,0,0,.18); border-radius:14px; padding:8px; color:#fff; text-align:center}
        .plot.is-locked{opacity:.35}
        .plot img{width:100%; aspect-ratio:1/1; object-fit:contain; border-radius:12px; background:rgba(255,255,255,.04)}
        .plotLabel{margin-top:6px; font-weight:900; font-size:12px; opacity:.85}
      </style>
    `;

    farmEl.querySelectorAll(".plot").forEach(btn=>{
      btn.addEventListener("click", ()=> onPlotClick(Number(btn.getAttribute("data-i"))));
    });

    renderStats();
  }

  // =========================================================
  // plot 更新（時間経過）
  // =========================================================
  function updatePlotByTime(p, now){
    if(!p || p.state === "EMPTY") return;

    const plantedAt = Number(p.plantedAt || 0);
    const readyAt   = Number(p.readyAt || 0);
    const burnAt    = Number(p.burnAt || 0);

    if(p.state === "GROW1" || p.state === "GROW2"){
      if(now >= readyAt){
        p.state = "READY";
        return;
      }
      const total = Math.max(1, readyAt - plantedAt);
      const t = clamp((now - plantedAt) / total, 0, 1);
      p.state = (t < 0.5) ? "GROW1" : "GROW2";
      return;
    }

    if(p.state === "READY"){
      if(now >= burnAt){
        p.state = "BURN";
      }
    }
  }

  function tick(){
    const now = Date.now();
    let changed = false;

    for(const p of state.plots){
      const before = p.state;
      updatePlotByTime(p, now);
      if(p.state !== before) changed = true;
    }

    if(changed){
      saveState(state);
      renderFarm();
    }else{
      // statsだけ更新（残り時間を出してないので軽く）
      renderStats();
    }
  }

  // =========================================================
  // 植える / 収穫
  // =========================================================
  function getGrowMs(){
    const fert = FERTS.find(x => x.id === (loadout.fertId||null));
    const factor = fert ? Number(fert.factor||1) : 1;
    const ms = Math.max(5*60*1000, Math.floor(BASE_GROW_MS * factor));
    return ms;
  }

  function needLoadoutForPlant(seedId){
    // コラボはseed_tokenで確定なので、水/肥料は演出用（未装備でも植えられるようにする）
    if(seedId === SEED_COLLAB_ID) return { needWater:false, needFert:false };
    // 通常は水が無いと「レア確定」ロジックがズレるので必須、肥料は任意
    return { needWater:true, needFert:false };
  }

  async function plantPlot(i){
    inv = loadInv();
    loadout = loadLoadout();

    const seedId = loadout.seedId;
    if(!seedId){
      alert("種を装備してね");
      return;
    }

    const needs = needLoadoutForPlant(seedId);
    if(needs.needWater && !loadout.waterId){
      alert("水を装備してね");
      return;
    }

    // ✅ コラボ：inv減らさない。tokenを消費する
    let usedToken = null;
    if(seedId === SEED_COLLAB_ID){
      if(countIssuedTokens() <= 0){
        alert("コラボのタネ（seed_token）が無いよ。\n露店でシリアル発行してね。");
        return;
      }
      usedToken = takeOneIssuedToken(); // {token, collabId}
      if(!usedToken){
        alert("使えるseed_tokenが見つからない…");
        return;
      }
    }else{
      if(!invDec(inv, "seed", seedId)){
        alert("その種が足りない…");
        return;
      }
    }

    // 水/肥料消費（コラボは任意。装備してるなら消費してOK）
    if(loadout.waterId){
      if(!invDec(inv, "water", loadout.waterId)){
        if(usedToken) rollbackTokenToIssued(usedToken.token);
        alert("水が足りない…");
        return;
      }
    }
    if(loadout.fertId){
      if(!invDec(inv, "fert", loadout.fertId)){
        // 水は戻さない（仕様）だと荒れるので、ここは戻す
        if(loadout.waterId) invAdd(inv,"water",loadout.waterId,1);
        if(seedId !== SEED_COLLAB_ID) invAdd(inv,"seed",seedId,1);
        if(usedToken) rollbackTokenToIssued(usedToken.token);
        saveInv(inv);
        alert("肥料が足りない…");
        return;
      }
    }

    // 成長時間
    const now = Date.now();
    const growMs = getGrowMs();
    const readyAt = now + growMs;
    const burnAt  = readyAt + READY_TO_BURN_MS;

    const fert = FERTS.find(x => x.id === (loadout.fertId||null));
    const skipAnim = !!fert?.skipGrowAnim;

    const p = state.plots[i];
    p.state = skipAnim ? "GROW2" : "GROW1";
    p.plantedAt = now;
    p.readyAt = readyAt;
    p.burnAt = burnAt;

    p.seedId = seedId;
    p.waterId = loadout.waterId || null;
    p.fertId = loadout.fertId || null;

    // ✅ ローカル確定報酬（通常のみ）
    p.reward = null;
    p.fixedRarity = null;
    if(seedId !== SEED_COLLAB_ID){
      // “植えた瞬間に確定”を維持
      p.fixedRarity = pickRarityWithWater(p.waterId);
      p.reward = drawRewardForPlotLocal(p);
    }else{
      // ✅ コラボ：tokenをplotに保持（収穫でGAS確定）
      p.seedToken = usedToken.token;
      p.collabId = usedToken.collabId || null;
      // ✅ 可能ならGASにplant通知（未実装でもOK）
      await gasPlant(usedToken.token);
    }

    saveInv(inv);
    saveState(state);
    syncCollabSeedToInv();
    renderFarm();
  }

  async function harvestPlot(i){
    const p = state.plots[i];
    if(!p || (p.state !== "READY" && p.state !== "BURN")){
      return;
    }

    const isBurn = (p.state === "BURN");

    // ✅ 収穫カード（通常は既にp.reward、コラボはここでGAS）
    let reward = p.reward;

    if(p.seedId === SEED_COLLAB_ID){
      const token = String(p.seedToken||"").trim();
      if(!token){
        alert("seed_tokenが無い…（plot破損）");
        return;
      }
      try{
        reward = await gasHarvest(token); // {id,name,img,rarity,collabId}
        p.reward = reward; // キャッシュ（連打で変わらない）
        saveState(state);
      }catch(e){
        alert(e?.message || "収穫に失敗した…");
        return;
      }
    }

    if(!reward){
      // 念のため（通常でも）
      reward = drawRewardForPlotLocal(p);
      p.reward = reward;
      saveState(state);
    }

    const rarity = String(reward.rarity||"").toUpperCase() || "N";
    const xp = XP_BY_RARITY[rarity] ?? 10;

    const tag = (p.seedId === SEED_COLLAB_ID) ? "COLLAB" : "NORMAL";
    const extra = (p.seedId === SEED_COLLAB_ID && p.collabId) ? `<div class="note">collabId：<b>${p.collabId}</b></div>` : "";

    openModal(isBurn ? "🔥 焦げた…でも回収" : "🎴 収穫！", `
      <div class="harvWrap">
        <div class="harvCard">
          <img class="harvImg" src="${reward.img || ""}" alt="">
          <div class="harvMeta">
            <div class="harvR">RARITY：<b>${rarity}</b></div>
            <div class="harvN">${reward.name || "NO NAME"}</div>
            <div class="harvId">${reward.id || ""}</div>
            <div class="harvTag">${tag}</div>
            ${extra}
          </div>
        </div>
        <div class="note">閉じると図鑑に保存されて畑が空く。</div>
      </div>
      <style>
        .harvWrap{display:flex; flex-direction:column; gap:10px;}
        .harvCard{display:flex; gap:12px; align-items:flex-start; border:1px solid rgba(255,255,255,.16); border-radius:14px; padding:12px; background:rgba(0,0,0,.18)}
        .harvImg{width:120px; height:120px; border-radius:12px; object-fit:cover; background:rgba(255,255,255,.04)}
        .harvMeta{flex:1}
        .harvR{font-weight:900; opacity:.9}
        .harvN{font-weight:1000; font-size:16px; margin-top:6px; line-height:1.2}
        .harvId{opacity:.75; font-weight:900; margin-top:6px}
        .harvTag{margin-top:10px; display:inline-flex; padding:4px 10px; border-radius:999px; border:1px solid rgba(255,255,255,.16); background:rgba(0,0,0,.20); font-weight:900; font-size:12px; opacity:.9}
        .note{opacity:.8; line-height:1.35}
      </style>
    `);

    // ✅ 閉じる＝確定（図鑑保存・XP・畑を空に・tokenをHARVESTED）
    setHarvestCommit(() => {
      // 図鑑
      book = loadBook();
      book.got = book.got || {};
      const key = String(reward.id || reward.cardId || "").trim() || ("UNKNOWN_" + Date.now());
      if(!book.got[key]) book.got[key] = { count:0, name:reward.name||"", img:reward.img||"", rarity:rarity };
      book.got[key].count = Number(book.got[key].count||0) + 1;
      // 更新
      book.got[key].name = reward.name||book.got[key].name||"";
      book.got[key].img = reward.img||book.got[key].img||"";
      book.got[key].rarity = rarity||book.got[key].rarity||"";
      saveBook(book);

      // XP
      addXP(xp);

      // ✅ コラボ：tokenをHARVESTED
      if(p.seedId === SEED_COLLAB_ID){
        markTokenHarvested(p.seedToken);
      }

      // plot reset
      state.plots[i] = defaultPlot();
      saveState(state);

      closeModal();
      syncCollabSeedToInv();
      renderFarm();
    });
  }

  function onPlotClick(i){
    const p = state.plots[i];
    if(!p) return;

    if(p.state === "EMPTY"){
      plantPlot(i);
      return;
    }
    if(p.state === "READY" || p.state === "BURN"){
      harvestPlot(i);
      return;
    }

    // 育成中：残り表示
    const now = Date.now();
    const remain = Math.max(0, Number(p.readyAt||0) - now);
    openModal("⏳ 育成中", `
      <div class="note">残り：<b>${fmtRemain(remain)}</b></div>
      <div class="note">閉じる：右上× / 画面外タップ / ESC</div>
    `);
  }

  // =========================================================
  // 起動
  // =========================================================
  function boot(){
    // まず同期（ここが最重要）
    syncCollabSeedToInv();

    // state/book/player/inv
    state  = loadState();
    book   = loadBook();
    inv    = loadInv();
    player = loadPlayer();

    renderFarm();
    setInterval(tick, TICK_MS);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot, { once:true });
  }else{
    boot();
  }
})();
