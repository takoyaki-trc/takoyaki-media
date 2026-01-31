/* assets/roten.js
   - 棚1〜5タップで出品（初期2枠解放）
   - 所持カードは同IDまとめ表示（×枚数）
   - 出店中は行列（吹き出し）を表示（数秒ごと更新）
   - 図鑑（ダブり）→ 露店在庫(roten_v1_inventory) 同期
*/

(() => {
  // =========================
  // LSキー（★ここはキーだけ）
  // =========================
  const LS = {
    octo: "roten_v1_octo",
    inv: "roten_v1_inventory",
    myshop: "roten_v1_myshop",
    market: "roten_v1_market",
    log: "roten_v1_log",
    book: "tf_v1_book",
    dex:  "tf_v1_book",
    syncSeen: "roten_v1_sync_seen",
    unlocked: "roten_v1_shop_unlocked"
  };

  // =========================
  // ファーム資材在庫（種/水/肥料）: tf_v1_inv
  // （露店カード在庫 rotern_v1_inventory とは別）
  // =========================
  const TF_INV_KEY = "tf_v1_inv";

  // 無料（∞扱い）は増減しない
  const TF_FREE = {
    seed:  new Set(["seed_random"]),
    water: new Set(["water_plain_free"]),
    fert:  new Set(["fert_agedama"])
  };

  function tfLoadInv(){
    try{
      const raw = localStorage.getItem(TF_INV_KEY);
      if(!raw) return { ver:1, seed:{}, water:{}, fert:{} };
      const inv = JSON.parse(raw);
      inv.seed  = inv.seed  || {};
      inv.water = inv.water || {};
      inv.fert  = inv.fert  || {};
      return inv;
    }catch(e){
      return { ver:1, seed:{}, water:{}, fert:{} };
    }
  }
  function tfSaveInv(inv){
    localStorage.setItem(TF_INV_KEY, JSON.stringify(inv));
  }
  function tfIsFree(type, id){
    return !!TF_FREE[type]?.has(id);
  }
  function tfInvAdd(inv, type, id, delta){
    if(tfIsFree(type, id)) return; // 無料は増減しない
    if(!inv[type]) inv[type] = {};
    const cur = Number(inv[type][id] ?? 0);
    inv[type][id] = Math.max(0, cur + (Number(delta)||0));
  }

  // =========================
  // 図鑑キー候補（環境差吸収）
  // =========================
  const DEX_KEY_CANDIDATES = [
    LS.dex,
    "tf_v1_book",
    "tf_v1_dex",
    "tf_v1_zukan",
    "takodex_v1",
    "zukan_v1",
    "dex_v1"
  ];

  // =========================
  // 定数
  // =========================
  const PRICE_TIERS = [
    { id:"low",  label:"安い", mult: 0.9 },
    { id:"mid",  label:"普通", mult: 1.0 },
    { id:"high", label:"強気", mult: 1.25 }
  ];
  const DURATIONS = [
    { id:"1h", label:"1時間", ms: 1 * 60 * 60 * 1000 },
    { id:"3h", label:"3時間", ms: 3 * 60 * 60 * 1000 },
    { id:"6h", label:"6時間", ms: 6 * 60 * 60 * 1000 },
  ];

  const QUEUE_LINES = [
    "見てるだけ…見るだけだから…。",
    "今日の棚、匂う。",
    "それ…焼けてる？",
    "買うかどうかは、胃が決める。",
    "値段より“気分”だな。",
    "今夜の噂になりそう。",
    "王様…来るかな？",
    "棚が呼んでる。"
  ];

  // =========================
  // util
  // =========================
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const now = () => Date.now();

  function safeJsonParse(str, fallback){
    try{ return JSON.parse(str); }catch(e){ return fallback; }
  }
  function lsGet(key, fallback){
    const v = localStorage.getItem(key);
    if(v == null) return fallback;
    return safeJsonParse(v, fallback);
  }
  function lsSet(key, val){
    localStorage.setItem(key, JSON.stringify(val));
  }

  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll('"',"&quot;").replaceAll("'","&#39;");
  }
  function escapeHtmlAttr(s){
    return escapeHtml(s).replaceAll("`","&#96;");
  }
  function rarityPillHtml(r){
    if(r==="LR") return `<div class="pill lr">LR</div>`;
    if(r==="UR") return `<div class="pill ur">UR</div>`;
    if(r==="SR") return `<div class="pill sr">SR</div>`;
    return `<div class="pill">${escapeHtml(r)}</div>`;
  }

  function todayKeyJST(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const da = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${da}`;
  }

  function addLog(item){
    const log = lsGet(LS.log, []);
    log.unshift(item);
    if(log.length > 60) log.length = 60;
    lsSet(LS.log, log);
  }

  // =========================
  // オクト / 解放棚
  // =========================
  function ensureOcto(){
    const o = localStorage.getItem(LS.octo);
    if(o == null) localStorage.setItem(LS.octo, String(200));
  }
  function getOcto(){
    return Number(localStorage.getItem(LS.octo) || "0") || 0;
  }
  function setOcto(v){
    localStorage.setItem(LS.octo, String(Math.max(0, Math.floor(v))));
  }

  function ensureUnlocked(){
    const v = localStorage.getItem(LS.unlocked);
    if(v == null) localStorage.setItem(LS.unlocked, "2"); // 初期2
  }
  function getUnlocked(){
    const n = Number(localStorage.getItem(LS.unlocked) || "2");
    return Math.max(1, Math.min(5, Math.floor(n)));
  }

  // =========================
  // 図鑑（tf_v1_book）の count を 1 減らす
  // （最低1枚は残す）
  // ★ 1個だけ定義（重複禁止）
  // =========================
  function decrementBookCountById(cardId){
    const id = String(cardId || "").trim();
    if(!id) return false;

    const raw = localStorage.getItem(LS.book || "tf_v1_book");
    if(!raw) return false;

    const book = safeJsonParse(raw, null);
    if(!book || typeof book !== "object") return false;
    if(!book.got || typeof book.got !== "object") return false;

    const entry = book.got[id];
    if(!entry) return false;

    const cur = Number(entry.count);
    const curCount = Number.isFinite(cur) ? Math.floor(cur) : 1;

    if(curCount <= 1) return false; // 図鑑登録分は残す

    entry.count = curCount - 1;
    book.got[id] = entry;
    localStorage.setItem(LS.book || "tf_v1_book", JSON.stringify(book));
    return true;
  }





  // =========================
  // 図鑑（ダブり）→ 露店カード在庫 同期
  // =========================
  function getDexRaw(){
    for(const k of DEX_KEY_CANDIDATES){
      const raw = localStorage.getItem(k);
      if(raw != null) return { key:k, raw };
    }
    return { key:null, raw:null };
  }

  function normalizeDexEntries(dex){
    if(!dex) return [];
    if(Array.isArray(dex.cards)) return dex.cards;
    if(Array.isArray(dex.list))  return dex.list;
    if(Array.isArray(dex.items)) return dex.items;
    if(Array.isArray(dex.got))   return dex.got;

    // got が object(map)形式
    if(dex.got && typeof dex.got === "object" && !Array.isArray(dex.got)){
      return Object.values(dex.got);
    }

    if(Array.isArray(dex.dupes)) return dex.dupes;
    if(Array.isArray(dex.dup))   return dex.dup;

    if(dex.byId && typeof dex.byId === "object"){
      return Object.keys(dex.byId).map(id => ({ id, ...dex.byId[id] }));
    }
    if(dex.map && typeof dex.map === "object"){
      return Object.keys(dex.map).map(id => ({ id, ...dex.map[id] }));
    }

    return [];
  }

  function getEntryCountLike(e){
    const c =
      e?.count ?? e?.qty ?? e?.num ?? e?.n ??
      e?.owned ?? e?.ownedCount ?? e?.have ?? e?.haveCount;
    const n = Number(c);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  function getEntryDupesLike(e){
    const d = e?.dupes ?? e?.dup ?? e?.duplicate ?? e?.duplicates;
    const n = Number(d);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
  }

  function getDexDuplicatesList(){
    const { key, raw } = getDexRaw();
    if(!raw) return { key, dupes: [] };

    const dex = safeJsonParse(raw, null);
    const entries = normalizeDexEntries(dex);

    const dupes = [];
    for(const e of entries){
      const id = String(e?.id || e?.cardId || e?.no || "").trim();
      if(!id) continue;

      const name = String(e?.name || e?.title || id);
      const rarity = String(e?.rarity || e?.rank || "N");
      const img = e?.img || e?.image || e?.src || null;

      const d = getEntryDupesLike(e);
      const total = getEntryCountLike(e);

      const dupCount = (d != null) ? d : Math.max(0, total - 1);
      if(dupCount <= 0) continue;

      dupes.push({ id, name, rarity, img, dupCount });
    }
    return { key, dupes };
  }

  function syncFromDexDuplicates(){
    const { key, dupes } = getDexDuplicatesList();

    let inv = lsGet(LS.inv, []);
    if(!Array.isArray(inv)) inv = [];

    const invCount = {};
    for(const it of inv){
      const id = String(it?.id || "");
      if(!id) continue;
      invCount[id] = (invCount[id] || 0) + 1;
    }

    let changed = 0;

    // 足りない分を追加
    for(const d of dupes){
      const id = String(d.id);
      const want = Math.max(0, Math.floor(d.dupCount || 0));
      const have = Math.max(0, invCount[id] || 0);
      const need = want - have;
      if(need <= 0) continue;

      for(let i=0;i<need;i++){
        inv.push({
          id,
          name: String(d.name || id),
          img: d.img || null,
          rarity: String(d.rarity || "N"),
          at: now() + i
        });
      }
      changed += need;
    }

    // 多すぎる分を削除（古い順）
    const wantMap = {};
    for(const d of dupes) wantMap[String(d.id)] = Math.max(0, Math.floor(d.dupCount||0));

    const byId = new Map();
    inv.forEach((it, idx) => {
      const id = String(it?.id || "");
      if(!id) return;
      if(!byId.has(id)) byId.set(id, []);
      byId.get(id).push({ idx, at: Number(it.at||0) });
    });

    for(const [id, arr] of byId.entries()){
      const want = wantMap[id] ?? 0;
      const have = arr.length;
      const over = have - want;
      if(over <= 0) continue;

      arr.sort((a,b)=> (a.at||0) - (b.at||0));
      const removeIdxs = arr.slice(0, over).map(x=>x.idx).sort((a,b)=>b-a);
      for(const ridx of removeIdxs){
        inv.splice(ridx, 1);
        changed++;
      }
    }

    if(changed > 0){
      lsSet(LS.inv, inv);
      addLog({
        at: now(),
        title: `図鑑（ダブり）同期`,
        desc: `図鑑のダブり枚数に合わせて在庫を更新した。${key ? `（参照:${key}）` : ""}`,
        chips:["同期","図鑑"]
      });
    }

    return changed;
  }

  function ensureTestInventoryIfEmpty(){
    let inv = lsGet(LS.inv, []);
    if(Array.isArray(inv) && inv.length) return;

    syncFromDexDuplicates();
    inv = lsGet(LS.inv, []);
    if(Array.isArray(inv) && inv.length) return;

    const sample = [
      { id:"TN-001", name:"焼きたて微笑み", rarity:"N",  at: now()-1000*60*60*2,  img:null },
      { id:"TN-001", name:"焼きたて微笑み", rarity:"N",  at: now()-1000*60*60*2+1,img:null },
      { id:"TN-010", name:"マヨの奇跡",     rarity:"R",  at: now()-1000*60*60*5,  img:null },
      { id:"TN-030", name:"職人の手癖",     rarity:"SR", at: now()-1000*60*60*20, img:null },
      { id:"TN-070", name:"UR：焼かれし紋章", rarity:"UR", at: now()-1000*60*60*60, img:null },
    ];
    lsSet(LS.inv, sample);
    addLog({ at: now(), title:`テストカード投入`, desc:`図鑑側のダブりカードが見つからなかったため、テスト用カードを追加した。`, chips:["テスト"] });
  }

  // =========================
  // 在庫を「同IDでまとめる」
  // =========================
  function buildGroupedInventory(){
    const inv = lsGet(LS.inv, []).filter(x => x && x.id);
    const map = new Map();
    for(const it of inv){
      const key = String(it.id);
      const cur = map.get(key);
      if(!cur){
        map.set(key, {
          id: String(it.id),
          name: String(it.name || it.id),
          rarity: String(it.rarity || "N"),
          img: it.img || null,
          latestAt: Number(it.at || 0),
          count: 1
        });
      }else{
        cur.count += 1;
        const at = Number(it.at || 0);
        if(at >= cur.latestAt){
          cur.latestAt = at;
          cur.name = String(it.name || cur.name);
          cur.rarity = String(it.rarity || cur.rarity);
          cur.img = it.img || cur.img;
        }
      }
    }
    return Array.from(map.values());
  }

  function removeOneFromInventoryById(id){
    const inv = lsGet(LS.inv, []);
    const idx = inv.findIndex(x => x && x.id === id);
    if(idx >= 0){
      inv.splice(idx, 1);
      lsSet(LS.inv, inv);
      return true;
    }
    return false;
  }

  function thumbSrc(item){
    return item?.img ? String(item.img) : "";
  }



   

  // ===== UI：タブ =====
  function initTabs(){
    const tabs = $$(".roten-tab");
    const panels = $$(".roten-panel");
    tabs.forEach(btn => {
      btn.addEventListener("click", () => {
        tabs.forEach(b=>b.classList.remove("is-active"));
        btn.classList.add("is-active");
        const key = btn.dataset.tab;
        panels.forEach(p => p.classList.toggle("is-show", p.dataset.panel === key));
        renderAll();
      });
    });
  }

  // ===== モーダル状態 =====
  const modalState = {
    open: false,
    slotIndex: 0,       // 0..4
    pickId: null,       // 選んだカードID（グループ）
    tier: "mid",
    dur: "3h"
  };

  function setModalOpen(on){
    const m = $("#rotenModal");
    if(!m) return;
    m.classList.toggle("is-open", !!on);
    m.setAttribute("aria-hidden", on ? "false" : "true");
    modalState.open = !!on;
  }

  function openSlotModal(slotIndex){
    const unlocked = getUnlocked();
    if(slotIndex >= unlocked) return; // locked

    modalState.slotIndex = slotIndex;

    // 棚設定の初期値を引き継ぐ
    const shop = getMyShop();
    const slot = shop.slots[slotIndex];
    modalState.tier = slot?.priceTier || "mid";
    modalState.dur  = slot?.duration  || "3h";

    // 既に棚にカードがある場合は、それを選択状態にする
    modalState.pickId = slot?.item?.id || null;

    renderModal();
    setModalOpen(true);
  }

  function closeModal(){
    setModalOpen(false);
    modalState.pickId = null;
  }

  function bindModal(){
    const m = $("#rotenModal");
    if(!m) return;

    m.addEventListener("click", (e) => {
      const t = e.target;
      if(!(t instanceof HTMLElement)) return;
      if(t.getAttribute("data-close") === "1") closeModal();
    });

    // 価格
    $$("#rotenModal [data-tier]").forEach(btn => {
      btn.addEventListener("click", () => {
        modalState.tier = btn.getAttribute("data-tier") || "mid";
        renderModalControls();
      });
    });
    // 時間
    $$("#rotenModal [data-dur]").forEach(btn => {
      btn.addEventListener("click", () => {
        modalState.dur = btn.getAttribute("data-dur") || "3h";
        renderModalControls();
      });
    });

    $("#rotenModalAssign")?.addEventListener("click", () => {
      if(!modalState.pickId) return;
      assignToSlot(modalState.slotIndex, modalState.pickId, { tier: modalState.tier, dur: modalState.dur });
      closeModal();
    });

    $("#rotenModalStart")?.addEventListener("click", () => {
      if(!modalState.pickId) return;
      assignToSlot(modalState.slotIndex, modalState.pickId, { tier: modalState.tier, dur: modalState.dur });
      startListing(modalState.slotIndex);
      closeModal();
    });

    // 検索/ソート
    $("#rotenPickSearch")?.addEventListener("input", renderPickList);
    $("#rotenPickSort")?.addEventListener("change", renderPickList);

    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape" && modalState.open) closeModal();
    });
  }

  function renderModal(){
    const title = $("#rotenModalTitle");
    if(title) title.textContent = `棚${modalState.slotIndex + 1}`;

    renderModalSlotBox();
    renderPickList();
    renderModalControls();
  }

  function renderModalSlotBox(){
    const box = $("#rotenModalSlotBox");
    if(!box) return;

    const shop = getMyShop();
    const s = shop.slots[modalState.slotIndex];

    // 出店中は「開始」など無効にしたいので、情報を出す
    let stateTxt = "空き";
    if(s.state === "ready") stateTxt = "準備中";
    if(s.state === "listed") stateTxt = "出店中";
    if(s.state === "done") stateTxt = "結果あり";

    const src = s.item ? thumbSrc(s.item) : "";
    const name = s.item ? s.item.name : "（まだ置かれていない）";
    const sub = s.item
      ? `${s.item.id} / ${s.item.rarity} / 基準 ${basePriceFor(s.item)}`
      : `棚の状態：${stateTxt}`;

    const btns = [];

    if(s.state === "listed"){
      btns.push(`<button class="btn btn-ghost" type="button" disabled>残り ${timeLeftText(s.endsAt)}</button>`);
      btns.push(`<button class="btn btn-danger" type="button" id="rotenModalCancel">出店中止</button>`);
    }
    if(s.state === "done"){
      btns.push(`<button class="btn btn-primary" type="button" id="rotenModalResult">結果を見る</button>`);
      btns.push(`<button class="btn btn-ghost" type="button" id="rotenModalClear">棚を空に</button>`);
    }
    if(s.state === "ready" || s.state === "empty"){
      if(s.item){
        btns.push(`<button class="btn btn-ghost" type="button" id="rotenModalUnassign">棚から外す</button>`);
      }else{
        btns.push(`<button class="btn btn-ghost" type="button" disabled>下のカードから選択</button>`);
      }
    }

    box.innerHTML = `
      <div class="row">
        <img class="thumb" alt="" ${src ? `src="${escapeHtmlAttr(src)}"` : ""}>
        <div>
          <div class="name">${escapeHtml(name)}</div>
          <div class="sub">${escapeHtml(sub)}</div>
          <div class="sub muted">棚の状態：${escapeHtml(stateTxt)}</div>
        </div>
      </div>
      <div class="btns">${btns.join("")}</div>
    `;

    // ボタンイベント
    $("#rotenModalCancel")?.addEventListener("click", () => { cancelListing(modalState.slotIndex); renderAll(); renderModal(); });
    $("#rotenModalResult")?.addEventListener("click", () => { showResult(modalState.slotIndex); renderAll(); renderModal(); });
    $("#rotenModalClear")?.addEventListener("click", () => { clearSlot(modalState.slotIndex); renderAll(); renderModal(); });
    $("#rotenModalUnassign")?.addEventListener("click", () => { unassignItem(modalState.slotIndex); renderAll(); renderModal(); });
  }

  function renderPickList(){
    const wrap = $("#rotenPickList");
    if(!wrap) return;

    const q = ($("#rotenPickSearch")?.value || "").trim().toLowerCase();
    const sort = $("#rotenPickSort")?.value || "new";

    let list = buildGroupedInventory();

    if(q){
      list = list.filter(it =>
        String(it.id).toLowerCase().includes(q) ||
        String(it.name).toLowerCase().includes(q)
      );
    }

    list.sort((a,b) => {
      if(sort === "id") return String(a.id).localeCompare(String(b.id));
      if(sort === "rarity") return rarityRank(b.rarity) - rarityRank(a.rarity);
      if(sort === "count") return (b.count||0) - (a.count||0);
      // new
      return (b.latestAt||0) - (a.latestAt||0);
    });

    wrap.innerHTML = "";

    if(!list.length){
      const d = document.createElement("div");
      d.className = "muted";
      d.textContent = "該当カードがありません。";
      wrap.appendChild(d);
      return;
    }

    list.forEach(it => {
      const el = document.createElement("div");
      el.className = "pickcard" + (modalState.pickId === it.id ? " is-selected" : "");
      const src = thumbSrc(it);
      const rarityP = rarityPillHtml(it.rarity);
      el.innerHTML = `
        <img class="thumb" alt="" ${src ? `src="${escapeHtmlAttr(src)}"` : ""}>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:900;line-height:1.2;">${escapeHtml(it.name)}</div>
          <div class="muted" style="font-size:11px;margin-top:4px;">
            ${escapeHtml(it.id)} / 基準 ${basePriceFor(it)}オクト
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;">
          ${rarityP}
          <div class="pill">×${it.count}</div>
        </div>
      `;
      el.addEventListener("click", () => {
        modalState.pickId = it.id;
        // 選択が変わったら再描画（見た目＆ヒント）
        renderPickList();
        renderModalControls();
      });
      wrap.appendChild(el);
    });
  }

  function renderModalControls(){
    // 価格/時間の押し状態
    $$("#rotenModal [data-tier]").forEach(b => {
      b.classList.toggle("btn-primary", (b.getAttribute("data-tier") || "") === modalState.tier);
    });
    $$("#rotenModal [data-dur]").forEach(b => {
      b.classList.toggle("btn-primary", (b.getAttribute("data-dur") || "") === modalState.dur);
    });

    const shop = getMyShop();
    const s = shop.slots[modalState.slotIndex];
    const hint = $("#rotenModalHint");

    const tierTxt = PRICE_TIERS.find(x=>x.id===modalState.tier)?.label || "普通";
    const durTxt  = DURATIONS.find(x=>x.id===modalState.dur)?.label || "3時間";

    const canEdit = (s.state !== "listed");
    const hasPick = !!modalState.pickId;

    // 出店中は置き換え不可
    const assignBtn = $("#rotenModalAssign");
    const startBtn  = $("#rotenModalStart");
    if(assignBtn) assignBtn.disabled = !canEdit || !hasPick;
    if(startBtn)  startBtn.disabled  = !canEdit || !hasPick;

    if(hint){
      if(!hasPick){
        hint.textContent = `カードを選ぶと、価格:${tierTxt} / 時間:${durTxt} で出品できます。`;
      }else if(!canEdit){
        hint.textContent = `この棚は出店中。中止 or 結果処理後に変更できます。`;
      }else{
        // 所持枚数表示
        const grouped = buildGroupedInventory().find(x => x.id === modalState.pickId);
        const cnt = grouped?.count ?? 0;
        hint.textContent = `選択:${modalState.pickId}（所持×${cnt}） / 価格:${tierTxt} / 時間:${durTxt}`;
      }
    }
  }

  // ====== 棚操作 ======
  function assignToSlot(slotIndex, itemId, opts={}){
    // itemId（グループID）から「1枚」実体を作る（棚には1枚置く）
    const inv = lsGet(LS.inv, []);
    const found = inv.find(x => x && x.id === itemId);
    if(!found) return;

    const shop = getMyShop();
    const s = shop.slots[slotIndex];
    if(!s) return;
    if(s.state === "listed") return;

    s.item = {
      id: String(found.id),
      name: String(found.name || found.id),
      img: found.img || null,
      rarity: String(found.rarity || "N"),
      at: Number(found.at || now())
    };
    s.state = "ready";
    s.lastResult = null;
    s.startedAt = null;
    s.endsAt = null;

    if(opts.tier) s.priceTier = opts.tier;
    if(opts.dur)  s.duration  = opts.dur;

    setMyShop(shop);
    renderAll();
  }

  function startListing(slotIndex){
    const shop = getMyShop();
    const s = shop.slots[slotIndex];
    if(!s || !s.item) return;
    if(s.state === "listed") return;

    s.state = "listed";
    s.startedAt = now();
    s.endsAt = s.startedAt + durationMs(s.duration);
    s.lastResult = null;

    setMyShop(shop);
    addLog({
      at: now(),
      title: `棚${s.slot} 出店開始`,
      desc: `${s.item.name}（${s.item.id} / ${s.item.rarity}）を出品した。`,
      chips: [
        `価格:${PRICE_TIERS.find(x=>x.id===s.priceTier)?.label||"普通"}`,
        `時間:${DURATIONS.find(x=>x.id===s.duration)?.label||"3時間"}`
      ]
    });

    renderAll();
  }

  function cancelListing(slotIndex){
    const shop = getMyShop();
    const s = shop.slots[slotIndex];
    if(!s || s.state !== "listed") return;

    s.state = "ready";
    s.startedAt = null;
    s.endsAt = null;
    s.lastResult = null;

    setMyShop(shop);
    addLog({ at: now(), title:`棚${s.slot} 出店中止`, desc:`出店を取り下げた。今日は風向きが悪かった。`, chips:[] });
  }

  function clearSlot(slotIndex){
    const shop = getMyShop();
    const s = shop.slots[slotIndex];
    if(!s || s.state === "listed") return;

    s.item = null;
    s.state = "empty";
    s.startedAt = null;
    s.endsAt = null;
    s.lastResult = null;
    setMyShop(shop);
  }

  function unassignItem(slotIndex){
    const shop = getMyShop();
    const s = shop.slots[slotIndex];
    if(!s || s.state === "listed") return;

    s.item = null;
    s.state = "empty";
    s.startedAt = null;
    s.endsAt = null;
    s.lastResult = null;
    setMyShop(shop);
  }

  function showResult(slotIndex){
    const shop = getMyShop();
    const s = shop.slots[slotIndex];
    if(!s) return;

    // 期限切れならまず結果生成
    const st = ensureMarket();
    if(s.state === "listed" && s.endsAt && now() >= s.endsAt){
      s.state = "done";
      s.lastResult = resolveSlotSale(s, st.seed);
      setMyShop(shop);
    }

    if(s.state !== "done" || !s.lastResult) return;
    const res = s.lastResult;

    if(res.type === "KING"){
      commitKingAllBuy();
      return;
    }

    if(res.type === "SOLD"){
      setOcto(getOcto() + res.sellPrice);

      // 売れたら在庫から1枚消す
      removeOneFromInventoryById(s.item.id);
       // ★ 図鑑（tf_v1_book）側の所持枚数も1枚減らす（ダブり消費）
decrementBookCountById(s.item.id);


      addLog({
        at: now(),
        title: `売れた！ ${res.sellPrice}オクト`,
        desc: `${res.customer.name}「${res.line}」`,
        chips: [`倍率:${res.buyMult}`, `確率:${Math.round(res.p*100)}%`]
      });

      // 棚クリア
      s.item = null;
      s.state = "empty";
      s.startedAt = null;
      s.endsAt = null;
      s.lastResult = null;
      setMyShop(shop);
      return;
    }

    if(res.type === "UNSOLD"){
      addLog({
        at: now(),
        title: `売れ残り…`,
        desc: `${res.customer.name}は見ていったが買わなかった。「${res.line}」`,
        chips: [`倍率:${res.buyMult}`, `確率:${Math.round(res.p*100)}%`]
      });

      // 棚は準備に戻す（再出店できる）
      s.state = "ready";
      s.startedAt = null;
      s.endsAt = null;
      s.lastResult = null;
      setMyShop(shop);
      return;
    }

    addLog({ at: now(), title:`客が来なかった`, desc:`今日は市場が静かだった。`, chips:[] });
    s.state = "ready";
    s.startedAt = null;
    s.endsAt = null;
    s.lastResult = null;
    setMyShop(shop);
  }

  function commitKingAllBuy(){
    const shop = getMyShop();
    const king = getActiveCustomers().find(c=>c.id==="king");
    if(!king){
      addLog({ at: now(), title:"王様不在", desc:"王様が見当たらない。バグの匂い。", chips:[] });
      return;
    }

    const items = shop.slots.map(s=>s.item).filter(Boolean);
    if(!items.length){
      addLog({ at: now(), title:"王様が来た…が棚が空", desc:"棚が空だ。王様は静かに去った。", chips:[] });
      // KING結果だけ消す
      shop.slots.forEach(s=>{
        if(s.state==="done" && s.lastResult?.type==="KING"){
          s.state="empty"; s.lastResult=null; s.startedAt=null; s.endsAt=null;
        }
      });
      setMyShop(shop);
      return;
    }

    let total = 0;
const detail = [];

// ★ 王様の購入倍率（buyMult）が無い時のデフォルト
const kingMult = Number(king?.buyMult || 3);

// ★ 棚ごとに計算して合計
for(const s of shop.slots){
  if(!s.item) continue;

  const base = basePriceFor(s.item);
  const tierM = priceTierMult(s.priceTier);
  const price = Math.max(1, Math.floor(base * kingMult * tierM));

  total += price;

  // ログ用の明細（棚番号/ID/価格）
  detail.push(`棚${s.slot}:${s.item.id}=${price}`);
}

    setOcto(getOcto() + total);

    // 在庫からそれぞれ1枚ずつ消す（棚に置かれている枚数分）
    for(const s of shop.slots){
  if(!s.item) continue;

  removeOneFromInventoryById(s.item.id);

  // ★ 図鑑側の所持枚数も1枚減らす（最低1枚は残す仕様）
  decrementBookCountById(s.item.id);

  s.item=null;
  s.state="empty";
  s.startedAt=null;
  s.endsAt=null;
  s.lastResult=null;
}

    setMyShop(shop);

    addLog({
      at: now(),
      title: `👑 王様タコ民が棚ごと買った！ +${total}オクト`,
      desc: `王様「${king.lines?.[0] || "この棚ごと、もらおう。"}」`,
      chips: [`購入:${items.length}枚`, `明細:${detail.join(" / ")}`]
    });
  }

  // ====== 行列（吹き出し） ======
  let queueTimer = null;

  function getQueueLines(seed, count){
    const rng = makeRng(seed >>> 0);
    const lines = [];
    for(let i=0;i<count;i++){
      const idx = Math.floor(rng() * QUEUE_LINES.length);
      lines.push(QUEUE_LINES[idx] || "……");
    }
    return lines;
  }

  function scheduleQueueTick(){
    if(queueTimer) return;
    queueTimer = setTimeout(() => {
      queueTimer = null;
      renderDisplays(); // 吹き出し更新
    }, 3500);
  }

  // ====== 描画 ======
  function renderTop(){
    const octoEl = $("#rotenOcto");
    if(octoEl) octoEl.textContent = String(getOcto());
  }

  function renderNpcDebug(){
    const c = window.ROTEN_CUSTOMERS;
    const m = ensureMarket();
    const npc = $("#rotenDebugNpc");
    if(!npc) return;

    const dexInfo = (() => {
      const r = getDexRaw();
      if(!r.raw) return "無し";
      return `OK（${r.key}）`;
    })();

    npc.textContent =
      "ROTEN_CUSTOMERS.base: " + (c?.base?.length ?? "ERR") + "人\n" +
      "collabSlots: " + (c?.collabSlots?.length ?? "ERR") + "枠\n" +
      "今日のムード: " + (m?.moodLabel ?? "ERR") + "\n" +
      "解放棚数: " + getUnlocked() + "/5\n" +
      "図鑑キー: " + dexInfo;
  }

  function renderMarket(){
    const st = ensureMarket();
    $("#rotenMood") && ($("#rotenMood").textContent = st.moodLabel || "…");
    $("#rotenRollover") && ($("#rotenRollover").textContent = "日付が変わったら更新");
  }

  function renderDisplays(){
    const wrap = $("#rotenDisplays");
    if(!wrap) return;

    const unlocked = getUnlocked();
    const shop = getMyShop();
    const st = ensureMarket();

    // 期限切れ→結果化
    for(const s of shop.slots){
      if(s.state === "listed" && s.endsAt && now() >= s.endsAt){
        s.state = "done";
        s.lastResult = resolveSlotSale(s, st.seed);
      }
    }
    setMyShop(shop);

    wrap.innerHTML = "";

    let hasListed = false;

    shop.slots.forEach((s, idx) => {
      const locked = (idx >= unlocked);
      const el = document.createElement("div");
      el.className = "disp" + (locked ? " is-locked" : "");
      el.setAttribute("data-slot", String(idx));

      const badge = dispBadge(s, locked);

      const name = s.item ? s.item.name : (locked ? "ロック中" : "空き棚");
      const sub  = s.item
        ? `${s.item.id} / ${s.item.rarity}`
        : (locked ? "レベルで解放" : "タップして出品");

      const src = s.item ? thumbSrc(s.item) : "";

      el.innerHTML = `
        <div class="disp-top">
          <div class="disp-title">棚${s.slot}</div>
          <div class="badge ${badge.cls}">${badge.text}</div>
        </div>

        ${s.state === "listed" && !locked ? `<div class="queue"></div>` : ""}

        <div class="disp-body">
          <img class="thumb" alt="" ${src ? `src="${escapeHtmlAttr(src)}"` : ""}>
          <div class="disp-name">${escapeHtml(name)}</div>
          <div class="disp-sub">${escapeHtml(sub)}</div>
          ${s.item ? `<div class="disp-sub muted">基準 ${basePriceFor(s.item)} / 価格:${tierLabel(s.priceTier)} / 時間:${durLabel(s.duration)}</div>` : ``}
        </div>

        ${locked ? `<div class="disp-lock"><span>🔒 ロック中</span></div>` : ``}
      `;

      if(!locked){
        el.addEventListener("click", () => openSlotModal(idx));
        el.addEventListener("keydown", (e) => { if(e.key === "Enter") openSlotModal(idx); });
        el.tabIndex = 0;
      }

      // 行列吹き出し
      if(s.state === "listed" && !locked){
        hasListed = true;
        const q = el.querySelector(".queue");
        if(q){
          const seed = (st.seed + idx * 101 + Math.floor(now()/3500)) >>> 0;
          const lines = getQueueLines(seed, 3);
          q.innerHTML = lines.map(t => `<div class="bubble">${escapeHtml(t)}</div>`).join("");
        }
      }

      wrap.appendChild(el);
    });

    if(hasListed) scheduleQueueTick();
  }

  function dispBadge(s, locked){
    if(locked) return { cls:"", text:"LOCK" };
    if(s.state === "listed") return { cls:"wait", text:"出店中" };
    if(s.state === "done") return { cls:"ok", text:"結果" };
    if(!s.item) return { cls:"", text:"空き" };
    return { cls:"", text:"準備" };
  }

  function tierLabel(id){ return (PRICE_TIERS.find(x=>x.id===id)?.label) || "普通"; }
  function durLabel(id){ return (DURATIONS.find(x=>x.id===id)?.label) || "3時間"; }

  function renderInventory(){
    const wrap = $("#rotenInventory");
    if(!wrap) return;

    const q = ($("#rotenInvSearch")?.value || "").trim().toLowerCase();
    const sort = $("#rotenInvSort")?.value || "new";

    let list = buildGroupedInventory();

    if(q){
      list = list.filter(it =>
        String(it.id).toLowerCase().includes(q) ||
        String(it.name).toLowerCase().includes(q)
      );
    }

    list.sort((a,b) => {
      if(sort === "id") return String(a.id).localeCompare(String(b.id));
      if(sort === "rarity") return rarityRank(b.rarity) - rarityRank(a.rarity);
      if(sort === "count") return (b.count||0) - (a.count||0);
      return (b.latestAt||0) - (a.latestAt||0);
    });

    wrap.innerHTML = "";

    if(!list.length){
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "持ち物がありません。";
      wrap.appendChild(empty);
      return;
    }

    list.forEach(it => {
      const el = document.createElement("div");
      el.className = "inv-card";
      const src = thumbSrc(it);
      el.innerHTML = `
        <img class="thumb" alt="" ${src ? `src="${escapeHtmlAttr(src)}"` : ""}>
        <div class="inv-meta">
          <div class="inv-name">${escapeHtml(it.name)}</div>
          <div class="inv-sub">${escapeHtml(it.id)} / 基準 ${basePriceFor(it)}オクト</div>
        </div>
        <div class="inv-right">
          ${rarityPillHtml(it.rarity)}
          <div class="pill">×${it.count}</div>
        </div>
      `;
      wrap.appendChild(el);
    });
  }

  function renderLog(){
    const wrap = $("#rotenLog");
    if(!wrap) return;

    const log = lsGet(LS.log, []);
    wrap.innerHTML = "";

    if(!log.length){
      const d = document.createElement("div");
      d.className = "muted";
      d.textContent = "まだログがありません。";
      wrap.appendChild(d);
      return;
    }

    log.forEach(item => {
      const el = document.createElement("div");
      el.className = "log-item";
      el.innerHTML = `
        <div class="t">${escapeHtml(item.title || "ログ")}</div>
        <div class="d">${escapeHtml(item.desc || "")}</div>
        <div class="k"></div>
      `;
      const k = el.querySelector(".k");
      (item.chips||[]).forEach(c => {
        const p = document.createElement("div");
        p.className = "pill";
        p.textContent = c;
        k.appendChild(p);
      });
      wrap.appendChild(el);
    });
  }

  // ===== タブ切替でも反映されるように =====
  function renderAll(){
    renderTop();
    renderNpcDebug();
    renderMarket();
    renderDisplays();
    renderInventory();
    renderLog();
  }

  // ===== 時間表示 =====
  function timeLeftText(endsAt){
    const ms = Math.max(0, (endsAt||0) - now());
    const sec = Math.floor(ms/1000);
    const h = Math.floor(sec/3600);
    const m = Math.floor((sec%3600)/60);
    const s = sec%60;
    if(h>0) return `${h}h ${m}m`;
    if(m>0) return `${m}m ${s}s`;
    return `${s}s`;
  }



  // =========================
  // reset / bind / boot
  // =========================
  function resetAll(){
    localStorage.removeItem(LS.octo);
    localStorage.removeItem(LS.inv);
    localStorage.removeItem(LS.myshop);
    localStorage.removeItem(LS.market);
    localStorage.removeItem(LS.log);
    localStorage.removeItem(LS.syncSeen);
    localStorage.removeItem(LS.unlocked);
    localStorage.removeItem(TF_INV_KEY); // ★tf_v1_inv

    boot();
  }

  function bindUI(){
    $("#rotenInvSearch")?.addEventListener("input", renderInventory);
    $("#rotenInvSort")?.addEventListener("change", renderInventory);
    $("#rotenResetBtn")?.addEventListener("click", resetAll);
  }

  function setupTestBuy(){
    // NPCパネル内のボタンをイベント委譲で拾う（動的DOMでもOK）
    const wrap = document.querySelector('[data-panel="npc"]');
    if(!wrap) return;

    // 二重登録防止（再bootでも増えない）
    if (wrap.__testBuyBound) return;
    wrap.__testBuyBound = true;

    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest?.('button[data-buy]');
      if(!btn) return;

      const hint = document.getElementById("rotenBuyHint");
      const id = btn.getAttribute("data-buy") || "";

      let type = null;
      if (id.startsWith("seed_")) type = "seed";
      else if (id.startsWith("water_")) type = "water";
      else if (id.startsWith("fert_")) type = "fert";
      else return;

      const inv = tfLoadInv();
      tfInvAdd(inv, type, id, 1);
      tfSaveInv(inv);

      if(hint) hint.textContent = `購入：${id} を +1（ファーム資材在庫に追加）`;
    });
  }

  function boot(){
    ensureOcto();
    ensureMarket();
    ensureUnlocked();

    // ★ 起動時に図鑑（ダブり）→露店在庫へ同期
    syncFromDexDuplicates();
    ensureTestInventoryIfEmpty();

    // ここにあなたの「myshop初期矯正」などがあるならそのままOK
    const shop = getMyShop?.();
    if(shop && Array.isArray(shop.slots) && shop.slots.length !== 5){
      setMyShop(defaultMyShop());
    }

    initTabs();
    bindUI();
    bindModal();
    renderAll();

    setupTestBuy();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();



  
