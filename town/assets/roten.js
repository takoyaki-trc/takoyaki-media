/* =========================================================
   roten.js（RPG武器屋風：たこぴのお店）完全版
   - 資材在庫: tf_v1_inv（seed/water/fert）と連動
   - 図鑑: tf_v1_book（got[id].count 合計を表示）
   - オクト: roten_v1_octo
   - みくじ: 1日1回 / 公開記念: 1回
   - ✅無料→有料（seed_random / water_plain_free / fert_agedama も有料化）
   - ✅コラボのタネ（seed_colabo）は購入不可（シリアルのみ）
   - ✅ファーム側の SEEDS/WATERS/FERTS 画像・説明・効果を優先反映
   - ✅スマホでポップアップが「出ない」を防ぐ（即閉じ/タップ差対策）
   - ✅売却ページ：新規タブで開く（zukan.html 想定）
========================================================= */
(() => {
  "use strict";

  /* =========================
     Keys（ファーム/図鑑と共通）
  ========================== */
  const LS = {
    octo: "roten_v1_octo",
    inv: "tf_v1_inv",
    book: "tf_v1_book",
    mikujiDate: "roten_v1_mikuji_date",
    launchGift: "roten_v1_launch_gift_claimed",
    log: "roten_v1_log",
    codesUsed: "tf_v1_codes_used" // ←ファーム側と共通
  };

  /* =========================
     Utils
  ========================== */
  const $ = (sel, root=document) => root.querySelector(sel);
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

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function getOcto(){
    return Number(localStorage.getItem(LS.octo) || 0);
  }
  function setOcto(v){
    localStorage.setItem(LS.octo, String(Math.max(0, Math.floor(Number(v)||0))));
  }

  function invDefault(){
    return { ver:1, seed:{}, water:{}, fert:{} };
  }
  function loadInv(){
    const inv = loadJSON(LS.inv, invDefault());
    inv.seed = inv.seed || {};
    inv.water = inv.water || {};
    inv.fert = inv.fert || {};
    return inv;
  }
  function saveInv(inv){
    saveJSON(LS.inv, inv);
  }

  function pushLog(msg){
    const a = loadJSON(LS.log, []);
    a.unshift({ t: Date.now(), msg });
    saveJSON(LS.log, a.slice(0, 80));
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

  function ownedCount(inv, kind, id){
    const bucket = inv[kind] || {};
    return Number(bucket[id] || 0);
  }

  function totalKind(inv, kind){
    const bucket = inv[kind] || {};
    let total = 0;
    for(const k of Object.keys(bucket)){
      total += Number(bucket[k] || 0);
    }
    return total;
  }

  function toBr(s){
    return String(s||"").replace(/\n/g,"<br>");
  }

  // タイトルがスマホで縦割れしないように「短く見せる」補助（必要なら）
  function safeTitle(name){
    // 先頭/末尾の装飾を残しつつ、改行ポイントを作りやすくする
    return String(name||"").replace(/】/g,"】").trim();
  }

  /* =========================
     ファーム側の定義を露店へ反映
     （あなたが貼ったファーム情報を“露店でも同じ内容”にする）
  ========================== */
  const FARM_SEEDS = [
    { id:"seed_random",  name:"【なに出るタネ】", desc:"何が育つかは完全ランダム。\n店主も知らない。",          img:"https://ul.h3z.jp/gnyvP580.png", fx:"完全ランダム", canBuy:true },
    { id:"seed_shop",    name:"【店頭タネ】",     desc:"店で生まれたタネ。\n店頭ナンバーを宿している。",        img:"https://ul.h3z.jp/IjvuhWoY.png", fx:"店頭の気配",   canBuy:true },
    { id:"seed_line",    name:"【回線タネ】",     desc:"画面の向こうから届いたタネ。\nクリックすると芽が出る。", img:"https://ul.h3z.jp/AonxB5x7.png", fx:"回線由来",     canBuy:true },
    { id:"seed_special", name:"【たこぴのタネ】", desc:"今はまだ何も起きない。\nそのうち何か起きる。",          img:"https://ul.h3z.jp/29OsEvjf.png", fx:"待て",         canBuy:true },
    // ★コラボ種：購入不可（シリアルのみ）
    { id:"seed_colabo",  name:"【コラボのタネ】", desc:"今はまだ何も起きない。\nそのうち何か起きる。",          img:"https://ul.h3z.jp/AWBcxVls.png", fx:"シリアル解放", canBuy:false },
  ];

  const FARM_WATERS = [
    { id:"water_plain_free", name:"《ただの水》",           desc:"無料・UR/LRなし。\n無課金の基準。",         img:"https://ul.h3z.jp/13XdhuHi.png", fx:"基準（水）",        canBuy:true },
    { id:"water_nice",       name:"《なんか良さそうな水》", desc:"ちょい上振れ・LRなし。\n初心者の背中押し。", img:"https://ul.h3z.jp/3z04ypEd.png", fx:"ちょい上振れ",      canBuy:true },
    { id:"water_suspicious", name:"《怪しい水》",           desc:"現実準拠・標準。\n実パックと同じ空気。",     img:"https://ul.h3z.jp/wtCO9mec.png", fx:"標準（現実準拠）",  canBuy:true },
    { id:"water_overdo",     name:"《やりすぎな水》",       desc:"勝負水・現実より上。\n体感で強い。",         img:"https://ul.h3z.jp/vsL9ggf6.png", fx:"勝負",              canBuy:true },
    { id:"water_regret",     name:"《押さなきゃよかった水》",desc:"確定枠・狂気。\n事件製造機（SNS向け）",     img:"https://ul.h3z.jp/L0nafMOp.png", fx:"事件",              canBuy:true },
  ];

  const FARM_FERTS = [
    { id:"fert_agedama", name:"①ただの揚げ玉",           desc:"時短0。\n《焼きすぎたカード》率UP",         img:"https://ul.h3z.jp/9p5fx53n.png", fx:"時短 0%",       canBuy:true },
    { id:"fert_feel",    name:"②《気のせい肥料》",       desc:"早くなった気がする。\n気のせいかもしれない。", img:"https://ul.h3z.jp/XqFTb7sw.png", fx:"時短 5%",       canBuy:true },
    { id:"fert_guts",    name:"③《根性論ぶち込み肥料》", desc:"理由はない。\n気合いだ。",                   img:"https://ul.h3z.jp/bT9ZcNnS.png", fx:"時短 20%",      canBuy:true },
    { id:"fert_skip",    name:"④《工程すっ飛ばし肥料》", desc:"途中は、\n見なかったことにした。",         img:"https://ul.h3z.jp/FqPzx12Q.png", fx:"時短 40%",      canBuy:true },
    { id:"fert_timeno",  name:"⑤《時間を信じない肥料》", desc:"最終兵器・禁忌。\n稀に《ドロドロ生焼けカード》", img:"https://ul.h3z.jp/l2njWY57.png", fx:"時短 90〜100%", canBuy:true },
  ];

  /* =========================
     価格（無料→有料へ）
     ※あなたの希望：無料のタネ/水/肥料も有料化
     ※コラボ種は購入不可
  ========================== */
  const PRICE = {
    // seeds
    seed_random:  12,
    seed_shop:    18,
    seed_line:    18,
    seed_special: 38,
    // seed_colabo: 購入不可

    // waters（例：段階）
    water_plain_free: 12,
    water_nice:       14,
    water_suspicious: 18,
    water_overdo:     26,
    water_regret:     40,

    // ferts
    fert_agedama:  12,
    fert_feel:     14,
    fert_guts:     18,
    fert_skip:     26,
    fert_timeno:   40,
  };

  /* =========================
     露店の商品マスター（ファーム定義を反映）
  ========================== */
  function buildGoods(){
    const goods = [];

    for(const s of FARM_SEEDS){
      goods.push({
        kind:"seed",
        id:s.id,
        name:s.name,
        desc:s.desc,
        fx:s.fx,
        img:s.img,
        canBuy: s.canBuy,
        price: PRICE[s.id] ?? 0
      });
    }
    for(const w of FARM_WATERS){
      goods.push({
        kind:"water",
        id:w.id,
        name:w.name,
        desc:w.desc,
        fx:w.fx,
        img:w.img,
        canBuy: w.canBuy,
        price: PRICE[w.id] ?? 0
      });
    }
    for(const f of FARM_FERTS){
      goods.push({
        kind:"fert",
        id:f.id,
        name:f.name,
        desc:f.desc,
        fx:f.fx,
        img:f.img,
        canBuy: f.canBuy,
        price: PRICE[f.id] ?? 0
      });
    }
    return goods;
  }
  const GOODS = buildGoods();

  const SAY = [
    "「いらっしゃい…たこ。<br>オクトで“未来”を買うの、すき…たこ？」",
    "「種は物語…水は運…肥料は代償…たこ。」",
    "「今日の君、ちょっと焼けた顔してる…たこ。」",
    "「買う？…買わない？…どっちでもいいけど、見ていきな…たこ。」"
  ];

  function setTakopiSayRandom(){
    const t = SAY[Math.floor(Math.random()*SAY.length)];
    const el = $("#takopiSay");
    if(el) el.innerHTML = t;
  }

  /* =========================
     Modal（スマホ“即閉じ”対策入り）
  ========================== */
  const modal = $("#modal");
  const modalBg = $("#modalBg");
  const modalX  = $("#modalX");
  const modalTitle = $("#modalTitle");
  const modalBody  = $("#modalBody");

  let modalJustOpened = false;

  function openModal(title, html){
    if(!modal || !modalTitle || !modalBody) return; // DOMなければ何もしない
    modalJustOpened = true;
    modalTitle.textContent = title || "メニュー";
    modalBody.innerHTML = html || "";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden","false");

    // ★スマホの同一タップで即閉じを防ぐ
    requestAnimationFrame(() => { modalJustOpened = false; });
  }
  function closeModal(){
    if(!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden","true");
  }

  // 背景タップで閉じる（ただし開いた直後は閉じない）
  modalBg?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if(modalJustOpened) return;
    closeModal();
  }, { passive:false });

  modalX?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
  }, { passive:false });

  // ESCでも閉じる（PC）
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && modal?.classList.contains("is-open")) closeModal();
  });

  /* =========================
     HUD
  ========================== */
  function refreshHUD(){
    const inv = loadInv();
    const octo = getOcto();

    const octoNow = $("#octoNow");
    if(octoNow) octoNow.textContent = String(octo);

    // 在庫合計
    $("#chipSeed")?.textContent  = String(totalKind(inv, "seed"));
    $("#chipWater")?.textContent = String(totalKind(inv, "water"));
    $("#chipFert")?.textContent  = String(totalKind(inv, "fert"));

    $("#chipBookOwned")?.textContent = String(calcBookOwned());

    // みくじ
    const done = localStorage.getItem(LS.mikujiDate) === todayKey();
    const btn = $("#btnMikuji");
    if(btn){
      btn.textContent = done ? "🎲 たこ焼きみくじ（本日済）" : "🎲 たこ焼きみくじ（1日1回）";
      btn.disabled = done;
    }

    // 公開記念
    const claimed = localStorage.getItem(LS.launchGift) === "1";
    const giftBtn = $("#btnLaunchPresent");
    if(giftBtn){
      giftBtn.textContent = claimed ? "🎁 公開記念プレゼント（受取済）" : "🎁 公開記念プレゼント（1回だけ）";
      giftBtn.disabled = claimed;
    }
  }

  /* =========================
     Goods render
     - スマホ崩れを減らす：タイトル/説明は自然改行（CSS依存）
  ========================== */
  let currentKind = "seed";

  function renderGoods(){
    const inv = loadInv();
    const grid = $("#goodsGrid");
    if(!grid) return;

    const list = GOODS.filter(g => g.kind === currentKind);

    grid.innerHTML = list.map(g => {
      const own = String(ownedCount(inv, g.kind, g.id));
      const canBuy = !!g.canBuy;
      const price = Number(g.price || 0);

      const buyLabel = canBuy ? `買う（${price}オクト）` : "シリアルで入手";
      const dis = canBuy ? "" : "disabled";

      return `
        <article class="good ${canBuy ? "" : "is-free"}" data-kind="${g.kind}" data-id="${g.id}">
          <div class="good-top">
            <div class="good-img"><img src="${g.img}" alt="${g.name}"></div>
            <div class="good-meta">
              <div class="good-name">${safeTitle(g.name)}</div>
              <div class="good-desc">${toBr(g.desc)}</div>
              <div class="good-desc" style="opacity:.95;"><b>効果：</b>${g.fx ? g.fx : "-"}</div>
            </div>
          </div>
          <div class="good-row">
            <div class="good-owned">所持×<b>${own}</b></div>
            <div class="good-buy">
              <div class="price">${canBuy ? `価格：${price}` : "メモ：購入不可"}</div>
              <button class="btn buybtn" ${dis} data-buy="1">${buyLabel}</button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    // handlers（タップ差対策で stopPropagation）
    $$(".good", grid).forEach(card => {
      const btn = $('[data-buy="1"]', card);
      btn?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const kind = card.getAttribute("data-kind");
        const id = card.getAttribute("data-id");
        const item = GOODS.find(x => x.kind===kind && x.id===id);
        if(!item) return;

        // コラボは購入不可：シリアル案内
        if(item.kind === "seed" && item.id === "seed_colabo"){
          openCollaboInfo();
          return;
        }
        if(!item.canBuy){
          openModal("購入不可", `<div class="note">これは購入できない…たこ。<br>入手方法を確認してね…たこ。</div>`);
          return;
        }

        confirmBuy(item);
      }, { passive:false });
    });
  }

  /* =========================
     購入フロー（ワクワク寄り）
  ========================== */
  function confirmBuy(item){
    const inv = loadInv();
    const octo = getOcto();
    const own = ownedCount(inv, item.kind, item.id);
    const price = Number(item.price||0);
    const can = octo >= price;

    openModal("🛒 購入", `
      <div style="display:grid; gap:12px;">
        <div style="display:grid; grid-template-columns:110px 1fr; gap:12px; align-items:center;">
          <div class="good-img" style="width:110px;height:110px;border:1px solid rgba(255,210,124,.35);box-shadow:0 0 0 2px rgba(255,210,124,.10) inset;">
            <img src="${item.img}" alt="${item.name}" style="width:96px;">
          </div>
          <div style="display:grid; gap:6px;">
            <div style="font-weight:900; font-size:16px; letter-spacing:.02em;">${item.name}</div>
            <div class="note">${toBr(item.desc)}</div>
            <div class="note">効果：<b>${item.fx || "-"}</b></div>
            <div class="note">所持：<b>${own}</b> / 価格：<b>${price}</b>オクト</div>
          </div>
        </div>

        <div style="border:1px solid rgba(255,210,124,.22); border-radius:16px; padding:10px 12px; background:rgba(255,210,124,.06);">
          <div class="note" style="font-size:13px; line-height:1.55;">
            たこぴ：<br>
            「それを買うの…？ いいね…たこ。<br>
            <b>押した瞬間、君の在庫が増える</b>…たこ。」
          </div>
        </div>

        <div class="row">
          <button class="btn" id="doBuy" ${can ? "" : "disabled"} style="border-color: rgba(255,210,124,.6); box-shadow: 0 0 0 2px rgba(255,210,124,.10) inset;">
            ✨ 購入する
          </button>
          <button class="btn btn-ghost" id="cancelBuy">やめる</button>
          <div class="note">${can ? "" : "オクトが足りない…たこ。"}</div>
        </div>
      </div>
    `);

    $("#cancelBuy")?.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      closeModal();
    }, { passive:false });

    $("#doBuy")?.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      doBuy(item);
      closeModal();
    }, { passive:false });
  }

  function doBuy(item){
    const price = Number(item.price||0);
    const octo = getOcto();
    if(octo < price) return;

    const inv = loadInv();
    inv[item.kind] = inv[item.kind] || {};
    inv[item.kind][item.id] = Number(inv[item.kind][item.id] || 0) + 1;

    setOcto(octo - price);
    saveInv(inv);

    pushLog(`購入：${item.name} -${price}オクト`);
    setTakopiSayRandom();
    refreshHUD();
    renderGoods();
  }

  /* =========================
     所持資材モーダル
  ========================== */
  function openInvModal(){
    const inv = loadInv();

    function list(kindLabel, kindKey){
      const items = GOODS.filter(g => g.kind === kindKey);
      const lines = items.map(g => {
        const c = String(ownedCount(inv, g.kind, g.id));
        const memo = (g.kind==="seed" && g.id==="seed_colabo") ? "（シリアル）" : "";
        return `
          <div style="display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08);">
            <div style="font-weight:900; line-height:1.25;">
              ${g.name} <span class="note">${memo}</span><br>
              <span class="note">効果：${g.fx || "-"}</span>
            </div>
            <div>×<b>${c}</b></div>
          </div>
        `;
      }).join("");
      return `
        <div style="padding:10px; border:1px solid rgba(255,255,255,.10); border-radius:14px; background: rgba(0,0,0,.18);">
          <div style="font-weight:900; margin-bottom:6px;">${kindLabel}</div>
          ${lines}
        </div>
      `;
    }

    openModal("所持資材", `
      <div class="mikuji-wrap">
        <div class="note">※所持数は <b>tf_v1_inv</b>（ファーム在庫）と連動。</div>
        ${list("🌱 種", "seed")}
        ${list("💧 水", "water")}
        ${list("🧪 肥料", "fert")}
        <div class="row">
          <button class="btn btn-ghost" id="closeInv">閉じる</button>
        </div>
      </div>
    `);

    $("#closeInv")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); closeModal(); }, { passive:false });
  }

  /* =========================
     水のレア率メモ（任意）
  ========================== */
  function openRatesModal(){
    openModal("水のレア率メモ", `
      <div class="mikuji-wrap">
        <div class="note">
          たこぴ：<br>
          「ここは“説明”じゃなく“ワクワク”のためのメモ…たこ。」<br><br>
          ・《ただの水》：基準（水）<br>
          ・《なんか良さそうな水》：ちょい上振れ<br>
          ・《怪しい水》：標準（現実準拠）<br>
          ・《やりすぎな水》：勝負<br>
          ・《押さなきゃよかった水》：事件
        </div>
        <div class="row">
          <button class="btn" id="okRates" type="button">OK</button>
        </div>
      </div>
    `);
    $("#okRates")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); closeModal(); }, { passive:false });
  }

  /* =========================
     コラボ種（シリアルのみ）
     - ファーム側の tf_v1_codes_used を使用
  ========================== */
  function loadUsedCodes(){
    return loadJSON(LS.codesUsed, {});
  }
  function saveUsedCodes(obj){
    saveJSON(LS.codesUsed, obj);
  }

  // あなたのファームに合わせたサンプル
  const REDEEM_TABLE = {
    "COLABO-TEST-1": { seed_colabo: 1 },
    "COLABO-TEST-5": { seed_colabo: 5 },
  };

  function openCollaboInfo(){
    openModal("【コラボのタネ】", `
      <div class="mikuji-wrap">
        <div class="note">
          たこぴ：<br>
          「これは…<b>買えない</b>…たこ。<br>
          シリアルを入力した人だけが持てる…たこ。」
        </div>

        <div style="padding:10px; border:1px solid rgba(255,255,255,.10); border-radius:14px; background: rgba(0,0,0,.18);">
          <div style="font-weight:900;margin-bottom:6px;">シリアル入力</div>
          <div class="note">例：COLABO-TEST-1</div>
          <div style="display:flex; gap:10px; margin-top:10px;">
            <input id="redeemCode" type="text" placeholder="コードを入力"
              style="flex:1; padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,.14);
                     background:rgba(255,255,255,.06); color:#fff; font-weight:900;">
            <button class="btn" id="redeemBtn" type="button"
              style="border-color: rgba(255,210,124,.6); box-shadow: 0 0 0 2px rgba(255,210,124,.10) inset;">
              使う
            </button>
          </div>
          <div class="note" style="margin-top:8px;">※コードは<b>1回のみ</b>使用できる。</div>
        </div>

        <div class="row">
          <button class="btn btn-ghost" id="closeRedeem">閉じる</button>
        </div>
      </div>
    `);

    $("#closeRedeem")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); closeModal(); }, { passive:false });

    $("#redeemBtn")?.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      const input = $("#redeemCode");
      const code = String(input?.value || "").trim().toUpperCase();
      if(!code){ alert("コードを入力してね"); return; }

      const used = loadUsedCodes();
      if(used[code]){ alert("このコードは使用済み。"); return; }

      const payload = REDEEM_TABLE[code];
      if(!payload){ alert("無効なコードです。"); return; }

      const inv = loadInv();
      inv.seed = inv.seed || {};
      const add = Number(payload.seed_colabo || 0);
      inv.seed["seed_colabo"] = Number(inv.seed["seed_colabo"] || 0) + add;
      saveInv(inv);

      used[code] = { at: Date.now(), payload };
      saveUsedCodes(used);

      pushLog(`シリアル：${code} seed_colabo +${add}`);
      refreshHUD();
      renderGoods();

      openModal("成功！", `
        <div class="mikuji-wrap">
          <div class="reveal">
            <img class="glow" src="https://ul.h3z.jp/AWBcxVls.png" alt="コラボのタネ">
            <div style="font-weight:900; font-size:16px;">✨ コラボのタネ ×${add} ✨</div>
            <div class="note">たこぴ：<br>「…手に入れたね…たこ。<br>“解放”は、静かに始まる…たこ。」</div>
          </div>
          <div class="row"><button class="btn" id="okRedeem">OK</button></div>
        </div>
      `);
      $("#okRedeem")?.addEventListener("click", (ev)=>{ ev.preventDefault(); ev.stopPropagation(); closeModal(); }, { passive:false });
    }, { passive:false });
  }

  /* =========================
     みくじ（1日1回）
  ========================== */
  function openMikuji(){
    const done = localStorage.getItem(LS.mikujiDate) === todayKey();
    if(done){
      openModal("たこ焼きみくじ", `<div class="note">今日はもう引いた…たこ。明日またおいで…たこ。</div>`);
      return;
    }

    const ballImg = "https://ul.h3z.jp/7moREJnl.png";

    openModal("たこ焼きみくじ（1日1回）", `
      <div class="mikuji-wrap">
        <div class="note">
          たこぴ：<br>
          「焼き台から1つ選んで…たこ。<br>
          当たったたこ焼きの中から、何か出る…たこ。」
        </div>

        <div class="grill" id="grill">
          ${Array.from({length:9}).map((_,i)=>`
            <div class="ball" data-i="${i}">
              <img src="${ballImg}" alt="たこ焼き">
            </div>
          `).join("")}
        </div>

        <div class="note">※押した瞬間、今日の運命が確定する…たこ。</div>
      </div>
    `);

    const grill = $("#grill");
    $$(".ball", grill).forEach(b => {
      // click + touch差を吸収
      const handler = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const idx = Number(b.getAttribute("data-i")||0);
        doMikuji(idx);
      };
      b.addEventListener("click", handler, { once:true, passive:false });
      b.addEventListener("touchend", handler, { once:true, passive:false });
    });
  }

  function rollMikujiReward(){
    // 合計100
    const table = [
      { w:25, type:"seed",  id:"seed_shop",   qty:1, label:"店頭タネ×1" },
      { w:25, type:"seed",  id:"seed_line",   qty:1, label:"回線タネ×1" },
      { w:10, type:"seed",  id:"seed_special",qty:1, label:"たこぴのタネ×1" },
      { w:15, type:"water", id:"water_nice",  qty:1, label:"なんか良さそうな水×1" },
      { w:12, type:"water", id:"water_overdo",qty:1, label:"やりすぎな水×1" },
      { w:8,  type:"fert",  id:"fert_skip",   qty:1, label:"工程すっ飛ばし肥料×1" },
      { w:5,  type:"octo",  id:"octo",        qty:50, label:"オクト+50" },
    ];
    const r = Math.random()*100;
    let acc=0;
    for(const t of table){
      acc += t.w;
      if(r <= acc) return t;
    }
    return table[0];
  }

  function doMikuji(){
    const reward = rollMikujiReward();

    if(reward.type === "octo"){
      setOcto(getOcto() + reward.qty);
    }else{
      const inv = loadInv();
      inv[reward.type] = inv[reward.type] || {};
      inv[reward.type][reward.id] = Number(inv[reward.type][reward.id] || 0) + reward.qty;
      saveInv(inv);
    }

    localStorage.setItem(LS.mikujiDate, todayKey());
    pushLog(`みくじ：${reward.label}`);

    const ballImg = "https://ul.h3z.jp/7moREJnl.png";
    openModal("みくじ結果", `
      <div class="mikuji-wrap">
        <div class="reveal">
          <img class="glow" src="${ballImg}" alt="たこ焼き（当たり）">
          <div style="font-weight:900; font-size:16px;">✨ ${reward.label} ✨</div>
          <div class="note">たこぴ：<br>「……ねぇ、知ってるたこ？<br>“当たり”は、焼ける前に受け取るもの…たこ。」</div>
        </div>
        <div class="row">
          <button class="btn" id="okMikuji">OK</button>
        </div>
      </div>
    `);

    $("#okMikuji")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); closeModal(); refreshHUD(); renderGoods(); }, { passive:false });
  }

  /* =========================
     公開記念プレゼント（1回）
     - ここはあなたの好みで内容調整OK
  ========================== */
  function openLaunchPresent(){
    const claimed = localStorage.getItem(LS.launchGift) === "1";
    if(claimed){
      openModal("公開記念プレゼント", `<div class="note">もう受け取った…たこ。大事に使って…たこ。</div>`);
      return;
    }

    openModal("🎁 公開記念プレゼント（1回だけ）", `
      <div class="mikuji-wrap">
        <div class="note">
          たこぴ：<br>
          「“最初の火種”をあげる…たこ。<br>
          受け取ったら…戻れない…たこ。」
        </div>

        <div style="padding:10px; border:1px solid rgba(255,255,255,.10); border-radius:14px; background: rgba(0,0,0,.18);">
          <div style="font-weight:900;margin-bottom:6px;">内容</div>
          <div class="note">🌱 店頭タネ×5 / 回線タネ×5 / たこぴのタネ×1</div>
          <hr class="sep">
          <div class="note">💧 なんか良さそうな水×2 / 怪しい水×2 / やりすぎな水×1</div>
          <div class="note">🧪 気のせい肥料×2 / 根性論肥料×1 / 工程すっ飛ばし肥料×1</div>
        </div>

        <div class="row">
          <button class="btn" id="claimGift">受け取る（取り消し不可）</button>
          <button class="btn btn-ghost" id="cancelGift">やめる</button>
        </div>
      </div>
    `);

    $("#cancelGift")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); closeModal(); }, { passive:false });
    $("#claimGift")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); claimLaunchGift(); closeModal(); }, { passive:false });
  }

  function claimLaunchGift(){
    const inv = loadInv();

    // seeds
    inv.seed = inv.seed || {};
    inv.seed["seed_shop"]    = Number(inv.seed["seed_shop"]||0) + 5;
    inv.seed["seed_line"]    = Number(inv.seed["seed_line"]||0) + 5;
    inv.seed["seed_special"] = Number(inv.seed["seed_special"]||0) + 1;

    // waters
    inv.water = inv.water || {};
    inv.water["water_nice"]       = Number(inv.water["water_nice"]||0) + 2;
    inv.water["water_suspicious"] = Number(inv.water["water_suspicious"]||0) + 2;
    inv.water["water_overdo"]     = Number(inv.water["water_overdo"]||0) + 1;

    // ferts
    inv.fert = inv.fert || {};
    inv.fert["fert_feel"] = Number(inv.fert["fert_feel"]||0) + 2;
    inv.fert["fert_guts"] = Number(inv.fert["fert_guts"]||0) + 1;
    inv.fert["fert_skip"] = Number(inv.fert["fert_skip"]||0) + 1;

    saveInv(inv);
    localStorage.setItem(LS.launchGift, "1");
    pushLog("公開記念プレゼント受取");

    setTakopiSayRandom();
    refreshHUD();
    renderGoods();
  }

  /* =========================
     売却ページ（新規タブで開く）
     - あなたの指定：「図鑑のダブりカードを売る」
     - 実装場所は zukan.html 側（売却UI）に寄せるのが安全
     - ここでは “売却へ移動” を用意（ボタンが無ければ無視）
  ========================== */
  function openSellPage(){
    // 例：図鑑ページに売却UIを持たせる運用
    const url = "https://takoyaki-trc.github.io/takoyaki-media/town/zukan.html";
    window.open(url, "_blank", "noopener");
  }

  /* =========================
     Wiring
  ========================== */
  function wireTabs(){
    $$(".goods-tab").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        $$(".goods-tab").forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        currentKind = btn.getAttribute("data-kind") || "seed";
        renderGoods();
      }, { passive:false });
    });
  }

  function wireButtons(){
    // ★あなたの希望：+100テストは削除（HTMLに残ってても無効化）
    const testBtn = $("#btnGiveOcto");
    if(testBtn){
      testBtn.style.display = "none";
      testBtn.disabled = true;
    }

    $("#btnOpenInv")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); openInvModal(); }, { passive:false });
    $("#btnOpenRates")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); openRatesModal(); }, { passive:false });

    $("#btnMikuji")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); openMikuji(); }, { passive:false });
    $("#btnLaunchPresent")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); openLaunchPresent(); }, { passive:false });

    // もしHTMLに「売却」ボタンを足すならこのIDにしておくと動く
    $("#btnSellCards")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); openSellPage(); }, { passive:false });
  }

  function boot(){
    setTakopiSayRandom();
    wireTabs();
    wireButtons();
    refreshHUD();
    renderGoods();
  }

  boot();
})();



