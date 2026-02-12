(() => {
  "use strict";

  /* =========================================================
     アセット（あなたのまま）
  ========================================================= */
  const ASSETS = {
    bgDay:   "https://ul.h3z.jp/lqCNnwQH.png",
    bgNight: "https://ul.h3z.jp/UtPlWaZz.png",
    visitors: [
      { id:"v01", name:"つぶやきタコ民", type:"careful", url:"https://ul.h3z.jp/RpLPCRTc.png" },
      { id:"v02", name:"即決タコ民", type:"impulse", url:"https://ul.h3z.jp/TMXU9ztW.png" },
      { id:"v03", name:"冷やかしタコ民", type:"looker", url:"https://ul.h3z.jp/7NpD4FDk.png" },
      { id:"v04", name:"見えないタコ民", type:"picky",   url:"https://ul.h3z.jp/MZYfusKm.png" },
      { id:"v05", name:"王様タコ民",   type:"king",    url:"https://ul.h3z.jp/wMM8PrcP.png" },
      { id:"v06", name:"よっぱらいタコ民",   type:"flipper", url:"https://ul.h3z.jp/GLholN7M.png" },

      { id:"v07", name:"札束タコ民",     type:"rich",     url:"https://ul.h3z.jp/pZKu3lSE.png" },
      { id:"v08", name:"踏破タコ民",     type:"climber",  url:"https://ul.h3z.jp/45QUKopT.png" },
      { id:"v09", name:"ナビタコ民",     type:"guide",    url:"https://ul.h3z.jp/1RRwKTMt.png" },
      { id:"v10", name:"ほぐしタコ民",   type:"relax",    url:"https://ul.h3z.jp/dbBbLypa.png" },
      { id:"v11", name:"返し職人タコ民", type:"artisan",  url:"https://ul.h3z.jp/OA5StkvT.png" },
      { id:"v12", name:"ゼロ理論タコ民", type:"diet",     url:"https://ul.h3z.jp/KVImBYZ8.png" },
      { id:"v13", name:"枠外タコ民",     type:"overflow", url:"https://ul.h3z.jp/q4UllqyX.png" },
      { id:"v14", name:"未開封保護タコ民",type:"collector",url:"https://ul.h3z.jp/zSvGyVq9.png" },
      { id:"v15", name:"裏棚タコ民",     type:"shadow",   url:"https://ul.h3z.jp/IBKDrVAm.png" },
      { id:"v16", name:"替え玉タコ民",   type:"ramen",    url:"https://ul.h3z.jp/NViRwhdj.png" },
      { id:"v17", name:"投げ銭タコ民",   type:"streamer", url:"https://ul.h3z.jp/8PukOegd.png" },
      { id:"v18", name:"舌判定タコ民",   type:"gourmet",  url:"https://ul.h3z.jp/We4UXFSI.png" },
      { id:"v19", name:"即バリタコ民",   type:"opener",   url:"https://ul.h3z.jp/9usFHTdU.png" },
      { id:"v20", name:"宴タコ民",       type:"party",    url:"https://ul.h3z.jp/pByCAUMC.png" },
      { id:"v21", name:"覚悟タコ民",     type:"pilgrim",  url:"https://ul.h3z.jp/eW2dluw2.png" }
    ]
  };

  const VISITOR_LINES = {
    careful: ["どうしようかな…","もう少し見てから…","今日は買うべきか…","財布に相談中…（既読スルー）"],
    impulse: ["おっ、いいじゃん","今が買い時かも！","これいっとく？","勢いで買う！…たぶん！"],
    looker:  ["ふーん","見るだけ見よ","賑やかだなあ","撮って帰るわ（買わない）"],
    picky:   ["匂いは悪くない…","焼きのムラは…？","慎重に選びたい","今日は“普通”が強い日…"],
    king:    ["よい。","余は迷わぬ。","この棚…格がある。","買う。異論はない。"],
    flipper: ["回るか…？","これは動く。","利益の匂いがする","買う。評判は知らん。"],
    rich: ["値段？ ああ、雰囲気代だろう","高い？ それは“希少”という意味だ","棚ごと欲しいが…今日は我慢する","焼きの格が違う"],
    climber:["この棚…登れるな","酸素が薄い。レアの高度だ","頂上（UR）は近い…気がする","ここで撤退は恥だ"],
    guide:["こちらが“後悔ゾーン”です","右を見ると財布、左を見ると欲望","今買うと“語れる思い出”になります","出口は…あ、閉まりました"],
    relax:["肩の力、抜いて…買いな？","悩みは筋肉に出る","この棚、ツボ押してくる","物欲リンパ流れてる"],
    artisan:["焼き面…美しい","これは返しが神","手が勝手に回転を想像する","…買う理由が多すぎる"],
    diet:["これはカード。つまり0カロリー","買っても太らない。むしろ痩せる","罪悪感が焼かれている","理論上、無限に買える"],
    overflow:["あ、俺ちょっとはみ出てる？","棚から出てるのが味","規格外が一番うまい","枠に収まらない人生でね"],
    collector:["触らない。眺める","買うか…保存か…","これは2枚必要なやつ","未所持の匂いがする"],
    shadow:["表に出てるのが全てとは限らん","この棚、裏がある","相場は…まだ静かだな","焼かれているのは誰だ？"],
    ramen:["これは…濃い","替え玉（追加購入）できる？","スープは無いが深みはある","〆に1枚、いっとくか"],
    streamer:["みんな見てる〜？","今から運試しするよ〜","当たったら神回","外れても“美味しい”"],
    gourmet:["香りが語りかけてくる","焼きの思想がある","これは“食後に語れる”","軽率には買えない"],
    opener:["開けたい","今すぐ開けたい","結果より“音”","我慢？ なにそれ？"],
    party:["今日は全部祭り","財布？ 酔ってる","景気よく焼こう","買う理由しかない"],
    pilgrim:["ここまで6時間","買わない選択肢は無い","帰りも6時間","記念になるやつ頼む"]
  };

  const LEAVE_LINES = [
    "……財布と心が、今日は噛み合わなかった。",
    "……また来る。焼かれる覚悟ができたら。",
    "……買わない勇気も、立派な消費行動だよね。",
    "……今はその時じゃない。たこ焼きがそう言った。",
    "……棚の圧が強すぎて、俺が焼けた。",
    "……帰宅してから後悔する予定です。",
    "……今日は買わなかった。逆に一生覚えてる"
  ];

  const GOALS = [
    { id:"cheap", label:"安いのを狙ってる" },
    { id:"rare",  label:"SR以上が欲しい" },
    { id:"ur",    label:"UR以上しか勝たん" },
    { id:"any",   label:"なんでもいい、気分" }
  ];
  function goalLines(goalId){
    const map = {
      cheap: ["コスパ…コスパ…","安く焼かれたい…","値札に焼かれる準備OK","財布が軽い。軽い棚頼む。"],
      rare:  ["SR以上…来い…","光ってくれ…頼む…","レアの波が来てる気がする","キラの気配…（幻）"],
      ur:    ["UR以上が無いなら帰る。","UR…UR…（呪文）","光の圧を感じたい","派手に焼かれたい"],
      any:   ["今日はノリで決める。","運命に任せる。","棚に呼ばれた気がする。","脳内ジャンケンで決める。"]
    };
    return map[goalId] || ["……"];
  }

  const LS = {
    octo:     "roten_v1_octo",
    myshop:   "roten_v1_myshop",
    log:      "roten_v1_log",
    lvl:      "roten_v1_level",
    rep:      "roten_v1_rep",
    tick:     "roten_v1_shop_tick",
    shout:    "roten_v1_shout_cd",
    farmBook: "tf_v1_book",
    stage:    "roten_v1_stage",
    queue:    "roten_v1_queue"
  };

  const $ = (q, el=document) => el.querySelector(q);
  const on = (el, ev, fn) => { if(el) el.addEventListener(ev, fn); };

  const statsEl = $("#stats");
  const shelvesEl = $("#shelves");
  const logEl = $("#log");

  const stageBg = $("#stageBg");
  const stageVisitor = $("#stageVisitor");
  const stageName = $("#stageName");
  const stageMsg = $("#stageMsg");
  const stageTimeTag = $("#stageTimeTag");
  const stageNextTag = $("#stageNextTag");

  const pickModal = $("#pickModal");
  const pickCardsEl = $("#pickCards");
  const pickEmptyEl = $("#pickEmpty");
  const pickTitleEl = $("#pickTitle");
  const pickHintEl = $("#pickHint");
  const pickCloseBtn = $("#pickClose");
  const pickCancelBtn = $("#pickCancel");

  const helpModal = $("#helpModal");
  const helpBtn = $("#helpBtn");
  const helpClose = $("#helpClose");
  const helpOk = $("#helpOk");

  const toastBox = $("#toastBox");
  const toastTitle = $("#toastTitle");
  const toastSub = $("#toastSub");
  const saleFlash = $("#saleFlash");

  const backBtn = $("#backBtn");
  const shoutBtn = $("#shoutBtn");
  const shoutCdEl = $("#shoutCd");
  const backupBtn = $("#backupBtn");
  const restoreBtn = $("#restoreBtn");
  const restoreFile = $("#restoreFile");
  const fixBtn = $("#fixBtn");

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const now = () => Date.now();
  const fmt = (n) => (Number(n||0)).toLocaleString("ja-JP");
  const pick = (arr) => arr[Math.floor(Math.random()*arr.length)];

  const SHOUT_LINES = [
    "🔥 焼きの匂いを撒いた！タコ民の足が向く…！",
    "屋台前がざわついてきた…！いまなら釣れる！",
    "タコ民ホイホイ発動！……寄ってくる、寄ってくる！",
    "《客引き》発動！棚に視線が刺さってる…！",
    "焼きたてオーラ放出！“買う気の気配”が増えた！",
    "エンカウント率UP！……誰かが近づいている。",
    "匂いレベルMAX！財布が震える音がする…",
    "行列の芽が出た！このまま育て…！",
    "屋台パワー充填完了。あとは客が焼かれるだけ。",
    "……匂いが風に乗った。焼かれに来る気配。",
    "客寄せ成功！タコ民レーダー点滅中！",
    "棚の前だけ空気が違う…いま来る。"
  ];
  let lastShoutLine = "";
  function pickShoutLine(){
    if(SHOUT_LINES.length === 0) return "呼び込み！";
    if(SHOUT_LINES.length === 1) return SHOUT_LINES[0];
    let s = pick(SHOUT_LINES);
    if(s === lastShoutLine) s = pick(SHOUT_LINES);
    lastShoutLine = s;
    return s;
  }

  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function safeJSON(raw, fallback){ try{ return JSON.parse(raw);}catch(e){ return fallback; } }
  function lsGet(key, fallback){
    const raw = localStorage.getItem(key);
    if(raw==null) return fallback;
    return safeJSON(raw, fallback);
  }
  function lsSet(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

  function escapeHTML(s){
    return String(s||"").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  function triggerSaleFlash(){
    if(!saleFlash) return;
    saleFlash.classList.remove("show");
    void saleFlash.offsetWidth;
    saleFlash.classList.add("show");
  }

  function toast(t, s, type){
    if(!toastBox || !toastTitle || !toastSub) return;
    toastTitle.textContent = t;
    toastSub.textContent = s || "";
    toastBox.classList.remove("toast--sale");
    if(type === "sale"){
      toastBox.classList.add("toast--sale");
      triggerSaleFlash();
    }
    toastBox.classList.add("show");
    clearTimeout(toastBox.__t);
    toastBox.__t = setTimeout(()=>{
      toastBox.classList.remove("show");
      toastBox.classList.remove("toast--sale");
    }, (type==="sale" ? 4200 : 3000));
  }

  function pushLog(title, msg, meta){
    const log = lsGet(LS.log, { ver:1, items:[] });
    log.items = Array.isArray(log.items) ? log.items : [];
    log.items.unshift({ at: now(), title, msg, meta: meta || "" });
    log.items = log.items.slice(0, 60);
    lsSet(LS.log, log);
    renderLog();
  }

  function renderLog(){
    if(!logEl) return; // ✅ ログDOMが無いとき落ちない
    const log = lsGet(LS.log, { ver:1, items:[] });
    const items = Array.isArray(log.items) ? log.items : [];
    if(items.length === 0){
      logEl.innerHTML = `<div class="item"><div class="t">まだ何も起きていない</div><div class="m">棚にダブりカードを出品すると、来客が始まるよ。</div></div>`;
      return;
    }
    logEl.innerHTML = items.map(it => {
      const d = new Date(it.at);
      const hh = String(d.getHours()).padStart(2,"0");
      const mm = String(d.getMinutes()).padStart(2,"0");
      return `
        <div class="item">
          <div class="t">${hh}:${mm}｜${escapeHTML(it.title)}</div>
          <div class="m">${escapeHTML(it.msg)}</div>
          ${it.meta ? `<div class="s">${escapeHTML(it.meta)}</div>` : ""}
        </div>
      `;
    }).join("");
  }

  function isNight(){
    const h = new Date().getHours();
    return (h >= 18 || h <= 5);
  }
  function applyDayNight(){
    const night = isNight();
    if(stageBg) stageBg.src = night ? ASSETS.bgNight : ASSETS.bgDay;
    if(stageTimeTag) stageTimeTag.textContent = night ? "夜" : "昼";
  }

  const STAGE_DEFAULT = {
    ver:1,
    hasVisitor:false,
    leaving:false,
    vUrl:"",
    vName:"—",
    vMsg:"まだ誰も来ていない。",
    vType:"",
    vGoal:"",
    stayMs:0,
    targetSlot:-1,
    updatedAt:0,
    source:""
  };
  function loadStage(){
    const s = lsGet(LS.stage, STAGE_DEFAULT);
    return { ...STAGE_DEFAULT, ...s };
  }
  function saveStage(s){
    s.updatedAt = now();
    lsSet(LS.stage, s);
  }

  let stageTalkTimer=null;
  let stageSellTimer=null;
  let stageLeaveTimer=null;

  function clearStageTimers(){
    if(stageTalkTimer){ clearInterval(stageTalkTimer); stageTalkTimer=null; }
    if(stageSellTimer){ clearTimeout(stageSellTimer); stageSellTimer=null; }
    if(stageLeaveTimer){ clearTimeout(stageLeaveTimer); stageLeaveTimer=null; }
  }

  function renderStage(){
    const s = loadStage();
    if(stageName) stageName.textContent = s.vName || "—";
    if(stageMsg)  stageMsg.textContent  = s.vMsg  || "—";
    if(stageVisitor && s.vUrl) stageVisitor.src = s.vUrl;

    if(stageVisitor){
      if(s.hasVisitor && s.vUrl && !s.leaving){
        stageVisitor.classList.add("show");
      }else{
        stageVisitor.classList.remove("show");
      }
    }
  }

  const QUEUE_DEFAULT = {
    ver:1,
    shoutPending:false,
    shoutTargetSlot:null,
    shoutSpawnAt:0,
    normalPending:false,
    normalTargetSlot:null,
    queuedAt:0
  };
  function loadQueue(){
    const q = lsGet(LS.queue, QUEUE_DEFAULT);
    return { ...QUEUE_DEFAULT, ...q };
  }
  function saveQueue(q){ lsSet(LS.queue, q); }

  function clearNormalPending(){
    const q = loadQueue();
    q.normalPending = false;
    q.normalTargetSlot = null;
    q.queuedAt = 0;
    saveQueue(q);
  }

  function checkDueAndQueueNormal(){
    const q = loadQueue();
    if(q.normalPending) return;

    const lv = loadLevel().lv;
    const shop = loadMyShop();
    const t = ensureNextAtForActiveSlots();
    const nowMs = now();

    const activeIdx = [];
    shop.slots.forEach((s, idx)=>{
      if(s.item && canUseSlot(idx, lv)) activeIdx.push(idx);
    });
    if(activeIdx.length===0) return;

    const due = activeIdx.filter(i => Number(t.nextAtBySlot[String(i)]||0) <= nowMs);
    if(due.length===0) return;

    const targetSlot = pick(due);
    q.normalPending = true;
    q.normalTargetSlot = targetSlot;
    q.queuedAt = nowMs;
    saveQueue(q);
    pushLog("待機", `通常来客（棚${targetSlot+1}）が待機になった`, "");
  }

  function setStageEmpty(msg){
    clearStageTimers();
    const s = loadStage();
    s.hasVisitor=false;
    s.leaving=false;
    s.vUrl="";
    s.vName="—";
    s.vMsg=msg || "まだ誰も来ていない。";
    s.vType="";
    s.vGoal="";
    s.stayMs=0;
    s.targetSlot=-1;
    s.source="";
    saveStage(s);
    renderStage();
    trySpawnQueuedIfPossible();
  }

  function beginLeave(msg){
    const s = loadStage();
    if(!s.hasVisitor) return;
    s.leaving = true;
    saveStage(s);
    renderStage();
    setTimeout(()=> setStageEmpty(msg || pick(LEAVE_LINES)), 650);
  }

  function loadOcto(){
    const v = Number(localStorage.getItem(LS.octo) || 0);
    return isFinite(v) ? v : 0;
  }
  function saveOcto(v){
    localStorage.setItem(LS.octo, String(Math.max(0, Math.floor(Number(v||0)))));
  }

  const LEVEL_DEFAULT = { ver:1, lv:1, exp:0, totalVisit:0, totalSold:0, updatedAt: now() };
  function needExpFor(lv){
    const table = [0, 20, 35, 55, 80, 110, 145, 185];
    if(lv < table.length) return table[lv];
    return table[table.length-1] + (lv - (table.length-1)) * 50;
  }
  function loadLevel(){
    const v = lsGet(LS.lvl, LEVEL_DEFAULT);
    v.lv = Math.max(1, Number(v.lv||1));
    v.exp = Math.max(0, Number(v.exp||0));
    v.totalVisit = Math.max(0, Number(v.totalVisit||0));
    v.totalSold = Math.max(0, Number(v.totalSold||0));
    return v;
  }
  function saveLevel(v){ v.updatedAt = now(); lsSet(LS.lvl, v); }
  function addExp(delta){
    delta = Math.max(0, Math.floor(Number(delta||0)));
    const s = loadLevel();
    s.exp += delta;
    let leveled = false;
    while(s.exp >= needExpFor(s.lv)){
      s.exp -= needExpFor(s.lv);
      s.lv += 1;
      leveled = true;
    }
    saveLevel(s);
    return { state:s, leveled };
  }

  function loadRep(){
    const v = lsGet(LS.rep, { ver:1, rep:50 });
    v.rep = clamp(Number(v.rep ?? 50), 0, 100);
    v.rep = Math.round(v.rep);
    return v;
  }
  function saveRep(v){ v.rep = Math.round(clamp(Number(v.rep||0),0,100)); lsSet(LS.rep, v); }
  function addRep(delta){
    const s = loadRep();
    s.rep = Math.round(clamp(s.rep + Number(delta||0), 0, 100));
    saveRep(s);
    return s;
  }

  function loadFarmBook(){
    const book = lsGet(LS.farmBook, { ver:1, got:{} });
    book.got = book.got || {};
    return book;
  }

  function findGotKeyByCardId(book, cardId){
    if(!book || !book.got) return null;
    const id = String(cardId||"");
    if(book.got[id]) return id;
    for(const k of Object.keys(book.got)){
      const c = book.got[k];
      const cid = String(c?.id ?? k);
      if(cid === id) return k;
    }
    return null;
  }

  function decrementBookCountById(cardId){
    const book = loadFarmBook();
    const key = findGotKeyByCardId(book, cardId);
    if(!key) return false;
    const c = book.got[key];
    const cnt = Math.max(0, Number(c?.count||0));
    if(cnt <= 0) return false;
    c.count = cnt - 1;
    book.got[key] = c;
    lsSet(LS.farmBook, book);
    return true;
  }

  function incrementBookCountById(cardId, cardSnapshot){
    const book = loadFarmBook();
    const key = findGotKeyByCardId(book, cardId) || String(cardId||"");
    const exist = book.got[key] || (cardSnapshot ? {...cardSnapshot} : { id: cardId, name: `カード ${cardId}` });
    const cnt = Math.max(0, Number(exist.count||0));
    exist.count = cnt + 1;

    if(cardSnapshot){
      if(!exist.id) exist.id = cardSnapshot.id || cardId;
      if(!exist.name && cardSnapshot.name) exist.name = cardSnapshot.name;
      if(!exist.img  && cardSnapshot.img)  exist.img  = cardSnapshot.img;
      if(!exist.rarity && cardSnapshot.rarity) exist.rarity = cardSnapshot.rarity;
    }
    book.got[key] = exist;
    lsSet(LS.farmBook, book);
    return true;
  }

  function listOwnedCardsFromBook(){
    const book = loadFarmBook();
    const got = book.got || {};
    const arr = Object.keys(got).map(k => {
      const c = got[k] || {};
      const count = Math.max(0, Number(c.count||0));
      const id = String(c.id || k);
      return {
        id,
        name: String(c.name || c.title || c.label || `カード ${id}`),
        img: c.img || c.image || c.url || c.src || "",
        rarity: String(c.rarity || c.rare || c.rank || ""),
        count,
        raw: c,
        _key: k
      };
    }).filter(x => x.count > 0);

    arr.sort((a,b)=> (b.count-a.count) || a.name.localeCompare(b.name, "ja"));
    return arr;
  }

  const SHOP_DEFAULT = {
    ver:1,
    slots: [
      { item:null, priceTier:"普通", createdAt:0 },
      { item:null, priceTier:"普通", createdAt:0 },
      { item:null, priceTier:"普通", createdAt:0 },
      { item:null, priceTier:"普通", createdAt:0 },
      { item:null, priceTier:"普通", createdAt:0 },
    ]
  };
  function loadMyShop(){
    const s = lsGet(LS.myshop, SHOP_DEFAULT);
    if(!Array.isArray(s.slots)) s.slots = SHOP_DEFAULT.slots.map(x=>({...x}));
    while(s.slots.length < 5) s.slots.push({ item:null, priceTier:"普通", createdAt:0 });
    s.slots = s.slots.slice(0,5).map(x => ({
      item: x.item || null,
      priceTier: x.priceTier || "普通",
      createdAt: Number(x.createdAt||0),
    }));
    return s;
  }
  function saveMyShop(s){ lsSet(LS.myshop, s); }

  function loadTick(){
    const t = lsGet(LS.tick, { ver:1, nextAtBySlot:{} });
    t.nextAtBySlot = t.nextAtBySlot || {};
    return t;
  }
  function saveTick(t){ lsSet(LS.tick, t); }

  function nextVisitDelayMs(){
    return (180 + Math.floor(Math.random()*121)) * 1000;
  }
  const SHELF_UNLOCK = [1,1,2,3,4];
  function canUseSlot(idx, lv){ return lv >= (SHELF_UNLOCK[idx] || 99); }

  function ensureNextAtForActiveSlots(){
    const shop = loadMyShop();
    const lv = loadLevel().lv;
    const t = loadTick();
    const n = now();

    shop.slots.forEach((slot, idx)=>{
      const active = !!slot.item && canUseSlot(idx, lv);
      const key = String(idx);
      if(!active){
        delete t.nextAtBySlot[key];
        return;
      }
      const cur = Number(t.nextAtBySlot[key]||0);
      if(!cur || cur < n - 60*1000){
        t.nextAtBySlot[key] = n + nextVisitDelayMs();
      }
    });

    saveTick(t);
    return t;
  }

  function updateNextTag(){
    if(!stageNextTag) return;
    const t = loadTick();
    const nowMs = now();
    const list = Object.values(t.nextAtBySlot || {}).map(v=>Number(v||0)).filter(v=>v>0);
    if(list.length === 0){
      stageNextTag.textContent = "次：—";
      return;
    }
    const nextAt = Math.min(...list);
    const sec = Math.max(0, Math.ceil((nextAt - nowMs)/1000));
    stageNextTag.textContent = `次：${sec}s`;
  }

  function loadShout(){ return lsGet(LS.shout, { ver:1, nextOkAt:0 }); }
  function saveShout(s){ lsSet(LS.shout, s); }

  function updateShoutUI(){
    if(!shoutBtn || !shoutCdEl) return;
    const cd = loadShout();
    const n = now();
    const remainMs = Math.max(0, Number(cd.nextOkAt||0) - n);
    const remain = Math.ceil(remainMs/1000);

    shoutBtn.textContent = "呼び込み";
    if(remain > 0){
      shoutBtn.disabled = true;
      shoutCdEl.textContent = `CD: ${remain}s`;
    }else{
      shoutBtn.disabled = false;
      shoutCdEl.textContent = "CD: OK";
    }
  }

  function basePriceFor(card){
    const p = Number(card?.raw?.price ?? card?.raw?.basePrice ?? card?.price ?? 0);
    if(isFinite(p) && p > 0) return Math.floor(p);

    const r = String(card?.rarity || "").toUpperCase();
    const map = { "N":500, "R":800, "SR":2000, "UR":5000, "LR":10000 };
    for(const k of Object.keys(map)){
      if(r === k || r.includes(k)) return map[k];
    }
    return 500;
  }
  function tierMult(tier){
    if(tier === "安い") return 0.80;
    if(tier === "高い") return 1.30;
    return 1.00;
  }
  function repFactor(rep){
    return 0.80 + (rep/100)*0.40;
  }

  const CUSTOMER_TYPES = [
    { id:"impulse",  name:"即決タコ民",       repDeltaOnBuy:+1, baseBuy:0.42 },
    { id:"picky",    name:"こだわりタコ民",   repDeltaOnBuy:+1, baseBuy:0.45 },
    { id:"king",     name:"王様タコ民",       repDeltaOnBuy:+3, baseBuy:0.55 },
    { id:"flipper",  name:"転売タコ民",       repDeltaOnBuy:-4, baseBuy:0.44 },
    { id:"careful",  name:"慎重タコ民",       repDeltaOnBuy:+1, baseBuy:0.38 },
    { id:"looker",   name:"冷やかしタコ民",   repDeltaOnBuy:-1, baseBuy:0.22 },

    { id:"rich",     name:"札束タコ民",        repDeltaOnBuy:+2, baseBuy:0.50 },
    { id:"climber",  name:"踏破タコ民",        repDeltaOnBuy:+1, baseBuy:0.40 },
    { id:"guide",    name:"ナビタコ民",        repDeltaOnBuy: 0, baseBuy:0.30 },
    { id:"relax",    name:"ほぐしタコ民",      repDeltaOnBuy:+1, baseBuy:0.36 },
    { id:"artisan",  name:"返し職人タコ民",    repDeltaOnBuy:+2, baseBuy:0.46 },
    { id:"diet",     name:"ゼロ理論タコ民",    repDeltaOnBuy:+1, baseBuy:0.48 },
    { id:"overflow", name:"枠外タコ民",        repDeltaOnBuy: 0, baseBuy:0.33 },
    { id:"collector",name:"未開封保護タコ民",  repDeltaOnBuy:+1, baseBuy:0.41 },
    { id:"shadow",   name:"裏棚タコ民",        repDeltaOnBuy:-2, baseBuy:0.35 },
    { id:"ramen",    name:"替え玉タコ民",      repDeltaOnBuy:+1, baseBuy:0.44 },
    { id:"streamer", name:"投げ銭タコ民",      repDeltaOnBuy:+2, baseBuy:0.39 },
    { id:"gourmet",  name:"舌判定タコ民",      repDeltaOnBuy:+2, baseBuy:0.37 },
    { id:"opener",   name:"即バリタコ民",      repDeltaOnBuy:+1, baseBuy:0.52 },
    { id:"party",    name:"宴タコ民",          repDeltaOnBuy:-1, baseBuy:0.47 },
    { id:"pilgrim",  name:"覚悟タコ民",        repDeltaOnBuy:+3, baseBuy:0.58 }
  ];

  function chooseCustomer(rep){
    const night = isNight();
    const weights = CUSTOMER_TYPES.map(t=>{
      if(t.id==="king")     return rep>=55 ? 7 : 3;
      if(t.id==="flipper")  return rep>=70 ? 4 : 7;
      if(t.id==="looker")   return night ? 10 : 14;
      if(t.id==="impulse")  return rep<40 ? 18 : 22;
      if(t.id==="careful")  return 16;
      if(t.id==="picky")    return rep>=60 ? 24 : 20;
      if(t.id==="rich")     return rep>=60 ? 10 : 6;
      if(t.id==="climber")  return night ? 6 : 9;
      if(t.id==="guide")    return 8;
      if(t.id==="relax")    return night ? 10 : 7;
      if(t.id==="artisan")  return rep>=55 ? 10 : 7;
      if(t.id==="diet")     return 9;
      if(t.id==="overflow") return 7;
      if(t.id==="collector")return rep>=50 ? 10 : 8;
      if(t.id==="shadow")   return night ? 11 : 6;
      if(t.id==="ramen")    return 9;
      if(t.id==="streamer") return rep>=45 ? 9 : 6;
      if(t.id==="gourmet")  return rep>=65 ? 10 : 6;
      if(t.id==="opener")   return 10;
      if(t.id==="party")    return night ? 10 : 6;
      if(t.id==="pilgrim")  return rep>=45 ? 8 : 5;
      return 8;
    });

    if(rep>=70){
      ["picky","gourmet","artisan","king","pilgrim"].forEach(id=>{
        const idx = CUSTOMER_TYPES.findIndex(x=>x.id===id);
        if(idx>=0) weights[idx] += 6;
      });
    }

    const total = weights.reduce((a,b)=>a+b,0) || 1;
    let r = Math.random() * total;
    for(let i=0;i<CUSTOMER_TYPES.length;i++){
      r -= weights[i];
      if(r <= 0) return CUSTOMER_TYPES[i];
    }
    return CUSTOMER_TYPES[0];
  }

  function pickVisitorAsset(customerId){
    const v = ASSETS.visitors.find(x=>x.type===customerId);
    return v || pick(ASSETS.visitors);
  }

  function chooseGoal(customerId){
    if(customerId==="king") return "rare";
    if(customerId==="flipper") return "cheap";
    if(customerId==="rich") return (Math.random()<0.55 ? "ur" : "rare");
    if(customerId==="collector") return "rare";
    if(customerId==="gourmet") return "rare";
    if(customerId==="opener") return "any";
    if(customerId==="pilgrim") return "ur";
    return pick(GOALS).id;
  }

  function countListedById(){
    const shop = loadMyShop();
    const map = {};
    for(const s of shop.slots){
      const id = s?.item?.id;
      if(!id) continue;
      map[id] = (map[id]||0) + 1;
    }
    return map;
  }

  function listPickableDuplicateCards(){
    const owned = listOwnedCardsFromBook();
    const listedMap = countListedById();

    const pickable = [];
    for(const c of owned){
      const listed = Number(listedMap[c.id]||0);
      const spare = (Number(c.count||0) - 1 - listed);
      if(spare >= 1){
        pickable.push({
          id: c.id,
          name: c.name,
          img: c.img,
          rarity: c.rarity,
          spare,
          count: c.count,
          raw: c.raw
        });
      }
    }
    pickable.sort((a,b)=> (b.spare-a.spare) || a.name.localeCompare(b.name,"ja"));
    return pickable;
  }

  function renderShelves(){
    if(!shelvesEl) return;
    const shop = loadMyShop();
    const lv = loadLevel().lv;

    shelvesEl.innerHTML = "";

    shop.slots.forEach((slot, idx)=>{
      const locked = !canUseSlot(idx, lv);
      const wrap = document.createElement("div");
      wrap.className = "shelf" + (locked ? " locked" : "");

      const top = document.createElement("div");
      top.className = "shelf-top";
      top.innerHTML = `
        <div>
          <div class="shelf-name">棚${idx+1}</div>
          <div class="shelf-tag">解放：Lv${SHELF_UNLOCK[idx] || "?"}</div>
        </div>
        <div class="shelf-tag mono">${escapeHTML(slot.priceTier || "普通")}</div>
      `;

      const body = document.createElement("div");
      body.className = "shelf-body";

      const slotEl = document.createElement("div");
      slotEl.className = "slot";
      slotEl.title = locked ? "未解放" : "タップで出品/変更";

      if(slot.item && slot.item.img){
        slotEl.innerHTML = `
          <div class="tier">${escapeHTML(slot.priceTier||"普通")}</div>
          <img alt="" src="${escapeHTML(slot.item.img)}">
        `;
      }else{
        slotEl.innerHTML = `<div class="ph">空き<br>（タップで出品）</div>`;
      }

      on(slotEl, "click", ()=>{
        if(locked){
          toast("未解放", `この棚は Lv${SHELF_UNLOCK[idx]} で解放`, "");
          return;
        }
        openPickModal(idx);
      });

      const info = document.createElement("div");
      info.className = "shelf-info";

      const name = slot.item ? (slot.item.name || slot.item.id) : "（空）";
      const rar  = slot.item ? (slot.item.rarity || "-") : "-";
      const base = slot.item ? basePriceFor(slot.item) : 0;
      const rep = loadRep().rep;
      const price = slot.item ? Math.max(1, Math.floor(base * tierMult(slot.priceTier) * repFactor(rep))) : 0;

      info.innerHTML = `
        <div class="line"><b>${escapeHTML(name)}</b></div>
        <div class="line">レア：<b>${escapeHTML(rar)}</b></div>
        <div class="line">目安価格：<b>${slot.item ? fmt(price) : "-"}</b></div>
        <div class="shelf-actions"></div>
      `;

      const actions = info.querySelector(".shelf-actions");

      const tierBtn = document.createElement("button");
      tierBtn.className = "btn mini";
      tierBtn.textContent = "値段：切替";
      tierBtn.disabled = locked;
      on(tierBtn, "click", ()=>{
        const s = loadMyShop();
        const cur = s.slots[idx].priceTier || "普通";
        const next = (cur==="普通") ? "安い" : (cur==="安い") ? "高い" : "普通";
        s.slots[idx].priceTier = next;
        saveMyShop(s);
        renderAll();
      });

      const removeBtn = document.createElement("button");
      removeBtn.className = "btn mini ghost";
      removeBtn.textContent = "取り下げ";
      removeBtn.disabled = locked || !slot.item;
      on(removeBtn, "click", ()=>{
        const s = loadMyShop();
        const it = s.slots[idx].item;
        if(!it) return;
        s.slots[idx].item = null;
        s.slots[idx].createdAt = 0;
        saveMyShop(s);

        incrementBookCountById(it.id, it.raw || it);
        pushLog("取り下げ", `${it.name||it.id} を棚${idx+1}から戻した`, it.id);
        renderAll();
      });

      actions.appendChild(tierBtn);
      actions.appendChild(removeBtn);

      body.appendChild(slotEl);
      body.appendChild(info);

      wrap.appendChild(top);
      wrap.appendChild(body);
      shelvesEl.appendChild(wrap);
    });

    ensureNextAtForActiveSlots();
    updateNextTag();
  }

  function renderStats(){
    if(!statsEl) return;
    const lv = loadLevel();
    const rep = loadRep().rep;
    const shop = loadMyShop();
    const listed = shop.slots.filter(s=>!!s.item).length;

    statsEl.innerHTML = `
      <div class="stat"><div class="k">オクト</div><div class="v"><span class="good">${fmt(loadOcto())}</span><small>OCTO</small></div></div>
      <div class="stat"><div class="k">レベル</div><div class="v">${lv.lv}<small>EXP ${fmt(lv.exp)}/${fmt(needExpFor(lv.lv))}</small></div></div>
      <div class="stat"><div class="k">評判</div><div class="v"><span class="${rep>=60?'good':rep>=40?'warn':'bad'}">${rep}</span><small>/100</small></div></div>
      <div class="stat"><div class="k">出品</div><div class="v">${listed}<small>/5</small></div></div>
    `;
  }

  function lockBodyScroll(){ document.body.classList.add("noscroll"); }
  function unlockBodyScroll(){ document.body.classList.remove("noscroll"); }

  let pickTargetIdx = -1;

  function openPickModal(slotIdx){
    pickTargetIdx = slotIdx;

    const lv = loadLevel().lv;
    if(!canUseSlot(slotIdx, lv)){
      toast("未解放", `棚${slotIdx+1}はLv${SHELF_UNLOCK[slotIdx]}で解放`, "");
      return;
    }

    const shop = loadMyShop();
    const current = shop.slots[slotIdx]?.item;

    if(pickTitleEl) pickTitleEl.textContent = `棚${slotIdx+1} に出品するカード`;
    if(pickHintEl) pickHintEl.textContent = current
      ? `現在：${current.name||current.id}（変更できます）`
      : "ダブり（図鑑に1枚残しても余る分）から選べます。";

    renderPickCards();

    if(pickModal){
      pickModal.classList.add("show");
      pickModal.setAttribute("aria-hidden","false");
    }
    lockBodyScroll();
  }

  function closePickModal(){
    if(pickModal){
      pickModal.classList.remove("show");
      pickModal.setAttribute("aria-hidden","true");
    }
    if(pickCardsEl) pickCardsEl.innerHTML = "";
    if(pickEmptyEl) pickEmptyEl.style.display = "none";
    pickTargetIdx = -1;
    unlockBodyScroll();
  }

  function renderPickCards(){
    const list = listPickableDuplicateCards();
    if(!pickCardsEl || !pickEmptyEl) return;

    pickCardsEl.innerHTML = "";
    if(list.length === 0){
      pickEmptyEl.style.display = "block";
      return;
    }
    pickEmptyEl.style.display = "none";

    const frag = document.createDocumentFragment();

    for(const c of list){
      const item = document.createElement("div");
      item.className = "citem";
      item.setAttribute("role","button");
      item.setAttribute("tabindex","0");

      const imgWrap = document.createElement("div");
      imgWrap.className = "cimg";

      if(c.img){
        imgWrap.innerHTML = `
          <img alt="${escapeHTML(c.name||c.id)}" loading="lazy" decoding="async" src="${escapeHTML(c.img)}">
          <div class="cnt">×${escapeHTML(c.spare)}</div>
        `;
      }else{
        imgWrap.innerHTML = `<div class="ph">画像なし</div><div class="cnt">×${escapeHTML(c.spare)}</div>`;
      }

      const meta = document.createElement("div");
      meta.className = "cmeta";
      meta.innerHTML = `
        <div class="cname">${escapeHTML(c.name||"(no name)")}</div>
        <div class="csub">
          <div class="tagmini"><span>#${escapeHTML(c.id)}</span></div>
          <div class="tagmini"><b>${escapeHTML(c.rarity||"-")}</b></div>
        </div>
      `;

      item.appendChild(imgWrap);
      item.appendChild(meta);

      const onSelect = ()=> selectCardForSlot(pickTargetIdx, c);

      on(item, "click", onSelect);
      on(item, "keydown", (e)=>{
        if(e.key==="Enter" || e.key===" "){
          e.preventDefault();
          onSelect();
        }
      });

      frag.appendChild(item);
    }

    pickCardsEl.appendChild(frag);
  }

  function selectCardForSlot(slotIdx, pickedCard){
    const shop = loadMyShop();
    const slot = shop.slots[slotIdx];
    if(!slot) return;

    if(slot.item){
      incrementBookCountById(slot.item.id, slot.item.raw || slot.item);
    }

    const ok = decrementBookCountById(pickedCard.id);
    if(!ok){
      toast("出品できない", "図鑑側の数が足りません（同期ずれの可能性）", "");
      renderAll();
      closePickModal();
      return;
    }

    slot.item = {
      id: pickedCard.id,
      name: pickedCard.name,
      img: pickedCard.img,
      rarity: pickedCard.rarity,
      raw: pickedCard.raw
    };
    slot.createdAt = now();
    shop.slots[slotIdx] = slot;
    saveMyShop(shop);

    pushLog("出品", `${pickedCard.name||pickedCard.id} を棚${slotIdx+1}に置いた`, pickedCard.id);
    toast("出品OK", `棚${slotIdx+1}に ${pickedCard.name||pickedCard.id}`, "");

    ensureNextAtForActiveSlots();
    renderAll();
    closePickModal();
  }

  function saleProcess(){
    const st = loadStage();
    if(!st.hasVisitor || st.leaving) return;

    const shop = loadMyShop();
    const slotIdx = st.targetSlot;
    const slot = shop.slots[slotIdx];
    if(!slot || !slot.item){
      beginLeave("……目当ての棚が空だった。客は黙って帰った。");
      return;
    }

    const rep = loadRep().rep;
    const cust = CUSTOMER_TYPES.find(x=>x.id===st.vType) || CUSTOMER_TYPES[0];
    const base = basePriceFor(slot.item);
    const price = Math.max(1, Math.floor(base * tierMult(slot.priceTier) * repFactor(rep)));

    const stayMs = Number(st.stayMs||0);
    const stayFactor = clamp(stayMs/16000, 0.6, 1.25);

    let buyP = cust.baseBuy * stayFactor;

    const rar = String(slot.item.rarity||"").toUpperCase();
    const isSR = rar.includes("SR") || rar.includes("UR") || rar.includes("LR") || rar.includes("HR") || rar.includes("XR");
    const isUR = rar.includes("UR") || rar.includes("LR") || rar.includes("HR") || rar.includes("XR");

    if(st.vGoal==="cheap"){
      buyP *= (slot.priceTier==="安い" ? 1.15 : slot.priceTier==="高い" ? 0.80 : 1.0);
    }else if(st.vGoal==="rare"){
      buyP *= (isSR ? 1.15 : 0.92);
    }else if(st.vGoal==="ur"){
      buyP *= (isUR ? 1.18 : 0.78);
    }

    buyP = clamp(buyP, 0.05, 0.92);

    const willBuy = Math.random() < buyP;
    if(!willBuy){
      beginLeave(pick(LEAVE_LINES));
      return;
    }

    saveOcto(loadOcto() + price);

    const lv = addExp(4);
    const repState = addRep(cust.repDeltaOnBuy);

    const soldItem = slot.item;
    shop.slots[slotIdx].item = null;
    shop.slots[slotIdx].createdAt = 0;
    saveMyShop(shop);

    const t = loadTick();
    t.nextAtBySlot = t.nextAtBySlot || {};
    t.nextAtBySlot[String(slotIdx)] = now() + nextVisitDelayMs();
    saveTick(t);

    pushLog("売れた！", `${soldItem.name||soldItem.id} が ${fmt(price)} OCTOで売れた`, `棚${slotIdx+1} / rep ${repState.rep}`);
    toast("🔥 売れた！！ 🔥", `${soldItem.name||soldItem.id} ／ +${fmt(price)} OCTO`, "sale");

    if(lv.leveled){
      pushLog("レベルアップ", `Lv${lv.state.lv}になった！`, "");
      toast("レベルアップ！", `Lv${lv.state.lv}`, "");
    }

    beginLeave("……満足げに帰っていった。");
    renderAll();
  }

  function scheduleStage(){
    applyDayNight();
    renderStage();
    const st = loadStage();
    if(st.hasVisitor && !st.leaving){
      clearStageTimers();
      stageTalkTimer = setInterval(()=>{
        const s2 = loadStage();
        if(!s2.hasVisitor || s2.leaving) return;
        const baseLines = VISITOR_LINES[s2.vType] || ["……"];
        const gLines = goalLines(s2.vGoal);
        s2.vMsg = (Math.random()<0.55) ? pick(baseLines) : pick(gLines);
        saveStage(s2);
        renderStage();
      }, rand(3000, 6000));

      stageSellTimer = setTimeout(()=> saleProcess(), Math.max(1000, Math.floor((st.stayMs||12000) - 1000)));
      stageLeaveTimer = setTimeout(()=> beginLeave(pick(LEAVE_LINES)), Math.max(5000, Math.floor(st.stayMs||12000)));
      return;
    }
    setStageEmpty("まだ誰も来ていない。");
  }

  let spawnLockUntil = 0;

  function spawnVisitorSoon(targetSlot, type){
    const typeLabel = (type==="shout") ? "呼び込み" : "通常";
    toast("誰かくる！", `${typeLabel}：棚${targetSlot+1} を見てる気配…`, "");

    spawnLockUntil = now() + 3500;

    setTimeout(()=>{
      const st2 = loadStage();
      if(st2.hasVisitor) return;

      const rep = loadRep().rep;
      const cust = chooseCustomer(rep);
      const asset = pickVisitorAsset(cust.id);
      const goal = chooseGoal(cust.id);

      const stayMs = rand(9000, 18000);
      const msg = pick(VISITOR_LINES[cust.id] || ["……"]);

      const s = loadStage();
      s.hasVisitor = true;
      s.leaving = false;
      s.vType = cust.id;
      s.vName = asset.name || cust.name;
      s.vUrl = asset.url || "";
      s.vGoal = goal;
      s.vMsg = msg;
      s.stayMs = stayMs;
      s.targetSlot = targetSlot;
      s.source = (type==="shout") ? "shout" : "normal";
      saveStage(s);
      renderStage();

      const lvup = addExp(1);
      if(lvup.leveled){
        pushLog("レベルアップ", `Lv${lvup.state.lv}になった！`, "");
        toast("レベルアップ！", `Lv${lvup.state.lv}`, "");
      }

      clearStageTimers();
      stageTalkTimer = setInterval(()=>{
        const s2 = loadStage();
        if(!s2.hasVisitor || s2.leaving) return;
        const baseLines = VISITOR_LINES[s2.vType] || ["……"];
        const gLines = goalLines(s2.vGoal);
        s2.vMsg = (Math.random()<0.55) ? pick(baseLines) : pick(gLines);
        saveStage(s2);
        renderStage();
      }, rand(3000, 6000));

      stageSellTimer = setTimeout(()=> saleProcess(), Math.max(1000, stayMs - 1000));
      stageLeaveTimer = setTimeout(()=> beginLeave(pick(LEAVE_LINES)), stayMs);

      if(type !== "shout"){
        const tickObj = loadTick();
        tickObj.nextAtBySlot[String(targetSlot)] = now() + nextVisitDelayMs();
        saveTick(tickObj);

        const q = loadQueue();
        if(q.normalPending && Number(q.normalTargetSlot) === Number(targetSlot)){
          clearNormalPending();
        }
      }else{
        pushLog("呼び込み来店", `棚${targetSlot+1} に呼び込み客が来た`, "");
      }

      renderAll();
    }, 3000);
  }

  function trySpawnQueuedIfPossible(){
    const st = loadStage();
    if(st.hasVisitor) return;
    const nowMs = now();
    if(nowMs < spawnLockUntil) return;

    const q = loadQueue();

    if(q.shoutPending){
      if(nowMs >= Number(q.shoutSpawnAt||0)){
        const target = Number(q.shoutTargetSlot);
        q.shoutPending = false;
        q.shoutTargetSlot = null;
        q.shoutSpawnAt = 0;
        saveQueue(q);
        spawnVisitorSoon(target, "shout");
      }
      return;
    }

    if(q.normalPending && q.normalTargetSlot != null){
      const target = Number(q.normalTargetSlot);
      spawnVisitorSoon(target, "normal");
      return;
    }
  }

  function tick(){
    updateNextTag();
    updateShoutUI();

    const st = loadStage();
    const nowMs = now();

    if(st.hasVisitor){
      checkDueAndQueueNormal();
      return;
    }

    if(nowMs < spawnLockUntil) return;

    const q = loadQueue();
    if(q.shoutPending){
      checkDueAndQueueNormal();
      if(nowMs >= Number(q.shoutSpawnAt||0)){
        const target = Number(q.shoutTargetSlot);
        q.shoutPending = false;
        q.shoutTargetSlot = null;
        q.shoutSpawnAt = 0;
        saveQueue(q);
        spawnVisitorSoon(target, "shout");
      }
      return;
    }

    if(q.normalPending && q.normalTargetSlot != null){
      spawnVisitorSoon(Number(q.normalTargetSlot), "normal");
      return;
    }

    const lv = loadLevel().lv;
    const shop = loadMyShop();
    const t = ensureNextAtForActiveSlots();

    const activeIdx = [];
    shop.slots.forEach((s, idx)=>{
      if(s.item && canUseSlot(idx, lv)) activeIdx.push(idx);
    });
    if(activeIdx.length===0) return;

    const due = activeIdx.filter(i => Number(t.nextAtBySlot[String(i)]||0) <= nowMs);
    if(due.length===0) return;

    const targetSlot = pick(due);
    spawnVisitorSoon(targetSlot, "normal");
  }

  function shout(){
    const st = loadStage();
    if(st.hasVisitor){
      toast("いまは無理", "客がいる間は呼び込みできません", "");
      return;
    }

    const cd = loadShout();
    const n = now();
    if(Number(cd.nextOkAt||0) > n){
      const sec = Math.ceil((cd.nextOkAt - n)/1000);
      toast("まだ無理", `呼び込みは ${sec}s 後`, "");
      updateShoutUI();
      return;
    }

    const shop = loadMyShop();
    const lv = loadLevel().lv;

    const active = [];
    shop.slots.forEach((s, idx)=>{
      if(s.item && canUseSlot(idx, lv)) active.push(idx);
    });
    if(active.length===0){
      toast("呼び込み失敗", "出品中の棚がありません", "");
      return;
    }

    cd.nextOkAt = n + 60000;
    saveShout(cd);
    updateShoutUI();

    const t = ensureNextAtForActiveSlots();
    let target = active[0];
    let best = Infinity;
    for(const idx of active){
      const at = Number((t.nextAtBySlot||{})[String(idx)]||Infinity);
      if(at < best){ best = at; target = idx; }
    }

    const q = loadQueue();
    q.shoutPending = true;
    q.shoutTargetSlot = target;
    q.shoutSpawnAt = n + 3000;
    saveQueue(q);

    checkDueAndQueueNormal();

    toast("呼び込み！", `棚${target+1}｜${pickShoutLine()}`, "");
    pushLog("呼び込み", `棚${target+1} に客の気配が集まった`, "");
    renderAll();
  }

  function downloadText(filename, text){
    const blob = new Blob([text], { type:"application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 1500);
  }

  function makeBackup(){
    const keys = [
      LS.octo, LS.myshop, LS.log, LS.lvl, LS.rep, LS.tick, LS.shout, LS.stage,
      LS.farmBook,
      "tf_v1_inv",
      LS.queue
    ];

    const data = {};
    for(const k of keys){
      const raw = localStorage.getItem(k);
      if(raw == null){
        data[k] = null;
        continue;
      }
      const parsed = safeJSON(raw, null);
      data[k] = (parsed !== null) ? parsed : raw;
    }

    const d = new Date();
    const pad = (n)=> String(n).padStart(2,"0");
    const stamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const filename = `takoyaki-myshop-backup-${stamp}.json`;

    const payload = {
      exportedAt: d.toISOString(),
      note: "マイ露店のlocalStorageバックアップ（復元は復元ボタンで可能）",
      keys,
      data
    };

    downloadText(filename, JSON.stringify(payload, null, 2));
    toast("バックアップ作成", `${filename} を保存しました`, "");
    pushLog("バックアップ", "ローカルデータをJSONに書き出した", filename);
  }

  function restoreFromPayload(payload){
    if(!payload || typeof payload !== "object"){
      toast("復元失敗", "JSONの形式が不正です", "");
      return false;
    }
    const data = payload.data;
    if(!data || typeof data !== "object"){
      toast("復元失敗", "data が見つかりません", "");
      return false;
    }

    const keys = Array.isArray(payload.keys) ? payload.keys : Object.keys(data);

    for(const k of keys){
      if(!(k in data)) continue;
      const v = data[k];

      if(v === null || v === undefined){
        localStorage.removeItem(k);
        continue;
      }

      if(typeof v === "string"){
        localStorage.setItem(k, v);
      }else{
        localStorage.setItem(k, JSON.stringify(v));
      }
    }
    return true;
  }

  function openRestoreDialog(){
    if(!restoreFile) return;
    restoreFile.value = "";
    restoreFile.click();
  }

  on(restoreFile, "change", async ()=>{
    const file = restoreFile.files && restoreFile.files[0];
    if(!file) return;

    try{
      const text = await file.text();
      const payload = JSON.parse(text);

      if(!confirm("復元しますか？（今のデータは上書きされます）")) return;

      const ok = restoreFromPayload(payload);
      if(ok){
        pushLog("復元", "バックアップから復元した", file.name);
        toast("復元OK", "ページを再読み込みします", "");
        setTimeout(()=> location.reload(), 650);
      }
    }catch(e){
      toast("復元失敗", "JSONを読み込めませんでした", "");
    }
  });

  on(fixBtn, "click", ()=>{
    const STAGE_DEFAULT2 = {
      ver:1,
      hasVisitor:false,
      leaving:false,
      vUrl:"",
      vName:"—",
      vMsg:"まだ誰も来ていない。",
      vType:"",
      vGoal:"",
      stayMs:0,
      targetSlot:-1,
      updatedAt: Date.now(),
      source:""
    };

    localStorage.setItem(LS.stage, JSON.stringify(STAGE_DEFAULT2));
    localStorage.removeItem(LS.tick);
    localStorage.setItem(LS.queue, JSON.stringify(QUEUE_DEFAULT));

    alert("客状態だけ修理しました（呼び込みCD・レベルは保持）");
    location.reload();
  });

  function renderAll(){
    renderStats();
    renderShelves();
    renderLog();
    applyDayNight();
    updateNextTag();
    updateShoutUI();
    renderStage();
  }

  function openHelp(){
    if(!helpModal) return;
    helpModal.classList.add("show");
    helpModal.setAttribute("aria-hidden","false");
    lockBodyScroll();
  }
  function closeHelp(){
    if(!helpModal) return;
    helpModal.classList.remove("show");
    helpModal.setAttribute("aria-hidden","true");
    unlockBodyScroll();
  }

  on(pickCloseBtn, "click", closePickModal);
  on(pickCancelBtn, "click", closePickModal);
  on(pickModal, "click", (e)=>{ if(e.target===pickModal) closePickModal(); });

  on(helpBtn, "click", openHelp);
  on(helpClose, "click", closeHelp);
  on(helpOk, "click", closeHelp);
  on(helpModal, "click", (e)=>{ if(e.target===helpModal) closeHelp(); });

  on(backBtn, "click", ()=>{
    if(history.length > 1) history.back();
    else location.href = "./index.html";
  });

  on(shoutBtn, "click", shout);

  on(backupBtn, "click", makeBackup);
  on(restoreBtn, "click", openRestoreDialog);

  /* 起動 */
  applyDayNight();
  renderAll();
  scheduleStage();

  trySpawnQueuedIfPossible();
  setInterval(tick, 1000);

})();

