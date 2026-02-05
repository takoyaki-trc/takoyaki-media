(() => {
  "use strict";

  /* =========================
     Keys（ファーム/図鑑と共通）
  ========================== */
  const LS = {
    octo: "roten_v1_octo",
    inv: "tf_v1_inv",      // ★ファーム在庫と共通
    book: "tf_v1_book",    // ★図鑑と共通
    gift: "roten_v1_gift_2026_public",
    mikuji: "roten_v1_mikuji_day",
  };

  /* =========================
     データ（ファームと同じIDを使う）
     ※必要最小限（ショップに必要な分）
  ========================== */
  const FREE = {
    seed:  new Set(["seed_random"]),
    water: new Set(["water_plain_free"]),
    fert:  new Set(["fert_agedama"]),
  };

  const SEEDS = [
    { id:"seed_random",  name:"【なに出るタネ】", desc:"何が育つかは完全ランダム。\n店主も知らない。", img:"https://ul.h3z.jp/gnyvP580.png",  unit: 0 },
    { id:"seed_shop",    name:"【店頭タネ】",     desc:"店で生まれたタネ。\n店頭ナンバーを宿している。", img:"https://ul.h3z.jp/IjvuhWoY.png", unit: 18 },
    { id:"seed_line",    name:"【回線タネ】",     desc:"画面の向こうから届いたタネ。\nクリックすると芽が出る。", img:"https://ul.h3z.jp/AonxB5x7.png", unit: 18 },
    { id:"seed_special", name:"【たこぴのタネ】", desc:"今はまだ何も起きない。\nそのうち何か起きる。", img:"https://ul.h3z.jp/29OsEvjf.png", unit: 180 },
    { id:"seed_colabo",  name:"【コラボのタネ】", desc:"シリアルで増える。\nここでは買えない。", img:"https://ul.h3z.jp/AWBcxVls.png", unit: -1 },
  ];

  const WATERS = [
    { id:"water_plain_free", name:"《ただの水》",        desc:"無料・UR/LRなし。\n無課金の基準。", img:"https://ul.h3z.jp/13XdhuHi.png", unit: 0 },
    { id:"water_nice",       name:"《なんか良さそうな水》", desc:"ちょい上振れ・LRなし。\n初心者の背中押し。", img:"https://ul.h3z.jp/3z04ypEd.png", unit: 30 },
    { id:"water_suspicious", name:"《怪しい水》",        desc:"現実準拠・標準。\n実パックと同じ空気。", img:"https://ul.h3z.jp/wtCO9mec.png", unit: 50 },
    { id:"water_overdo",     name:"《やりすぎな水》",    desc:"勝負水・現実より上。\n体感で強い。", img:"https://ul.h3z.jp/vsL9ggf6.png", unit: 90 },
    { id:"water_regret",     name:"《押さなきゃよかった水》", desc:"確定枠・狂気。\n事件製造機（SNS向け）", img:"https://ul.h3z.jp/L0nafMOp.png", unit: 120 },
  ];

  const FERTS = [
    { id:"fert_agedama", name:"①ただの揚げ玉", desc:"時短0。\n《焼きすぎたカード》率UP", img:"https://ul.h3z.jp/9p5fx53n.png", unit: 0 },
    { id:"fert_feel",    name:"②《気のせい肥料》", desc:"早くなった気がする。\n気のせいかもしれない。", img:"https://ul.h3z.jp/XqFTb7sw.png", unit: 20 },
    { id:"fert_guts",    name:"③《根性論ぶち込み肥料》", desc:"理由はない。\n気合いだ。", img:"https://ul.h3z.jp/bT9ZcNnS.png", unit: 45 },
    { id:"fert_skip",    name:"④《工程すっ飛ばし肥料》", desc:"途中は、\n見なかったことにした。", img:"https://ul.h3z.jp/FqPzx12Q.png", unit: 80 },
    { id:"fert_timeno",  name:"⑤《時間を信じない肥料》", desc:"最終兵器・禁忌。\n稀に《ドロドロ生焼けカード》", img:"https://ul.h3z.jp/l2njWY57.png", unit: 160 },
  ];

  /* =========================
     Util
  ========================== */
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

  function nowJstYmd(){
    // JST固定（環境差を避けるためUTC+9で計算）
    const t = Date.now() + 9*60*60*1000;
    const d = new Date(t);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth()+1).padStart(2,"0");
    const day = String(d.getUTCDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }

  function loadJSON(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) return fallback;
      const obj = JSON.parse(raw);
      return (obj && typeof obj === "object") ? obj : fallback;
    }catch(e){ return fallback; }
  }
  function saveJSON(key, obj){
    localStorage.setItem(key, JSON.stringify(obj));
  }

  function loadOcto(){
    const n = Number(localStorage.getItem(LS.octo) ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  function saveOcto(n){
    localStorage.setItem(LS.octo, String(Math.max(0, Math.floor(n))));
  }
  function addOcto(delta){
    const cur = loadOcto();
    const next = Math.max(0, cur + Math.floor(delta));
    saveOcto(next);
    return next;
  }

  function defaultInv(){
    const inv = { ver:1, seed:{}, water:{}, fert:{} };
    for(const x of SEEDS) inv.seed[x.id] = 0;
    for(const x of WATERS) inv.water[x.id] = 0;
    for(const x of FERTS) inv.fert[x.id] = 0;
    return inv;
  }
  function loadInv(){
    const inv = loadJSON(LS.inv, defaultInv());
    inv.seed = inv.seed || {};
    inv.water = inv.water || {};
    inv.fert = inv.fert || {};
    return inv;
  }
  function saveInv(inv){ saveJSON(LS.inv, inv); }

  function isFree(type, id){ return !!FREE[type]?.has(id); }

  function invGet(inv, type, id){
    if(isFree(type,id)) return Infinity;
    const box = inv[type] || {};
    const n = Number(box[id] ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  function invAdd(inv, type, id, delta){
    if(isFree(type,id)) return;
    if(!inv[type]) inv[type] = {};
    const cur = Number(inv[type][id] ?? 0);
    const next = Math.max(0, Math.floor(cur + delta));
    inv[type][id] = next;
  }

  function loadBook(){
    const b = loadJSON(LS.book, { ver:1, got:{} });
    b.got = b.got || {};
    return b;
  }
  function saveBook(b){ saveJSON(LS.book, b); }

  function rarityFromIdOrRec(rec){
    // 図鑑データに rarity があれば使う。なければ "N" 扱い。
    return (rec && rec.rarity) ? String(rec.rarity) : "N";
  }
  function sellUnitPrice(rarity){
    // 即決の目安（好きに調整してOK）
    // SP（焼きすぎ/生焼け等）が来た場合は30
    const r = String(rarity||"N").toUpperCase();
    if(r === "LR") return 220;
    if(r === "UR") return 120;
    if(r === "SR") return 45;
    if(r === "R")  return 18;
    if(r === "SP") return 30;
    return 6; // N
  }

  /* =========================
     UI refs
  ========================== */
  const elOctoNow = $("#octoNow");
  const elHudOcto = $("#hudOcto");
  const elChipSeed = $("#chipSeed");
  const elChipWater = $("#chipWater");
  const elChipFert = $("#chipFert");
  const elChipDex = $("#chipDex");

  const elShopGrid = $("#shopGrid");
  const elSellList = $("#sellList");
  const elInvWrap = $("#invWrap");

  const modal = $("#modal");
  const modalBg = $("#modalBg");
  const modalTitle = $("#modalTitle");
  const modalBody = $("#modalBody");
  const modalClose = $("#modalClose");

  const toast = $("#toast");

  /* =========================
     Modal / Toast
  ========================== */
  function openModal(title, html){
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    modal.setAttribute("aria-hidden","false");
  }
  function closeModal(){
    modal.setAttribute("aria-hidden","true");
    modalBody.innerHTML = "";
  }
  modalBg.addEventListener("click", closeModal);
  modalClose.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape" && modal.getAttribute("aria-hidden")==="false") closeModal(); });

  let toastTimer = null;
  function showToast(html, ms=1200){
    toast.innerHTML = html;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> toast.classList.remove("show"), ms);
  }

  function hudPop(el){
    if(!el) return;
    el.classList.remove("hud-pop");
    // reflow
    void el.offsetWidth;
    el.classList.add("hud-pop");
  }

  function sparkCard(cardEl){
    if(!cardEl) return;
    cardEl.classList.remove("is-spark");
    void cardEl.offsetWidth;
    cardEl.classList.add("is-spark");
    setTimeout(()=> cardEl.classList.remove("is-spark"), 650);
  }

  /* =========================
     Render HUD
  ========================== */
  function totalInvCount(inv, type, items){
    let sum = 0;
    for(const it of items){
      const n = invGet(inv, type, it.id);
      if(n === Infinity) continue; // 無料は∞なので合計に足さない（見た目優先）
      sum += n;
    }
    return sum;
  }

  function renderHud(){
    const octo = loadOcto();
    const inv = loadInv();
    const book = loadBook();

    elOctoNow.textContent = String(octo);
    elChipSeed.textContent = String(totalInvCount(inv, "seed", SEEDS));
    elChipWater.textContent = String(totalInvCount(inv, "water", WATERS));
    elChipFert.textContent = String(totalInvCount(inv, "fert", FERTS));
    elChipDex.textContent = String(Object.keys(book.got || {}).length);
  }

  /* =========================
     Tabs
  ========================== */
  function setTab(tab){
    $$(".tab").forEach(b=>{
      const on = (b.dataset.tab === tab);
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true":"false");
    });
    $$(".tabpane").forEach(p=>{
      p.classList.toggle("is-show", p.dataset.pane === tab);
    });
    if(tab === "sell") renderSell();
    if(tab === "inv") renderInv();
  }

  $$(".tab").forEach(b=>{
    b.addEventListener("click", ()=> setTab(b.dataset.tab));
  });

  function setSub(sub){
    $$(".subtab").forEach(b=> b.classList.toggle("is-active", b.dataset.sub === sub));
    renderShop(sub);
  }
  $$(".subtab").forEach(b=>{
    b.addEventListener("click", ()=> setSub(b.dataset.sub));
  });

  /* =========================
     Shop（購入）
  ========================== */
  function verbLabel(){
    // たこぴショップなので口調固定
    return "仕入れる…たこ";
  }

  function formatUnitCost(unit, qty){
    const total = unit * qty;
    return `🪙 ${total}`;
  }

  function buyItem(type, id, unit, qty, cardEl){
    if(qty <= 0) return;
    if(unit < 0){
      showToast(`💭 それは…ここでは取引できない…たこ`);
      return;
    }
    if(isFree(type,id)){
      showToast(`∞ は…買う意味がない…たこ`);
      return;
    }

    const cost = unit * qty;
    const octo = loadOcto();
    if(octo < cost){
      showToast(`💦 オクトが足りない…たこ<br><span style="opacity:.8">必要：<b>🪙${cost}</b> / 今：🪙${octo}</span>`, 1600);
      hudPop(elHudOcto);
      return;
    }

    // pay
    saveOcto(octo - cost);

    // add inv
    const inv = loadInv();
    invAdd(inv, type, id, qty);
    saveInv(inv);

    // feedback
    const item = (type==="seed"?SEEDS:type==="water"?WATERS:FERTS).find(x=>x.id===id);
    const name = item ? item.name : id;

    showToast(
      `✨ <b>${name}</b> ×${qty} 仕入れた…たこ！<br><span style="opacity:.85">🪙 -${cost}</span>`,
      1300
    );
    sparkCard(cardEl);
    renderHud();
    hudPop(elHudOcto);
    // 資材HUDもポン（どれか）
    if(type==="seed") hudPop($("#btnOpenInv"));
    if(type==="water") hudPop($("#btnOpenInv"));
    if(type==="fert") hudPop($("#btnOpenInv"));

    // リレンダー（所持数バッジ反映）
    // ただしカクつき防止で、今のタブだけ部分更新
    const activeSub = $(".subtab.is-active")?.dataset.sub || "seed";
    renderShop(activeSub);
  }

  function cardHtml(type, item, inv){
    const cnt = invGet(inv, type, item.id);
    const cntLabel = (cnt === Infinity) ? "∞" : String(cnt);
    const unit = Number(item.unit ?? 0);

    const canBuy = unit >= 0 && !isFree(type, item.id);
    const btnText = (q) => canBuy ? `🪙払って${verbLabel()}（+${q}）` : (unit < 0 ? "取引不可" : "∞（無料）");

    // よく使う数量：1/10/50
    const q1 = 1, q10 = 10, q50 = 50;

    const disabled1  = !canBuy;
    const disabled10 = !canBuy;
    const disabled50 = !canBuy;

    return `
      <div class="card" data-type="${type}" data-id="${item.id}">
        <div class="spark"></div>
        <div class="imgbox">
          <img src="${item.img}" alt="${item.name}">
        </div>
        <div class="body">
          <div class="name">${item.name}</div>
          <div class="desc">${String(item.desc||"").replace(/\n/g,"<br>")}</div>

          <div class="meta">
            <span class="badge">所持：<b>×${cntLabel}</b></span>
            <span class="badge">単価：<b>${unit < 0 ? "—" : (isFree(type,item.id) ? "無料" : `🪙${unit}`)}</b></span>
          </div>

          <div class="actions">
            <button class="qbtn" data-buy="${q1}" ${disabled1?"disabled":""}>${btnText(q1)}<br><span style="opacity:.85">${formatUnitCost(unit,q1)}</span></button>
            <button class="qbtn primary" data-buy="${q10}" ${disabled10?"disabled":""}>${btnText(q10)}<br><span style="opacity:.85">${formatUnitCost(unit,q10)}</span></button>
            <button class="qbtn" data-buy="${q50}" ${disabled50?"disabled":""}>${btnText(q50)}<br><span style="opacity:.85">${formatUnitCost(unit,q50)}</span></button>
          </div>
        </div>
      </div>
    `;
  }

  function renderShop(sub){
    const inv = loadInv();
    const type = (sub==="seed") ? "seed" : (sub==="water") ? "water" : "fert";
    const items = (type==="seed") ? SEEDS : (type==="water") ? WATERS : FERTS;

    elShopGrid.innerHTML = items.map(it => cardHtml(type, it, inv)).join("");

    // bind
    $$(".card", elShopGrid).forEach(card=>{
      const type = card.dataset.type;
      const id = card.dataset.id;
      const items = (type==="seed") ? SEEDS : (type==="water") ? WATERS : FERTS;
      const item = items.find(x=>x.id===id);
      const unit = Number(item?.unit ?? 0);

      $$("button[data-buy]", card).forEach(btn=>{
        btn.addEventListener("click", ()=>{
          const qty = Number(btn.getAttribute("data-buy") || 0);
          buyItem(type, id, unit, qty, card);
        });
      });
    });
  }

  /* =========================
     Inventory modal + tab
  ========================== */
  function invRows(type, items, inv){
    return items.map(it=>{
      const n = invGet(inv, type, it.id);
      const val = (n === Infinity) ? "∞" : String(n);
      return `<div class="inv-row"><span>${it.name}</span><span><b>×${val}</b></span></div>`;
    }).join("");
  }

  function renderInv(){
    const inv = loadInv();
    elInvWrap.innerHTML = `
      <div class="inv-block">
        <div class="inv-ttl">🌱 種（tf_v1_inv.seed）</div>
        ${invRows("seed", SEEDS, inv)}
      </div>
      <div class="inv-block">
        <div class="inv-ttl">💧 水（tf_v1_inv.water）</div>
        ${invRows("water", WATERS, inv)}
      </div>
      <div class="inv-block">
        <div class="inv-ttl">🧪 肥料（tf_v1_inv.fert）</div>
        ${invRows("fert", FERTS, inv)}
      </div>
    `;
  }

  function openInvModal(){
    const inv = loadInv();
    openModal("所持資材", `
      <div class="inv-wrap">
        <div class="inv-block">
          <div class="inv-ttl">🌱 種</div>
          ${invRows("seed", SEEDS, inv)}
        </div>
        <div class="inv-block">
          <div class="inv-ttl">💧 水</div>
          ${invRows("water", WATERS, inv)}
        </div>
        <div class="inv-block">
          <div class="inv-ttl">🧪 肥料</div>
          ${invRows("fert", FERTS, inv)}
        </div>
      </div>
    `);
  }
  $("#btnOpenInv").addEventListener("click", openInvModal);

  /* =========================
     Sell（即決売却）
  ========================== */
  let sellSort = "new"; // "new" | "count"

  function bookToList(book){
    const got = book.got || {};
    const arr = Object.keys(got).map(id => {
      const rec = got[id] || {};
      const count = Number(rec.count ?? 0);
      const rarity = rarityFromIdOrRec(rec);
      const unit = sellUnitPrice(rarity);
      const lastAt = Number(rec.lastAt ?? rec.at ?? 0);
      return {
        id,
        name: rec.name || id,
        img: rec.img || "",
        rarity,
        count: Math.max(0, count|0),
        unit,
        lastAt
      };
    }).filter(x=>x.count>0);
    if(sellSort === "count") arr.sort((a,b)=> (b.count-a.count) || (b.lastAt-a.lastAt));
    else arr.sort((a,b)=> (b.lastAt-a.lastAt) || (b.count-a.count));
    return arr;
  }

  function decBookCount(id, delta){
    const book = loadBook();
    if(!book.got) book.got = {};
    const rec = book.got[id];
    if(!rec) return { ok:false };

    const cur = Number(rec.count ?? 0);
    const next = Math.max(0, cur - delta);

    if(next <= 0){
      delete book.got[id];
    }else{
      rec.count = next;
      rec.lastAt = Date.now();
      book.got[id] = rec;
    }
    saveBook(book);
    return { ok:true, next };
  }

  function sell(id, rarity, qty){
    const book = loadBook();
    const rec = book.got?.[id];
    const cur = Number(rec?.count ?? 0);
    if(cur <= 0){
      showToast("💭 もう持ってない…たこ");
      renderSell();
      renderHud();
      return;
    }
    const sellQty = Math.min(cur, Math.max(1, qty|0));
    const unit = sellUnitPrice(rarity);
    const gain = unit * sellQty;

    const r = decBookCount(id, sellQty);
    if(!r.ok){
      showToast("💦 売却に失敗…たこ", 1500);
      return;
    }
    addOcto(gain);

    showToast(`✨ <b>${rec.name || id}</b> ×${sellQty} 売った…たこ！<br><span style="opacity:.85">🪙 +${gain}</span>`, 1300);
    hudPop(elHudOcto);
    renderSell();
    renderHud();
  }

  function renderSell(){
    const book = loadBook();
    const list = bookToList(book);

    if(list.length === 0){
      elSellList.innerHTML = `
        <div class="inv-block">
          <div class="inv-ttl">売れるカードがない…たこ</div>
          <div style="font-size:12px;color:var(--muted);line-height:1.5">
            畑で収穫して図鑑（tf_v1_book）に登録すると、ここに出る…たこ。
          </div>
        </div>
      `;
      return;
    }

    elSellList.innerHTML = list.map(x=>{
      const totalAll = x.unit * x.count;
      return `
        <div class="sell-item" data-sell-id="${x.id}">
          <div class="sell-thumb">${x.img ? `<img src="${x.img}" alt="${x.name}">` : ""}</div>
          <div class="sell-body">
            <div class="sell-name">${x.name}</div>
            <div class="sell-meta">
              <span class="badge">ID：<b>${x.id}</b></span>
              <span class="badge">レア：<b>${x.rarity}</b></span>
              <span class="badge">所持：<b>×${x.count}</b></span>
              <span class="badge">単価：<b>🪙${x.unit}</b></span>
            </div>
            <div class="sell-actions">
              <button class="qbtn" data-sellq="1">即決：1枚（🪙${x.unit}）</button>
              <button class="qbtn primary" data-sellq="10">即決：10枚（🪙${x.unit*10}）</button>
              <button class="qbtn danger" data-sellall="1">全部売る（🪙${totalAll}）</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    $$(".sell-item").forEach(row=>{
      const id = row.getAttribute("data-sell-id");
      const book = loadBook();
      const rec = book.got?.[id];
      const rarity = rarityFromIdOrRec(rec);

      $$("button[data-sellq]", row).forEach(btn=>{
        btn.addEventListener("click", ()=>{
          const q = Number(btn.getAttribute("data-sellq")||1);
          sell(id, rarity, q);
        });
      });
      const allBtn = $("button[data-sellall]", row);
      if(allBtn){
        allBtn.addEventListener("click", ()=> {
          const cur = Number(loadBook().got?.[id]?.count ?? 0);
          sell(id, rarity, cur);
        });
      }
    });
  }

  $("#btnSellSortNew").addEventListener("click", ()=>{ sellSort="new"; renderSell(); showToast("並び替え：最近入手順"); });
  $("#btnSellSortCount").addEventListener("click", ()=>{ sellSort="count"; renderSell(); showToast("並び替え：枚数順"); });
  $("#btnSellInfo").addEventListener("click", ()=>{
    openModal("即決価格ルール", `
      <div class="inv-block">
        <div class="inv-ttl">価格（1枚あたり）</div>
        <div class="inv-row"><span>N</span><span><b>🪙6</b></span></div>
        <div class="inv-row"><span>R</span><span><b>🪙18</b></span></div>
        <div class="inv-row"><span>SR</span><span><b>🪙45</b></span></div>
        <div class="inv-row"><span>UR</span><span><b>🪙120</b></span></div>
        <div class="inv-row"><span>LR</span><span><b>🪙220</b></span></div>
        <div class="inv-row"><span>SP（特殊）</span><span><b>🪙30</b></span></div>
        <div style="margin-top:10px;font-size:12px;color:var(--muted);line-height:1.5">
          ※好きに調整OK。ここは “経済の気持ちよさ” を優先した基準…たこ。
        </div>
      </div>
    `);
  });

  /* =========================
     Events
  ========================== */
  $("#btnGiveOcto").addEventListener("click", ()=>{
    addOcto(100);
    renderHud();
    hudPop(elHudOcto);
    showToast("🪙 +100（テスト）");
  });

  $("#btnTakopiTalk").addEventListener("click", ()=>{
    const lines = [
      "「在庫は…心の保険…たこ」",
      "「急いだ取引ほど…後で響く…たこ」",
      "「買うより…仕入れる…たこ」",
      "「未来は…レシートじゃ返せない…たこ」",
      "「数字が増えると…人は安心する…たこ」",
    ];
    $("#takopiSay").innerHTML = lines[Math.floor(Math.random()*lines.length)];
    showToast("🗯 たこぴが何か言った…たこ", 900);
  });

  /* =========================
     Gift（1回だけ）
  ========================== */
  function claimGift(){
    const flag = localStorage.getItem(LS.gift);
    if(flag){
      showToast("🎁 もう受け取ってる…たこ", 1200);
      return;
    }

    const inv = loadInv();
    // 店頭タネ10 / 回線タネ10 / たこぴのタネ1
    invAdd(inv, "seed", "seed_shop", 10);
    invAdd(inv, "seed", "seed_line", 10);
    invAdd(inv, "seed", "seed_special", 1);

    // 水と肥料 各3個ずつ（無料枠は∞なので有料側を配る）
    invAdd(inv, "water", "water_nice", 3);
    invAdd(inv, "water", "water_suspicious", 3);
    invAdd(inv, "water", "water_overdo", 3);

    invAdd(inv, "fert", "fert_feel", 3);
    invAdd(inv, "fert", "fert_guts", 3);
    invAdd(inv, "fert", "fert_skip", 3);

    saveInv(inv);
    localStorage.setItem(LS.gift, String(Date.now()));

    renderHud();
    const activeSub = $(".subtab.is-active")?.dataset.sub || "seed";
    renderShop(activeSub);

    showToast(
      `🎁 <b>公開記念プレゼント</b> を受け取った…たこ！<br>
       <span style="opacity:.85">店頭タネ×10 / 回線タネ×10 / たこぴのタネ×1 / 水×9 / 肥料×9</span>`,
      2200
    );
    hudPop($("#btnOpenInv"));
  }

  $("#btnGift").addEventListener("click", claimGift);

  /* =========================
     Mikuji（1日1回）
  ========================== */
  function mikujiReward(){
    // 報酬テーブル（ここは好きに調整OK）
    const table = [
      { w: 26, kind:"octo", amount: 60, label:"🪙 +60" },
      { w: 20, kind:"octo", amount: 120, label:"🪙 +120" },
      { w: 10, kind:"seed", id:"seed_shop", amount: 3, label:"🌱 店頭タネ×3" },
      { w: 10, kind:"seed", id:"seed_line", amount: 3, label:"🌱 回線タネ×3" },
      { w: 8,  kind:"water", id:"water_nice", amount: 2, label:"💧 良さ水×2" },
      { w: 8,  kind:"fert",  id:"fert_guts", amount: 1, label:"🧪 根性肥料×1" },
      { w: 6,  kind:"water", id:"water_overdo", amount: 1, label:"💧 やりすぎ×1" },
      { w: 4,  kind:"seed", id:"seed_special", amount: 1, label:"🌱 たこぴのタネ×1" },
      { w: 4,  kind:"fert", id:"fert_timeno", amount: 1, label:"🧪 時間を信じない×1" },
      { w: 4,  kind:"octo", amount: 300, label:"🪙 +300（当たり…たこ）" },
    ];
    const total = table.reduce((a,b)=>a+b.w,0);
    let r = Math.random()*total;
    for(const t of table){
      r -= t.w;
      if(r<=0) return t;
    }
    return table[0];
  }

  function canMikujiToday(){
    const today = nowJstYmd();
    const done = localStorage.getItem(LS.mikuji);
    return done !== today;
  }

  function openMikuji(){
    if(!canMikujiToday()){
      showToast("🎲 今日はもう引いた…たこ", 1400);
      return;
    }

    openModal("🎲 たこ焼きみくじ（1日1回）", `
      <div style="font-size:12px;color:var(--muted);line-height:1.5">
        焼き台のたこ焼きから <b>1つ</b> 選ぶ…たこ。<br>
        選んだらアップで光って、中からアイテムが出る…たこ。
      </div>

      <div class="mikuji-plate" id="mikujiPlate">
        ${Array.from({length:12}).map((_,i)=>`
          <button class="mikuji-tako" type="button" data-i="${i}">
            <div class="dot"></div>
          </button>
        `).join("")}
      </div>

      <div class="mikuji-up" id="mikujiUp" style="display:none;">
        <div style="font-weight:1000">選んだ…たこ</div>
        <div class="mikuji-big" id="mikujiBig"></div>
        <div style="margin-top:10px;font-size:12px;color:var(--muted);line-height:1.5" id="mikujiResult"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <button class="mini" id="btnMikujiOk" type="button">受け取る</button>
        </div>
      </div>
    `);

    const plate = $("#mikujiPlate", modalBody);
    const up = $("#mikujiUp", modalBody);
    const big = $("#mikujiBig", modalBody);
    const result = $("#mikujiResult", modalBody);

    let chosen = false;
    let reward = null;

    plate.addEventListener("click", (e)=>{
      const btn = e.target.closest(".mikuji-tako");
      if(!btn || chosen) return;
      chosen = true;

      // 演出：アップ表示
      up.style.display = "block";
      big.classList.add("glow");

      reward = mikujiReward();
      result.innerHTML = `……<br><b>中から出た：</b> ${reward.label} <br><span style="opacity:.85">（今日の運は固定された…たこ）</span>`;
    });

    $("#btnMikujiOk", modalBody).addEventListener("click", ()=>{
      if(!reward){
        showToast("まず選ぶ…たこ", 1200);
        return;
      }

      // 付与
      if(reward.kind === "octo"){
        addOcto(reward.amount);
        hudPop(elHudOcto);
      }else{
        const inv = loadInv();
        invAdd(inv, reward.kind, reward.id, reward.amount);
        saveInv(inv);
        hudPop($("#btnOpenInv"));
      }

      localStorage.setItem(LS.mikuji, nowJstYmd());

      renderHud();
      const activeSub = $(".subtab.is-active")?.dataset.sub || "seed";
      renderShop(activeSub);

      showToast(`🎲 みくじ結果：<b>${reward.label}</b> を受け取った…たこ！`, 1800);
      closeModal();
    });
  }

  $("#btnMikuji").addEventListener("click", openMikuji);

  /* =========================
     Init
  ========================== */
  // 初期タブ
  setTab("buy");
  setSub("seed");

  // 初回レンダー
  renderHud();
  renderShop("seed");

})();

