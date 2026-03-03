/* =========================================================
   takofarm.js（完全版 / seed_token方式 統合版：複数コラボ同時対応）
   ✅ 資材在庫: tf_v1_inv（seed/water/fert）
   ✅ オクト: roten_v1_octo（露店と共通）
   ✅ コラボ種：複数同時対応（SEED_TO_COLLAB にある seedId は全部 “seed_token制”）
      - 植える：ISSUED token を1本 PLANTED扱いにして plot.seedToken に保持
      - 収穫：GAS harvest で cardId/rarity/img/name を確定して返す
   ✅ 通常種：植えた瞬間に reward をローカル確定して保存（現状維持）
   ★今回最優先：col_ghost_2026（seed_colabo_ghost）を追加
========================================================= */
(() => {
  "use strict";

  // =========================
  // マス画像（状態ごと）
  // =========================
  const PLOT_IMG = {
    EMPTY: "https://ul.h3z.jp/muPEAkao.png",

    // 通常成長
    GROW1: "https://ul.h3z.jp/BrHRk8C4.png",
    GROW2: "https://ul.h3z.jp/tD4LUB6F.png",

    // ★コラボ（共通）成長GIF（仮）
    COLABO_GROW1: "https://ul.h3z.jp/cq1soJdm.gif",
    COLABO_GROW2: "https://ul.h3z.jp/I6Iu4J32.gif",

    // ★コラボ（GHOST）専用成長GIF（仮：あとで差し替えOK）
    COLABO_GHOST_GROW1: "https://ul.h3z.jp/cq1soJdm.gif",
    COLABO_GHOST_GROW2: "https://ul.h3z.jp/I6Iu4J32.gif",

    READY: "https://ul.h3z.jp/AmlnQA1b.png",
    BURN:  "https://ul.h3z.jp/q9hxngx6.png",

    // ✅ SR保証系（※コラボ/固定タネでは出さない）
    GROW2_SR65:  "https://ul.h3z.jp/HfpFoeBk.png",
    GROW2_SR100: "https://ul.h3z.jp/tBVUoc8w.png"
  };

  // =========================
  // LocalStorage Keys
  // =========================
  const LS_STATE  = "tf_v1_state";
  const LS_BOOK   = "tf_v1_book";
  const LS_PLAYER = "tf_v1_player";
  const LS_INV    = "tf_v1_inv";

  // ✅ 装備（種/水/肥料）
  const LS_LOADOUT = "tf_v1_loadout";

  // ✅ オクト（露店と共通のキーを使う）
  const LS_OCTO = "roten_v1_octo";

  // ✅ roten.js が保存してる seed_token 群（ここを畑側で消費する）
  const LS_SEEDTOKENS = "tf_v1_seedtokens";

  // ✅ あなたのGAS WebApp URL（/execまで）※ここだけ必須変更
  const GAS_URL = "https://script.google.com/macros/s/AKfycbwFhJjpj0IidOYf95dyANLFYnIYTuPFFaAKOVxmfGmWJW-9AsCGQBsW90uEitpIpcdm/exec";

  // =========================================================
  // ✅ seedId → collabId 対応（複数コラボ同時対応）
  //   このオブジェクトに載ってる seedId は全部 “seed_token制” として扱う
  // =========================================================
  const SEED_TO_COLLAB = {
    // 既存（ぐらたん）
    "seed_colabo": "col_gratan_2026",

    // ★今回最優先：GHOST
    "seed_colabo_ghost": "col_ghost_2026",

    // 予備（必要なら使う）
    // "seed_colabo_hold": "col_hold_2026",
  };

  function isCollabSeed(seedId){
    return !!(seedId && SEED_TO_COLLAB[String(seedId)]);
  }
  function collabIdFromSeed(seedId){
    return (seedId && SEED_TO_COLLAB[String(seedId)]) ? String(SEED_TO_COLLAB[String(seedId)]) : null;
  }

  // 育成時間など
  const BASE_GROW_MS = 5 * 60 * 60 * 1000;      // 5時間
  const READY_TO_BURN_MS = 24 * 60 * 60 * 1000; // READYから焦げまで
  const TICK_MS = 1000;

  // ベース（使わないなら水ratesが優先）
  const BASE_RARITY_RATE = { N:70, R:20, SR:8, UR:1.8, LR:0.2 };

  // =========================================================
  // カードプール（あなたの現行のまま）
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
  // ★タネ一覧（複数コラボ同時対応）
  // =========================================================
  const SEEDS = [
    { id:"seed_random", name:"なに出るタネ", desc:"何が育つかは完全ランダム。\n店主も知らない。", factor:1.00, img:"https://ul.h3z.jp/gnyvP580.png", fx:"完全ランダム" },
    { id:"seed_shop",   name:"店頭タネ",     desc:"店で生まれたタネ。\n店頭ナンバーを宿している。", factor:1.00, img:"https://ul.h3z.jp/IjvuhWoY.png", fx:"店頭の気配" },
    { id:"seed_line",   name:"回線タネ",     desc:"画面の向こうから届いたタネ。\nクリックすると芽が出る。", factor:1.00, img:"https://ul.h3z.jp/AonxB5x7.png", fx:"回線由来" },
    { id:"seed_special",name:"たこぴのタネ", desc:"このタネを植えたら、\n必ず「たこぴ8枚」から出る。", factor:1.00, img:"https://ul.h3z.jp/29OsEvjf.png", fx:"たこぴ専用8枚" },

    { id:"seed_bussasari", name:"ブッ刺さりタネ", desc:"刺さるのは心だけ。\n出るのは5枚だけ（全部N）。", factor:1.05, img:"https://ul.h3z.jp/MjWkTaU3.png", fx:"刺さり固定5枚" },
    { id:"seed_namara_kawasar", name:"なまら買わさるタネ", desc:"気付いたら買ってる。\n12枚固定（内訳：LR/UR/SR/R/N）。", factor:1.08, img:"https://ul.h3z.jp/yiqHzfi0.png", fx:"買わさり固定12枚" },

    // ★コラボ（既存：ぐらたん）seed_token制
    { id:"seed_colabo", name:"コラボ【ぐらたんのタネ】", desc:"シリアルで増える。\n畑ではseed_tokenを消費して植える。", factor:1.00, img:"https://ul.h3z.jp/wbnwoTzm.png", fx:"seed_token制" },

    // ★コラボ（最優先：GHOST）seed_token制（画像は仮でOK）
    { id:"seed_colabo_ghost", name:"コラボ【GHOSTのタネ】", desc:"シリアルで増える。\n畑ではseed_tokenを消費して植える。", factor:1.00, img:"https://ul.h3z.jp/wbnwoTzm.png", fx:"seed_token制" },

    // 予備（必要なら）
    // { id:"seed_colabo_hold", name:"コラボ【HOLDのタネ】", desc:"シリアルで増える。\n畑ではseed_tokenを消費して植える。", factor:1.00, img:"https://ul.h3z.jp/wbnwoTzm.png", fx:"seed_token制" },
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
    { id:"fert_agedama", name:"ただの揚げ玉", desc:"時短0。\n（今は見た目だけ）", factor:1.00, fx:"時短 0%", img:"https://ul.h3z.jp/9p5fx53n.png", burnCardUp:0.12, rawCardChance:0.00, mantra:false, skipGrowAnim:false },
    { id:"fert_feel", name:"気のせい肥料", desc:"早くなった気がする。\n気のせいかもしれない。", factor:0.95, fx:"時短 5%", img:"https://ul.h3z.jp/XqFTb7sw.png", burnCardUp:0.00, rawCardChance:0.00, mantra:false, skipGrowAnim:false },
    { id:"fert_guts", name:"根性論ぶち込み肥料", desc:"理由はない。\n気合いだ。", factor:0.80, fx:"時短 20%", img:"https://ul.h3z.jp/bT9ZcNnS.png", burnCardUp:0.00, rawCardChance:0.00, mantra:true, skipGrowAnim:false },
    { id:"fert_skip", name:"工程すっ飛ばし肥料", desc:"途中は、\n見なかったことにした。", factor:0.60, fx:"時短 40%", img:"https://ul.h3z.jp/FqPzx12Q.png", burnCardUp:0.00, rawCardChance:0.01, mantra:false, skipGrowAnim:true },
    { id:"fert_timeno", name:"時間を信じない肥料", desc:"最終兵器・禁忌。\n（今は時短だけ）", factor:0.10, fx:"時短 90〜100%", img:"https://ul.h3z.jp/l2njWY57.png", burnCardUp:0.00, rawCardChance:0.03, mantra:false, skipGrowAnim:true },
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
  const XP_BY_RARITY = { N:20, R:40, SR:80, UR:160, LR:300, SP:0 };

  function xpNeedForLevel(level){
    return 120 + (level - 1) * 50 + Math.floor(Math.pow(level - 1, 1.6) * 20);
  }
  function defaultPlayer(){ return { ver:1, level:1, xp:0, unlocked:START_UNLOCK }; }

  function loadPlayer(){
    try{
      const raw = localStorage.getItem(LS_PLAYER);
      if(!raw) return defaultPlayer();
      const p = JSON.parse(raw);
      if(!p || typeof p !== "object") return defaultPlayer();
      const lvl = Math.max(1, Number(p.level||1));
      const xp  = Math.max(0, Number(p.xp||0));
      const unl = Math.min(MAX_PLOTS, Math.max(START_UNLOCK, Number(p.unlocked||START_UNLOCK)));
      return { ver:1, level:lvl, xp:xp, unlocked:unl };
    }catch(e){ return defaultPlayer(); }
  }
  function savePlayer(p){ localStorage.setItem(LS_PLAYER, JSON.stringify(p)); }
  let player = loadPlayer();

  // =========================================================
  // ★在庫（すべて在庫制）
  // =========================================================
  function defaultInv(){
    const inv = { ver:1, seed:{}, water:{}, fert:{} };
    SEEDS.forEach(x => inv.seed[x.id] = 0);
    WATERS.forEach(x => inv.water[x.id] = 0);
    FERTS.forEach(x => inv.fert[x.id] = 0);
    return inv;
  }
  function loadInv(){
    try{
      const raw = localStorage.getItem(LS_INV);
      if(!raw) return defaultInv();
      const inv = JSON.parse(raw);
      if(!inv || typeof inv !== "object") return defaultInv();
      inv.seed  = inv.seed  || {};
      inv.water = inv.water || {};
      inv.fert  = inv.fert  || {};
      for(const x of SEEDS)  if(!(x.id in inv.seed))  inv.seed[x.id]=0;
      for(const x of WATERS) if(!(x.id in inv.water)) inv.water[x.id]=0;
      for(const x of FERTS)  if(!(x.id in inv.fert))  inv.fert[x.id]=0;
      return inv;
    }catch(e){ return defaultInv(); }
  }
  function saveInv(inv){ localStorage.setItem(LS_INV, JSON.stringify(inv)); }
  function invGet(inv, invType, id){
    const box = inv[invType] || {};
    const n = Number(box[id] ?? 0);
    return Number.isFinite(n) ? n : 0;
  }
  function invAdd(inv, invType, id, delta){
    if(!inv[invType]) inv[invType] = {};
    const cur = Number(inv[invType][id] ?? 0);
    inv[invType][id] = Math.max(0, cur + delta);
  }
  function invDec(inv, invType, id){
    const cur = invGet(inv, invType, id);
    if(cur <= 0) return false;
    invAdd(inv, invType, id, -1);
    return true;
  }

  // =========================================================
  // ✅ seed_token（roten→farm 共有）
  // =========================================================
  function loadSeedTokens(){
    try{
      const raw = localStorage.getItem(LS_SEEDTOKENS);
      if(!raw) return [];
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    }catch(e){
      return [];
    }
  }
  function saveSeedTokens(arr){
    localStorage.setItem(LS_SEEDTOKENS, JSON.stringify(Array.isArray(arr) ? arr : []));
  }
  function normTokenEntry(entry){
    if(typeof entry === "string") return { token: entry, collabId: null, status: "ISSUED" };
    if(entry && typeof entry === "object"){
      return {
        token: String(entry.token || entry.id || ""),
        collabId: entry.collabId ? String(entry.collabId) : null,
        status: entry.status ? String(entry.status) : "ISSUED"
      };
    }
    return { token:"", collabId:null, status:"ISSUED" };
  }
  function countIssuedTokensByCollab(collabId){
    if(!collabId) return 0;
    const list = loadSeedTokens().map(normTokenEntry);
    return list.filter(x => x.token && x.collabId === collabId && x.status === "ISSUED").length;
  }
  function takeOneIssuedToken(collabId){
    if(!collabId) return null;
    const list = loadSeedTokens().map(normTokenEntry);
    const idx = list.findIndex(x => x.token && x.collabId === collabId && x.status === "ISSUED");
    if(idx < 0) return null;
    const picked = list[idx];
    list[idx] = { ...picked, status: "PLANTED" }; // 表示用（本体はGASが正）
    saveSeedTokens(list);
    return picked.token;
  }

  // =========================================================
  // ✅ オクト
  // =========================================================
  function loadOcto(){
    const n = Number(localStorage.getItem(LS_OCTO) ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  function saveOcto(n){
    localStorage.setItem(LS_OCTO, String(Math.max(0, Math.floor(Number(n) || 0))));
  }
  function addOcto(delta){
    const cur = loadOcto();
    const next = Math.max(0, cur + Math.floor(Number(delta) || 0));
    saveOcto(next);
    return next;
  }
  function randInt(min, max){
    min = Math.floor(min); max = Math.floor(max);
    if(max < min) [min, max] = [max, min];
    return min + Math.floor(Math.random() * (max - min + 1));
  }
  function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }

  function octoRewardForLevel(level){
    const lv = Math.max(1, Math.floor(level));
    const t = Math.min(1, (lv - 1) / 18);
    const min = Math.round(3000 + 2500 * t);
    const max = Math.round(6500 + 3500 * t);
    return clamp(randInt(min, max), 3000, 10000);
  }

  function pickWeighted(list){
    const total = list.reduce((a, x)=> a + (x.w || 0), 0);
    if(total <= 0) return list[0]?.v;
    let r = Math.random() * total;
    for(const x of list){
      r -= (x.w || 0);
      if(r <= 0) return x.v;
    }
    return list[list.length-1]?.v;
  }

  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  function itemRewardForLevel(level){
    const lv = Math.max(1, Math.floor(level));

    const count =
      (lv >= 15) ? pickWeighted([{v:2,w:55},{v:3,w:45}]) :
      (lv >= 8)  ? pickWeighted([{v:1,w:30},{v:2,w:70}]) :
                   1;

    const cat =
      (lv >= 12) ? pickWeighted([{v:"seed",w:45},{v:"water",w:30},{v:"fert",w:25}]) :
      (lv >= 6)  ? pickWeighted([{v:"seed",w:55},{v:"water",w:25},{v:"fert",w:20}]) :
                   pickWeighted([{v:"seed",w:70},{v:"water",w:20},{v:"fert",w:10}]);

    // ✅ コラボ種は報酬で出さない（seed_token制だから）
    const seedChoices = SEEDS.filter(x => !isCollabSeed(x.id));
    const waterChoices = WATERS.slice();
    const fertChoices = FERTS.slice();

    const rewards = [];
    for(let k=0;k<count;k++){
      let picked = null;
      if(cat === "seed")  picked = pick(seedChoices);
      if(cat === "water") picked = pick(waterChoices);
      if(cat === "fert")  picked = pick(fertChoices);
      if(!picked) picked = pick(seedChoices);

      rewards.push({
        kind: cat,
        id: picked.id,
        name: picked.name,
        img: picked.img,
        qty: 1
      });
    }

    const map = new Map();
    for(const r of rewards){
      const key = `${r.kind}:${r.id}`;
      const prev = map.get(key);
      if(prev) prev.qty += r.qty;
      else map.set(key, { ...r });
    }
    return Array.from(map.values());
  }

  function grantLevelRewards(level){
    const octo = octoRewardForLevel(level);
    addOcto(octo);

    const items = itemRewardForLevel(level);
    const inv = loadInv();
    for(const it of items){
      if(it.kind === "seed")  invAdd(inv, "seed",  it.id, it.qty);
      if(it.kind === "water") invAdd(inv, "water", it.id, it.qty);
      if(it.kind === "fert")  invAdd(inv, "fert",  it.id, it.qty);
    }
    saveInv(inv);

    return { octo, items };
  }

  function addXP(amount){
    if(!Number.isFinite(amount) || amount <= 0) return { leveled:false, unlockedDelta:0, rewards:[] };
    let leveled = false, unlockedDelta = 0;
    const rewards = [];

    player.xp += Math.floor(amount);

    while(player.xp >= xpNeedForLevel(player.level)){
      player.xp -= xpNeedForLevel(player.level);
      player.level += 1;
      leveled = true;

      const r = grantLevelRewards(player.level);
      rewards.push({ level: player.level, ...r });

      if(player.unlocked < MAX_PLOTS){
        player.unlocked += 1;
        unlockedDelta += 1;
      }
    }
    savePlayer(player);
    return { leveled, unlockedDelta, rewards };
  }

  // =========================================================
  // ✅ 装備（ロードアウト）
  // =========================================================
  function defaultLoadout(){
    return { ver:1, seedId:null, waterId:null, fertId:null };
  }
  function loadLoadout(){
    try{
      const raw = localStorage.getItem(LS_LOADOUT);
      if(!raw) return defaultLoadout();
      const obj = JSON.parse(raw);
      if(!obj || typeof obj !== "object") return defaultLoadout();
      return {
        ver:1,
        seedId:  obj.seedId  || null,
        waterId: obj.waterId || null,
        fertId:  obj.fertId  || null
      };
    }catch(e){
      return defaultLoadout();
    }
  }
  function saveLoadout(l){
    localStorage.setItem(LS_LOADOUT, JSON.stringify(l));
  }
  let loadout = loadLoadout();

  const defaultPlot  = () => ({ state:"EMPTY" });
  const defaultState = () => ({ ver:1, plots: Array.from({length:MAX_PLOTS}, defaultPlot) });

  function loadState(){
    try{
      const raw = localStorage.getItem(LS_STATE);
      if(!raw) return defaultState();
      const obj = JSON.parse(raw);
      if(!obj || !Array.isArray(obj.plots) || obj.plots.length !== MAX_PLOTS) return defaultState();
      return obj;
    }catch(e){ return defaultState(); }
  }
  function saveState(s){ localStorage.setItem(LS_STATE, JSON.stringify(s)); }

  function loadBook(){
    try{
      const raw = localStorage.getItem(LS_BOOK);
      if(!raw) return { ver:1, got:{} };
      const obj = JSON.parse(raw);
      if(!obj || typeof obj.got !== "object") return { ver:1, got:{} };
      return obj;
    }catch(e){ return { ver:1, got:{} }; }
  }
  function saveBook(b){ localStorage.setItem(LS_BOOK, JSON.stringify(b)); }

  function pad2(n){ return String(n).padStart(2,"0"); }
  function fmtRemain(ms){
    if(ms <= 0) return "00:00:00";
    const s = Math.floor(ms/1000);
    const hh = Math.floor(s/3600);
    const mm = Math.floor((s%3600)/60);
    const ss = s%60;
    return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
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
  // ★種ごとに「出るTN番号」を制限
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
  // ✅ 固定タネ抽選
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
  // ✅ 肥料SP抽選（植えた瞬間に確定）
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
  // ★報酬抽選（コラボ種はローカル抽選しない：GAS harvestで確定）
  // =========================================================
  function drawRewardForPlot(p){
    // ✅ まず肥料SP（最優先）
    const sp = pickFertSPIfAny(p);
    if(sp) return sp;

    // 固定タネ
    if (p && p.seedId === "seed_special") {
      const c = pick(TAKOPI_SEED_POOL);
      return { id:c.id, name:c.name, img:c.img, rarity:(c.rarity || "N") };
    }

    // ✅ コラボ種はここに来ない運用（念のためガード）
    if (p && isCollabSeed(p.seedId)) {
      return { id:"COL-000", name:"COLLAB (GAS確定)", img:PLOT_IMG.EMPTY, rarity:"" };
    }

    if (p && p.seedId === "seed_bussasari") {
      return pickBussasariReward();
    }
    if (p && p.seedId === "seed_namara_kawasar") {
      return pickNamaraReward();
    }

    const rarity = (p && p.fixedRarity) ? p.fixedRarity : pickRarityWithWater(p ? p.waterId : null);

    const seedId = p ? p.seedId : null;
    const filtered = filterPoolBySeed(seedId, getPoolByRarity(rarity));
    const picked = (filtered.length)
      ? { rarity, card: pick(filtered) }
      : fallbackPickBySeed(seedId, rarity);

    const c = picked.card;
    return { id:c.no, name:c.name, img:c.img, rarity: picked.rarity };
  }

  function rarityLabel(r){ return r || ""; }

  // =========================
  // DOM
  // =========================
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

  // ✅ 必須DOMが無いと「無反応」になるので即検知
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

  let state  = loadState();
  let book   = loadBook();
  let inv    = loadInv();

  // =========================================================
  // ✅ モーダル中：背景だけロックして「モーダル内はスクロールOK」
  // =========================================================
  let __scrollY = 0;
  let __locked = false;

  function isInsideModalContent(target){
    return !!(target && (target === mBody || mBody.contains(target)));
  }

  function preventTouchMove(e){
    if(modal.getAttribute("aria-hidden") !== "false") return;
    if(isInsideModalContent(e.target)) return;
    e.preventDefault();
  }

  function preventWheel(e){
    if(modal.getAttribute("aria-hidden") !== "false") return;
    if(isInsideModalContent(e.target)) return;
    e.preventDefault();
  }

  function lockScroll(){
    if(__locked) return;
    __locked = true;

    __scrollY = window.scrollY || document.documentElement.scrollTop || 0;

    document.body.style.position = "fixed";
    document.body.style.top = `-${__scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    mBody.style.maxHeight = "72vh";
    mBody.style.overflowY = "auto";
    mBody.style.webkitOverflowScrolling = "touch";
    mBody.style.overscrollBehavior = "contain";
    mBody.style.touchAction = "pan-y";

    document.addEventListener("touchmove", preventTouchMove, { passive:false });
    document.addEventListener("wheel", preventWheel, { passive:false });
  }

  function unlockScroll(){
    if(!__locked) return;
    __locked = false;

    document.removeEventListener("touchmove", preventTouchMove, { passive:false });
    document.removeEventListener("wheel", preventWheel, { passive:false });

    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    document.body.style.overflow = "";

    mBody.style.maxHeight = "";
    mBody.style.overflowY = "";
    mBody.style.webkitOverflowScrolling = "";
    mBody.style.overscrollBehavior = "";
    mBody.style.touchAction = "";

    window.scrollTo(0, __scrollY);
  }

  function onBackdrop(e){ if(e.target === modal) closeModalOrCommit(); }
  function onEsc(e){ if(e.key === "Escape") closeModalOrCommit(); }

  function openModal(title, html){
    modal.removeEventListener("click", onBackdrop);
    document.removeEventListener("keydown", onEsc);

    mTitle.textContent = title;
    mBody.innerHTML = html;
    modal.setAttribute("aria-hidden","false");

    lockScroll();

    modal.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onEsc);
  }

  function closeModal(){
    modal.setAttribute("aria-hidden","true");
    modal.removeEventListener("click", onBackdrop);
    document.removeEventListener("keydown", onEsc);
    mBody.innerHTML = "";
    unlockScroll();
  }

  // =========================================================
  // ✅【最重要】収穫モーダル中だけ「閉じる＝確定」できる仕組み
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

  mClose.addEventListener("click", closeModalOrCommit);

  // =========================================================
  // ✅ 装備表示更新
  // =========================================================
  function renderLoadout(){
    inv = loadInv();
    loadout = loadLoadout();

    const seed  = SEEDS.find(x=>x.id===loadout.seedId)  || null;
    const water = WATERS.find(x=>x.id===loadout.waterId) || null;
    const fert  = FERTS.find(x=>x.id===loadout.fertId)  || null;

    if(seed){
      equipSeedImg.src = seed.img;
      equipSeedName.textContent = seed.name;

      // ✅ コラボ種は seed_token 本数で表示
      if(isCollabSeed(seed.id)){
        const collabId = collabIdFromSeed(seed.id);
        const cnt = collabId ? countIssuedTokensByCollab(collabId) : 0;
        equipSeedCnt.textContent = `×${cnt}`;
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
  // ✅ グリッド選択UI
  // =========================================================
  function openPickGrid(kind){
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

      // ✅ コラボ種だけ token本数
      if(isSeed && isCollabSeed(x.id)){
        const collabId = collabIdFromSeed(x.id);
        cnt = collabId ? countIssuedTokensByCollab(collabId) : 0;
      }

      const disabled = (cnt <= 0);
      const selected =
        (isSeed && loadout.seedId === x.id) ||
        (isWater && loadout.waterId === x.id) ||
        (isFert && loadout.fertId === x.id);

      return `
        <button class="gridCard ${selected ? "isSelected":""}" type="button" data-pick="${x.id}" ${disabled ? "disabled":""}>
          <div class="gridImg">
            <img src="${x.img}" alt="${x.name}">
            <div class="gridCnt">×${cnt}</div>
            ${selected ? `<div class="gridSel">装備中</div>` : ``}
            ${disabled ? `<div class="gridEmpty">在庫なし</div>` : ``}
          </div>
          <div class="gridName">${x.name}</div>
          <div class="gridDesc">${(x.desc || "").replace(/\n/g,"<br>")}</div>
          <div class="gridFx">${x.fx ? `効果：<b>${x.fx}</b>` : ""}</div>
        </button>
      `;
    }).join("");

    openModal(title, `
      <div class="step">※すべて在庫制。露店で買って増やす。<br>装備は消費しない（植えた時に消費）。</div>
      <div class="gridWrap">${cells}</div>
      <div class="row">
        <button type="button" id="gridClose">閉じる</button>
      </div>
    `);

    clearHarvestCommit();

    mBody.querySelectorAll("button[data-pick]").forEach(btn=>{
      btn.addEventListener("click", () => {
        if(btn.disabled) return;
        const id = btn.getAttribute("data-pick");
        const l = loadLoadout();
        if(isSeed)  l.seedId = id;
        if(isWater) l.waterId = id;
        if(isFert)  l.fertId = id;
        saveLoadout(l);
        renderLoadout();
        closeModal();
      });
    });

    document.getElementById("gridClose").addEventListener("click", closeModal);
  }

  equipSeedBtn.addEventListener("click", ()=> openPickGrid("seed"));
  equipWaterBtn.addEventListener("click", ()=> openPickGrid("water"));
  equipFertBtn.addEventListener("click", ()=> openPickGrid("fert"));

  // =========================================================
  // ✅ 描画
  // =========================================================
  function render(){
    player = loadPlayer();
    book = loadBook();

    farmEl.innerHTML = "";
    let grow = 0, ready = 0, burn = 0;

    for(let i=0;i<MAX_PLOTS;i++){
      const p = state.plots[i] || { state:"EMPTY" };

      const d = document.createElement("div");
      d.className = "plot";

      const locked = (i >= player.unlocked);
      d.dataset.state = locked ? "LOCK" : (p.state || "EMPTY");

      const btn = document.createElement("button");
      btn.type = "button";

      if(locked){
        const b = document.createElement("div");
        b.className = "badge lock";
        b.textContent = "LOCK";
        d.appendChild(b);

        btn.innerHTML = `
          <img src="${PLOT_IMG.EMPTY}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:14px;display:block;opacity:.55;">
          <div class="tag" style="position:absolute;bottom:6px;left:0;right:0;text-align:center;font-size:11px;font-weight:900;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.6);pointer-events:none;">ロック</div>
        `;

        const overlay = document.createElement("div");
        overlay.className = "lockOverlay";
        overlay.innerHTML = `<div class="lk1">🔒</div><div class="lk2">Lvアップで解放</div>`;
        d.appendChild(overlay);

        btn.addEventListener("click", () => onPlotTap(i));
        d.appendChild(btn);
        farmEl.appendChild(d);
        continue;
      }

      let img = PLOT_IMG.EMPTY;
      let label = "植える";

      if (p.state === "GROW") {
        grow++;
        const remain = (p.readyAt || 0) - Date.now();

        const start = (typeof p.startAt === "number") ? p.startAt : Date.now();
        const end   = (typeof p.readyAt === "number") ? p.readyAt : (start + 1);
        const denom = Math.max(1, end - start);
        const progress = (Date.now() - start) / denom;

        // ✅ コラボ種は種ごとに成長演出を分岐（今はGHOSTだけ専用 “仮”）
        if (isCollabSeed(p.seedId)) {
          if (p.seedId === "seed_colabo_ghost") {
            img = (progress < 0.5) ? PLOT_IMG.COLABO_GHOST_GROW1 : PLOT_IMG.COLABO_GHOST_GROW2;
          } else {
            img = (progress < 0.5) ? PLOT_IMG.COLABO_GROW1 : PLOT_IMG.COLABO_GROW2;
          }
        } else {
          if (progress < 0.5) {
            img = PLOT_IMG.GROW1;
          } else {
            if (p.srHint === "SR100") img = PLOT_IMG.GROW2_SR100;
            else if (p.srHint === "SR65") img = PLOT_IMG.GROW2_SR65;
            else img = PLOT_IMG.GROW2;
          }
        }

        label = `育成中 ${fmtRemain(remain)}`;

      } else if (p.state === "READY") {
        ready++;
        img = PLOT_IMG.READY;
        label = "収穫";

        const fx = document.createElement("div");
        fx.className = "plot-fx plot-fx--mild";
        d.appendChild(fx);

      } else if (p.state === "BURN") {
        burn++;
        img = PLOT_IMG.BURN;
        label = "焦げ";
      }

      btn.innerHTML = `
        <img src="${img}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:14px;display:block;">
        <div class="tag" style="position:absolute; bottom:6px; left:0; right:0;text-align:center; font-size:11px; font-weight:900; color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.6); pointer-events:none;">${label}</div>
      `;
      btn.addEventListener("click", () => onPlotTap(i));
      d.appendChild(btn);
      farmEl.appendChild(d);
    }

    stGrow.textContent  = String(grow);
    stReady.textContent = String(ready);
    stBurn.textContent  = String(burn);
    stBook.textContent  = String(Object.keys((book && book.got) ? book.got : {}).length);

    stLevel.textContent  = String(player.level);
    stXP.textContent     = String(player.xp);
    stUnlock.textContent = String(player.unlocked);

    const need = xpNeedForLevel(player.level);
    const now  = player.xp;
    const left = Math.max(0, need - now);
    const pct  = Math.max(0, Math.min(100, Math.floor((now / need) * 100)));

    stXpLeft.textContent = String(left);
    stXpNeed.textContent = String(need);
    stXpBar.style.width  = pct + "%";

    const stXpNow = document.getElementById("stXpNow");
    if (stXpNow) stXpNow.textContent = String(now);

    renderLoadout();
  }

  // =========================================================
  // ✅ 空きマス：ワンタップ植え
  // =========================================================
  function ensureLoadoutOrOpen(){
    loadout = loadLoadout();
    if(!loadout.seedId){ openPickGrid("seed"); return false; }
    if(!loadout.waterId){ openPickGrid("water"); return false; }
    if(!loadout.fertId){ openPickGrid("fert"); return false; }
    return true;
  }

  function plantAt(index){
    inv = loadInv();
    loadout = loadLoadout();

    const seedId  = loadout.seedId;
    const waterId = loadout.waterId;
    const fertId  = loadout.fertId;

    const isCol = isCollabSeed(seedId);
    const collabId = isCol ? collabIdFromSeed(seedId) : null;

    const okSeed  = isCol
      ? (collabId ? (countIssuedTokensByCollab(collabId) > 0) : false)
      : (invGet(inv, "seed",  seedId)  > 0);

    const okWater = invGet(inv, "water", waterId) > 0;
    const okFert  = invGet(inv, "fert",  fertId)  > 0;

    if(!okSeed || !okWater || !okFert){
      const lack =
        (!okSeed) ? (isCol ? "コラボのタネ（seed_token）" : "タネ") :
        (!okWater) ? "ミズ" :
        "ヒリョウ";

      const goKind =
        (!okSeed) ? "seed" :
        (!okWater) ? "water" :
        "fert";

      openModal("在庫が足りない", `
        <div class="step">
          <b>${lack}</b> の在庫が足りないため植えられない。<br>
          露店で買うか、装備を変えてね。
        </div>
        <div class="row">
          <button type="button" id="btnChange">装備を変える</button>
          <button type="button" class="primary" id="btnOk">OK</button>
        </div>
      `);
      clearHarvestCommit();

      document.getElementById("btnChange").addEventListener("click", ()=>{
        closeModal();
        openPickGrid(goKind);
      });
      document.getElementById("btnOk").addEventListener("click", closeModal);
      return;
    }

    const seed  = SEEDS.find(x=>x.id===seedId);
    const water = WATERS.find(x=>x.id===waterId);
    const fert  = FERTS.find(x=>x.id===fertId);

    const factor = clamp(
      (seed?.factor ?? 1) * (water?.factor ?? 1) * (fert?.factor ?? 1),
      0.35, 1.0
    );

    const growMs = Math.max(Math.floor(BASE_GROW_MS * factor), 60*60*1000);
    const now = Date.now();

    // ✅ コラボ種は「先に token を確保」してから資材を消費（資材だけ減る事故を防ぐ）
    let assignedSeedToken = null;
    if(isCol){
      assignedSeedToken = takeOneIssuedToken(collabId);
      if(!assignedSeedToken){
        openModal("エラー", `
          <div class="step">seed_token が見つからないため植えられない。</div>
          <div class="row"><button type="button" id="btnOk" class="primary">OK</button></div>
        `);
        clearHarvestCommit();
        document.getElementById("btnOk").addEventListener("click", closeModal);
        return;
      }
    }

    // ✅ 消費（コラボ種は invの種を減らさない）
    if(!isCol){
      invDec(inv, "seed", seedId);
    }
    invDec(inv, "water", waterId);
    invDec(inv, "fert",  fertId);
    saveInv(inv);

    const isFixedSeed =
      (seedId === "seed_special") ||
      (seedId === "seed_bussasari") ||
      (seedId === "seed_namara_kawasar");

    const fixedRarity = (isFixedSeed || isCol) ? null : pickRarityWithWater(waterId);

    const srHint =
      (isFixedSeed || isCol) ? "NONE" :
      (fixedRarity === "LR" || fixedRarity === "UR") ? "SR100" :
      (fixedRarity === "SR") ? "SR65" :
      "NONE";

    const plot = {
      state: "GROW",
      seedId,
      waterId,
      fertId,
      startAt: now,
      readyAt: now + growMs,
      fixedRarity,
      srHint
    };

    // ✅ コラボ：seed_token をアサインして「ローカル抽選はしない」
    if(isCol){
      plot.seedToken = assignedSeedToken;
      delete plot.reward;
      plot.fixedRarity = null;
      plot.srHint = "NONE";
    }else{
      // ✅ それ以外：植えた時点で確定して保存
      plot.reward = drawRewardForPlot(plot);

      // ✅ SPが当たったら演出矛盾を消す
      if(plot.reward && plot.reward.rarity === "SP"){
        plot.fixedRarity = null;
        plot.srHint = "NONE";
      }
    }

    state.plots[index] = plot;

    saveState(state);
    render();
  }

  // =========================================================
  // ✅ 収穫確定処理（閉じるでも呼べる）
  // =========================================================
  function commitHarvest(i, reward){
    addToBook(reward);

    const gain = XP_BY_RARITY[reward.rarity] ?? 4;
    const xpRes = addXP(gain);

    state.plots[i] = { state:"EMPTY" };
    saveState(state);

    if(xpRes && xpRes.leveled && Array.isArray(xpRes.rewards) && xpRes.rewards.length){
      const blocks = xpRes.rewards.map(r => {
        const itemsHtml = (r.items || []).map(it => {
          return `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.05);margin-top:8px;">
              <img src="${it.img}" alt="${it.name}" style="width:44px;height:44px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(0,0,0,.18)">
              <div style="flex:1;min-width:0;">
                <div style="font-weight:1000;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${it.name}</div>
                <div style="font-size:12px;opacity:.8;margin-top:2px;">×${it.qty}</div>
              </div>
            </div>
          `;
        }).join("");

        return `
          <div style="border:1px solid rgba(255,255,255,.14);border-radius:16px;background:rgba(255,255,255,.06);padding:12px;margin-top:10px;">
            <div style="font-weight:1000;font-size:14px;">Lv ${r.level} 報酬</div>
            <div style="margin-top:8px;font-size:13px;">
              ✅ オクト：<b>+${r.octo}</b>
            </div>
            ${itemsHtml}
          </div>
        `;
      }).join("");

      openModal("Lvアップ！", `
        <div class="step">
          レベルが上がった。<b>オクトは必ず</b>もらえる。<br>
          ついでにアイテムも勝手に増えた。
        </div>
        ${blocks}
        <div class="row">
          <button type="button" id="btnGoZukan" class="primary">図鑑へ</button>
        </div>
      `);
      clearHarvestCommit();

      document.getElementById("btnGoZukan").addEventListener("click", () => {
        closeModal();
        render();
        location.href = "./zukan.html";
      });

      render();
      return;
    }

    closeModal();
    render();
  }

  // =========================================================
  // ✅ GAS harvest（コラボ種専用）
  // =========================================================
  async function gasHarvest(token){
    const res = await fetch(GAS_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ api:"harvest", token })
    });
    let json = null;
    try{ json = await res.json(); }catch(e){ /* noop */ }
    if(!json || json.ok !== true){
      const msg = json?.error || `harvest failed (HTTP ${res.status})`;
      throw new Error(msg);
    }
    // ✅ GASの返却に合わせる（想定：cardId/name/img/rarity）
    return {
      id: String(json.cardId),
      name: String(json.name),
      img: String(json.img),
      rarity: String(json.rarity || "")
    };
  }

  // =========================================================
  // マス操作
  // =========================================================
  function onPlotTap(i){
    player = loadPlayer();

    if (i >= player.unlocked) {
      openModal("ロック中", `
        <div class="step">このマスはまだ使えない。<br>収穫でXPを稼いで <b>Lvアップ</b> すると解放される。</div>
        <div class="row"><button type="button" id="btnOk">OK</button></div>
      `);
      clearHarvestCommit();
      document.getElementById("btnOk").addEventListener("click", closeModal);
      return;
    }

    const p = state.plots[i] || { state:"EMPTY" };

    if (p.state === "EMPTY") {
      if(!ensureLoadoutOrOpen()) return;
      plantAt(i);
      return;
    }

    if (p.state === "GROW") {
      const seed = SEEDS.find(x=>x.id===p.seedId);
      const water = WATERS.find(x=>x.id===p.waterId);
      const fert = FERTS.find(x=>x.id===p.fertId);
      const remain = (p.readyAt||0) - Date.now();

      openModal("育成中", `
        <div class="step">このマスは育成中。収穫まであと <b>${fmtRemain(remain)}</b></div>
        <div class="reward">
          <div class="big">設定</div>
          <div class="mini">
            種：${seed?seed.name:"-"}<br>
            水：${water?water.name:"-"}<br>
            肥料：${fert?fert.name:"-"}<br>
            ${isCollabSeed(p.seedId) ? `token：<code style="font-size:11px;opacity:.85;">${String(p.seedToken||"")}</code><br>` : ``}
          </div>
        </div>
        <div class="row"><button type="button" id="btnOk">OK</button></div>
      `);
      clearHarvestCommit();
      document.getElementById("btnOk").addEventListener("click", closeModal);
      return;
    }

    // =========================================================
    // ✅ READY：コラボ種はGAS harvest
    // =========================================================
    if (p.state === "READY") {

      // ✅ コラボはGASで確定
      if(isCollabSeed(p.seedId)){
        if(!p.seedToken){
          openModal("エラー", `
            <div class="step">seed_token が無いので収穫できない。</div>
            <div class="row"><button type="button" id="btnOk" class="primary">OK</button></div>
          `);
          clearHarvestCommit();
          document.getElementById("btnOk").addEventListener("click", closeModal);
          return;
        }

        openModal("収穫中…", `<div class="step">GASに問い合わせ中…</div>`);
        clearHarvestCommit();

        (async () => {
          try{
            const reward = await gasHarvest(p.seedToken);

            // plotに保存（再表示対策）
            p.reward = reward;
            state.plots[i] = p;
            saveState(state);

            openModal("収穫！", `
              <div class="reward">
                <div class="big">${reward.name}（${reward.id}）</div>
                <div class="mini">レア：<b>${rarityLabel(reward.rarity)}</b><br>この画面を閉じると自動で図鑑に登録されます。</div>
                <img class="img" src="${reward.img}" alt="${reward.name}">
              </div>
              <div class="row">
                <button type="button" id="btnCancel">閉じる</button>
                <button type="button" class="primary" id="btnConfirm">図鑑を確認する</button>
              </div>
            `);

            setHarvestCommit(() => commitHarvest(i, reward));

            document.getElementById("btnCancel").addEventListener("click", closeModalOrCommit);

            document.getElementById("btnConfirm").addEventListener("click", () => {
              const fn = __harvestCommitFn;
              __harvestCommitFn = null;
              if(fn) fn();
              location.href = "./zukan.html";
            });

          }catch(e){
            openModal("エラー", `
              <div class="step">収穫に失敗：${String(e?.message || e)}</div>
              <div class="row"><button id="btnOk" class="primary">OK</button></div>
            `);
            clearHarvestCommit();
            document.getElementById("btnOk").addEventListener("click", closeModal);
          }
        })();

        return;
      }

      // ====== 通常（ローカル確定） ======
      if (!p.reward) {
        p.reward = drawRewardForPlot(p);
        saveState(state);
      }
      const reward = p.reward;

      openModal("収穫！", `
        <div class="reward">
          <div class="big">${reward.name}（${reward.id}）</div>
          <div class="mini">レア：<b>${rarityLabel(reward.rarity)}</b><br>この画面を閉じると自動で図鑑に登録されます。</div>
          <img class="img" src="${reward.img}" alt="${reward.name}">
        </div>
        <div class="row">
          <button type="button" id="btnCancel">閉じる</button>
          <button type="button" class="primary" id="btnConfirm">図鑑を確認する</button>
        </div>
      `);

      setHarvestCommit(() => commitHarvest(i, reward));

      document.getElementById("btnCancel").addEventListener("click", closeModalOrCommit);

      document.getElementById("btnConfirm").addEventListener("click", () => {
        const fn = __harvestCommitFn;
        __harvestCommitFn = null;
        if(fn) fn();
        location.href = "./zukan.html";
      });

      return;
    }

    if (p.state === "BURN") {
      openModal("焼けた…", `
        <div class="step">放置しすぎて焼けた。回収するとマスが空になる。</div>
        <div class="row">
          <button type="button" id="btnBack">戻る</button>
          <button type="button" class="primary" id="btnClear">回収して空にする</button>
        </div>
      `);
      clearHarvestCommit();
      document.getElementById("btnBack").addEventListener("click", closeModal);
      document.getElementById("btnClear").addEventListener("click", () => {
        state.plots[i] = { state:"EMPTY" };
        saveState(state);
        closeModal();
        render();
      });
      return;
    }
  }

  // =========================================================
  // ✅ 図鑑に追加（countで枚数管理）
  // =========================================================
  function addToBook(card){
    const b = loadBook();
    if(!b.got) b.got = {};

    const prev = b.got[card.id];
    if(prev){
      const curCount = Number.isFinite(prev.count) ? prev.count : 1;
      prev.count = curCount + 1;
      prev.name = card.name;
      prev.img = card.img;
      prev.rarity = card.rarity || prev.rarity || "";
      prev.lastAt = Date.now();
      b.got[card.id] = prev;
    }else{
      b.got[card.id] = {
        id: card.id,
        name: card.name,
        img: card.img,
        rarity: card.rarity || "",
        count: 1,
        at: Date.now(),
        lastAt: Date.now()
      };
    }
    saveBook(b);
  }

  // =========================================================
  // ✅ tick（GROW→READY / READY→BURN）
  // =========================================================
  function tick(){
    const now = Date.now();
    let changed = false;

    for (let i=0;i<MAX_PLOTS;i++){
      const p = state.plots[i];
      if(!p) continue;

      if(p.state === "GROW" && typeof p.readyAt === "number"){
        if(now >= p.readyAt){
          p.state = "READY";
          p.burnAt = p.readyAt + READY_TO_BURN_MS;
          changed = true;
        }
      } else if(p.state === "READY" && typeof p.burnAt === "number"){
        if(now >= p.burnAt){
          p.state = "BURN";
          changed = true;
        }
      }
    }

    if(changed) saveState(state);
    render();
  }

  // 初期
  renderLoadout();
  render();
  setInterval(tick, TICK_MS);

})();
