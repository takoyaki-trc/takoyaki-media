/* =========================================================
   roten.js（RPG武器屋風：たこぴのお店）
   - 資材在庫: tf_v1_inv（seed/water/fert）
   - 図鑑: tf_v1_book（got[id].count 合計 + ダブり数）
   - オクト: roten_v1_octo
   - たこ焼きみくじ: 1日1回
   - 公開記念プレゼント: 1回だけ
========================================================= */
(() => {
  "use strict";

  const LS = {
    octo: "roten_v1_octo",
    inv: "tf_v1_inv",
    book: "tf_v1_book",
    mikujiDate: "roten_v1_mikuji_date",
    launchGift: "roten_v1_launch_gift_claimed",
    log: "roten_v1_log"
  };

  // ---------- utils ----------
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

  // 図鑑（所持数合計 / ダブり数）
  function calcBookStats(){
    const book = loadJSON(LS.book, null);
    if(!book || !book.got) return { owned:0, dup:0 };
    let owned = 0;
    let dup = 0;
    for(const id of Object.keys(book.got)){
      const c = Number(book.got[id]?.count || 0);
      if(c > 0) owned += c;
      if(c > 1) dup += (c - 1);
    }
    return { owned, dup };
  }

  // ログ（任意）
  function pushLog(msg){
    const a = loadJSON(LS.log, []);
    a.unshift({ t: Date.now(), msg });
    saveJSON(LS.log, a.slice(0, 80));
  }

  // ---------- goods master ----------
  // ※ 画像/説明はこのページの棚に確実に反映されます（renderGoodsで出力）
  const GOODS = [
    // --- seed ---
    { kind:"seed", id:"seed_random", name:"【なに出るタネ】", desc:"何が育つかは完全ランダム。店主も知らない。", price:0, free:true, infinite:true, img:"https://ul.h3z.jp/7moREJnl.png" },
    { kind:"seed", id:"seed_shop",   name:"【店頭タネ】",     desc:"店で生まれたタネ。店頭ナンバーの気配。",           price:18, free:false, img:"https://ul.h3z.jp/SvLLVa7m.png" },
    { kind:"seed", id:"seed_line",   name:"【回線タネ】",     desc:"画面の向こうから届いたタネ。クリックすると芽が出る。", price:18, free:false, img:"https://ul.h3z.jp/TWaE9GsS.png" },
    { kind:"seed", id:"seed_takopi", name:"【たこぴのタネ】", desc:"たこぴ由来。芽が出た瞬間、ちょっとだけ不穏。",        price:38, free:false, img:"https://ul.h3z.jp/6MpVi7u2.png" },

    // --- water ---
    { kind:"water", id:"water_plain_free", name:"【ただの水】", desc:"無料の水。気分だけは潤う。レア率は変わらない。", price:0, free:true, infinite:true, img:"https://ul.h3z.jp/9v0ZL7yU.png" },
    { kind:"water", id:"water_luck",       name:"【運の水】",   desc:"ちょっと運が良くなる気がする水。",                 price:12, free:false, img:"https://ul.h3z.jp/9v0ZL7yU.png" },
    { kind:"water", id:"water_rare",       name:"【レアの水】", desc:"レア寄りの水。たぶん。たぶんね。",                 price:18, free:false, img:"https://ul.h3z.jp/9v0ZL7yU.png" },
    { kind:"water", id:"water_ur",         name:"【URの水】",   desc:"URが出るとは言ってない。出“やすい”とも言ってない。", price:28, free:false, img:"https://ul.h3z.jp/9v0ZL7yU.png" },

    // --- fert ---
    { kind:"fert", id:"fert_agedama", name:"【ただの揚げ玉】", desc:"無料の時短。使うほどに“焼き”の気配が近づく。", price:0, free:true, infinite:true, img:"https://ul.h3z.jp/5H0sJ0xk.png" },
    { kind:"fert", id:"fert_risky",   name:"【攻めの肥料】",   desc:"時短つよめ。代償として、運が荒れる。",             price:14, free:false, img:"https://ul.h3z.jp/5H0sJ0xk.png" },
    { kind:"fert", id:"fert_silent",  name:"【無言の肥料】",   desc:"静かに時短。静かに、何かが削れる。",               price:18, free:false, img:"https://ul.h3z.jp/5H0sJ0xk.png" },
    { kind:"fert", id:"fert_fastmax", name:"【時短MAX肥料】",  desc:"最速。焼ける。たぶん焼ける。いや焼ける。",         price:26, free:false, img:"https://ul.h3z.jp/5H0sJ0xk.png" },
  ];

  const SAY = [
    "「いらっしゃい…たこ。オクトで“未来”を買うの、すき…たこ？」",
    "「種は物語…水は運…肥料は代償…たこ。」",
    "「今日の君、ちょっと焼けた顔してる…たこ。」",
    "「買う？…買わない？…どっちでもいいけど、見ていきな…たこ。」"
  ];

  // ---------- modal ----------
  const modal = $("#modal");
  const modalBg = $("#modalBg");
  const modalX  = $("#modalX");
  const modalTitle = $("#modalTitle");
  const modalBody  = $("#modalBody");

  function openModal(title, html){
    if(!modal) return;
    modalTitle.textContent = title || "メニュー";
    modalBody.innerHTML = html || "";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden","false");
    // 背面スクロール抑制
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
  function closeModal(){
    if(!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden","true");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }
  modalBg?.addEventListener("click", closeModal);
  modalX?.addEventListener("click", closeModal);

  // ---------- render ----------
  let currentKind = "seed";

  function ownedCount(inv, kind, id){
    const bucket = inv[kind] || {};
    return Number(bucket[id] || 0);
  }
  function totalKind(inv, kind){
    const bucket = inv[kind] || {};
    let total = 0;
    for(const k of Object.keys(bucket)) total += Number(bucket[k] || 0);
    return total;
  }

  function refreshHUD(){
    const inv = loadInv();
    const octo = getOcto();
    const bs = calcBookStats();

    $("#octoNow") && ($("#octoNow").textContent = String(octo));
    $("#chipSeed") && ($("#chipSeed").textContent  = String(totalKind(inv, "seed")));
    $("#chipWater") && ($("#chipWater").textContent = String(totalKind(inv, "water")));
    $("#chipFert") && ($("#chipFert").textContent  = String(totalKind(inv, "fert")));
    $("#chipBookOwned") && ($("#chipBookOwned").textContent = String(bs.owned));
    $("#chipBookDup") && ($("#chipBookDup").textContent = String(bs.dup));

    // みくじボタン表示
    const done = localStorage.getItem(LS.mikujiDate) === todayKey();
    const btn = $("#btnMikuji");
    if(btn){
      btn.textContent = done ? "🎲 たこ焼きみくじ（本日済）" : "🎲 たこ焼きみくじ（1日1回）";
      btn.disabled = done;
    }

    // 公開記念プレゼント表示
    const claimed = localStorage.getItem(LS.launchGift) === "1";
    const giftBtn = $("#btnLaunchPresent");
    if(giftBtn){
      giftBtn.textContent = claimed ? "🎁 公開記念プレゼント（受取済）" : "🎁 公開記念プレゼント（1回だけ）";
      giftBtn.disabled = claimed;
    }
  }

  function renderGoods(){
    const inv = loadInv();
    const grid = $("#goodsGrid");
    if(!grid) return;

    const list = GOODS.filter(g => g.kind === currentKind);

    grid.innerHTML = list.map(g => {
      const own = g.infinite ? "∞" : String(ownedCount(inv, g.kind, g.id));
      const isFree = !!g.free;
      const buyLabel = isFree ? "無料∞（購入不可）" : `買う（${g.price}）`;
      const dis = isFree ? "disabled" : "";
      return `
        <article class="good ${isFree ? "is-free":""}" data-kind="${g.kind}" data-id="${g.id}">
          <div class="good-top">
            <div class="good-img"><img src="${g.img}" alt="${g.name}" loading="lazy"></div>
            <div class="good-meta">
              <div class="good-name">${g.name}</div>
              <div class="good-desc">${g.desc}</div>
            </div>
          </div>
          <div class="good-row">
            <div class="good-owned">所持×<b>${own}</b></div>
            <div class="good-buy">
              <div class="price">${isFree ? "無料∞" : `価格：${g.price}オクト`}</div>
              <button class="btn buybtn" ${dis} data-buy="1">${buyLabel}</button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    // handlers
    $$(".good", grid).forEach(card => {
      const btn = $('[data-buy="1"]', card);
      btn?.addEventListener("click", () => {
        const kind = card.getAttribute("data-kind");
        const id = card.getAttribute("data-id");
        const item = GOODS.find(x => x.kind===kind && x.id===id);
        if(!item || item.free) return;
        confirmBuy(item);
      });
    });
  }

  function setTakopiSayRandom(){
    const t = SAY[Math.floor(Math.random()*SAY.length)];
    const el = $("#takopiSay");
    if(el) el.innerHTML = t;
  }

  // ---------- buy flow（ワクワク化） ----------
  function confirmBuy(item){
    const inv = loadInv();
    const octo = getOcto();
    const own = ownedCount(inv, item.kind, item.id);
    const can = octo >= item.price;

    openModal("買い物（たこぴ商店）", `
      <div class="fx-card">
        <div class="fx-title">🎇 レジ前イベント発生</div>
        <div class="fx-sub">たこぴが、あなたの手元を見ている…</div>

        <div class="fx-row">
          <div class="fx-imgbox"><img src="${item.img}" alt="${item.name}"></div>
          <div class="fx-meta">
            <div class="name">${item.name}</div>
            <div class="note">${item.desc}</div>
            <div class="fx-badge">所持 <b>${own}</b> / 価格 <b>${item.price}</b> オクト</div>
            ${can ? "" : `<div class="note" style="color:rgba(255,120,120,.92);font-weight:900;">オクトが足りない…たこ。</div>`}
          </div>
        </div>

        <hr class="sep">

        <div class="note" style="font-size:13px;">
          たこぴ：<br>
          「それを買うの…？ いいね…たこ。<br>
          でもね、買うってことは、“焼く”ってこと…たこ。」
        </div>

        <div class="fx-actions">
          <button class="btn btn-gold" id="doBuy" ${can ? "" : "disabled"}>✨ 購入する</button>
          <button class="btn btn-ghost" id="cancelBuy">やめる</button>
        </div>
      </div>
    `);

    $("#cancelBuy")?.addEventListener("click", closeModal);
    $("#doBuy")?.addEventListener("click", () => {
      doBuy(item);
      closeModal();
    });
  }

  function doBuy(item){
    const octo = getOcto();
    if(octo < item.price) return;

    const inv = loadInv();
    inv[item.kind] = inv[item.kind] || {};
    inv[item.kind][item.id] = Number(inv[item.kind][item.id] || 0) + 1;

    setOcto(octo - item.price);
    saveInv(inv);

    pushLog(`購入：${item.name} -${item.price}オクト`);
    setTakopiSayRandom();
    refreshHUD();
    renderGoods();
  }

  // ---------- inventory modal ----------
  function openInvModal(){
    const inv = loadInv();

    function list(kindLabel, kindKey){
      const items = GOODS.filter(g => g.kind === kindKey);
      const lines = items.map(g => {
        const c = g.infinite ? "∞" : String(ownedCount(inv, g.kind, g.id));
        const memo = g.free ? "（無料∞）" : "";
        return `<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08);">
          <div style="font-weight:900;">${g.name} <span class="note">${memo}</span></div>
          <div>×<b>${c}</b></div>
        </div>`;
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
      </div>
    `);
  }

  // ---------- rates modal ----------
  function openRatesModal(){
    openModal("水のレア率メモ", `
      <div class="mikuji-wrap">
        <div class="note">
          ここは“説明”じゃなく“ワクワク”用のメモ：<br>
          ・ただの水：変化なし（∞）<br>
          ・運の水：ちょい上振れ<br>
          ・レアの水：レア寄り<br>
          ・URの水：夢を見れる（保証はしない）
        </div>
        <button class="btn btn-ghost" id="okRates" type="button">閉じる</button>
      </div>
    `);
    $("#okRates")?.addEventListener("click", closeModal);
  }

  // ---------- daily mikuji ----------
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
      b.addEventListener("click", () => {
        const idx = Number(b.getAttribute("data-i")||0);
        doMikuji(idx);
      }, { once:true });
    });
  }

  function rollMikujiReward(){
    const table = [
      { w:28, type:"seed", id:"seed_shop",  qty:1, label:"店頭タネ×1" },
      { w:28, type:"seed", id:"seed_line",  qty:1, label:"回線タネ×1" },
      { w:10, type:"seed", id:"seed_takopi",qty:1, label:"たこぴのタネ×1" },
      { w:14, type:"water",id:"water_luck", qty:1, label:"運の水×1" },
      { w:10, type:"water",id:"water_rare", qty:1, label:"レアの水×1" },
      { w:6,  type:"fert", id:"fert_risky", qty:1, label:"攻めの肥料×1" },
      { w:4,  type:"octo", id:"octo",      qty:50, label:"オクト+50" },
    ];
    const r = Math.random()*100;
    let acc=0;
    for(const t of table){
      acc += t.w;
      if(r <= acc) return t;
    }
    return table[0];
  }

  function doMikuji(idx){
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
          <button class="btn btn-gold" id="okMikuji">OK</button>
        </div>
      </div>
    `);

    $("#okMikuji")?.addEventListener("click", () => {
      closeModal();
      refreshHUD();
      renderGoods();
    });
  }

  // ---------- launch present ----------
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
          「ホームページ公開記念…たこ。<br>
          “最初の火種”をあげる…たこ。」
        </div>

        <div style="padding:10px; border:1px solid rgba(255,255,255,.10); border-radius:14px; background: rgba(0,0,0,.18);">
          <div style="font-weight:900;margin-bottom:6px;">内容</div>
          <div class="note">🌱 店頭タネ×10</div>
          <div class="note">🌱 回線タネ×10</div>
          <div class="note">🌱 たこぴのタネ×1</div>
          <hr class="sep">
          <div class="note">💧 運の水×3 / レアの水×3 / URの水×3</div>
          <div class="note">🧪 攻めの肥料×3 / 無言の肥料×3 / 時短MAX×3</div>
        </div>

        <div class="row">
          <button class="btn btn-gold" id="claimGift">受け取る（取り消し不可）</button>
          <button class="btn btn-ghost" id="cancelGift">やめる</button>
        </div>

        <div class="note">※1回だけ。押したら戻れない…たこ。</div>
      </div>
    `);

    $("#cancelGift")?.addEventListener("click", closeModal);
    $("#claimGift")?.addEventListener("click", () => {
      claimLaunchGift();
      closeModal();
    });
  }

  function claimLaunchGift(){
    const inv = loadInv();

    inv.seed = inv.seed || {};
    inv.seed["seed_shop"]   = Number(inv.seed["seed_shop"]||0) + 10;
    inv.seed["seed_line"]   = Number(inv.seed["seed_line"]||0) + 10;
    inv.seed["seed_takopi"] = Number(inv.seed["seed_takopi"]||0) + 1;

    inv.water = inv.water || {};
    inv.water["water_luck"] = Number(inv.water["water_luck"]||0) + 3;
    inv.water["water_rare"] = Number(inv.water["water_rare"]||0) + 3;
    inv.water["water_ur"]   = Number(inv.water["water_ur"]||0) + 3;

    inv.fert = inv.fert || {};
    inv.fert["fert_risky"]   = Number(inv.fert["fert_risky"]||0) + 3;
    inv.fert["fert_silent"]  = Number(inv.fert["fert_silent"]||0) + 3;
    inv.fert["fert_fastmax"] = Number(inv.fert["fert_fastmax"]||0) + 3;

    saveInv(inv);
    localStorage.setItem(LS.launchGift, "1");
    pushLog("公開記念プレゼント受取");

    setTakopiSayRandom();
    refreshHUD();
    renderGoods();
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
    $("#btnOpenInv")?.addEventListener("click", openInvModal);
    $("#btnOpenRates")?.addEventListener("click", openRatesModal);
    $("#btnMikuji")?.addEventListener("click", openMikuji);
    $("#btnLaunchPresent")?.addEventListener("click", openLaunchPresent);
    // btnOpenSell は <a target="_blank"> なのでJS不要
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


