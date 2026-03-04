/* =========================================================
   takofarm.js（完全版 / seed_token方式：複数コラボ統合・roten互換）
   ✅ tf_v1_inv（seed/water/fert）…露店と共通
   ✅ roten_v1_octo …露店と共通
   ✅ tf_v1_seedtokens …seed_token（UUID）保管（roten redeemで増える）
   ✅ コラボ種：
      - 所持数＝seedtokens の未使用(ISSUED)本数
      - 植える：ISSUEDを1本PLANTEDにして plot.seedToken に保持
      - 収穫：GAS harvest に token を渡しサーバー確定カードを受け取る
      - 収穫完了：tokenをHARVESTEDに更新
   ✅ 互換：
      - seedtokensの保存形式が「配列」/「{ver,tokens:[]}」どちらでも読める
      - statusが無い古いtokenは ISSUED 扱い
      - inv.seed[各コラボseedId] は “ISSUED本数で上書き同期”（表示/互換）
   ✅ 旧：seed_collab（合算種）は完全不使用（表示もしない）
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

    // コラボ成長（共通）
    COLABO_GROW1: "https://ul.h3z.jp/cq1soJdm.gif",
    COLABO_GROW2: "https://ul.h3z.jp/I6Iu4J32.gif",

    READY: "https://ul.h3z.jp/AmlnQA1b.png",
    BURN:  "https://ul.h3z.jp/q9hxngx6.png",

    // SR保証系（※コラボ/固定タネでは出さない）
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

  // ✅ GAS WebApp URL（/execまで）
  const GAS_URL = "https://script.google.com/macros/s/AKfycbwFhJjpj0IidOYf95dyANLFYnIYTuPFFaAKOVxmfGmWJW-9AsCGQBsW90uEitpIpcdm/exec";

  // =========================================================
  // ✅ roten.js と同じ「コラボ定義」
  // =========================================================
  const COLLAB_SEEDS = [
    {
      collabId: "col_gratan_2026",
      seedId:   "seed_col_gratan_2026",
      name:     "コラボ【グラタンのタネ】",
      img:      "https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/tane/col1.png",
      hidden:   false,
    },
    {
      collabId: "col_ghost_2026",
      seedId:   "seed_col_ghost_2026",
      name:     "コラボ【GHOSTのタネ】",
      img:      "https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/tane/col2.png",
      hidden:   false,
    },

    // HOLD：今は止めたいなら hidden true + blocked true でもOK（roten側と合わせる）
    {
      collabId: "col_hold_2026",
      seedId:   "seed_col_hold_2026",
      name:     "コラボ【HOLDのタネ】",
      img:      "https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/tane/hold.png",
      hidden:   true, // ← farm側も表示しない
    },

    {
      collabId: "ann_2026",
      seedId:   "seed_ann_2026",
      name:     "【SP】アニバーサリーのタネ",
      img:      "https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/tane/anv1.png",
      hidden:   false,
    },
  ];

  const COLLAB_BY_SEEDID = Object.fromEntries(COLLAB_SEEDS.map(x => [String(x.seedId), String(x.collabId)]));

  // ✅ 今は止めたいコラボ（ここで0固定＆token集計にも出さない）
  function isBlockedCollabId(collabId){
    return String(collabId) === "col_hold_2026";
  }

  function isCollabSeed(seedId){
    return !!(seedId && COLLAB_BY_SEEDID[String(seedId)]);
  }
  function collabIdForSeed(seedId){
    return isCollabSeed(seedId) ? COLLAB_BY_SEEDID[String(seedId)] : null;
  }

  const COLLAB_GROW_IMG = {
    col_gratan_2026: { g1: PLOT_IMG.COLABO_GROW1, g2: PLOT_IMG.COLABO_GROW2 },
    col_ghost_2026:  { g1: PLOT_IMG.COLABO_GROW1, g2: PLOT_IMG.COLABO_GROW2 },
    col_hold_2026:   { g1: PLOT_IMG.COLABO_GROW1, g2: PLOT_IMG.COLABO_GROW2 },
    ann_2026:        { g1: PLOT_IMG.COLABO_GROW1, g2: PLOT_IMG.COLABO_GROW2 },
  };
  function getCollabGrowImgs(seedId){
    const cid = collabIdForSeed(seedId);
    const m = cid ? COLLAB_GROW_IMG[cid] : null;
    return m || { g1: PLOT_IMG.COLABO_GROW1, g2: PLOT_IMG.COLABO_GROW2 };
  }

  // =========================
  // 時間
  // =========================
  const BASE_GROW_MS = 5 * 60 * 60 * 1000;      // 5時間
  const READY_TO_BURN_MS = 24 * 60 * 60 * 1000; // READYから焦げまで
  const TICK_MS = 1000;

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
  // タネ / 水 / 肥料
  // =========================================================
  const SEEDS_BASE = [
    { id:"seed_random", name:"なに出るタネ", desc:"何が育つかは完全ランダム。\n店主も知らない。", factor:1.00, img:"https://ul.h3z.jp/gnyvP580.png", fx:"完全ランダム" },
    { id:"seed_shop",   name:"店頭タネ",     desc:"店で生まれたタネ。\n店頭ナンバーを宿している。", factor:1.00, img:"https://ul.h3z.jp/IjvuhWoY.png", fx:"店頭の気配" },
    { id:"seed_line",   name:"回線タネ",     desc:"画面の向こうから届いたタネ。\nクリックすると芽が出る。", factor:1.00, img:"https://ul.h3z.jp/AonxB5x7.png", fx:"回線由来" },
    { id:"seed_special",name:"たこぴのタネ", desc:"このタネを植えたら、\n必ず「たこぴ8枚」から出る。", factor:1.00, img:"https://ul.h3z.jp/29OsEvjf.png", fx:"たこぴ専用8枚" },
    { id:"seed_bussasari", name:"ブッ刺さりタネ", desc:"刺さるのは心だけ。\n出るのは5枚だけ（全部N）。", factor:1.05, img:"https://ul.h3z.jp/MjWkTaU3.png", fx:"刺さり固定5枚" },
    { id:"seed_namara_kawasar", name:"なまら買わさるタネ", desc:"気付いたら買ってる。\n12枚固定（内訳：LR/UR/SR/R/N）。", factor:1.08, img:"https://ul.h3z.jp/yiqHzfi0.png", fx:"買わさり固定12枚" },
  ];

  // ✅ コラボ種（表示する分だけ）
  const SEEDS_COLLAB = COLLAB_SEEDS
    .filter(c => !c.hidden && !isBlockedCollabId(c.collabId))
    .map(c => ({
      id: String(c.seedId),
      name: String(c.name),
      desc:"（コラボ）\nseed_tokenで植える。\n内容はGASが確定。",
      factor:1.00,
      img: String(c.img),
      fx:"seed_token制",
      _collab:true,
    }));

  const SEEDS = [...SEEDS_BASE, ...SEEDS_COLLAB];

  const WATERS = [
    { id:"water_plain_free", name:"ただの水", desc:"無料・UR/LRなし。\n無課金の基準。", factor:1.00, fx:"基準（水）", img:"https://ul.h3z.jp/13XdhuHi.png", rates:{ N:62.5, R:31.2, SR:6.3, UR:0, LR:0 } },
    { id:"water_nice", name:"なんか良さそうな水", desc:"ちょい上振れ・LRなし。\n初心者の背中押し。", factor:0.98, fx:"ちょい上振れ", img:"https://ul.h3z.jp/3z04ypEd.png", rates:{ N:57.2, R:31.8, SR:8.9, UR:2.1, LR:0 } },
    { id:"water_suspicious", name:"怪しい水", desc:"現実準拠・標準。\n実パックと同じ空気。", factor:0.95, fx:"標準（現実準拠）", img:"https://ul.h3z.jp/wtCO9mec.png", rates:{ N:61.5, R:30.8, SR:6.15, UR:1.03, LR:0.51 } },
    { id:"water_overdo", name:"やりすぎな水", desc:"勝負水・現実より上。\n体感で強い。", factor:0.90, fx:"勝負", img:"https://ul.h3z.jp/vsL9ggf6.png", rates:{ N:49.7, R:31.9, SR:12.8, UR:4.1, LR:1.5 } },
    { id:"water_regret", name:"押さなきゃよかった水", desc:"確定枠・狂気。\n事件製造機（SNS向け）", factor:1.00, fx:"事件", img:"https://ul.h3z.jp/L0nafMOp.png", rates:{ N:99.97, R:0, SR:0, UR:0, LR:0.03 } },
  ];

  const FERTS = [
    { id:"fert_agedama", name:"ただの揚げ玉", desc:"時短0。\n（今は見た目だけ）", factor:1.00, fx:"時短 0%", img:"https://ul.h3z.jp/9p5fx53n.png", burnCardUp:0.12, rawCardChance:0.00, mantra:false, skipGrowAnim:false },
    { id:"fert_feel", name:"気のせい肥料", desc:"早くなった気がする。\n気のせいかもしれない。", factor:0.95, fx:"時短 5%", img:"https://ul.h3z.jp/XqFTb7sw.png", burnCardUp:0.00, rawCardChance:0.00, mantra:false, skipGrowAnim:false },
    { id:"fert_guts", name:"根性論ぶち込み肥料", desc:"理由はない。\n気合いだ。", factor:0.80, fx:"時短 20%", img:"https://ul.h3z.jp/bT9ZcNnS.png", burnCardUp:0.00, rawCardChance:0.00, mantra:true, skipGrowAnim:false },
    { id:"fert_skip", name:"工程すっ飛ばし肥料", desc:"途中は、\n見なかったことにした。", factor:0.60, fx:"時短 40%", img:"https://ul.h3z.jp/FqPzx12Q.png", burnCardUp:0.00, rawCardChance:0.01, mantra:false, skipGrowAnim:true },
    { id:"fert_timeno", name:"時間を信じない肥料", desc:"最終兵器・禁忌。\n（今は時短だけ）", factor:0.10, fx:"時短 90〜100%", img:"https://ul.h3z.jp/l2njWY57.png", burnCardUp:0.00, rawCardChance:0.03, mantra:false, skipGrowAnim:true },
  ];

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

  const BUSSASARI_POOL = [
    { id:"BS-001", name:"たこ焼きダーツインフェルノ《對馬裕佳子》", img:"https://ul.h3z.jp/l5roYZJ4.png", rarity:"N" },
    { id:"BS-002", name:"店主反撃レビュー《佐俣雄一郎》", img:"https://ul.h3z.jp/BtOTLlSo.png", rarity:"N" },
    { id:"BS-003", name:"自己啓発タコ塾《井上諒》", img:"https://ul.h3z.jp/P5vsAste.png", rarity:"N" },
    { id:"BS-004", name:"カロリーゼロ理論《仁木治》", img:"https://ul.h3z.jp/ZGBzzH2r.png", rarity:"N" },
    { id:"BS-005", name:"白い契約《稲石裕》", img:"https://ul.h3z.jp/nmiaCKae.png", rarity:"N" },
  ];

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
  // 在庫
  // =========================================================
  function defaultInv(){
    const inv = { ver:1, seed:{}, water:{}, fert:{} };
    SEEDS_BASE.forEach(x => inv.seed[x.id] = 0);
    SEEDS_COLLAB.forEach(x => inv.seed[x.id] = 0);
    WATERS.forEach(x => inv.water[x.id] = 0);
    FERTS.forEach(x => inv.fert[x.id] = 0);

    // 互換：非表示コラボseedもキーだけは生やす（0）
    for(const def of COLLAB_SEEDS){
      inv.seed[String(def.seedId)] = inv.seed[String(def.seedId)] ?? 0;
    }

    // 旧互換：昔のキーが残っていても無視（0に寄せたいならここで）
    inv.seed["seed_collab"] = 0;
    inv.seed["seed_colabo_gratan"] = inv.seed["seed_colabo_gratan"] ?? 0;
    inv.seed["seed_colabo_ghost"]  = inv.seed["seed_colabo_ghost"]  ?? 0;
    inv.seed["seed_colabo_hold"]   = inv.seed["seed_colabo_hold"]   ?? 0;

    return inv;
  }

  function loadInv(){
    try{
      const raw = localStorage.getItem(LS.inv);
      if(!raw) return defaultInv();
      const inv = JSON.parse(raw);
      if(!inv || typeof inv !== "object") return defaultInv();
      inv.seed  = inv.seed  || {};
      inv.water = inv.water || {};
      inv.fert  = inv.fert  || {};

      // 追加キー補完
      for(const x of SEEDS_BASE)  if(!(x.id in inv.seed))  inv.seed[x.id]=0;
      for(const x of SEEDS_COLLAB)if(!(x.id in inv.seed))  inv.seed[x.id]=0;
      for(const x of WATERS) if(!(x.id in inv.water)) inv.water[x.id]=0;
      for(const x of FERTS)  if(!(x.id in inv.fert))  inv.fert[x.id]=0;

      // 互換キー
      for(const def of COLLAB_SEEDS){
        const sid = String(def.seedId);
        if(!(sid in inv.seed)) inv.seed[sid] = 0;
      }
      inv.seed["seed_collab"] = 0;

      return inv;
    }catch(e){
      return defaultInv();
    }
  }
  function saveInv(inv){ localStorage.setItem(LS.inv, JSON.stringify(inv)); }

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
  // seed_token store（rotenと共通）
  // =========================================================
  function seedTokensDefault(){
    return { ver:1, tokens:[] }; // [{token, collabId, issuedAt, status}]
  }

  function loadSeedTokenStore(){
    try{
      const raw = localStorage.getItem(LS.seedTokens);
      if(!raw) return seedTokensDefault();
      const v = JSON.parse(raw);

      // 旧：配列だけ
      if(Array.isArray(v)){
        return { ver:1, tokens: v };
      }
      // 新：{ver,tokens}
      if(v && typeof v === "object"){
        return {
          ver: Number.isFinite(Number(v.ver)) ? Number(v.ver) : 1,
          tokens: Array.isArray(v.tokens) ? v.tokens : []
        };
      }
      return seedTokensDefault();
    }catch(e){
      return seedTokensDefault();
    }
  }

  function saveSeedTokenStore(store){
    const safe = {
      ver: Number.isFinite(Number(store?.ver)) ? Number(store.ver) : 1,
      tokens: Array.isArray(store?.tokens) ? store.tokens : []
    };
    localStorage.setItem(LS.seedTokens, JSON.stringify(safe));
  }

  function normTokenEntry(entry){
    if(typeof entry === "string"){
      return { token: entry, collabId: null, status: "ISSUED" };
    }
    if(entry && typeof entry === "object"){
      return {
        token: String(entry.token || entry.id || "").trim(),
        collabId: entry.collabId ? String(entry.collabId).trim() : null,
        status: entry.status ? String(entry.status).trim().toUpperCase() : "ISSUED",
        issuedAt: entry.issuedAt ? Number(entry.issuedAt) : null,
      };
    }
    return { token:"", collabId:null, status:"ISSUED" };
  }

  function isIssuedToken(t){
    const s = String(t?.status || "").toUpperCase();
    return !s || s === "ISSUED";
  }

  function countIssuedTokensByCollab(collabId){
    if(!collabId) return 0;
    if(isBlockedCollabId(collabId)) return 0;

    const store = loadSeedTokenStore();
    const list = (store.tokens || []).map(normTokenEntry);
    return list.filter(x => x.token && x.collabId === collabId && isIssuedToken(x)).length;
  }

  // ✅ inv.seed[各collab seedId] を “ISSUED token本数”で同期（互換・表示用）
  function syncCollabSeedsToInv(){
    const inv = loadInv();
    inv.seed = inv.seed || {};

    for(const def of COLLAB_SEEDS){
      const cid = String(def.collabId);
      const sid = String(def.seedId);

      if(isBlockedCollabId(cid)){
        inv.seed[sid] = 0;
        continue;
      }
      inv.seed[sid] = countIssuedTokensByCollab(cid);
    }

    // 旧合算は常に0
    inv.seed["seed_collab"] = 0;

    saveInv(inv);
  }

  function takeOneIssuedToken(collabId){
    if(!collabId || isBlockedCollabId(collabId)) return null;

    const store = loadSeedTokenStore();
    const list = (store.tokens || []).map(normTokenEntry);

    const idx = list.findIndex(x => x.token && x.collabId === collabId && isIssuedToken(x));
    if(idx < 0) return null;

    const picked = list[idx];
    list[idx] = { ...picked, status: "PLANTED" };

    store.tokens = list;
    saveSeedTokenStore(store);

    return picked.token;
  }

  function markTokenStatus(token, status){
    if(!token) return false;
    const store = loadSeedTokenStore();
    const list = (store.tokens || []).map(normTokenEntry);
    const idx = list.findIndex(x => x.token === String(token));
    if(idx < 0) return false;

    list[idx] = { ...list[idx], status: String(status||"").toUpperCase() || "ISSUED" };
    store.tokens = list;
    saveSeedTokenStore(store);
    return true;
  }

  // =========================================================
  // オクト
  // =========================================================
  function loadOcto(){
    const n = Number(localStorage.getItem(LS.octo) ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  function saveOcto(n){
    localStorage.setItem(LS.octo, String(Math.max(0, Math.floor(Number(n) || 0))));
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
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

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

    // コラボ種は報酬で出さない
    const seedChoices = SEEDS_BASE.slice();
    const waterChoices = WATERS.slice();
    const fertChoices = FERTS.slice();

    const rewards = [];
    for(let k=0;k<count;k++){
      let pickedItem = null;
      if(cat === "seed")  pickedItem = pick(seedChoices);
      if(cat === "water") pickedItem = pick(waterChoices);
      if(cat === "fert")  pickedItem = pick(fertChoices);
      if(!pickedItem) pickedItem = pick(seedChoices);
      rewards.push({ kind: cat, id: pickedItem.id, name: pickedItem.name, img: pickedItem.img, qty: 1 });
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
    const inv2 = loadInv();
    for(const it of items){
      invAdd(inv2, it.kind, it.id, it.qty);
    }
    saveInv(inv2);

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
  // ロードアウト
  // =========================================================
  function defaultLoadout(){ return { ver:1, seedId:null, waterId:null, fertId:null }; }
  function loadLoadout(){
    try{
      const raw = localStorage.getItem(LS.loadout);
      if(!raw) return defaultLoadout();
      const obj = JSON.parse(raw);
      if(!obj || typeof obj !== "object") return defaultLoadout();
      return { ver:1, seedId: obj.seedId || null, waterId: obj.waterId || null, fertId: obj.fertId || null };
    }catch(e){ return defaultLoadout(); }
  }
  function saveLoadout(l){ localStorage.setItem(LS.loadout, JSON.stringify(l)); }
  let loadout = loadLoadout();

  // =========================================================
  // 畑状態
  // =========================================================
  const defaultPlot  = () => ({ state:"EMPTY" });
  const defaultState = () => ({ ver:1, plots: Array.from({length:MAX_PLOTS}, defaultPlot) });

  function loadState(){
    try{
      const raw = localStorage.getItem(LS.state);
      if(!raw) return defaultState();
      const obj = JSON.parse(raw);
      if(!obj || !Array.isArray(obj.plots) || obj.plots.length !== MAX_PLOTS) return defaultState();
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
      return obj;
    }catch(e){ return { ver:1, got:{} }; }
  }
  function saveBook(b){ localStorage.setItem(LS.book, JSON.stringify(b)); }

  let state  = loadState();
  let book   = loadBook();
  let inv    = loadInv();

  // =========================================================
  // レア抽選（水）
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

  function makeTNSet(from, to){
    const set = new Set();
    for(let i=from;i<=to;i++) set.add(`TN-${String(i).padStart(3,"0")}`);
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

  function pickBussasariReward(){
    const c = pick(BUSSASARI_POOL);
    return { id:c.id, name:c.name, img:c.img, rarity:"N" };
  }
  function pickNamaraReward(){
    const c = pick(NAMARA_POOL);
    return { id:c.id, name:c.name, img:c.img, rarity:c.rarity };
  }

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

  function drawRewardForPlot(p){
    const sp = pickFertSPIfAny(p);
    if(sp) return sp;

    if (p && p.seedId === "seed_special") {
      const c = pick(TAKOPI_SEED_POOL);
      return { id:c.id, name:c.name, img:c.img, rarity:(c.rarity || "N") };
    }

    // ✅ コラボはここで抽選しない（GAS harvest）
    if (p && isCollabSeed(p.seedId)) {
      return { id:"COL-NG", name:"（コラボはGAS確定）", img:"", rarity:"" };
    }

    if (p && p.seedId === "seed_bussasari") return pickBussasariReward();
    if (p && p.seedId === "seed_namara_kawasar") return pickNamaraReward();

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
  // DOM（必須）
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

  const missing = [];
  if(!farmEl) missing.push("#farm");
  if(!stBook) missing.push("#stBook");
  if(!stGrow) missing.push("#stGrow");
  if(!stReady) missing.push("#stReady");
  if(!stBurn) missing.push("#stBurn");
  if(!stLevel) missing.push("#stLevel");
  if(!stXP) missing.push("#stXP");
  if(!stXpLeft) missing.push("#stXpLeft");
  if(!stXpNeed) missing.push("#stXpNeed");
  if(!stXpBar) missing.push("#stXpBar");
  if(!stUnlock) missing.push("#stUnlock");
  if(!equipSeedBtn) missing.push("#equipSeed");
  if(!equipWaterBtn) missing.push("#equipWater");
  if(!equipFertBtn) missing.push("#equipFert");
  if(!equipSeedImg) missing.push("#equipSeedImg");
  if(!equipWaterImg) missing.push("#equipWaterImg");
  if(!equipFertImg) missing.push("#equipFertImg");
  if(!equipSeedName) missing.push("#equipSeedName");
  if(!equipWaterName) missing.push("#equipWaterName");
  if(!equipFertName) missing.push("#equipFertName");
  if(!equipSeedCnt) missing.push("#equipSeedCnt");
  if(!equipWaterCnt) missing.push("#equipWaterCnt");
  if(!equipFertCnt) missing.push("#equipFertCnt");
  if(!modal) missing.push("#modal");
  if(!mTitle) missing.push("#mTitle");
  if(!mBody) missing.push("#mBody");
  if(!mClose) missing.push("#mClose");

  if(missing.length){
    console.error("❌ 必須DOMが見つからない:", missing.join(", "));
    alert("HTMLに必須IDが足りません: " + missing.join(", "));
    return;
  }

  // =========================================================
  // モーダル（背景ロック＋モーダル内スクロールOK）
  // =========================================================
  let __scrollY = 0;
  let __locked = false;
  let __harvestCommitFn = null;

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
    __harvestCommitFn = null;
    unlockScroll();
  }

  function setHarvestCommit(fn){ __harvestCommitFn = (typeof fn === "function") ? fn : null; }
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
  // UIヘルパ
  // =========================================================
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
  // 装備表示更新（コラボは token本数）
  // =========================================================
  function renderLoadout(){
    syncCollabSeedsToInv();
    inv = loadInv();
    loadout = loadLoadout();

    const seed  = [...SEEDS_BASE, ...SEEDS_COLLAB].find(x=>x.id===loadout.seedId)  || null;
    const water = WATERS.find(x=>x.id===loadout.waterId) || null;
    const fert  = FERTS.find(x=>x.id===loadout.fertId)  || null;

    if(seed){
      equipSeedImg.src = seed.img;
      equipSeedName.textContent = seed.name;

      if(isCollabSeed(seed.id)){
        const cid = collabIdForSeed(seed.id);
        equipSeedCnt.textContent = `×${cid ? countIssuedTokensByCollab(cid) : 0}`;
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
  // グリッド選択UI（コラボは token本数）
  // =========================================================
  function openPickGrid(kind){
    syncCollabSeedsToInv();
    inv = loadInv();
    loadout = loadLoadout();

    const isSeed  = (kind === "seed");
    const isWater = (kind === "water");
    const isFert  = (kind === "fert");

    const items = isSeed ? [...SEEDS_BASE, ...SEEDS_COLLAB] : isWater ? WATERS : FERTS;
    const invType = isSeed ? "seed" : isWater ? "water" : "fert";
    const title = isSeed ? "種を選ぶ" : isWater ? "水を選ぶ" : "肥料を選ぶ";

    const cells = items.map(x => {
      let cnt = invGet(inv, invType, x.id);

      if(isSeed && isCollabSeed(x.id)){
        const cid = collabIdForSeed(x.id);
        cnt = cid ? countIssuedTokensByCollab(cid) : 0;
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
  // 描画
  // =========================================================
  function render(){
    syncCollabSeedsToInv();
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

        if (isCollabSeed(p.seedId)) {
          const g = getCollabGrowImgs(p.seedId);
          img = (progress < 0.5) ? g.g1 : g.g2;
        } else {
          if (progress < 0.5) img = PLOT_IMG.GROW1;
          else {
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
  // 植える
  // =========================================================
  function ensureLoadoutOrOpen(){
    loadout = loadLoadout();
    if(!loadout.seedId){ openPickGrid("seed"); return false; }
    if(!loadout.waterId){ openPickGrid("water"); return false; }
    if(!loadout.fertId){ openPickGrid("fert"); return false; }
    return true;
  }

  function plantAt(index){
    syncCollabSeedsToInv();
    inv = loadInv();
    loadout = loadLoadout();

    const seedId  = loadout.seedId;
    const waterId = loadout.waterId;
    const fertId  = loadout.fertId;

    const isCollab = isCollabSeed(seedId);
    const collabId = isCollab ? collabIdForSeed(seedId) : null;

    const okSeed  = isCollab
      ? (collabId ? (countIssuedTokensByCollab(collabId) > 0) : false)
      : (invGet(inv, "seed",  seedId)  > 0);

    const okWater = invGet(inv, "water", waterId) > 0;
    const okFert  = invGet(inv, "fert",  fertId)  > 0;

    if(!okSeed || !okWater || !okFert){
      const lack =
        (!okSeed) ? (isCollab ? `コラボのタネ（${collabId || "unknown"} token）` : "タネ") :
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

      document.getElementById("btnChange").addEventListener("click", ()=>{
        closeModal();
        openPickGrid(goKind);
      });
      document.getElementById("btnOk").addEventListener("click", closeModal);
      return;
    }

    // 消費（コラボは token を消費、通常は inv を消費）
    let usedSeedToken = null;
    if(isCollab){
      usedSeedToken = takeOneIssuedToken(collabId);
      if(!usedSeedToken){
        openModal("token不足", `<div class="step">このコラボの seed_token が足りない。</div><div class="row"><button type="button" id="ok">OK</button></div>`);
        document.getElementById("ok").addEventListener("click", closeModal);
        return;
      }
    }else{
      if(!invDec(inv, "seed", seedId)){
        openModal("タネ不足", `<div class="step">タネが足りない。</div><div class="row"><button type="button" id="ok">OK</button></div>`);
        document.getElementById("ok").addEventListener("click", closeModal);
        return;
      }
    }

    invDec(inv, "water", waterId);
    invDec(inv, "fert",  fertId);
    saveInv(inv);

    const seed  = [...SEEDS_BASE, ...SEEDS_COLLAB].find(x=>x.id===seedId);
    const water = WATERS.find(x=>x.id===waterId);
    const fert  = FERTS.find(x=>x.id===fertId);

    
     
     
   const baseFactor = (seed?.factor ?? 1) * (water?.factor ?? 1) * (fert?.factor ?? 1);
const isTimeNo = (fertId === "fert_timeno");
const factor = clamp(baseFactor, 0.01, 1.0);

// ✅ テスト用：時間を信じない肥料だけ“最低時間”制限を外して即テスト可能にする
const growMs = isTimeNo
  ? Math.max(10_000, Math.floor(BASE_GROW_MS * factor))   // 最短10秒（好みで変更OK）
  : Math.max(60*60*1000, Math.floor(BASE_GROW_MS * factor)); // それ以外は最低1時間維持  
     
     
     
     
     
     
     
     
     
     
    
    const startAt = Date.now();
    const readyAt = startAt + growMs;

    // 植えた瞬間に「通常の確定情報」を作る（コラボはしない）
    let fixedRarity = null;
    let reward = null;
    let srHint = null;

    if(!isCollab){
      fixedRarity = pickRarityWithWater(waterId);
      // SRヒント（演出）
      if(fixedRarity === "SR" && Math.random() < 0.65) srHint = "SR65";
      if(fixedRarity === "SR" && Math.random() < 0.10) srHint = "SR100";
      reward = drawRewardForPlot({ seedId, waterId, fertId, fixedRarity });
    }

    state.plots[index] = {
      state:"GROW",
      startAt, readyAt,
      seedId, waterId, fertId,
      fixedRarity: fixedRarity || null,
      srHint: srHint || null,

      // ✅ コラボ用
      collabId: isCollab ? collabId : null,
      seedToken: isCollab ? usedSeedToken : null,

      // ✅ 通常用：収穫時にこれを出す
      reward: reward || null,
    };

    saveState(state);

    // 同期して表示を即更新
    syncCollabSeedsToInv();
    render();
  }

  // =========================================================
  // 収穫（通常：ローカル / コラボ：GAS）
  // =========================================================
  function addToBook(card){
    book = loadBook();
    book.got = book.got || {};

    const id = String(card.id || "").trim();
    if(!id) return;

    if(!book.got[id]){
      book.got[id] = {
        id,
        name: card.name || "",
        img: card.img || "",
        rarity: card.rarity || "",
        count: 0,
        firstAt: Date.now(),
        lastAt: Date.now(),
      };
    }
    book.got[id].count = Number(book.got[id].count || 0) + 1;
    book.got[id].lastAt = Date.now();

    saveBook(book);
  }

  function openHarvestModal(card, onCommit){
    const rarity = String(card.rarity || "");
    openModal("収穫！", `
      <div class="harvWrap">
        <div class="harvCard">
          <img src="${card.img || PLOT_IMG.EMPTY}" alt="">
        </div>
        <div class="harvMeta">
          <div class="harvR">${rarity}</div>
          <div class="harvName">${card.name || "NO NAME"}</div>
          <div class="harvId">${card.id || ""}</div>
        </div>
        <div class="row">
          <button type="button" class="primary" id="harvOk">閉じる（確定）</button>
        </div>
        <div class="note">※閉じた瞬間、図鑑に登録＆経験値が入る</div>
      </div>
    `);

    setHarvestCommit(() => {
      try{ onCommit && onCommit(); } finally { closeModal(); }
    });

    document.getElementById("harvOk").addEventListener("click", closeModalOrCommit);
  }

  async function gasPost(payload){
    const res = await fetch(GAS_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if(!res.ok) throw new Error("HTTP " + res.status);
    const txt = await res.text();
    let json;
    try{ json = JSON.parse(txt); }catch(e){ throw new Error("JSON parse failed"); }
    return json;
  }

  async function harvestCollabOnServer(seedToken){
    // GAS側の実装に合わせて api 名を変えてOK
    // （あなたの設計メモでは harvest）
    return await gasPost({
      api: "harvest",
      token: String(seedToken || ""),
      ts: Date.now(),
      app: "farm"
    });
  }

  async function doHarvest(index){
    const p = state.plots[index];
    if(!p || p.state !== "READY") return;

    // ✅ コラボ
    if(isCollabSeed(p.seedId)){
      const token = p.seedToken;
      if(!token){
        openModal("エラー", `<div class="step">seedTokenが無い…（復元/編集で壊れた可能性）</div><div class="row"><button type="button" id="ok">OK</button></div>`);
        document.getElementById("ok").addEventListener("click", closeModal);
        return;
      }

      openModal("通信中…", `<div class="step">サーバーでカード確定中…</div>`);

      try{
        const data = await harvestCollabOnServer(token);
        if(!data?.ok){
          openModal("収穫失敗", `<div class="step">${data?.error || "サーバーが拒否した"}</div><div class="row"><button type="button" id="ok">OK</button></div>`);
          document.getElementById("ok").addEventListener("click", closeModal);
          return;
        }

        const card = data.card || data.result || null;
        if(!card){
          openModal("収穫失敗", `<div class="step">カード情報が返ってこなかった</div><div class="row"><button type="button" id="ok">OK</button></div>`);
          document.getElementById("ok").addEventListener("click", closeModal);
          return;
        }

        const gotCard = {
          id: String(card.cardId || card.id || ""),
          name: String(card.name || ""),
          img: String(card.img || card.image || ""),
          rarity: String(card.rarity || ""),
        };

        // 表示 → 閉じるで確定
        openHarvestModal(gotCard, () => {
          addToBook(gotCard);

          // tokenをHARVESTEDへ
          markTokenStatus(token, "HARVESTED");

          // XP
          const xp = XP_BY_RARITY[gotCard.rarity] ?? 20;
          addXP(xp);

          // マスを空に
          state.plots[index] = { state:"EMPTY" };
          saveState(state);

          // 同期
          syncCollabSeedsToInv();
          render();
        });

      }catch(e){
        openModal("通信失敗", `<div class="step">通信に失敗した…</div><div class="row"><button type="button" id="ok">OK</button></div>`);
        document.getElementById("ok").addEventListener("click", closeModal);
      }
      return;
    }

    // ✅ 通常（ローカル確定）
    const reward = p.reward || drawRewardForPlot(p);
    if(!reward || !reward.id){
      openModal("収穫失敗", `<div class="step">報酬が壊れてる</div><div class="row"><button type="button" id="ok">OK</button></div>`);
      document.getElementById("ok").addEventListener("click", closeModal);
      return;
    }

    openHarvestModal(reward, () => {
      addToBook(reward);

      const xp = XP_BY_RARITY[reward.rarity] ?? 20;
      addXP(xp);

      state.plots[index] = { state:"EMPTY" };
      saveState(state);

      syncCollabSeedsToInv();
      render();
    });
  }

  // =========================================================
  // 焦げ（捨てる）
  // =========================================================
  function clearBurn(index){
    openModal("焦げた…", `
      <div class="step">このマスは焦げている。捨てて空にする？</div>
      <div class="row">
        <button type="button" id="burnNo">やめる</button>
        <button type="button" class="primary" id="burnYes">捨てる</button>
      </div>
    `);
    document.getElementById("burnNo").addEventListener("click", closeModal);
    document.getElementById("burnYes").addEventListener("click", () => {
      state.plots[index] = { state:"EMPTY" };
      saveState(state);
      closeModal();
      render();
    });
  }

  // =========================================================
  // マスタップ
  // =========================================================
  function onPlotTap(index){
    player = loadPlayer();
    const locked = (index >= player.unlocked);
    if(locked){
      openModal("ロック中", `<div class="step">Lvアップで畑が解放される</div><div class="row"><button type="button" id="ok">OK</button></div>`);
      document.getElementById("ok").addEventListener("click", closeModal);
      return;
    }

    const p = state.plots[index] || { state:"EMPTY" };

    if(p.state === "EMPTY"){
      if(!ensureLoadoutOrOpen()) return;
      plantAt(index);
      return;
    }
    if(p.state === "GROW"){
      const remain = (p.readyAt || 0) - Date.now();
      openModal("育成中", `
        <div class="step">もう少し…<br><b>${fmtRemain(remain)}</b></div>
        <div class="row"><button type="button" id="ok">OK</button></div>
      `);
      document.getElementById("ok").addEventListener("click", closeModal);
      return;
    }
    if(p.state === "READY"){
      doHarvest(index);
      return;
    }
    if(p.state === "BURN"){
      clearBurn(index);
      return;
    }
  }

  // =========================================================
  // TICK：GROW→READY / READY→BURN
  // =========================================================
  function tick(){
    let changed = false;
    const now = Date.now();

    for(let i=0;i<MAX_PLOTS;i++){
      const p = state.plots[i];
      if(!p) continue;

      if(p.state === "GROW"){
        if((p.readyAt || 0) <= now){
          p.state = "READY";
          p.readyShownAt = now;
          changed = true;
        }
      }else if(p.state === "READY"){
        const shown = Number(p.readyShownAt || p.readyAt || now);
        if((shown + READY_TO_BURN_MS) <= now){
          p.state = "BURN";
          changed = true;
        }
      }
    }

    if(changed){
      saveState(state);
      render();
    }else{
      // 表示更新だけ（残り時間が動く）
      render();
    }
  }

  // =========================================================
  // BOOT
  // =========================================================
  function boot(){
    // 起動時に必ず同期（露店→畑の反映を確実に）
    syncCollabSeedsToInv();

    state = loadState();
    book  = loadBook();
    inv   = loadInv();
    player= loadPlayer();
    loadout = loadLoadout();

    render();

    clearInterval(boot._t);
    boot._t = setInterval(tick, TICK_MS);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot, { once:true });
  }else{
    boot();
  }
})();
