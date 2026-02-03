/* assets/nana.shop.js
   たこやきなな（公式ショップ）完全版

   ✅ 資材購入：タネ/水/肥料 → tf_v1_inv に反映
   ✅ 所持資材表示：画像＋個数 → モーダル表示（チップタップで直開き）
   ✅ 収穫カード即決買取(基準の1/3) → roten_v1_octo増 / tf_v1_book.got[id].count減
   ✅ 日替わりくじ袋（袋を選ぶ演出）→ 資材は tf_v1_inv へ
   ✅ テンチョー画像＋吹き出し（タップでセリフ変化）

   ※既存の roten.js（タブ制御等）はそのまま利用
*/

(() => {
  // ========= Keys =========
  const LS = {
    octo: "roten_v1_octo",
    tfInv: "tf_v1_inv",
    book: "tf_v1_book",
    rotenInv: "roten_v1_inventory", // あれば整合用に少し減算
    lotteryState: "nana_v1_lottery_state"
  };

  // ========= DOM helpers =========
  const $ = (id) => document.getElementById(id);

  // ========= Utility =========
  function escapeHtml(str){
    return String(str ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#39;");
  }

  // ========= Data (★あなたの実物ID/画像に合わせてここを増やしてOK) =========
  // imgが空なら ? 表示になります（後でURLを入れるだけで自動で出ます）
  const SEEDS = [
    { id:"seed_random", name:"【なに出るタネ】", price:120, img:"https://ul.h3z.jp/7moREJnl.png", desc:"何が育つかは完全ランダム。\n店主も知らない。" },
    { id:"seed_shop",   name:"【店頭タネ】",     price:160, img:"https://ul.h3z.jp/SvLLVa7m.png", desc:"店で生まれたタネ。\n店頭ナンバーの気配。" },
    { id:"seed_line",   name:"【回線タネ】",     price:150, img:"https://ul.h3z.jp/TWaE9GsS.png", desc:"画面の向こうから届く。\nクリックで芽が出る(気持ち)。" },
    { id:"seed_ghost",  name:"【GHOSTタネ】",    price:220, img:"", desc:"夜にだけ匂う。\n友情が混入してる。" },
    { id:"seed_hero",   name:"【勇者タネ】",     price:260, img:"", desc:"熱い。\nたこぴが強く握ってた。" }
  ];

  const WATERS = [
    { id:"water_plain",      name:"【ふつうの水】",      price:80,  img:"", desc:"基準の水。\n無難の頂点。" },
    { id:"water_plus",       name:"【ちょい良い水】",    price:120, img:"", desc:"レア率がちょい上がる…気がする。" },
    { id:"water_mystery",    name:"【謎の水】",          price:200, img:"", desc:"たまに現実が溶ける。\n※責任は取らない。" },
    { id:"water_tidal",      name:"【潮の水】",          price:160, img:"", desc:"海の気配。\nたこ焼きが強くなる(？)" },
    { id:"water_crystal",    name:"【結晶水】",          price:240, img:"", desc:"透明すぎて目が痛い。\n上振れ祈願。" }
  ];

  const FERTS = [
    { id:"fert_agedama", name:"【ただの揚げ玉】", price:60,  img:"", desc:"時短：ほんのちょい。\n信じる者だけ救う。" },
    { id:"fert_fast",    name:"【時短の粉】",     price:140, img:"", desc:"時短：そこそこ。\n焦りが加速する。" },
    { id:"fert_max",     name:"【時短MAX】",      price:220, img:"", desc:"時短：最大。\n稀にドロドロが生まれる。" },
    { id:"fert_calm",    name:"【落ち着け肥料】", price:180, img:"", desc:"時短：しない。\n心だけ整う。" },
    { id:"fert_burn",    name:"【焦げヘラ粉】",   price:210, img:"", desc:"時短：逆。\n稀に焼きすぎが生まれる。" }
  ];

  const GOODS_BY_KIND = { seed: SEEDS, water: WATERS, fert: FERTS };

  // 所持資材モーダル用：id→メタ
  const META = {
    seed: Object.fromEntries(SEEDS.map(x => [x.id, x])),
    water: Object.fromEntries(WATERS.map(x => [x.id, x])),
    fert: Object.fromEntries(FERTS.map(x => [x.id, x]))
  };

  // ========= Speech =========
  const TENCHO_LINES = [
    "いらっしゃい。今日も焼いてく？",
    "資材は揃ってる？ 足りないのは心かも。",
    "即決買取？ いいよ。夢は安いけどな。",
    "くじ袋？ 選んだ瞬間に運命は固まる。",
    "焦るな。時短は、だいたい地獄。",
    "生焼けはまだ許せる。半端な言い訳は許せない。"
  ];

  // ========= Storage =========
  function loadOcto(){
    const v = Number(localStorage.getItem(LS.octo) || "0");
    return Number.isFinite(v) ? v : 0;
  }
  function saveOcto(v){
    localStorage.setItem(LS.octo, String(Math.max(0, Math.floor(v))));
  }

  function tfLoadInv(){
    try{
      const raw = localStorage.getItem(LS.tfInv);
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
    localStorage.setItem(LS.tfInv, JSON.stringify(inv));
  }
  function tfAdd(kind, id, n){
    const inv = tfLoadInv();
    inv[kind] = inv[kind] || {};
    inv[kind][id] = (inv[kind][id]||0) + n;
    if(inv[kind][id] < 0) inv[kind][id] = 0;
    tfSaveInv(inv);
  }
  function tfCountTotal(kindObj){
    let t = 0;
    for(const k in kindObj) t += Number(kindObj[k]||0);
    return t;
  }

  function loadBook(){
    try{
      const raw = localStorage.getItem(LS.book);
      if(!raw) return { ver:1, got:{}, seen:{} };
      const b = JSON.parse(raw);
      b.got = b.got || {};
      b.seen = b.seen || {};
      return b;
    }catch(e){
      return { ver:1, got:{}, seen:{} };
    }
  }
  function saveBook(book){
    localStorage.setItem(LS.book, JSON.stringify(book));
  }

  // 露店在庫も（存在すれば）少し整合を取る：売ったカードが露店にも残る事故を軽減
  function loadRotenInv(){
    try{
      const raw = localStorage.getItem(LS.rotenInv);
      if(!raw) return { ver:1, items:{} };
      const inv = JSON.parse(raw);
      inv.items = inv.items || {};
      return inv;
    }catch(e){
      return { ver:1, items:{} };
    }
  }
  function saveRotenInv(inv){
    localStorage.setItem(LS.rotenInv, JSON.stringify(inv));
  }
  function decRotenInvMaybe(cardId, n){
    const inv = loadRotenInv();
    if(!inv.items || !inv.items[cardId]) return;
    inv.items[cardId] = Math.max(0, Number(inv.items[cardId]||0) - n);
    if(inv.items[cardId] === 0) delete inv.items[cardId];
    saveRotenInv(inv);
  }

  // ========= Tencho =========
  const bubbleText = $("nanaBubbleText");
  function tenchoSay(text){
    if(bubbleText) bubbleText.textContent = text;
  }
  function tenchoRandom(){
    const i = Math.floor(Math.random() * TENCHO_LINES.length);
    tenchoSay(TENCHO_LINES[i]);
  }

  // ========= Counters sync =========
  function setText(id, v){
    const el = $(id);
    if(el) el.textContent = String(v);
  }

  // ※ここが「ファーム/露店に反映」の要
  //   - tf_v1_inv の総数を上部バー＆ミニ表示に反映
  function refreshTopCounts(){
    const octo = loadOcto();
    const inv = tfLoadInv();
    const seedT = tfCountTotal(inv.seed);
    const waterT = tfCountTotal(inv.water);
    const fertT = tfCountTotal(inv.fert);

    setText("rotenOcto", octo);
    setText("rotenSeed", seedT);
    setText("rotenWater", waterT);
    setText("rotenFert", fertT);

    setText("nanaOctoMini", octo);
    setText("nanaSeedMini", seedT);
    setText("nanaWaterMini", waterT);
    setText("nanaFertMini", fertT);

    // 所持資材モーダルが開いてるなら更新
    if(invModal && invModal.classList.contains("is-show")){
      renderInvGrid();
    }
  }

  // ========= Render: goods =========
  const goodsList = $("nanaGoodsList");
  const shopMsg = $("nanaShopMsg");
  const shopTabsWrap = $("nanaShopTabs");
  let currentKind = "seed";

  function renderGoods(){
    if(!goodsList) return;
    const list = GOODS_BY_KIND[currentKind] || [];
    goodsList.innerHTML = list.map(item => {
      const img = item.img
        ? `<img class="nana-good__img" src="${item.img}" alt="">`
        : `<div class="nana-good__img" style="display:flex;align-items:center;justify-content:center;opacity:.6;">?</div>`;

      return `
        <div class="nana-good" data-id="${escapeHtml(item.id)}">
          ${img}
          <div class="nana-good__meta">
            <div class="nana-good__name">${escapeHtml(item.name)}</div>
            <div class="nana-good__desc">${escapeHtml(item.desc || "")}</div>
          </div>
          <div class="nana-good__buy">
            <div class="nana-price">${item.price} オクト</div>
            <div class="nana-step">
              <button class="nana-minus" type="button">−</button>
              <div class="nana-q" data-q>1</div>
              <button class="nana-plus" type="button">＋</button>
            </div>
            <button class="btn btn-primary nana-buy" type="button">買う</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function buyGoods(id, qty){
    const list = GOODS_BY_KIND[currentKind] || [];
    const item = list.find(x => x.id === id);
    if(!item) return;

    const cost = item.price * qty;
    const octo = loadOcto();
    if(octo < cost){
      if(shopMsg) shopMsg.textContent = `オクト不足…（あと ${cost - octo} オクト）`;
      tenchoSay("足りないのは資材じゃなくてオクトだ。");
      return;
    }

    saveOcto(octo - cost);
    tfAdd(currentKind, item.id, qty);

    if(shopMsg) shopMsg.textContent = `購入！ ${item.name} ×${qty}（-${cost}オクト）`;
    tenchoSay(`よし。${item.name} ×${qty}だ。…増やす前に使え。`);
    refreshTopCounts();
  }

  // ========= Render: sell list =========
  const sellList = $("nanaSellList");
  const sellMsg = $("nanaSellMsg");
  const sellSearch = $("nanaSellSearch");
  const sellSort = $("nanaSellSort");
  const sellAllBtn = $("nanaSellAllBtn");

  // 基準価格：book.got[id]にpriceがあれば優先
  function basePriceForCard(card){
    if(card && Number.isFinite(Number(card.price))) return Math.max(1, Math.floor(Number(card.price)));
    const r = (card && card.rarity) ? String(card.rarity).toUpperCase() : "";
    if(r.includes("LR")) return 900;
    if(r.includes("UR")) return 600;
    if(r.includes("SR")) return 300;
    if(r.includes("R"))  return 180;
    return 120; // N
  }
  function buybackPrice(card){
    return Math.max(1, Math.floor(basePriceForCard(card) / 3));
  }

  function listSellable(){
    const book = loadBook();
    const arr = [];
    for(const id in book.got){
      const c = book.got[id];
      const count = Number(c && c.count || 0);
      if(count > 0){
        arr.push({
          id,
          name: c.name || c.title || id,
          rarity: c.rarity || "",
          count,
          meta: c
        });
      }
    }
    return arr;
  }

  function renderSell(){
    if(!sellList) return;

    const q = (sellSearch?.value || "").trim().toLowerCase();
    let arr = listSellable();

    if(q){
      arr = arr.filter(x => (x.name||"").toLowerCase().includes(q) || x.id.toLowerCase().includes(q));
    }

    const s = sellSort?.value || "new";
    if(s === "id") arr.sort((a,b)=>a.id.localeCompare(b.id));
    if(s === "count") arr.sort((a,b)=>b.count - a.count);
    if(s === "new") arr.sort((a,b)=>b.id.localeCompare(a.id));

    if(arr.length === 0){
      sellList.innerHTML = `<div class="hint">売れるカードがありません（図鑑の所持数が0）。</div>`;
      return;
    }

    sellList.innerHTML = arr.map(x => {
      const p = buybackPrice(x.meta);
      return `
        <div class="nana-sellrow" data-id="${escapeHtml(x.id)}">
          <div class="nana-sellrow__meta">
            <div class="nana-sellrow__title">${escapeHtml(x.name)} <span class="muted">(${escapeHtml(x.id)})</span></div>
            <div class="nana-sellrow__sub">所持：<b>${x.count}</b> / レア：${escapeHtml(x.rarity||"—")} / 即決：<b>${p}</b>オクト</div>
          </div>
          <div class="nana-sellrow__act">
            <button class="btn nana-sell1" type="button">1枚売る</button>
            <button class="btn btn-ghost nana-sellmax" type="button">全部売る</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function decBookCount(id, n){
    const book = loadBook();
    if(!book.got || !book.got[id]) return false;
    const cur = Number(book.got[id].count || 0);
    if(cur < n) return false;
    book.got[id].count = cur - n;
    if(book.got[id].count < 0) book.got[id].count = 0;
    saveBook(book);
    return true;
  }

  function sellCard(id, n){
    const book = loadBook();
    const card = book.got && book.got[id];
    if(!card) return;

    const cur = Number(card.count||0);
    if(cur <= 0){
      if(sellMsg) sellMsg.textContent = "所持がありません。";
      return;
    }

    const qty = Math.min(n, cur);
    const unit = buybackPrice(card);
    const gain = unit * qty;

    if(!decBookCount(id, qty)){
      if(sellMsg) sellMsg.textContent = "売却に失敗（所持数不足）";
      return;
    }
    decRotenInvMaybe(id, qty);

    saveOcto(loadOcto() + gain);

    if(sellMsg) sellMsg.textContent = `即決買取！ ${card.name || id} ×${qty}（+${gain}オクト）`;
    tenchoSay(`はい買った。${qty}枚な。…返品は無い。`);
    refreshTopCounts();
    renderSell();
  }

  function sellDuplicatesAll(){
    const arr = listSellable();
    const targets = arr.filter(x => x.count >= 2);
    if(targets.length === 0){
      if(sellMsg) sellMsg.textContent = "ダブりがありません（2枚以上のカードがない）。";
      return;
    }

    let totalGain = 0;
    let totalQty = 0;

    for(const t of targets){
      const qty = t.count - 1; // 1枚残す
      const unit = buybackPrice(t.meta);
      totalGain += unit * qty;
      totalQty += qty;
    }

    if(!confirm(`ダブりを一括売却します。\n売却枚数：${totalQty}枚\n獲得：${totalGain}オクト\n\n本当に実行しますか？`)) return;

    for(const t of targets){
      const qty = t.count - 1;
      decBookCount(t.id, qty);
      decRotenInvMaybe(t.id, qty);
    }
    saveOcto(loadOcto() + totalGain);

    if(sellMsg) sellMsg.textContent = `一括売却！ ${totalQty}枚（+${totalGain}オクト）`;
    tenchoSay("よし。棚が軽くなったな。心も軽くなれ。");
    refreshTopCounts();
    renderSell();
  }

  // ========= Lottery =========
  const LOTTERY_PRICE = 300;

  const REWARD_TABLE = [
    { w: 30, type:"seed",  id:"seed_random", name:"【なに出るタネ】", qty:1 },
    { w: 18, type:"water", id:"water_plain", name:"【ふつうの水】", qty:1 },
    { w: 12, type:"fert",  id:"fert_agedama",name:"【ただの揚げ玉】", qty:1 },

    { w: 10, type:"seed",  id:"seed_line",   name:"【回線タネ】", qty:1 },
    { w:  8, type:"water", id:"water_plus",  name:"【ちょい良い水】", qty:1 },
    { w:  6, type:"fert",  id:"fert_fast",   name:"【時短の粉】", qty:1 },

    // 演出枠（今は“表示だけ”。後で露店アイテムに接続可能）
    { w:  3, type:"fail",  id:"card_burnt", name:"【焼きすぎたカード】", qty:1 },
    { w:  2, type:"fail",  id:"card_raw",   name:"【ドロドロ生焼けカード】", qty:1 },
    { w:  1, type:"fail",  id:"card_myst",  name:"【何かヤバい紙】", qty:1 }
  ];

  function todayKey(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const dd = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${dd}`;
  }
  function xmur3(str){
    let h = 1779033703 ^ str.length;
    for(let i=0;i<str.length;i++){
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function(){
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }
  function mulberry32(a){
    return function(){
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rollReward(bagLetter){
    const seedStr = `${todayKey()}|${bagLetter}|nanaLottery`;
    const seed = xmur3(seedStr)();
    const rnd = mulberry32(seed);
    const total = REWARD_TABLE.reduce((s,x)=>s+x.w,0);

    let r = rnd() * total;
    for(const item of REWARD_TABLE){
      r -= item.w;
      if(r <= 0) return item;
    }
    return REWARD_TABLE[REWARD_TABLE.length-1];
  }

  function loadState(){
    try{ return JSON.parse(localStorage.getItem(LS.lotteryState) || "{}"); }
    catch(e){ return {}; }
  }
  function saveState(st){
    localStorage.setItem(LS.lotteryState, JSON.stringify(st));
  }
  function grantTicket(n=1){
    const st = loadState();
    st.tickets = Number(st.tickets||0) + n;
    saveState(st);
  }
  function consumeTicket(){
    const st = loadState();
    const t = Number(st.tickets||0);
    if(t<=0) return false;
    st.tickets = t-1;
    saveState(st);
    return true;
  }
  function getTickets(){
    const st = loadState();
    return Number(st.tickets||0);
  }

  const lotteryBuyBtn = $("nanaLotteryBuyBtn");
  const lotteryHint = $("nanaLotteryHint");
  const lotteryModal = $("nanaLotteryModal");
  const bagsWrap = $("nanaBags");
  const reveal = $("nanaReveal");
  const againBtn = $("nanaAgainBtn");

  function openModal(el){
    el?.setAttribute("aria-hidden","false");
    el?.classList.add("is-show");
  }
  function closeModal(el){
    el?.setAttribute("aria-hidden","true");
    el?.classList.remove("is-show");
  }
  function bindModalClose(el){
    el?.addEventListener("click", (e) => {
      const t = e.target;
      if(t && t.getAttribute && t.getAttribute("data-close")==="1") closeModal(el);
    });
  }
  bindModalClose(lotteryModal);

  function updateLotteryHint(){
    if(!lotteryHint) return;
    const octo = loadOcto();
    lotteryHint.textContent = `所持オクト：${octo} / くじ：${LOTTERY_PRICE}オクト / くじ券：${getTickets()}`;
  }
  function updateAgainBtn(){
    if(!againBtn) return;
    const t = getTickets();
    againBtn.disabled = (t<=0);
    againBtn.textContent = (t>0) ? `もう一回引く（残り券 ${t}）` : "もう一回引く";
  }
  function resetBagsUI(){
    if(!bagsWrap || !reveal) return;
    reveal.innerHTML = "";
    const btns = bagsWrap.querySelectorAll(".nana-bag");
    btns.forEach(b=>{
      b.disabled = false;
      b.classList.remove("is-dim","is-win","is-shake");
      b.textContent = "🛍️";
    });
  }

  function buyLottery(){
    const octo = loadOcto();
    if(octo < LOTTERY_PRICE){
      updateLotteryHint();
      tenchoSay("くじ買う前に、まずオクトを育てろ。");
      return false;
    }
    saveOcto(octo - LOTTERY_PRICE);
    grantTicket(1);
    refreshTopCounts();
    updateLotteryHint();
    updateAgainBtn();
    return true;
  }

  function applyReward(item){
    if(item.type==="seed")  tfAdd("seed",  item.id, item.qty||1);
    if(item.type==="water") tfAdd("water", item.id, item.qty||1);
    if(item.type==="fert")  tfAdd("fert",  item.id, item.qty||1);
    refreshTopCounts();
  }

  function showReveal(item, bagLetter){
    if(!reveal) return;
    const emoji =
      item.type==="seed" ? "🌱" :
      item.type==="water"? "💧" :
      item.type==="fert" ? "🧪" : "🔥";

    const extra =
      (item.type==="fail")
        ? "<div class='muted'>※失敗作。使い道は…あとで増やせる。</div>"
        : "<div class='muted'>※ファーム資材在庫（tf_v1_inv）に追加しました。</div>";

    reveal.innerHTML = `
      <div style="font-size:18px;line-height:1.35">
        <b>${escapeHtml(bagLetter)}の袋</b>から…<br>
        <span style="font-size:20px">${emoji} <b>${escapeHtml(item.name)}</b> ×${item.qty||1}</span>
      </div>
      ${extra}
    `;
  }

  function onPick(bagBtn){
    if(!consumeTicket()){
      if(reveal) reveal.innerHTML = `<div class="muted">先に購入してね（くじ券がありません）。</div>`;
      updateAgainBtn();
      return;
    }
    updateAgainBtn();

    const bagLetter = bagBtn.getAttribute("data-bag") || "?";
    const item = rollReward(bagLetter);

    const btns = [...bagsWrap.querySelectorAll(".nana-bag")];
    btns.forEach(b=>{
      b.disabled = true;
      if(b !== bagBtn) b.classList.add("is-dim");
      b.classList.add("is-shake");
    });

    setTimeout(() => {
      btns.forEach(b=>b.classList.remove("is-shake"));
      bagBtn.classList.add("is-win");
      bagBtn.textContent = "🎊";

      applyReward(item);
      showReveal(item, bagLetter);

      if(item.type==="fail"){
        tenchoSay("…おめでとう。変なものが出た。");
      }else{
        tenchoSay("よし。今日の運はまだ生きてる。");
      }
    }, 900);
  }

  // ========= 所持資材モーダル =========
  const invModal = $("nanaInvModal");
  const invGrid  = $("nanaInvGrid");
  const invHint  = $("nanaInvHint");
  const invOpenBtn = $("nanaInvOpenBtn");

  const chipSeed  = $("nanaChipSeed");
  const chipWater = $("nanaChipWater");
  const chipFert  = $("nanaChipFert");

  const invTabsWrap = $("nanaInvTabs");
  let invKind = "seed";

  bindModalClose(invModal);

  function renderInvTabs(){
    if(!invTabsWrap) return;
    const btns = invTabsWrap.querySelectorAll("[data-invkind]");
    btns.forEach(btn=>{
      const k = btn.getAttribute("data-invkind");
      btn.classList.toggle("is-active", k === invKind);
    });
  }

  function renderInvGrid(){
    if(!invGrid) return;
    const inv = tfLoadInv();
    const bag = inv[invKind] || {};
    const ids = Object.keys(bag).filter(id => Number(bag[id]||0) > 0);

    if(ids.length === 0){
      invGrid.innerHTML = `<div class="hint">まだ何も持っていません。</div>`;
      if(invHint) invHint.textContent = "ショップで買うか、くじで増やそう。";
      return;
    }

    ids.sort((a,b) => {
      const A = (META[invKind][a]?.name || a);
      const B = (META[invKind][b]?.name || b);
      return A.localeCompare(B, "ja");
    });

    invGrid.innerHTML = ids.map(id => {
      const n = Number(bag[id]||0);
      const m = META[invKind][id] || { id, name: id, desc:"（未登録の資材）", img:"" };
      const img = m.img
        ? `<img class="nana-invimg" src="${m.img}" alt="">`
        : `<div class="nana-invimg" style="display:flex;align-items:center;justify-content:center;opacity:.6;">?</div>`;

      return `
        <div class="nana-invitem">
          ${img}
          <div class="nana-invmeta">
            <div class="nana-invname">${escapeHtml(m.name || id)}</div>
            <div class="nana-invdesc">${escapeHtml(m.desc || "")}</div>
            <div class="muted" style="font-size:12px;margin-top:2px;">ID: ${escapeHtml(id)}</div>
          </div>
          <div class="nana-invcount">×${n}</div>
        </div>
      `;
    }).join("");

    if(invHint) invHint.textContent = "※個数はファーム在庫（tf_v1_inv）から取得しています。";
  }

  function openInvModal(kind="seed"){
    invKind = kind;
    renderInvTabs();
    renderInvGrid();
    openModal(invModal);
  }

  // ========= Event binding =========
  function bind(){
    // 公式ショップが無いページなら何もしない
    if(!$("nanaShop")) return;

    // 吹き出しタップでセリフ変化
    $("nanaBubble")?.addEventListener("click", tenchoRandom);

    // 購入タブ
    shopTabsWrap?.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-kind]");
      if(!btn) return;
      currentKind = btn.getAttribute("data-kind") || "seed";

      const btns = shopTabsWrap.querySelectorAll("[data-kind]");
      btns.forEach(b=>b.classList.toggle("is-active", b === btn));

      renderGoods();
    });

    // 購入リスト（デリゲート）
    goodsList?.addEventListener("click", (e) => {
      const row = e.target?.closest?.(".nana-good");
      if(!row) return;

      const id = row.getAttribute("data-id");
      const qEl = row.querySelector("[data-q]");
      let q = Number(qEl?.textContent || "1");
      if(!Number.isFinite(q) || q < 1) q = 1;

      if(e.target.classList.contains("nana-minus")){
        q = Math.max(1, q-1);
        qEl.textContent = String(q);
        return;
      }
      if(e.target.classList.contains("nana-plus")){
        q = Math.min(99, q+1);
        qEl.textContent = String(q);
        return;
      }
      if(e.target.classList.contains("nana-buy")){
        buyGoods(id, q);
        return;
      }
    });

    // 買取リスト（デリゲート）
    sellList?.addEventListener("click", (e) => {
      const row = e.target?.closest?.(".nana-sellrow");
      if(!row) return;
      const id = row.getAttribute("data-id");

      if(e.target.classList.contains("nana-sell1")){
        sellCard(id, 1);
        return;
      }
      if(e.target.classList.contains("nana-sellmax")){
        const book = loadBook();
        const c = book.got && book.got[id];
        const cur = Number(c && c.count || 0);
        if(cur<=0) return;
        if(!confirm(`${c.name || id} を ${cur}枚、全部売りますか？`)) return;
        sellCard(id, cur);
        return;
      }
    });

    sellSearch?.addEventListener("input", renderSell);
    sellSort?.addEventListener("change", renderSell);
    sellAllBtn?.addEventListener("click", sellDuplicatesAll);

    // くじ
    lotteryBuyBtn?.addEventListener("click", () => {
      const ok = buyLottery();
      if(!ok) return;
      resetBagsUI();
      openModal(lotteryModal);
      updateLotteryHint();
      updateAgainBtn();
    });

    againBtn?.addEventListener("click", () => {
      const ok = buyLottery();
      if(!ok) return;
      resetBagsUI();
      updateLotteryHint();
      updateAgainBtn();
    });

    bagsWrap?.addEventListener("click", (e) => {
      const b = e.target?.closest?.(".nana-bag");
      if(!b) return;
      onPick(b);
    });

    // 所持資材モーダル：開く導線
    invOpenBtn?.addEventListener("click", () => openInvModal("seed"));
    chipSeed?.addEventListener("click",  () => openInvModal("seed"));
    chipWater?.addEventListener("click", () => openInvModal("water"));
    chipFert?.addEventListener("click",  () => openInvModal("fert"));

    // 所持資材モーダル：タブ切替
    invTabsWrap?.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-invkind]");
      if(!btn) return;
      invKind = btn.getAttribute("data-invkind") || "seed";
      renderInvTabs();
      renderInvGrid();
    });
  }

  // ========= Boot =========
  if(!$("nanaShop")) return;

  tenchoSay("いらっしゃい。今日も焼いてく？");
  renderGoods();
  renderSell();
  refreshTopCounts();
  updateLotteryHint();
  updateAgainBtn();
  bind();
})();

