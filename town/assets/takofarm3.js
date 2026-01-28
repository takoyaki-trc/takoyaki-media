/* =========================================================
   takofarm.js（書き直し完全版 / たこ焼き畑 + 宝箱 + 図鑑 + 露店）
   - localStorageだけ（サーバ不要）
   - 「DOMがあれば描画する」方式（要素が無くても落ちない）
   - 宝箱は 1日1回 / 今日固定の座標に出現
   - 宝箱を開けたら「結果モーダル」を必ず表示（見逃し防止）
   - 図鑑（dex）は収穫で追加され、描画UIがあれば成立
   =========================================================
   ▼ 期待するDOM（あれば動く）
   [マップ]
     .map-wrap or #townMap or #map  (宝箱出現先)
   [ファーム]
     #tfPlate
     #tfOcto #tfSeedCount #tfFossilCount
     #tfSelIndex #tfSelState
     #tfPlantBtn #tfCancelBtn #tfPickWater #tfPickTaco #tfHarvestBtn
     #tfHarvestStartBtn #tfResetBtn
     #tfActionMsg
   [露店]
     #mkOcto #mkShelfSize #mkPending #mkCallBtn #mkCallCd #mkShelves #mkLog #mkBubble
   [トースト]
     .tf-toast
   [図鑑（任意：あるなら描く）]
     #tfDexGrid        ← 図鑑グリッドを描画（div）
     #tfDexCount       ← 登録カード種類数（span/b）
     #tfDexTotal       ← 総枚数（span/b）
   [宝箱結果モーダル（任意：無ければJSが自動生成）]
     #tfChestResultModal（自動生成するので基本不要）
========================================================= */

