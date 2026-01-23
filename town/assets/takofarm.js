/* =========================================================
   takofarm.js  (GitHub用 / たこ焼き畑 + 宝箱 + 露店 共通)
   - CSS: takofarm.css（あなたが貼ったやつ）前提
   - localStorageだけで動く（サーバ不要）
   - 「街マップに建物を置いてタップで開く」想定
   =========================================================
   ✅ このJSがやること（今の仕様の核）
   1) 宝箱：1日1回 / 種を複数入手 / その日消える
      - 宝箱は20座標のどれかに「その日固定」で出現
   2) ファーム：3x3
      - 植える → 水選択（ここまでキャンセルOK）→ タコ選択で確定
      - 確定：レアリティ（確率）→そのレア枠からカード抽選（実在カード）
      - 24hで収穫可能、そこから24h以内に収穫しないと焦げ消失
      - 焦げ時3%で「伝説の黒い化石」入手（タコ枠・消費）
      - 成長2段階目で「匂わせエフェクト」出たり出なかったり（SR以上でも確定ではない）
      - 収穫後は即植えられる
   3) オクト残高：HUD表示 & ショップ（ページ/モーダル）へ飛べるようにする
   4) 露店：ここでは「棚データ構造」まで用意（演出・売買ロジックは次段で追加しやすい形）
========================================================= */

