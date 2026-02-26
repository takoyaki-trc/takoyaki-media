/* takofarm2.js（テスト用：開設記念シリアル “anniv” フル対応版）
   ✅ これ1本で完結するようにしてある：
   - farm2.htmlの #serialBtn からシリアル入力UIを出す
   - redeem → seed_tokens を localStorage(tf_v1_seedtokens) に保存
   - seed_anniv は invではなく token 回数で管理
   - 植える時：token消費 → GASへ plant（失敗したら戻す）
   - 収穫時：GASへ harvest → result.card_id を受け取り → 画像/レアに変換
*/

(() => {
  "use strict";

  // =========================
  // ✅ GAS WebアプリURL（redeem と同じ URL）
  // =========================
  const SERIAL_API_URL = "https://script.google.com/macros/s/AKfycbwXJXFLCgL7ZMgb7M1hHwfKI6vBPicWgf0yutF5qyo9fkLrGH393zSoA20sRqk7PO71/exec";

  // ✅ GAS側で apiKey を要求しているので必須
  const SERIAL_API_KEY = "takopi-gratan-2026";

  // =========================
  // マス画像（状態ごと）
  // =========================
  const PLOT_IMG = {
    EMPTY: "https://ul.h3z.jp/muPEAkao.png",
    GROW1: "https://ul.h3z.jp/BrHRk8C4.png",
    GROW2: "https://ul.h3z.jp/tD4LUB6F.png",
    COLABO_GROW1: "https://ul.h3z.jp/cq1soJdm.gif",
    COLABO_GROW2: "https://ul.h3z.jp/I6Iu4J32.gif",
    READY: "https://ul.h3z.jp/AmlnQA1b.png",
    BURN:  "https://ul.h3z.jp/q9hxngx6.png",
    GROW2_SR65:  "https://ul.h3z.jp/HfpFoeBk.png",
    GROW2_SR100: "https://ul.h3z.jp/tBVUoc8w.png"
  };

  // =========================
  // LocalStorage Keys
  // =========================
  const LS_STATE   = "tf_v1_state";
  const LS_BOOK    = "tf_v1_book";
  const LS_PLAYER  = "tf_v1_player";
  const LS_INV     = "tf_v1_inv";
  const LS_LOADOUT = "tf_v1_loadout";
  const LS_OCTO    = "roten_v1_octo";

  // ✅ シリアル種のトークン保管（rewardごとに配列で保持）
  const LS_SEEDTOKENS = "tf_v1_seedtokens";

  // 育成時間など
  const BASE_GROW_MS = 5 * 60 * 60 * 1000;
  const READY_TO_BURN_MS = 24 * 60 * 60 * 1000;
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
  // ★タネ一覧（seed_anniv を追加）
  // =========================================================
  const SEEDS = [
    { id:"seed_random", name:"なに出るタネ", desc:"何が育つかは完全ランダム。\n店主も知らない。", factor:1.00, img:"https://ul.h3z.jp/gnyvP580.png", fx:"完全ランダム" },
    { id:"seed_shop",   name:"店頭タネ",     desc:"店で生まれたタネ。\n店頭ナンバーを宿している。", factor:1.00, img:"https://ul.h3z.jp/IjvuhWoY.png", fx:"店頭の気配" },
    { id:"seed_line",   name:"回線タネ",     desc:"画面の向こうから届いたタネ。\nクリックすると芽が出る。", factor:1.00, img:"https://ul.h3z.jp/AonxB5x7.png", fx:"回線由来" },
    { id:"seed_special",name:"たこぴのタネ", desc:"このタネを植えたら、\n必ず「たこぴ8枚」から出る。", factor:1.00, img:"https://ul.h3z.jp/29OsEvjf.png", fx:"たこぴ専用8枚" },
    { id:"seed_bussasari", name:"ブッ刺さりタネ", desc:"刺さるのは心だけ。\n出るのは5枚だけ（全部N）。", factor:1.05, img:"https://ul.h3z.jp/MjWkTaU3.png", fx:"刺さり固定5枚" },
    { id:"seed_namara_kawasar", name:"なまら買わさるタネ", desc:"気付いたら買ってる。\n12枚固定（内訳：LR/UR/SR/R/N）。", factor:1.08, img:"https://ul.h3z.jp/yiqHzfi0.png", fx:"買わさり固定12枚" },
    { id:"seed_colabo", name:"コラボ【ぐらたんのタネ】", desc:"2種類だけ。\n稀にLR / 基本はN", factor:1.00, img:"https://ul.h3z.jp/wbnwoTzm.png", fx:"露店で入手" },

    // ✅ 開設記念（シリアル専用）
    {
      id:"seed_anniv",
      name:"開設記念のタネ",
      desc:"ホームページ開設を祝う特別なタネ。\n特別カードが育つ。",
      factor:1.00,
      img:"https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/anniversary/anv1.png",
      fx:"記念イベント専用（シリアル）"
    },
  ];

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

  // =========================
  // 開設記念：card_id → 画像/レア対応
  // =========================
  const ANNIV_CARD_MAP = {
    "ANN-N-001":  { name:"開設記念 N",  rarity:"N",  img:"assets/images/anniversary/1.png"  },
    "ANN-R-001":  { name:"開設記念 R",  rarity:"R",  img:"assets/images/anniversary/2.png"  },
    "ANN-SR-001": { name:"開設記念 SR", rarity:"SR", img:"assets/images/anniversary/3.png"  },
    "ANN-UR-001": { name:"開設記念 UR", rarity:"UR", img:"assets/images/anniversary/4a.jpg" },
    "ANN-LR-001": { name:"開設記念 LR", rarity:"LR", img:"assets/images/anniversary/4b.jpg" },
  };
  function cardFromCardId(cardId){
    if(ANNIV_CARD_MAP[cardId]){
      const c = ANNIV_CARD_MAP[cardId];
      return { id: cardId, name: c.name, img: c.img, rarity: c.rarity };
    }
    return { id: String(cardId||"UNKNOWN"), name: String(cardId||"UNKNOWN"), img: PLOT_IMG.EMPTY, rarity:"" };
  }

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
  // 在庫（inv）
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
  // ✅ シリアル seed_token 管理
  // tokens[reward] = ["SEED-...","SEED-..."]
  // =========================================================
  function defaultSeedTokens(){ return { ver:1, tokens:{} }; }
  function loadSeedTokens(){
    try{
      const raw = localStorage.getItem(LS_SEEDTOKENS);
      if(!raw) return defaultSeedTokens();
      const obj = JSON.parse(raw);
      if(!obj || typeof obj !== "object") return defaultSeedTokens();
      obj.tokens = obj.tokens || {};
      return obj;
    }catch(e){ return defaultSeedTokens(); }
  }
  function saveSeedTokens(x){ localStorage.setItem(LS_SEEDTOKENS, JSON.stringify(x)); }

  function tokenCount(reward){
    const st = loadSeedTokens();
    const arr = st.tokens[reward] || [];
    return Array.isArray(arr) ? arr.length : 0;
  }
  function addTokens(reward, tokens){
    const st = loadSeedTokens();
    const cur = Array.isArray(st.tokens[reward]) ? st.tokens[reward] : [];
    const add = Array.isArray(tokens) ? tokens.filter(Boolean).map(String) : [];
    st.tokens[reward] = cur.concat(add);
    saveSeedTokens(st);
  }
  function consumeToken(reward){
    const st = loadSeedTokens();
    const arr = st.tokens[reward] || [];
    if(!Array.isArray(arr) || !arr.length) return null;
    const t = arr.shift();
    st.tokens[reward] = arr;
    saveSeedTokens(st);
    return t;
  }
  function unconsumeToken(reward, token){
    if(!token) return;
    const st = loadSeedTokens();
    const arr = st.tokens[reward] || [];
    const next = Array.isArray(arr) ? arr : [];
    next.unshift(String(token));
    st.tokens[reward] = next;
    saveSeedTokens(st);
  }

  // =========================================================
  // オクト
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

  // =========================================================
  // ✅ GAS 呼び出し（apiKey込みで統一）
  // =========================================================
  async function callSerial(action, payload){
    const res = await fetch(SERIAL_API_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ apiKey: SERIAL_API_KEY, action, ...payload })
    });
    return await res.json();
  }

  // =========================================================
  // 水だけでレアが決まる（通常種）
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
  // 種でTN範囲制限（元のまま）
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
  // 通常報酬抽選
  // =========================================================
  function drawRewardForPlot(p){
    // ✅ seed_anniv はここでは抽選しない（GAS確定）
    if (p && p.seedId === "seed_anniv") return null;

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

  // =========================================================
  // State / Book / Loadout
  // =========================================================
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

  function defaultLoadout(){ return { ver:1, seedId:null, waterId:null, fertId:null }; }
  function loadLoadout(){
    try{
      const raw = localStorage.getItem(LS_LOADOUT);
      if(!raw) return defaultLoadout();
      const obj = JSON.parse(raw);
      if(!obj || typeof obj !== "object") return defaultLoadout();
      return { ver:1, seedId: obj.seedId || null, waterId: obj.waterId || null, fertId: obj.fertId || null };
    }catch(e){ return defaultLoadout(); }
  }
  function saveLoadout(l){ localStorage.setItem(LS_LOADOUT, JSON.stringify(l)); }

  let state  = loadState();
  let book   = loadBook();
  let inv    = loadInv();
  let loadout = loadLoadout();

  // =========================
  // DOM
  // =========================
  const farmEl   = document.getElementById("farm");
  const stBookEl = document.getElementById("stBook");
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

  const serialBtn = document.getElementById("serialBtn");

  // 必須チェック
  const __missing = [];
  if(!farmEl) __missing.push("#farm");
  if(!modal) __missing.push("#modal");
  if(!mTitle) __missing.push("#mTitle");
  if(!mBody) __missing.push("#mBody");
  if(!mClose) __missing.push("#mClose");
  if(!equipSeedBtn) __missing.push("#equipSeed");
  if(!equipWaterBtn) __missing.push("#equipWater");
  if(!equipFertBtn) __missing.push("#equipFert");
  if(!serialBtn) __missing.push("#serialBtn");
  if(__missing.length){
    console.error("❌ 必須DOMが見つからない:", __missing.join(", "));
    alert("HTMLに必須IDが足りません: " + __missing.join(", "));
    return;
  }

  // =========================================================
  // Modal（あなたのロック版を簡略維持）
  // =========================================================
  let __harvestCommitFn = null;
  function setHarvestCommit(fn){ __harvestCommitFn = (typeof fn === "function") ? fn : null; }
  function clearHarvestCommit(){ __harvestCommitFn = null; }

  function openModal(title, html){
    mTitle.textContent = title;
    mBody.innerHTML = html;
    modal.setAttribute("aria-hidden","false");
  }
  function closeModal(){
    modal.setAttribute("aria-hidden","true");
    mBody.innerHTML = "";
    clearHarvestCommit();
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
  // ✅ redeem UI（ここが「最初から入れるべきだった保存処理」）
  // =========================================================
  async function doRedeemFlow(code){
    const c = String(code || "").trim();
    if(!c) throw new Error("EMPTY_CODE");

    const r = await callSerial("redeem", { code: c });
    if(!r || !r.ok) throw new Error((r && r.error) ? r.error : "REDEEM_FAILED");

    const reward = String(r.reward || "");
    const tokens = Array.isArray(r.seed_tokens) ? r.seed_tokens : [];

    // ✅ ここで localStorage(tf_v1_seedtokens) に保存
    addTokens(reward, tokens);

    return { reward, amount: Number(r.amount || tokens.length || 0), added: tokens.length };
  }

  function openRedeemModal(){
    openModal("シリアル入力", `
      <div class="step">
        ✅ 開設記念なら <b>anniv</b> が付いたコードを入れる。<br>
        反映されたら「開設記念のタネ」の × が増える。
      </div>
      <div style="display:flex;gap:10px;align-items:center;margin-top:10px;">
        <input id="serialInput" type="text" placeholder="シリアルコード" style="flex:1;padding:12px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.25);color:#fff;outline:none;">
        <button id="serialGo" type="button" class="primary">送信</button>
      </div>
      <div id="serialMsg" style="margin-top:10px;font-size:13px;opacity:.9;"></div>
      <div class="row" style="margin-top:12px;">
        <button type="button" id="serialClose">閉じる</button>
      </div>
    `);

    const input = document.getElementById("serialInput");
    const msg   = document.getElementById("serialMsg");
    const go    = document.getElementById("serialGo");
    const cls   = document.getElementById("serialClose");

    const run = async () => {
      go.disabled = true;
      msg.textContent = "通信中…";
      try{
        const res = await doRedeemFlow(input.value);
        msg.innerHTML = `✅ 追加完了：<b>${res.reward}</b> ×${res.added}<br>（合計：${tokenCount(res.reward)}）`;
        render(); // ✅ 表示更新
      }catch(e){
        msg.textContent = "❌ 失敗: " + (e && e.message ? e.message : String(e));
      }finally{
        go.disabled = false;
      }
    };

    go.addEventListener("click", run);
    input.addEventListener("keydown", (e)=>{ if(e.key==="Enter") run(); });
    cls.addEventListener("click", closeModal);
    input.focus();
  }

  serialBtn.addEventListener("click", openRedeemModal);

  // =========================================================
  // ✅ 装備表示更新（seed_anniv は token 数）
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
      const cnt = (seed.id === "seed_anniv") ? tokenCount("anniv") : invGet(inv,"seed",seed.id);
      equipSeedCnt.textContent = `×${cnt}`;
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
  // グリッド選択UI
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
      if(isSeed && x.id === "seed_anniv") cnt = tokenCount("anniv");

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
      <div class="step">装備は消費しない（植えた時に消費）。<br>
      ※<b>開設記念のタネ</b>はシリアルの <b>seed_token</b> 回数。</div>
      <div class="gridWrap">${cells}</div>
      <div class="row"><button type="button" id="gridClose">閉じる</button></div>
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
    player = loadPlayer();
    book = loadBook();
    state = loadState();

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
        btn.innerHTML = `
          <img src="${PLOT_IMG.EMPTY}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:14px;display:block;opacity:.55;">
          <div class="tag" style="position:absolute;bottom:6px;left:0;right:0;text-align:center;font-size:11px;font-weight:900;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.6);pointer-events:none;">ロック</div>
        `;
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

        img = (progress < 0.5) ? PLOT_IMG.GROW1 : PLOT_IMG.GROW2;
        label = `育成中 ${fmtRemain(remain)}`;
      } else if (p.state === "READY") {
        ready++;
        img = PLOT_IMG.READY;
        label = "収穫";
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

    // ステータス
    stGrow.textContent  = String(grow);
    stReady.textContent = String(ready);
    stBurn.textContent  = String(burn);
    stBookEl.textContent  = String(Object.keys((book && book.got) ? book.got : {}).length);

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
  // ワンタップ植え
  // =========================================================
  function ensureLoadoutOrOpen(){
    loadout = loadLoadout();
    if(!loadout.seedId){ openPickGrid("seed"); return false; }
    if(!loadout.waterId){ openPickGrid("water"); return false; }
    if(!loadout.fertId){ openPickGrid("fert"); return false; }
    return true;
  }

  async function plantAt(index){
    inv = loadInv();
    loadout = loadLoadout();

    const seedId  = loadout.seedId;
    const waterId = loadout.waterId;
    const fertId  = loadout.fertId;

    // ✅ anniv は token
    let seedToken = null;
    if(seedId === "seed_anniv"){
      seedToken = consumeToken("anniv");
      if(!seedToken){
        openModal("在庫が足りない", `
          <div class="step"><b>開設記念のタネ</b>の seed_token がありません。<br>先に「シリアル」からredeemしてください。</div>
          <div class="row"><button type="button" id="btnOk" class="primary">OK</button></div>
        `);
        document.getElementById("btnOk").addEventListener("click", closeModal);
        return;
      }
    }

    const okSeed  = (seedId === "seed_anniv") ? true : (invGet(inv, "seed",  seedId)  > 0);
    const okWater = invGet(inv, "water", waterId) > 0;
    const okFert  = invGet(inv, "fert",  fertId)  > 0;

    if(!okSeed || !okWater || !okFert){
      if(seedId === "seed_anniv") unconsumeToken("anniv", seedToken);

      openModal("在庫が足りない", `
        <div class="step">在庫が足りないため植えられない。装備を変えるか露店で増やしてね。</div>
        <div class="row"><button type="button" id="btnOk" class="primary">OK</button></div>
      `);
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

    // ✅ inv消費（anniv のseed自体は減らさない）
    if(seedId !== "seed_anniv"){
      invDec(inv, "seed", seedId);
    }
    invDec(inv, "water", waterId);
    invDec(inv, "fert",  fertId);
    saveInv(inv);

    const plot = {
      state: "GROW",
      seedId,
      waterId,
      fertId,
      startAt: now,
      readyAt: now + growMs,
      fixedRarity: (seedId === "seed_anniv") ? null : pickRarityWithWater(waterId),
      seedToken
    };

    // ✅ annivは収穫時にGAS確定。通常種は植えた時点で確定して保存
    if(seedId !== "seed_anniv"){
      plot.reward = drawRewardForPlot(plot);
    }

    state.plots[index] = plot;
    saveState(state);
    render();

    // ✅ annivは植えた瞬間にGASへ plant（失敗したら token を戻す & マスを空に戻す）
    if(seedId === "seed_anniv"){
      try{
        const r = await callSerial("plant", { seed_token: seedToken });
        if(!r || !r.ok){
          throw new Error((r && r.error) ? r.error : "PLANT_FAILED");
        }
      }catch(e){
        state.plots[index] = { state:"EMPTY" };
        saveState(state);
        unconsumeToken("anniv", seedToken);

        openModal("植え付けエラー", `
          <div class="step">GASへ plant できませんでした。<br>
          tokenは戻しました。<br>
          ${e && e.message ? e.message : ""}</div>
          <div class="row"><button type="button" id="btnOk" class="primary">OK</button></div>
        `);
        document.getElementById("btnOk").addEventListener("click", closeModal);
        render();
      }
    }
  }

  // =========================================================
  // 図鑑追加
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

  function addXP(amount){
    if(!Number.isFinite(amount) || amount <= 0) return;
    player = loadPlayer();
    player.xp += Math.floor(amount);
    while(player.xp >= xpNeedForLevel(player.level)){
      player.xp -= xpNeedForLevel(player.level);
      player.level += 1;
      if(player.unlocked < MAX_PLOTS) player.unlocked += 1;
    }
    savePlayer(player);
  }

  function commitHarvest(i, reward){
    addToBook(reward);
    addXP(XP_BY_RARITY[reward.rarity] ?? 4);

    state.plots[i] = { state:"EMPTY" };
    saveState(state);

    closeModal();
    render();
  }

  // =========================================================
  // マス操作
  // =========================================================
  async function onPlotTap(i){
    player = loadPlayer();
    state = loadState();

    if (i >= player.unlocked) {
      openModal("ロック中", `
        <div class="step">このマスはまだ使えない。<br>収穫でXPを稼いで <b>Lvアップ</b> すると解放される。</div>
        <div class="row"><button type="button" id="btnOk">OK</button></div>
      `);
      document.getElementById("btnOk").addEventListener("click", closeModal);
      return;
    }

    const p = state.plots[i] || { state:"EMPTY" };

    if (p.state === "EMPTY") {
      if(!ensureLoadoutOrOpen()) return;
      await plantAt(i);
      return;
    }

    if (p.state === "GROW") {
      const remain = (p.readyAt||0) - Date.now();
      openModal("育成中", `
        <div class="step">このマスは育成中。収穫まであと <b>${fmtRemain(remain)}</b></div>
        <div class="row"><button type="button" id="btnOk">OK</button></div>
      `);
      document.getElementById("btnOk").addEventListener("click", closeModal);
      return;
    }

    if (p.state === "READY") {
      // ✅ anniv は収穫時にGASへ問い合わせ
      if(p.seedId === "seed_anniv"){
        if(!p.seedToken){
          openModal("収穫エラー", `
            <div class="step">seed_token が見つかりません（データ破損）。</div>
            <div class="row"><button type="button" id="btnOk" class="primary">OK</button></div>
          `);
          document.getElementById("btnOk").addEventListener("click", closeModal);
          return;
        }
        try{
          const r = await callSerial("harvest", { seed_token: p.seedToken });

          // ✅ GASは { ok:true, result:{card_id:"..."} } 形式
          const cardId = r && r.ok && r.result && r.result.card_id ? r.result.card_id : null;
          if(!cardId){
            openModal("収穫エラー", `
              <div class="step">GASから結果が取れませんでした。<br>${(r && r.error) ? r.error : ""}</div>
              <div class="row"><button type="button" id="btnOk" class="primary">OK</button></div>
            `);
            document.getElementById("btnOk").addEventListener("click", closeModal);
            return;
          }
          p.reward = cardFromCardId(cardId);
          state.plots[i] = p;
          saveState(state);
        }catch(e){
          openModal("収穫エラー", `
            <div class="step">通信に失敗しました。URLや公開設定を確認してください。</div>
            <div class="row"><button type="button" id="btnOk" class="primary">OK</button></div>
          `);
          document.getElementById("btnOk").addEventListener("click", closeModal);
          return;
        }
      }

      if (!p.reward) {
        p.reward = drawRewardForPlot(p);
        state.plots[i] = p;
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
  // tick（GROW→READY / READY→BURN）
  // =========================================================
  function tick(){
    state = loadState();
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
