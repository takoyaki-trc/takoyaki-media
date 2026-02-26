(() => {
  /* =========================
    gate.js（完全版 + 図鑑追加/制限つき）
    - 通常：12種類を1時間ごと（24hで2周）
    - 追加：1日のどこかに「5分枠×5回」ランダム表示（その日は固定）
    - 図鑑：5分イベント中に表示される“職人カード”を図鑑に追加できる
      ✅ 1人1日1職人1枚まで（同じ職人はその日1回だけ図鑑に入る）
    - 優先：イベント中はイベントを上書き
    ✅ 修正点：
      ・図鑑に保存する「メイン画像」は icon ではなく photo を優先する
      ・icon は thumb（サムネ）として別保存
  ========================= */

  const isNight = () => document.documentElement.classList.contains("is-night");

  const gate = document.querySelector(".spot--gate");
  const gateHit = document.querySelector(".gate-hit");
  if(!gate || !gateHit) return;

  const baseImg = gate.querySelector(".spot__base");
  const iconImg = gate.querySelector(".spot__icon");

  // ✅ モーダル要素
  const modal  = document.getElementById("gateModal");
  const mPhoto = document.getElementById("gateModalPhoto");
  const mTitle = document.getElementById("gateModalTitle");
  const mDesc  = document.getElementById("gateModalDesc");
  const btnGo  = document.getElementById("gateModalGo");
  const btnCancel = document.getElementById("gateModalCancel");

  /* =========================
    0) 図鑑（tf_v1_book）に追加する共通関数
       - 1日1職人1枚まで（同職人）
  ========================= */

  // ✅ 日本時間で「YYYY-MM-DD」を作る（端末TZズレ対策）
  function todayKeyJP(){
    const now = new Date();
    const jp = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const y = jp.getFullYear();
    const m = String(jp.getMonth()+1).padStart(2,"0");
    const d = String(jp.getDate()).padStart(2,"0");
    return `${y}-${m}-${d}`;
  }

  function loadBook(){
    try{
      const raw = localStorage.getItem("tf_v1_book");
      const book = raw ? JSON.parse(raw) : null;
      if(book && typeof book === "object") return book;
    }catch(e){}
    return { got:{} };
  }
  function saveBook(book){
    localStorage.setItem("tf_v1_book", JSON.stringify(book));
  }

  // ✅ 1人1日1職人1枚まで（同職人）
  function claimCraftToBook(craft){
    const day = todayKeyJP();
    const craftId = craft && craft.id ? String(craft.id) : "craft_unknown";
    const craftName = craft && craft.name ? String(craft.name) : "職人";

    const claimKey = `tf_v1_craft_claim_${day}__${craftId}`;
    if(localStorage.getItem(claimKey) === "1"){
      return { ok:false, msg:`今日はもう「${craftName}」は図鑑に入れたよ（1日1枚まで）` };
    }

    const book = loadBook();
    if(!book.got) book.got = {};

    const prev = book.got[craftId];
    const nextCount = (prev && typeof prev.count === "number") ? (prev.count + 1) : 1;

    // ✅ 図鑑に登録するメイン画像は photo を優先（これが本命）
    //  - 図鑑側で「img」を表示しているなら、これで photo が出る
    //  - icon は thumb に退避（一覧用に使いたい時に便利）
    const mainImg = (craft.photo && String(craft.photo)) || (craft.img && String(craft.img)) || (craft.icon && String(craft.icon)) || "";
    const thumbImg = (craft.icon && String(craft.icon)) || "";

    book.got[craftId] = {
      ...(prev || {}),
      id: craftId,
      name: craftName,
      rarity: craft.rarity || "CRAFT",

      // ✅ 図鑑の「登録画像」＝ photo（優先）
      img: mainImg,

      // ✅ 追加：サムネ（祭壇アイコン）も残す
      thumb: thumbImg,

      // ✅ 追加情報
      url: craft.url || "",
      desc: craft.desc || "",
      count: nextCount,
      lastAddedAt: Date.now()
    };

    saveBook(book);
    localStorage.setItem(claimKey, "1");

    return { ok:true, msg:`「${craftName}」を図鑑に追加！（写真を登録したよ）` };
  }

  // ✅ 超軽量トースト（無ければalert）
  function toast(msg){
    if(typeof window.toast === "function"){ window.toast(msg); return; }
    if(typeof window.showToast === "function"){ window.showToast(msg); return; }
    alert(msg);
  }

  /* =========================
    ① 通常：12種類（1時間ごと、24hで2周）
  ========================= */
  const DEST = [
    { name:"ソース", url:"https://takoyakinana.1net.jp/", icon:"https://ul.h3z.jp/nqINjjMK.png",  photo:"https://ul.h3z.jp/w9q1XjEw.JPG" },
    { name:"辛口ソース", url:"https://takoyakinana.1net.jp/", icon:"https://ul.h3z.jp/YLRvkVGN.png",  photo:"https://ul.h3z.jp/9hMHvKKj.JPG" },
    { name:"牡蠣だし醤油", url:"https://takoyakinana.1net.jp/", icon:"https://ul.h3z.jp/MVSCZ25p.png",  photo:"https://ul.h3z.jp/T0CxTKSx.jpg" },
    { name:"塩こしょう", url:"https://takoyakinana.1net.jp/", icon:"https://ul.h3z.jp/SQV2q3jp.png",  photo:"https://ul.h3z.jp/NBucOtLN.jpg" },
    { name:"すっぴん", url:"https://takoyakinana.1net.jp/", icon:"https://ul.h3z.jp/YMqM1RHO.png", photo:"https://ul.h3z.jp/dS7jTJHG.jpg" },
    { name:"塩マヨペッパー", url:"https://takoyakinana.1net.jp/", icon:"https://ul.h3z.jp/zQQykyJj.png", photo:"https://ul.h3z.jp/1cp7o9Wj.JPG" },
    { name:"ぶっかけ揚げ玉からしマヨ", url:"https://takoyakinana.1net.jp/", icon:"https://ul.h3z.jp/IPCsqito.png", photo:"https://ul.h3z.jp/bGPE3EF0.JPG" },
    { name:"チーズソースマヨ", url:"https://takoyakinana.1net.jp/", icon:"https://ul.h3z.jp/90Ev9Ne1.png", photo:"https://ul.h3z.jp/KV88ErO9.JPG" },
    { name:"めんたいマヨ", url:"https://takoyakinana.1net.jp/", icon:"https://ul.h3z.jp/67VI4JDC.png", photo:"https://ul.h3z.jp/KmKaonqx.JPG" },
    { name:"ねぎ味噌", url:"https://takoyakinana.1net.jp/", icon:"https://ul.h3z.jp/s8niXw6T.png", photo:"https://ul.h3z.jp/hZFTeh2G.JPG" },
    { name:"てりたま", url:"https://takoyakinana.1net.jp/", icon:"https://ul.h3z.jp/2R5Y1u17.png", photo:"https://ul.h3z.jp/mUdLeIXQ.jpg" },
    { name:"イカさま焼き", url:"https://takoyakinana.1net.jp/", icon:"https://ul.h3z.jp/u3nsTFYy.png", photo:"https://ul.h3z.jp/XhgVmXyG.JPG" }
  ];

  /* =========================
    ② 5分イベント：候補プール（＝職人カード）
    ✅ 図鑑に入れたいのは photo（料理写真など）
  ========================= */
  const EVENT_POOL = [
    { id:"craft_001", name:"職人ナンバー01", url:"https://takoyakinana.1net.jp/", icon:"https://ul.h3z.jp/Quyt1TAt.png", photo:"https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/syokunin/01.png", desc:"職人カード" },
    { id:"craft_002", name:"職人ナンバー02", url:"https://takoyakinana.1net.jp/", icon:"https://ul.h3z.jp/Quyt1TAt.png", photo:"https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/syokunin/02.png", desc:"職人カード" },
    { id:"craft_003", name:"職人ナンバー03", url:"https://takoyakinana.1net.jp/", icon:"https://ul.h3z.jp/Quyt1TAt.png", photo:"https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/syokunin/03.png", desc:"職人カード" },
    { id:"craft_004", name:"職人ナンバー04", url:"https://takoyakinana.1net.jp/", icon:"https://ul.h3z.jp/Quyt1TAt.png", photo:"https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/syokunin/01.png", desc:"職人カード" },
    { id:"craft_005", name:"職人ナンバー05", url:"https://takoyakinana.1net.jp/", icon:"https://ul.h3z.jp/Quyt1TAt.png", photo:"https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/syokunin/01.png", desc:"職人カード" }
  ];

  // 旧todayKey互換（日本時間）
  function todayKey(){
    return todayKeyJP();
  }

  function mulberry32(seed){
    return function(){
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStringToSeed(str){
    let h = 2166136261;
    for (let i=0;i<str.length;i++){
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function pickUnique(arr, n, rnd){
    const copy = arr.slice();
    for (let i=copy.length-1;i>0;i--){
      const j = Math.floor(rnd() * (i+1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, Math.min(n, copy.length));
  }

  function generateEventWindows(rnd, count=5){
    const windows = [];
    const used = new Set();
    while (windows.length < count){
      const slot = Math.floor(rnd() * 288); // 0..287（5分×288=24h）
      if (used.has(slot) || used.has(slot-1) || used.has(slot+1)) continue;
      used.add(slot);
      windows.push(slot);
    }
    windows.sort((a,b)=>a-b);
    return windows.map(slot => ({ startMin: slot*5, endMin: slot*5 + 5 }));
  }

  function getTodayEventPlan(){
    const key = `gateEventPlan_${todayKey()}`;
    const saved = localStorage.getItem(key);
    if(saved){
      try { return JSON.parse(saved); } catch(e){}
    }

    const seed = hashStringToSeed("takoyaki-gate-" + todayKey());
    const rnd = mulberry32(seed);

    const picks = pickUnique(EVENT_POOL, 5, rnd);
    const windows = generateEventWindows(rnd, 5);

    const plan = windows.map((w,i)=>({
      startMin: w.startMin,
      endMin: w.endMin,
      item: picks[i] || picks[0]
    }));

    localStorage.setItem(key, JSON.stringify(plan));
    return plan;
  }

  function getActiveEventItem(){
    const now = new Date();
    const jpNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const nowMin = jpNow.getHours()*60 + jpNow.getMinutes();

    const plan = getTodayEventPlan();
    for(const p of plan){
      if(nowMin >= p.startMin && nowMin < p.endMin) return p.item;
    }
    return null;
  }

  function getHourlyDest(){
    const now = new Date();
    const jpNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const hour = jpNow.getHours(); // 0..23
    const idx = hour % DEST.length;
    return DEST[idx] || DEST[0];
  }

  function getCurrentDest(){
    const e = getActiveEventItem();
    if(e) return { ...e, isEvent:true };
    return { ...getHourlyDest(), isEvent:false };
  }

  function applyBase(){
    if(!baseImg) return;
    const url = isNight() ? baseImg.dataset.night : baseImg.dataset.day;
    if(url) baseImg.src = url;
  }

  function applyIconAndDest(){
    const dest = getCurrentDest();
    if(iconImg && dest.icon) iconImg.src = dest.icon;
    gate._dest = dest;
  }

  // ✅ 「図鑑に入れる」ボタン（HTMLに無くてもJSで追加）
  function ensureClaimButton(){
    if(!modal) return null;

    let btnClaim = document.getElementById("gateModalClaim");
    if(btnClaim) return btnClaim;

    const parent = (btnGo && btnGo.parentElement) ? btnGo.parentElement : modal;
    btnClaim = document.createElement("button");
    btnClaim.id = "gateModalClaim";
    btnClaim.type = "button";
    btnClaim.textContent = "図鑑に入れる（職人）";
    btnClaim.style.cssText = `
      display:none;
      width:100%;
      margin:10px 0 0;
      padding:12px 12px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.18);
      background: rgba(255,255,255,.10);
      color:#fff;
      font-weight:700;
      letter-spacing:.02em;
      cursor:pointer;
    `;
    parent.appendChild(btnClaim);
    return btnClaim;
  }

  function openModal(dest){
    if(!modal) return;
    const d = dest || gate._dest || getCurrentDest();

    // 画像（モーダルの大画像は photo）
    if(mPhoto){
      mPhoto.classList.remove("is-ready");

      const fallback = "https://ul.h3z.jp/zqoEDppD.jpg";
      const nextUrl = d.photo || fallback;

      mPhoto.onload = () => mPhoto.classList.add("is-ready");
      mPhoto.onerror = () => {
        if(mPhoto.src !== fallback) mPhoto.src = fallback;
        mPhoto.classList.add("is-ready");
      };

      mPhoto.src = nextUrl;
      mPhoto.alt = d.name ? `たこ焼き写真：${d.name}` : "たこ焼き写真";
    }

    // テキスト
    if(mTitle) mTitle.textContent = "たこ焼きゲート";
    if(mDesc){
      const label = d.isEvent ? "【5分イベント発生中：職人出現】" : "この時間の行き先";
      mDesc.textContent = `${label}：${d.name}\n行きますか？`;
    }

    // 行くボタン
    if(btnGo) btnGo.href = d.url || "#";

    // ✅ 図鑑追加ボタン（イベント中だけ表示）
    const btnClaim = ensureClaimButton();
    if(btnClaim){
      if(d.isEvent){
        btnClaim.style.display = "block";

        // 開いた時点で「今日すでに入れたか」判定
        const day = todayKeyJP();
        const claimKey = `tf_v1_craft_claim_${day}__${String(d.id || "craft_unknown")}`;
        const already = localStorage.getItem(claimKey) === "1";

        if(already){
          btnClaim.disabled = true;
          btnClaim.textContent = "今日はもう図鑑に入れた";
          btnClaim.style.opacity = "0.7";
          btnClaim.style.cursor = "default";
        }else{
          btnClaim.disabled = false;
          btnClaim.textContent = "図鑑に入れる（職人）";
          btnClaim.style.opacity = "1";
          btnClaim.style.cursor = "pointer";

          btnClaim.onclick = () => {
            const res = claimCraftToBook(d);
            toast(res.msg);

            btnClaim.disabled = true;
            btnClaim.textContent = res.ok
              ? "図鑑に入れた！（今日はこの職人は終了）"
              : "今日はもう図鑑に入れた";
            btnClaim.style.opacity = "0.7";
            btnClaim.style.cursor = "default";
          };
        }
      }else{
        btnClaim.style.display = "none";
      }
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal(){
    if(!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  // 閉じる
  if(btnCancel) btnCancel.addEventListener("click", closeModal);
  if(modal) modal.addEventListener("click", (e) => { if(e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => { if(e.key === "Escape") closeModal(); });

  // 初期表示
  applyBase();
  applyIconAndDest();

  // 昼夜切替監視
  new MutationObserver(muts => {
    for(const m of muts){
      if(m.attributeName === "class"){
        applyBase();
        break;
      }
    }
  }).observe(document.documentElement, { attributes: true });

  // ✅ タップは gate-hit だけに集約
  gateHit.addEventListener("click", (e) => {
    e.preventDefault();
    openModal(gate._dest || getCurrentDest());
  });

  // 30秒ごと更新（5分イベント追従）
  setInterval(applyIconAndDest, 30 * 1000);
})();
