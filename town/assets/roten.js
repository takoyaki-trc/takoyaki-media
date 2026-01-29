/* assets/roten.js
   - マイ露店（最小実装）
   - 出店2枠 / 価格3段階 / 時間3段階 / 客層抽選 / 王様全買い / ログ
*/

(() => {
  const LS = {
    octo: "roten_v1_octo",
    inv: "roten_v1_inventory",
    myshop: "roten_v1_myshop",
    market: "roten_v1_market",
    log: "roten_v1_log",
  };

  const PRICE_TIERS = [
    { id:"low",    label:"安い",   mult: 0.9 },
    { id:"mid",    label:"普通",   mult: 1.0 },
    { id:"high",   label:"強気",   mult: 1.25 }
  ];
  const DURATIONS = [
    { id:"1h", label:"1時間", ms: 1 * 60 * 60 * 1000 },
    { id:"3h", label:"3時間", ms: 3 * 60 * 60 * 1000 },
    { id:"6h", label:"6時間", ms: 6 * 60 * 60 * 1000 },
  ];

  const $ = (sel, root=document) => root.querySelector(sel);
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

  function todayKeyJST(){
    // JST前提（端末ローカル）
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const da = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${da}`;
  }

  function addLog(item){
    const log = lsGet(LS.log, []);
    log.unshift(item);
    // ログ多すぎ防止
    if(log.length > 60) log.length = 60;
    lsSet(LS.log, log);
  }

  // ========= 初期インベントリ（テスト用） =========
  function ensureTestInventory(){
    let inv = lsGet(LS.inv, null);
    if(Array.isArray(inv) && inv.length) return;

    const sample = [
      { id:"TN-001", name:"焼きたて微笑み", rarity:"N",  at: now() - 1000*60*60*2 },
      { id:"TN-002", name:"ソースの誓い",   rarity:"N",  at: now() - 1000*60*60*3 },
      { id:"TN-010", name:"マヨの奇跡",     rarity:"R",  at: now() - 1000*60*60*5 },
      { id:"TN-015", name:"青のり幻影",     rarity:"R",  at: now() - 1000*60*60*7 },
      { id:"TN-030", name:"職人の手癖",     rarity:"SR", at: now() - 1000*60*60*20 },
      { id:"TN-045", name:"屋台の王道",     rarity:"SR", at: now() - 1000*60*60*30 },
      { id:"TN-070", name:"UR：焼かれし紋章", rarity:"UR", at: now() - 1000*60*60*60 },
      { id:"TN-090", name:"LR：伝説の鉄板",  rarity:"LR", at: now() - 1000*60*60*90 },
    ];
    lsSet(LS.inv, sample);
  }

  function ensureOcto(){
    let o = localStorage.getItem(LS.octo);
    if(o == null) localStorage.setItem(LS.octo, String(200)); // テスト用
  }

  function getOcto(){
    return Number(localStorage.getItem(LS.octo) || "0") || 0;
  }
  function setOcto(v){
    localStorage.setItem(LS.octo, String(Math.max(0, Math.floor(v))));
  }

  // ========= マイ露店棚 =========
  function defaultMyShop(){
    return {
      slots: [
        { slot: 1, state:"empty", item:null, priceTier:"mid", duration:"3h", startedAt:null, endsAt:null, lastResult:null },
        { slot: 2, state:"empty", item:null, priceTier:"mid", duration:"3h", startedAt:null, endsAt:null, lastResult:null },
      ]
    };
  }
  function getMyShop(){
    return lsGet(LS.myshop, defaultMyShop());
  }
  function setMyShop(shop){
    lsSet(LS.myshop, shop);
  }

  // ========= 市場（ムード） =========
  function getMarketState(){
    const saved = lsGet(LS.market, null);
    return saved;
  }
  function setMarketState(v){
    lsSet(LS.market, v);
  }

  function ensureMarket(){
    const mk = window.ROTEN_MARKET;
    const key = todayKeyJST();
    let st = getMarketState();
    if(!st || st.todayKey !== key){
      // 日替わりムード決定（疑似乱数：日付ベース）
      const idx = hashToIndex(key, mk.moods.length);
      st = {
        todayKey: key,
        moodId: mk.moods[idx].id,
        moodLabel: mk.moods[idx].label,
        moodHint: mk.moods[idx].hint,
        // 王様の“気配”を日替わりでほんの少し変えるための種
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
  function hashToIndex(s, mod){
    return hashToInt(s) % mod;
  }

  // ========= 客層抽選 =========
  function getActiveCustomers(){
    const base = window.ROTEN_CUSTOMERS?.base || [];
    const slots = window.ROTEN_CUSTOMERS?.collabSlots || [];
    const collabs = slots
      .filter(s => s && s.active && s.data)
      .map(s => s.data);
    return base.concat(collabs);
  }

  function pickCustomerWeighted(list, rng){
    // weight合計から抽選
    let total = 0;
    for(const c of list){
      const w = Number(c.weight || 0);
      if(w > 0) total += w;
    }
    if(total <= 0) return list[0] || null;

    let r = rng() * total;
    for(const c of list){
      const w = Number(c.weight || 0);
      if(w <= 0) continue;
      r -= w;
      if(r <= 0) return c;
    }
    return list[list.length - 1] || null;
  }

  function makeRng(seed){
    // xorshift32
    let x = seed >>> 0;
    return () => {
      x ^= x << 13; x >>>= 0;
      x ^= x >>> 17; x >>>= 0;
      x ^= x << 5;  x >>>= 0;
      return (x >>> 0) / 4294967296;
    };
  }

  function rarityRank(r){
    // 低いほど弱い
    switch(r){
      case "N": return 1;
      case "R": return 2;
      case "SR": return 3;
      case "UR": return 4;
      case "LR": return 5;
      default: return 1;
    }
  }

  function basePriceFor(item){
    const bp = window.ROTEN_MARKET?.basePrices || {N:10,R:25,SR:60,UR:120,LR:200};
    return Number(bp[item.rarity] || 10);
  }

  function priceTierMult(id){
    return (PRICE_TIERS.find(x=>x.id===id)?.mult) ?? 1.0;
  }
  function durationMs(id){
    return (DURATIONS.find(x=>x.id===id)?.ms) ?? (3*60*60*1000);
  }

  // ========= 売れる判定 =========
  function resolveSlotSale(slot, marketSeed){
    // 出店期間が終わった時に 1回だけ判定
    const activeCustomers = getActiveCustomers();
    const rng = makeRng((marketSeed + slot.slot * 99991 + (slot.startedAt||0)) >>> 0);

    // 王様は“別抽選”で超低確率にする（weightの1だけだと体感出すぎる可能性があるため）
    // 体感：数日に1回 “起こりそうで起きない” が良い
    const king = activeCustomers.find(c => c.id === "king");
    const kingChanceBase = 0.003; // 0.3%
    const kingBoostByItems = slotCountItems(getMyShop()) >= 2 ? 1.25 : 1.0;
    const kingChance = king ? Math.min(0.01, kingChanceBase * kingBoostByItems) : 0;

    const kingRoll = rng();
    if(king && kingRoll < kingChance){
      return { type:"KING", customer: king };
    }

    // 通常客層抽選（王様を除く）
    const list = activeCustomers.filter(c => c.id !== "king");
    const customer = pickCustomerWeighted(list, rng);
    if(!customer) return { type:"NO_CUSTOMER", customer:null };

    // 覆面は倍率ランダム
    let buyMult = Number(customer.buyMult || 1);
    if(customer.id === "masked"){
      const m = 0.8 + rng() * 1.7; // 0.8〜2.5
      buyMult = Math.round(m * 100) / 100;
    }

    // 売れる確率：価格が強気ほど下がる / レアが高いほど少し下がる（売れにくい）
    const pt = priceTierMult(slot.priceTier);
    const rarity = rarityRank(slot.item.rarity);

    // 価格強気補正（強気→売れにくい）
    const pricePenalty = pt >= 1.2 ? 0.18 : (pt <= 0.95 ? -0.05 : 0.0);

    // レア補正（LRほど売れにくい、ただし上客がいれば売れやすい）
    const rarityPenalty = (rarity - 1) * 0.04; // N0, R0.04, SR0.08, UR0.12, LR0.16

    // 客層が高いほど売れやすい
    const customerPower = Math.min(0.22, Math.max(-0.05, (buyMult - 1) * 0.12));

    let p = 0.72; // 基本売れる確率（最小実装は気持ちよく回るのが正解）
    p = p - pricePenalty - rarityPenalty + customerPower;

    // 範囲
    p = Math.max(0.08, Math.min(0.95, p));

    const sold = rng() < p;

    // 売価：基準価格 × 客倍率 × 価格段階
    const base = basePriceFor(slot.item);
    const sellPrice = Math.max(1, Math.floor(base * buyMult * pt));

    const line = pickLine(customer, rng);

    return {
      type: sold ? "SOLD" : "UNSOLD",
      customer,
      buyMult,
      sellPrice,
      line,
      p
    };
  }

  function pickLine(customer, rng){
    const lines = Array.isArray(customer.lines) ? customer.lines : [];
    if(!lines.length) return "……";
    const i = Math.floor(rng() * lines.length);
    return lines[Math.min(lines.length-1, Math.max(0, i))];
  }

  function slotCountItems(shop){
    return shop.slots.filter(s => s.item).length;
  }

  // ========= UI描画 =========
  function initTabs(){
    const tabs = $$(".roten-tab");
    const panels = $$(".roten-panel");
    tabs.forEach(btn => {
      btn.addEventListener("click", () => {
        tabs.forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        const key = btn.dataset.tab;
        panels.forEach(p => p.classList.toggle("is-show", p.dataset.panel === key));
        // タブ切替時に軽く再描画
        renderAll();
      });
    });
  }

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
      "今日のムード: " + (m?.moodLabel ?? "ERR");
  }

  function renderMarket(){
    const st = ensureMarket();
    const mood = $("#rotenMood");
    const roll = $("#rotenRollover");
    if(mood) mood.textContent = st.moodLabel || "…";
    if(roll){
      // 次の日付更新の目安（簡易）
      roll.textContent = "日付が変わったら更新";
    }
  }

  function renderShopSlots(){
    const wrap = $("#rotenShopSlots");
    if(!wrap) return;

    const shop = getMyShop();

    // 期限切れ判定：期限を過ぎてたら自動で結果生成（まだ未生成の場合）
    const st = ensureMarket();
    for(const s of shop.slots){
      if(s.state === "listed" && s.endsAt && now() >= s.endsAt){
        // 結果を確定させる
        const result = resolveSlotSale(s, st.seed);
        s.state = "done";
        s.lastResult = result;

        // 王様の場合：棚全買い処理は「結果表示時」にやると分かりにくいので、
        // ここで“購入予約”扱いにしておく（実処理は commitKingAllBuy でまとめる）
        if(result.type === "KING"){
          // 何もしない（後でまとめて処理）
        }
      }
    }
    setMyShop(shop);

    wrap.innerHTML = "";

    shop.slots.forEach((s, idx) => {
      const slotEl = document.createElement("div");
      slotEl.className = "slot";

      const badge = slotBadge(s);
      const title = `棚 ${s.slot}`;

      const head = document.createElement("div");
      head.className = "slot-head";
      head.innerHTML = `
        <div class="slot-title">${title}</div>
        <div class="badge ${badge.cls}">${badge.text}</div>
      `;
      slotEl.appendChild(head);

      const body = document.createElement("div");
      body.className = "slot-body";

      const info = document.createElement("div");
      info.className = "slot-item";
      if(!s.item){
        info.innerHTML = `空き棚。<br><strong>持ち物</strong>から出品してください。`;
      }else{
        const base = basePriceFor(s.item);
        const pt = PRICE_TIERS.find(x=>x.id===s.priceTier)?.label || "普通";
        const du = DURATIONS.find(x=>x.id===s.duration)?.label || "3時間";
        info.innerHTML = `
          <strong>${escapeHtml(s.item.name)}</strong> <span class="pill">${escapeHtml(s.item.id)}</span><br>
          <span class="muted">レア:</span> ${escapeHtml(s.item.rarity)}　
          <span class="muted">基準:</span> ${base}オクト<br>
          <span class="muted">価格:</span> ${pt}　
          <span class="muted">時間:</span> ${du}
        `;
      }
      body.appendChild(info);

      const actions = document.createElement("div");
      actions.className = "slot-actions";

      // 状態別ボタン
      if(!s.item){
        // 何もしない（インベントリ側の出品ボタンで入れる）
        const btn = document.createElement("button");
        btn.className = "btn btn-ghost";
        btn.type = "button";
        btn.textContent = "（出品は下から）";
        btn.disabled = true;
        actions.appendChild(btn);
      }else{
        // 設定変更（listed中は変更不可）
        const selPrice = buildSelect(PRICE_TIERS, s.priceTier, s.state !== "listed");
        selPrice.addEventListener("change", () => {
          const shop2 = getMyShop();
          shop2.slots[idx].priceTier = selPrice.value;
          setMyShop(shop2);
          renderAll();
        });

        const selDur = buildSelect(DURATIONS, s.duration, s.state !== "listed");
        selDur.addEventListener("change", () => {
          const shop2 = getMyShop();
          shop2.slots[idx].duration = selDur.value;
          setMyShop(shop2);
          renderAll();
        });

        actions.appendChild(selPrice);
        actions.appendChild(selDur);

        if(s.state === "empty" || s.state === "ready"){
          const startBtn = document.createElement("button");
          startBtn.className = "btn btn-primary";
          startBtn.type = "button";
          startBtn.textContent = "出店開始";
          startBtn.addEventListener("click", () => {
            startListing(idx);
          });
          actions.appendChild(startBtn);
        }

        if(s.state === "listed"){
          const t = document.createElement("button");
          t.className = "btn btn-ghost";
          t.type = "button";
          t.textContent = timeLeftText(s.endsAt);
          t.disabled = true;
          actions.appendChild(t);

          const cancel = document.createElement("button");
          cancel.className = "btn btn-danger";
          cancel.type = "button";
          cancel.textContent = "出店中止（戻す）";
          cancel.addEventListener("click", () => {
            cancelListing(idx);
          });
          actions.appendChild(cancel);
        }

        if(s.state === "done"){
          const resBtn = document.createElement("button");
          resBtn.className = "btn btn-primary";
          resBtn.type = "button";
          resBtn.textContent = "結果を見る";
          resBtn.addEventListener("click", () => {
            showResult(idx);
          });
          actions.appendChild(resBtn);

          const takeBack = document.createElement("button");
          takeBack.className = "btn btn-ghost";
          takeBack.type = "button";
          takeBack.textContent = "棚を空にする";
          takeBack.addEventListener("click", () => {
            clearSlot(idx);
          });
          actions.appendChild(takeBack);
        }

        // いつでも：出品取り下げ（棚から外す）
        if(s.state !== "listed"){
          const removeBtn = document.createElement("button");
          removeBtn.className = "btn btn-ghost";
          removeBtn.type = "button";
          removeBtn.textContent = "棚から外す";
          removeBtn.addEventListener("click", () => {
            unassignItem(idx);
          });
          actions.appendChild(removeBtn);
        }
      }

      body.appendChild(actions);
      slotEl.appendChild(body);

      wrap.appendChild(slotEl);
    });

    // listed中は1秒ごとに残り時間更新
    if(shop.slots.some(s => s.state === "listed")){
      scheduleTick();
    }
  }

  function buildSelect(list, current, enabled){
    const sel = document.createElement("select");
    sel.className = "sel";
    sel.disabled = !enabled;
    for(const it of list){
      const opt = document.createElement("option");
      opt.value = it.id;
      opt.textContent = it.label;
      if(it.id === current) opt.selected = true;
      sel.appendChild(opt);
    }
    return sel;
  }

  function slotBadge(s){
    if(s.state === "listed") return { cls:"wait", text:"出店中" };
    if(s.state === "done")   return { cls:"ok",   text:"結果あり" };
    if(!s.item)              return { cls:"",     text:"空き" };
    return { cls:"", text:"準備中" };
  }

  function timeLeftText(endsAt){
    const ms = Math.max(0, (endsAt||0) - now());
    const sec = Math.floor(ms/1000);
    const h = Math.floor(sec/3600);
    const m = Math.floor((sec%3600)/60);
    const s = sec%60;
    if(h>0) return `残り ${h}h ${m}m`;
    if(m>0) return `残り ${m}m ${s}s`;
    return `残り ${s}s`;
  }

  let tickTimer = null;
  function scheduleTick(){
    if(tickTimer) return;
    tickTimer = setTimeout(() => {
      tickTimer = null;
      // 期限切れ判定を走らせつつ再描画
      renderShopSlots();
    }, 1000);
  }

  function renderInventory(){
    const wrap = $("#rotenInventory");
    if(!wrap) return;

    const q = ($("#rotenInvSearch")?.value || "").trim().toLowerCase();
    const sort = $("#rotenInvSort")?.value || "new";

    let inv = lsGet(LS.inv, []);
    inv = inv.filter(it => it && it.id && it.name);

    if(q){
      inv = inv.filter(it =>
        String(it.id).toLowerCase().includes(q) ||
        String(it.name).toLowerCase().includes(q)
      );
    }

    inv.sort((a,b) => {
      if(sort === "id") return String(a.id).localeCompare(String(b.id));
      if(sort === "rarity") return rarityRank(b.rarity) - rarityRank(a.rarity);
      // new
      return (b.at||0) - (a.at||0);
    });

    wrap.innerHTML = "";

    inv.forEach(it => {
      const card = document.createElement("div");
      card.className = "inv-card";

      const top = document.createElement("div");
      top.className = "inv-top";

      const left = document.createElement("div");
      left.innerHTML = `
        <div class="inv-name">${escapeHtml(it.name)}</div>
        <div class="inv-meta">${escapeHtml(it.id)} / rarity: ${escapeHtml(it.rarity)}</div>
      `;

      const pill = document.createElement("div");
      pill.className = rarityPillClass(it.rarity);
      pill.textContent = it.rarity;

      top.appendChild(left);
      top.appendChild(pill);

      const actions = document.createElement("div");
      actions.className = "inv-actions";

      const b1 = document.createElement("button");
      b1.className = "btn btn-primary";
      b1.type = "button";
      b1.textContent = "棚1に出品";
      b1.addEventListener("click", () => assignToSlot(0, it.id));

      const b2 = document.createElement("button");
      b2.className = "btn btn-primary";
      b2.type = "button";
      b2.textContent = "棚2に出品";
      b2.addEventListener("click", () => assignToSlot(1, it.id));

      actions.appendChild(b1);
      actions.appendChild(b2);

      card.appendChild(top);
      card.appendChild(actions);

      wrap.appendChild(card);
    });

    if(!inv.length){
      const empty = document.createElement("div");
      empty.className = "muted";
      empty.textContent = "持ち物がありません。";
      wrap.appendChild(empty);
    }
  }

  function rarityPillClass(r){
    if(r === "LR") return "pill lr";
    if(r === "UR") return "pill ur";
    if(r === "SR") return "pill sr";
    return "pill";
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
      const chips = (item.chips || []);
      chips.forEach(c => {
        const p = document.createElement("div");
        p.className = "pill";
        p.textContent = c;
        k.appendChild(p);
      });
      wrap.appendChild(el);
    });
  }

  // ========= 操作 =========
  function assignToSlot(slotIndex, itemId){
    const inv = lsGet(LS.inv, []);
    const item = inv.find(x => x.id === itemId);
    if(!item) return;

    const shop = getMyShop();
    const slot = shop.slots[slotIndex];
    if(!slot) return;

    // 出店中は差し替え禁止
    if(slot.state === "listed") return;

    slot.item = item;
    slot.state = "ready";
    slot.lastResult = null;
    slot.startedAt = null;
    slot.endsAt = null;

    setMyShop(shop);
    renderAll();
  }

  function unassignItem(slotIndex){
    const shop = getMyShop();
    const s = shop.slots[slotIndex];
    if(!s) return;
    if(s.state === "listed") return;

    s.item = null;
    s.state = "empty";
    s.lastResult = null;
    s.startedAt = null;
    s.endsAt = null;

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
      chips: [`価格:${PRICE_TIERS.find(x=>x.id===s.priceTier)?.label||"普通"}`, `時間:${DURATIONS.find(x=>x.id===s.duration)?.label||"3時間"}`]
    });

    renderAll();
  }

  function cancelListing(slotIndex){
    const shop = getMyShop();
    const s = shop.slots[slotIndex];
    if(!s) return;
    if(s.state !== "listed") return;

    s.state = "ready";
    s.startedAt = null;
    s.endsAt = null;
    s.lastResult = null;

    setMyShop(shop);

    addLog({
      at: now(),
      title: `棚${s.slot} 出店中止`,
      desc: `出店を取り下げた。今日は風向きが悪かった。`,
      chips: []
    });

    renderAll();
  }

  function clearSlot(slotIndex){
    const shop = getMyShop();
    const s = shop.slots[slotIndex];
    if(!s) return;
    if(s.state === "listed") return;

    // 結果だけ消す（商品は残しておいてもいいが、今回は棚クリアにする）
    s.item = null;
    s.state = "empty";
    s.startedAt = null;
    s.endsAt = null;
    s.lastResult = null;

    setMyShop(shop);
    renderAll();
  }

  function showResult(slotIndex){
    const shop = getMyShop();
    const s = shop.slots[slotIndex];
    if(!s || s.state !== "done" || !s.lastResult) return;

    const res = s.lastResult;

    // 王様の場合：棚全買い処理をここで一気に確定させる
    if(res.type === "KING"){
      commitKingAllBuy();
      return;
    }

    if(res.type === "SOLD"){
      // オクト付与、商品をインベントリから削除、棚からも外す
      const price = res.sellPrice;
      setOcto(getOcto() + price);

      removeFromInventoryById(s.item.id);
      s.item = null;
      s.state = "empty";
      s.startedAt = null;
      s.endsAt = null;

      addLog({
        at: now(),
        title: `売れた！ ${price}オクト`,
        desc: `${res.customer.name}「${res.line}」`,
        chips: [`倍率:${res.buyMult}`, `確率:${Math.round(res.p*100)}%`]
      });

      setMyShop(shop);
      renderAll();
      return;
    }

    if(res.type === "UNSOLD"){
      // 売れ残り：棚はreadyに戻す（再出店できる）
      s.state = "ready";
      s.startedAt = null;
      s.endsAt = null;

      addLog({
        at: now(),
        title: `売れ残り…`,
        desc: `${res.customer.name}は見ていったが買わなかった。「${res.line}」`,
        chips: [`倍率:${res.buyMult}`, `確率:${Math.round(res.p*100)}%`]
      });

      setMyShop(shop);
      renderAll();
      return;
    }

    // NO_CUSTOMER等
    s.state = "ready";
    s.startedAt = null;
    s.endsAt = null;
    addLog({
      at: now(),
      title: `客が来なかった`,
      desc: `今日は市場が静かだった。`,
      chips: []
    });
    setMyShop(shop);
    renderAll();
  }

  function commitKingAllBuy(){
    // 王様が来たら：棚にある“結果あり(done)”や“出店中(期限切れ)”に関係なく、棚の中身を全部買う
    const st = ensureMarket();
    const shop = getMyShop();
    const activeCustomers = getActiveCustomers();
    const king = activeCustomers.find(c => c.id === "king");
    if(!king){
      addLog({ at: now(), title:"王様不在", desc:"王様が見当たらない。バグの匂い。", chips:[] });
      renderAll();
      return;
    }

    // いま棚にある商品を集計
    const items = shop.slots.map(s => s.item).filter(Boolean);
    if(!items.length){
      addLog({ at: now(), title:"王様が来た…が棚が空", desc:"棚が空だ。王様は静かに去った。", chips:[] });
      // 王様結果のスロットを元に戻す
      shop.slots.forEach(s => {
        if(s.state === "done" && s.lastResult?.type === "KING"){
          s.state = "empty";
          s.lastResult = null;
          s.startedAt = null;
          s.endsAt = null;
        }
      });
      setMyShop(shop);
      renderAll();
      return;
    }

    // 価格計算：各カードの基準価格×王倍率×価格段階
    let total = 0;
    const detail = [];
    for(const s of shop.slots){
      if(!s.item) continue;
      const base = basePriceFor(s.item);
      const pt = priceTierMult(s.priceTier);
      const price = Math.max(1, Math.floor(base * king.buyMult * pt));
      total += price;
      detail.push(`${s.item.id}:${price}`);
    }

    // オクト付与
    setOcto(getOcto() + total);

    // インベントリから削除
    for(const s of shop.slots){
      if(!s.item) continue;
      removeFromInventoryById(s.item.id);
      // 棚クリア
      s.item = null;
      s.state = "empty";
      s.startedAt = null;
      s.endsAt = null;
      s.lastResult = null;
    }

    setMyShop(shop);

    addLog({
      at: now(),
      title: `👑 王様タコ民が棚ごと買った！ +${total}オクト`,
      desc: `王様「${king.lines?.[0] || "この棚ごと、もらおう。"}」`,
      chips: [`購入:${items.length}枚`, `明細:${detail.join(" / ")}`]
    });

    renderAll();
  }

  function removeFromInventoryById(id){
    const inv = lsGet(LS.inv, []);
    const idx = inv.findIndex(x => x.id === id);
    if(idx >= 0){
      inv.splice(idx, 1);
      lsSet(LS.inv, inv);
    }
  }

  // ========= テスト初期化 =========
  function resetAll(){
    localStorage.removeItem(LS.octo);
    localStorage.removeItem(LS.inv);
    localStorage.removeItem(LS.myshop);
    localStorage.removeItem(LS.market);
    localStorage.removeItem(LS.log);
    boot(); // その場で再生成
  }

  // ========= ユーティリティ =========
  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#39;");
  }

  // ========= イベント =========
  function bindUI(){
    $("#rotenInvSearch")?.addEventListener("input", renderInventory);
    $("#rotenInvSort")?.addEventListener("change", renderInventory);
    $("#rotenResetBtn")?.addEventListener("click", resetAll);
  }

  function renderAll(){
    renderTop();
    renderNpcDebug();
    renderMarket();
    renderShopSlots();
    renderInventory();
    renderLog();
  }

  function boot(){
    ensureOcto();
    ensureTestInventory();
    ensureMarket();

    // myshop初期
    const shop = getMyShop();
    if(!shop || !Array.isArray(shop.slots) || shop.slots.length !== 2){
      setMyShop(defaultMyShop());
    }

    initTabs();
    bindUI();
    renderAll();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();


