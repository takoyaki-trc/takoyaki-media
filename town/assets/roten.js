/* =========================================================
   roten.js（RPG武器屋風：たこぴのお店 / 完全版）
   ✅ 資材在庫: tf_v1_inv（seed/water/fert）= ファームと完全共通
   ✅ 図鑑: tf_v1_book（got[id].count 合計を “所持” として表示）
   ✅ オクト: roten_v1_octo
   ✅ たこ焼きみくじ: 1日1回
   ✅ 公開記念プレゼント: 1回だけ
   ✅ 無料∞を廃止：無料タネ/無料水/無料肥料も「有料で購入 → 在庫+1」
   ✅ コラボのタネ（seed_colabo）は「シリアルで増える」ので購入不可
   ✅ ポップアップ無反応対策：
      - DOM要素が無いと落ちない（nullガード）
      - クリックイベントが最終的に必ず openModal へ到達
      - モーダル内ボタンも "modalBody内で検索" して確実に拾う
   ✅ ファーム側SEEDS/WATERS/FERTSの画像・説明を露店へ反映（同じURL/文言）
========================================================= */
(() => {
  "use strict";

  const LS = {
    octo: "roten_v1_octo",
    inv: "tf_v1_inv",
    book: "tf_v1_book",
    mikujiDate: "roten_v1_mikuji_date",
    launchGift: "roten_v1_launch_gift_claimed",
    log: "roten_v1_log",
    // シリアル使用済み（ファームと同じキーに揃える）
    codesUsed: "tf_v1_codes_used"
  };

  // ---------- utils ----------
  const $  = (sel, root=document) => root.querySelector(sel);
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
    // ファームと共通の形
    return { ver:1, seed:{}, water:{}, fert:{} };
  }
  function loadInv(){
    const inv = loadJSON(LS.inv, invDefault());
    inv.seed  = inv.seed  || {};
    inv.water = inv.water || {};
    inv.fert  = inv.fert  || {};
    return inv;
  }
  function saveInv(inv){
    saveJSON(LS.inv, inv);
  }

  // 図鑑（所持数合計）
  function calcBookOwned(){
    const book = loadJSON(LS.book, null);
    if(!book || !book.got) return 0;
    let total = 0;
    for(const k of Object.keys(book.got)){
      const c = Number(book.got[k]?.count || 0);
      if(c > 0) total += c;
    }
    return total;
  }

  // ログ（任意）
  function pushLog(msg){
    const a = loadJSON(LS.log, []);
    a.unshift({ t: Date.now(), msg });
    saveJSON(LS.log, a.slice(0, 80));
  }

  // ---------- FARM MASTER（露店に反映） ----------
  // ※あなたが貼ったファームの定義に合わせて「画像/名前/説明」をそのまま採用
  const SEEDS = [
    { id:"seed_random",  name:"【なに出るタネ】", desc:"何が育つかは完全ランダム。\n店主も知らない。", img:"https://ul.h3z.jp/gnyvP580.png", fx:"完全ランダム" },
    { id:"seed_shop",    name:"【店頭タネ】", desc:"店で生まれたタネ。\n店頭ナンバーを宿している。", img:"https://ul.h3z.jp/IjvuhWoY.png", fx:"店頭の気配" },
    { id:"seed_line",    name:"【回線タネ】", desc:"画面の向こうから届いたタネ。\nクリックすると芽が出る。", img:"https://ul.h3z.jp/AonxB5x7.png", fx:"回線由来" },
    { id:"seed_special", name:"【たこぴのタネ】", desc:"今はまだ何も起きない。\nそのうち何か起きる。", img:"https://ul.h3z.jp/29OsEvjf.png", fx:"待て" },
    { id:"seed_colabo",  name:"【コラボのタネ】", desc:"今はまだ何も起きない。\nそのうち何か起きる。", img:"https://ul.h3z.jp/AWBcxVls.png", fx:"シリアル解放" },
  ];

  const WATERS = [
    { id:"water_plain_free", name:"《ただの水》", desc:"無料・UR/LRなし。\n無課金の基準。", img:"https://ul.h3z.jp/13XdhuHi.png", fx:"基準（水）" },
    { id:"water_nice",       name:"《なんか良さそうな水》", desc:"ちょい上振れ・LRなし。\n初心者の背中押し。", img:"https://ul.h3z.jp/3z04ypEd.png", fx:"ちょい上振れ" },
    { id:"water_suspicious", name:"《怪しい水》", desc:"現実準拠・標準。\n実パックと同じ空気。", img:"https://ul.h3z.jp/wtCO9mec.png", fx:"標準（現実準拠）" },
    { id:"water_overdo",     name:"《やりすぎな水》", desc:"勝負水・現実より上。\n体感で強い。", img:"https://ul.h3z.jp/vsL9ggf6.png", fx:"勝負" },
    { id:"water_regret",     name:"《押さなきゃよかった水》", desc:"確定枠・狂気。\n事件製造機（SNS向け）", img:"https://ul.h3z.jp/L0nafMOp.png", fx:"事件" },
  ];

  const FERTS = [
    { id:"fert_agedama", name:"①ただの揚げ玉", desc:"時短0。\n《焼きすぎたカード》率UP", img:"https://ul.h3z.jp/9p5fx53n.png", fx:"時短 0%" },
    { id:"fert_feel",    name:"②《気のせい肥料》", desc:"早くなった気がする。\n気のせいかもしれない。", img:"https://ul.h3z.jp/XqFTb7sw.png", fx:"時短 5%" },
    { id:"fert_guts",    name:"③《根性論ぶち込み肥料》", desc:"理由はない。\n気合いだ。", img:"https://ul.h3z.jp/bT9ZcNnS.png", fx:"時短 20%" },
    { id:"fert_skip",    name:"④《工程すっ飛ばし肥料》", desc:"途中は、\n見なかったことにした。", img:"https://ul.h3z.jp/FqPzx12Q.png", fx:"時短 40%" },
    { id:"fert_timeno",  name:"⑤《時間を信じない肥料》", desc:"最終兵器・禁忌。\n稀に《ドロドロ生焼けカード》", img:"https://ul.h3z.jp/l2njWY57.png", fx:"時短 90〜100%" },
  ];

  // 露店販売価格（オクト）
  // ※ここだけは露店側の仕様なので、ゲームバランスに合わせて調整OK
  const PRICE = {
    seed_random: 12,
    seed_shop: 18,
    seed_line: 18,
    seed_special: 38,
    // seed_colabo は購入不可

    water_plain_free: 10,    // ★無料だったが有料化
    water_nice: 14,
    water_suspicious: 18,
    water_overdo: 26,
    water_regret: 40,

    fert_agedama: 10,        // ★無料だったが有料化
    fert_feel: 12,
    fert_guts: 16,
    fert_skip: 22,
    fert_timeno: 36,
  };

  // ---------- GOODS（マスター統合） ----------
  // kind: seed/water/fert
  function buildGoods(){
    const goods = [];

    for(const s of SEEDS){
      const isColabo = (s.id === "seed_colabo");
      goods.push({
        kind: "seed",
        id: s.id,
        name: s.name,
        desc: s.desc,
        fx: s.fx,
        img: s.img,
        price: isColabo ? null : (PRICE[s.id] ?? 18),
        buyable: !isColabo,
        tag: isColabo ? "シリアル限定" : "販売"
      });
    }
    for(const w of WATERS){
      goods.push({
        kind: "water",
        id: w.id,
        name: w.name,
        desc: w.desc,
        fx: w.fx,
        img: w.img,
        price: (PRICE[w.id] ?? 18),
        buyable: true,
        tag: "販売"
      });
    }
    for(const f of FERTS){
      goods.push({
        kind: "fert",
        id: f.id,
        name: f.name,
        desc: f.desc,
        fx: f.fx,
        img: f.img,
        price: (PRICE[f.id] ?? 18),
        buyable: true,
        tag: "販売"
      });
    }
    return goods;
  }

  const GOODS = buildGoods();

  const SAY = [
    "「いらっしゃい…たこ。オクトで“未来”を買うの、すき…たこ？」",
    "「種は物語…水は運…肥料は代償…たこ。」",
    "「ボタン押しても無反応に見えた？…今は喋れるようにした…たこ。」",
    "「買う？…買わない？…どっちでもいいけど、見ていきな…たこ。」"
  ];

  // ---------- modal（必ず動く） ----------
  const modal = $("#modal");
  const modalBg = $("#modalBg");
  const modalX  = $("#modalX");
  const modalTitle = $("#modalTitle");
  const modalBody  = $("#modalBody");

  function openModal(title, html){
    if(!modal || !modalTitle || !modalBody) return; // DOM無いなら何もしない（落ちない）
    modalTitle.textContent = title || "メニュー";
    modalBody.innerHTML = html || "";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden","false");
  }
  function closeModal(){
    if(!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden","true");
    if(modalBody) modalBody.innerHTML = "";
  }

  // 背景・×で閉じる（存在する時だけ）
  modalBg?.addEventListener("click", closeModal);
  modalX?.addEventListener("click", closeModal);
  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") closeModal(); });

  // ---------- render ----------
  let currentKind = "seed";

  function ownedCount(inv, kind, id){
    const bucket = inv[kind] || {};
    return Number(bucket[id] || 0);
  }
  function totalKind(inv, kind){
    const bucket = inv[kind] || {};
    let total = 0;
    for(const k of Object.keys(bucket)){
      total += Number(bucket[k] || 0);
    }
    return total;
  }

  function ensureInvKeys(){
    const inv = loadInv();
    inv.seed  = inv.seed  || {};
    inv.water = inv.water || {};
    inv.fert  = inv.fert  || {};
    // 穴埋め（新規追加があっても反映される）
    for(const g of GOODS){
      if(!(g.id in inv[g.kind])) inv[g.kind][g.id] = 0;
    }
    saveInv(inv);
    return inv;
  }

  function setTakopiSayRandom(){
    const t = SAY[Math.floor(Math.random()*SAY.length)];
    const el = $("#takopiSay");
    if(el) el.innerHTML = t;
  }

  function refreshHUD(){
    const inv = ensureInvKeys();
    const octo = getOcto();

    const octoNow = $("#octoNow");
    if(octoNow) octoNow.textContent = String(octo);

    const chipSeed  = $("#chipSeed");
    const chipWater = $("#chipWater");
    const chipFert  = $("#chipFert");
    const chipBookOwned = $("#chipBookOwned");

    if(chipSeed)  chipSeed.textContent  = String(totalKind(inv, "seed"));
    if(chipWater) chipWater.textContent = String(totalKind(inv, "water"));
    if(chipFert)  chipFert.textContent  = String(totalKind(inv, "fert"));
    if(chipBookOwned) chipBookOwned.textContent = String(calcBookOwned());

    // みくじボタン表示
    const done = localStorage.getItem(LS.mikujiDate) === todayKey();
    const btnM = $("#btnMikuji");
    if(btnM){
      btnM.textContent = done ? "🎲 たこ焼きみくじ（本日済）" : "🎲 たこ焼きみくじ（1日1回）";
      btnM.disabled = done;
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
    const inv = ensureInvKeys();
    const grid = $("#goodsGrid");
    if(!grid) return;

    const list = GOODS.filter(g => g.kind === currentKind);

    grid.innerHTML = list.map(g => {
      const own = String(ownedCount(inv, g.kind, g.id));
      const canBuy = !!g.buyable;
      const priceLabel = canBuy ? `価格：${g.price}オクト` : "価格：—（購入不可）";
      const btnLabel   = canBuy ? `買う（${g.price}オクト）` : "シリアルで入手";
      const dis = canBuy ? "" : "disabled";
      const badge = g.tag ? `<span class="miniTag">${g.tag}</span>` : "";

      return `
        <article class="good" data-kind="${g.kind}" data-id="${g.id}">
          <div class="good-top">
            <div class="good-img"><img src="${g.img}" alt="${g.name}" loading="lazy"></div>
            <div class="good-meta">
              <div class="good-name">${g.name} ${badge}</div>
              <div class="good-desc">${(g.desc||"").replace(/\n/g,"<br>")}</div>
              <div class="good-fx">${g.fx ? `効果：<b>${g.fx}</b>` : ""}</div>
            </div>
          </div>
          <div class="good-row">
            <div class="good-owned">所持×<b>${own}</b></div>
            <div class="good-buy">
              <div class="price">${priceLabel}</div>
              <button class="btn buybtn" ${dis} data-act="${canBuy ? "buy" : "serial"}">${btnLabel}</button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    // handlers（必ず発火→openModalへ）
    $$(".good", grid).forEach(card => {
      const kind = card.getAttribute("data-kind");
      const id   = card.getAttribute("data-id");
      const item = GOODS.find(x => x.kind===kind && x.id===id);
      if(!item) return;

      const btn = $(".buybtn", card);
      btn?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        if(item.buyable){
          confirmBuy(item);
        }else{
          // コラボのタネはシリアル入力へ
          openSerialModal();
        }
      });
    });
  }

  // ---------- BUY FLOW（ワクワク演出） ----------
  function confirmBuy(item){
    const inv = ensureInvKeys();
    const octo = getOcto();
    const own = ownedCount(inv, item.kind, item.id);

    const can = octo >= Number(item.price||0);

    openModal("🛒 購入する", `
      <div class="pop-wrap">
        <div class="pop-head">
          <div class="pop-img"><img src="${item.img}" alt="${item.name}"></div>
          <div class="pop-info">
            <div class="pop-name">${item.name}</div>
            <div class="pop-desc">${(item.desc||"").replace(/\n/g,"<br>")}</div>
            <div class="pop-meta">
              <span>所持：<b>${own}</b></span>
              <span>価格：<b>${item.price}</b>オクト</span>
            </div>
            <div class="pop-fx">${item.fx ? `効果：<b>${item.fx}</b>` : ""}</div>
          </div>
        </div>

        <div class="pop-say">
          <div class="spark">✨</div>
          <div class="note">
            たこぴ：<br>
            「それを買うの…？ いいね…たこ。<br>
            でもね、買うってことは、“焼く”ってこと…たこ。」
          </div>
        </div>

        <div class="pop-actions">
          <button class="btn big" id="doBuy" ${can ? "" : "disabled"}>購入する</button>
          <button class="btn btn-ghost" id="cancelBuy">やめる</button>
          <div class="warnline">${can ? "" : "オクトが足りない…たこ。"}</div>
        </div>
      </div>
    `);

    const root = modalBody || document;
    $("#cancelBuy", root)?.addEventListener("click", closeModal);
    $("#doBuy", root)?.addEventListener("click", () => {
      doBuy(item);
      closeModal();
    });
  }

  function doBuy(item){
    const price = Number(item.price||0);
    const octo = getOcto();
    if(octo < price) return;

    const inv = ensureInvKeys();
    inv[item.kind] = inv[item.kind] || {};
    inv[item.kind][item.id] = Number(inv[item.kind][item.id] || 0) + 1;

    setOcto(octo - price);
    saveInv(inv);

    pushLog(`購入：${item.name} -${price}オクト`);
    setTakopiSayRandom();
    refreshHUD();
    renderGoods();
    toast(`購入！ ${item.name}（+1）`);
  }

  // ---------- simple toast ----------
  function toast(text){
    const el = $("#toast");
    if(!el) return;
    el.textContent = text;
    el.classList.add("is-show");
    clearTimeout(toast._t);
    toast._t = setTimeout(()=> el.classList.remove("is-show"), 1600);
  }

  // ---------- inventory modal ----------
  function openInvModal(){
    const inv = ensureInvKeys();

    function list(kindLabel, kindKey){
      const items = GOODS.filter(g => g.kind === kindKey);
      const lines = items.map(g => {
        const c = String(ownedCount(inv, g.kind, g.id));
        const memo = (!g.buyable && g.id==="seed_colabo") ? "（シリアル限定）" : "";
        return `<div class="inv-row">
          <div class="inv-left">
            <span class="inv-name">${g.name}</span>
            <span class="inv-memo">${memo}</span>
          </div>
          <div class="inv-right">×<b>${c}</b></div>
        </div>`;
      }).join("");
      return `
        <div class="inv-box">
          <div class="inv-title">${kindLabel}</div>
          ${lines || `<div class="note">まだ何もない…たこ。</div>`}
        </div>
      `;
    }

    openModal("📦 所持資材", `
      <div class="mikuji-wrap">
        <div class="note">※所持数は <b>tf_v1_inv</b>（ファーム在庫）と完全連動。</div>
        ${list("🌱 種", "seed")}
        ${list("💧 水", "water")}
        ${list("🧪 肥料", "fert")}
        <div class="row">
          <button class="btn btn-ghost" id="okInv" type="button">閉じる</button>
        </div>
      </div>
    `);

    const root = modalBody || document;
    $("#okInv", root)?.addEventListener("click", closeModal);
  }

  // ---------- serial（コラボのタネ） ----------
  const REDEEM_TABLE = {
    "COLABO-TEST-1": { seed_colabo: 1 },
    "COLABO-TEST-5": { seed_colabo: 5 },
  };

  function loadUsedCodes(){
    const obj = loadJSON(LS.codesUsed, {});
    return (obj && typeof obj === "object") ? obj : {};
  }
  function saveUsedCodes(obj){
    saveJSON(LS.codesUsed, obj);
  }

  function openSerialModal(){
    openModal("🔑 シリアル入力（コラボのタネ）", `
      <div class="pop-wrap">
        <div class="note">
          「コラボのタネ」は <b>購入できない</b>。<br>
          シリアルを入力すると在庫が増える…たこ。
        </div>

        <div class="serial-row">
          <input id="redeemCode" class="serial-in" type="text" placeholder="例：COLABO-TEST-1" autocomplete="off">
          <button id="redeemBtn" class="btn big">使う</button>
        </div>

        <div class="note">※同じコードは<b>1回だけ</b>。使ったら戻れない…たこ。</div>

        <div class="row">
          <button class="btn btn-ghost" id="serialClose" type="button">閉じる</button>
        </div>
      </div>
    `);

    const root = modalBody || document;

    $("#serialClose", root)?.addEventListener("click", closeModal);

    $("#redeemBtn", root)?.addEventListener("click", () => {
      const code = ( $("#redeemCode", root)?.value || "" ).trim().toUpperCase();
      if(!code){ alert("コードを入力してね"); return; }

      const used = loadUsedCodes();
      if(used[code]){ alert("このコードは使用済み。"); return; }

      const payload = REDEEM_TABLE[code];
      if(!payload){ alert("無効なコードです。"); return; }

      const inv = ensureInvKeys();
      if(payload.seed_colabo){
        inv.seed["seed_colabo"] = Number(inv.seed["seed_colabo"]||0) + (Number(payload.seed_colabo)||0);
      }
      saveInv(inv);

      used[code] = { at: Date.now(), payload };
      saveUsedCodes(used);

      pushLog(`シリアル：${code}（コラボのタネ +${payload.seed_colabo||0}）`);
      toast(`成功！コラボのタネ +${payload.seed_colabo||0}`);
      refreshHUD();
      renderGoods();
      closeModal();
    });
  }

  // ---------- rates modal ----------
  function openRatesModal(){
    openModal("💧 水のレア率メモ", `
      <div class="mikuji-wrap">
        <div class="note">
          ここは“説明”じゃなく“ワクワク”用のメモ。<br>
          ・ただの水：基準（ただし有料）<br>
          ・なんか良さそう：ちょい上振れ<br>
          ・怪しい水：現実準拠の空気<br>
          ・やりすぎ：勝負<br>
          ・押さなきゃよかった：事件
        </div>
        <button class="btn btn-ghost" id="okRates" type="button">閉じる</button>
      </div>
    `);
    const root = modalBody || document;
    $("#okRates", root)?.addEventListener("click", closeModal);
  }

  // ---------- daily mikuji ----------
  function openMikuji(){
    const done = localStorage.getItem(LS.mikujiDate) === todayKey();
    if(done){
      openModal("🎲 たこ焼きみくじ", `<div class="mikuji-wrap"><div class="note">今日はもう引いた…たこ。明日またおいで…たこ。</div></div>`);
      return;
    }

    // たこ焼き画像（仮）
    const ballImg = "https://ul.h3z.jp/7moREJnl.png";

    openModal("🎲 たこ焼きみくじ（1日1回）", `
      <div class="mikuji-wrap">
        <div class="note">
          たこぴ：<br>
          「焼き台から1つ選んで…たこ。<br>
          当たったたこ焼きの中から、何か出る…たこ。」
        </div>

        <div class="grill" id="grill">
          ${Array.from({length:9}).map((_,i)=>`
            <button class="ball" type="button" data-i="${i}">
              <img src="${ballImg}" alt="たこ焼き">
            </button>
          `).join("")}
        </div>

        <div class="note">※押した瞬間、今日の運命が確定する…たこ。</div>
      </div>
    `);

    const root = modalBody || document;
    const grill = $("#grill", root);
    $$(".ball", grill).forEach(b => {
      b.addEventListener("click", () => {
        const idx = Number(b.getAttribute("data-i")||0);
        doMikuji(idx);
      }, { once:true });
    });
  }

  function rollMikujiReward(){
    // 確率（合計100）
    const table = [
      { w:24, type:"seed",  id:"seed_shop",   qty:1, label:"店頭タネ×1" },
      { w:24, type:"seed",  id:"seed_line",   qty:1, label:"回線タネ×1" },
      { w:8,  type:"seed",  id:"seed_special",qty:1, label:"たこぴのタネ×1" },
      { w:18, type:"water", id:"water_nice",  qty:1, label:"なんか良さそうな水×1" },
      { w:12, type:"water", id:"water_overdo",qty:1, label:"やりすぎな水×1" },
      { w:10, type:"fert",  id:"fert_guts",   qty:1, label:"根性論ぶち込み肥料×1" },
      { w:4,  type:"octo",  id:"octo",        qty:50,label:"オクト+50" },
    ];
    const r = Math.random()*100;
    let acc=0;
    for(const t of table){
      acc += t.w;
      if(r <= acc) return t;
    }
    return table[0];
  }

  function doMikuji(){
    const reward = rollMikujiReward();

    if(reward.type === "octo"){
      setOcto(getOcto() + reward.qty);
    }else{
      const inv = ensureInvKeys();
      inv[reward.type] = inv[reward.type] || {};
      inv[reward.type][reward.id] = Number(inv[reward.type][reward.id] || 0) + reward.qty;
      saveInv(inv);
    }

    localStorage.setItem(LS.mikujiDate, todayKey());
    pushLog(`みくじ：${reward.label}`);

    const ballImg = "https://ul.h3z.jp/7moREJnl.png";
    openModal("✨ みくじ結果 ✨", `
      <div class="mikuji-wrap">
        <div class="reveal">
          <img class="glow" src="${ballImg}" alt="たこ焼き（当たり）">
          <div style="font-weight:900; font-size:16px;">✨ ${reward.label} ✨</div>
          <div class="note">たこぴ：<br>「……ねぇ、知ってるたこ？<br>“当たり”は、焼ける前に受け取るもの…たこ。」</div>
        </div>
        <div class="row">
          <button class="btn big" id="okMikuji">OK</button>
        </div>
      </div>
    `);

    const root = modalBody || document;
    $("#okMikuji", root)?.addEventListener("click", () => {
      closeModal();
      refreshHUD();
      renderGoods();
    });
  }

  // ---------- launch present (one time) ----------
  function openLaunchPresent(){
    const claimed = localStorage.getItem(LS.launchGift) === "1";
    if(claimed){
      openModal("🎁 公開記念プレゼント", `<div class="mikuji-wrap"><div class="note">もう受け取った…たこ。大事に使って…たこ。</div></div>`);
      return;
    }

    openModal("🎁 公開記念プレゼント（1回だけ）", `
      <div class="mikuji-wrap">
        <div class="note">
          たこぴ：<br>
          「ホームページ公開記念…たこ。<br>
          “最初の火種”をあげる…たこ。」
        </div>

        <div class="inv-box">
          <div class="inv-title">内容</div>
          <div class="note">🌱 店頭タネ×10</div>
          <div class="note">🌱 回線タネ×10</div>
          <div class="note">🌱 たこぴのタネ×1</div>
          <hr class="sep">
          <div class="note">💧 なんか良さそう×3 / 怪しい×3 / やりすぎ×3</div>
          <div class="note">🧪 気のせい×3 / 根性×3 / 工程すっ飛ばし×3</div>
        </div>

        <div class="row">
          <button class="btn big" id="claimGift">受け取る（取り消し不可）</button>
          <button class="btn btn-ghost" id="cancelGift">やめる</button>
        </div>

        <div class="note">※1回だけ。押したら戻れない…たこ。</div>
      </div>
    `);

    const root = modalBody || document;
    $("#cancelGift", root)?.addEventListener("click", closeModal);
    $("#claimGift", root)?.addEventListener("click", () => {
      claimLaunchGift();
      closeModal();
    });
  }

  function claimLaunchGift(){
    const inv = ensureInvKeys();

    inv.seed["seed_shop"]    = Number(inv.seed["seed_shop"]||0) + 10;
    inv.seed["seed_line"]    = Number(inv.seed["seed_line"]||0) + 10;
    inv.seed["seed_special"] = Number(inv.seed["seed_special"]||0) + 1;

    inv.water["water_nice"]       = Number(inv.water["water_nice"]||0) + 3;
    inv.water["water_suspicious"] = Number(inv.water["water_suspicious"]||0) + 3;
    inv.water["water_overdo"]     = Number(inv.water["water_overdo"]||0) + 3;

    inv.fert["fert_feel"] = Number(inv.fert["fert_feel"]||0) + 3;
    inv.fert["fert_guts"] = Number(inv.fert["fert_guts"]||0) + 3;
    inv.fert["fert_skip"] = Number(inv.fert["fert_skip"]||0) + 3;

    saveInv(inv);
    localStorage.setItem(LS.launchGift, "1");
    pushLog("公開記念プレゼント受取");

    setTakopiSayRandom();
    refreshHUD();
    renderGoods();
    toast("プレゼント受取！");
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
    // +100（テスト）削除：存在してても無効化（押しても何もしない）
    const give = $("#btnGiveOcto");
    if(give){
      give.style.display = "none";
      give.disabled = true;
    }

    $("#btnOpenInv")?.addEventListener("click", () => {
      openInvModal();
      // 無反応に見えないよう、セリフも更新
      setTakopiSayRandom();
    });

    $("#btnOpenRates")?.addEventListener("click", () => {
      openRatesModal();
      setTakopiSayRandom();
    });

    $("#btnMikuji")?.addEventListener("click", () => {
      openMikuji();
      setTakopiSayRandom();
    });

    $("#btnLaunchPresent")?.addEventListener("click", () => {
      openLaunchPresent();
      setTakopiSayRandom();
    });

    // （もし「カード売却ページ」ボタンがあるなら、クリックで新規タブで開く）
    // HTML側に #btnSellCards がある想定。無ければ何もしない。
    $("#btnSellCards")?.addEventListener("click", (e) => {
      e.preventDefault();
      // 同階層に sell.html を置く想定。必要ならパス変更してOK。
      window.open("./sell.html", "_blank", "noopener");
      toast("売却ページを開いた！");
      setTakopiSayRandom();
    });

    // コラボシリアルボタンが独立である場合（任意）
    $("#btnSerial")?.addEventListener("click", () => {
      openSerialModal();
      setTakopiSayRandom();
    });
  }

  function boot(){
    // まずinv穴埋め（反映されない問題対策：キー不足で0扱いにならないように）
    ensureInvKeys();

    setTakopiSayRandom();
    wireTabs();
    wireButtons();
    refreshHUD();
    renderGoods();
  }

  boot();
})();





