(() => {
  "use strict";

  /* ==========================
     たこ焼きファーム v1.1 → v1.2（装備式UI）
     ✅ 種/水/肥料：装備式（上部バー）＋グリッド一覧
     ✅ 一覧は短文だけ：画像＋名前＋在庫＋効果タグ
     ✅ 説明/効果の長文：装備詳細パネル（常設）へ退避
     ✅ マス（EMPTY）タップ＝即植え（装備中3点セット）
     ✅ シリアル入力（コラボのタネ）は継続（モーダル）
     ✅ 既存localStorage互換維持（新キー tf_v1_equip 追加のみ）
  ========================== */

  // ====== 設定 ======
  const SHOP_URL = "./roten.html"; // 「🛒ショップ」押下で飛ぶ先（必要なら後で調整）

  // マス画像（状態ごと）
  const PLOT_IMG = {
    EMPTY: "https://ul.h3z.jp/muPEAkao.png",
    GROW1: "https://ul.h3z.jp/BrHRk8C4.png",
    GROW2: "https://ul.h3z.jp/tD4LUB6F.png",
    READY: "https://ul.h3z.jp/AmlnQA1b.png",
    BURN:  "https://ul.h3z.jp/q9hxngx6.png",
    GROW2_SR65:  "https://ul.h3z.jp/W086w3xd.png",
    GROW2_SR100: "https://ul.h3z.jp/tBVUoc8w.png"
  };

  const LS_STATE  = "tf_v1_state";
  const LS_BOOK   = "tf_v1_book";
  const LS_PLAYER = "tf_v1_player";
  const LS_INV    = "tf_v1_inv";
  const LS_CODES_USED = "tf_v1_codes_used";
  const LS_EQUIP  = "tf_v1_equip"; // ★追加：装備

  const BASE_GROW_MS = 5 * 60 * 60 * 1000;      // 5時間
  const READY_TO_BURN_MS = 8 * 60 * 60 * 1000;  // READYから8時間で焦げ
  const TICK_MS = 1000;

  const BASE_RARITY_RATE = { N:70, R:20, SR:8, UR:1.8, LR:0.2 };

  // ====== カードプール（あなたの定義をそのまま） ======
  const CARD_POOLS = { /* 省略：あなたの内容をそのまま貼ってOK */ };
  // ↑あなたの元コードの CARD_POOLS をここにそのまま残して下さい（長いので省略表示）

  // =========================================================
  // タネ / 水 / 肥料（あなたの定義をそのまま）
  // =========================================================
  const SEEDS = [ /* 省略：あなたの内容をそのまま貼ってOK */ ];
  const WATERS = [ /* 省略：あなたの内容をそのまま貼ってOK */ ];
  const FERTS = [ /* 省略：あなたの内容をそのまま貼ってOK */ ];

  // ★専用プール（あなたの定義をそのまま）
  const TAKOPI_SEED_POOL = [ /* 省略：そのまま */ ];
  const SHOP_SEED_POOL   = [ /* 省略：そのまま */ ];
  const DARTS_SEED_POOL  = [ /* 省略：そのまま */ ];

  const MAX_PLOTS = 25;
  const START_UNLOCK = 3;

  const XP_BY_RARITY = { N:4, R:7, SR:30, UR:80, LR:120 };

  function xpNeedForLevel(level){
    return 120 + (level - 1) * 50 + Math.floor(Math.pow(level - 1, 1.6) * 20);
  }

  function defaultPlayer(){
    return { ver:1, level:1, xp:0, unlocked:START_UNLOCK };
  }
  function loadPlayer(){
    try{
      const raw = localStorage.getItem(LS_PLAYER);
      if(!raw) return defaultPlayer();
      const p = JSON.parse(raw);
      if(!p || typeof p !== "object") return defaultPlayer();
      const lvl = Math.max(1, Number(p.level||1));
      const xp  = Math.max(0, Number(p.xp||0));
      const unl = Math.min(MAX_PLOTS, Math.max(START_UNLOCK, Number(p.unlocked||START_UNLOCK)));
      return { ver:1, level:lvl, xp:xp, unlocked:unl };
    }catch(e){
      return defaultPlayer();
    }
  }
  function savePlayer(p){ localStorage.setItem(LS_PLAYER, JSON.stringify(p)); }

  let player = loadPlayer();

  function addXP(amount){
    if(!Number.isFinite(amount) || amount <= 0) return { leveled:false, unlockedDelta:0 };
    let leveled = false;
    let unlockedDelta = 0;
    player.xp += Math.floor(amount);

    while(player.xp >= xpNeedForLevel(player.level)){
      player.xp -= xpNeedForLevel(player.level);
      player.level += 1;
      leveled = true;

      if(player.unlocked < MAX_PLOTS){
        player.unlocked += 1;
        unlockedDelta += 1;
      }
    }
    savePlayer(player);
    return { leveled, unlockedDelta };
  }

  // ===== 在庫 =====
  function defaultInv(){
    const inv = { ver:1, seed:{}, water:{}, fert:{} };
    SEEDS.forEach(x => inv.seed[x.id] = 0);
    WATERS.forEach(x => inv.water[x.id] = 0);
    FERTS.forEach(x => inv.fert[x.id] = 0);
    return inv;
  }
  function loadInv(){
    try{
      const raw = localStorage.getItem(LS_INV);
      if(!raw) return defaultInv();
      const inv = JSON.parse(raw);
      if(!inv || typeof inv !== "object") return defaultInv();
      inv.seed  = inv.seed  || {};
      inv.water = inv.water || {};
      inv.fert  = inv.fert  || {};
      for(const x of SEEDS)  if(!(x.id in inv.seed))  inv.seed[x.id]=0;
      for(const x of WATERS) if(!(x.id in inv.water)) inv.water[x.id]=0;
      for(const x of FERTS)  if(!(x.id in inv.fert))  inv.fert[x.id]=0;
      return inv;
    }catch(e){
      return defaultInv();
    }
  }
  function saveInv(inv){ localStorage.setItem(LS_INV, JSON.stringify(inv)); }
  function invGet(inv, invType, id){
    const box = inv[invType] || {};
    const n = Number(box[id] ?? 0);
    return Number.isFinite(n) ? n : 0;
  }
  function invAdd(inv, invType, id, delta){
    if(!inv[invType]) inv[invType] = {};
    const cur = Number(inv[invType][id] ?? 0);
    inv[invType][id] = Math.max(0, cur + delta);
  }
  function invDec(inv, invType, id){
    const cur = invGet(inv, invType, id);
    if(cur <= 0) return false;
    invAdd(inv, invType, id, -1);
    return true;
  }

  // ===== シリアル（使用済み） =====
  function loadUsedCodes(){
    try{
      const raw = localStorage.getItem(LS_CODES_USED);
      if(!raw) return {};
      const obj = JSON.parse(raw);
      return (obj && typeof obj === "object") ? obj : {};
    }catch(e){ return {}; }
  }
  function saveUsedCodes(obj){ localStorage.setItem(LS_CODES_USED, JSON.stringify(obj)); }

  const REDEEM_TABLE = {
    "COLABO-TEST-1": { seed_colabo: 1 },
    "COLABO-TEST-5": { seed_colabo: 5 },
  };

  // ===== state / book =====
  const defaultPlot  = () => ({ state:"EMPTY" });
  const defaultState = () => ({ ver:1, plots: Array.from({length:MAX_PLOTS}, defaultPlot) });

  function loadState(){
    try{
      const raw = localStorage.getItem(LS_STATE);
      if(!raw) return defaultState();
      const obj = JSON.parse(raw);
      if(!obj || !Array.isArray(obj.plots) || obj.plots.length !== MAX_PLOTS) return defaultState();
      return obj;
    }catch(e){
      return defaultState();
    }
  }
  function saveState(s){ localStorage.setItem(LS_STATE, JSON.stringify(s)); }

  function loadBook(){
    try{
      const raw = localStorage.getItem(LS_BOOK);
      if(!raw) return { ver:1, got:{} };
      const obj = JSON.parse(raw);
      if(!obj || typeof obj.got !== "object") return { ver:1, got:{} };
      return obj;
    }catch(e){
      return { ver:1, got:{} };
    }
  }
  function saveBook(b){ localStorage.setItem(LS_BOOK, JSON.stringify(b)); }

  // ===== util =====
  function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  function pad2(n){ return String(n).padStart(2,"0"); }
  function fmtRemain(ms){
    if(ms <= 0) return "00:00:00";
    const s = Math.floor(ms/1000);
    const hh = Math.floor(s/3600);
    const mm = Math.floor((s%3600)/60);
    const ss = s%60;
    return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
  }
  function clamp(x, a, b){ return Math.max(a, Math.min(b, x)); }
  function rarityLabel(r){ return r || ""; }

  function pickRarityWithWater(waterId){
    const w = WATERS.find(x => x.id === waterId);
    if (w && w.rates) {
      const rates = w.rates;
      const keys = ["N","R","SR","UR","LR"];
      let total = 0;
      for (const k of keys) total += Math.max(0, Number(rates[k] ?? 0));
      if (total <= 0) return "N";
      let r = Math.random() * total;
      for (const k of keys) {
        r -= Math.max(0, Number(rates[k] ?? 0));
        if (r <= 0) return k;
      }
      return "N";
    }

    const keys = Object.keys(BASE_RARITY_RATE);
    let total = 0;
    for (const k of keys) total += Math.max(0, BASE_RARITY_RATE[k]);
    let r = Math.random() * total;
    for (const k of keys){
      r -= Math.max(0, BASE_RARITY_RATE[k]);
      if (r <= 0) return k;
    }
    return "N";
  }

  // ===== 報酬抽選（あなたの仕様を維持） =====
  function drawRewardForPlot(p){
    if (p && p.seedId === "seed_special") {
      const c = pick(TAKOPI_SEED_POOL);
      return { id:c.id, name:c.name, img:c.img, rarity:(c.rarity || "N") };
    }
    if (p && p.seedId === "seed_shop_only") {
      const c = pick(SHOP_SEED_POOL);
      return { id:c.id, name:c.name, img:c.img, rarity:(c.rarity || "N") };
    }
    if (p && p.seedId === "seed_darts_only") {
      const c = pick(DARTS_SEED_POOL);
      return { id:c.id, name:c.name, img:c.img, rarity:(c.rarity || "N") };
    }

    const fert = FERTS.find(x => x.id === (p ? p.fertId : null));
    if (fert) {
      const burnP = Number(fert.burnCardUp ?? 0);
      if (burnP > 0 && Math.random() < burnP) {
        return { id:"SP-BURN", name:"焼きすぎたカード", img:"https://ul.h3z.jp/VSQupsYH.png", rarity:"SP" };
      }
      const rawP = Number(fert.rawCardChance ?? 0);
      if (rawP > 0 && Math.random() < rawP) {
        return { id:"SP-RAW", name:"ドロドロ生焼けカード", img:"https://ul.h3z.jp/5E5NpGKP.png", rarity:"SP" };
      }
    }

    const rarity = pickRarityWithWater(p ? p.waterId : null);
    const pool = (CARD_POOLS && CARD_POOLS[rarity]) ? CARD_POOLS[rarity] : (CARD_POOLS?.N || []);
    const c = pick(pool);
    return { id:c.no, name:c.name, img:c.img, rarity };
  }

  // ===== 装備（新規）=====
  function defaultEquip(){
    return {
      ver:1,
      seedId: SEEDS[0]?.id || null,
      waterId: WATERS[0]?.id || null,
      fertId: FERTS[0]?.id || null
    };
  }
  function loadEquip(){
    try{
      const raw = localStorage.getItem(LS_EQUIP);
      if(!raw) return defaultEquip();
      const e = JSON.parse(raw);
      if(!e || typeof e !== "object") return defaultEquip();
      const equip = {
        ver:1,
        seedId: (SEEDS.some(s=>s.id===e.seedId) ? e.seedId : defaultEquip().seedId),
        waterId:(WATERS.some(w=>w.id===e.waterId) ? e.waterId : defaultEquip().waterId),
        fertId: (FERTS.some(f=>f.id===e.fertId) ? e.fertId : defaultEquip().fertId),
      };
      return equip;
    }catch(_e){
      return defaultEquip();
    }
  }
  function saveEquip(e){ localStorage.setItem(LS_EQUIP, JSON.stringify(e)); }

  let equip = loadEquip();

  // ===== DOM =====
  const farmEl   = document.getElementById("farm");
  const stBook   = document.getElementById("stBook");
  const stGrow   = document.getElementById("stGrow");
  const stReady  = document.getElementById("stReady");
  const stBurn   = document.getElementById("stBurn");

  const stLevel  = document.getElementById("stLevel");
  const stXP     = document.getElementById("stXP");
  const stXpLeft = document.getElementById("stXpLeft");
  const stXpNeed = document.getElementById("stXpNeed");
  const stXpBar  = document.getElementById("stXpBar");
  const stUnlock = document.getElementById("stUnlock");

  const modal  = document.getElementById("modal");
  const mTitle = document.getElementById("mTitle");
  const mBody  = document.getElementById("mBody");
  const mClose = document.getElementById("mClose");

  // 装備バー（HTMLに置いたID）
  const btnEquipSeed  = document.getElementById("btnEquipSeed");
  const btnEquipWater = document.getElementById("btnEquipWater");
  const btnEquipFert  = document.getElementById("btnEquipFert");
  const btnGoShop     = document.getElementById("btnGoShop");

  const equipDetailTitle = document.getElementById("equipDetailTitle");
  const equipDetailBody  = document.getElementById("equipDetailBody");

  // ===== data =====
  let state  = loadState();
  let book   = loadBook();
  let inv    = loadInv();

  // ===== モーダル安定化 =====
  function onBackdrop(e){ if(e.target === modal) closeModal(); }
  function onEsc(e){ if(e.key === "Escape") closeModal(); }

  function openModal(title, html){
    modal.removeEventListener("click", onBackdrop);
    document.removeEventListener("keydown", onEsc);

    mTitle.textContent = title;
    mBody.innerHTML = html;
    modal.setAttribute("aria-hidden","false");

    modal.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onEsc);
  }
  function closeModal(){
    modal.setAttribute("aria-hidden","true");
    modal.removeEventListener("click", onBackdrop);
    document.removeEventListener("keydown", onEsc);
    mBody.innerHTML = "";
  }
  if(mClose) mClose.addEventListener("click", closeModal);

  // ===== 装備詳細パネル更新 =====
  function setEquipDetail(kind){
    if(!equipDetailTitle || !equipDetailBody) return;

    const s = SEEDS.find(x=>x.id===equip.seedId);
    const w = WATERS.find(x=>x.id===equip.waterId);
    const f = FERTS.find(x=>x.id===equip.fertId);

    let item = null;
    let label = "";
    if(kind==="seed"){ item=s; label="🌱 タネ"; }
    else if(kind==="water"){ item=w; label="💧 水"; }
    else if(kind==="fert"){ item=f; label="🧂 肥料"; }
    else {
      // デフォルト：全部見えるようにまとめ表示
      equipDetailTitle.textContent = "装備中";
      equipDetailBody.innerHTML = `
        <div style="opacity:.9;font-weight:900;margin-bottom:6px;">🌱 ${s?.name||"-"} / 💧 ${w?.name||"-"} / 🧂 ${f?.name||"-"}</div>
        <div style="opacity:.8;line-height:1.5;">
          <div><b>タネ</b>：${(s?.desc||"").replace(/\n/g,"<br>")}</div>
          <div style="margin-top:6px;"><b>水</b>：${(w?.desc||"").replace(/\n/g,"<br>")}</div>
          <div style="margin-top:6px;"><b>肥料</b>：${(f?.desc||"").replace(/\n/g,"<br>")}</div>
        </div>
      `;
      return;
    }

    equipDetailTitle.textContent = `${label}：${item?.name||"-"}`;
    equipDetailBody.innerHTML = `
      <div style="opacity:.9;line-height:1.55;">
        ${(item?.desc||"").replace(/\n/g,"<br>")}
        ${item?.fx ? `<div style="margin-top:6px;">効果：<b>${item.fx}</b></div>` : ``}
      </div>
    `;
  }

  // ===== ショップ（シリアル入力はここからも呼べる）=====
  function openRedeemModal(){
    openModal("シリアル入力（コラボのタネ）", `
      <div class="step">
        シリアルを入力すると【コラボのタネ】が付与される。<br>
        ※コードは<b>1回のみ</b>使用できる。
      </div>
      <div style="display:flex;gap:10px;">
        <input id="redeemCode" type="text" placeholder="例：COLABO-TEST-1"
          style="flex:1; padding:12px; border-radius:12px; border:1px solid var(--line); background:rgba(255,255,255,.06); color:#fff;">
        <button id="redeemBtn" type="button"
          style="padding:12px 14px; border-radius:12px; border:1px solid var(--line); background:var(--btn2); color:#fff; font-weight:900;">
          使う
        </button>
      </div>
      <div class="row">
        <button type="button" id="redeemClose">戻る</button>
      </div>
    `);

    document.getElementById("redeemClose").addEventListener("click", () => {
      closeModal();
    });

    document.getElementById("redeemBtn").addEventListener("click", () => {
      const code = (document.getElementById("redeemCode").value || "").trim().toUpperCase();
      if(!code){ alert("コードを入力してね"); return; }

      const used = loadUsedCodes();
      if(used[code]){ alert("このコードは使用済み。"); return; }

      const payload = REDEEM_TABLE[code];
      if(!payload){ alert("無効なコードです。"); return; }

      inv = loadInv();
      if(payload.seed_colabo){
        invAdd(inv, "seed", "seed_colabo", Number(payload.seed_colabo) || 0);
      }
      saveInv(inv);

      used[code] = { at: Date.now(), payload };
      saveUsedCodes(used);

      alert(`成功！【コラボのタネ】×${payload.seed_colabo || 0} を付与した。`);
      closeModal();
      render();
    });
  }

  // ===== グリッドモーダル（短文＋即装備）=====
  function openEquipGrid(kind){
    inv = loadInv();

    const isSeed = kind==="seed";
    const isWater= kind==="water";
    const isFert = kind==="fert";

    const items = isSeed ? SEEDS : isWater ? WATERS : FERTS;
    const invType = kind; // "seed" | "water" | "fert"
    const title = isSeed ? "🌱 タネ装備" : isWater ? "💧 水装備" : "🧂 肥料装備";

    const currentId = isSeed ? equip.seedId : isWater ? equip.waterId : equip.fertId;

    const cards = items.map(x=>{
      const cnt = invGet(inv, invType, x.id);
      const disabled = (cnt <= 0);
      const selected = (x.id === currentId);

      // グリッドカード内は短くする
      return `
        <button type="button" class="gridCard ${selected ? "isSel":""}" data-pick="${x.id}" ${disabled ? "disabled":""}>
          <div class="gImg">
            <img src="${x.img}" alt="${x.name}">
            <div class="gCnt">×${cnt}</div>
          </div>
          <div class="gName">${x.name}</div>
          <div class="gTag">${x.fx ? x.fx : ""}</div>
        </button>
      `;
    }).join("");

    // ※説明は装備詳細パネルに出すので、モーダル内は短い導線だけ
    const extra = (isSeed ? `
      <div style="display:flex;gap:10px;margin-top:10px;">
        <button type="button" id="btnRedeem" style="flex:1;border-radius:12px;border:1px solid var(--line);background:var(--btn2);color:#fff;font-weight:900;padding:12px;">
          🎫 シリアル入力（コラボ）
        </button>
      </div>
    ` : ``);

    openModal(title, `
      <div class="step">タップで即装備（在庫0は選べない）。</div>
      <div class="gridWrap">${cards}</div>
      ${extra}
      <div class="row">
        <button type="button" id="btnCloseEquip">閉じる</button>
      </div>
    `);

    const closeBtn = document.getElementById("btnCloseEquip");
    closeBtn.addEventListener("click", closeModal);

    if(isSeed){
      const redeemBtn = document.getElementById("btnRedeem");
      if(redeemBtn) redeemBtn.addEventListener("click", openRedeemModal);
    }

    mBody.querySelectorAll("button[data-pick]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.getAttribute("data-pick");
        if(!id) return;

        if(isSeed) equip.seedId = id;
        else if(isWater) equip.waterId = id;
        else if(isFert) equip.fertId = id;

        saveEquip(equip);
        closeModal();

        // 装備詳細更新（カテゴリごとを表示）
        setEquipDetail(kind);
        render(); // 在庫表示にも使うなら反映
      });
    });
  }

  // ===== 図鑑追加（あなたの処理を維持）=====
  function addToBook(card){
    const b = loadBook();
    if(!b.got) b.got = {};
    const prev = b.got[card.id];

    if(prev){
      const curCount = Number.isFinite(prev.count) ? prev.count : 1;
      prev.count = curCount + 1;
      prev.name = card.name;
      prev.img = card.img;
      prev.rarity = card.rarity || prev.rarity || "";
      prev.lastAt = Date.now();
      b.got[card.id] = prev;
    }else{
      b.got[card.id] = {
        id: card.id,
        name: card.name,
        img: card.img,
        rarity: card.rarity || "",
        count: 1,
        at: Date.now(),
        lastAt: Date.now()
      };
    }
    book = b;
    saveBook(book);
  }

  // ===== 植え付け（装備中3点セットでワンタップ）=====
  function plantAt(index){
    inv = loadInv();

    const seedId  = equip.seedId;
    const waterId = equip.waterId;
    const fertId  = equip.fertId;

    // 在庫チェック（全部必要）
    const okSeed  = invGet(inv, "seed",  seedId)  > 0;
    const okWater = invGet(inv, "water", waterId) > 0;
    const okFert  = invGet(inv, "fert",  fertId)  > 0;

    if(!okSeed || !okWater || !okFert){
      const miss = [
        !okSeed ? "タネ" : null,
        !okWater ? "水" : null,
        !okFert ? "肥料" : null,
      ].filter(Boolean).join(" / ");

      openModal("在庫不足", `
        <div class="step">植えるには在庫が足りない：<b>${miss}</b></div>
        <div class="row">
          <button type="button" id="btnGoShop2">🛒 ショップへ</button>
          <button type="button" class="primary" id="btnClose2">閉じる</button>
        </div>
      `);

      document.getElementById("btnGoShop2").addEventListener("click", ()=>{
        location.href = SHOP_URL;
      });
      document.getElementById("btnClose2").addEventListener("click", closeModal);
      return;
    }

    // 消費
    invDec(inv, "seed", seedId);
    invDec(inv, "water", waterId);
    invDec(inv, "fert", fertId);
    saveInv(inv);

    const seed  = SEEDS.find(x=>x.id===seedId);
    const water = WATERS.find(x=>x.id===waterId);
    const fert  = FERTS.find(x=>x.id===fertId);

    const factor = clamp(
      (seed?.factor ?? 1) * (water?.factor ?? 1) * (fert?.factor ?? 1),
      0.35, 1.0
    );

    const growMs = Math.max(Math.floor(BASE_GROW_MS * factor), 60*60*1000);
    const now = Date.now();

    const srHint =
      (waterId === "water_overdo" && fertId === "fert_timeno") ? "SR100" :
      (waterId === "water_overdo") ? "SR65" :
      "NONE";

    state.plots[index] = {
      state: "GROW",
      seedId, waterId, fertId,
      startAt: now,
      readyAt: now + growMs,
      srHint
    };
    saveState(state);

    // 装備詳細は常に最新が見えるように
    setEquipDetail();
    render();
  }

  // ===== 盤面タップ =====
  function onPlotTap(i){
    player = loadPlayer();

    if (i >= player.unlocked) {
      openModal("ロック中", `
        <div class="step">このマスはまだ使えない。収穫でXPを稼いで <b>Lvアップ</b> すると解放される。</div>
        <div class="row"><button type="button" id="btnOk">OK</button></div>
      `);
      document.getElementById("btnOk").addEventListener("click", closeModal);
      return;
    }

    const p = state.plots[i] || defaultPlot();

    if (p.state === "EMPTY") {
      // ★ここがワンタップ植え
      plantAt(i);
      return;
    }

    if (p.state === "GROW") {
      const seed = SEEDS.find(x=>x.id===p.seedId);
      const water = WATERS.find(x=>x.id===p.waterId);
      const fert = FERTS.find(x=>x.id===p.fertId);
      const remain = (p.readyAt||0) - Date.now();

      openModal("育成中", `
        <div class="step">収穫まであと <b>${fmtRemain(remain)}</b></div>
        <div class="reward">
          <div class="big">設定</div>
          <div class="mini">
            種：${seed?seed.name:"-"}<br>
            水：${water?water.name:"-"}<br>
            肥料：${fert?fert.name:"-"}
          </div>
        </div>
        <div class="row"><button type="button" id="btnOk">OK</button></div>
      `);
      document.getElementById("btnOk").addEventListener("click", closeModal);
      return;
    }

    if (p.state === "READY") {
      if (!p.reward) {
        p.reward = drawRewardForPlot(p);
        saveState(state);
      }
      const reward = p.reward;

      openModal("収穫！", `
        <div class="step">収穫したカードを確認してから図鑑に登録する。</div>
        <div class="reward">
          <div class="big">${reward.name}（${reward.id}）</div>
          <div class="mini">レア：<b>${rarityLabel(reward.rarity)}</b><br>確認ボタンで図鑑に追加→このマスは空になる。</div>
          <img class="img" src="${reward.img}" alt="${reward.name}">
        </div>
        <div class="row">
          <button type="button" id="btnCancel">閉じる</button>
          <button type="button" class="primary" id="btnConfirm">確認して図鑑へ</button>
        </div>
      `);

      document.getElementById("btnCancel").addEventListener("click", closeModal);
      document.getElementById("btnConfirm").addEventListener("click", () => {
        addToBook(reward);
        const gain = XP_BY_RARITY[reward.rarity] ?? 4; // SPや未定義は4
        addXP(gain);

        state.plots[i] = defaultPlot();
        saveState(state);

        closeModal();
        location.href = "./zukan.html";
      });
      return;
    }

    if (p.state === "BURN") {
      openModal("焼けた…", `
        <div class="step">放置しすぎて焼けた。回収するとマスが空になる。</div>
        <div class="row">
          <button type="button" id="btnBack">戻る</button>
          <button type="button" class="primary" id="btnClear">回収して空にする</button>
        </div>
      `);
      document.getElementById("btnBack").addEventListener("click", closeModal);
      document.getElementById("btnClear").addEventListener("click", () => {
        state.plots[i] = defaultPlot();
        saveState(state);
        closeModal();
        render();
      });
      return;
    }
  }

  // ===== render =====
  function render(){
    player = loadPlayer();
    book = loadBook();
    equip = loadEquip();

    farmEl.innerHTML = "";
    let grow = 0, ready = 0, burn = 0;

    for(let i=0;i<MAX_PLOTS;i++){
      const p = state.plots[i] || defaultPlot();

      const d = document.createElement("div");
      d.className = "plot";

      const locked = (i >= player.unlocked);
      d.dataset.state = locked ? "LOCK" : (p.state || "EMPTY");

      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.i = String(i);

      if(locked){
        btn.innerHTML = `
          <img src="${PLOT_IMG.EMPTY}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:14px;display:block;opacity:.55;">
          <div class="tag" style="position:absolute;bottom:6px;left:0;right:0;text-align:center;font-size:11px;font-weight:900;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.6);pointer-events:none;">ロック</div>
        `;
        btn.addEventListener("click", () => onPlotTap(i));
        d.appendChild(btn);
        farmEl.appendChild(d);
        continue;
      }

      let img = PLOT_IMG.EMPTY;
      let label = "タップで植える";

      if (p.state === "GROW") {
        grow++;
        const remain = (p.readyAt || 0) - Date.now();

        const start = (typeof p.startAt === "number") ? p.startAt : Date.now();
        const end   = (typeof p.readyAt === "number") ? p.readyAt : (start + 1);
        const denom = Math.max(1, end - start);
        const progress = (Date.now() - start) / denom;

        if (progress < 0.5) {
          img = PLOT_IMG.GROW1;
        } else {
          if (p.srHint === "SR100") img = PLOT_IMG.GROW2_SR100;
          else if (p.srHint === "SR65") img = PLOT_IMG.GROW2_SR65;
          else img = PLOT_IMG.GROW2;
        }

        label = `育成中 ${fmtRemain(remain)}`;

      } else if (p.state === "READY") {
        ready++;
        img = PLOT_IMG.READY;
        label = "収穫";

      } else if (p.state === "BURN") {
        burn++;
        img = PLOT_IMG.BURN;
        label = "焦げ";
      }

      btn.innerHTML = `
        <img src="${img}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:14px;display:block;">
        <div class="tag" style="position:absolute; bottom:6px; left:0; right:0;text-align:center; font-size:11px; font-weight:900; color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.6); pointer-events:none;">${label}</div>
      `;
      btn.addEventListener("click", () => onPlotTap(i));

      d.appendChild(btn);
      farmEl.appendChild(d);
    }

    stGrow.textContent  = String(grow);
    stReady.textContent = String(ready);
    stBurn.textContent  = String(burn);
    stBook.textContent  = String(Object.keys((book && book.got) ? book.got : {}).length);

    stLevel.textContent  = String(player.level);
    stXP.textContent     = String(player.xp);
    stUnlock.textContent = String(player.unlocked);

    const need = xpNeedForLevel(player.level);
    const now  = player.xp;
    const left = Math.max(0, need - now);
    const pct  = Math.max(0, Math.min(100, Math.floor((now / need) * 100)));

    stXpLeft.textContent = String(left);
    stXpNeed.textContent = String(need);
    stXpBar.style.width  = pct + "%";

    const stXpNow = document.getElementById("stXpNow");
    if (stXpNow) stXpNow.textContent = String(now);

    // 装備バーのテキスト更新（ボタンがあれば）
    const s = SEEDS.find(x=>x.id===equip.seedId);
    const w = WATERS.find(x=>x.id===equip.waterId);
    const f = FERTS.find(x=>x.id===equip.fertId);

    if(btnEquipSeed)  btnEquipSeed.textContent  = `🌱 ${shortName(s?.name)}`;
    if(btnEquipWater) btnEquipWater.textContent = `💧 ${shortName(w?.name)}`;
    if(btnEquipFert)  btnEquipFert.textContent  = `🧂 ${shortName(f?.name)}`;

    // 詳細パネルも更新
    setEquipDetail();
  }

  function shortName(name){
    if(!name) return "-";
    // 長い場合は少し短縮（必要なら調整）
    return name.length > 10 ? name.slice(0,10) + "…" : name;
  }

  function tick(){
    const now = Date.now();
    let changed = false;

    for (let i=0;i<MAX_PLOTS;i++){
      const p = state.plots[i];
      if(!p) continue;

      if(p.state === "GROW" && typeof p.readyAt === "number"){
        if(now >= p.readyAt){
          p.state = "READY";
          p.burnAt = p.readyAt + READY_TO_BURN_MS;
          changed = true;
        }
      } else if(p.state === "READY" && typeof p.burnAt === "number"){
        if(now >= p.burnAt){
          p.state = "BURN";
          changed = true;
        }
      }
    }

    if(changed) saveState(state);
    render();
  }

  // ===== 装備バーのイベント =====
  if(btnEquipSeed)  btnEquipSeed.addEventListener("click", ()=> openEquipGrid("seed"));
  if(btnEquipWater) btnEquipWater.addEventListener("click", ()=> openEquipGrid("water"));
  if(btnEquipFert)  btnEquipFert.addEventListener("click", ()=> openEquipGrid("fert"));
  if(btnGoShop)     btnGoShop.addEventListener("click", ()=> location.href = SHOP_URL);

  // ===== リセット =====
  const btnReset = document.getElementById("btnReset");
  if(btnReset){
    btnReset.addEventListener("click", () => {
      if(!confirm("畑・図鑑・レベル(XP)・在庫・シリアル使用済み・装備を全消去します。OK？")) return;
      localStorage.removeItem(LS_STATE);
      localStorage.removeItem(LS_BOOK);
      localStorage.removeItem(LS_PLAYER);
      localStorage.removeItem(LS_INV);
      localStorage.removeItem(LS_CODES_USED);
      localStorage.removeItem(LS_EQUIP);

      state = loadState();
      book = loadBook();
      player = loadPlayer();
      inv = loadInv();
      equip = loadEquip();

      render();
    });
  }

  // ===== 初期化 =====
  // もし装備が未保存なら保存しておく（初回の安定用）
  saveEquip(loadEquip());

  render();
  setInterval(tick, TICK_MS);

})();

