
/* =========================================================
   sell.js（図鑑のダブり売却）/* =========================================================
   sell.js（図鑑の売却）
   - tf_v1_book.got が「配列 / オブジェクト」どちらでも対応
   - 通常カード：ダブり（count>1）のみ売れる（1枚は残す）
   - 職人カード：1枚でも売れる（設定で「1枚残す」にもできる）
   - 売却：count を減らし、roten_v1_octo に加算
========================================================= */
(() => {
  "use strict";

  const LS = {
    octo: "roten_v1_octo",
    book: "tf_v1_book"
  };

  // =========================
  // ✅ 設定（ここだけ好みで）
  // =========================

  // 職人カード（CRAFT）は「1枚でも売れる」にする？
  // true : 1枚でも売れる（0枚になるまで売れる）
  // false: 通常カードと同じ（1枚は残す＝count>1のみ売れる）
  const CRAFT_CAN_SELL_LAST_ONE = true;

  // =========================

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

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

  // =========================
  // ✅ 職人判定
  // =========================
  function isCraftId(id){
    const s = String(id || "").trim().toUpperCase();
    return s.startsWith("CRAFT_") || s.startsWith("CRAFT-") || s.startsWith("CRAFT");
  }
  function isCraftEntry(entry){
    const r = String(entry?.rarity || entry?.rank || "").trim().toUpperCase();
    return r === "CRAFT" || r.includes("CRAFT");
  }
  function isCraftCard(id, entry){
    return isCraftId(id) || isCraftEntry(entry);
  }

  // =========================
  // ✅ book読み込み（配列/オブジェクト両対応）
  // - 内部では必ず got を { [id]: entry } に揃える
  // =========================
  function normalizeBook(bookRaw){
    const book = bookRaw && typeof bookRaw === "object" ? bookRaw : { ver:1, got:{} };
    let got = book.got;

    // got が配列なら {id:entry} に変換
    if(Array.isArray(got)){
      const map = {};
      for(const x of got){
        const id = String(x?.id || "").trim();
        if(!id) continue;
        // 同IDが複数来たら count を合算（念のため）
        const prev = map[id];
        if(prev){
          const pc = Number(prev.count || 1);
          const nc = Number(x?.count || 1);
          map[id] = { ...prev, ...x, count: (Number.isFinite(pc)?pc:1) + (Number.isFinite(nc)?nc:1) };
        }else{
          map[id] = { ...x, count: (Number.isFinite(Number(x?.count)) ? Number(x.count) : 1) };
        }
      }
      book.got = map;
      return book;
    }

    // got がオブジェクトならそのまま
    if(got && typeof got === "object"){
      book.got = got;
      return book;
    }

    book.got = {};
    return book;
  }

  function loadBook(){
    const raw = loadJSON(LS.book, { ver:1, got:{} });
    return normalizeBook(raw);
  }

  function saveBook(book){
    // 保存は常にオブジェクト形式でOK（あなたの図鑑は object / array 両方読める）
    saveJSON(LS.book, book);
  }

  // =========================
  // 価格ルール（必要ならここだけ調整）
  // =========================
  function priceFor(meta){
    const base = 150;
    const r = (meta.rarity || "").toUpperCase();

    // ✅ 職人は少し高め（お好みで）
    if(r.includes("CRAFT")) return 400;

    if(r.includes("LR")) return 3000;
    if(r.includes("UR")) return 1500;
    if(r.includes("SR")) return 500;
    if(r.includes("R"))  return 300;
    return base;
  }

  // bookの中身の揺れに強く
  function resolveMeta(id, entry){
    const name = entry?.name || entry?.title || id;
    const img  = entry?.img  || entry?.image || entry?.url || null;
    const rarity = entry?.rarity || entry?.rank || "";
    const fallbackImg = "https://ul.h3z.jp/7moREJnl.png";
    return { id, name, img: img || fallbackImg, rarity };
  }

  // ---- modal ----
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

  // =========================
  // ✅ 売却対象の収集
  // - 通常: count>1 のみ（1枚残す）
  // - 職人: 設定により count>0 でもOK
  // =========================
  function collectSellableCards(){
    const book = loadBook();
    const out = [];

    for(const id of Object.keys(book.got || {})){
      const entry = book.got[id];
      const count = Number(entry?.count || 0);

      if(!Number.isFinite(count) || count <= 0) continue;

      const craft = isCraftCard(id, entry);

      // 通常はダブりのみ
      // 職人は設定で 1枚でもOK にできる
      let canSell = 0;

      if(craft){
        canSell = CRAFT_CAN_SELL_LAST_ONE ? count : Math.max(0, count - 1);
      }else{
        canSell = Math.max(0, count - 1);
      }

      if(canSell <= 0) continue;

      const meta = resolveMeta(id, entry);
      // rarityにCRAFT表記が無い場合でも、ここで付けておく（表示/価格用）
      if(craft && !String(meta.rarity || "").toUpperCase().includes("CRAFT")){
        meta.rarity = meta.rarity ? `${meta.rarity} / CRAFT` : "CRAFT";
      }

      const unit = priceFor(meta);

      out.push({
        id,
        meta,
        count,
        canSell,   // 売れる最大枚数（通常＝count-1、職人＝count など）
        unit,
        craft
      });
    }

    return out;
  }

  function refreshTop(){
    $("#sellOcto") && ($("#sellOcto").textContent = String(getOcto()));
    const list = collectSellableCards();
    const total = list.reduce((a,c)=>a + c.canSell, 0);
    $("#sellDupTotal") && ($("#sellDupTotal").textContent = String(total));
  }

  function applyFilterSort(list){
    const q = ($("#q")?.value || "").trim().toLowerCase();
    const sort = $("#sort")?.value || "dupdesc";

    let a = list;

    if(q){
      a = a.filter(x => {
        const n = (x.meta.name || "").toLowerCase();
        const id = (x.id || "").toLowerCase();
        return n.includes(q) || id.includes(q);
      });
    }

    a = a.slice();
    a.sort((p, q2) => {
      if(sort === "dupdesc") return (q2.canSell - p.canSell) || (q2.unit - p.unit) || (p.meta.name.localeCompare(q2.meta.name));
      if(sort === "named")   return p.meta.name.localeCompare(q2.meta.name);
      if(sort === "namea")   return q2.meta.name.localeCompare(p.meta.name);
      if(sort === "pricedesc") return (q2.unit - p.unit) || (q2.canSell - p.canSell);
      if(sort === "priceasc")  return (p.unit - q2.unit) || (q2.canSell - p.canSell);
      return 0;
    });

    return a;
  }

  function render(){
    refreshTop();

    const grid = $("#sellGrid");
    if(!grid) return;

    const list = applyFilterSort(collectSellableCards());

    if(list.length === 0){
      grid.innerHTML = `
        <div style="grid-column:1/-1; padding:14px; border:1px solid rgba(255,255,255,.12); border-radius:16px; background:rgba(0,0,0,.18);">
          <div style="font-weight:900;">売れるカードがない…</div>
          <div style="color:rgba(255,255,255,.72); font-size:12px; margin-top:6px;">
            たこぴ：<br>「今は…売るものが無い…たこ。<br>（ダブりが増えるか、職人カードが増えたら出るよ…たこ）」 
          </div>
        </div>
      `;
      return;
    }

    grid.innerHTML = list.map(x => {
      const maxSell = x.canSell;
      const label = x.meta.rarity ? ` / ${x.meta.rarity}` : "";
      const craftTag = x.craft ? `<span style="margin-left:6px;padding:2px 8px;border:1px solid rgba(255,255,255,.14);border-radius:999px;font-size:11px;opacity:.9;">職人</span>` : "";
      const keepNote = x.craft
        ? (CRAFT_CAN_SELL_LAST_ONE ? "※職人は0枚になるまで売れる" : "※職人も1枚は残る")
        : "※通常カードは必ず1枚残る";

      return `
        <article class="card" data-id="${x.id}">
          <div class="card-top">
            <div class="imgbox"><img src="${x.meta.img}" alt="${x.meta.name}" loading="lazy"></div>
            <div class="meta">
              <div class="name">${x.meta.name}${craftTag}</div>
              <div class="desc">ID: ${x.id}${label}</div>
              <div class="desc">売値：<b>${x.unit}</b> オクト / 1枚</div>
              <div class="desc" style="opacity:.7;font-size:11px;">${keepNote}</div>
            </div>
          </div>
          <div class="row">
            <div class="badge">所持 <b>${x.count}</b> / 売れる <b>${maxSell}</b></div>
            <button class="btn sellbtn" data-sell="1">売る</button>
          </div>
        </article>
      `;
    }).join("");

    $$(".card", grid).forEach(card => {
      card.querySelector('[data-sell="1"]')?.addEventListener("click", () => {
        const id = card.getAttribute("data-id");
        const target = list.find(x => x.id === id);
        if(!target) return;
        openSellModal(target);
      });
    });
  }

  function openSellModal(item){
    const maxSell = item.canSell;
    const unit = item.unit;

    const options = Array.from({length:maxSell}).map((_,i)=>{
      const n = i+1;
      return `<option value="${n}">${n} 枚</option>`;
    }).join("");

    openModal("♻️ 売却", `
      <div class="fx">
        <div style="font-weight:900; font-size:14px;">🎰 売却イベント発生</div>

        <div class="line"></div>

        <div style="display:grid; grid-template-columns: 96px 1fr; gap:12px; align-items:center;">
          <div style="width:96px;height:96px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.18);display:flex;align-items:center;justify-content:center;overflow:hidden;">
            <img src="${item.meta.img}" alt="${item.meta.name}" style="width:84px;height:auto;image-rendering:pixelated;display:block;">
          </div>
          <div style="display:grid;gap:6px;">
            <div style="font-weight:900;">${item.meta.name}</div>
            <div class="note">ID: ${item.id}</div>
            <div class="note">所持：${item.count} / 売れる：${maxSell}</div>
            <div class="note">売値：<b>${unit}</b> オクト / 1枚</div>
          </div>
        </div>

        <div class="line"></div>

        <div style="display:grid; gap:8px;">
          <div class="note">何枚売る？</div>
          <select class="qty" id="sellQty">${options}</select>
          <div class="note">合計：<b id="sellTotal">${unit}</b> オクト</div>
        </div>

        <div class="line"></div>

        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          <button class="btn" id="doSell" style="border-color:rgba(255,210,124,.40);background:linear-gradient(180deg, rgba(255,210,124,.22), rgba(0,0,0,.18));font-weight:900;">
            🪙 売却する
          </button>
          <button class="btn btn-ghost" id="cancelSell">やめる</button>
        </div>
      </div>
    `);

    const qtyEl = $("#sellQty");
    const totalEl = $("#sellTotal");

    const recalc = () => {
      const n = Number(qtyEl?.value || 1);
      totalEl && (totalEl.textContent = String(n * unit));
    };
    qtyEl?.addEventListener("change", recalc);
    recalc();

    $("#cancelSell")?.addEventListener("click", closeModal);
    $("#doSell")?.addEventListener("click", () => {
      const n = Number(qtyEl?.value || 1);
      doSell(item.id, n);
      closeModal();
      render();
    });
  }

  function doSell(id, qty){
    const book = loadBook();
    const entry = book.got?.[id];
    if(!entry) return;

    const count = Number(entry.count || 0);
    if(!Number.isFinite(count) || count <= 0) return;

    const craft = isCraftCard(id, entry);

    // 売れる最大枚数
    const maxSell = craft
      ? (CRAFT_CAN_SELL_LAST_ONE ? count : Math.max(0, count - 1))
      : Math.max(0, count - 1);

    const canSell = Math.max(0, Math.min(maxSell, Math.floor(Number(qty)||0)));
    if(canSell <= 0) return;

    const meta = resolveMeta(id, entry);
    if(craft && !String(meta.rarity || "").toUpperCase().includes("CRAFT")){
      meta.rarity = meta.rarity ? `${meta.rarity} / CRAFT` : "CRAFT";
    }

    const unit = priceFor(meta);
    const gain = unit * canSell;

    // count 減らす
    entry.count = count - canSell;

    // 0枚になったら削除する（職人を0まで売れる設定のとき）
    if(entry.count <= 0){
      delete book.got[id];
    }else{
      book.got[id] = entry;
    }

    saveBook(book);

    // オクト増やす
    setOcto(getOcto() + gain);
  }

  function wire(){
    $("#q")?.addEventListener("input", render);
    $("#sort")?.addEventListener("change", render);
    $("#btnRefresh")?.addEventListener("click", render);

    $("#btnSellHelp")?.addEventListener("click", () => {
      openModal("売り方", `
        <div class="fx">
          <div style="font-weight:900;">やることは2つだけ</div>
          <div class="note" style="margin-top:8px;">
            1) 売るカードを選ぶ<br>
            2) 枚数を選んで「売却する」<br><br>
            ※通常カードは必ず1枚残る<br>
            ※職人カードは設定により0枚まで売れる
          </div>
          <div style="margin-top:12px;">
            <button class="btn" id="okHelp">OK</button>
          </div>
        </div>
      `);
      $("#okHelp")?.addEventListener("click", closeModal);
    });
  }

  function boot(){
    wire();
    render();
  }

  boot();
})();
