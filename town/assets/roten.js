/* assets/roten.js
   - 棚1〜5タップで出品（初期2枠解放）
   - 所持カードは同IDまとめ表示（×枚数）
   - 出店中は行列（吹き出し）を表示（数秒ごと更新）
   - 畑(tf_v1_book.got) → 露店在庫(roten_v1_inventory) 同期
*/

(() => {
  const LS = {
    octo: "roten_v1_octo",
    inv: "roten_v1_inventory",
    myshop: "roten_v1_myshop",
    market: "roten_v1_market",
    log: "roten_v1_log",
    farmBook: "tf_v1_book",
    syncSeen: "roten_v1_sync_seen",
    unlocked: "roten_v1_shop_unlocked" // ★解放棚数（1〜5）
  };

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

  // 行列吹き出し（軽いテンポ）
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

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const now = () => Date.now();

  function safeJsonParse(str, fallback){ try{ return JSON.parse(str); }catch(e){ return fallback; } }
  function lsGet(key, fallback){
    const v = localStorage.getItem(key);
    if(v == null) return fallback;
    return safeJsonParse(v, fallback);
  }
  function lsSet(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

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

  function ensureOcto(){
    const o = localStorage.getItem(LS.octo);
    if(o == null) localStorage.setItem(LS.octo, String(200));
  }
  function getOcto(){ return Number(localStorage.getItem(LS.octo) || "0") || 0; }
  function setOcto(v){ localStorage.setItem(LS.octo, String(Math.max(0, Math.floor(v)))); }

  // ===== 解放棚数 =====
  function ensureUnlocked(){
    const v = localStorage.getItem(LS.unlocked);
    if(v == null) localStorage.setItem(LS.unlocked, "2"); // 初期2
  }
  function getUnlocked(){
    const n = Number(localStorage.getItem(LS.unlocked) || "2");
    return Math.max(1, Math.min(5, Math.floor(n)));
  }

  // ===== 図鑑→在庫 同期 =====
  function syncFromFarmBook(){
    const book = lsGet(LS.farmBook, null);
    const got = Array.isArray(book?.got) ? book.got : [];
    if(!got.length) return 0;

    const seen = lsGet(LS.syncSeen, {});
    let inv = lsGet(LS.inv, []);
    if(!Array.isArray(inv)) inv = [];

    let added = 0;
    for(const c of got){
      if(!c || !c.id) continue;
      const at = (c.at != null) ? String(c.at) : "";
      const key = at ? `${c.id}@${at}` : `${c.id}`;
      if(seen[key]) continue;

      inv.push({
        id: String(c.id),
        name: String(c.name || c.id),
        img: c.img || null,
        rarity: String(c.rarity || "N"),
        at: (c.at != null) ? Number(c.at) : now()
      });

      seen[key] = true;
      added++;
    }

    if(added > 0){
      lsSet(LS.inv, inv);
      lsSet(LS.syncSeen, seen);
      addLog({ at: now(), title: `畑から入荷 +${added}`, desc: `図鑑の新規入手分が露店在庫に追加された。`, chips:["同期"] });
    }
    return added;
  }

  function ensureTestInventoryIfEmpty(){
    let inv = lsGet(LS.inv, []);
    if(Array.isArray(inv) && inv.length) return;

    syncFromFarmBook();
    inv = lsGet(LS.inv, []);
    if(Array.isArray(inv) && inv.length) return;

    // テスト（同ID複数枚も入れる）
    const sample = [
      { id:"TN-001", name:"焼きたて微笑み", rarity:"N", at: now()-1000*60*60*2, img:null },
      { id:"TN-001", name:"焼きたて微笑み", rarity:"N", at: now()-1000*60*60*2+1, img:null },
      { id:"TN-010", name:"マヨの奇跡", rarity:"R", at: now()-1000*60*60*5, img:null },
      { id:"TN-030", name:"職人の手癖", rarity:"SR", at: now()-1000*60*60*20, img:null },
      { id:"TN-070", name:"UR：焼かれし紋章", rarity:"UR", at: now()-1000*60*60*60, img:null },
    ];
    lsSet(LS.inv, sample);
    addLog({ at: now(), title:`テストカード投入`, desc:`畑側のカードが見つからなかったため、テスト用カードを追加した。`, chips:["テスト"] });
  }

  // ===== 市場 =====
  function getMarketState(){ return lsGet(LS.market, null); }
  function setMarketState(v){ lsSet(LS.market, v); }

  function ensureMarket(){
    const mk = window.ROTEN_MARKET;
    const key = todayKeyJST();
    let st = getMarketState();
    if(!st || st.todayKey !== key){
      const idx = hashToIndex(key, mk.moods.length);
      st = {
        todayKey: key,
        moodId: mk.moods[idx].id,
        moodLabel: mk.moods[idx].label,
        moodHint: mk.moods[idx].hint,
        seed: hashToInt(key + "|roten")
      };
      setMarketState(st);
    }
    return st;
  }

  function hashToInt(s){
    let h = 2166136261;
    for(let i=0;i<s.length;i++){
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }
  function hashToIndex(s, mod){ return hashToInt(s) % mod; }

  // ===== 棚データ（最大5） =====
  function defaultMyShop(){
    const slots = [];
    for(let i=1;i<=5;i++){
      slots.push({
        slot: i,
        state: "empty",    // empty/ready/listed/done
        item: null,        // {id,name,img,rarity,at} ※棚には1枚だけ
        priceTier: "mid",
        duration: "3h",
        startedAt: null,
        endsAt: null,
        lastResult: null
      });
    }
    return { slots };
  }
  function getMyShop(){ return lsGet(LS.myshop, defaultMyShop()); }
  function setMyShop(shop){ lsSet(LS.myshop, shop); }

  // ===== 客層抽選（売却判定） =====
  function getActiveCustomers(){
    const base = window.ROTEN_CUSTOMERS?.base || [];
    const slots = window.ROTEN_CUSTOMERS?.collabSlots || [];
    const collabs = slots.filter(s => s && s.active && s.data).map(s => s.data);
    return base.concat(collabs);
  }
  function makeRng(seed){
    let x = seed >>> 0;
    return () => {
      x ^= x << 13; x >>>= 0;
      x ^= x >>> 17; x >>>= 0;
      x ^= x << 5;  x >>>= 0;
      return (x >>> 0) / 4294967296;
    };
  }
  function pickCustomerWeighted(list, rng){
    let total = 0;
    for(const c of list){ const w = Number(c.weight||0); if(w>0) total += w; }
    if(total<=0) return list[0] || null;
    let r = rng()*total;
    for(const c of list){
      const w = Number(c.weight||0);
      if(w<=0) continue;
      r -= w;
      if(r<=0) return c;
    }
    return list[list.length-1] || null;
  }
  function rarityRank(r){
    switch(r){
      case "N": return 1; case "R": return 2; case "SR": return 3; case "UR": return 4; case "LR": return 5;
      default: return 1;
    }
  }
  function basePriceFor(item){
    const bp = window.ROTEN_MARKET?.basePrices || {N:10,R:25,SR:60,UR:120,LR:200};
    return Number(bp[item.rarity] || 10);
  }
  function priceTierMult(id){ return (PRICE_TIERS.find(x=>x.id===id)?.mult) ?? 1.0; }
  function durationMs(id){ return (DURATIONS.find(x=>x.id===id)?.ms) ?? (3*60*60*1000); }
  function pickLine(customer, rng){
    const lines = Array.isArray(customer.lines) ? customer.lines : [];
    if(!lines.length) return "……";
    return lines[Math.floor(rng()*lines.length)] || lines[0];
  }
  function slotCountItems(shop){
    return shop.slots.filter(s => s.item && s.state !== "empty").length;
  }

  function resolveSlotSale(slot, marketSeed){
    const activeCustomers = getActiveCustomers();
    const rng = makeRng((marketSeed + slot.slot * 99991 + (slot.startedAt||0)) >>> 0);

    const king = activeCustomers.find(c=>c.id==="king");
    const kingChanceBase = 0.003; // 0.3%
    const kingBoost = slotCountItems(getMyShop()) >= 2 ? 1.25 : 1.0;
    const kingChance = king ? Math.min(0.01, kingChanceBase * kingBoost) : 0;
    if(king && rng() < kingChance) return { type:"KING", customer: king };

    const list = activeCustomers.filter(c=>c.id!=="king");
    const customer = pickCustomerWeighted(list, rng);
    if(!customer) return { type:"NO_CUSTOMER", customer:null };

    let buyMult = Number(customer.buyMult || 1);
    if(customer.id === "masked"){
      buyMult = Math.round((0.8 + rng()*1.7) * 100) / 100;
    }

    const pt = priceTierMult(slot.priceTier);
    const rarity = rarityRank(slot.item.rarity);

    const pricePenalty = pt >= 1.2 ? 0.18 : (pt <= 0.95 ? -0.05 : 0.0);
    const rarityPenalty = (rarity - 1) * 0.04;
    const customerPower = Math.min(0.22, Math.max(-0.05, (buyMult - 1) * 0.12));

    let p = 0.72;
    p = p - pricePenalty - rarityPenalty + customerPower;
    p = Math.max(0.08, Math.min(0.95, p));

    const sold = rng() < p;
    const base = basePriceFor(slot.item);
    const sellPrice = Math.max(1, Math.floor(base * buyMult * pt));
    const line = pickLine(customer, rng);

    return { type: sold ? "SOLD":"UNSOLD", customer, buyMult, sellPrice, line, p };
  }

  // ===== 在庫を「同IDでまとめる」 =====
  function buildGroupedInventory(){
    const inv = lsGet(LS.inv, []).filter(x => x && x.id);
    const map = new Map(); // id -> { id,name,rarity,img, latestAt, count }
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
          // 画像や名前が後から良い情報で入る場合もあるので更新
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

  // ===== 画像 =====
  function thumbSrc(item){ return item?.img ? String(item.img) : ""; }

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
    for(const s of shop.slots){
      if(!s.item) continue;
      const price = Math.max(1, Math.floor(basePriceFor(s.item) * Number(king.buyMult||3) * priceTierMult(s.priceTier)));
      total += price;
      detail.push(`${s.item.id}:${price}`);
    }

    setOcto(getOcto() + total);

    // 在庫からそれぞれ1枚ずつ消す（棚に置かれている枚数分）
    for(const s of shop.slots){
      if(!s.item) continue;
      removeOneFromInventoryById(s.item.id);
      s.item=null; s.state="empty"; s.startedAt=null; s.endsAt=null; s.lastResult=null;
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
    npc.textContent =
      "ROTEN_CUSTOMERS.base: " + (c?.base?.length ?? "ERR") + "人\n" +
      "collabSlots: " + (c?.collabSlots?.length ?? "ERR") + "枠\n" +
      "今日のムード: " + (m?.moodLabel ?? "ERR") + "\n" +
      "解放棚数: " + getUnlocked() + "/5\n" +
      "畑キー(tf_v1_book): " + (localStorage.getItem(LS.farmBook) ? "OK" : "無し");
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

  // ===== リセット =====
  function resetAll(){
    localStorage.removeItem(LS.octo);
    localStorage.removeItem(LS.inv);
    localStorage.removeItem(LS.myshop);
    localStorage.removeItem(LS.market);
    localStorage.removeItem(LS.log);
    localStorage.removeItem(LS.syncSeen);
    localStorage.removeItem(LS.unlocked);
    boot();
  }

  // ===== util =====
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

  // ===== bind =====
  function bindUI(){
    $("#rotenInvSearch")?.addEventListener("input", renderInventory);
    $("#rotenInvSort")?.addEventListener("change", renderInventory);
    $("#rotenResetBtn")?.addEventListener("click", resetAll);
  }

  function boot(){
    ensureOcto();
    ensureMarket();
    ensureUnlocked();

    syncFromFarmBook();
    ensureTestInventoryIfEmpty();

    // myshop初期（5枠に矯正）
    const shop = getMyShop();
    if(!shop || !Array.isArray(shop.slots) || shop.slots.length !== 5){
      setMyShop(defaultMyShop());
    }

    initTabs();
    bindUI();
    bindModal();
    renderAll();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();

