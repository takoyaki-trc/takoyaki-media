/* assets/roten.js
   - たこぴ資材ショップ：棚→モーダル購入（A案）
   - 在庫：tf_v1_inv（ファームと共通）
   - 図鑑：tf_v1_book（count合計）
   - オクト：roten_v1_octo
   - たこ焼きみくじ：1日1回
   - 公開記念プレゼント：1回だけ
*/

(() => {
  "use strict";

  // ===== LS Keys =====
  const LS = {
    octo: "roten_v1_octo",
    inv: "tf_v1_inv",
    book: "tf_v1_book",
    mikujiDate: "roten_v1_mikuji_date",
    giftClaimed: "roten_v1_launch_gift_claimed",
  };

  // ===== Utility =====
  const $ = (q, root=document) => root.querySelector(q);

  function todayKey(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  }

  function loadNum(key, def=0){
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) ? v : def;
  }
  function saveNum(key, n){
    localStorage.setItem(key, String(Math.floor(n)));
  }

  function toast(msg){
    // 最低限：alertより軽い演出（なければalert）
    try{
      let el = $("#_toast");
      if(!el){
        el = document.createElement("div");
        el.id = "_toast";
        el.style.position="fixed";
        el.style.left="50%";
        el.style.bottom="18px";
        el.style.transform="translateX(-50%)";
        el.style.zIndex="99999";
        el.style.background="rgba(0,0,0,.72)";
        el.style.border="1px solid rgba(255,255,255,.14)";
        el.style.color="#fff";
        el.style.borderRadius="14px";
        el.style.padding="10px 12px";
        el.style.fontSize="12px";
        el.style.maxWidth="min(520px,92vw)";
        el.style.display="none";
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.style.display="block";
      clearTimeout(el._t);
      el._t = setTimeout(()=>{ el.style.display="none"; }, 1500);
    }catch(e){
      alert(msg);
    }
  }

  // ===== Inventory (tf_v1_inv) =====
  function defaultInv(){
    const inv = { ver:1, seed:{}, water:{}, fert:{} };
    for(const x of SEEDS) inv.seed[x.id] = 0;
    for(const x of WATERS) inv.water[x.id] = 0;
    for(const x of FERTS) inv.fert[x.id] = 0;
    return inv;
  }

  function loadInv(){
    try{
      const raw = localStorage.getItem(LS.inv);
      if(!raw) return defaultInv();
      const inv = JSON.parse(raw);
      if(!inv || typeof inv !== "object") return defaultInv();
      inv.seed  = inv.seed  || {};
      inv.water = inv.water || {};
      inv.fert  = inv.fert  || {};
      // 欠けてるキー補完
      for(const x of SEEDS) if(!(x.id in inv.seed)) inv.seed[x.id]=0;
      for(const x of WATERS) if(!(x.id in inv.water)) inv.water[x.id]=0;
      for(const x of FERTS) if(!(x.id in inv.fert)) inv.fert[x.id]=0;
      return inv;
    }catch(e){
      return defaultInv();
    }
  }
  function saveInv(inv){
    localStorage.setItem(LS.inv, JSON.stringify(inv));
  }

  const FREE = {
    seed:  new Set(["seed_random"]),
    water: new Set(["water_plain_free"]),
    fert:  new Set(["fert_agedama"]),
  };
  function isFree(type, id){ return !!FREE[type]?.has(id); }
  function invGet(inv, type, id){
    if(isFree(type,id)) return Infinity;
    const n = Number(inv?.[type]?.[id] ?? 0);
    return Number.isFinite(n) ? n : 0;
  }
  function invAdd(inv, type, id, delta){
    if(isFree(type,id)) return;
    if(!inv[type]) inv[type] = {};
    const cur = Number(inv[type][id] ?? 0);
    inv[type][id] = Math.max(0, cur + delta);
  }

  function sumInv(inv, type){
    const box = inv?.[type] || {};
    let s = 0;
    for(const k in box){
      const n = Number(box[k] ?? 0);
      if(Number.isFinite(n)) s += Math.max(0,n);
    }
    return s;
  }

  // ===== Book (tf_v1_book) =====
  function bookOwnedTotal(){
    try{
      const raw = localStorage.getItem(LS.book);
      if(!raw) return 0;
      const b = JSON.parse(raw);
      const got = b && b.got ? b.got : {};
      let total = 0;
      for(const id in got){
        const c = Number(got[id]?.count ?? 0);
        if(Number.isFinite(c)) total += Math.max(0,c);
        else total += 1;
      }
      return total;
    }catch(e){
      return 0;
    }
  }

  // ===== Modal =====
  const modal = $("#modal");
  const modalBg = $("#modalBg");
  const modalX  = $("#modalX");
  const modalTitle = $("#modalTitle");
  const modalBody  = $("#modalBody");

  function openModal(title, html){
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    modal.setAttribute("aria-hidden","false");
  }
  function closeModal(){
    modal.setAttribute("aria-hidden","true");
    modalBody.innerHTML = "";
  }
  modalBg?.addEventListener("click", closeModal);
  modalX?.addEventListener("click", closeModal);

  // ===== Data (farmと揃える) =====
  // ここは「あなたの takofarm.js の配列」と同じIDで揃えてあります
  const SEEDS = [
    { id:"seed_random",  name:"【なに出るタネ】", desc:"何が育つかは完全ランダム。\n店主も知らない。", img:"https://ul.h3z.jp/gnyvP580.png", price:null, fx:"無料∞（買う意味なし）" },
    { id:"seed_shop",    name:"【店頭タネ】", desc:"店で生まれたタネ。\n店頭ナンバーを宿している。", img:"https://ul.h3z.jp/IjvuhWoY.png", price:18, fx:"店頭由来（物語枠）" },
    { id:"seed_line",    name:"【回線タネ】", desc:"画面の向こうから届いたタネ。\nクリックすると芽が出る。", img:"https://ul.h3z.jp/AonxB5x7.png", price:18, fx:"回線由来（ネット枠）" },
    { id:"seed_special", name:"【たこぴのタネ】", desc:"今はまだ何も起きない。\nそのうち何か起きる。", img:"https://ul.h3z.jp/29OsEvjf.png", price:28, fx:"待て" },
    { id:"seed_colabo",  name:"【コラボのタネ】", desc:"基本はシリアルで増える。\n（ここで買えるのは夢の話）", img:"https://ul.h3z.jp/AWBcxVls.png", price:48, fx:"シリアル解放" },
  ];

  const WATERS = [
    { id:"water_plain_free", name:"《ただの水》", desc:"無料・UR/LRなし。\n無課金の基準。", img:"https://ul.h3z.jp/13XdhuHi.png", price:null, fx:"無料∞（購入不可）" },
    { id:"water_nice", name:"《なんか良さそうな水》", desc:"ちょい上振れ・LRなし。\n初心者の背中押し。", img:"https://ul.h3z.jp/3z04ypEd.png", price:20, fx:"ちょい上振れ" },
    { id:"water_suspicious", name:"《怪しい水》", desc:"現実準拠・標準。\n実パックと同じ空気。", img:"https://ul.h3z.jp/wtCO9mec.png", price:22, fx:"標準" },
    { id:"water_overdo", name:"《やりすぎな水》", desc:"勝負水・現実より上。\n体感で強い。", img:"https://ul.h3z.jp/vsL9ggf6.png", price:28, fx:"勝負" },
    { id:"water_regret", name:"《押さなきゃよかった水》", desc:"確定枠・狂気。\n事件製造機（SNS向け）", img:"https://ul.h3z.jp/L0nafMOp.png", price:30, fx:"事件" },
  ];

  const FERTS = [
    { id:"fert_agedama", name:"①ただの揚げ玉", desc:"時短0。\n《焼きすぎたカード》率UP", img:"https://ul.h3z.jp/9p5fx53n.png", price:null, fx:"無料∞（購入不可）" },
    { id:"fert_feel", name:"②《気のせい肥料》", desc:"早くなった気がする。\n気のせいかもしれない。", img:"https://ul.h3z.jp/XqFTb7sw.png", price:18, fx:"時短 5%" },
    { id:"fert_guts", name:"③《根性論ぶち込み肥料》", desc:"理由はない。\n気合いだ。", img:"https://ul.h3z.jp/bT9ZcNnS.png", price:22, fx:"時短 20%" },
    { id:"fert_skip", name:"④《工程すっ飛ばし肥料》", desc:"途中は、\n見なかったことにした。", img:"https://ul.h3z.jp/FqPzx12Q.png", price:28, fx:"時短 40%" },
    { id:"fert_timeno", name:"⑤《時間を信じない肥料》", desc:"最終兵器・禁忌。\n稀に《ドロドロ生焼けカード》", img:"https://ul.h3z.jp/l2njWY57.png", price:38, fx:"時短 90%+" },
  ];

  // ===== UI refs =====
  const elOcto = $("#octoNow");
  const elChipSeed = $("#chipSeed");
  const elChipWater = $("#chipWater");
  const elChipFert = $("#chipFert");
  const elChipDex = $("#chipDex");

  const btnOpenInv = $("#btnOpenInv");
  const btnOpenDex = $("#btnOpenDex");
  const btnGiveOcto = $("#btnGiveOcto");
  const btnMikuji = $("#btnMikuji");

  const btnTakopiInv = $("#btnTakopiInv");
  const btnTakopiRates = $("#btnTakopiRates");
  const btnTakopiTalk = $("#btnTakopiTalk");
  const btnLaunchGift = $("#btnLaunchGift");
  const elTakopiReveal = $("#takopiReveal");

  const tabBtns = document.querySelectorAll(".takopi-tab");
  const shelfEl = $("#takopiShelf");

  let currentTab = "seed"; // seed/water/fert

  // ===== Render header =====
  function renderTop(){
    const octo = loadNum(LS.octo, 0);
    const inv = loadInv();
    elOcto.textContent = String(octo);

    elChipSeed.textContent  = String(sumInv(inv, "seed"));
    elChipWater.textContent = String(sumInv(inv, "water"));
    elChipFert.textContent  = String(sumInv(inv, "fert"));

    elChipDex.textContent = String(bookOwnedTotal());

    // みくじ 本日済み 表示
    const done = localStorage.getItem(LS.mikujiDate) === todayKey();
    btnMikuji.textContent = done ? "🎲 たこ焼きみくじ（本日済）" : "🎲 たこ焼きみくじ";
    btnMikuji.disabled = false;

    // 公開記念 既に受取なら薄く
    const claimed = localStorage.getItem(LS.giftClaimed) === "1";
    if(btnLaunchGift){
      btnLaunchGift.textContent = claimed ? "🎁 公開記念プレゼント（受取済）" : "🎁 公開記念プレゼント";
      btnLaunchGift.style.opacity = claimed ? ".55" : "1";
    }
  }

  // ===== Shelf render (A案) =====
  function getListByTab(tab){
    if(tab==="seed") return { type:"seed", list:SEEDS };
    if(tab==="water") return { type:"water", list:WATERS };
    return { type:"fert", list:FERTS };
  }

  function renderShelf(){
    const inv = loadInv();
    const {type, list} = getListByTab(currentTab);

    const html = list.map(item => {
      const owned = invGet(inv, type, item.id);
      const isInf = (owned === Infinity);
      const ownedLabel = isInf ? "∞" : `×${owned}`;
      const isFreeItem = isFree(type, item.id);
      const disabled = isFreeItem || item.price == null;

      return `
        <div class="tShelf ${disabled ? "is-disabled":""}" data-type="${type}" data-id="${item.id}">
          <div class="${isFreeItem ? "freeTag":""}">${isFreeItem ? "FREE" : ""}</div>
          <div class="owned">${ownedLabel}</div>
          <div class="img"><img src="${item.img}" alt="${item.name}"></div>
          <div class="nm">${item.name}</div>
          <div class="sub">
            <span class="muted">${item.fx || ""}</span>
            <span class="price">${disabled ? "購入不可" : `${item.price}オクト`}</span>
          </div>
        </div>
      `;
    }).join("");

    shelfEl.innerHTML = html;

    shelfEl.querySelectorAll(".tShelf").forEach(card => {
      card.addEventListener("click", () => {
        const type = card.getAttribute("data-type");
        const id   = card.getAttribute("data-id");
        const item = list.find(x => x.id === id);
        if(!item) return;
        openBuyModal(type, item);
      });
    });
  }

  function openBuyModal(type, item){
    const inv = loadInv();
    const octo = loadNum(LS.octo, 0);

    const owned = invGet(inv, type, item.id);
    const isInf = (owned === Infinity);
    const ownedLabel = isInf ? "∞" : String(owned);

    const freeItem = isFree(type, item.id) || item.price == null;
    const canBuy = (!freeItem && octo >= (item.price||0));

    openModal("購入", `
      <div class="buyBox">
        <div class="buyImg">
          <img src="${item.img}" alt="${item.name}">
        </div>

        <div class="buyMeta">
          <div class="ttl">${item.name}</div>
          <div class="row">
            <span class="pill">所持：<b>${ownedLabel}</b></span>
            <span class="pill">価格：<b>${freeItem ? "FREE" : `${item.price}オクト`}</b></span>
            <span class="pill">分類：<b>${type}</b></span>
          </div>
          <div class="desc">${(item.desc||"").replace(/\n/g,"<br>")}</div>
          <div class="desc">効果：<b>${item.fx || "-"}</b></div>

          <div class="buyActions">
            <button class="btn btn-danger" type="button" id="btnBuyClose">やめる</button>
            <button class="btn btn-primary" type="button" id="btnBuy"
              ${canBuy ? "" : "disabled"}>
              ${freeItem ? "購入不可（無料∞）" : (canBuy ? `焼く（${item.price}オクト）` : "オクト不足")}
            </button>
          </div>

          <div class="muted" style="margin-top:8px;font-size:12px;line-height:1.5">
            ※棚をタップして詳細→買う、の流れにしてワクワク寄せ。<br>
            ※買った資材は <b>tf_v1_inv</b> に入る（ファームと共通）。
          </div>
        </div>
      </div>
    `);

    $("#btnBuyClose")?.addEventListener("click", closeModal);
    $("#btnBuy")?.addEventListener("click", () => {
      if(freeItem) return;

      let octo2 = loadNum(LS.octo, 0);
      if(octo2 < (item.price||0)){
        toast("オクトが足りない…たこ。");
        return;
      }

      const inv2 = loadInv();
      octo2 -= (item.price||0);
      saveNum(LS.octo, octo2);
      invAdd(inv2, type, item.id, +1);
      saveInv(inv2);

      toast(`ﾁｬﾘﾝ…「${item.name}」×1 を買った`);
      closeModal();
      renderTop();
      renderShelf();
    });
  }

  // ===== Inventory modal =====
  function openInvModal(){
    const inv = loadInv();

    function section(title, type, arr){
      const rows = arr.map(x => {
        const owned = invGet(inv, type, x.id);
        const label = (owned===Infinity) ? "∞" : String(owned);
        return `
          <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:14px;background:rgba(255,255,255,.05);">
            <div style="display:flex;gap:10px;align-items:center;">
              <img src="${x.img}" alt="" style="width:44px;height:44px;object-fit:contain;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.18);">
              <div>
                <div style="font-weight:1000">${x.name}</div>
                <div style="font-size:12px;color:rgba(255,255,255,.72)">${(x.fx||"")}</div>
              </div>
            </div>
            <div style="font-weight:1000;font-size:16px">×${label}</div>
          </div>
        `;
      }).join("");

      return `
        <div style="margin-top:10px;font-weight:1000">${title}</div>
        <div style="display:grid;gap:8px;margin-top:8px">${rows}</div>
      `;
    }

    openModal("所持資材", `
      <div class="muted" style="line-height:1.6">無料は∞扱い。買わなくても使える。</div>
      ${section("🌱 種", "seed", SEEDS)}
      ${section("💧 水", "water", WATERS)}
      ${section("🧪 肥料", "fert", FERTS)}
      <div style="margin-top:12px">
        <button class="btn" type="button" id="btnCloseInv" style="width:100%;border-radius:14px;padding:12px">閉じる</button>
      </div>
    `);

    $("#btnCloseInv")?.addEventListener("click", closeModal);
  }

  // ===== Water rate memo =====
  function openWaterMemo(){
    openModal("水のレア率メモ", `
      <div class="muted" style="line-height:1.7">
        水はレア率の“空気”を変える。<br>
        <b>ただの水</b>：UR/LRなし（基準）<br>
        <b>なんか良さそうな水</b>：ちょい上振れ<br>
        <b>怪しい水</b>：現実準拠（標準）<br>
        <b>やりすぎな水</b>：勝負（上振れ）<br>
        <b>押さなきゃよかった水</b>：事件（SNS向け）<br>
      </div>
      <div style="margin-top:12px">
        <button class="btn" type="button" id="btnCloseMemo" style="width:100%;border-radius:14px;padding:12px">閉じる</button>
      </div>
    `);
    $("#btnCloseMemo")?.addEventListener("click", closeModal);
  }

  // ===== Takopi talk =====
  const TAKOPI_LINES = [
    "「買い物って…未来を先払いする儀式…たこ。」",
    "「“所持数”が増えるほど、心は軽くなる…たこ？」",
    "「無料は∞。でも…欲しいのは“無料”じゃない…たこ。」",
    "「迷ったら買う。迷い続けると…焦げる…たこ。」",
    "「今日の運は…水が決める。人じゃない…たこ。」",
  ];
  function takopiTalk(){
    const s = TAKOPI_LINES[Math.floor(Math.random()*TAKOPI_LINES.length)];
    elTakopiReveal.textContent = s;
  }

  // ===== Daily Mikuji (1/day) =====
  const MIKU_TAKO_IMG = "https://ul.h3z.jp/AmlnQA1b.png"; // なんでもOK（表示用）
  const MIKU_CHOICES = 12;

  function mikujiAvailable(){
    return localStorage.getItem(LS.mikujiDate) !== todayKey();
  }

  function weightedPick(items){
    const total = items.reduce((a,x)=>a + (x.w||1), 0);
    let r = Math.random() * total;
    for(const it of items){
      r -= (it.w||1);
      if(r <= 0) return it;
    }
    return items[0];
  }

  function grantReward(rew){
    const inv = loadInv();
    let octo = loadNum(LS.octo, 0);

    if(rew.kind === "octo"){
      octo += rew.amount;
      saveNum(LS.octo, octo);
      return { title:`オクト +${rew.amount}`, detail:"財布があたたまった。"};
    }

    invAdd(inv, rew.kind, rew.id, rew.amount);
    saveInv(inv);

    const name =
      (rew.kind==="seed" ? (SEEDS.find(x=>x.id===rew.id)?.name) :
       rew.kind==="water"? (WATERS.find(x=>x.id===rew.id)?.name) :
       (FERTS.find(x=>x.id===rew.id)?.name)) || rew.id;

    return { title:`${name} ×${rew.amount}`, detail:"たこ焼きが光って…資材になった。" };
  }

  function openMikuji(){
    const done = !mikujiAvailable();
    if(done){
      toast("今日はもう引いた…たこ。");
      return;
    }

    const takos = Array.from({length:MIKU_CHOICES}, (_,i)=>`
      <div class="miku" data-i="${i}">
        <img src="${MIKU_TAKO_IMG}" alt="たこ焼き">
        <div class="t">たこ焼き</div>
      </div>
    `).join("");

    openModal("たこ焼きみくじ（1日1回）", `
      <div class="muted" style="line-height:1.7">
        焼き台に並んだ“たこ焼き”から<b>1つ</b>選ぶ…たこ。<br>
        選んだ瞬間、光って…中からアイテムが出る。
      </div>
      <div style="margin-top:12px" class="mikujiGrid">${takos}</div>
      <div style="margin-top:12px">
        <button class="btn" type="button" id="btnCloseMikuji" style="width:100%;border-radius:14px;padding:12px">やめる</button>
      </div>
    `);

    $("#btnCloseMikuji")?.addEventListener("click", closeModal);

    modalBody.querySelectorAll(".miku").forEach(el => {
      el.addEventListener("click", () => {
        // 今日済みにする
        localStorage.setItem(LS.mikujiDate, todayKey());

        // 報酬（例：資材中心＋たまにオクト）
        const reward = weightedPick([
          // seed
          { w:28, kind:"seed", id:"seed_shop", amount:1 },
          { w:28, kind:"seed", id:"seed_line", amount:1 },
          { w:12, kind:"seed", id:"seed_special", amount:1 },
          // water
          { w:20, kind:"water", id:"water_nice", amount:1 },
          { w:14, kind:"water", id:"water_suspicious", amount:1 },
          { w:8,  kind:"water", id:"water_overdo", amount:1 },
          { w:3,  kind:"water", id:"water_regret", amount:1 },
          // fert
          { w:18, kind:"fert", id:"fert_feel", amount:1 },
          { w:12, kind:"fert", id:"fert_guts", amount:1 },
          { w:7,  kind:"fert", id:"fert_skip", amount:1 },
          { w:3,  kind:"fert", id:"fert_timeno", amount:1 },
          // octo
          { w:10, kind:"octo", amount:50 },
          { w:6,  kind:"octo", amount:120 },
        ]);

        // 演出：光らせる
        el.classList.add("mikuGlow");

        const got = grantReward(reward);

        // 結果
        openModal("みくじ結果", `
          <div class="buyBox">
            <div class="buyImg mikuGlow">
              <img src="${MIKU_TAKO_IMG}" alt="たこ焼き">
            </div>
            <div class="buyMeta">
              <div class="ttl">✨ ${got.title}</div>
              <div class="desc">${got.detail}</div>
              <div class="desc muted">※次は明日。1日1回。</div>
              <div class="buyActions">
                <button class="btn btn-primary" type="button" id="btnOkMiku" style="width:100%">OK</button>
              </div>
            </div>
          </div>
        `);

        $("#btnOkMiku")?.addEventListener("click", () => {
          closeModal();
          renderTop();
          renderShelf();
        });
      });
    });
  }

  // ===== Launch gift (1 time) =====
  function claimLaunchGift(){
    const claimed = localStorage.getItem(LS.giftClaimed) === "1";
    if(claimed){
      toast("もう受け取った…たこ。");
      return;
    }

    openModal("公開記念プレゼント（1回だけ）", `
      <div class="muted" style="line-height:1.7">
        ホームページ公開記念で、たこぴからプレゼント…たこ。<br>
        受け取ると<b>戻れない</b>（1回だけ）。
      </div>

      <div style="margin-top:12px;border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:12px;background:rgba(255,255,255,.05)">
        <div style="font-weight:1000">内容</div>
        <div class="muted" style="margin-top:6px;line-height:1.7">
          ・店頭タネ ×10<br>
          ・回線タネ ×10<br>
          ・たこぴのタネ ×1<br>
          ・水（有料の全種類）×3ずつ<br>
          ・肥料（有料の全種類）×3ずつ
        </div>
      </div>

      <div class="buyActions" style="margin-top:12px">
        <button class="btn btn-danger" type="button" id="btnGiftNo">やめる</button>
        <button class="btn btn-primary" type="button" id="btnGiftYes">受け取る</button>
      </div>
    `);

    $("#btnGiftNo")?.addEventListener("click", closeModal);
    $("#btnGiftYes")?.addEventListener("click", () => {
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
      localStorage.setItem(LS.giftClaimed, "1");

      toast("受け取った…たこ。");
      closeModal();
      renderTop();
      renderShelf();
    });
  }

  // ===== Events =====
  // tab
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(x => x.classList.remove("is-active"));
      btn.classList.add("is-active");
      currentTab = btn.getAttribute("data-takotab") || "seed";
      renderShelf();
    });
  });

  // inv
  btnOpenInv?.addEventListener("click", openInvModal);
  btnTakopiInv?.addEventListener("click", openInvModal);

  // dex
  btnOpenDex?.addEventListener("click", () => location.href = "./zukan.html");

  // memo
  btnTakopiRates?.addEventListener("click", openWaterMemo);

  // talk
  btnTakopiTalk?.addEventListener("click", takopiTalk);

  // mikuji
  btnMikuji?.addEventListener("click", openMikuji);

  // gift
  btnLaunchGift?.addEventListener("click", claimLaunchGift);

  // octo test
  btnGiveOcto?.addEventListener("click", () => {
    const now = loadNum(LS.octo, 0);
    saveNum(LS.octo, now + 100);
    toast("+100 オクト");
    renderTop();
  });

  // ===== Boot =====
  renderTop();
  renderShelf();

})();