(() => {
  "use strict";

  /* =========================
     0) 設定（ここだけ編集）
  ========================= */

  // localStorageキー（全ページ共通）
  const KEY = "takoyaki_takofarm_v1";

  // 画像URL（差し替えOK）
  const IMG = {
    farmEmpty:   "https://ul.h3z.jp/YeMGDwHX.png",
    farmBatter:  "https://ul.h3z.jp/9NMqEYog.png",
    farmCooking: "https://ul.h3z.jp/Uyd2OaGN.png",
    farmReady:   "https://ul.h3z.jp/fWfm0A1l.png",
    farmBurned:  "https://ul.h3z.jp/3lRjj9Xt.png", // 任意（無ければreadyを流用）
    fxSmall:     "https://ul.h3z.jp/rnShJZdK.png",
    fxStrong:    "https://ul.h3z.jp/UtT08LXX.png",
    chestClosed: "https://ul.h3z.jp/7R07SCTz.png",
  };

  // 宝箱の出現候補（20箇所）※あなたの街マップに合わせて編集
  const CHEST_SPOTS = [
    { x:"20%", y:"62%" }, { x:"28%", y:"70%" }, { x:"35%", y:"58%" }, { x:"42%", y:"66%" }, { x:"50%", y:"74%" },
    { x:"58%", y:"61%" }, { x:"65%", y:"70%" }, { x:"72%", y:"58%" }, { x:"80%", y:"66%" }, { x:"88%", y:"74%" },
    { x:"18%", y:"52%" }, { x:"30%", y:"48%" }, { x:"40%", y:"44%" }, { x:"52%", y:"46%" }, { x:"62%", y:"40%" },
    { x:"70%", y:"46%" }, { x:"78%", y:"44%" }, { x:"86%", y:"48%" }, { x:"92%", y:"56%" }, { x:"60%", y:"78%" },
  ];

  // ✅ 実在カードプール（レアリティごと）
  // 形式：{ no:"TN-001", name:"カード名", img:"https://..." }
  const CARD_POOLS = {
    N: [
      { no:"TN-005", name:"たこ焼きタワー112", img:"https://ul.h3z.jp/xjoqO9HK.png" },
      { no:"TN-006", name:"塩顔パレード焼き", img:"https://ul.h3z.jp/SvLLVa7m.png" },
      { no:"TN-009", name:"塩マヨ露天焼き", img:"https://ul.h3z.jp/sh2p18pj.png" },
      { no:"TN-011", name:"チーズ火山焼き", img:"https://ul.h3z.jp/u12Q1rQ9.png" },
      { no:"TN-012", name:"揚げ玉会議焼き", img:"https://ul.h3z.jp/wvL9uwpZ.png" },
      { no:"TN-013", name:"くたびれ塩こしょう焼き", img:"https://ul.h3z.jp/KW4kM6OW.png" },
      { no:"TN-016", name:"たこ焼き、発射オーライ", img:"https://ul.h3z.jp/Dk6Hj5gd.png" },
      { no:"TN-018", name:"ゆのかわの主", img:"https://ul.h3z.jp/mPE2nzcz.png" },
      { no:"TN-019", name:"誤入店トラップ", img:"https://ul.h3z.jp/xE6OcrTz.png" },
      { no:"TN-021", name:"たこ焼き、流れて候", img:"https://ul.h3z.jp/XFCtYUZu.png" },
      { no:"TN-023", name:"芝生かたこ焼きか大会", img:"https://ul.h3z.jp/H4HOwhKK.png" },
      { no:"TN-024", name:"温泉女神のありがた迷惑", img:"https://ul.h3z.jp/Q8392V7N.png" },
      { no:"TN-026", name:"たこ焼き48回リボ払い", img:"https://ul.h3z.jp/Ih4UgGuG.png" },
      { no:"TN-027", name:"全身たこ焼きダイエット", img:"https://ul.h3z.jp/JQcHg0cM.png" },
      { no:"TN-028", name:"自己啓発たこ塾《井上諒プロ🎯》", img:"https://ul.h3z.jp/x2giE7yR.png" },
      { no:"TN-029", name:"カロリーゼロ理論《仁木治プロ🎯》", img:"https://ul.h3z.jp/G9TjNqsR.png" },
      { no:"TN-031", name:"行列の最後尾が別県", img:"https://ul.h3z.jp/do0u2b0m.png" },
      { no:"TN-034", name:"エシカル過剰焼き", img:"https://ul.h3z.jp/grlvMXBT.png" },
      { no:"TN-036", name:"マヨネーズ詐欺", img:"https://ul.h3z.jp/Veh6cTQo.png" },
      { no:"TN-037", name:"勘違いデート", img:"https://ul.h3z.jp/Zj9jqeFm.png" },
      { no:"TN-041", name:"玉の上にも三年", img:"https://ul.h3z.jp/FHIVjxEc.png" },
      { no:"TN-043", name:"転生したら即売れたこ焼き", img:"https://ul.h3z.jp/n6un0ECF.png" },
      { no:"TN-046", name:"ごますりたこ焼き", img:"https://ul.h3z.jp/6hrmumFg.png" },
      { no:"TN-048", name:"店主反撃レビュー《佐俣雄一郎🎯》", img:"https://ul.h3z.jp/bGZmixM4.png" },
    ],
    R: [
      { no:"TN-002", name:"熱々地獄の給たこ所", img:"https://ul.h3z.jp/tnPHMqxN.png" },
      { no:"TN-003", name:"爆走！たこ焼きライダー菜々", img:"https://ul.h3z.jp/KB3Z4nk0.png" },
      { no:"TN-008", name:"明太ギャラクシー焼き", img:"https://ul.h3z.jp/ElEUWV02.png" },
      { no:"TN-014", name:"世界たこ焼き釣り選手権大会", img:"https://ul.h3z.jp/QBf0mhfP.png" },
      { no:"TN-017", name:"たこ焼きマニフェスト", img:"https://ul.h3z.jp/B5z1zmki.png" },
      { no:"TN-022", name:"たこ焼きダーツ･インフェルノ《對馬裕佳子プロ🎯》", img:"https://ul.h3z.jp/5SAL3R2J.png" },
      { no:"TN-032", name:"国境超えた恋", img:"https://ul.h3z.jp/Yhty1eVw.png" },
      { no:"TN-035", name:"デリバリー長距離便", img:"https://ul.h3z.jp/uISdf4dn.png" },
      { no:"TN-038", name:"恋落ちマッチング", img:"https://ul.h3z.jp/VaeuN4fe.png" },
      { no:"TN-042", name:"たこ焼きループザループ", img:"https://ul.h3z.jp/uKy4GPOX.png" },
      { no:"TN-044", name:"白い契約(稲石裕プロ🎯)", img:"https://ul.h3z.jp/g2banLA9.png" },
      { no:"TN-047", name:"ボスゲート", img:"https://ul.h3z.jp/1Q26RpZH.png" },
    ],
    SR: [
      { no:"TN-004", name:"見えるフリ焼き", img:"https://ul.h3z.jp/NSUjkwRE.png" },
      { no:"TN-010", name:"焼ク者ノ証", img:"https://ul.h3z.jp/BCXLFeGI.png" },
      { no:"TN-015", name:"顔コイン", img:"https://ul.h3z.jp/CIA9LV8T.png" },
      { no:"TN-020", name:"ピック不要の真実", img:"https://ul.h3z.jp/Xave4XVq.png" },
      { no:"TN-030", name:"ガチャたこ焼き", img:"https://ul.h3z.jp/XDrYkA9R.png" },
      { no:"TN-039", name:"ドローン誤配達", img:"https://ul.h3z.jp/6VGy1YM2.png" },
      { no:"TN-040", name:"推し活たこ団扇", img:"https://ul.h3z.jp/7mFuyxeG.png" },
      { no:"TN-049", name:"たこ焼きの御神体", img:"https://ul.h3z.jp/sv5Y8d9u.png" },
    ],
    UR: [
      { no:"TN-001", name:"黒き真珠イカさま焼き", img:"https://ul.h3z.jp/wMBupVzu.png" },
      { no:"TN-007", name:"ローソク出せ！", img:"https://ul.h3z.jp/naBoXNrd.png" },
      { no:"BN-033", name:"鉄板のビーナス", img:"https://ul.h3z.jp/xI1NUxhq.png" },
      { no:"BN-045", name:"ドリームファイト", img:"https://ul.h3z.jp/YNtkOAIi.png" },
    ],
    LR: [
      { no:"TN-025", name:"たこ焼き化石in函館山", img:"https://ul.h3z.jp/e2B7lU9p.png" },
      { no:"BN-050", name:"焼かれし記憶、ソースに還る", img:"https://ul.h3z.jp/l47TH2Ml.png" },
    ],
  };

  // 水（生地）選択肢
  const WATER_OPTIONS = [
    { id:"water_normal",  label:"普通の水（無料）", price:0,  base:{ N:30, R:30, SR:20, UR:10, LR:10 } },
    { id:"water_sea",     label:"海水",             price:1,  base:{ N:85, R:13, SR:2,  UR:0,  LR:0  } },
    { id:"water_yunokawa",label:"ゆのかわの天然水", price:10, base:{ N:70, R:23, SR:5,  UR:2,  LR:0  } },
    { id:"water_gold",    label:"黄金の水",         price:50, base:{ N:60, R:28, SR:7,  UR:4,  LR:1  } },
    { id:"water_mystery", label:"謎の水",           price:30, base:{ N:99.7, R:0, SR:0, UR:0, LR:0.3 } },
  ];

  // タコ（肥料）選択肢
  const TACO_OPTIONS = [
    { id:"taco_normal", label:"普通のタコ（無料）", price:0,   effect:(w)=>w, fxBoost:0 },
    { id:"taco_stinky", label:"くさいタコ",         price:1,   effect:(w)=>bump(w, {N:+12, R:-8, SR:-3, UR:-1, LR:0}), fxBoost:0 },
    { id:"taco_sweet",  label:"あまいタコ",         price:5,   effect:(w)=>bump(w, {N:-6, R:+6, SR:0,  UR:0,  LR:0}), fxBoost:0 },
    { id:"taco_lux",    label:"高級感があるタコ",   price:20,  effect:(w)=>bump(w, {N:-10,R:+5, SR:+3, UR:+2, LR:0}), fxBoost:0 },
    { id:"taco_dia",    label:"ダイヤモンドのタコ", price:100, effect:(w)=>bump(w, {N:-18,R:-2, SR:+8, UR:+8, LR:+4}), fxBoost:0 },
    { id:"taco_vanish", label:"縮んで消えるタコ",   price:30,  effect:(w)=>vanishGamble(w), fxBoost:0 },
    { id:"black_fossil",label:"伝説の黒い化石",     price:null,effect:(w)=>w, fxBoost:0.35 }, // 焦げ3%入手＆使用で匂わせ率UP
  ];

  // 成長タイマー
  const GROW_MS  = 24 * 60 * 60 * 1000; // 24hで収穫可能
  const READY_MS = 24 * 60 * 60 * 1000; // さらに24hで焦げ

  // 焦げで黒い化石が出る確率
  const FOSSIL_CHANCE = 0.03;

  // 宝箱の種数ロール（あなたの仕様そのまま）
  // 基本1〜9（均等93.8%）/ 5%で10 / 1%で30 / 0.2%で77
  function rollSeedQuantity(){
    const r = Math.random() * 100;
    if(r < 0.2) return 77;
    if(r < 1.2) return 30;
    if(r < 6.2) return 10;
    return 1 + Math.floor(Math.random() * 9);
  }

  /* =========================
     1) 共通ユーティリティ
  ========================= */

  function $(sel, root=document){ return root.querySelector(sel); }
  function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  function now(){ return Date.now(); }

  function todayKey(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }

  function hashStrToInt(str){
    let h = 2166136261;
    for(let i=0;i<str.length;i++){
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }

  function clampMin0(n){ return Math.max(0, n); }

  function bump(w, delta){
    const out = {...w};
    for(const k of Object.keys(delta)){
      out[k] = clampMin0((out[k] ?? 0) + delta[k]);
    }
    if(Object.values(out).reduce((a,n)=>a+n,0) <= 0) return {...w};
    return out;
  }

  function vanishGamble(w){
    if(Math.random() < 0.8){
      return bump(w, { N:+18, R:-10, SR:-5, UR:-2, LR:-1 });
    }
    return bump(w, { N:-12, R:-4, SR:+8, UR:+6, LR:+2 });
  }

  function pickWeighted(weightsObj){
    const entries = Object.entries(weightsObj).filter(([,w]) => w > 0);
    const sum = entries.reduce((a,[,w]) => a + w, 0);
    let r = Math.random() * sum;
    for(const [k,w] of entries){
      r -= w;
      if(r <= 0) return k;
    }
    return entries[entries.length-1]?.[0] ?? "N";
  }

  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#39;");
  }

  function toast(msg){
    const el = $(".tf-toast");
    if(!el){ alert(msg); return; }
    el.textContent = msg;
    el.classList.add("tf-show");
    clearTimeout(toast._t);
    toast._t = setTimeout(()=> el.classList.remove("tf-show"), 2200);
  }

  /* =========================
     2) 保存データ
  ========================= */

  function defaultState(){
    return {
      v: 1,

      // 通貨
      octo: 10,

      // 種所持数（1種類）
      seeds: 0,

      // 黒い化石所持数
      fossil: 0,

      // 宝箱（日ごと）
      chestDayKey: todayKey(),
      chestOpened: false,
      chestLastQty: 0,          // ←結果画面用
      chestLastAt: 0,           // ←結果画面用

      // 収穫タイム（1日1回開始、開始後24h有効）
      harvestDayKey: null,
      harvestStartAt: 0,

      // 3x3セル（9個）
      cells: Array.from({length:9}, () => ({
        state: "EMPTY", // EMPTY | SEED | WATER | GROWING | READY | BURNED
        seedPlacedAt: 0,
        waterId: null,
        tacoId: null,
        confirmedAt: 0,
        rarity: null,
        cardNo: null,
        cardName: null,
        cardImg: null,
        fxFlag: false,
        fxStrong: false,
      })),

      // 図鑑（カード番号→所持数）
      dex: {
        // "TN-001": { name:"", img:"", count:1, lastRarity:"SR" }
      },

      // 露店（棚スロット）
      market: {
        shelfSize: 3,
        shelves: Array.from({length:6}, () => null),
        lastCheckAt: now(),
        callCooldownUntil: 0,
        log: [],
      },
    };
  }

  function loadState(){
    const raw = localStorage.getItem(KEY);
    if(!raw) return defaultState();
    try{
      const s = JSON.parse(raw);
      const tk = todayKey();

      // 日付跨ぎ：宝箱
      if(s.chestDayKey !== tk){
        s.chestDayKey = tk;
        s.chestOpened = false;
        s.chestLastQty = 0;
        // chestLastAt は残してもOK（昨日のログ）
      }

      // 欠損補完
      if(typeof s.octo !== "number") s.octo = 0;
      if(typeof s.seeds !== "number") s.seeds = 0;
      if(typeof s.fossil !== "number") s.fossil = 0;
      if(typeof s.chestLastQty !== "number") s.chestLastQty = 0;
      if(typeof s.chestLastAt !== "number") s.chestLastAt = 0;

      if(!Array.isArray(s.cells) || s.cells.length !== 9){
        s.cells = defaultState().cells;
      }
      if(!s.dex) s.dex = {};
      if(!s.market) s.market = defaultState().market;
      if(!Array.isArray(s.market.shelves)) s.market.shelves = defaultState().market.shelves;
      if(typeof s.market.shelfSize !== "number") s.market.shelfSize = 3;
      if(typeof s.market.lastCheckAt !== "number") s.market.lastCheckAt = now();
      if(typeof s.market.callCooldownUntil !== "number") s.market.callCooldownUntil = 0;
      if(!Array.isArray(s.market.log)) s.market.log = [];

      return s;
    }catch(e){
      localStorage.removeItem(KEY);
      return defaultState();
    }
  }

  let state = loadState();

  function saveState(){
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  /* =========================
     3) 成長更新（READY / 焦げ判定）
  ========================= */

  function clearCell(c){
    c.state = "EMPTY";
    c.seedPlacedAt = 0;
    c.waterId = null;
    c.tacoId = null;
    c.confirmedAt = 0;
    c.rarity = null;
    c.cardNo = null;
    c.cardName = null;
    c.cardImg = null;
    c.fxFlag = false;
    c.fxStrong = false;
  }

  function updateCellAges(){
    const t = now();
    for(const c of state.cells){
      if(c.state === "GROWING" || c.state === "READY"){
        const start = c.confirmedAt;
        if(!start) continue;

        if(t >= start + GROW_MS && t < start + GROW_MS + READY_MS){
          c.state = "READY";
        }else if(t >= start + GROW_MS + READY_MS){
          // 焦げ → 全消失（ただし3%で黒い化石）
          if(Math.random() < FOSSIL_CHANCE){
            state.fossil += 1;
          }
          clearCell(c);
        }else{
          c.state = "GROWING";
        }
      }
    }
  }

  /* =========================
     4) 宝箱（街マップ上） + 結果モーダル
  ========================= */

  function chestSpotIndexForToday(){
    const h = hashStrToInt("CHEST|" + todayKey());
    return h % CHEST_SPOTS.length;
  }

  function getMapRoot(){
    return $(".map-wrap") || $("#townMap") || $("#map") || null;
  }

  function ensureChestOnMap(){
    const map = getMapRoot();
    if(!map) return;

    // すでに宝箱があるなら何もしない
    if($(".tf-chest-spot", map)) return;

    // 今日すでに開けてたら表示しない
    if(state.chestOpened) return;

    const idx = chestSpotIndexForToday();
    const pos = CHEST_SPOTS[idx];

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tf-chest-spot tf-is-active";
    btn.style.left = pos.x;
    btn.style.top  = pos.y;
    btn.setAttribute("aria-label", "宝箱");

    const img = document.createElement("img");
    img.src = IMG.chestClosed;
    img.alt = "宝箱";
    btn.appendChild(img);

    btn.addEventListener("click", () => openChest(btn));
    map.appendChild(btn);
  }

  function ensureChestResultModal(){
    // 既にあるならOK
    if($("#tfChestResultModal")) return;

    const wrap = document.createElement("div");
    wrap.id = "tfChestResultModal";
    wrap.className = "tf-modal";
    wrap.setAttribute("aria-hidden", "true");
    wrap.style.zIndex = "99995";
    wrap.innerHTML = `
      <div class="tf-modal__panel" role="dialog" aria-modal="true" aria-label="宝箱の結果">
        <div class="tf-modal__head">
          <h2>宝箱の結果</h2>
          <button class="tf-modal__close" type="button" data-close="tfChestResultModal" aria-label="閉じる">×</button>
        </div>
        <div class="tf-modal__body">
          <div class="tf-card">
            <div class="tf-title">入手</div>
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
              <span class="tf-pill">🌱 種：<b id="tfChestQty">0</b></span>
              <span class="tf-pill">所持：<b id="tfChestSeedTotal">0</b></span>
            </div>
            <div class="tf-mini" id="tfChestMeta" style="margin-top:8px;">---</div>
            <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:10px;">
              <button id="tfChestOk" class="tf-btn tf-btn--good" type="button">OK</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    // 閉じる系イベント
    document.querySelectorAll('[data-close="tfChestResultModal"]').forEach(btn=>{
      btn.addEventListener("click", ()=> closeModal("tfChestResultModal"));
    });
    wrap.addEventListener("click", (e)=>{
      if(e.target === wrap) closeModal("tfChestResultModal");
    });
    $("#tfChestOk")?.addEventListener("click", ()=> closeModal("tfChestResultModal"));
  }

  function openModal(id){
    const m = document.getElementById(id);
    if(!m) return;
    m.classList.add("tf-open");
    m.setAttribute("aria-hidden", "false");
  }
  function closeModal(id){
    const m = document.getElementById(id);
    if(!m) return;
    m.classList.remove("tf-open");
    m.setAttribute("aria-hidden", "true");
  }

  function showChestResult(qty){
    ensureChestResultModal();
    $("#tfChestQty") && ($("#tfChestQty").textContent = String(qty));
    $("#tfChestSeedTotal") && ($("#tfChestSeedTotal").textContent = String(state.seeds));
    const meta = $("#tfChestMeta");
    if(meta){
      const dt = state.chestLastAt ? new Date(state.chestLastAt) : null;
      meta.textContent = dt ? `開封：${dt.toLocaleString()}` : "開封：---";
    }
    openModal("tfChestResultModal");
  }

  function openChest(btnEl){
    const tk = todayKey();

    // 日付跨ぎ保険
    if(state.chestDayKey !== tk){
      state.chestDayKey = tk;
      state.chestOpened = false;
      state.chestLastQty = 0;
    }

    // 既に開けてた場合：結果を再表示（“何が起きたか不明”を防ぐ）
    if(state.chestOpened){
      toast("今日はもう宝箱を開けた。");
      showChestResult(state.chestLastQty || 0);
      if(btnEl) btnEl.remove();
      return;
    }

    const qty = rollSeedQuantity();
    state.seeds += qty;
    state.chestOpened = true;
    state.chestLastQty = qty;
    state.chestLastAt = now();
    saveState();

    toast(`宝箱オープン！ 種 +${qty}`);
    showChestResult(qty);

    if(btnEl) btnEl.remove();
    renderHud();
  }

  /* =========================
     5) ファームUI
  ========================= */

  let sel = 0;

  function cellStageImage(c){
    if(c.state === "EMPTY") return IMG.farmEmpty;
    if(c.state === "SEED")  return IMG.farmBatter;
    if(c.state === "WATER") return IMG.farmBatter;
    if(c.state === "GROWING"){
      const t = now();
      const start = c.confirmedAt;
      if(t >= start + (GROW_MS * 0.5)) return IMG.farmCooking;
      return IMG.farmBatter;
    }
    if(c.state === "READY") return IMG.farmReady;
    if(c.state === "BURNED") return IMG.farmBurned || IMG.farmReady;
    return IMG.farmEmpty;
  }

  function cellSubLabel(c){
    if(c.state === "EMPTY") return "植えられる";
    if(c.state === "SEED")  return "水を選ぶ";
    if(c.state === "WATER") return "タコを選ぶ";
    if(c.state === "GROWING"){
      const t = now();
      const left = (c.confirmedAt + GROW_MS) - t;
      const h = Math.max(0, Math.floor(left/3600000));
      return `成長中 ${h}h`;
    }
    if(c.state === "READY"){
      const t = now();
      const left = (c.confirmedAt + GROW_MS + READY_MS) - t;
      const h = Math.max(0, Math.floor(left/3600000));
      return `収穫OK 残り${h}h`;
    }
    return "";
  }

  function renderHud(){
    const octoEl = $("#tfOcto");
    const seedEl = $("#tfSeedCount");
    const fosEl  = $("#tfFossilCount");
    if(octoEl) octoEl.textContent = String(state.octo);
    if(seedEl) seedEl.textContent = String(state.seeds);
    if(fosEl)  fosEl.textContent  = String(state.fossil);

    // 露店HUDも同時更新
    const mkOcto = $("#mkOcto");
    if(mkOcto) mkOcto.textContent = String(state.octo);
  }

  function harvestTokenValid(){
    if(!state.harvestDayKey || !state.harvestStartAt) return false;
    return now() < (state.harvestStartAt + GROW_MS);
  }
  function canStartHarvestToday(){
    return state.harvestDayKey !== todayKey();
  }
  function startHarvestTime(){
    if(!canStartHarvestToday()){
      toast("今日はもう収穫タイムを開始している。");
      return;
    }
    state.harvestDayKey = todayKey();
    state.harvestStartAt = now();
    saveState();
    toast("収穫タイム開始（24h有効）");
    renderFarmSide();
  }

  function fillSelect(selEl, items, current){
    selEl.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "選択してください";
    selEl.appendChild(opt0);
    for(const it of items){
      const op = document.createElement("option");
      op.value = it.value;
      op.textContent = it.label;
      selEl.appendChild(op);
    }
    if(current) selEl.value = current;
  }

  function finalizeCell(c, rarity, card, fxBoost){
    c.confirmedAt = now();
    c.rarity = rarity;
    c.cardNo = card.no;
    c.cardName = card.name || card.no;
    c.cardImg = card.img || "";
    c.state = "GROWING";

    let fxChance = 0.0;
    if(rarity === "SR") fxChance = 0.20;
    if(rarity === "UR") fxChance = 0.45;
    if(rarity === "LR") fxChance = 0.85;

    fxChance = Math.min(0.95, fxChance + (fxBoost || 0));
    c.fxFlag = Math.random() < fxChance;
    c.fxStrong = (rarity === "UR" && Math.random()<0.25) || (rarity === "LR" && Math.random()<0.6);
  }

  function addToDex(c){
    const no = c.cardNo;
    if(!no) return;

    const cur = state.dex[no];
    if(!cur){
      state.dex[no] = {
        name: c.cardName || no,
        img: c.cardImg || "",
        count: 1,
        lastRarity: c.rarity,
        firstAt: now(),
        lastAt: now(),
      };
    }else{
      cur.count += 1;
      cur.lastRarity = c.rarity;
      cur.lastAt = now();
      if(!cur.img && c.cardImg) cur.img = c.cardImg;
      if(!cur.name && c.cardName) cur.name = c.cardName;
    }
  }

  function renderPlate(){
    const plate = $("#tfPlate");
    if(!plate) return;

    updateCellAges();

    plate.innerHTML = "";
    state.cells.forEach((c, i) => {
      const cell = document.createElement("div");
      cell.className = "tf-cell" + (i === sel ? " tf-selected" : "");
      cell.dataset.state = c.state;

      const shouldFx = (() => {
        if(!c.fxFlag) return false;
        if(c.state !== "GROWING") return false;
        const t = now();
        const start = c.confirmedAt;
        return t >= start + (GROW_MS * 0.5);
      })();
      if(shouldFx) cell.classList.add("tf-fx-on");

      const img = document.createElement("img");
      img.className = "tf-cell__img";
      img.src = cellStageImage(c);
      img.alt = c.state;

      const fx = document.createElement("img");
      fx.className = "tf-cell__fx";
      fx.src = c.fxStrong ? IMG.fxStrong : IMG.fxSmall;
      fx.alt = "fx";

      const tag = document.createElement("div");
      tag.className = "tf-cell__tag";
      tag.textContent = `${i+1}`;

      const sub = document.createElement("div");
      sub.className = "tf-cell__sub";
      sub.textContent = cellSubLabel(c);

      cell.appendChild(img);
      cell.appendChild(fx);
      cell.appendChild(tag);
      cell.appendChild(sub);

      cell.addEventListener("click", () => {
        sel = i;
        renderFarmSide();
        renderPlate();
      });

      plate.appendChild(cell);
    });

    saveState();
  }

  function renderFarmSide(){
    renderHud();

    const c = state.cells[sel];
    const selIdx = $("#tfSelIndex");
    const selState = $("#tfSelState");
    if(selIdx) selIdx.textContent = String(sel+1);
    if(selState) selState.textContent = c.state;

    const plantBtn  = $("#tfPlantBtn");
    const cancelBtn = $("#tfCancelBtn");
    const waterSel  = $("#tfPickWater");
    const tacoSel   = $("#tfPickTaco");
    const harvestBtn= $("#tfHarvestBtn");
    const harvestStartBtn = $("#tfHarvestStartBtn");

    if(harvestStartBtn){
      harvestStartBtn.disabled = !canStartHarvestToday();
      harvestStartBtn.onclick = startHarvestTime;
    }

    // 植える：EMPTYで seeds>=1
    if(plantBtn){
      plantBtn.disabled = !(c.state === "EMPTY" && state.seeds > 0);
      plantBtn.onclick = () => {
        if(c.state !== "EMPTY") return;
        if(state.seeds <= 0){ toast("種がない！宝箱を探して！"); return; }
        state.seeds -= 1;
        c.state = "SEED";
        c.seedPlacedAt = now();
        c.waterId = null;
        c.tacoId = null;
        saveState();
        toast("種を植えた。水を選んで。");
        renderPlate();
                renderFarmSide();
      };
    }

    // キャンセル：水までならOK（種は戻る）
    if(cancelBtn){
      const canCancel = (c.state === "SEED" || c.state === "WATER");
      cancelBtn.disabled = !canCancel;
      cancelBtn.onclick = () => {
        if(!(c.state === "SEED" || c.state === "WATER")) return;
        state.seeds += 1;      // 種は返す
        clearCell(c);
        saveState();
        toast("キャンセルした（種は戻った）");
        renderPlate();
        renderFarmSide();
      };
    }

    // 水選択：SEEDで選択可能、WATERで変更可
    if(waterSel){
      waterSel.disabled = !(c.state === "SEED" || c.state === "WATER");

      // 選択肢を入れる（現在値を保持）
      fillSelect(
        waterSel,
        WATER_OPTIONS.map(x => ({
          value: x.id,
          label: x.label + (x.price ? `（${x.price}オクト）` : "（無料）")
        })),
        c.waterId || ""
      );

      waterSel.onchange = () => {
        const id = waterSel.value;
        const opt = WATER_OPTIONS.find(x => x.id === id);
        if(!opt) return;

        // オクトチェック
        if(opt.price > 0 && state.octo < opt.price){
          toast("オクトが足りない。");
          waterSel.value = c.waterId || "";
          return;
        }

        // 支払い：水を選んだ瞬間に支払う方式
        if(opt.price > 0){
          state.octo -= opt.price;
        }

        c.waterId = id;
        c.state = "WATER";
        saveState();

        toast("水を決めた。次はタコを選ぶ。");
        renderHud();
        renderPlate();
        renderFarmSide();
      };
    }

    // タコ選択：WATERで選択可（ここで確定）
    if(tacoSel){
      tacoSel.disabled = !(c.state === "WATER");

      // 黒い化石は所持があるときだけ出す
      const tacoList = TACO_OPTIONS
        .filter(t => t.id !== "black_fossil" || state.fossil > 0)
        .map(t => ({
          value: t.id,
          label: (t.id === "black_fossil")
            ? `${t.label}（所持${state.fossil}）`
            : `${t.label}${t.price ? `（${t.price}オクト）` : "（無料）"}`
        }));

      // タコは「毎回選ぶ」想定なので current は空
      fillSelect(tacoSel, tacoList, "");

      tacoSel.onchange = () => {
        const id = tacoSel.value;
        const taco = TACO_OPTIONS.find(x => x.id === id);
        if(!taco) return;

        // 価格チェック（黒い化石は price:null）
        if(taco.price != null && taco.price > 0){
          if(state.octo < taco.price){
            toast("オクトが足りない。");
            tacoSel.value = "";
            return;
          }
        }

        // タコ代支払い
        if(taco.price != null && taco.price > 0){
          state.octo -= taco.price;
        }

        // 黒い化石消費（匂わせ率UPだけ）
        let fxBoost = 0;
        if(taco.id === "black_fossil"){
          state.fossil = Math.max(0, state.fossil - 1);
          fxBoost = taco.fxBoost || 0;
        }

        // 水の基礎ウェイト
        const water = WATER_OPTIONS.find(x => x.id === c.waterId) || WATER_OPTIONS[0];
        let weights = { ...water.base };

        // タコで歪ませる
        weights = taco.effect(weights);

        // レア確定
        const rarity = pickWeighted(weights);

        // そのレア枠からカード抽選
        const pool = CARD_POOLS[rarity] || [];
        let card = null;

        if(pool.length > 0){
          card = pool[Math.floor(Math.random() * pool.length)];
        }else{
          const fb = CARD_POOLS.N || [];
          if(fb.length === 0){
            toast("カードプールが空です。CARD_POOLSを設定してください。");
            return;
          }
          card = fb[Math.floor(Math.random() * fb.length)];
        }

        // 確定して成長開始
        finalizeCell(c, rarity, card, fxBoost);

        saveState();
        toast("焼き始めた。24時間後に収穫できる。");

        // UI更新
        renderHud();
        renderPlate();
        renderFarmSide();
      };
    }

    // 収穫：収穫タイム有効 + READY
    if(harvestBtn){
      const ok = harvestTokenValid() && c.state === "READY";
      harvestBtn.disabled = !ok;

      harvestBtn.onclick = () => {
        if(!harvestTokenValid()){
          toast("収穫タイムが必要。");
          return;
        }
        if(c.state !== "READY") return;

        // 図鑑へ追加
        addToDex(c);

        // 空きへ
        clearCell(c);
        saveState();

        toast("収穫！図鑑に追加した。");
        renderPlate();
        renderFarmSide();
      };
    }

    // メッセージ
    const msg = $("#tfActionMsg");
    if(msg){
      msg.textContent =
        c.state === "EMPTY" ? "空き。種を植えられる。" :
        c.state === "SEED"  ? "水を選べる。ここまでキャンセルOK。" :
        c.state === "WATER" ? "タコを選ぶと確定して焼き始める。" :
        c.state === "GROWING" ? "成長中。時間が経てば収穫可能になる。" :
        c.state === "READY" ? (harvestTokenValid() ? "収穫OK！回収できる。" : "収穫可能だが、収穫タイムを開始していない。") :
        "状態";
    }

    // ショップ導線（必要なら差し替え）
    const shopWater = $("#tfOpenShopWater");
    const shopTaco  = $("#tfOpenShopTaco");
    if(shopWater) shopWater.onclick = () => (window.location.href = "shop-water.html");
    if(shopTaco)  shopTaco.onclick  = () => (window.location.href = "shop-taco.html");

    // 初期化（救済）
    const resetBtn = $("#tfResetBtn");
    if(resetBtn){
      resetBtn.onclick = () => {
        if(confirm("データを初期化します。よろしいですか？")){
          localStorage.removeItem(KEY);
          state = loadState();
          sel = 0;
          toast("初期化した。");
          renderHud();
          renderPlate();
          renderFarmSide();
        }
      };
    }
  } // ← renderFarmSide() ここまで


