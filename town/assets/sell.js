
/* =========================================================
   sell.js（図鑑のダブり売却）
   - 対象: tf_v1_book.got[id].count > 1 のものだけ
   - 売却: count から指定枚数を減らし、roten_v1_octo に加算
   - 探しやすさ: 検索 + ソート
   - 画像/名前: book側に無い場合は id 表示（拡張できるように設計）
========================================================= */
(() => {
  "use strict";

  const LS = {
    octo: "roten_v1_octo",
    book: "tf_v1_book"
  };

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

  function loadBook(){
    const book = loadJSON(LS.book, { ver:1, got:{} });
    book.got = book.got || {};
    return book;
  }
  function saveBook(book){
    saveJSON(LS.book, book);
  }

  // ---- 価格ルール（必要ならここだけ後で調整） ----
  // ・基本：1枚 = 5オクト
  // ・rarity が入っていれば上げる（あれば、の話）
  function priceFor(meta){
    const base = 5;
    const r = (meta.rarity || "").toUpperCase();
    if(r.includes("LR")) return 80;
    if(r.includes("UR")) return 40;
    if(r.includes("SR")) return 20;
    if(r.includes("R"))  return 10;
    return base;
  }

  // book.got の中身がカードによって違っても落ちないようにする
  function resolveMeta(id, entry){
    // entryに name/img がある場合はそれを使う
    const name = entry?.name || entry?.title || id;
    const img  = entry?.img  || entry?.image || entry?.url || null;
    const rarity = entry?.rarity || entry?.rank || "";
    // 画像が無い場合のプレースホルダ（売却ページ用）
    const fallbackImg = "https://ul.h3z.jp/7moREJnl.png"; // たこ焼き画像
    return {
      id,
      name,
      img: img || fallbackImg,
      rarity
    };
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

  // ---- build list ----
  function collectDupCards(){
    const book = loadBook();
    const out = [];
    for(const id of Object.keys(book.got)){
      const entry = book.got[id];
      const count = Number(entry?.count || 0);
      if(count > 1){
        const meta = resolveMeta(id, entry);
        const dup = count - 1;
        const unit = priceFor(meta);
        out.push({
          id,
          meta,
          count,
          dup,
          unit
        });
      }
    }
    return out;
  }

  function refreshTop(){
    $("#sellOcto") && ($("#sellOcto").textContent = String(getOcto()));
    const list = collectDupCards();
    const totalDup = list.reduce((a,c)=>a+c.dup, 0);
    $("#sellDupTotal") && ($("#sellDupTotal").textContent = String(totalDup));
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
      if(sort === "dupdesc") return (q2.dup - p.dup) || (q2.unit - p.unit) || (p.meta.name.localeCompare(q2.meta.name));
      if(sort === "named")   return p.meta.name.localeCompare(q2.meta.name);
      if(sort === "namea")   return q2.meta.name.localeCompare(p.meta.name);
      if(sort === "pricedesc") return (q2.unit - p.unit) || (q2.dup - p.dup);
      if(sort === "priceasc")  return (p.unit - q2.unit) || (q2.dup - p.dup);
      return 0;
    });

    return a;
  }

  function render(){
    refreshTop();

    const grid = $("#sellGrid");
    if(!grid) return;

    const list = applyFilterSort(collectDupCards());

    if(list.length === 0){
      grid.innerHTML = `
        <div style="grid-column:1/-1; padding:14px; border:1px solid rgba(255,255,255,.12); border-radius:16px; background:rgba(0,0,0,.18);">
          <div style="font-weight:900;">ダブりカードがない…</div>
          <div style="color:rgba(255,255,255,.72); font-size:12px; margin-top:6px;">
            たこぴ：<br>「売れるほど集めたってこと…すごい…たこ。<br>でも今は、売るものが無い…たこ。」
          </div>
        </div>
      `;
      return;
    }

    grid.innerHTML = list.map(x => {
      const maxSell = x.dup; // 1枚は残す
      const label = x.meta.rarity ? ` / ${x.meta.rarity}` : "";
      return `
        <article class="card" data-id="${x.id}">
          <div class="card-top">
            <div class="imgbox"><img src="${x.meta.img}" alt="${x.meta.name}" loading="lazy"></div>
            <div class="meta">
              <div class="name">${x.meta.name}</div>
              <div class="desc">ID: ${x.id}${label}</div>
              <div class="desc">売値：<b>${x.unit}</b> オクト / 1枚</div>
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
    const maxSell = item.dup;
    const unit = item.unit;

    const options = Array.from({length:maxSell}).map((_,i)=>{
      const n = i+1;
      return `<option value="${n}">${n} 枚</option>`;
    }).join("");

    openModal("♻️ 売却（ダブりのみ）", `
      <div class="fx">
        <div style="font-weight:900; font-size:14px;">🎰 売却イベント発生</div>
        <div class="note" style="margin-top:6px;">
          たこぴ：<br>
          「売るってことは…“手放す”ってこと…たこ。<br>
          でもね、手放した分だけ…オクトは増える…たこ。」
        </div>

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
          <div class="note">何枚売る？（※必ず1枚は残る）</div>
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
    const dup = count - 1;
    const canSell = Math.max(0, Math.min(dup, qty));
    if(canSell <= 0) return;

    const meta = resolveMeta(id, entry);
    const unit = priceFor(meta);
    const gain = unit * canSell;

    // 図鑑 count 減らす（1枚は残る）
    entry.count = count - canSell;
    book.got[id] = entry;
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
            1) ダブりカード（所持2枚以上）から選ぶ<br>
            2) 売る枚数を選んで「売却する」<br><br>
            ※必ず1枚は残る（図鑑コンプが崩れない）
          </div>
          <div class="note" style="margin-top:10px;">
            たこぴ：<br>「売るのは怖い…でもね、<br>そのオクトで“次の運命”を買える…たこ。」
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
