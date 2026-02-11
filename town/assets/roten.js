/* =========================================================
   roten.js（たこぴのお店 / 複数購入＆Chrome/Safari安定版）
   ✅ 資材在庫: tf_v1_inv（seed/water/fert）= ファームと完全共通
   ✅ 図鑑: tf_v1_book（got[id].count 合計を “所持” として表示）※今回はUIから非表示化
   ✅ オクト: roten_v1_octo
   ✅ たこ焼きみくじ: 1日1回（おみくじ演出：大吉/中吉/末吉/凶/大凶 + 報酬テーブル）
   ✅ 公開記念プレゼント: 1回だけ
   ✅ コラボのタネ（seed_colabo）は「シリアルで増える」ので購入不可
   ✅ Toast：Chromeでも確実に表示（bottom固定 / inline important）
   ✅ 購入UI：数量の隣に「買う」（2段にしない）
   ✅ 値段表示：控えめに1行表示（レイアウト崩さない）
   ✅ Modal：Chromeでも確実に前面表示（inline important）
   ✅ 所持数：画像右上にバッジ表示（購入欄の所持テキストは廃止）
   ✅ ボタン：＋/−/買う を少し小さく
   ✅ オクト不足の常時ヒント表示を削除（押下時Toastのみ）
   ✅ おみくじオクト：大凶1 / 凶500 / 末吉1000 / 中吉3000 / 大吉7777

   ✅ 変更点（今回）
   ・「水のレア率メモ」ボタン → 《タネ、ミズ、ヒリョウについて》 に変更
     - 可能な範囲で “購入（タップで買う）” の右横・右端寄せに移動（HTML変更なしでDOM移動）
   ・「所持資材」ボタン削除（#btnOpenInv を無効化/非表示）
   ・所持チップの絵文字（🌱/💧/🧪）をタップすると内訳モーダル表示
     - #chipSeed / #chipWater / #chipFert をクリック可能化
   ・本絵文字/リサイクル（図鑑系UI）を削除：#chipBookOwned / #chipBookDup を非表示化
========================================================= */
(() => {
  "use strict";

  const LS = {
    octo: "roten_v1_octo",
    inv: "tf_v1_inv",
    book: "tf_v1_book",
    mikujiDate: "roten_v1_mikuji_date",
    launchGift: "roten_v1_launch_gift_claimed",
    log: "roten_v1_log",
    codesUsed: "tf_v1_codes_used",
    deviceId: "tf_v1_device_id"
  };

  // ✅ シリアル（GAS Webアプリ）
  const REDEEM_ENDPOINT = "https://script.google.com/macros/s/AKfycbxZXt06RbQ0kdnkUamZtbrtD6f1MMZ30nmOoPYvMSoZenlz1hT940N2hBUxmtgNYxcA/exec";
  const REDEEM_API_KEY  = "takopi-gratan-2026";

  // ---------- utils ----------
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function todayKey(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const da = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${da}`;
  }

  function loadJSON(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) return fallback;
      return JSON.parse(raw);
    }catch(e){
      return fallback;
    }
  }
  function saveJSON(key, obj){
    localStorage.setItem(key, JSON.stringify(obj));
  }

  function getOcto(){
    return Number(localStorage.getItem(LS.octo) || 0);
  }
  function setOcto(v){
    localStorage.setItem(LS.octo, String(Math.max(0, Math.floor(Number(v)||0))));
  }
  function addOcto(delta){
    setOcto(getOcto() + Number(delta || 0));
  }

  function invDefault(){
    return { ver:1, seed:{}, water:{}, fert:{} };
  }
  function loadInv(){
    const inv = loadJSON(LS.inv, invDefault());
    inv.seed  = inv.seed  || {};
    inv.water = inv.water || {};
    inv.fert  = inv.fert  || {};
    return inv;
  }
  function saveInv(inv){
    saveJSON(LS.inv, inv);
  }

  function calcBookOwned(){
    const book = loadJSON(LS.book, null);
    if(!book || !book.got) return 0;
    let total = 0;
    for(const k of Object.keys(book.got)){
      const c = Number(book.got[k]?.count || 0);
      if(c > 0) total += c;
    }
    return total;
  }

  function pushLog(msg){
    const a = loadJSON(LS.log, []);
    a.unshift({ t: Date.now(), msg });
    saveJSON(LS.log, a.slice(0, 80));
  }

  // ---------- MASTER DATA ----------
  const SEEDS = [
    { id:"seed_random",  name:"なに出るタネ", desc:"何が育つかは完全ランダム。\n店主も知らない。", img:"https://ul.h3z.jp/gnyvP580.png", fx:"完全ランダム" },
    { id:"seed_shop",    name:"店頭タネ", desc:"店で生まれたタネ。\n店頭ナンバーを宿している。", img:"https://ul.h3z.jp/IjvuhWoY.png", fx:"店頭の気配" },
    { id:"seed_line",    name:"回線タネ", desc:"画面の向こうから届いたタネ。\nクリックすると芽が出る。", img:"https://ul.h3z.jp/AonxB5x7.png", fx:"回線由来" },
    { id:"seed_special", name:"たこぴのタネ", desc:"今はまだ何も起きない。\nそのうち何か起きる。", img:"https://ul.h3z.jp/29OsEvjf.png", fx:"待て" },
    { id:"seed_bussasari",      name:"ブッ刺さりタネ", desc:"心に刺さる。\n財布にも刺さる。", img:"https://ul.h3z.jp/MjWkTaU3.png", fx:"刺さり補正" },
    { id:"seed_namara_kawasar", name:"なまら買わさるタネ", desc:"気付いたら買ってる。\nレジ前の魔物。", img:"https://ul.h3z.jp/yiqHzfi0.png", fx:"買わさり圧" },
    { id:"seed_colabo",  name:"【コラボ】グラタンのタネ", desc:"今はまだ何も起きない。\nそのうち何か起きる。", img:"https://ul.h3z.jp/wbnwoTzm.png", fx:"シリアル解放" },
  ];

  const WATERS = [
    { id:"water_plain_free", name:"ただの水", desc:"無料・UR/LRなし。\n無課金の基準。", img:"https://ul.h3z.jp/13XdhuHi.png", fx:"基準（水）" },
    { id:"water_nice",       name:"なんか良さそうな水", desc:"ちょい上振れ・LRなし。\n初心者の背中押し。", img:"https://ul.h3z.jp/3z04ypEd.png", fx:"ちょい上振れ" },
    { id:"water_suspicious", name:"怪しい水", desc:"現実準拠・標準。\n実パックと同じ空気。", img:"https://ul.h3z.jp/wtCO9mec.png", fx:"標準（現実準拠）" },
    { id:"water_overdo",     name:"やりすぎな水", desc:"勝負水・現実より上。\n体感で強い。", img:"https://ul.h3z.jp/vsL9ggf6.png", fx:"勝負" },
    { id:"water_regret",     name:"押さなきゃよかった水", desc:"確定枠・狂気。\n事件製造機（SNS向け）", img:"https://ul.h3z.jp/L0nafMOp.png", fx:"事件" },
  ];

  const FERTS = [
    { id:"fert_agedama", name:"ただの揚げ玉", desc:"時短0。\n《焼きすぎたカード》率UP", img:"https://ul.h3z.jp/9p5fx53n.png", fx:"時短 0%" },
    { id:"fert_feel",    name:"気のせい肥料", desc:"早くなった気がする。\n気のせいかもしれない。", img:"https://ul.h3z.jp/XqFTb7sw.png", fx:"時短 5%" },
    { id:"fert_guts",    name:"根性論ぶち込み肥料", desc:"理由はない。\n気合いだ。", img:"https://ul.h3z.jp/bT9ZcNnS.png", fx:"時短 20%" },
    { id:"fert_skip",    name:"工程すっ飛ばし肥料", desc:"途中は、\n見なかったことにした。", img:"https://ul.h3z.jp/FqPzx12Q.png", fx:"時短 40%" },
    { id:"fert_timeno",  name:"時間を信じない肥料", desc:"最終兵器・禁忌。\n稀に《ドロドロ生焼けカード》", img:"https://ul.h3z.jp/l2njWY57.png", fx:"時短 90〜100%" },
  ];

  const PRICE = {
    seed_random: 100,
    seed_shop: 200,
    seed_line: 200,
    seed_special: 10000,
    seed_bussasari: 50000,
    seed_namara_kawasar: 30000,

    water_plain_free: 50,
    water_nice: 100,
    water_suspicious: 300,
    water_overdo: 500,
    water_regret: 200,

    fert_agedama: 50,
    fert_feel: 100,
    fert_guts: 150,
    fert_skip: 200,
    fert_timeno: 300,
  };

  function buildGoods(){
    const goods = [];
    for(const s of SEEDS){
      const isColabo = (s.id === "seed_colabo");
      goods.push({
        kind:"seed",
        id:s.id,
        name:s.name,
        desc:s.desc,
        fx:s.fx,
        img:s.img,
        price: isColabo ? null : (PRICE[s.id] ?? 18),
        buyable: !isColabo,
        tag: isColabo ? "シリアル限定" : "販売"
      });
    }
    for(const w of WATERS){
      goods.push({ kind:"water", id:w.id, name:w.name, desc:w.desc, fx:w.fx, img:w.img, price:(PRICE[w.id] ?? 18), buyable:true, tag:"販売" });
    }
    for(const f of FERTS){
      goods.push({ kind:"fert", id:f.id, name:f.name, desc:f.desc, fx:f.fx, img:f.img, price:(PRICE[f.id] ?? 18), buyable:true, tag:"販売" });
    }
    return goods;
  }
  const GOODS = buildGoods();

  const SAY = [
    "「いらっしゃい…たこ。オクトで“未来”を買うの、すき…たこ？」",
    "「種は物語…水は運…肥料は代償…たこ。」",
    "「まとめ買い？……いいね。焼き台が“鳴く”たこ…」",
    "「買うボタンは“契約”…押した瞬間、世界が少し変わる…たこ。」"
  ];

  // =========================================================
  // ✅ modal：Chrome/Safariで null 固定を回避（都度取得）
  // =========================================================
  function getModalEls(){
    return {
      modal: document.getElementById("modal"),
      bg:    document.getElementById("modalBg"),
      x:     document.getElementById("modalX"),
      title: document.getElementById("modalTitle"),
      body:  document.getElementById("modalBody"),
    };
  }

  function forceModalStyle(modal){
    if(!modal) return;
    modal.style.setProperty("position","fixed","important");
    modal.style.setProperty("inset","0","important");
    modal.style.setProperty("z-index","2147483646","important");
    modal.style.setProperty("display","block","important");
    modal.style.setProperty("pointer-events","auto","important");
  }

  function openModal(title, html){
    const { modal, title:ttl, body } = getModalEls();
    if(!modal || !ttl || !body){
      toastHype("⚠️ modal要素が見つからない…たこ。", {kind:"bad"});
      return;
    }

    ttl.textContent = title || "メニュー";
    body.innerHTML = html || "";

    forceModalStyle(modal);
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden","false");

    requestAnimationFrame(() => {
      forceModalStyle(modal);
      modal.classList.add("is-open");
    });

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  function closeModal(){
    const { modal, body } = getModalEls();
    if(!modal) return;

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden","true");
    if(body) body.innerHTML = "";

    modal.style.removeProperty("display");
    modal.style.removeProperty("position");
    modal.style.removeProperty("inset");
    modal.style.removeProperty("z-index");
    modal.style.removeProperty("pointer-events");

    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  function wireModalClose(){
    const { bg, x } = getModalEls();
    bg?.addEventListener("click", closeModal);
    x?.addEventListener("click", closeModal);
    document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") closeModal(); });
  }

  // ---------- inventory helpers ----------
  function ownedCount(inv, kind, id){
    return Number((inv[kind]||{})[id] || 0);
  }
  function totalKind(inv, kind){
    const bucket = inv[kind] || {};
    let total = 0;
    for(const k of Object.keys(bucket)) total += Number(bucket[k] || 0);
    return total;
  }

  function ensureInvKeys(){
    const inv = loadInv();
    inv.seed  = inv.seed  || {};
    inv.water = inv.water || {};
    inv.fert  = inv.fert  || {};
    for(const g of GOODS){
      if(!(g.id in inv[g.kind])) inv[g.kind][g.id] = 0;
    }
    saveInv(inv);
    return inv;
  }

  function setTakopiSayRandom(){
    const t = SAY[Math.floor(Math.random()*SAY.length)];
    const el = $("#takopiSay");
    if(el) el.innerHTML = t;
  }

  function refreshHUD(){
    const inv = ensureInvKeys();

    $("#octoNow") && ($("#octoNow").textContent = String(getOcto()));
    $("#chipSeed")  && ($("#chipSeed").textContent  = String(totalKind(inv, "seed")));
    $("#chipWater") && ($("#chipWater").textContent = String(totalKind(inv, "water")));
    $("#chipFert")  && ($("#chipFert").textContent  = String(totalKind(inv, "fert")));

    // 図鑑UIは今回「本/リサイクル削除」指定なので値更新は残しつつ、表示はCSSで潰す
    $("#chipBookOwned") && ($("#chipBookOwned").textContent = String(calcBookOwned()));
    $("#chipBookDup")   && ($("#chipBookDup").textContent   = "0");

    const done = localStorage.getItem(LS.mikujiDate) === todayKey();
    const btnM = $("#btnMikuji");
    if(btnM){
      btnM.textContent = done ? "🎲 たこ焼きみくじ（本日済）" : "🎲 たこ焼きみくじ（1日1回）";
      btnM.disabled = done;
    }

    const claimed = localStorage.getItem(LS.launchGift) === "1";
    const giftBtn = $("#btnLaunchPresent");
    if(giftBtn){
      giftBtn.textContent = claimed ? "🎁 公開記念プレゼント（受取済）" : "🎁 公開記念プレゼント（1回だけ）";
      giftBtn.disabled = claimed;
    }
  }

  // =========================================================
  // ✅ toast
  // =========================================================
  function ensureToast(){
    let el = $("#toast");
    if(!el){
      el = document.createElement("div");
      el.id = "toast";
      el.setAttribute("aria-live","polite");
      document.body.appendChild(el);
    }
    return el;
  }

  function forceToastStyle(el){
    el.style.setProperty("position","fixed","important");
    el.style.setProperty("left","12px","important");
    el.style.setProperty("right","12px","important");
    el.style.setProperty("bottom","14px","important");
    el.style.setProperty("z-index","2147483647","important");
    el.style.setProperty("pointer-events","none","important");

    el.style.setProperty("padding","14px 14px","important");
    el.style.setProperty("border-radius","14px","important");
    el.style.setProperty("font-weight","900","important");
    el.style.setProperty("letter-spacing",".02em","important");
    el.style.setProperty("text-align","center","important");

    el.style.setProperty("color","#fff","important");
    el.style.setProperty("background","rgba(15,18,32,.92)","important");
    el.style.setProperty("border","1px solid rgba(255,255,255,.16)","important");
    el.style.setProperty("box-shadow","0 18px 44px rgba(0,0,0,.55)","important");
    el.style.setProperty("backdrop-filter","blur(6px)","important");
    el.style.setProperty("-webkit-backdrop-filter","blur(6px)","important");
  }

  function toastHype(text, opt={}){
    const el = ensureToast();
    forceToastStyle(el);

    const kind = opt.kind || "info";
    el.textContent = text || "";

    if(kind === "good"){
      el.style.setProperty("border","1px solid rgba(159,255,168,.35)","important");
      el.style.setProperty("box-shadow","0 18px 44px rgba(0,0,0,.55), 0 0 22px rgba(159,255,168,.18)","important");
    }else if(kind === "bad"){
      el.style.setProperty("border","1px solid rgba(255,154,165,.38)","important");
      el.style.setProperty("box-shadow","0 18px 44px rgba(0,0,0,.55), 0 0 22px rgba(255,154,165,.16)","important");
    }else{
      el.style.setProperty("border","1px solid rgba(255,255,255,.16)","important");
      el.style.setProperty("box-shadow","0 18px 44px rgba(0,0,0,.55)","important");
    }

    clearTimeout(toastHype._t);
    el.style.setProperty("transition","none","important");
    el.style.setProperty("opacity","0","important");
    el.style.setProperty("transform","translateY(10px) scale(.98)","important");
    void el.offsetHeight;

    requestAnimationFrame(()=>{
      el.style.setProperty("transition","opacity .16s ease, transform .18s ease","important");
      el.style.setProperty("opacity","1","important");
      el.style.setProperty("transform","translateY(0) scale(1)","important");
    });

    toastHype._t = setTimeout(()=>{
      el.style.setProperty("opacity","0","important");
      el.style.setProperty("transform","translateY(10px) scale(.98)","important");
    }, 1900);
  }

  // =========================================================
  // ✅ CSS注入：所持バッジ + ボタン小型化 + 今回のUI調整
  // =========================================================
  function injectBuyRowCSS(){
    if($("#_roten_buyrow_css")) return;
    const style = document.createElement("style");
    style.id = "_roten_buyrow_css";
    style.textContent = `
      .miniTag{
        display:inline-flex;
        align-items:center;
        padding: 3px 8px;
        border-radius: 999px;
        border:1px solid rgba(255,255,255,.14);
        background: rgba(0,0,0,.16);
        font-size: 11px;
        opacity:.9;
        margin-left: 6px;
        white-space: nowrap;
      }

      .good .good-img{ position: relative !important; }
      .good .ownBadge{
        position:absolute;
        top: 6px;
        right: 6px;
        z-index: 2;
        padding: 4px 8px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 900;
        letter-spacing: .02em;
        color: rgba(255,255,255,.95);
        background: rgba(0,0,0,.55);
        border: 1px solid rgba(255,255,255,.18);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        pointer-events: none;
        user-select: none;
        white-space: nowrap;
      }
      .good .ownBadge b{ color:#fff; }

      .good .buybar{
        display:flex !important;
        flex-direction:row !important;
        align-items:center !important;
        justify-content:flex-end !important;
        gap:8px !important;
        flex-wrap:nowrap !important;
      }
      .good .qty{
        display:flex !important;
        align-items:center !important;
        gap:6px !important;
        flex: 0 0 auto !important;
      }

      .good .qty .qtybtn{
        min-width: 38px !important;
        height: 38px !important;
        padding: 0 10px !important;
        border-radius: 12px !important;
        font-weight: 900 !important;
        font-size: 14px !important;
      }
      .good .qty .qtyin{
        width: 56px !important;
        height: 38px !important;
        text-align:center !important;
        border-radius: 12px !important;
        border:1px solid rgba(255,255,255,.18) !important;
        background:rgba(0,0,0,.22) !important;
        color:#fff !important;
        font-weight:900 !important;
        font-size: 14px !important;
      }
      .good .buybar .buybtn{
        height: 38px !important;
        min-width: 92px !important;
        border-radius: 12px !important;
        flex: 0 0 auto !important;
        white-space:nowrap !important;
        font-weight: 900 !important;
        font-size: 13px !important;
        padding: 0 12px !important;
      }

      .good .priceline{
        margin-top: 6px;
        font-size: 12px;
        color: rgba(255,255,255,.72);
        text-align:right;
        white-space: nowrap;
      }
      .good .priceline b{ color: rgba(255,255,255,.92); }

      .good .buyhint{ display:none !important; }

      /* ✅ 所持資材ボタン削除（HTML触らないのでJS側で非表示化） */
      #btnOpenInv{ display:none !important; }

      /* ✅ 図鑑（本/リサイクル）UI削除 */
      #chipBookOwned, #chipBookDup{ display:none !important; }

      /* ✅ チップをタップ可能に（カーソル/押し込み感） */
      #chipSeed, #chipWater, #chipFert{
        cursor:pointer;
        user-select:none;
        -webkit-tap-highlight-color: transparent;
      }
      #chipSeed:active, #chipWater:active, #chipFert:active{
        transform: translateY(1px);
      }

      /* ✅ 右端寄せの説明ボタン（移動先の器が取れた場合） */
      .roten-about-wrap{
        display:flex;
        justify-content:flex-end;
        align-items:center;
        gap:10px;
        width:100%;
        margin: 10px 0 2px;
      }
      .roten-about-btn{
        height: 36px !important;
        padding: 0 12px !important;
        border-radius: 12px !important;
        font-weight: 900 !important;
        font-size: 12px !important;
        white-space: nowrap !important;
      }

      @media (max-width: 420px){
        .good .buybar{ gap:7px !important; }
        .good .buybar .buybtn{ min-width: 86px !important; }
        .good .qty .qtyin{ width: 52px !important; }
        .roten-about-btn{ font-size: 12px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  // ---------- purchase logic ----------
  function clamp(n, min, max){
    n = Math.floor(Number(n)||0);
    if(n < min) return min;
    if(n > max) return max;
    return n;
  }

  function buyMany(item, qty){
    qty = clamp(qty, 1, 99);
    const price = Math.max(0, Number(item.price||0));
    const total = price * qty;
    const octo = getOcto();
    if(octo < total) return { ok:false, need: total, has: octo };

    const inv = ensureInvKeys();
    inv[item.kind] = inv[item.kind] || {};
    inv[item.kind][item.id] = Number(inv[item.kind][item.id] || 0) + qty;
    saveInv(inv);

    setOcto(octo - total);
    pushLog(`購入：${item.name} ×${qty} -${total}オクト`);

    refreshHUD();
    renderGoods();
    setTakopiSayRandom();
    return { ok:true, total, qty, price };
  }

  // ---------- render goods ----------
  let currentKind = "seed";

  function renderGoods(){
    const inv = ensureInvKeys();
    const grid = $("#goodsGrid");
    if(!grid) return;

    const list = GOODS.filter(g => g.kind === currentKind);

    grid.innerHTML = list.map(g => {
      const own = String(ownedCount(inv, g.kind, g.id));
      const canBuy = !!g.buyable;
      const badge = g.tag ? `<span class="miniTag">${g.tag}</span>` : "";

      const priceLine = canBuy
        ? `<div class="priceline">単価 <b>${g.price}</b> オクト</div>`
        : `<div class="priceline">単価 <b>—</b>（シリアル）</div>`;

      const buyBar = canBuy ? `
        <div class="buybar">
          <div class="qty">
            <button class="btn qtybtn qtyminus" type="button" aria-label="減らす">−</button>
            <input class="qtyin" type="number" inputmode="numeric" min="1" max="99" value="1">
            <button class="btn qtybtn qtyplus" type="button" aria-label="増やす">＋</button>
          </div>
          <button class="btn buybtn" type="button">買う</button>
        </div>
        ${priceLine}
      ` : `
        <div class="buybar">
          <div style="opacity:.78; font-size:12px; text-align:right; flex:1; white-space:nowrap;">
            シリアルで増える…たこ。
          </div>
          <button class="btn buybtn" type="button">シリアル</button>
        </div>
        ${priceLine}
      `;

      return `
        <article class="good" data-kind="${g.kind}" data-id="${g.id}">
          <div class="good-top">
            <div class="good-img">
              <span class="ownBadge">×<b>${own}</b></span>
              <img src="${g.img}" alt="${g.name}" loading="lazy">
            </div>
            <div class="good-meta">
              <div class="good-name">${g.name} ${badge}</div>
              <div class="good-desc">${(g.desc||"").replace(/\\n/g,"<br>")}</div>
              <div class="good-fx">${g.fx ? `効果：<b>${g.fx}</b>` : ""}</div>
            </div>
          </div>

          <div class="good-row">
            <div class="good-buy">${buyBar}</div>
          </div>
        </article>
      `;
    }).join("");

    $$(".good", grid).forEach(card => {
      const kind = card.getAttribute("data-kind");
      const id   = card.getAttribute("data-id");
      const item = GOODS.find(x => x.kind===kind && x.id===id);
      if(!item) return;

      const btn   = $(".buybtn", card);
      const minus = $(".qtyminus", card);
      const plus  = $(".qtyplus", card);
      const qtyIn = $(".qtyin", card);

      function getQty(){
        const v = qtyIn ? Number(qtyIn.value || 1) : 1;
        return clamp(v, 1, 99);
      }
      function setQty(v){
        if(!qtyIn) return;
        qtyIn.value = String(clamp(v, 1, 99));
      }

      minus?.addEventListener("click", (e)=>{
        e.preventDefault(); e.stopPropagation();
        setQty(getQty() - 1);
      });
      plus?.addEventListener("click", (e)=>{
        e.preventDefault(); e.stopPropagation();
        setQty(getQty() + 1);
      });
      qtyIn?.addEventListener("input", ()=>{
        setQty(getQty());
      });

      btn?.addEventListener("click", (e)=>{
        e.preventDefault(); e.stopPropagation();

        if(!item.buyable){
          openSerialModal();
          setTakopiSayRandom();
          return;
        }

        const qty = getQty();
        const r = buyMany(item, qty);
        if(!r.ok){
          toastHype("💥 オクトが足りない…たこ。", {kind:"bad"});
          return;
        }

        toastHype(`✨ 購入完了！「${item.name}」×${r.qty}（-${r.total}オクト）✨`, {kind:"good"});
      });
    });
  }

  // =========================================================
  // ✅ 所持チップ（🌱/💧/🧪）タップ → 内訳モーダル
  // =========================================================
  function openBreakdownModal(kindKey){
    const inv = ensureInvKeys();
    const titleMap = { seed:"🌱 種の内訳", water:"💧 水の内訳", fert:"🧪 肥料の内訳" };
    const items = GOODS.filter(g => g.kind === kindKey);

    const rows = items.map(g => {
      const c = String(ownedCount(inv, g.kind, g.id));
      const memo = (!g.buyable && g.id==="seed_colabo") ? "（シリアル限定）" : "";
      return `
        <div class="inv-row">
          <div class="inv-left">
            <span class="inv-name">${g.name}</span>
            <span class="inv-memo">${memo}</span>
          </div>
          <div class="inv-right">×<b>${c}</b></div>
        </div>
      `;
    }).join("");

    openModal(titleMap[kindKey] || "📦 内訳", `
      <div class="mikuji-wrap">
        <div class="note">※所持数は <b>tf_v1_inv</b>（ファーム在庫）と完全連動。</div>
        <div class="inv-box">
          <div class="inv-title">${titleMap[kindKey] || "内訳"}</div>
          ${rows || `<div class="note">まだ何もない…たこ。</div>`}
        </div>
        <div class="row">
          <button class="btn btn-ghost" id="okBreakdown" type="button">閉じる</button>
        </div>
      </div>
    `);

    const root = document.getElementById("modalBody") || document;
    $("#okBreakdown", root)?.addEventListener("click", closeModal);
  }

  function wireChipBreakdowns(){
    const seed = $("#chipSeed");
    const water = $("#chipWater");
    const fert = $("#chipFert");

    // 既存の“表示用”のままでもクリックできるように（HTML変更なし）
    seed?.addEventListener("click", () => { openBreakdownModal("seed"); setTakopiSayRandom(); });
    water?.addEventListener("click", () => { openBreakdownModal("water"); setTakopiSayRandom(); });
    fert?.addEventListener("click", () => { openBreakdownModal("fert"); setTakopiSayRandom(); });
  }

  // =========================================================
  // ✅ シリアル
  // =========================================================
  function loadUsedCodes(){
    const obj = loadJSON(LS.codesUsed, {});
    return (obj && typeof obj === "object") ? obj : {};
  }
  function saveUsedCodes(obj){
    saveJSON(LS.codesUsed, obj);
  }
  function getDeviceId(){
    let id = localStorage.getItem(LS.deviceId);
    if(!id){
      id = "dev_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(LS.deviceId, id);
    }
    return id;
  }
  async function redeemOnServer(code){
    const body = {
      apiKey: REDEEM_API_KEY,
      code,
      deviceId: getDeviceId(),
      app: "roten",
      ts: Date.now()
    };

    const res = await fetch(REDEEM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(()=>null);
    if(!data || typeof data.ok !== "boolean"){
      throw new Error("サーバー応答不正");
    }
    return data;
  }
  function applyRedeemReward(reward){
    const inv = ensureInvKeys();
    const add = Math.max(0, Math.floor(Number(reward?.seed_colabo || 0) || 0));
    if(add > 0){
      inv.seed["seed_colabo"] = Number(inv.seed["seed_colabo"]||0) + add;
      saveInv(inv);
    }
    return { addedSeedColabo: add };
  }

  function openSerialModal(){
    openModal("🔑 シリアル入力（コラボのタネ）", `
      <div class="pop-wrap">
        <div class="note">
          「コラボのタネ」は <b>購入できない</b>。<br>
          シリアルを入力すると在庫が増える…たこ。
        </div>

        <div class="serial-row">
          <input id="redeemCode" class="serial-in" type="text" placeholder="例：TC-XXXX-XXXX" autocomplete="off">
          <button id="redeemBtn" class="btn big" type="button">使う</button>
        </div>

        <div class="row">
          <button class="btn btn-ghost" id="serialClose" type="button">閉じる</button>
        </div>
      </div>
    `);

    const root = document.getElementById("modalBody") || document;
    $("#serialClose", root)?.addEventListener("click", closeModal);

    $("#redeemBtn", root)?.addEventListener("click", async () => {
      const code = ($("#redeemCode", root)?.value || "").trim().toUpperCase();
      if(!code){ alert("コードを入力してね"); return; }

      const used = loadUsedCodes();
      if(used[code]){ alert("このコードは（この端末では）使用済み。"); return; }

      const btn = $("#redeemBtn", root);
      if(btn){ btn.disabled = true; btn.textContent = "確認中…"; }

      try{
        const data = await redeemOnServer(code);
        if(!data.ok){
          alert(data.message || data.error || "無効なコードです。");
          return;
        }

        const reward = data.reward || data.grant || {};
        const applied = applyRedeemReward(reward);

        used[code] = { at: Date.now(), payload: reward };
        saveUsedCodes(used);

        pushLog(`シリアル：${code}（コラボのタネ +${applied.addedSeedColabo}）`);
        toastHype(`✨ 成功！コラボのタネ +${applied.addedSeedColabo} ✨`, {kind:"good"});
        refreshHUD();
        renderGoods();
        closeModal();
      }catch(err){
        alert(err?.message || "通信に失敗した…たこ。時間を置いてもう一度。");
      }finally{
        if(btn){ btn.disabled = false; btn.textContent = "使う"; }
      }
    });
  }

  function wireSerialInline(){
    const input = $("#serialInlineInput");
    const btn   = $("#serialInlineBtn");
    if(!input || !btn) return;

    const run = async () => {
      const code = (input.value || "").trim().toUpperCase();
      if(!code) return;

      const used = loadUsedCodes();
      if(used[code]) return;

      btn.disabled = true;

      try{
        const data = await redeemOnServer(code);
        if(!data.ok) return;

        const reward = data.reward || data.grant || {};
        const applied = applyRedeemReward(reward);

        used[code] = { at: Date.now(), payload: reward };
        saveUsedCodes(used);

        input.value = "";
        pushLog(`シリアル：${code}（コラボのタネ +${applied.addedSeedColabo}）`);

        refreshHUD();
        renderGoods();
        toastHype(`✨ 成功！コラボのタネ +${applied.addedSeedColabo} ✨`, {kind:"good"});
      }catch(e){
        // noop
      }finally{
        btn.disabled = false;
      }
    };

    btn.addEventListener("click", run);
    input.addEventListener("keydown", (e)=>{ if(e.key === "Enter") run(); });
  }

  // =========================================================
  // ✅ 《タネ、ミズ、ヒリョウについて》モーダル（丁寧説明）
  // =========================================================
  function openAboutModal(){
    openModal("📘 タネ、ミズ、ヒリョウについて", `
      <div class="mikuji-wrap">
        <div class="note">
          ここは「説明書」じゃなく、<b>当たりを引くための作戦メモ</b>…たこ。<br>
          ※最終的な抽選は “ファーム側の収穫ロジック” に従う…たこ。
        </div>

        <div class="inv-box">
          <div class="inv-title">🌱 タネ（何を育てるか）</div>
          <div class="note">
            <b>タネは「カードの候補（出るプール）」</b>を決める入口…たこ。<br>
            ・<b>なに出るタネ</b>：候補が広い（完全ランダム）<br>
            ・<b>店頭/回線タネ</b>：候補が“それっぽく”寄る（店頭/回線の気配）<br>
            ・<b>たこぴのタネ</b>：今は静か…でも未来で化ける枠（演出用・特別枠）<br>
            ・<b>ブッ刺さり/なまら買わさる</b>：高額＝強い体験枠（期待値というより“物語”）<br>
            ・<b>【コラボ】</b>：購入不可。<b>シリアルでのみ増える</b>…たこ。
          </div>
        </div>

        <div class="inv-box">
          <div class="inv-title">💧 ミズ（レア度の押し上げ）</div>
          <div class="note">
            <b>ミズは「レア抽選の上振れ」を起こす</b>役…たこ。<br>
            下ほど“期待が上がる”代わりに、財布が乾く…たこ。<br><br>

            ・<b>ただの水</b>：基準。<b>UR/LRは出ない</b>（安全だが夢は少なめ）<br>
            ・<b>なんか良さそう</b>：少しだけ上振れ（初心者向け）<br>
            ・<b>怪しい水</b>：現実準拠の標準（普段の空気）<br>
            ・<b>やりすぎな水</b>：勝負。上振れを狙う水<br>
            ・<b>押さなきゃよかった水</b>：事件枠。<b>“強い結果”が出やすい</b>（SNS向け）
          </div>
        </div>

        <div class="inv-box">
          <div class="inv-title">🧪 ヒリョウ（時間/事故率の調整）</div>
          <div class="note">
            <b>ヒリョウは「時短」と「事故（焼きすぎ/生焼け）」</b>を触る…たこ。<br><br>

            ・<b>ただの揚げ玉</b>：時短0。<b>焼きすぎたカード</b>が起きやすい（交換素材向け）<br>
            ・<b>気のせい肥料</b>：時短少し（体感レベル）<br>
            ・<b>根性論ぶち込み</b>：時短20%（急ぎたい人）<br>
            ・<b>工程すっ飛ばし</b>：時短40%（焦げリスクも“それなり”）<br>
            ・<b>時間を信じない</b>：時短90〜100%。<b>稀にドロドロ生焼け</b>（禁忌。面白さ最優先）
          </div>
        </div>

        <div class="row">
          <button class="btn btn-ghost" id="okAbout" type="button">閉じる</button>
        </div>
      </div>
    `);

    const root = document.getElementById("modalBody") || document;
    $("#okAbout", root)?.addEventListener("click", closeModal);
  }

  // ✅ ボタンを「購入（タップで買う）」の右横へ（HTML変更なしで探して寄せる）
  function placeAboutButton(){
    let btn = $("#btnOpenRates");
    if(!btn){
      // 無ければ作る（壊れにくい）
      btn = document.createElement("button");
      btn.id = "btnOpenRates";
      btn.className = "btn roten-about-btn";
      btn.type = "button";
      btn.textContent = "《タネ、ミズ、ヒリョウについて》";
      document.body.appendChild(btn);
    }

    // 表示名を更新
    btn.textContent = "《タネ、ミズ、ヒリョウについて》";
    btn.classList.add("roten-about-btn");

    // 置き場を探す：ボタン/見出しの文言に「購入」「タップで買う」が含まれる要素の近くへ
    const candidates = $$("h1,h2,h3,h4,div,section,p,span,button,a").filter(el => {
      const t = (el.textContent || "").replace(/\s+/g,"");
      return t.includes("購入") || t.includes("タップで買う");
    });

    // なるべく“下のUI帯”っぽい場所へ（最後の候補）
    const anchor = candidates.length ? candidates[candidates.length - 1] : null;

    // 右寄せの器（wrap）を用意
    const wrap = document.createElement("div");
    wrap.className = "roten-about-wrap";
    wrap.appendChild(btn);

    // 既に wrap が置かれてたら更新だけ
    const existingWrap = $("#_roten_about_wrap");
    if(existingWrap){
      existingWrap.innerHTML = "";
      existingWrap.appendChild(btn);
      return;
    }
    wrap.id = "_roten_about_wrap";

    if(anchor && anchor.parentElement){
      // “購入”の行の直後に差し込む
      anchor.parentElement.insertBefore(wrap, anchor.nextSibling);
    }else{
      // 無理ならトップ付近（壊れない）
      const app = $("#rotenApp") || document.body;
      app.insertBefore(wrap, app.firstChild);
    }
  }

  // =========================================================
  // ✅ たこ焼きみくじ（おみくじ版：オクト指定反映）
  // =========================================================
  const OMKUJI = [
    { w: 8,  luck:"大吉", kind:"seed",  id:"seed_special", qty:1, octo:7777, label:"たこぴのタネ×1 + オクト+7777",
      msg:"焼き台が歌ってる…たこ。今日は“伝説”が出る…たこ。" },
    { w: 18, luck:"中吉", kind:"water", id:"water_regret", qty:1, octo:3000, label:"押さなきゃよかった水×1 + オクト+3000",
      msg:"事件の匂い…たこ。SNS向けの運…たこ。" },
    { w: 28, luck:"末吉", kind:"water", id:"water_overdo", qty:1, octo:1000, label:"やりすぎな水×1 + オクト+1000",
      msg:"勝負の一滴…たこ。うまく焼けるといいね…たこ。" },
    { w: 28, luck:"凶",   kind:"fert",  id:"fert_skip",    qty:1, octo: 500, label:"工程すっ飛ばし肥料×1 + オクト+500",
      msg:"焦ると…焼ける…たこ。近道はだいたい罠…たこ。" },
    { w: 18, luck:"大凶", kind:"octo",  id:"octo",         qty:1, octo:   1, label:"オクト+1",
      msg:"……大凶でも、1オクトは“希望”…たこ。明日がある…たこ。" },
  ];

  function pickWeighted(list){
    const sum = list.reduce((a,b)=>a + (Number(b.w)||0), 0);
    let r = Math.random() * sum;
    for(const it of list){
      r -= (Number(it.w)||0);
      if(r <= 0) return it;
    }
    return list[0];
  }

  function applyReward(reward){
    if(Number(reward.octo) > 0) addOcto(Number(reward.octo));
    if(reward.kind === "octo") return;

    const inv = ensureInvKeys();
    inv[reward.kind] = inv[reward.kind] || {};
    inv[reward.kind][reward.id] = Number(inv[reward.kind][reward.id] || 0) + Number(reward.qty || 1);
    saveInv(inv);
  }

  function openMikuji(){
    const done = localStorage.getItem(LS.mikujiDate) === todayKey();
    if(done){
      openModal("🎲 たこ焼きみくじ", `<div class="mikuji-wrap"><div class="note">今日はもう引いた…たこ。明日またおいで…たこ。</div></div>`);
      return;
    }

    const ballImg = "https://ul.h3z.jp/PHREbelx.png";

    openModal("🎲 たこ焼きみくじ（1日1回）", `
      <div class="mikuji-wrap">
        <div class="note">
          たこぴ：<br>
          「焼き台から1つ選んで…たこ。<br>
          運勢が出る…たこ。」
        </div>

        <div class="grill" id="grill">
          ${Array.from({length:9}).map((_,i)=>`
            <button class="ball" type="button" data-i="${i}">
              <img src="${ballImg}" alt="たこ焼き">
            </button>
          `).join("")}
        </div>

        <div class="note">※押した瞬間、今日の運命が確定する…たこ。</div>
      </div>
    `);

    const root = document.getElementById("modalBody") || document;
    const grill = $("#grill", root);
    $$(".ball", grill).forEach(b => {
      b.addEventListener("click", () => doMikuji(), { once:true });
    });
  }

  function doMikuji(){
    const r = pickWeighted(OMKUJI);

    applyReward(r);
    localStorage.setItem(LS.mikujiDate, todayKey());
    pushLog(`みくじ：${r.luck} / ${r.label}`);

    openModal("🎴 おみくじ結果", `
      <div class="mikuji-wrap">
        <div style="
          text-align:center;
          font-weight:1000;
          font-size:44px;
          letter-spacing:.08em;
          line-height:1;
          margin: 8px 0 10px;
        ">${r.luck}</div>

        <div style="
          text-align:center;
          font-weight:900;
          font-size:16px;
          margin-bottom: 10px;
        ">${r.label}</div>

        <div class="note" style="text-align:center;">
          たこぴ：<br>「${r.msg}」
        </div>

        <div class="row">
          <button class="btn big" id="okMikuji" type="button">OK</button>
        </div>
      </div>
    `);

    const root = document.getElementById("modalBody") || document;
    $("#okMikuji", root)?.addEventListener("click", () => {
      closeModal();
      refreshHUD();
      renderGoods();
    });
  }

  // ---------- launch present ----------
  function openLaunchPresent(){
    const claimed = localStorage.getItem(LS.launchGift) === "1";
    if(claimed){
      openModal("🎁 公開記念プレゼント", `<div class="mikuji-wrap"><div class="note">もう受け取った…たこ。大事に使って…たこ。</div></div>`);
      return;
    }

    openModal("🎁 公開記念プレゼント（1回だけ）", `
      <div class="mikuji-wrap">
        <div class="note">
          たこぴ：<br>
          「ホームページ公開記念…たこ。<br>
          “最初の火種”をあげる…たこ。」
        </div>

        <div class="inv-box">
          <div class="inv-title">内容</div>
          <div class="note">🌱 店頭タネ×15</div>
          <div class="note">🌱 回線タネ×15</div>
          <div class="note">🌱 たこぴのタネ×1</div>
          <hr class="sep">
          <div class="note">💧 なんか良さそう×10 / 怪しい×10 / やりすぎ×10</div>
          <div class="note">🧪 気のせい×10 / 根性×10 / 工程すっ飛ばし×10</div>
        </div>

        <div class="row">
          <button class="btn big" id="claimGift" type="button">受け取る（取り消し不可）</button>
          <button class="btn btn-ghost" id="cancelGift" type="button">やめる</button>
        </div>

        <div class="note">※1回だけ。押したら戻れない…たこ。</div>
      </div>
    `);

    const root = document.getElementById("modalBody") || document;
    $("#cancelGift", root)?.addEventListener("click", closeModal);
    $("#claimGift", root)?.addEventListener("click", () => {
      claimLaunchGift();
      closeModal();
    });
  }

  function claimLaunchGift(){
    const inv = ensureInvKeys();

    inv.seed["seed_shop"]    = Number(inv.seed["seed_shop"]||0) + 15;
    inv.seed["seed_line"]    = Number(inv.seed["seed_line"]||0) + 15;
    inv.seed["seed_special"] = Number(inv.seed["seed_special"]||0) + 1;

    inv.water["water_nice"]       = Number(inv.water["water_nice"]||0) + 10;
    inv.water["water_suspicious"] = Number(inv.water["water_suspicious"]||0) + 10;
    inv.water["water_overdo"]     = Number(inv.water["water_overdo"]||0) + 10;

    inv.fert["fert_feel"] = Number(inv.fert["fert_feel"]||0) + 10;
    inv.fert["fert_guts"] = Number(inv.fert["fert_guts"]||0) + 10;
    inv.fert["fert_skip"] = Number(inv.fert["fert_skip"]||0) + 10;

    saveInv(inv);
    localStorage.setItem(LS.launchGift, "1");
    pushLog("公開記念プレゼント受取");

    setTakopiSayRandom();
    refreshHUD();
    renderGoods();
    toastHype("🎁 プレゼント受取！", {kind:"good"});
  }

  // ---------- wiring ----------
  function wireTabs(){
    $$(".goods-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        $$(".goods-tab").forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        currentKind = btn.getAttribute("data-kind") || "seed";
        renderGoods();
      });
    });
  }

  function wireButtons(){
    $("#btnDebugPlus1000")?.addEventListener("click", () => {
      addOcto(1000);
      pushLog("デバッグ：オクト +1000");
      refreshHUD();
      setTakopiSayRandom();
      toastHype("🧪 オクト +1000！", {kind:"good"});
    });

    // ✅ 所持資材ボタンは削除（クリックしても何もしない）
    $("#btnOpenInv")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toastHype("📦 所持内訳は、上の 🌱/💧/🧪 をタップ…たこ。", {kind:"info"});
    });

    // ✅ 新：説明ボタン
    $("#btnOpenRates")?.addEventListener("click", () => {
      openAboutModal();
      setTakopiSayRandom();
    });

    $("#btnMikuji")?.addEventListener("click", () => {
      openMikuji();
      setTakopiSayRandom();
    });

    $("#btnLaunchPresent")?.addEventListener("click", () => {
      openLaunchPresent();
      setTakopiSayRandom();
    });

    $("#btnOpenSell")?.addEventListener("click", () => {
      toastHype("🏮 売却ページを開いた！", {kind:"info"});
      setTakopiSayRandom();
    });
  }

  function boot(){
    ensureToast();
    injectBuyRowCSS();
    ensureInvKeys();

    // ✅ ボタン移動＆名称変更（HTML触らない）
    placeAboutButton();

    setTakopiSayRandom();
    wireModalClose();
    wireTabs();
    wireButtons();
    wireSerialInline();
    wireChipBreakdowns();

    refreshHUD();
    renderGoods();
    toastHype("✨ 露店 起動！…たこ。", {kind:"info"});
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot, { once:true });
  }else{
    boot();
  }
})();



