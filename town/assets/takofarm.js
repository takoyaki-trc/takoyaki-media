(() => {
  "use strict";

  /* ==========================
     たこ焼きファーム v1.1（分割版） → v1.2（装備式UI 統合版）
     ✅ v1.1のロジック（在庫/XP/ロック/シリアル/専用タネ/肥料SP/水レア率/報酬固定）を丸ごと保持
     ✅ 追加：装備式UI（上部バー）＋グリッド一覧（短文カード）＋詳細パネル（常設）
     ✅ EMPTYマスは装備中の3点セットでワンタップ植え
     ✅ シリアル入力（コラボのタネ）は継続（モーダル）
     ✅ 既存localStorage互換維持（新キー tf_v1_equip 追加のみ）
  ========================== */

  // 「🛒ショップ」押下で飛ぶ先（必要なら後で調整）
  const SHOP_URL = "./roten.html";

  // マス画像（状態ごと）
  const PLOT_IMG = {
    EMPTY: "https://ul.h3z.jp/muPEAkao.png",
    GROW1: "https://ul.h3z.jp/BrHRk8C4.png",
    GROW2: "https://ul.h3z.jp/tD4LUB6F.png",
    READY: "https://ul.h3z.jp/AmlnQA1b.png",
    BURN:  "https://ul.h3z.jp/q9hxngx6.png",
    GROW2_SR65:  "https://ul.h3z.jp/W086w3xd.png",
    GROW2_SR100: "https://ul.h3z.jp/tBVUoc8w.png"
  };

  const LS_STATE  = "tf_v1_state";
  const LS_BOOK   = "tf_v1_book";
  const LS_PLAYER = "tf_v1_player";
  const LS_INV = "tf_v1_inv";
  const LS_CODES_USED = "tf_v1_codes_used";

  // ★追加：装備（v1.2）
  const LS_EQUIP = "tf_v1_equip";

  // ★ヒント文に合わせて 5時間
  const BASE_GROW_MS = 5 * 60 * 60 * 1000;      // 5時間
  const READY_TO_BURN_MS = 8 * 60 * 60 * 1000;  // READYから8時間で焦げ
  const TICK_MS = 1000;

  const BASE_RARITY_RATE = { N:70, R:20, SR:8, UR:1.8, LR:0.2 };

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
      { no:"TN-022", name:"たこ焼きダ Attach-Inferno《對馬裕佳子プロ🎯》", img:"https://ul.h3z.jp/Prf7KxRk.jpg" },
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
      { no:"TN-001", name:"黒き真珠イカさま焼き", img:"https://ul.h3z.jp/2KeO7gmu.jpg" },
      { no:"TN-007", name:"ローソク出せ！", img:"https://ul.h3z.jp/FI5xXdQ7.jpg" },
      { no:"TN-033", name:"鉄板のビーナス", img:"https://ul.h3z.jp/0Tvf0Asc.jpg" },
      { no:"TN-045", name:"ドリームファイト", img:"https://ul.h3z.jp/IzPy6UsO.jpg" },
    ],
    LR: [
      { no:"TN-025", name:"たこ焼き化石in函館山", img:"https://ul.h3z.jp/YSFRycmY.jpg" },
      { no:"TN-050", name:"焼かれし記憶、ソースに還る", img:"https://ul.h3z.jp/0I6s0icl.jpg" },
    ],
  };

  // =========================================================
  // ★タネ一覧（ここに追加したIDが「種を選ぶ」に並ぶ）
  // =========================================================
  const SEEDS = [
    { id:"seed_random", name:"【なに出るタネ】", desc:"何が育つかは完全ランダム。\n店主も知らない。", factor:1.00, img:"https://ul.h3z.jp/gnyvP580.png", fx:"完全ランダム" },
    { id:"seed_shop", name:"【店頭タネ】", desc:"店で生まれたタネ。\n店頭ナンバーを宿している。", factor:1.00, img:"https://ul.h3z.jp/IjvuhWoY.png", fx:"店頭の気配" },
    { id:"seed_line", name:"【回線タネ】", desc:"画面の向こうから届いたタネ。\nクリックすると芽が出る。", factor:1.00, img:"https://ul.h3z.jp/AonxB5x7.png", fx:"回線由来" },

    { id:"seed_special", name:"【たこぴのタネ】", desc:"このタネを植えたら、\n必ず「たこぴ8枚」から出る。", factor:1.00, img:"https://ul.h3z.jp/29OsEvjf.png", fx:"たこぴ専用8枚" },

    // ★追加：タネ自体が別（ショップ専用/ダーツ専用）
    // ※画像URLはあなたのタネ画像に差し替えてOK（今は仮のまま）
    { id:"seed_shop_only",  name:"【ショップのタネ】", desc:"ショップ専用。\nこのタネからしか出ない12枚。", factor:1.00, img:"https://ul.h3z.jp/IjvuhWoY.png", fx:"ショップ専用12枚" },
    { id:"seed_darts_only", name:"【ダーツのタネ】",  desc:"ダーツ専用。\nこのタネからしか出ない5枚。",  factor:1.00, img:"https://ul.h3z.jp/AonxB5x7.png", fx:"ダーツ専用5枚" },

    { id:"seed_colabo", name:"【コラボのタネ】", desc:"シリアル入力で増える。\nそのうち何か起きる。", factor:1.00, img:"https://ul.h3z.jp/AWBcxVls.png", fx:"シリアル解放" },
  ];

  const WATERS = [
    { id:"water_plain_free", name:"《ただの水》", desc:"無料・UR/LRなし。\n無課金の基準。", factor:1.00, fx:"基準（水）", img:"https://ul.h3z.jp/13XdhuHi.png", rates:{ N:62.5, R:31.2, SR:6.3, UR:0, LR:0 } },
    { id:"water_nice", name:"《なんか良さそうな水》", desc:"ちょい上振れ・LRなし。\n初心者の背中押し。", factor:0.98, fx:"ちょい上振れ", img:"https://ul.h3z.jp/3z04ypEd.png", rates:{ N:57.2, R:31.8, SR:8.9, UR:2.1, LR:0 } },
    { id:"water_suspicious", name:"《怪しい水》", desc:"現実準拠・標準。\n実パックと同じ空気。", factor:0.95, fx:"標準（現実準拠）", img:"https://ul.h3z.jp/wtCO9mec.png", rates:{ N:61.5, R:30.8, SR:6.15, UR:1.03, LR:0.51 } },
    { id:"water_overdo", name:"《やりすぎな水》", desc:"勝負水・現実より上。\n体感で強い。", factor:0.90, fx:"勝負", img:"https://ul.h3z.jp/vsL9ggf6.png", rates:{ N:49.7, R:31.9, SR:12.8, UR:4.1, LR:1.5 } },
    { id:"water_regret", name:"《押さなきゃよかった水》", desc:"確定枠・狂気。\n事件製造機（SNS向け）", factor:1.00, fx:"事件", img:"https://ul.h3z.jp/L0nafMOp.png", rates:{ N:99.97, R:0, SR:0, UR:0, LR:0.03 } },
  ];

  const FERTS = [
    { id:"fert_agedama", name:"①ただの揚げ玉", desc:"時短0。\n《焼きすぎたカード》率UP", factor:1.00, fx:"時短 0%", img:"https://ul.h3z.jp/9p5fx53n.png", burnCardUp:0.12, rawCardChance:0.00, mantra:false, skipGrowAnim:false },
    { id:"fert_feel", name:"②《気のせい肥料》", desc:"早くなった気がする。\n気のせいかもしれない。", factor:0.95, fx:"時短 5%", img:"https://ul.h3z.jp/XqFTb7sw.png", burnCardUp:0.00, rawCardChance:0.00, mantra:false, skipGrowAnim:false },
    { id:"fert_guts", name:"③《根性論ぶち込み肥料》", desc:"理由はない。\n気合いだ。", factor:0.80, fx:"時短 20%", img:"https://ul.h3z.jp/bT9ZcNnS.png", burnCardUp:0.00, rawCardChance:0.00, mantra:true, skipGrowAnim:false },
    { id:"fert_skip", name:"④《工程すっ飛ばし肥料》", desc:"途中は、\n見なかったことにした。", factor:0.60, fx:"時短 40%", img:"https://ul.h3z.jp/FqPzx12Q.png", burnCardUp:0.00, rawCardChance:0.01, mantra:false, skipGrowAnim:true },
    { id:"fert_timeno", name:"⑤《時間を信じない肥料》", desc:"最終兵器・禁忌。\n稀に《ドロドロ生焼けカード》", factor:0.10, fx:"時短 90〜100%", img:"https://ul.h3z.jp/l2njWY57.png", burnCardUp:0.00, rawCardChance:0.03, mantra:false, skipGrowAnim:true },
  ];

  // =========================
  // ★たこぴのタネ専用（8枚）
  // =========================
  const TAKOPI_SEED_POOL = [
    { id:"TP-001", name:"届け！たこぴ便", img:"https://ul.h3z.jp/rjih1Em9.png", rarity:"N" },
    { id:"TP-002", name:"ハロウィンたこぴ", img:"https://ul.h3z.jp/hIDWKss0.png", rarity:"N" },
    { id:"TP-003", name:"紅葉たこぴ", img:"https://ul.h3z.jp/G05m1hbT.png", rarity:"N" },
    { id:"TP-004", name:"クリスマスたこぴ", img:"https://ul.h3z.jp/FGEKvxhK.png", rarity:"N" },
    { id:"TP-005", name:"お年玉たこぴ", img:"https://example.com/takopi5.png", rarity:"N" },
    { id:"TP-006", name:"バレンタインたこぴ", img:"https://ul.h3z.jp/J0kj3CLb.png", rarity:"N" },
    { id:"TP-007", name:"お年玉たこぴ（差替予定）", img:"https://example.com/takopi7.png", rarity:"N" },
    { id:"TP-008", name:"バレンタインたこぴ（差替予定）", img:"https://example.com/takopi8.png", rarity:"N" },
  ];

  // =========================
  // ★ショップのタネ専用（12枚）
  // =========================
  const SHOP_SEED_POOL = [
    { id:"SHP-001", name:"ショップカード1（仮）",  img:"https://example.com/shop1.png",  rarity:"N" },
    { id:"SHP-002", name:"ショップカード2（仮）",  img:"https://example.com/shop2.png",  rarity:"N" },
    { id:"SHP-003", name:"ショップカード3（仮）",  img:"https://example.com/shop3.png",  rarity:"N" },
    { id:"SHP-004", name:"ショップカード4（仮）",  img:"https://example.com/shop4.png",  rarity:"R" },
    { id:"SHP-005", name:"ショップカード5（仮）",  img:"https://example.com/shop5.png",  rarity:"R" },
    { id:"SHP-006", name:"ショップカード6（仮）",  img:"https://example.com/shop6.png",  rarity:"R" },
    { id:"SHP-007", name:"ショップカード7（仮）",  img:"https://example.com/shop7.png",  rarity:"SR" },
    { id:"SHP-008", name:"ショップカード8（仮）",  img:"https://example.com/shop8.png",  rarity:"SR" },
    { id:"SHP-009", name:"ショップカード9（仮）",  img:"https://example.com/shop9.png",  rarity:"SR" },
    { id:"SHP-010", name:"ショップカード10（仮）", img:"https://example.com/shop10.png", rarity:"UR" },
    { id:"SHP-011", name:"ショップカード11（仮）", img:"https://example.com/shop11.png", rarity:"UR" },
    { id:"SHP-012", name:"ショップカード12（仮）", img:"https://example.com/shop12.png", rarity:"LR" },
  ];

  // =========================
  // ★ダーツのタネ専用（5枚）
  // =========================
  const DARTS_SEED_POOL = [
    { id:"DRT-001", name:"ダーツカード1（仮）", img:"https://example.com/darts1.png", rarity:"N"  },
    { id:"DRT-002", name:"ダーツカード2（仮）", img:"https://example.com/darts2.png", rarity:"R"  },
    { id:"DRT-003", name:"ダーツカード3（仮）", img:"https://example.com/darts3.png", rarity:"SR" },
    { id:"DRT-004", name:"ダーツカード4（仮）", img:"https://example.com/darts4.png", rarity:"UR" },
    { id:"DRT-005", name:"ダーツカード5（仮）", img:"https://example.com/darts5.png", rarity:"LR" },
  ];

  const MAX_PLOTS = 25;
  const START_UNLOCK = 3;

  const XP_BY_RARITY = { N:4, R:7, SR:30, UR:80, LR:120 };

  function xpNeedForLevel(level){
    return 120 + (level - 1) * 50 + Math.floor(Math.pow(level - 1, 1.6) * 20);
  }

  function defaultPlayer(){
    return { ver:1, level:1, xp:0, unlocked:START_UNLOCK };
  }

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
    }catch(e){
      return defaultPlayer();
    }
  }
  function savePlayer(p){ localStorage.setItem(LS_PLAYER, JSON.stringify(p)); }

  let player = loadPlayer();

  function addXP(amount){
    if(!Number.isFinite(amount) || amount <= 0) return { leveled:false, unlockedDelta:0 };
    let leveled = false;
    let unlockedDelta = 0;

    player.xp += Math.floor(amount);

    while(player.xp >= xpNeedForLevel(player.level)){
      player.xp -= xpNeedForLevel(player.level);
      player.level += 1;
      leveled = true;

      if(player.unlocked < MAX_PLOTS){
        player.unlocked += 1;
        unlockedDelta += 1;
      }
    }
    savePlayer(player);
    return { leveled, unlockedDelta };
  }

  // =========================================================
  // ★無料（∞）廃止：すべて在庫制（有料化前提）
  // =========================================================
  const FREE_ITEMS = {
    seed:  new Set([]),
    water: new Set([]),
    fert:  new Set([])
  };

  function isFree(invType, id){
    return false;
  }

  function defaultInv(){
    const inv = { ver:1, seed:{}, water:{}, fert:{} };
    SEEDS.forEach(x => inv.seed[x.id] = 0);
    WATERS.forEach(x => inv.water[x.id] = 0);
    FERTS.forEach(x => inv.fert[x.id] = 0);

    // ★テストを楽にするなら初期所持を付けてもOK（不要なら削除）
    // inv.seed["seed_special"]   = 1;
    // inv.seed["seed_shop_only"] = 1;
    // inv.seed["seed_darts_only"]= 1;
    // inv.water["water_plain_free"] = 1;
    // inv.fert["fert_agedama"] = 1;

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
      // ★新しい項目が増えた時の穴埋め
      for(const x of SEEDS)  if(!(x.id in inv.seed))  inv.seed[x.id]=0;
      for(const x of WATERS) if(!(x.id in inv.water)) inv.water[x.id]=0;
      for(const x of FERTS)  if(!(x.id in inv.fert))  inv.fert[x.id]=0;
      return inv;
    }catch(e){
      return defaultInv();
    }
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

  function loadUsedCodes(){
    try{
      const raw = localStorage.getItem(LS_CODES_USED);
      if(!raw) return {};
      const obj = JSON.parse(raw);
      return (obj && typeof obj === "object") ? obj : {};
    }catch(e){ return {}; }
  }
  function saveUsedCodes(obj){
    localStorage.setItem(LS_CODES_USED, JSON.stringify(obj));
  }

  const REDEEM_TABLE = {
    "COLABO-TEST-1": { seed_colabo: 1 },
    "COLABO-TEST-5": { seed_colabo: 5 },
  };

  const defaultPlot  = () => ({ state:"EMPTY" });
  const defaultState = () => ({ ver:1, plots: Array.from({length:MAX_PLOTS}, defaultPlot) });

  function loadState(){
    try{
      const raw = localStorage.getItem(LS_STATE);
      if(!raw) return defaultState();
      const obj = JSON.parse(raw);
      if(!obj || !Array.isArray(obj.plots) || obj.plots.length !== MAX_PLOTS) return defaultState();
      return obj;
    }catch(e){
      return defaultState();
    }
  }
  function saveState(s){ localStorage.setItem(LS_STATE, JSON.stringify(s)); }

  function loadBook(){
    try{
      const raw = localStorage.getItem(LS_BOOK);
      if(!raw) return { ver:1, got:{} };
      const obj = JSON.parse(raw);
      if(!obj || typeof obj.got !== "object") return { ver:1, got:{} };
      return obj;
    }catch(e){
      return { ver:1, got:{} };
    }
  }
  function saveBook(b){ localStorage.setItem(LS_BOOK, JSON.stringify(b)); }

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
  // ★報酬抽選
  // - たこぴ/ショップ/ダーツの「専用タネ」は、必ず専用プールから
  // - その3タネの時は「肥料SP（焼きすぎ/生焼け）」も「水レア率」も無効化
  // =========================================================
  function drawRewardForPlot(p){
    // ★専用タネ群：まず最優先で分岐（100%固定）
    if (p && p.seedId === "seed_special") {
      const c = pick(TAKOPI_SEED_POOL);
      return { id:c.id, name:c.name, img:c.img, rarity:(c.rarity || "N") };
    }
    if (p && p.seedId === "seed_shop_only") {
      const c = pick(SHOP_SEED_POOL);
      return { id:c.id, name:c.name, img:c.img, rarity:(c.rarity || "N") };
    }
    if (p && p.seedId === "seed_darts_only") {
      const c = pick(DARTS_SEED_POOL);
      return { id:c.id, name:c.name, img:c.img, rarity:(c.rarity || "N") };
    }

    // ① 肥料のSP抽選（焼きすぎ / 生焼け）※専用タネ以外だけ
    const fert = FERTS.find(x => x.id === (p ? p.fertId : null));
    if (fert) {
      const burnP = Number(fert.burnCardUp ?? 0);
      if (burnP > 0 && Math.random() < burnP) {
        return { id:"SP-BURN", name:"焼きすぎたカード", img:"https://ul.h3z.jp/VSQupsYH.png", rarity:"SP" };
      }
      const rawP = Number(fert.rawCardChance ?? 0);
      if (rawP > 0 && Math.random() < rawP) {
        return { id:"SP-RAW", name:"ドロドロ生焼けカード", img:"https://ul.h3z.jp/5E5NpGKP.png", rarity:"SP" };
      }
    }

    // ② 通常：水でレア率 → レアのプールから1枚
    const rarity = pickRarityWithWater(p ? p.waterId : null);
    const pool = (CARD_POOLS && CARD_POOLS[rarity]) ? CARD_POOLS[rarity] : (CARD_POOLS?.N || []);
    const c = pick(pool);
    return { id:c.no, name:c.name, img:c.img, rarity };
  }

  function rarityLabel(r){ return r || ""; }

  // =========================================================
  // ★装備（v1.2追加）
  // =========================================================
  function defaultEquip(){
    return {
      ver:1,
      seedId: SEEDS[0]?.id || null,
      waterId: WATERS[0]?.id || null,
      fertId: FERTS[0]?.id || null
    };
  }
  function loadEquip(){
    try{
      const raw = localStorage.getItem(LS_EQUIP);
      if(!raw) return defaultEquip();
      const e = JSON.parse(raw);
      if(!e || typeof e !== "object") return defaultEquip();
      const def = defaultEquip();
      return {
        ver:1,
        seedId: (SEEDS.some(s=>s.id===e.seedId) ? e.seedId : def.seedId),
        waterId:(WATERS.some(w=>w.id===e.waterId) ? e.waterId : def.waterId),
        fertId: (FERTS.some(f=>f.id===e.fertId) ? e.fertId : def.fertId),
      };
    }catch(_e){
      return defaultEquip();
    }
  }
  function saveEquip(e){ localStorage.setItem(LS_EQUIP, JSON.stringify(e)); }

  let equip = loadEquip();

  // =========================================================
  // DOM
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

  const modal  = document.getElementById("modal");
  const mTitle = document.getElementById("mTitle");
  const mBody  = document.getElementById("mBody");
  const mClose = document.getElementById("mClose");

  // 装備バー（HTMLに置いたID：無ければ無視される）
  const btnEquipSeed  = document.getElementById("btnEquipSeed");
  const btnEquipWater = document.getElementById("btnEquipWater");
  const btnEquipFert  = document.getElementById("btnEquipFert");
  const btnGoShop     = document.getElementById("btnGoShop");

  // 装備詳細パネル（常設）
  const equipDetailTitle = document.getElementById("equipDetailTitle");
  const equipDetailBody  = document.getElementById("equipDetailBody");

  // =========================================================
  // data
  // =========================================================
  let state  = loadState();
  let book   = loadBook();
  let inv    = loadInv();

  // v1.1で使っていた「選択→植える」用（残しておく：互換/保険）
  let activeIndex = -1;
  let draft = null;

  // =========================================================
  // モーダル安定化（イベント多重登録を防ぐ）
  // =========================================================
  function onBackdrop(e){ if(e.target === modal) closeModal(); }
  function onEsc(e){ if(e.key === "Escape") closeModal(); }

  function openModal(title, html){
    if(!modal || !mTitle || !mBody) return;

    // まず安全に一旦解除
    modal.removeEventListener("click", onBackdrop);
    document.removeEventListener("keydown", onEsc);

    mTitle.textContent = title;
    mBody.innerHTML = html;
    modal.setAttribute("aria-hidden","false");

    modal.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onEsc);
  }

  function closeModal(){
    if(!modal || !mBody) return;

    modal.setAttribute("aria-hidden","true");
    modal.removeEventListener("click", onBackdrop);
    document.removeEventListener("keydown", onEsc);
    mBody.innerHTML = "";
    activeIndex = -1;
    draft = null;
  }
  if(mClose) mClose.addEventListener("click", closeModal);

  // =========================================================
  // 装備詳細パネル更新（v1.2）
  // =========================================================
  function setEquipDetail(kind){
    if(!equipDetailTitle || !equipDetailBody) return;

    const s = SEEDS.find(x=>x.id===equip.seedId);
    const w = WATERS.find(x=>x.id===equip.waterId);
    const f = FERTS.find(x=>x.id===equip.fertId);

    let item = null;
    let label = "";
    if(kind==="seed"){ item=s; label="🌱 タネ"; }
    else if(kind==="water"){ item=w; label="💧 水"; }
    else if(kind==="fert"){ item=f; label="🧂 肥料"; }
    else {
      // デフォルト：全部まとめ表示
      equipDetailTitle.textContent = "装備中";
      equipDetailBody.innerHTML = `
        <div style="opacity:.9;font-weight:900;margin-bottom:6px;">🌱 ${s?.name||"-"} / 💧 ${w?.name||"-"} / 🧂 ${f?.name||"-"}</div>
        <div style="opacity:.8;line-height:1.5;">
          <div><b>タネ</b>：${(s?.desc||"").replace(/\n/g,"<br>")}</div>
          <div style="margin-top:6px;"><b>水</b>：${(w?.desc||"").replace(/\n/g,"<br>")}</div>
          <div style="margin-top:6px;"><b>肥料</b>：${(f?.desc||"").replace(/\n/g,"<br>")}</div>
        </div>
      `;
      return;
    }

    equipDetailTitle.textContent = `${label}：${item?.name||"-"}`;
    equipDetailBody.innerHTML = `
      <div style="opacity:.9;line-height:1.55;">
        ${(item?.desc||"").replace(/\n/g,"<br>")}
        ${item?.fx ? `<div style="margin-top:6px;">効果：<b>${item.fx}</b></div>` : ``}
      </div>
    `;
  }

  // =========================================================
  // シリアル入力（コラボのタネ）… v1.1の仕様そのまま
  // =========================================================
  function openRedeemModal(){
    openModal("シリアル入力（コラボのタネ）", `
      <div class="step">
        シリアルを入力すると【コラボのタネ】が付与される。<br>
        ※コードは<b>1回のみ</b>使用できる。
      </div>
      <div style="display:flex;gap:10px;">
        <input id="redeemCode" type="text" placeholder="例：COLABO-TEST-1"
          style="flex:1; padding:12px; border-radius:12px; border:1px solid var(--line); background:rgba(255,255,255,.06); color:#fff;">
        <button id="redeemBtn" type="button"
          style="padding:12px 14px; border-radius:12px; border:1px solid var(--line); background:var(--btn2); color:#fff; font-weight:900;">
          使う
        </button>
      </div>
      <div class="row">
        <button type="button" id="redeemClose">戻る</button>
      </div>
    `);

    const redeemClose = document.getElementById("redeemClose");
    if(redeemClose){
      redeemClose.addEventListener("click", () => {
        closeModal();
      });
    }

    const redeemBtn = document.getElementById("redeemBtn");
    if(redeemBtn){
      redeemBtn.addEventListener("click", () => {
        const code = (document.getElementById("redeemCode")?.value || "").trim().toUpperCase();
        if(!code){ alert("コードを入力してね"); return; }

        const used = loadUsedCodes();
        if(used[code]){ alert("このコードは使用済み。"); return; }

        const payload = REDEEM_TABLE[code];
        if(!payload){ alert("無効なコードです。"); return; }

        inv = loadInv();
        if(payload.seed_colabo){
          invAdd(inv, "seed", "seed_colabo", Number(payload.seed_colabo) || 0);
        }
        saveInv(inv);

        used[code] = { at: Date.now(), payload };
        saveUsedCodes(used);

        alert(`成功！【コラボのタネ】×${payload.seed_colabo || 0} を付与した。`);
        closeModal();
        render();
      });
    }
  }

  // =========================================================
  // ★装備グリッド（v1.2）
  // - グリッドは短文：画像+名前+在庫+効果タグ
  // - 長文説明は「装備詳細パネル」に出す
  // =========================================================
  function openEquipGrid(kind){
  inv = loadInv();
  equip = loadEquip();

  const isSeed = kind==="seed";
  const isWater= kind==="water";
  const isFert = kind==="fert";

  const items = isSeed ? SEEDS : isWater ? WATERS : FERTS;
  const invType = kind; // "seed" | "water" | "fert"
  const title = isSeed ? "🌱 タネ装備（SHOP）" : isWater ? "💧 水装備（SHOP）" : "🧂 肥料装備（SHOP）";
  const currentId = isSeed ? equip.seedId : isWater ? equip.waterId : equip.fertId;

  // ちょい厨二の店主ボイス（ワクワク演出）
  const shopLine =
    isSeed  ? "……そのタネ、今夜なにを孵す？"
  : isWater ? "……水は正直だ。確率の顔が変わる。"
  :          "……肥料は近道。だが、副作用もある。";

  const cards = items.map(x=>{
    const cnt = invGet(inv, invType, x.id);
    const disabled = (cnt <= 0);
    const selected = (x.id === currentId);

    // 小さいタグ（効果）を短く
    const fx = (x.fx || "").toString();
    const fxShort = fx.length > 10 ? fx.slice(0,10)+"…" : fx;

    // 在庫0の時の札
    const sold = disabled ? `<div class="shop-sold">SOLD</div>` : "";

    // 選択中の札
    const eq = selected ? `<div class="shop-eq">装備中</div>` : "";

    return `
      <button type="button"
        class="shop-card ${selected ? "isSel":""}"
        data-kind="${kind}"
        data-pick="${x.id}"
        ${disabled ? "disabled":""}
        aria-label="${x.name}">
        <div class="shop-thumb">
          <img src="${x.img}" alt="${x.name}">
          ${sold}
          ${eq}
          <div class="shop-count">×${cnt}</div>
        </div>

        <div class="shop-meta">
          <div class="shop-name">${x.name}</div>
          <div class="shop-fx">${fxShort}</div>
        </div>
      </button>
    `;
  }).join("");

  const extra = isSeed ? `
    <div class="shop-actions">
      <button type="button" class="shop-btn shop-btn--ticket" id="btnRedeem">
        🎫 シリアル入力（コラボ）
      </button>
      <button type="button" class="shop-btn" id="btnCloseEquip">戻る</button>
    </div>
  ` : `
    <div class="shop-actions">
      <button type="button" class="shop-btn" id="btnCloseEquip">戻る</button>
    </div>
  `;

  openModal(title, `
    <div class="shop-wrap">
      <div class="shop-sign">
        <div class="shop-sign__title">装備を選べ</div>
        <div class="shop-sign__sub">${shopLine}</div>
      </div>

      <div class="shop-grid">
        ${cards}
      </div>

      <div class="shop-owner">
        <div class="shop-owner__face">店主</div>
        <div class="shop-owner__msg">
          「<b>${isSeed?"タネ":"アイテム"}</b>は“気配”だ。<br>
          迷ったら <b>画像が強そう</b> なのを選べ。」
        </div>
      </div>

      ${extra}
    </div>
  `);

  const closeBtn = document.getElementById("btnCloseEquip");
  if(closeBtn) closeBtn.addEventListener("click", closeModal);

  if(isSeed){
    const redeemBtn = document.getElementById("btnRedeem");
    if(redeemBtn) redeemBtn.addEventListener("click", openRedeemModal);
  }

  // クリックで即装備
  if(mBody){
    mBody.querySelectorAll("button[data-pick]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        if(btn.disabled) return;
        const id = btn.getAttribute("data-pick");
        if(!id) return;

        if(isSeed) equip.seedId = id;
        else if(isWater) equip.waterId = id;
        else if(isFert) equip.fertId = id;

        saveEquip(equip);

        // 装備の気持ちよさ：即「装備した！」演出（短い）
        const picked = items.find(it=>it.id===id);
        closeModal();

        openModal("装備完了", `
          <div class="reward">
            <div class="big">装備した！</div>
            <div class="mini"><b>${picked?.name || id}</b></div>
            <img class="img" src="${picked?.img || ""}" alt="">
          </div>
          <div class="row">
            <button type="button" class="primary" id="btnOkEq">OK</button>
          </div>
        `);

        const ok = document.getElementById("btnOkEq");
        if(ok){
          ok.addEventListener("click", ()=>{
            closeModal();
            setEquipDetail(kind);
            render();
          });
        }
      });
    });
  }
}


  function shortName(name){
    if(!name) return "-";
    return name.length > 10 ? name.slice(0,10) + "…" : name;
  }

  // =========================================================
  // 図鑑追加（v1.1そのまま）
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

    book = b;
    saveBook(book);
  }

  // =========================================================
  // ★ワンタップ植え（装備中3点セットで即植え）
  // =========================================================
  function plantAt(index){
    inv = loadInv();
    equip = loadEquip();

    const seedId  = equip.seedId;
    const waterId = equip.waterId;
    const fertId  = equip.fertId;

    const okSeed  = invGet(inv, "seed",  seedId)  > 0;
    const okWater = invGet(inv, "water", waterId) > 0;
    const okFert  = invGet(inv, "fert",  fertId)  > 0;

    if(!okSeed || !okWater || !okFert){
      const miss = [
        !okSeed ? "タネ" : null,
        !okWater ? "水" : null,
        !okFert ? "肥料" : null,
      ].filter(Boolean).join(" / ");

      openModal("在庫不足", `
        <div class="step">植えるには在庫が足りない：<b>${miss}</b></div>
        <div class="row">
          <button type="button" id="btnGoShop2">🛒 ショップへ</button>
          <button type="button" class="primary" id="btnClose2">閉じる</button>
        </div>
      `);

      const go = document.getElementById("btnGoShop2");
      const cl = document.getElementById("btnClose2");
      if(go) go.addEventListener("click", ()=>{ location.href = SHOP_URL; });
      if(cl) cl.addEventListener("click", closeModal);
      return;
    }

    // 消費
    invDec(inv, "seed", seedId);
    invDec(inv, "water", waterId);
    invDec(inv, "fert", fertId);
    saveInv(inv);

    const seed  = SEEDS.find(x=>x.id===seedId);
    const water = WATERS.find(x=>x.id===waterId);
    const fert  = FERTS.find(x=>x.id===fertId);

    const factor = clamp(
      (seed?.factor ?? 1) * (water?.factor ?? 1) * (fert?.factor ?? 1),
      0.35, 1.0
    );

    // 最短1時間
    const growMs = Math.max(Math.floor(BASE_GROW_MS * factor), 60*60*1000);
    const now = Date.now();

    const srHint =
      (waterId === "water_overdo" && fertId === "fert_timeno") ? "SR100" :
      (waterId === "water_overdo") ? "SR65" :
      "NONE";

    state.plots[index] = {
      state: "GROW",
      seedId, waterId, fertId,
      startAt: now,
      readyAt: now + growMs,
      srHint
    };
    saveState(state);

    setEquipDetail();
    render();
  }

  // =========================================================
  // v1.1の「横スライドで選ぶ」機構（残し：互換/保険）
  // ※装備式UIがある場合は通常使わない
  // =========================================================
  function cardSlider(items, onSelectId, invType){
    inv = loadInv();

    const list = items.map(x => {
      const cnt = invGet(inv, invType, x.id);
      const cntLabel = String(cnt);
      const disabled = (cnt <= 0);

      const isColaboSeed = (invType === "seed" && x.id === "seed_colabo");

      return `
        <div class="c">
          <div class="imgbox" style="position:relative;">
            <img src="${x.img}" alt="${x.name}">
            <div class="cntBadge">×${cntLabel}</div>
          </div>
          <div class="name">${x.name}</div>
          <div class="desc">${(x.desc || "").replace(/\n/g,"<br>")}</div>
          <div class="fx">${x.fx ? `効果：<b>${x.fx}</b>` : ""}</div>

          ${isColaboSeed ? `<button type="button" data-redeem="1">シリアル入力</button>` : ``}

          <button type="button" data-pick="${x.id}" ${disabled ? "disabled" : ""}>
            ${disabled ? "在庫なし" : "これにする"}
          </button>
        </div>
      `;
    }).join("");

    openModal("選択", `
      <div class="step">※すべて在庫制。露店で買って増やす。</div>
      <div class="cards">${list}</div>
      <div class="row">
        <button type="button" id="btnBackStep">戻る</button>
        <button type="button" id="btnCloseStep">閉じる</button>
      </div>
    `);

    if(mBody){
      mBody.querySelectorAll("button[data-pick]").forEach(btn=>{
        btn.addEventListener("click", () => {
          if(btn.disabled) return;
          onSelectId(btn.getAttribute("data-pick"));
        });
      });

      const redeemBtn = mBody.querySelector("button[data-redeem]");
      if (redeemBtn) redeemBtn.addEventListener("click", openRedeemModal);
    }

    const back = document.getElementById("btnBackStep");
    const close = document.getElementById("btnCloseStep");

    return {
      setTitle(t){ if(mTitle) mTitle.textContent = t; },
      onBack(fn){ if(back) back.addEventListener("click", fn); },
      onClose(){ if(close) close.addEventListener("click", closeModal); },
    };
  }

  function showSeedStep(){
    const ui = cardSlider(SEEDS, (id) => { draft.seedId = id; showWaterStep(); }, "seed");
    ui.setTitle("種を選ぶ");
    ui.onBack(() => closeModal());
    ui.onClose();
  }

  function showWaterStep(){
    const ui = cardSlider(WATERS, (id) => { draft.waterId = id; showFertStep(); }, "water");
    ui.setTitle("水を選ぶ");
    ui.onBack(() => showSeedStep());
    ui.onClose();
  }

  function showFertStep(){
    const ui = cardSlider(FERTS, (id) => { draft.fertId = id; confirmPlant(); }, "fert");
    ui.setTitle("肥料を選ぶ");
    ui.onBack(() => showWaterStep());
    ui.onClose();
  }

  function confirmPlant(){
    const seed  = SEEDS.find(x=>x.id===draft.seedId);
    const water = WATERS.find(x=>x.id===draft.waterId);
    const fert  = FERTS.find(x=>x.id===draft.fertId);

    const factor = clamp(
      (seed?.factor ?? 1) * (water?.factor ?? 1) * (fert?.factor ?? 1),
      0.35, 1.0
    );

    // 最短1時間
    const growMs = Math.max(Math.floor(BASE_GROW_MS * factor), 60*60*1000);
    const now = Date.now();

    openModal("植える確認", `
      <div class="step">この内容で植える？（収穫まで約 <b>${fmtRemain(growMs)}</b>）</div>
      <div class="reward">
        <div class="big">選択</div>
        <div class="mini">
          種：${seed?.name || "-"}<br>
          水：${water?.name || "-"}<br>
          肥料：${fert?.name || "-"}<br><br>
          時短係数：<b>${factor.toFixed(2)}</b>
        </div>
      </div>
      <div class="row">
        <button type="button" id="btnRe">選び直す</button>
        <button type="button" class="primary" id="btnPlant">植える</button>
      </div>
    `);

    const re = document.getElementById("btnRe");
    const plant = document.getElementById("btnPlant");

    if(re) re.addEventListener("click", showSeedStep);

    if(plant){
      plant.addEventListener("click", () => {
        inv = loadInv();

        const okSeed  = invGet(inv, "seed",  draft.seedId)  > 0;
        const okWater = invGet(inv, "water", draft.waterId) > 0;
        const okFert  = invGet(inv, "fert",  draft.fertId)  > 0;

        if(!okSeed || !okWater || !okFert){
          openModal("在庫が足りない", `
            <div class="step">所持数が足りないため植えられない。</div>
            <div class="row"><button type="button" id="btnOk">OK</button></div>
          `);
          const ok = document.getElementById("btnOk");
          if(ok){
            ok.addEventListener("click", () => {
              closeModal();
              showSeedStep();
            });
          }
          return;
        }

        invDec(inv, "seed",  draft.seedId);
        invDec(inv, "water", draft.waterId);
        invDec(inv, "fert",  draft.fertId);
        saveInv(inv);

        const srHint =
          (draft.waterId === "water_overdo" && draft.fertId === "fert_timeno") ? "SR100" :
          (draft.waterId === "water_overdo") ? "SR65" :
          "NONE";

        const p = {
          state: "GROW",
          seedId: draft.seedId,
          waterId: draft.waterId,
          fertId: draft.fertId,
          startAt: now,
          readyAt: now + growMs,
          srHint
        };

        state.plots[activeIndex] = p;
        saveState(state);
        closeModal();
        render();
      });
    }
  }

  // =========================================================
  // 盤面タップ（v1.1保持 + v1.2のワンタップ植え）
  // =========================================================
  function onPlotTap(i){
    player = loadPlayer();
    equip = loadEquip();

    if (i >= player.unlocked) {
      openModal("ロック中", `
        <div class="step">このマスはまだ使えない。<br>収穫でXPを稼いで <b>Lvアップ</b> すると解放される。</div>
        <div class="row"><button type="button" id="btnOk">OK</button></div>
      `);
      const ok = document.getElementById("btnOk");
      if(ok) ok.addEventListener("click", closeModal);
      return;
    }

    const p = state.plots[i] || defaultPlot();

    // ★EMPTYは装備で即植え（v1.2）
    if (p.state === "EMPTY") {
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
            肥料：${fert?fert.name:"-"}
          </div>
        </div>
        <div class="row"><button type="button" id="btnOk">OK</button></div>
      `);
      const ok = document.getElementById("btnOk");
      if(ok) ok.addEventListener("click", closeModal);
      return;
    }

    if (p.state === "READY") {
      if (!p.reward) {
        p.reward = drawRewardForPlot(p);
        saveState(state);
      }
      const reward = p.reward;

      openModal("収穫！", `
        <div class="step">収穫したカードを確認してから図鑑に登録する。</div>
        <div class="reward">
          <div class="big">${reward.name}（${reward.id}）</div>
          <div class="mini">レア：<b>${rarityLabel(reward.rarity)}</b><br>確認ボタンを押すと図鑑に追加され、このマスは空になる。</div>
          <img class="img" src="${reward.img}" alt="${reward.name}">
        </div>
        <div class="row">
          <button type="button" id="btnCancel">閉じる</button>
          <button type="button" class="primary" id="btnConfirm">確認して図鑑へ</button>
        </div>
      `);

      const cancel = document.getElementById("btnCancel");
      const confirm = document.getElementById("btnConfirm");

      if(cancel) cancel.addEventListener("click", closeModal);

      if(confirm){
        confirm.addEventListener("click", () => {
          addToBook(reward);

          const gain = XP_BY_RARITY[reward.rarity] ?? 4; // SPや未定義は4
          addXP(gain);

          state.plots[i] = defaultPlot();
          saveState(state);

          closeModal();
          location.href = "./zukan.html";
        });
      }
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
      const back = document.getElementById("btnBack");
      const clear = document.getElementById("btnClear");

      if(back) back.addEventListener("click", closeModal);
      if(clear){
        clear.addEventListener("click", () => {
          state.plots[i] = defaultPlot();
          saveState(state);
          closeModal();
          render();
        });
      }
      return;
    }
  }

  // =========================================================
  // render（v1.1保持 + v1.2の装備バー/詳細更新）
  // =========================================================
  function render(){
    // 最新ロード
    player = loadPlayer();
    book = loadBook();
    inv = loadInv();
    equip = loadEquip();

    if(!farmEl) return;

    farmEl.innerHTML = "";
    let grow = 0, ready = 0, burn = 0;

    for(let i=0;i<MAX_PLOTS;i++){
      const p = state.plots[i] || defaultPlot();

      const d = document.createElement("div");
      d.className = "plot";

      const locked = (i >= player.unlocked);
      d.dataset.state = locked ? "LOCK" : (p.state || "EMPTY");

      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.i = String(i);

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

        if (progress < 0.5) {
          img = PLOT_IMG.GROW1;
        } else {
          if (p.srHint === "SR100") img = PLOT_IMG.GROW2_SR100;
          else if (p.srHint === "SR65") img = PLOT_IMG.GROW2_SR65;
          else img = PLOT_IMG.GROW2;
        }

        label = `育成中 ${fmtRemain(remain)}`;
        const b = document.createElement("div");
        b.className = "badge warn";
        b.textContent = "GROW";
        d.appendChild(b);

      } else if (p.state === "READY") {
        ready++;
        img = PLOT_IMG.READY;
        label = "収穫";
        const b = document.createElement("div");
        b.className = "badge good";
        b.textContent = "READY";
        d.appendChild(b);

        const fx = document.createElement("div");
        fx.className = "plot-fx plot-fx--mild";
        d.appendChild(fx);

      } else if (p.state === "BURN") {
        burn++;
        img = PLOT_IMG.BURN;
        label = "焦げ";
        const b = document.createElement("div");
        b.className = "badge bad";
        b.textContent = "BURN";
        d.appendChild(b);
      } else {
        // EMPTY
        label = "タップで植える";
      }

      btn.innerHTML = `
        <img src="${img}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:14px;display:block;">
        <div class="tag" style="position:absolute; bottom:6px; left:0; right:0;text-align:center; font-size:11px; font-weight:900; color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.6); pointer-events:none;">${label}</div>
      `;
      btn.addEventListener("click", () => onPlotTap(i));
      d.appendChild(btn);
      farmEl.appendChild(d);
    }

    if(stGrow)  stGrow.textContent  = String(grow);
    if(stReady) stReady.textContent = String(ready);
    if(stBurn)  stBurn.textContent  = String(burn);
    if(stBook)  stBook.textContent  = String(Object.keys((book && book.got) ? book.got : {}).length);

    if(stLevel)  stLevel.textContent  = String(player.level);
    if(stXP)     stXP.textContent     = String(player.xp);
    if(stUnlock) stUnlock.textContent = String(player.unlocked);

    const need = xpNeedForLevel(player.level);
    const now  = player.xp;
    const left = Math.max(0, need - now);
    const pct  = Math.max(0, Math.min(100, Math.floor((now / need) * 100)));

    if(stXpLeft) stXpLeft.textContent = String(left);
    if(stXpNeed) stXpNeed.textContent = String(need);
    if(stXpBar)  stXpBar.style.width  = pct + "%";

    const stXpNow = document.getElementById("stXpNow");
    if (stXpNow) stXpNow.textContent = String(now);

    // ★装備バー表示
    const s = SEEDS.find(x=>x.id===equip.seedId);
    const w = WATERS.find(x=>x.id===equip.waterId);
    const f = FERTS.find(x=>x.id===equip.fertId);

    if(btnEquipSeed)  btnEquipSeed.textContent  = `🌱 ${shortName(s?.name)}`;
    if(btnEquipWater) btnEquipWater.textContent = `💧 ${shortName(w?.name)}`;
    if(btnEquipFert)  btnEquipFert.textContent  = `🧂 ${shortName(f?.name)}`;

    // ★装備詳細更新
    setEquipDetail();
  }

  // =========================================================
  // tick（v1.1そのまま）
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

  // =========================================================
  // 装備バーのイベント（v1.2）
  // =========================================================
  if(btnEquipSeed)  btnEquipSeed.addEventListener("click", ()=> openEquipGrid("seed"));
  if(btnEquipWater) btnEquipWater.addEventListener("click", ()=> openEquipGrid("water"));
  if(btnEquipFert)  btnEquipFert.addEventListener("click", ()=> openEquipGrid("fert"));
  if(btnGoShop)     btnGoShop.addEventListener("click", ()=> location.href = SHOP_URL);

  // =========================================================
  // リセット（v1.1保持 + 装備キーも消す）
  // =========================================================
  const btnReset = document.getElementById("btnReset");
  if(btnReset){
    btnReset.addEventListener("click", () => {
      if(!confirm("畑・図鑑・レベル(XP)・在庫・シリアル使用済み・装備を全消去します。OK？")) return;

      localStorage.removeItem(LS_STATE);
      localStorage.removeItem(LS_BOOK);
      localStorage.removeItem(LS_PLAYER);
      localStorage.removeItem(LS_INV);
      localStorage.removeItem(LS_CODES_USED);
      localStorage.removeItem(LS_EQUIP);

      state = loadState();
      book = loadBook();
      player = loadPlayer();
      inv = loadInv();
      equip = loadEquip();
      saveEquip(equip);

      render();
    });
  }

  // =========================================================
  // 初期化
  // =========================================================
  // 初回の安定用（装備が無い場合に保存）
  saveEquip(loadEquip());

  render();
  setInterval(tick, TICK_MS);

})();