(() => {
  "use strict";

  /* =========================
     0) あなたが編集する設定（重要）
  ========================= */

  // localStorageキー（全ページ共通）
  const KEY = "takoyaki_takofarm_v1";

  // 画像URL（あなたの用意した画像に差し替え）
  const IMG = {
    farmEmpty:   "https://ul.h3z.jp/QXv49CJQ.png",
    farmBatter:  "https://ul.h3z.jp/kNUcqhfc.png",
    farmCooking: "https://ul.h3z.jp/qIC3xste.png",
    farmReady:   "https://ul.h3z.jp/fWfm0A1l.png",
    farmBurned:  "https://ul.h3z.jp/3lRjj9Xt.png",        // 任意（無ければreadyを流用）
    fxSmall:     "https://ul.h3z.jp/MjdxLjRZ.png",
    fxStrong:    "https://ul.h3z.jp/El4ikwBP.png",
    chestClosed: "https://ul.h3z.jp/7R07SCTz.png",
  };

  // 宝箱の出現候補（街マップ上の座標 20箇所）
  // 形式：{ x:"52%", y:"63%" } みたいに、あなたの街マップに合わせて編集
  const CHEST_SPOTS = [
    { x:"20%", y:"62%" }, { x:"28%", y:"70%" }, { x:"35%", y:"58%" }, { x:"42%", y:"66%" }, { x:"50%", y:"74%" },
    { x:"58%", y:"61%" }, { x:"65%", y:"70%" }, { x:"72%", y:"58%" }, { x:"80%", y:"66%" }, { x:"88%", y:"74%" },
    { x:"18%", y:"52%" }, { x:"30%", y:"48%" }, { x:"40%", y:"44%" }, { x:"52%", y:"46%" }, { x:"62%", y:"40%" },
    { x:"70%", y:"46%" }, { x:"78%", y:"44%" }, { x:"86%", y:"48%" }, { x:"92%", y:"56%" }, { x:"60%", y:"78%" },
  ];

  // ✅ カード実在プール（レアリティごと）
  // ここがないと「レア→そのレア枠のカード抽選」ができません。
  // 形式：{ no:"TN-001", name:"カード名", img:"https://..." }（imgは任意、図鑑で使う）
 const CARD_POOLS = {
  N: [
    { no:"TN-005", name:"たこ焼きタワー112", img:"" },
    { no:"TN-006", name:"塩顔パレード焼き", img:"" },
    { no:"TN-009", name:"塩マヨ露天焼き", img:"" },
    { no:"TN-011", name:"チーズ火山焼き", img:"" },
    { no:"TN-012", name:"揚げ玉会議焼き", img:"" },
    { no:"TN-013", name:"くたびれ塩こしょう焼き", img:"" },
    { no:"TN-016", name:"たこ焼き、発射オーライ", img:"" },
    { no:"TN-018", name:"ゆのかわの主", img:"" },
    { no:"TN-019", name:"誤入店トラップ", img:"" },
    { no:"TN-021", name:"たこ焼き、流れて候", img:"" },
    { no:"TN-023", name:"芝生かたこ焼きか大会", img:"" },
    { no:"TN-024", name:"温泉女神のありがた迷惑", img:"" },
    { no:"TN-026", name:"たこ焼き48回リボ払い", img:"" },
    { no:"TN-027", name:"全身たこ焼きダイエット", img:"" },
    { no:"TN-028", name:"自己啓発たこ塾《井上諒プロ🎯》", img:"" },
    { no:"TN-029", name:"カロリーゼロ理論《仁木治プロ🎯》", img:"" },
    { no:"TN-031", name:"行列の最後尾が別県", img:"" },
    { no:"TN-034", name:"エシカル過剰焼き", img:"" },
    { no:"TN-036", name:"マヨネーズ詐欺", img:"" },
    { no:"TN-037", name:"勘違いデート", img:"" },
    { no:"TN-041", name:"玉の上にも三年", img:"" },
    { no:"TN-043", name:"転生したら即売れたこ焼き", img:"" },
    { no:"TN-046", name:"ごますりたこ焼き", img:"" },
    { no:"TN-048", name:"店主反撃レビュー《佐俣雄一郎🎯》", img:"" },
  ],

  R: [
    { no:"TN-002", name:"熱々地獄の給たこ所", img:"" },
    { no:"TN-003", name:"爆走！たこ焼きライダー菜々", img:"" },
    { no:"TN-008", name:"明太ギャラクシー焼き", img:"" },
    { no:"TN-014", name:"世界たこ焼き釣り選手権大会", img:"" },
    { no:"TN-017", name:"たこ焼きマニフェスト", img:"" },
    { no:"TN-022", name:"たこ焼きダーツ･インフェルノ《對馬裕佳子プロ🎯》", img:"" },
    { no:"TN-032", name:"国境超えた恋", img:"" },
    { no:"TN-035", name:"デリバリー長距離便", img:"" },
    { no:"TN-038", name:"恋落ちマッチング", img:"" },
    { no:"TN-042", name:"たこ焼きループザループ", img:"" },
    { no:"TN-044", name:"白い契約(稲石裕プロ🎯)", img:"" },
    { no:"TN-047", name:"ボスゲート", img:"" },
  ],

  SR: [
    { no:"TN-004", name:"見えるフリ焼き", img:"" },
    { no:"TN-010", name:"焼ク者ノ証", img:"" },
    { no:"TN-015", name:"顔コイン", img:"" },
    { no:"TN-020", name:"ピック不要の真実", img:"" },
    { no:"TN-030", name:"ガチャたこ焼き", img:"" },
    { no:"TN-039", name:"ドローン誤配達", img:"" },
    { no:"TN-040", name:"推し活たこ団扇", img:"" },
    { no:"TN-049", name:"たこ焼きの御神体", img:"" },
  ],

  UR: [
    { no:"TN-001", name:"黒き真珠イカさま焼き", img:"" },
    { no:"TN-007", name:"ローソク出せ！", img:"" },
    { no:"BN-033", name:"鉄板のビーナス", img:"" },
    { no:"BN-045", name:"ドリームファイト", img:"" },
  ],

  LR: [
    { no:"TN-025", name:"たこ焼き化石in函館山", img:"" },
    { no:"BN-050", name:"焼かれし記憶、ソースに還る", img:"" },
  ],
};


  // 水（生地）選択肢（価格はオクト）
  // ※確率はUIに出さないが、ここに書くのはOK（内部用）
  const WATER_OPTIONS = [
    { id:"water_normal",  label:"普通の水（無料）", price:0,    base:{ N:100, R:0,  SR:0,  UR:0,  LR:0 } },
    { id:"water_sea",     label:"海水",             price:1,    base:{ N:85,  R:13, SR:2,  UR:0,  LR:0 } },
    { id:"water_yunokawa",label:"ゆのかわの天然水", price:10,   base:{ N:70,  R:23, SR:5,  UR:2,  LR:0 } },
    { id:"water_gold",    label:"黄金の水",         price:50,   base:{ N:60,  R:28, SR:7,  UR:4,  LR:1 } },
    { id:"water_mystery", label:"謎の水",           price:30,   base:{ N:99.7,R:0,  SR:0,  UR:0,  LR:0.3 } },
  ];

  // タコ（肥料）選択肢（特殊効果型B）
  // effect は「レア抽選ウェイト」を歪ませる関数（確率は見せない）
  // black_fossil（黒い化石）は焦げ3%のみで増える（購入不可）
  const TACO_OPTIONS = [
    { id:"taco_normal", label:"普通のタコ（無料）", price:0,   effect:(w)=>w, fxBoost:0 },
    { id:"taco_stinky", label:"くさいタコ",         price:1,   effect:(w)=>bump(w, {N:+12, R:-8, SR:-3, UR:-1, LR:0}), fxBoost:0 },
    { id:"taco_sweet",  label:"あまいタコ",         price:5,   effect:(w)=>bump(w, {N:-6, R:+6, SR:0,  UR:0,  LR:0}), fxBoost:0 },
    { id:"taco_lux",    label:"高級感があるタコ",   price:20,  effect:(w)=>bump(w, {N:-10,R:+5, SR:+3, UR:+2, LR:0}), fxBoost:0 },
    { id:"taco_dia",    label:"ダイヤモンドのタコ", price:100, effect:(w)=>bump(w, {N:-18,R:-2, SR:+8, UR:+8, LR:+4}), fxBoost:0 },
    { id:"taco_vanish", label:"縮んで消えるタコ",   price:30,  effect:(w)=>vanishGamble(w), fxBoost:0 },
    // 黒い化石：焦げで3%入手、使用で匂わせ率UP（レア率は変えない）
    { id:"black_fossil",label:"伝説の黒い化石",     price:null, effect:(w)=>w, fxBoost:0.35 },
  ];

  // 即納品（確定換金）の基準値
  const DELIVER_VALUE = { N:1, R:2, SR:5, UR:15, LR:50 };

  // 成長タイマー
  const GROW_MS  = 24 * 60 * 60 * 1000; // 24hで収穫可能
  const READY_MS = 24 * 60 * 60 * 1000; // さらに24hで焦げ

  // 焦げで黒い化石が出る確率
  const FOSSIL_CHANCE = 0.03;

  // 宝箱の種数ロール
  // 基本1〜5（均等93.8%）/ 5%で10 / 1%で30 / 0.2%で77
  function rollSeedQuantity(){
    const r = Math.random() * 100;
    if(r < 0.2) return 77;
    if(r < 1.2) return 30;
    if(r < 6.2) return 10;
    return 1 + Math.floor(Math.random() * 5);
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

  // 日ごと固定乱数（宝箱位置固定用）
  function hashStrToInt(str){
    let h = 2166136261;
    for(let i=0;i<str.length;i++){
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
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

  function clampMin0(n){ return Math.max(0, n); }

  function bump(w, delta){
    const out = {...w};
    for(const k of Object.keys(delta)){
      out[k] = clampMin0((out[k] ?? 0) + delta[k]);
    }
    // 合計が0にならないように保険
    if(Object.values(out).reduce((a,n)=>a+n,0) <= 0){
      return {...w};
    }
    return out;
  }

  // 縮んで消えるタコ：ギャンブル（たまに跳ねるが基本は落ちる）
  function vanishGamble(w){
    // 80%でN寄り、20%で上振れ寄り
    if(Math.random() < 0.8){
      return bump(w, { N:+18, R:-10, SR:-5, UR:-2, LR:-1 });
    }
    return bump(w, { N:-12, R:-4, SR:+8, UR:+6, LR:+2 });
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

      // 種（未確定）所持数
      seeds: 0,

      // 黒い化石所持数
      fossil: 0,

      // 宝箱
      chestDayKey: todayKey(),
      chestOpened: false,

      // 収穫タイム（1日1回開始、開始後24h有効）
      harvestDayKey: null,
      harvestStartAt: 0,

      // 3x3セル（9個）
      cells: Array.from({length:9}, () => ({
        state: "EMPTY", // EMPTY | SEED | WATER | GROWING | READY | BURNED
        seedPlacedAt: 0,   // 種を置いた時刻
        waterId: null,     // 水選択
        tacoId: null,      // タコ選択（確定時）
        confirmedAt: 0,    // タコ選択で確定した時刻（成長開始）
        rarity: null,      // 確定レア
        cardNo: null,      // 確定カード番号（実在）
        cardName: null,
        cardImg: null,
        fxFlag: false,     // 匂わせエフェクトを出すか（2段階目で出たり出なかったり）
        fxStrong: false,   // 強い匂わせ（任意）
      })),

      // 図鑑（カード番号→所持数）
      dex: {
        // "TN-001": { name:"", img:"", count:1, rarity:"SR" } など
      },

      // 露店（棚スロット）
      market: {
        shelfSize: 3, // 最初は3枠推奨（後で拡張）
        shelves: Array.from({length:6}, () => null), // 最大6想定（使うのは shelfSize まで）
        // 例：{ cardNo, name, img, rarity, price, listedAt }
      },

      // 即納品（出すなら：ここは後で追加UIと連動）
    };
  }

  function loadState(){
    const raw = localStorage.getItem(KEY);
    if(!raw) return defaultState();
    try{
      const s = JSON.parse(raw);
      // 日付跨ぎ処理：宝箱
      const tk = todayKey();
      if(s.chestDayKey !== tk){
        s.chestDayKey = tk;
        s.chestOpened = false;
      }
      // seeds/fossilの欠損補完
      if(typeof s.seeds !== "number") s.seeds = 0;
      if(typeof s.fossil !== "number") s.fossil = 0;
      if(typeof s.octo !== "number") s.octo = 0;
      if(!Array.isArray(s.cells) || s.cells.length !== 9){
        s.cells = defaultState().cells;
      }
      if(!s.dex) s.dex = {};
      if(!s.market) s.market = defaultState().market;
      if(!Array.isArray(s.market.shelves)) s.market.shelves = defaultState().market.shelves;
      if(typeof s.market.shelfSize !== "number") s.market.shelfSize = 3;

      return s;
    }catch(e){
      localStorage.removeItem(KEY);
      return defaultState();
    }
  }

  function saveState(){
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  let state = loadState();

  /* =========================
     3) 成長更新（READY / BURNED の判定）
  ========================= */

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
          c.state = "BURNED";
          // 黒い化石判定（3%）
          if(Math.random() < FOSSIL_CHANCE){
            state.fossil += 1;
          }
          // すぐ空きに戻す（焦げ画像を一瞬見せたい場合はUI側でBURNED表示後にクリアしてもOK）
          clearCell(c);
        }else{
          c.state = "GROWING";
        }
      }
    }
  }

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

  /* =========================
     4) 宝箱（街マップ上）
  ========================= */

  function chestSpotIndexForToday(){
    const h = hashStrToInt("CHEST|" + todayKey());
    return h % CHEST_SPOTS.length;
  }

  function ensureChestOnMap(){
    // 街マップのラッパー（あなたのHTMLに合わせて変更OK）
    // 例：.map-wrap でも #map でもいい。存在したら宝箱を置く。
    const map = $(".map-wrap") || $("#map") || document.body;
    if(!map) return;

    // すでにあるなら何もしない
    if($(".tf-chest-spot", map)) return;

    // 今日すでに開けていたら表示しない
    const tk = todayKey();
    if(state.chestDayKey !== tk){
      state.chestDayKey = tk;
      state.chestOpened = false;
      saveState();
    }
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

  function openChest(btnEl){
    const tk = todayKey();
    if(state.chestDayKey !== tk){
      state.chestDayKey = tk;
      state.chestOpened = false;
    }
    if(state.chestOpened){
      toast("今日はもう宝箱を開けた。");
      // その場から消す
      if(btnEl) btnEl.remove();
      return;
    }

    const qty = rollSeedQuantity();
    state.seeds += qty;
    state.chestOpened = true;
    saveState();

    toast(`宝箱オープン！ 種 +${qty}`);
    // その日は消える（仕様）
    if(btnEl) btnEl.remove();

    // HUDがあれば更新
    renderHud();
  }

  /* =========================
     5) ファームUI（モーダル）
     ※このJSは「DOMがあれば描画する」作りにしてあります
     ※HTML側で必要な要素は後で一緒に整えます（今はJSだけ）
  ========================= */

  // 期待するDOM（あれば動く）
  // - モーダル: #tfFarmModal .tf-modal（任意）
  // - 盤面: #tfPlate
  // - HUD: #tfOcto #tfSeedCount #tfFossilCount
  // - ボタン: #tfHarvestStartBtn #tfResetBtn #tfOpenShopWater #tfOpenShopTaco
  // - 選択パネル: #tfSelIndex #tfSelState #tfPlantBtn #tfCancelBtn #tfPickWater #tfPickTaco #tfHarvestBtn
  //
  // ※存在しない要素があっても落ちないようにしてます。

  let sel = 0;

  function cellStageImage(c){
    if(c.state === "EMPTY") return IMG.farmEmpty;
    if(c.state === "SEED")  return IMG.farmBatter;   // 種だけ置いた段階も生地画像でOK
    if(c.state === "WATER") return IMG.farmBatter;   // 水まで＝生地画像
    if(c.state === "GROWING"){
      const t = now();
      const start = c.confirmedAt;
      // 成長2段階目：収穫可能(24h)の直前側に cooking を出す
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

  function renderPlate(){
    const plate = $("#tfPlate");
    if(!plate) return;

    updateCellAges();

    plate.innerHTML = "";
    state.cells.forEach((c, i) => {
      const cell = document.createElement("div");
      cell.className = "tf-cell" + (i === sel ? " tf-selected" : "");
      cell.dataset.state = c.state;

      // 匂わせエフェクト：成長2段階目（cooking相当）で表示
      // 「SR以上確定でも出たり出なかったり」＝ fxFlagは確定時に決める
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

  function renderHud(){
    const octoEl = $("#tfOcto");
    const seedEl = $("#tfSeedCount");
    const fosEl  = $("#tfFossilCount");
    if(octoEl) octoEl.textContent = String(state.octo);
    if(seedEl) seedEl.textContent = String(state.seeds);
    if(fosEl)  fosEl.textContent  = String(state.fossil);
  }

  function harvestTokenValid(){
    if(!state.harvestDayKey || !state.harvestStartAt) return false;
    // “開始した瞬間から24h有効”
    return now() < (state.harvestStartAt + GROW_MS);
  }

  function canStartHarvestToday(){
    const tk = todayKey();
    // その日に1回だけ開始
    return state.harvestDayKey !== tk;
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

  function renderFarmSide(){
    renderHud();

    const c = state.cells[sel];

    const selIdx = $("#tfSelIndex");
    const selState = $("#tfSelState");
    if(selIdx) selIdx.textContent = String(sel+1);
    if(selState) selState.textContent = c.state;

    // ボタン類
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
        // 未確定なのでここでは何も決めない
        saveState();
        toast("種を植えた。水を選んで。");
        renderPlate();
        renderFarmSide();
      };
    }

    // キャンセル：水までならOK（A）
    if(cancelBtn){
      const canCancel = (c.state === "SEED" || c.state === "WATER");
      cancelBtn.disabled = !canCancel;
      cancelBtn.onclick = () => {
        if(!(c.state === "SEED" || c.state === "WATER")) return;
        // 種は戻す
        state.seeds += 1;
        clearCell(c);
        saveState();
        toast("キャンセルした（種は戻った）");
        renderPlate();
        renderFarmSide();
      };
    }

    // 水選択：SEEDで選択可能、WATERで変更可（変更=未確定のまま）
    if(waterSel){
      waterSel.disabled = !(c.state === "SEED" || c.state === "WATER");
      fillSelect(waterSel, WATER_OPTIONS.map(x => ({
        value: x.id,
        label: x.label + (x.price ? `（${x.price}オクト）` : "")
      })), c.waterId || "");
      waterSel.onchange = () => {
        const id = waterSel.value;
        const opt = WATER_OPTIONS.find(x => x.id === id);
        if(!opt) return;

        // 無料以外は所持オクト確認
        if(opt.price > 0 && state.octo < opt.price){
          toast("オクトが足りない。");
          // 元に戻す
          waterSel.value = c.waterId || "";
          return;
        }
        // 価格支払い：水を変更した場合も、その都度支払うのか？
        // → 仕様を詰めていないので「確定（タコ選択）時にまとめて支払う」でもOK。
        // 今回は“水選択の瞬間に支払う”方式にしておく（直感的）。
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
      const tacoList = TACO_OPTIONS
        .filter(t => t.id !== "black_fossil" || state.fossil > 0)
        .map(t => ({
          value: t.id,
          label: (t.id === "black_fossil")
            ? `${t.label}（所持${state.fossil}）`
            : `${t.label}${t.price ? `（${t.price}オクト）` : "（無料）"}`
        }));
      fillSelect(tacoSel, tacoList, "");

      tacoSel.onchange = () => {
        const id = tacoSel.value;
        const taco = TACO_OPTIONS.find(x => x.id === id);
        if(!taco) return;

        // 価格チェック（黒い化石は購入不可＝price null）
        if(taco.price != null && taco.price > 0){
          if(state.octo < taco.price){
            toast("オクトが足りない。");
            tacoSel.value = "";
            return;
          }
        }

        // ここで確定！
        // 1) 支払い（タコ）
        if(taco.price != null && taco.price > 0){
          state.octo -= taco.price;
        }

        // 2) 黒い化石消費（匂わせ率UP）
        let fxBoost = 0;
        if(taco.id === "black_fossil"){
          state.fossil = Math.max(0, state.fossil - 1);
          fxBoost = taco.fxBoost || 0;
        }

        // 3) 水の基礎ウェイト
        const water = WATER_OPTIONS.find(x => x.id === c.waterId) || WATER_OPTIONS[0];
        let weights = {...water.base};

        // 4) タコの歪み
        weights = taco.effect(weights);

        // 5) レア確定
        const rarity = pickWeighted(weights);

        // 6) そのレア枠からカード抽選
        const pool = CARD_POOLS[rarity] || [];
        if(pool.length === 0){
          // プールが空だと抽選できないので保険
          // とりあえずNに落として抽選（Nも空ならエラー）
          const fallback = CARD_POOLS.N || [];
          if(fallback.length === 0){
            toast("カードプールが空です。CARD_POOLSを設定してください。");
            return;
          }
          const card = fallback[Math.floor(Math.random() * fallback.length)];
          finalizeCell(c, "N", card, fxBoost);
        }else{
          const card = pool[Math.floor(Math.random() * pool.length)];
          finalizeCell(c, rarity, card, fxBoost);
        }

        saveState();
        toast("焼き始めた。24時間後に収穫できる。");
        renderHud();
        renderPlate();
        renderFarmSide();
      };
    }

    // 収穫ボタン：収穫タイム有効＋セルがREADY
    if(harvestBtn){
      const ok = harvestTokenValid() && c.state === "READY";
      harvestBtn.disabled = !ok;
      harvestBtn.onclick = () => {
        if(!harvestTokenValid()){
          toast("収穫タイムが必要。");
          return;
        }
        if(c.state !== "READY") return;

        // 図鑑へ
        addToDex(c);

        // 空きに戻す（即植え可）
        clearCell(c);
        saveState();

        toast("収穫！図鑑に追加した。");
        renderPlate();
        renderFarmSide();
      };
    }

    // メッセージ類（任意）
    const msg = $("#tfActionMsg");
    if(msg){
      msg.textContent =
        c.state === "EMPTY" ? "空き。種を植えられる。" :
        c.state === "SEED"  ? "水を選べる。ここまでキャンセルOK。" :
        c.state === "WATER" ? "タコを選ぶと確定して焼き始める。" :
        c.state === "GROWING" ? "成長中。時間が経てば収穫可能になる。" :
        c.state === "READY" ? (harvestTokenValid() ? "収穫OK！タップで回収。" : "収穫可能だが、収穫タイムを開始していない。") :
        "状態";
    }

    // ショップ導線（リンク/モーダルはあなたの構成に合わせる）
    const shopWater = $("#tfOpenShopWater");
    const shopTaco  = $("#tfOpenShopTaco");
    if(shopWater) shopWater.onclick = () => window.location.href = "shop-water.html";
    if(shopTaco)  shopTaco.onclick  = () => window.location.href = "shop-taco.html";

    // リセット（デバッグ/救済）
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
  }

  function fillSelect(selEl, items, current){
    // items: [{value,label}]
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
    c.tacoId = c.tacoId || null; // 使わないが保持枠
    c.confirmedAt = now();
    c.rarity = rarity;
    c.cardNo = card.no;
    c.cardName = card.name || card.no;
    c.cardImg = card.img || "";

    c.state = "GROWING";

    // 匂わせエフェクト：
    // - SR以上でも“出たり出なかったり”
    // - 黒い化石で「出やすくなる」
    let fxChance = 0.0;
    if(rarity === "SR") fxChance = 0.20;
    if(rarity === "UR") fxChance = 0.45;
    if(rarity === "LR") fxChance = 0.85;

    fxChance = Math.min(0.95, fxChance + (fxBoost || 0));

    c.fxFlag = Math.random() < fxChance;
    // 強い匂わせはUR/LRの一部だけ
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
        // 図鑑は50枠で「そのカード」だけ並べるので、rarityは履歴として残す程度
        lastRarity: c.rarity
      };
    }else{
      cur.count += 1;
      cur.lastRarity = c.rarity;
    }
  }

  /* =========================
     6) 初期化 & 初回起動
  ========================= */

  function init(){
    // カードプール未設定なら警告（ただし動作はさせる）
    const total = Object.values(CARD_POOLS).reduce((a,arr)=>a+(arr?.length||0),0);
    if(total === 0){
      console.warn("[takofarm] CARD_POOLS が空です。レア別に実在カードを入れてください。");
    }

    // 宝箱を街に置く（街マップがあるページだけ）
    ensureChestOnMap();

    // ファームUIがあるページなら描画
    renderHud();
    renderPlate();
    renderFarmSide();

    // 周期更新（盤面の残り時間ラベル更新）
    setInterval(() => {
      if($("#tfPlate")){
        renderPlate();
        renderFarmSide();
      }
    }, 15 * 1000);
  }

  // グローバルに少しだけ公開（建物タップで呼べる）
  window.TakoFarm = {
    init,
    getState: () => state,
    save: saveState,
    openChest: () => openChest($(".tf-chest-spot")),
    startHarvestTime,
  };

  document.addEventListener("DOMContentLoaded", init);

})();

