/* assets/roten.js
   - 露店 完全版（相場 / 仕入れ / 売却 / 在庫 / みくじ / 初回ギフト）
   - 共有データ：
     tf_v1_inv   : 資材在庫（種/水/肥料）
     tf_v1_book  : 図鑑（カード所持数 count）
*/

(() => {
  "use strict";

  /* =========================
     localStorage keys
  ========================= */
  const LS = {
    octo: "roten_v1_octo",
    inv: "tf_v1_inv",
    book: "tf_v1_book",
    market: "roten_v1_market_v2",
    mikujiLast: "roten_v1_mikuji_last",
    giftDone: "roten_v1_open_gift_done",
  };

  /* =========================
     基礎価格（FIX）
  ========================= */
  const BASE_PRICE = { N:40, R:80, SR:150, UR:300, LR:600 };

  /* =========================
     資材マスタ（IDはファームと合わせる）
     ※無料(∞)は売らない
  ========================= */
  const FREE = {
    seed:  new Set(["seed_random"]),
    water: new Set(["water_plain_free"]),
    fert:  new Set(["fert_agedama"])
  };

  const SEEDS = [
    { id:"seed_random",  name:"【なに出るタネ】", desc:"無料・∞。\n店主も知らない。", img:"https://ul.h3z.jp/gnyvP580.png", price:0 },
    { id:"seed_shop",    name:"【店頭タネ】",     desc:"店で生まれたタネ。\n店頭ナンバーを宿す。", img:"https://ul.h3z.jp/IjvuhWoY.png", price:30 },
    { id:"seed_line",    name:"【回線タネ】",     desc:"画面の向こうのタネ。\nネットの気配。", img:"https://ul.h3z.jp/AonxB5x7.png", price:30 },
    { id:"seed_special", name:"【たこぴのタネ】", desc:"今は何も起きない。\nそのうち何か起きる。", img:"https://ul.h3z.jp/29OsEvjf.png", price:240 },
    { id:"seed_colabo",  name:"【コラボのタネ】", desc:"シリアルで増える。\nイベント用。", img:"https://ul.h3z.jp/AWBcxVls.png", price:0 },
  ];

  const WATERS = [
    { id:"water_plain_free", name:"《ただの水》", desc:"無料・∞。\nUR/LRなし。", img:"https://ul.h3z.jp/13XdhuHi.png", price:0 },
    { id:"water_nice",       name:"《なんか良さそうな水》", desc:"ちょい上振れ。\nLRなし。", img:"https://ul.h3z.jp/3z04ypEd.png", price:60 },
    { id:"water_suspicious", name:"《怪しい水》", desc:"現実準拠。\n標準。", img:"https://ul.h3z.jp/wtCO9mec.png", price:80 },
    { id:"water_overdo",     name:"《やりすぎな水》", desc:"勝負水。\n体感で強い。", img:"https://ul.h3z.jp/vsL9ggf6.png", price:130 },
    { id:"water_regret",     name:"《押さなきゃよかった水》", desc:"事件製造機。\nSNS向け。", img:"https://ul.h3z.jp/L0nafMOp.png", price:220 },
  ];

  const FERTS = [
    { id:"fert_agedama", name:"①ただの揚げ玉", desc:"無料・∞。\n時短0。", img:"https://ul.h3z.jp/9p5fx53n.png", price:0 },
    { id:"fert_feel",    name:"②《気のせい肥料》", desc:"早くなった気がする。\n気のせい。", img:"https://ul.h3z.jp/XqFTb7sw.png", price:50 },
    { id:"fert_guts",    name:"③《根性論ぶち込み肥料》", desc:"理由はない。\n気合い。", img:"https://ul.h3z.jp/bT9ZcNnS.png", price:90 },
    { id:"fert_skip",    name:"④《工程すっ飛ばし肥料》", desc:"途中は見なかった。\n禁断。", img:"https://ul.h3z.jp/FqPzx12Q.png", price:140 },
    { id:"fert_timeno",  name:"⑤《時間を信じない肥料》", desc:"最終兵器。\n稀に事件。", img:"https://ul.h3z.jp/l2njWY57.png", price:220 },
  ];

  /* =========================
     DOM
  ========================= */
  const el = {
    octoNow:   $("#octoNow"),

    chipSeed:  $("#chipSeed"),
    chipWater: $("#chipWater"),
    chipFert:  $("#chipFert"),
    chipDup:   $("#chipDup"),
    chipNext:  $("#chipNext"),

    boardPrice: $("#boardPrice"),
    boardMult:  $("#boardMult"),
    boardRare:  $("#boardRare"),
    boardNext:  $("#boardNext"),

    chart: $("#chart"),

    modes: $all(".rt-mode"),
    panels: $all(".rt-panel"),

    rareBtns: $all(".rt-rare"),

    buyGrid: $("#buyGrid"),
    subTabs: $all(".rt-subtab"),

    sellList: $("#sellList"),
    sellHint: $("#sellPriceHint"),

    invSeed: $("#invSeed"),
    invWater: $("#invWater"),
    invFert: $("#invFert"),

    takopiSay: $("#takopiSay"),
    btnMikuji: $("#btnMikuji"),
    btnGift: $("#btnGift"),

    modal: $("#modal"),
    modalBg: $("#modalBg"),
    modalX: $("#modalX"),
    modalTitle: $("#modalTitle"),
    modalBody: $("#modalBody"),

    toast: $("#toast"),
  };

  function $(q){ return document.querySelector(q); }
  function $all(q){ return Array.from(document.querySelectorAll(q)); }

  /* =========================
     helpers
  ========================= */
  function clamp(x,a,b){ return Math.max(a, Math.min(b,x)); }
  function now(){ return Date.now(); }

  function fmtMMSS(ms){
    ms = Math.max(0, ms|0);
    const s = Math.floor(ms/1000);
    const mm = Math.floor(s/60);
    const ss = s%60;
    return String(mm).padStart(2,"0")+":"+String(ss).padStart(2,"0");
  }

  function ymdLocal(d = new Date()){
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const da = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${da}`;
  }

  /* =========================
     octo
  ========================= */
  function loadOcto(){
    const n = Number(localStorage.getItem(LS.octo) ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  function saveOcto(v){
    localStorage.setItem(LS.octo, String(Math.max(0, Math.floor(v))));
  }
  function addOcto(delta){
    const cur = loadOcto();
    const nxt = Math.max(0, cur + Math.floor(delta));
    saveOcto(nxt);
    return nxt;
  }

  /* =========================
     inv (tf_v1_inv)
  ========================= */
  function defaultInv(){
    const inv = { ver:1, seed:{}, water:{}, fert:{} };
    for (const x of SEEDS)  inv.seed[x.id] = 0;
    for (const x of WATERS) inv.water[x.id] = 0;
    for (const x of FERTS)  inv.fert[x.id] = 0;
    return inv;
  }

  function loadInv(){
    try{
      const raw = localStorage.getItem(LS.inv);
      if(!raw) return defaultInv();
      const inv = JSON.parse(raw);
      inv.seed = inv.seed || {};
      inv.water = inv.water || {};
      inv.fert = inv.fert || {};
      return inv;
    }catch(e){
      return defaultInv();
    }
  }
  function saveInv(inv){
    localStorage.setItem(LS.inv, JSON.stringify(inv));
  }
  function isFree(type,id){
    return !!FREE[type]?.has(id);
  }
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
    const nxt = Math.max(0, Math.floor(cur + delta));
    inv[type][id] = nxt;
  }

  /* =========================
     book (tf_v1_book)
  ========================= */
  function loadBook(){
    try{
      const raw = localStorage.getItem(LS.book);
      if(!raw) return { ver:1, got:{} };
      const b = JSON.parse(raw);
      if(!b || typeof b !== "object") return { ver:1, got:{} };
      b.got = b.got || {};
      return b;
    }catch(e){
      return { ver:1, got:{} };
    }
  }
  function saveBook(b){
    localStorage.setItem(LS.book, JSON.stringify(b));
  }

  /* =========================
     market (15-min)
     - rarityごとに series を持つ
  ========================= */
  const RARES = ["N","R","SR","UR","LR"];
  const MARKET_POINTS_MAX = 96; // 24h (15m * 96 = 1440m)

  function nextQuarterTime(ts = now()){
    const d = new Date(ts);
    const m = d.getMinutes();
    const nextM = m < 15 ? 15 : m < 30 ? 30 : m < 45 ? 45 : 60;
    d.setSeconds(0,0);
    if(nextM === 60){
      d.setMinutes(0);
      d.setHours(d.getHours()+1);
    }else{
      d.setMinutes(nextM);
    }
    return d.getTime();
  }

  function marketDefault(){
    const t = now();
    const obj = { ver:2, lastTick: t, series:{} };
    for(const r of RARES){
      obj.series[r] = [{ t, m: 1.00 }];
    }
    return obj;
  }

  function loadMarket(){
    try{
      const raw = localStorage.getItem(LS.market);
      if(!raw) return marketDefault();
      const m = JSON.parse(raw);
      if(!m || typeof m !== "object" || !m.series) return marketDefault();
      for(const r of RARES){
        if(!Array.isArray(m.series[r]) || m.series[r].length === 0){
          m.series[r] = [{ t: now(), m: 1.00 }];
        }
      }
      m.ver = 2;
      return m;
    }catch(e){
      return marketDefault();
    }
  }

  function saveMarket(m){
    localStorage.setItem(LS.market, JSON.stringify(m));
  }

  function stepMultiplier(prev){
    // B案：仮想通貨っぽい揺れ幅（±5〜15%中心）
    const u = (Math.random()*2 - 1); // [-1,1]
    const delta = u * 0.15;          // [-0.15, +0.15]
    const nxt = prev * (1 + delta);
    return clamp(nxt, 0.50, 2.50);
  }

  function ensureMarketUpToNow(market){
    const tNow = now();
    let boundary = nextQuarterTime(market.lastTick || tNow);

    if (!Number.isFinite(market.lastTick)) market.lastTick = tNow;

    let changed = false;
    while (boundary <= tNow){
      for(const r of RARES){
        const s = market.series[r];
        const last = s[s.length-1];
        const prevM = Number(last?.m ?? 1.00) || 1.00;
        const nxtM = stepMultiplier(prevM);
        s.push({ t: boundary, m: Number(nxtM.toFixed(4)) });
        if (s.length > MARKET_POINTS_MAX) s.splice(0, s.length - MARKET_POINTS_MAX);
      }
      market.lastTick = boundary;
      boundary = nextQuarterTime(boundary + 1000);
      changed = true;
    }

    if (changed) saveMarket(market);
    return market;
  }

  function getCurrentMult(market, rare){
    const s = market.series[rare] || [];
    const last = s[s.length-1];
    return Number(last?.m ?? 1.00) || 1.00;
  }

  /* =========================
     chart drawing
  ========================= */
  function drawChart(canvas, series, rare){
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    // clear
    ctx.clearRect(0,0,W,H);

    // background
    ctx.fillStyle = "rgba(0,0,0,.18)";
    ctx.fillRect(0,0,W,H);

    // padding
    const padL = 70, padR = 18, padT = 18, padB = 52;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    const pts = (series && series.length) ? series : [{t:now(), m:1.0}];
    const mults = pts.map(p => Number(p.m ?? 1));
    let minM = Math.min(...mults);
    let maxM = Math.max(...mults);

    // y range a bit padded
    const yPad = Math.max(0.05, (maxM - minM) * 0.15);
    minM = Math.max(0.35, minM - yPad);
    maxM = Math.min(3.0,  maxM + yPad);

    // grid
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.lineWidth = 1;

    for(let i=0;i<=4;i++){
      const y = padT + (plotH * i/4);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W-padR, y);
      ctx.stroke();
    }
    for(let i=0;i<=6;i++){
      const x = padL + (plotW * i/6);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, H-padB);
      ctx.stroke();
    }

    // axes labels (Y: multiplier, also price example)
    ctx.fillStyle = "rgba(234,240,255,.75)";
    ctx.font = "24px system-ui, -apple-system, Segoe UI, Roboto, Noto Sans JP, sans-serif";
    ctx.fillText(`相場倍率（${rare}）`, padL, 46);

    ctx.font = "18px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    for(let i=0;i<=4;i++){
      const mVal = maxM - (maxM-minM)*(i/4);
      const y = padT + plotH*(i/4);
      const label = `×${mVal.toFixed(2)}`;
      ctx.fillText(label, 10, y+6);
    }

    // line
    const n = pts.length;
    const xAt = (i) => padL + (plotW * (n===1?0:i/(n-1)));
    const yAt = (m) => padT + plotH * (1 - ((m - minM) / (maxM - minM || 1)));

    ctx.strokeStyle = "rgba(107,183,255,.90)";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();
    for(let i=0;i<n;i++){
      const x = xAt(i);
      const y = yAt(Number(pts[i].m ?? 1));
      if(i===0) ctx.moveTo(x,y);
      else ctx.lineTo(x,y);
    }
    ctx.stroke();

    // last point glow
    const last = pts[n-1];
    const lx = xAt(n-1);
    const ly = yAt(Number(last.m ?? 1));
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.beginPath();
    ctx.arc(lx, ly, 6, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = "rgba(107,183,255,.30)";
    ctx.beginPath();
    ctx.arc(lx, ly, 16, 0, Math.PI*2);
    ctx.fill();

    // x labels (show start/end times)
    const t0 = pts[0].t;
    const t1 = pts[n-1].t;

    ctx.fillStyle = "rgba(234,240,255,.65)";
    ctx.font = "18px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    ctx.fillText(fmtTimeHM(t0), padL, H-18);
    const endLabel = fmtTimeHM(t1);
    const wEnd = ctx.measureText(endLabel).width;
    ctx.fillText(endLabel, W-padR-wEnd, H-18);
  }

  function fmtTimeHM(ts){
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2,"0");
    const mm = String(d.getMinutes()).padStart(2,"0");
    return `${hh}:${mm}`;
  }

  /* =========================
     UI state
  ========================= */
  let mode = "buy";
  let sub = "seed";
  let rare = "N";

  let market = loadMarket();
  market = ensureMarketUpToNow(market);

  /* =========================
     modal
  ========================= */
  function openModal(title, html){
    el.modalTitle.textContent = title;
    el.modalBody.innerHTML = html;
    el.modal.setAttribute("aria-hidden","false");
  }
  function closeModal(){
    el.modal.setAttribute("aria-hidden","true");
    el.modalBody.innerHTML = "";
  }
  el.modalBg.addEventListener("click", closeModal);
  el.modalX.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e)=>{
    if(e.key==="Escape" && el.modal.getAttribute("aria-hidden")==="false") closeModal();
  });

  /* =========================
     toast (with optional undo)
  ========================= */
  let toastTimer = null;
  function showToast(html, ms=1600){
    clearTimeout(toastTimer);
    el.toast.innerHTML = html;
    el.toast.classList.add("is-show");
    el.toast.setAttribute("aria-hidden","false");
    toastTimer = setTimeout(()=>{
      el.toast.classList.remove("is-show");
      el.toast.setAttribute("aria-hidden","true");
    }, ms);
  }

  /* =========================
     render top chips
  ========================= */
  function sumInvType(inv, type, list){
    let sum = 0;
    for(const x of list){
      const c = invGet(inv, type, x.id);
      if (c === Infinity) continue; // 無料∞は合計に入れない（表示が分かりにくいので）
      sum += c;
    }
    return sum;
  }

  function countSellableDups(book){
    let n = 0;
    for(const k of Object.keys(book.got || {})){
      const it = book.got[k];
      const c = Math.max(0, Math.floor(Number(it.count ?? 0)));
      if(c >= 2) n += (c - 1);
    }
    return n;
  }

  /* =========================
     BUY (no confirm)
  ========================= */
  function listBySub(){
    if(sub==="seed") return { type:"seed", list: SEEDS };
    if(sub==="water") return { type:"water", list: WATERS };
    return { type:"fert", list: FERTS };
  }

  function canBuy(item, type){
    if (isFree(type,item.id)) return false;
    if (type==="seed" && item.id==="seed_colabo") return false; // シリアル専用
    return (item.price|0) > 0;
  }

  function buyItem(item, type, qty){
    qty = Math.max(1, Math.floor(qty));
    if(!canBuy(item,type)) return;

    const cost = (item.price|0) * qty;
    const cur = loadOcto();
    if(cur < cost){
      showToast(`🪙不足…たこ。必要：<b>${cost}</b>🪙`, 1600);
      return;
    }

    // pay
    saveOcto(cur - cost);

    // add inv
    const inv = loadInv();
    invAdd(inv, type, item.id, qty);
    saveInv(inv);

    // feedback
    showToast(`✨ <b>${item.name}</b> ×${qty} 仕入れた…たこ！（-${cost}🪙）`, 1800);
    // say
    if (el.takopiSay){
      el.takopiSay.innerHTML = `「✨ <b>${item.name}</b> ×${qty}…たこ。<br>次は“売り時”も見て…たこ？」`;
    }

    renderAll();
  }

  function renderBuy(){
    const { type, list } = listBySub();
    const inv = loadInv();

    const html = list.map(item=>{
      const cnt = invGet(inv, type, item.id);
      const labelCnt = (cnt===Infinity) ? "∞" : String(cnt);

      const ok = canBuy(item,type);
      const price = ok ? `${item.price}🪙` : (isFree(type,item.id) ? "無料∞" : "—");

      const disabled = !ok;

      return `
        <div class="rt-item">
          <div class="rt-pill">×${labelCnt}</div>

          <div class="rt-item__imgbox">
            <img src="${item.img}" alt="${escapeHtml(item.name)}">
          </div>

          <div class="rt-item__name">${escapeHtml(item.name)}</div>
          <div class="rt-item__desc">${escapeHtml(item.desc||"").replace(/\n/g,"<br>")}</div>

          <div class="rt-item__meta">
            <span>価格</span>
            <b>${price}</b>
          </div>

          <div class="rt-item__btns">
            <button class="rt-btn rt-btn--ghost" ${disabled ? "disabled":""} data-buy="1" data-id="${item.id}">補給…たこ（+1）</button>
            <button class="rt-btn rt-btn--good"  ${disabled ? "disabled":""} data-buy="10" data-id="${item.id}">仕入れる…たこ（+10）</button>
          </div>
        </div>
      `;
    }).join("");

    el.buyGrid.innerHTML = html || `<div class="rt-muted">商品がありません。</div>`;

    // bind
    el.buyGrid.querySelectorAll("button[data-buy]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const qty = Number(btn.getAttribute("data-buy")||"1");
        const id = btn.getAttribute("data-id");
        const item = list.find(x=>x.id===id);
        if(!item) return;
        buyItem(item, type, qty);
      });
    });
  }

  /* =========================
     SELL (duplicates only)
  ========================= */
  function getRarityOfCard(entry){
    const r = String(entry?.rarity || "").toUpperCase();
    if(RARES.includes(r)) return r;
    // fallback: unknown -> N
    return "N";
  }

  function sellPriceForRarity(rare, mult){
    const base = BASE_PRICE[rare] ?? 40;
    return Math.max(1, Math.round(base * mult));
  }

  function renderSell(){
    const book = loadBook();
    const invSell = [];

    for(const id of Object.keys(book.got || {})){
      const it = book.got[id];
      const count = Math.max(0, Math.floor(Number(it.count ?? 0)));
      if(count < 2) continue; // ダブりのみ

      const rarity = getRarityOfCard(it);
      invSell.push({
        id,
        name: String(it.name || id),
        img: String(it.img || ""),
        rarity,
        count,
        sellable: count - 1
      });
    }

    // selected market
    market = ensureMarketUpToNow(loadMarket());
    const mult = getCurrentMult(market, rare);
    const unit = sellPriceForRarity(rare, mult);
    el.sellHint.textContent = `${unit}🪙 (×${mult.toFixed(2)}) / 1枚`;

    // show only same rarity first? keep list but show all; user asked rarity separate -> use selected rarity line
    // For clarity, filter by selected rarity (keeps UI clean)
    const filtered = invSell.filter(x => x.rarity === rare);

    if(filtered.length === 0){
      el.sellList.innerHTML = `<div class="rt-muted">このレア（${rare}）で売れるダブりがない…たこ。</div>`;
      return;
    }

    el.sellList.innerHTML = filtered.map(row=>{
      const safeImg = row.img ? row.img : "";
      const unitPrice = unit;
      const maxQty = row.sellable;

      return `
        <div class="rt-sellrow" data-card="${row.id}">
          <div class="rt-thumb">${safeImg ? `<img src="${safeImg}" alt="">` : ""}</div>
          <div class="rt-sellmain">
            <div class="rt-sellname">${escapeHtml(row.name)}</div>
            <div class="rt-sellsub">
              <span>所持：<b>${row.count}</b></span>
              <span>売れる：<b>${maxQty}</b></span>
              <span>レア：<b>${row.rarity}</b></span>
            </div>
          </div>

          <div class="rt-sellctl">
            <div class="rt-qty">
              <button type="button" data-minus>-</button>
              <div class="rt-qtynum" data-qty>1</div>
              <button type="button" data-plus>+</button>
            </div>
            <button class="rt-btn rt-btn--good rt-sellbtn" type="button" data-sell>
              即決：<b>${unitPrice}🪙</b> <span class="rt-muted">(×${mult.toFixed(2)})</span>
            </button>
          </div>
        </div>
      `;
    }).join("");

    // bind qty and sell
    el.sellList.querySelectorAll(".rt-sellrow").forEach(box=>{
      const id = box.getAttribute("data-card");
      const qtyEl = box.querySelector("[data-qty]");
      const minus = box.querySelector("[data-minus]");
      const plus  = box.querySelector("[data-plus]");
      const sellBtn = box.querySelector("[data-sell]");

      const data = filtered.find(x=>x.id===id);
      if(!data) return;

      let qty = 1;
      const maxQty = data.sellable;

      function refresh(){
        qty = clamp(qty, 1, Math.max(1, maxQty));
        qtyEl.textContent = String(qty);

        // update button label (price * qty)
        const total = unitPrice * qty;
        sellBtn.innerHTML = `即決：<b>${total}🪙</b> <span class="rt-muted">(×${mult.toFixed(2)})</span>`;
      }

      minus.addEventListener("click", ()=>{ qty--; refresh(); });
      plus.addEventListener("click", ()=>{ qty++; refresh(); });

      sellBtn.addEventListener("click", ()=>{
        // execute sell (no confirm), but offer undo for 2s
        doSellDuplicate(id, data, qty, unitPrice, mult);
      });

      refresh();
    });
  }

  function doSellDuplicate(cardId, data, qty, unitPrice, mult){
    qty = Math.max(1, Math.floor(qty));
    const book = loadBook();
    const entry = book.got[cardId];
    if(!entry){
      showToast("売却失敗…たこ（データなし）", 1600);
      return;
    }

    const curCount = Math.max(0, Math.floor(Number(entry.count ?? 0)));
    const sellable = Math.max(0, curCount - 1);
    if(sellable <= 0){
      showToast("売れない…たこ（ダブりがない）", 1600);
      return;
    }
    qty = Math.min(qty, sellable);

    const gain = unitPrice * qty;

    // apply
    entry.count = curCount - qty;
    entry.lastAt = Date.now();
    book.got[cardId] = entry;
    saveBook(book);

    const newOcto = addOcto(gain);

    // undo info
    const undoKey = `undo_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const undoPayload = { cardId, qty, gain };

    showToast(
      `🃏 <b>${escapeHtml(data.name)}</b> ×${qty} を売った…たこ！ +<b>${gain}</b>🪙 <span class="rt-muted">(×${mult.toFixed(2)})</span>
       &nbsp; <button class="rt-btn rt-btn--ghost" style="padding:6px 10px;border-radius:999px;" data-undo="${undoKey}">取り消す</button>`,
      2000
    );

    // bind undo
    const btn = el.toast.querySelector(`button[data-undo="${undoKey}"]`);
    if(btn){
      btn.addEventListener("click", ()=>{
        undoSell(undoPayload);
        // hide toast quickly
        el.toast.classList.remove("is-show");
      });
    }

    renderAll();
  }

  function undoSell(payload){
    const { cardId, qty, gain } = payload;

    // revert octo (if enough)
    const cur = loadOcto();
    if(cur < gain){
      showToast("取り消し失敗…たこ（🪙不足）", 1600);
      return;
    }
    saveOcto(cur - gain);

    // restore book
    const book = loadBook();
    const entry = book.got[cardId];
    if(!entry){
      showToast("取り消し失敗…たこ（カードなし）", 1600);
      return;
    }
    const curCount = Math.max(0, Math.floor(Number(entry.count ?? 0)));
    entry.count = curCount + qty;
    entry.lastAt = Date.now();
    book.got[cardId] = entry;
    saveBook(book);

    showToast("⏪ 取り消した…たこ。", 1200);
    renderAll();
  }

  /* =========================
     Inventory view
  ========================= */
  function renderInv(){
    const inv = loadInv();
    el.invSeed.innerHTML  = renderInvList("seed", SEEDS, inv);
    el.invWater.innerHTML = renderInvList("water", WATERS, inv);
    el.invFert.innerHTML  = renderInvList("fert", FERTS, inv);
  }

  function renderInvList(type, list, inv){
    return list.map(x=>{
      const c = invGet(inv, type, x.id);
      const label = (c===Infinity) ? "∞" : String(c);
      return `<div class="rt-invitem"><span>${escapeHtml(x.name)}</span><b>×${label}</b></div>`;
    }).join("");
  }

  /* =========================
     Gift (one-time)
  ========================= */
  function openGiftModal(){
    openModal("公開記念：たこぴからプレゼント", `
      <div class="rt-muted" style="margin-bottom:10px;line-height:1.55;">
        ホームページ公開記念…たこ。<br>
        受け取ると <b>ファーム(tf_v1_inv)</b> に入る…たこ。
      </div>

      <div class="rt-glow">
        <div class="rt-big">🎁 内容</div>
        <div class="rt-muted" style="line-height:1.55;">
          ・店頭タネ ×10<br>
          ・回線タネ ×10<br>
          ・たこぴのタネ ×1<br>
          ・水（無料以外）各 ×3<br>
          ・肥料（無料以外）各 ×3
        </div>
      </div>

      <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
        <button class="rt-btn rt-btn--good" id="btnGiftGet" type="button">受け取る…たこ</button>
        <button class="rt-btn rt-btn--ghost" id="btnGiftClose" type="button">閉じる</button>
      </div>
    `);

    $("#btnGiftClose").addEventListener("click", closeModal);
    $("#btnGiftGet").addEventListener("click", ()=>{
      if(localStorage.getItem(LS.giftDone)==="1"){
        showToast("もう受け取ってる…たこ。", 1400);
        closeModal();
        return;
      }

      const inv = loadInv();

      invAdd(inv, "seed", "seed_shop", 10);
      invAdd(inv, "seed", "seed_line", 10);
      invAdd(inv, "seed", "seed_special", 1);

      for(const w of WATERS){
        if(isFree("water", w.id)) continue;
        invAdd(inv, "water", w.id, 3);
      }
      for(const f of FERTS){
        if(isFree("fert", f.id)) continue;
        invAdd(inv, "fert", f.id, 3);
      }

      saveInv(inv);
      localStorage.setItem(LS.giftDone, "1");

      showToast("🎁 受け取った…たこ！ 在庫に反映した…たこ！", 1800);
      if (el.takopiSay){
        el.takopiSay.innerHTML = `「受け取った…たこ。<br>次は…相場が良い日に…売る…たこ？」`;
      }
      closeModal();
      renderAll();
    });
  }

  /* =========================
     Mikuji (daily)
  ========================= */
  const TAKOYAKI_IMG = "https://ul.h3z.jp/muPEAkao.png"; // placeholder (畑の空画像)
  const YAKI_IMG = "https://ul.h3z.jp/AmlnQA1b.png";     // placeholder (READY)

  function canMikuji(){
    return localStorage.getItem(LS.mikujiLast) !== ymdLocal();
  }

  function openMikuji(){
    if(!canMikuji()){
      openModal("たこ焼きみくじ", `
        <div class="rt-muted" style="line-height:1.55;">
          今日はもう引いた…たこ。<br>
          また明日…たこ。
        </div>
        <div style="margin-top:12px;">
          <button class="rt-btn rt-btn--ghost" id="mikujiClose" type="button">閉じる</button>
        </div>
      `);
      $("#mikujiClose").addEventListener("click", closeModal);
      return;
    }

    const picks = Array.from({length:6}, (_,i)=>i);

    openModal("たこ焼きみくじ（1日1回）", `
      <div class="rt-mikuji">
        <div class="rt-muted" style="line-height:1.55;">
          焼き台のたこ焼きから <b>1つ</b> 選ぶ…たこ。<br>
          当たると…中身が光る…たこ。
        </div>

        <div class="rt-yaki" id="yakiGrid">
          ${picks.map(i=>`
            <button type="button" data-pick="${i}">
              <img src="${TAKOYAKI_IMG}" alt="たこ焼き">
            </button>
          `).join("")}
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="rt-btn rt-btn--ghost" id="mikujiClose" type="button">閉じる</button>
        </div>
      </div>
    `);

    $("#mikujiClose").addEventListener("click", closeModal);

    $("#yakiGrid").querySelectorAll("button[data-pick]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        // commit daily
        localStorage.setItem(LS.mikujiLast, ymdLocal());

        const reward = rollMikujiReward();
        applyMikujiReward(reward);

        openModal("当たり…たこ！", `
          <div class="rt-glow">
            <div class="rt-big">✨ たこ焼きが光った…たこ！</div>
            <div class="rt-muted" style="line-height:1.55;">
              <b>${escapeHtml(reward.label)}</b>
            </div>
            <img src="${YAKI_IMG}" alt="光るたこ焼き">
          </div>
          <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
            <button class="rt-btn rt-btn--good" id="mikujiOk" type="button">受け取る…たこ</button>
          </div>
        `);

        $("#mikujiOk").addEventListener("click", ()=>{
          showToast(`🎲 ${escapeHtml(reward.toast)}`, 1800);
          closeModal();
          renderAll();
        });
      });
    });
  }

  function rollMikujiReward(){
    // 軽いけどワクワク：資材 or 🪙
    const r = Math.random();
    if(r < 0.25) return { kind:"octo", amount: 200, label:"🪙 +200 オクト", toast:"🪙 +200…たこ！" };
    if(r < 0.45) return { kind:"seed", id:"seed_shop", amount: 3, label:"🌱 店頭タネ ×3", toast:"🌱 店頭タネ ×3…たこ！" };
    if(r < 0.60) return { kind:"seed", id:"seed_line", amount: 3, label:"🌱 回線タネ ×3", toast:"🌱 回線タネ ×3…たこ！" };
    if(r < 0.75) return { kind:"water", id:"water_overdo", amount: 1, label:"💧 やりすぎな水 ×1", toast:"💧 勝負水…たこ！" };
    if(r < 0.90) return { kind:"fert", id:"fert_skip", amount: 1, label:"🧪 工程すっ飛ばし肥料 ×1", toast:"🧪 途中…消した…たこ！" };
    return { kind:"seed", id:"seed_special", amount: 1, label:"🌱 たこぴのタネ ×1", toast:"🌱 たこぴのタネ…たこ！" };
  }

  function applyMikujiReward(reward){
    if(reward.kind === "octo"){
      addOcto(reward.amount|0);
      return;
    }
    const inv = loadInv();
    if(reward.kind === "seed")  invAdd(inv, "seed", reward.id, reward.amount|0);
    if(reward.kind === "water") invAdd(inv, "water", reward.id, reward.amount|0);
    if(reward.kind === "fert")  invAdd(inv, "fert", reward.id, reward.amount|0);
    saveInv(inv);
  }

  /* =========================
     mode switching (no mix)
  ========================= */
  function setMode(next){
    mode = next;
    el.modes.forEach(b=>{
      b.classList.toggle("is-on", b.getAttribute("data-mode")===mode);
    });
    el.panels.forEach(p=>{
      p.classList.toggle("is-show", p.getAttribute("data-panel")===mode);
    });
    renderAll();
  }

  function setSub(next){
    sub = next;
    el.subTabs.forEach(b=>{
      b.classList.toggle("is-on", b.getAttribute("data-sub")===sub);
    });
    renderAll();
  }

  function setRare(next){
    rare = next;
    el.rareBtns.forEach(b=>{
      b.classList.toggle("is-on", b.getAttribute("data-rare")===rare);
    });
    renderAll();
  }

  /* =========================
     render board (price + mult + countdown)
  ========================= */
  function msToNextTick(){
    const n = now();
    const next = nextQuarterTime(n);
    return next - n;
  }

  function renderBoard(){
    market = ensureMarketUpToNow(loadMarket());

    const mult = getCurrentMult(market, rare);
    const price = sellPriceForRarity(rare, mult);

    el.boardRare.textContent = rare;
    el.boardMult.textContent = `(×${mult.toFixed(2)})`;
    el.boardPrice.textContent = String(price);

    const left = msToNextTick();
    const mmss = fmtMMSS(left);
    el.boardNext.textContent = mmss;
    el.chipNext.textContent = mmss;

    // also sell hint uses same
    if (el.sellHint) el.sellHint.textContent = `${price}🪙 (×${mult.toFixed(2)}) / 1枚`;

    // draw chart (mult series)
    const series = market.series[rare] || [];
    drawChart(el.chart, series, rare);
  }

  /* =========================
     render summary chips
  ========================= */
  function renderChips(){
    el.octoNow.textContent = String(loadOcto());

    const inv = loadInv();
    el.chipSeed.textContent  = String(sumInvType(inv, "seed", SEEDS));
    el.chipWater.textContent = String(sumInvType(inv, "water", WATERS));
    el.chipFert.textContent  = String(sumInvType(inv, "fert", FERTS));

    const book = loadBook();
    el.chipDup.textContent = String(countSellableDups(book));
  }

  /* =========================
     full render
  ========================= */
  function renderAll(){
    renderChips();
    renderBoard();

    if(mode==="buy"){
      renderBuy();
    }else if(mode==="sell"){
      renderSell();
    }else{
      renderInv();
    }
  }

  /* =========================
     events
  ========================= */
  el.modes.forEach(btn=>{
    btn.addEventListener("click", ()=> setMode(btn.getAttribute("data-mode")));
  });

  el.subTabs.forEach(btn=>{
    btn.addEventListener("click", ()=> setSub(btn.getAttribute("data-sub")));
  });

  el.rareBtns.forEach(btn=>{
    btn.addEventListener("click", ()=> setRare(btn.getAttribute("data-rare")));
  });

  el.btnMikuji.addEventListener("click", openMikuji);
  el.btnGift.addEventListener("click", openGiftModal);

  // 初回だけギフトを目立たせたい（押すまで何度でもOK）
  function hintGift(){
    if(localStorage.getItem(LS.giftDone)==="1") return;
    showToast("🎁 公開記念ギフトがある…たこ。右のボタンで受け取れる…たこ。", 2200);
  }

  /* =========================
     safe HTML
  ========================= */
  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  /* =========================
     start
  ========================= */
  // default mode: buy
  setMode("buy");
  setSub("seed");
  setRare("N");

  // ensure market now
  market = ensureMarketUpToNow(loadMarket());
  saveMarket(market);

  // first render
  renderAll();
  hintGift();

  // tick every 1s (countdown + boundary update)
  setInterval(()=> {
    renderBoard(); // light enough: one canvas draw per second
  }, 1000);

})();


