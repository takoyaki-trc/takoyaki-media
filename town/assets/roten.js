/* assets/roten.js
   ✅ 図鑑(tf_v1_book.got) を唯一の所持源にする
   ✅ 5棚 × 各6枠（3段×2）
   ✅ 棚ロック解除（初期2棚→最大5棚）
   ✅ 出店時間・売却判定
   ✅ 売れた演出モーダル
   ✅ 行列吹き出し（出店中の棚に表示）
*/

(() => {
  /* =========================
     Storage Keys
  ========================= */
  const LS = {
    octo: "roten_v2_octo",
    myshop: "roten_v2_myshop",
    market: "roten_v2_market",
    log: "roten_v2_log",
    farmBook: "tf_v1_book",
    unlocked: "roten_v2_shop_unlocked", // 解放棚数（1〜5）
  };

  /* =========================
     Config
  ========================= */
  const SHELF_COUNT = 5;
  const SLOTS_PER_SHELF = 6;
  const TOTAL_SLOTS = SHELF_COUNT * SLOTS_PER_SHELF;

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

  /* =========================
     Utils
  ========================= */
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const now = () => Date.now();

  function safeJsonParse(str, fallback){ try{ return JSON.parse(str); }catch(e){ return fallback; } }
  function lsGet(key, fallback){
    const v = localStorage.getItem(key);
    if(v == null) return fallback;
    return safeJsonParse(v, fallback);
  }
  function lsSet(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll('"',"&quot;").replaceAll("'","&#39;");
  }
  function escapeHtmlAttr(s){ return escapeHtml(s).replaceAll("`","&#96;"); }

  function todayKeyJST(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const da = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${da}`;
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

  /* =========================
     Octo
  ========================= */
  function ensureOcto(){
    const o = localStorage.getItem(LS.octo);
    if(o == null) localStorage.setItem(LS.octo, "200");
  }
  function getOcto(){ return Number(localStorage.getItem(LS.octo) || "0") || 0; }
  function setOcto(v){ localStorage.setItem(LS.octo, String(Math.max(0, Math.floor(v)))); }

  /* =========================
     Unlock shelves
  ========================= */
  function ensureUnlocked(){
    const v = localStorage.getItem(LS.unlocked);
    if(v == null) localStorage.setItem(LS.unlocked, "2"); // 初期2棚
  }
  function getUnlockedShelves(){
    const n = Number(localStorage.getItem(LS.unlocked) || "2");
    return Math.max(1, Math.min(5, Math.floor(n)));
  }
  function getUnlockedSlots(){
    return getUnlockedShelves() * SLOTS_PER_SHELF;
  }

  /* =========================
     Log
  ========================= */
  function addLog(item){
    const log = lsGet(LS.log, []);
    log.unshift(item);
    if(log.length > 80) log.length = 80;
    lsSet(LS.log, log);
  }

  /* =========================
     Book (Dex) = source of truth
     tf_v1_book: { got:[{id,name,img,rarity,at}, ...] }
  ========================= */
  function getBook(){
    const b = lsGet(LS.farmBook, null);
    const got = Array.isArray(b?.got) ? b.got : [];
    return got.filter(x => x && x.id);
  }
  function setBookGot(newGot){
    // 形を {got:...} に統一して戻す
    lsSet(LS.farmBook, { got: newGot });
  }

  // 図鑑から「同IDまとめ」の所持リストを作る
  function buildGroupedFromBook(){
    const got = getBook();
    const map = new Map(); // id -> {id,name,rarity,img, latestAt, count}
    for(const it of got){
      const id = String(it.id);
      const cur = map.get(id);
      const at = Number(it.at || 0);
      if(!cur){
        map.set(id,{
          id,
          name: String(it.name || id),
          rarity: String(it.rarity || "N"),
          img: it.img || null,
          latestAt: at,
          count: 1
        });
      }else{
        cur.count += 1;
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

  // 図鑑から1枚消費（売れた/棚に置いた後の消費などに使う）
  function removeOneFromBookById(id){
    const got = getBook();
    const idx = got.findIndex(x => x && x.id === id);
    if(idx < 0) return false;
    got.splice(idx, 1);
    setBookGot(got);
    return true;
  }

  function thumbSrc(item){ return item?.img ? String(item.img) : ""; }

  /* =========================
     Market / Customers (existing data files)
     - roten.market.js / roten.customers.js を前提
  ========================= */
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

  /* =========================
     Shop (30 slots)
  ========================= */
  function defaultMyShop(){
    const slots = [];
    for(let i=0;i<TOTAL_SLOTS;i++){
      slots.push({
        slot: i + 1,          // 1..30
        state: "empty",       // empty/ready/listed/done
        item: null,           // {id,name,img,rarity,at}
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

  // 古いデータ（5枠）だったら自動拡張して移行
  function ensureShopSize(){
    const shop = getMyShop();
    if(!shop || !Array.isArray(shop.slots)) {
      setMyShop(defaultMyShop());
      return;
    }
    if(shop.slots.length === TOTAL_SLOTS) return;

    const newShop = defaultMyShop();
    // 既存の先頭分だけ移植
    for(let i=0;i<Math.min(shop.slots.length, newShop.slots.length); i++){
      const s = shop.slots[i];
      if(!s) continue;
      newShop.slots[i] = {
        ...newShop.slots[i],
        ...s,
        slot: i+1
      };
    }
    setMyShop(newShop);
  }

  function slotCountItems(shop){
    return shop.slots.filter(s => s.item && s.state !== "empty").length;
  }

  function resolveSlotSale(slot, marketSeed){
    const activeCustomers = getActiveCustomers();
    const rng = makeRng((marketSeed + slot.slot * 99991 + (slot.startedAt||0)) >>> 0);

    // 王様抽選
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

  /* =========================
     UI: Back button
  ========================= */
  function bindBack(){
    const btn = $("#rotenBackBtn");
    if(!btn) return;
    btn.addEventListener("click", () => {
      if(history.length > 1) history.back();
      else location.href = "index.html";
    });
  }

  /* =========================
     UI: Tabs
  ========================= */
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

  /* =========================
     Render top / market / debug
  ========================= */
  function renderTop(){
    const octoEl = $("#rotenOcto");
    if(octoEl) octoEl.textContent = String(getOcto());
  }

  function renderMarket(){
    const st = ensureMarket();
    $("#rotenMood") && ($("#rotenMood").textContent = st.moodLabel || "…");
    $("#rotenRollover") && ($("#rotenRollover").textContent = "日付が変わったら更新");
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
      "解放棚数: " + getUnlockedShelves() + "/5\n" +
      "畑キー(tf_v1_book): " + (localStorage.getItem(LS.farmBook) ? "OK" : "無し");
  }

  /* =========================
     Queue bubbles
  ========================= */
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

  /* =========================
     Result modal (演出)
  ========================= */
  function ensureResultModal(){
    if($("#rotenResultModal")) return;

    const div = document.createElement("div");
    div.id = "rotenResultModal";
    div.className = "modal";
    div.innerHTML = `
      <div class="modal__backdrop" data-close="1"></div>
      <div class="modal__sheet" role="dialog" aria-label="結果">
        <div class="modal__grab"></div>
        <div class="modal__head">
          <div class="modal__title" id="rotenResultTitle">結果</div>
          <button class="btn btn-ghost modal__x" type="button" data-close="1">×</button>
        </div>
        <div class="modal__body" id="rotenResultBody"></div>
      </div>
    `;
    document.body.appendChild(div);

    div.addEventListener("click", (e) => {
      const t = e.target;
      if(!(t instanceof HTMLElement)) return;
      if(t.getAttribute("data-close") === "1"){
        div.classList.remove("is-open");
        div.setAttribute("aria-hidden", "true");
      }
    });
  }

  function openResultModal({title, html}){
    ensureResultModal();
    const m = $("#rotenResultModal");
    const t = $("#rotenResultTitle");
    const b = $("#rotenResultBody");
    if(t) t.textContent = title || "結果";
    if(b) b.innerHTML = html || "";
    m.classList.add("is-open");
    m.setAttribute("aria-hidden", "false");
  }

  /* =========================
     Displays (5棚×6枠)
  ========================= */
  function dispBadge(s, locked){
    if(locked) return { cls:"", text:"LOCK" };
    if(s.state === "listed") return { cls:"wait", text:"出店中" };
    if(s.state === "done") return { cls:"ok", text:"結果" };
    if(!s.item) return { cls:"", text:"空き" };
    return { cls:"", text:"準備" };
  }

  function renderDisplays(){
    const wrap = $("#rotenDisplays");
    if(!wrap) return;

    const shop = getMyShop();
    const st = ensureMarket();
    const unlockedSlots = getUnlockedSlots();
    const unlockedShelves = getUnlockedShelves();

    // 期限切れ→結果化（全30枠）
    for(const s of shop.slots){
      if(s.state === "listed" && s.endsAt && now() >= s.endsAt){
        s.state = "done";
        s.lastResult = resolveSlotSale(s, st.seed);
      }
    }
    setMyShop(shop);

    wrap.innerHTML = "";
    let hasListed = false;

    for(let shelfIndex=0; shelfIndex<SHELF_COUNT; shelfIndex++){
      const shelfNo = shelfIndex + 1;
      const shelfLocked = (shelfNo > unlockedShelves);
      const base = shelfIndex * SLOTS_PER_SHELF;

      // 棚内に出店中があるか
      const anyListed = !shelfLocked && shop.slots.slice(base, base+SLOTS_PER_SHELF).some(x=>x.state==="listed");
      if(anyListed) hasListed = true;

      // 棚バッジ（ざっくり）
      let shelfBadge = {cls:"", text:"空き"};
      if(shelfLocked) shelfBadge = {cls:"", text:"LOCK"};
      else{
        const slice = shop.slots.slice(base, base+SLOTS_PER_SHELF);
        if(slice.some(x=>x.state==="listed")) shelfBadge = {cls:"wait", text:"出店中"};
        else if(slice.some(x=>x.state==="done")) shelfBadge = {cls:"ok", text:"結果"};
        else if(slice.some(x=>x.item)) shelfBadge = {cls:"", text:"準備"};
      }

      const el = document.createElement("div");
      el.className = "disp disp-shelf" + (shelfLocked ? " is-locked" : "");
      el.setAttribute("data-shelf", String(shelfNo));

      const slotsHTML = Array.from({length:SLOTS_PER_SHELF}, (_,i)=>{
        const pos = i + 1;               // 1..6
        const idx = base + i;            // 0..29
        const s = shop.slots[idx];
        const locked = shelfLocked || (idx >= unlockedSlots);
        const badge = dispBadge(s, locked);

        const src = s?.item ? thumbSrc(s.item) : "";
        const img = src ? `<img alt="" src="${escapeHtmlAttr(src)}">` : "";
        const emptyCls = src ? "" : " is-empty";

        return `
          <button class="shelf-slot slot${pos}${emptyCls}"
            type="button"
            data-idx="${idx}"
            aria-label="棚${shelfNo} スロット${pos} ${badge.text}">
            ${img}
          </button>
        `;
      }).join("");

      el.innerHTML = `
        <div class="disp-top">
          <div class="disp-title">棚${shelfNo}</div>
          <div class="badge ${shelfBadge.cls}">${shelfBadge.text}</div>
        </div>

        ${anyListed ? `<div class="queue"></div>` : ""}

        <div class="shelf-stage">
          ${slotsHTML}
        </div>

        ${shelfLocked ? `<div class="disp-lock"><span>🔒 ロック中</span></div>` : ``}
      `;

      // スロットクリックでモーダル
      if(!shelfLocked){
        el.querySelectorAll(".shelf-slot").forEach(btn=>{
          btn.addEventListener("click", ()=>{
            const idx = Number(btn.dataset.idx);
            if(idx >= unlockedSlots) return;
            openSlotModal(idx);
          });
        });
      }

      // 行列
      if(anyListed){
        const q = el.querySelector(".queue");
        if(q){
          const seed = (st.seed + shelfIndex * 777 + Math.floor(now()/3500)) >>> 0;
          const lines = getQueueLines(seed, 3);
          q.innerHTML = lines.map(t => `<div class="bubble">${escapeHtml(t)}</div>`).join("");
        }
      }

      wrap.appendChild(el);
    }

    if(hasListed) scheduleQueueTick();
  }

  /* =========================
     Inventory render (from book)
  ========================= */
  function rarityPillHtml(r){
    if(r==="LR") return `<div class="pill lr">LR</div>`;
    if(r==="UR") return `<div class="pill ur">UR</div>`;
    if(r==="SR") return `<div class="pill sr">SR</div>`;
    return `<div class="pill">${escapeHtml(r)}</div>`;
  }

  function renderInventory(){
    const wrap = $("#rotenInventory");
    if(!wrap) return;

    const q = ($("#rotenInvSearch")?.value || "").trim().toLowerCase();
    const sort = $("#rotenInvSort")?.value || "new";

    let list = buildGroupedFromBook();

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
      empty.textContent = "持ち物がありません（畑で収穫すると図鑑に入ります）。";
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

  /* =========================
     Modal (assign/start/result/cancel)
  ========================= */
  const modalState = {
    open: false,
    slotIndex: 0, // 0..29
    pickId: null,
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

  function slotLabel(idx){
    const shelf = Math.floor(idx / SLOTS_PER_SHELF) + 1;
    const pos = (idx % SLOTS_PER_SHELF) + 1;
    return { shelf, pos };
  }

  function openSlotModal(slotIndex){
    const unlockedSlots = getUnlockedSlots();
    if(slotIndex >= unlockedSlots) return;

    modalState.slotIndex = slotIndex;

    const shop = getMyShop();
    const slot = shop.slots[slotIndex];

    modalState.tier = slot?.priceTier || "mid";
    modalState.dur  = slot?.duration  || "3h";
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

    $("#rotenPickSearch")?.addEventListener("input", renderPickList);
    $("#rotenPickSort")?.addEventListener("change", renderPickList);

    document.addEventListener("keydown", (e) => {
      if(e.key === "Escape" && modalState.open) closeModal();
    });
  }

  function renderModal(){
    const title = $("#rotenModalTitle");
    const lab = slotLabel(modalState.slotIndex);
    if(title) title.textContent = `棚${lab.shelf} - スロット${lab.pos}`;

    renderModalSlotBox();
    renderPickList();
    renderModalControls();
  }

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

  function renderModalSlotBox(){
    const box = $("#rotenModalSlotBox");
    if(!box) return;

    const shop = getMyShop();
    const s = shop.slots[modalState.slotIndex];

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
    $("#rotenModalCancel")?.addEventListener("click", () => {
      cancelListing(modalState.slotIndex);
      renderAll();
      renderModal();
    });

    $("#rotenModalResult")?.addEventListener("click", () => {
      // 結果演出は別モーダルで出すので、メインモーダルは閉じる
      showResult(modalState.slotIndex);
      closeModal();
      renderAll();
    });

    $("#rotenModalClear")?.addEventListener("click", () => {
      clearSlot(modalState.slotIndex);
      renderAll();
      renderModal();
    });

    $("#rotenModalUnassign")?.addEventListener("click", () => {
      unassignItem(modalState.slotIndex);
      renderAll();
      renderModal();
    });
  }

  function renderPickList(){
    const wrap = $("#rotenPickList");
    if(!wrap) return;

    const q = ($("#rotenPickSearch")?.value || "").trim().toLowerCase();
    const sort = $("#rotenPickSort")?.value || "new";

    let list = buildGroupedFromBook();

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
        const grouped = buildGroupedFromBook().find(x => x.id === modalState.pickId);
        const cnt = grouped?.count ?? 0;
        hint.textContent = `選択:${modalState.pickId}（所持×${cnt}） / 価格:${tierTxt} / 時間:${durTxt}`;
      }
    }
  }

  /* =========================
     Shop operations
  ========================= */
  function assignToSlot(slotIndex, itemId, opts={}){
    // 図鑑のグループから参照して棚に「1枚表示」として置く（消費は売れた時）
    const grouped = buildGroupedFromBook().find(x => x.id === itemId);
    if(!grouped) return;

    const shop = getMyShop();
    const s = shop.slots[slotIndex];
    if(!s) return;
    if(s.state === "listed") return;

    s.item = {
      id: grouped.id,
      name: grouped.name,
      img: grouped.img || null,
      rarity: grouped.rarity,
      at: grouped.latestAt || now()
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
    clearSlot(slotIndex);
  }

  function showResult(slotIndex){
    const shop = getMyShop();
    const s = shop.slots[slotIndex];
    if(!s) return;

    // 期限切れなら結果生成
    const st = ensureMarket();
    if(s.state === "listed" && s.endsAt && now() >= s.endsAt){
      s.state = "done";
      s.lastResult = resolveSlotSale(s, st.seed);
      setMyShop(shop);
    }

    if(s.state !== "done" || !s.lastResult) return;

    const res = s.lastResult;

    // 王様まとめ買い
    if(res.type === "KING"){
      commitKingAllBuy();
      return;
    }

    if(res.type === "SOLD"){
      setOcto(getOcto() + res.sellPrice);

      // 売れたら図鑑から1枚消費
      removeOneFromBookById(s.item.id);

      addLog({
        at: now(),
        title: `売れた！ +${res.sellPrice}オクト`,
        desc: `${res.customer.name}「${res.line}」`,
        chips: [`倍率:${res.buyMult}`, `確率:${Math.round(res.p*100)}%`]
      });

      openResultModal({
        title: "売れた！",
        html: `
          <div style="display:flex;gap:10px;align-items:center;">
            ${s.item.img ? `<img class="thumb" alt="" src="${escapeHtmlAttr(s.item.img)}">` : ``}
            <div style="min-width:0;">
              <div style="font-weight:900;">${escapeHtml(s.item.name)}</div>
              <div class="muted" style="font-size:12px;">${escapeHtml(s.item.id)} / ${escapeHtml(s.item.rarity)}</div>
              <div style="margin-top:6px;font-weight:900;">＋${res.sellPrice} オクト</div>
            </div>
          </div>
          <div style="margin-top:10px;">
            <div class="muted">${escapeHtml(res.customer.name)}：</div>
            <div style="margin-top:4px;">「${escapeHtml(res.line)}」</div>
          </div>
        `
      });

      // 棚クリア
      s.item = null;
      s.state = "empty";
      s.startedAt = null;
      s.endsAt = null;
      s.lastResult = null;
      setMyShop(shop);

      renderAll();
      return;
    }

    if(res.type === "UNSOLD"){
      addLog({
        at: now(),
        title: `売れ残り…`,
        desc: `${res.customer.name}は見ていったが買わなかった。「${res.line}」`,
        chips: [`倍率:${res.buyMult}`, `確率:${Math.round(res.p*100)}%`]
      });

      openResultModal({
        title: "売れ残り…",
        html: `
          <div style="display:flex;gap:10px;align-items:center;">
            ${s.item?.img ? `<img class="thumb" alt="" src="${escapeHtmlAttr(s.item.img)}">` : ``}
            <div style="min-width:0;">
              <div style="font-weight:900;">${escapeHtml(s.item?.name || "出品")}</div>
              <div class="muted" style="font-size:12px;">${escapeHtml(s.item?.id || "")} / ${escapeHtml(s.item?.rarity || "")}</div>
            </div>
          </div>
          <div style="margin-top:10px;">
            <div class="muted">${escapeHtml(res.customer.name)}：</div>
            <div style="margin-top:4px;">「${escapeHtml(res.line)}」</div>
          </div>
          <div class="muted" style="margin-top:10px;">棚は準備状態に戻りました（再出店できます）。</div>
        `
      });

      // 棚は準備に戻す（再出店可）
      s.state = "ready";
      s.startedAt = null;
      s.endsAt = null;
      s.lastResult = null;
      setMyShop(shop);

      renderAll();
      return;
    }

    addLog({ at: now(), title:`客が来なかった`, desc:`今日は市場が静かだった。`, chips:[] });

    // 準備に戻す
    s.state = "ready";
    s.startedAt = null;
    s.endsAt = null;
    s.lastResult = null;
    setMyShop(shop);

    renderAll();
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
      renderAll();
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

    // 図鑑からそれぞれ1枚ずつ消費 + 棚クリア
    for(const s of shop.slots){
      if(!s.item) continue;
      removeOneFromBookById(s.item.id);
      s.item=null; s.state="empty"; s.startedAt=null; s.endsAt=null; s.lastResult=null;
    }
    setMyShop(shop);

    addLog({
      at: now(),
      title: `👑 王様タコ民が棚ごと買った！ +${total}オクト`,
      desc: `王様「${king.lines?.[0] || "この棚ごと、もらおう。"}」`,
      chips: [`購入:${items.length}枚`, `明細:${detail.join(" / ")}`]
    });

    openResultModal({
      title: "👑 王様タコ民",
      html: `
        <div style="font-weight:900;font-size:16px;">棚ごと買い上げ！</div>
        <div style="margin-top:8px;">＋${total} オクト</div>
        <div class="muted" style="margin-top:8px;">${escapeHtml(king.lines?.[0] || "この棚ごと、もらおう。")}</div>
        <div class="muted" style="margin-top:10px;font-size:11px;">明細：${escapeHtml(detail.join(" / "))}</div>
      `
    });

    renderAll();
  }

  /* =========================
     Log render
  ========================= */
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

  /* =========================
     Global render
  ========================= */
  function renderAll(){
    renderTop();
    renderNpcDebug();
    renderMarket();
    renderDisplays();
    renderInventory();
    renderLog();
  }

  /* =========================
     Bind misc UI
  ========================= */
  function bindUI(){
    $("#rotenInvSearch")?.addEventListener("input", renderInventory);
    $("#rotenInvSort")?.addEventListener("change", renderInventory);
  }

  /* =========================
     Boot
  ========================= */
  function boot(){
    ensureOcto();
    ensureUnlocked();
    ensureMarket();
    ensureShopSize();
    ensureResultModal();

    bindBack();
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


