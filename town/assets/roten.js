/* =========================================================
   roten.js（たこぴのお店 / 新GAS seed_token方式・安定版）
   ✅ 資材在庫: tf_v1_inv（seed/water/fert）= ファームと共通
   ✅ オクト: roten_v1_octo
   ✅ みくじ/公開記念：既存維持
   ✅ シリアル：新GAS方式（seed_token）
      - redeem -> seed_token（UUID）を受け取り localStorage(tf_v1_seedtokens) に保存
      - roten では「コラボ別のタネ」所持数として seedtokens の “未使用(ISSUED)” 本数を表示 ✅
      - ★沼回避：inv.seed[各seedId] を “未使用tokens数で自動同期（表示/互換）” ✅
        → takofarm.js が inv側を見てても反映される（コラボ別に反映）

   ✅ 今回の要望（反映）
      - コラボ期間がタネごとに違う（表示）
        * ぐらたん：2026/03/20〜2026/04/19
        * GHOST ：2026/04/20〜2026/05/19
        * アニバーサリー：2026/03/10〜2026/05/31
      - 非売品（シリアル限定）の右横に「BOOTH」小ボタン（赤背景・タグと同サイズ）
        * 期間外は「BOOTH終了」にしてタップ不可（誤タップ防止）
      - 説明の「購入不可」の横にコラボ期間を目立つ色で表示
      - 「BOOTHでカード購入→シリアルがもらえる」案内を表示（親切）
      - ✅スマホ崩れ修正：
        * 右側テキストが潰れて切れる問題を解消（min-width:0 / wrap）
        * BOOTHボタンが消える問題を強制表示（overflow回避）
        * さらにスマホで押しやすいBOOTH CTA（大ボタン）も表示
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

    // ✅ seed_token保管（redeemで増える）
    seedTokens: "tf_v1_seedtokens",

    // 端末識別（必要なら将来使う）
    deviceId: "tf_v1_device_id",
  };

  // ✅ 新GAS（あなたの確定版）
  const GAS_URL = "https://script.google.com/macros/s/AKfycbwFhJjpj0IidOYf95dyANLFYnIYTuPFFaAKOVxmfGmWJW-9AsCGQBsW90uEitpIpcdm/exec";
  const GAS_KEY = "takopi-serial-2026";

  // =========================================================
  // ✅✅✅ コラボが複数ある前提：collabIdごとにタネを分ける
  // - collabId（GASが返すID）と、inv側のseedIdを対応させる
  // - ここに追記するだけで露店表示 & 同期が増える
  // - ✅ boothUrl / periodStart / periodEnd を追加（表示と期限判定に使用）
  // =========================================================
  const BOOTH_SHOP_URL = "https://takoyaki-toreka.booth.pm/";

  const COLLAB_SEEDS = [
    {
      collabId: "col_gratan_2026",
      seedId:   "seed_col_gratan_2026",
      name:     "【コラボ】ぐらたんのタネ",
      img:      "https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/tane/col1.png",
      hidden:   false,

      boothUrl:"https://takoyaki-toreka.booth.pm/item_lists/m7YToKe5",
      // ✅ ぐらたん：3/20〜4/19
      periodStart: "2026-03-20",
      periodEnd:   "2026-04-19",
    },
    {
      collabId: "col_ghost_2026",
      seedId:   "seed_col_ghost_2026",
      name:     "【コラボ】GHOSTのタネ",
      img:      "https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/tane/col2.png",
      hidden:   false,

      boothUrl:"https://takoyaki-toreka.booth.pm/item_lists/m7YToKe5",
      // ✅ GHOST：4/20〜5/19
      periodStart: "2026-04-20",
      periodEnd:   "2026-05-19",
    },

    // ✅ HOLD：今は表示しない（＆同期待機＝0固定）
    {
      collabId: "col_hold_2026",
      seedId:   "seed_col_hold_2026",
      name:     "【コラボ】HOLDのタネ",
      img:      "https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/tane/hold.png",
      hidden:   true,

      boothUrl: "",
      periodStart: "",
      periodEnd:   "",
    },

    {
      collabId: "ann_2026",
      seedId:   "seed_ann_2026",
      name:     "【SP】アニバーサリーのタネ",
      img:      "https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/tane/anv1.png",
      hidden:   false,

      boothUrl:"https://takoyaki-toreka.booth.pm/item_lists/m7YToKe5",
      // ✅ アニバーサリー：3/10〜5/31
      periodStart: "2026-03-10",
      periodEnd:   "2026-05-31",
    },
  ];

  const COLLAB_BY_ID = Object.fromEntries(COLLAB_SEEDS.map(x => [String(x.collabId), x]));

  // ✅ 今は止めたいコラボがあるならここでブロック（＝同期0固定 + token内訳にも出さない）
  function isBlockedCollabId(collabId){
    return String(collabId) === "col_hold_2026"; // ✅ HOLDは今は止める
  }

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
  function addOcto(delta){
    setOcto(getOcto() + Number(delta || 0));
  }

  function invDefault(){
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

  function pushLog(msg){
    const a = loadJSON(LS.log, []);
    a.unshift({ t: Date.now(), msg });
    saveJSON(LS.log, a.slice(0, 80));
  }

  // ✅ seed_token保管（redeemで増える）
  function seedTokensDefault(){
    return { ver:1, tokens:[] }; // tokens: [{token, collabId, issuedAt, status?}]
  }
  function loadSeedTokens(){
    const st = loadJSON(LS.seedTokens, seedTokensDefault());
    if(!st || typeof st !== "object") return seedTokensDefault();
    st.tokens = Array.isArray(st.tokens) ? st.tokens : [];
    return st;
  }
  function saveSeedTokens(st){
    saveJSON(LS.seedTokens, st);
  }

  // =========================================================
  // ✅ コラボ期間判定
  // - start/end は YYYY-MM-DD
  // - end は「当日いっぱい」まで有効（23:59:59.999）
  // =========================================================
  function parseYMDToLocalDate(ymd){
    const m = String(ymd||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m) return null;
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    return new Date(y, mo-1, d, 0,0,0,0);
  }
  function endOfDay(dt){
    if(!dt) return null;
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 23,59,59,999);
  }
  function fmtYMDSlash(ymd){
    const m = String(ymd||"").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!m) return String(ymd||"");
    return `${m[1]}/${m[2]}/${m[3]}`;
  }
  function getCollabWindow(collabId){
    const def = COLLAB_BY_ID[String(collabId||"")];
    if(!def) return { ok:false, active:false, label:"", start:null, end:null };
    const s = parseYMDToLocalDate(def.periodStart);
    const e = endOfDay(parseYMDToLocalDate(def.periodEnd));
    const label = (def.periodStart && def.periodEnd) ? `${fmtYMDSlash(def.periodStart)}〜${fmtYMDSlash(def.periodEnd)}` : "";
    if(!s || !e) return { ok:true, active:true, label, start:s, end:e }; // 期間未設定は常時扱い
    const now = new Date();
    const active = (now >= s && now <= e);
    return { ok:true, active, label, start:s, end:e };
  }

  // =========================================================
  // ✅✅✅ 所持数＝未使用(ISSUED)だけ数える
  // - takofarm.js が token.status を "PLANTED" / "HARVESTED" にする前提
  // - statusが無い古いtokenは "ISSUED" 扱いにして互換維持
  // =========================================================
  function isIssuedToken(t){
    const s = String(t?.status || "").toUpperCase();
    return !s || s === "ISSUED";
  }

  function countSeedTokensByCollab(){
    const st = loadSeedTokens();
    const map = {};
    for(const t of st.tokens){
      if(!isIssuedToken(t)) continue;
      const c = String(t?.collabId || "unknown");
      if(isBlockedCollabId(c)) continue;
      map[c] = (map[c]||0) + 1;
    }
    return map; // { collabId: count }
  }

  // ✅ ★沼回避：inv.seed[各コラボseedId] を “未使用token本数”で同期（表示/互換）
  function syncCollabSeedsToInv(){
    const inv = loadInv();
    inv.seed = inv.seed || {};

    const by = countSeedTokensByCollab();

    // ✅ コラボ定義している分は必ずキー生やし＆上書き同期（ズレ固定化防止）
    for(const def of COLLAB_SEEDS){
      const cid = String(def.collabId);
      const sid = String(def.seedId);

      if(isBlockedCollabId(cid)){
        inv.seed[sid] = 0;     // ✅ 今は0固定
        continue;
      }
      inv.seed[sid] = Number(by[cid] || 0);
    }

    saveInv(inv);
  }

  // ---------- MASTER DATA ----------
  const SEEDS_BASE = [
    { id:"seed_random",  name:"なに出るタネ", desc:"何が育つかは完全ランダム。\n店主も知らない。", img:"https://ul.h3z.jp/gnyvP580.png", fx:"完全ランダム" },
    { id:"seed_shop",    name:"店頭タネ", desc:"店で生まれたタネ。\n店頭ナンバーを宿している。", img:"https://ul.h3z.jp/IjvuhWoY.png", fx:"店頭の気配" },
    { id:"seed_line",    name:"回線タネ", desc:"画面の向こうから届いたタネ。\nクリックすると芽が出る。", img:"https://ul.h3z.jp/AonxB5x7.png", fx:"回線由来" },
    { id:"seed_special", name:"たこぴのタネ", desc:"今はまだ何も起きない。\nそのうち何か起きる。", img:"https://ul.h3z.jp/29OsEvjf.png", fx:"待て" },
    { id:"seed_bussasari",      name:"ブッ刺さりタネ", desc:"心に刺さる。\n財布にも刺さる。", img:"https://ul.h3z.jp/MjWkTaU3.png", fx:"刺さり補正" },
    { id:"seed_namara_kawasar", name:"なまら買わさるタネ", desc:"気付いたら買ってる。\nレジ前の魔物。", img:"https://ul.h3z.jp/yiqHzfi0.png", fx:"買わさり圧" },
  ];

  // ✅ コラボ別タネ（購入不可 / シリアル限定）
  // ✅ HOLDは「hidden:true & blocked」なので表示から外す
  // ✅ boothUrl / periodLabel / collabId を持たせる
  const SEEDS_COLLAB = COLLAB_SEEDS
    .filter(c => !c.hidden && !isBlockedCollabId(c.collabId))
    .map(c => {
      const win = getCollabWindow(c.collabId);
      return {
        id:   String(c.seedId),
        name: String(c.name),
        desc: "上のシリアル入力でタネが増える。\n畑で植えるとカードが出る。",
        img:  String(c.img),
        fx:   "限定カード確定",
        tag:  "シリアル限定",
        buyable: false,

        boothUrl: String(c.boothUrl || ""),
        period:   String(win.label || ""),
        active:   !!win.active,
        collabId: String(c.collabId || ""),
      };
    });

  const SEEDS = [
    ...SEEDS_BASE,
    ...SEEDS_COLLAB,
  ];

  const WATERS = [
    { id:"water_plain_free", name:"ただの水", desc:"無料・UR/LRなし。\n無課金の基準。", img:"https://ul.h3z.jp/13XdhuHi.png", fx:"基準（水）" },
    { id:"water_nice",       name:"なんか良さそうな水", desc:"ちょい上振れ・LRなし。\n初心者の背中押し。", img:"https://ul.h3z.jp/3z04ypEd.png", fx:"ちょい上振れ" },
    { id:"water_suspicious", name:"怪しい水", desc:"現実準拠・標準。\n実パックと同じ空気。", img:"https://ul.h3z.jp/wtCO9mec.png", fx:"標準（現実準拠）" },
    { id:"water_overdo",     name:"やりすぎな水", desc:"勝負水・現実より上。\n体感で強い。", img:"https://ul.h3z.jp/vsL9ggf6.png", fx:"勝負" },
    { id:"water_regret",     name:"押さなきゃよかった水", desc:"確定枠・狂気。\n事件製造機（SNS向け）", img:"https://ul.h3z.jp/L0nafMOp.png", fx:"事件" },
  ];

  const FERTS = [
    { id:"fert_agedama", name:"ただの揚げ玉", desc:"時短0。\n《焼きすぎたカード》率UP", img:"https://ul.h3z.jp/9p5fx53n.png", fx:"時短 0%" },
    { id:"fert_feel",    name:"気のせい肥料", desc:"早くなった気がする。\n気のせいかもしれない。", img:"https://ul.h3z.jp/XqFTb7sw.png", fx:"時短 5%" },
    { id:"fert_guts",    name:"根性論ぶち込み肥料", desc:"理由はない。\n気合いだ。", img:"https://ul.h3z.jp/bT9ZcNnS.png", fx:"時短 20%" },
    { id:"fert_skip",    name:"工程すっ飛ばし肥料", desc:"途中は、\n見なかったことにした。", img:"https://ul.h3z.jp/FqPzx12Q.png", fx:"時短 40%" },
    { id:"fert_timeno",  name:"時間を信じない肥料", desc:"最終兵器・禁忌。\n稀に《ドロドロ生焼けカード》", img:"https://ul.h3z.jp/l2njWY57.png", fx:"時短 70%" },
  ];

  const PRICE = {
    seed_random: 100,
    seed_shop: 200,
    seed_line: 200,
    seed_special: 10000,
    seed_bussasari: 50000,
    seed_namara_kawasar: 30000,

    water_plain_free: 50,
    water_nice: 100,
    water_suspicious: 300,
    water_overdo: 500,
    water_regret: 200,

    fert_agedama: 50,
    fert_feel: 100,
    fert_guts: 150,
    fert_skip: 200,
    fert_timeno: 300,
  };

  function buildGoods(){
    const goods = [];

    for(const s of SEEDS){
      const isBuyable = (s.buyable !== false) && (PRICE[s.id] != null);
      goods.push({
        kind:"seed",
        id:s.id,
        name:s.name,
        desc:s.desc,
        fx:s.fx,
        img:s.img,

        // ✅ 追加（コラボ表示用）
        boothUrl: s.boothUrl || "",
        period: s.period || "",
        collabId: s.collabId || "",
        active: (s.active !== false), // コラボ以外はtrue扱い

        price: isBuyable ? (PRICE[s.id] ?? 18) : null,
        buyable: !!isBuyable,
        tag: s.tag ? s.tag : (isBuyable ? "販売" : "シリアル限定")
      });
    }
    for(const w of WATERS){
      goods.push({ kind:"water", id:w.id, name:w.name, desc:w.desc, fx:w.fx, img:w.img, price:(PRICE[w.id] ?? 18), buyable:true, tag:"販売" });
    }
    for(const f of FERTS){
      goods.push({ kind:"fert", id:f.id, name:f.name, desc:f.desc, fx:f.fx, img:f.img, price:(PRICE[f.id] ?? 18), buyable:true, tag:"販売" });
    }
    return goods;
  }
  const GOODS = buildGoods();

  const SAY = [
    "「いらっしゃい…たこ。オクトで“未来”を買うの、すき…たこ？」",
    "「種は物語…水は運…肥料は代償…たこ。」",
    "「まとめ買い？……いいね。焼き台が“鳴く”たこ…」",
    "「買うボタンは“契約”…押した瞬間、世界が少し変わる…たこ。」"
  ];

  // =========================================================
  // ✅ modal
  // =========================================================
  function getModalEls(){
    return {
      modal: document.getElementById("modal"),
      bg:    document.getElementById("modalBg"),
      x:     document.getElementById("modalX"),
      title: document.getElementById("modalTitle"),
      body:  document.getElementById("modalBody"),
    };
  }
  function forceModalStyle(modal){
    if(!modal) return;
    modal.style.setProperty("position","fixed","important");
    modal.style.setProperty("inset","0","important");
    modal.style.setProperty("z-index","2147483646","important");
    modal.style.setProperty("display","block","important");
    modal.style.setProperty("pointer-events","auto","important");
  }
  function openModal(title, html){
    const { modal, title:ttl, body } = getModalEls();
    if(!modal || !ttl || !body){
      toastHype("⚠️ modal要素が見つからない…たこ。", {kind:"bad"});
      return;
    }
    ttl.textContent = title || "メニュー";
    body.innerHTML = html || "";
    forceModalStyle(modal);
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden","false");
    requestAnimationFrame(() => {
      forceModalStyle(modal);
      modal.classList.add("is-open");
    });
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
  function closeModal(){
    const { modal, body } = getModalEls();
    if(!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden","true");
    if(body) body.innerHTML = "";
    modal.style.removeProperty("display");
    modal.style.removeProperty("position");
    modal.style.removeProperty("inset");
    modal.style.removeProperty("z-index");
    modal.style.removeProperty("pointer-events");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }
  function wireModalClose(){
    const { bg, x } = getModalEls();
    bg?.addEventListener("click", closeModal);
    x?.addEventListener("click", closeModal);
    document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") closeModal(); });
  }

  // ---------- inventory helpers ----------
  function ownedCount(inv, kind, id){
    return Number((inv[kind]||{})[id] || 0);
  }
  function totalKind(inv, kind){
    const bucket = inv[kind] || {};
    let total = 0;
    for(const k of Object.keys(bucket)) total += Number(bucket[k] || 0);
    return total;
  }

  function ensureInvKeys(){
    const inv = loadInv();
    inv.seed  = inv.seed  || {};
    inv.water = inv.water || {};
    inv.fert  = inv.fert  || {};

    // ✅ 全商品キーをinvに生やす（表示してる分）
    for(const g of GOODS){
      if(!(g.id in inv[g.kind])){
        inv[g.kind][g.id] = 0;
      }
    }

    // ✅ 表示しない（hidden/blocked）コラボseedもinvにキーだけは生やす（ただし同期で0固定）
    for(const def of COLLAB_SEEDS){
      const sid = String(def.seedId);
      if(!(sid in inv.seed)) inv.seed[sid] = 0;
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
    // ✅ 先に同期（これが沼回避）
    syncCollabSeedsToInv();

    const inv = ensureInvKeys();
    $("#octoNow") && ($("#octoNow").textContent = String(getOcto()));

    $("#chipSeed")  && ($("#chipSeed").textContent  = String(totalKind(inv, "seed")));
    $("#chipWater") && ($("#chipWater").textContent = String(totalKind(inv, "water")));
    $("#chipFert")  && ($("#chipFert").textContent  = String(totalKind(inv, "fert")));

    $("#chipBookOwned") && ($("#chipBookOwned").textContent = String(calcBookOwned()));
    $("#chipBookDup")   && ($("#chipBookDup").textContent   = "0");

    const done = localStorage.getItem(LS.mikujiDate) === todayKey();
    const btnM = $("#btnMikuji");
    if(btnM){
      btnM.textContent = done ? "🎲 たこ焼きみくじ（本日済）" : "🎲 たこ焼きみくじ（1日1回）";
      btnM.disabled = done;
    }

    const claimed = localStorage.getItem(LS.launchGift) === "1";
    const giftBtn = $("#btnLaunchPresent");
    if(giftBtn){
      giftBtn.textContent = claimed ? "🎁 公開記念プレゼント（受取済）" : "🎁 公開記念プレゼント（1回だけ）";
      giftBtn.disabled = claimed;
    }
  }

  // =========================================================
  // ✅ toast
  // =========================================================
  function ensureToast(){
    let el = $("#toast");
    if(!el){
      el = document.createElement("div");
      el.id = "toast";
      el.setAttribute("aria-live","polite");
      document.body.appendChild(el);
    }
    return el;
  }
  function forceToastStyle(el){
    el.style.setProperty("position","fixed","important");
    el.style.setProperty("left","12px","important");
    el.style.setProperty("right","12px","important");
    el.style.setProperty("bottom","14px","important");
    el.style.setProperty("z-index","2147483647","important");
    el.style.setProperty("pointer-events","none","important");
    el.style.setProperty("padding","14px 14px","important");
    el.style.setProperty("border-radius","14px","important");
    el.style.setProperty("font-weight","900","important");
    el.style.setProperty("letter-spacing",".02em","important");
    el.style.setProperty("text-align","center","important");
    el.style.setProperty("color","#fff","important");
    el.style.setProperty("background","rgba(15,18,32,.92)","important");
    el.style.setProperty("border","1px solid rgba(255,255,255,.16)","important");
    el.style.setProperty("box-shadow","0 18px 44px rgba(0,0,0,.55)","important");
    el.style.setProperty("backdrop-filter","blur(6px)","important");
    el.style.setProperty("-webkit-backdrop-filter","blur(6px)","important");
  }
  function toastHype(text, opt={}){
    const el = ensureToast();
    forceToastStyle(el);
    const kind = opt.kind || "info";
    el.textContent = text || "";
    if(kind === "good"){
      el.style.setProperty("border","1px solid rgba(159,255,168,.35)","important");
      el.style.setProperty("box-shadow","0 18px 44px rgba(0,0,0,.55), 0 0 22px rgba(159,255,168,.18)","important");
    }else if(kind === "bad"){
      el.style.setProperty("border","1px solid rgba(255,154,165,.38)","important");
      el.style.setProperty("box-shadow","0 18px 44px rgba(0,0,0,.55), 0 0 22px rgba(255,154,165,.16)","important");
    }else{
      el.style.setProperty("border","1px solid rgba(255,255,255,.16)","important");
      el.style.setProperty("box-shadow","0 18px 44px rgba(0,0,0,.55)","important");
    }
    clearTimeout(toastHype._t);
    el.style.setProperty("transition","none","important");
    el.style.setProperty("opacity","0","important");
    el.style.setProperty("transform","translateY(10px) scale(.98)","important");
    void el.offsetHeight;
    requestAnimationFrame(()=>{
      el.style.setProperty("transition","opacity .16s ease, transform .18s ease","important");
      el.style.setProperty("opacity","1","important");
      el.style.setProperty("transform","translateY(0) scale(1)","important");
    });
    toastHype._t = setTimeout(()=>{
      el.style.setProperty("opacity","0","important");
      el.style.setProperty("transform","translateY(10px) scale(.98)","important");
    }, 1900);
  }

  // =========================================================
  // ✅ CSS注入（BOOTHボタン / 期間表示 / 期限切れ見た目 / スマホ崩れ修正）
  // =========================================================
  function injectBuyRowCSS(){
    if($("#_roten_buyrow_css")) return;
    const style = document.createElement("style");
    style.id = "_roten_buyrow_css";
    style.textContent = `
      /* ===== スマホ崩れの根本原因（min-width / overflow）対策 ===== */
      .good-top{ min-width:0 !important; }
      .good-meta{ min-width:0 !important; overflow: visible !important; }
      .good-name{
        min-width:0 !important;
        display:flex !important;
        flex-wrap:wrap !important;
        align-items:center !important;
        gap:6px !important;
        line-height:1.25 !important;
        overflow: visible !important;
      }
      .good-desc{
        min-width:0 !important;
        overflow-wrap:anywhere !important;
        word-break:break-word !important;
        line-height:1.4 !important;
      }
      .good-fx{
        min-width:0 !important;
        overflow-wrap:anywhere !important;
        word-break:break-word !important;
      }

      .miniTag{
        display:inline-flex; align-items:center;
        padding: 3px 8px; border-radius: 999px;
        border:1px solid rgba(255,255,255,.14);
        background: rgba(0,0,0,.16);
        font-size: 11px; opacity:.9;
        white-space: nowrap;
      }

      /* ✅ BOOTHリンク（タグと同サイズ / 赤背景） */
      .boothBtn{
        display:inline-flex !important;
        align-items:center !important;
        justify-content:center !important;
        padding: 3px 10px !important;
        border-radius: 999px !important;
        border: 1px solid rgba(255,255,255,.18) !important;
        background: #ff2e2e !important;
        color: #fff !important;
        font-size: 11px !important;
        font-weight: 1000 !important;
        letter-spacing: .02em !important;
        text-decoration: none !important;
        white-space: nowrap !important;
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
        cursor: pointer !important;
        -webkit-tap-highlight-color: transparent !important;
        position: relative !important;
        z-index: 5 !important;
      }
      .boothBtn:active{ transform: translateY(1px); }

      /* ✅ 期間外：見た目だけグレー + タップ不可 */
      .boothBtn.is-disabled{
        background: rgba(255,255,255,.16) !important;
        border-color: rgba(255,255,255,.18) !important;
        color: rgba(255,255,255,.72) !important;
        pointer-events: none !important;
        cursor: default !important;
        filter: none !important;
      }

      /* ✅ 期間表示：目立つ色（購入不可の横に置く） */
      .periodChip{
        display:inline-flex;
        margin-left: 8px;
        margin-top: 4px;
        padding: 2px 8px;
        border-radius: 999px;
        border: 1px solid rgba(255,211,138,.35);
        background: rgba(255,211,138,.10);
        color: rgba(255,211,138,.95);
        font-weight: 1000;
        font-size: 11px;
        white-space: normal;
      }
      .periodChip.is-off{
        border-color: rgba(255,154,165,.35);
        background: rgba(255,154,165,.10);
        color: rgba(255,154,165,.95);
      }

      /* ✅ 親切案内（BOOTH→シリアル）※nowrap禁止（切れ防止） */
      .serialHint{
        margin-top: 8px;
        font-size: 12px;
        font-weight: 900;
        color: rgba(255,154,165,.95);
        text-align: left;
        white-space: normal;
        overflow-wrap:anywhere;
        word-break:break-word;
      }
      .serialHint small{
        font-weight: 900;
        color: rgba(255,255,255,.72);
      }

      /* ✅ スマホで確実に押せるBOOTH CTA（本文側） */
      .boothCta{
        display:flex;
        align-items:center;
        justify-content:center;
        gap:8px;
        width:100%;
        margin-top: 10px;
        padding: 10px 12px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.18);
        background: rgba(255,46,46,.92);
        color:#fff;
        font-weight: 1000;
        text-decoration:none;
        letter-spacing:.02em;
        -webkit-tap-highlight-color: transparent;
      }
      .boothCta small{ opacity:.9; font-weight:900; }

      /* ✅ 期限外カード：全体ちょい薄く */
      .good.is-expired{ opacity: .78; }
      .good.is-expired .good-desc{ opacity: .95; }

      .good .good-img{ position: relative !important; }
      .good .ownBadge{
        position:absolute; top: 6px; right: 6px; z-index: 2;
        padding: 4px 8px; border-radius: 999px;
        font-size: 12px; font-weight: 900;
        letter-spacing: .02em;
        color: rgba(255,255,255,.95);
        background: rgba(0,0,0,.55);
        border: 1px solid rgba(255,255,255,.18);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        pointer-events: none; user-select: none; white-space: nowrap;
      }
      .good .ownBadge b{ color:#fff; }

      /* buybar：スマホで折り返しOK（崩れにくい） */
      .good .buybar{
        display:flex !important;
        flex-direction:row !important;
        align-items:center !important;
        justify-content:flex-end !important;
        gap:8px !important;
        flex-wrap:wrap !important;
      }

      .good .qty{ display:flex !important; align-items:center !important; gap:6px !important; flex: 0 0 auto !important; }
      .good .qty .qtybtn{
        min-width: 38px !important; height: 38px !important;
        padding: 0 10px !important; border-radius: 12px !important;
        font-weight: 900 !important; font-size: 14px !important;
      }
      .good .qty .qtyin{
        width: 56px !important; height: 38px !important;
        text-align:center !important; border-radius: 12px !important;
        border:1px solid rgba(255,255,255,.18) !important;
        background:rgba(0,0,0,.22) !important;
        color:#fff !important; font-weight:900 !important; font-size: 14px !important;
      }
      .good .buybar .buybtn{
        height: 38px !important; min-width: 92px !important;
        border-radius: 12px !important; flex: 0 0 auto !important;
        white-space:nowrap !important; font-weight: 900 !important;
        font-size: 13px !important; padding: 0 12px !important;
      }

      .good .priceline{
        margin-top: 6px; font-size: 12px;
        color: rgba(255,255,255,.72);
        text-align:left;
        white-space: normal;
        overflow-wrap:anywhere;
      }
      .good .priceline b{ color: rgba(255,255,255,.92); }

      .good .buyhint{ display:none !important; }

      #btnOpenInv{ display:none !important; }
      #chipBookOwned, #chipBookDup{ display:none !important; }

      #chipSeed, #chipWater, #chipFert{ cursor:pointer; user-select:none; -webkit-tap-highlight-color: transparent; }
      #chipSeed:active, #chipWater:active, #chipFert:active{ transform: translateY(1px); }

      .roten-about-wrap{
        display:flex; justify-content:flex-end; align-items:center;
        gap:10px; width:100%; margin: 6px 0 2px;
      }
      .roten-about-btn{
        height: 36px !important; padding: 0 12px !important;
        border-radius: 12px !important; font-weight: 900 !important;
        font-size: 12px !important; white-space: nowrap !important;
      }

      /* ✅ スマホで「画像 + 説明」を読みやすい比率に固定 */
      @media (max-width: 520px){
        .good-top{
          display:grid !important;
          grid-template-columns: 92px 1fr !important;
          gap: 10px !important;
          align-items:start !important;
        }
        .good-img img{
          width: 92px !important;
          height: auto !important;
        }
      }

      @media (max-width: 420px){
        .good .buybar{ gap:7px !important; }
        .good .buybar .buybtn{ min-width: 86px !important; }
        .good .qty .qtyin{ width: 52px !important; }
        .roten-about-btn{ font-size: 12px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  // ---------- purchase logic ----------
  function clamp(n, min, max){
    n = Math.floor(Number(n)||0);
    if(n < min) return min;
    if(n > max) return max;
    return n;
  }

  function buyMany(item, qty){
    qty = clamp(qty, 1, 99);
    const price = Math.max(0, Number(item.price||0));
    const total = price * qty;
    const octo = getOcto();
    if(octo < total) return { ok:false, need: total, has: octo };

    const inv = ensureInvKeys();
    inv[item.kind] = inv[item.kind] || {};
    inv[item.kind][item.id] = Number(inv[item.kind][item.id] || 0) + qty;
    saveInv(inv);

    setOcto(octo - total);
    pushLog(`購入：${item.name} ×${qty} -${total}オクト`);

    refreshHUD();
    renderGoods();
    setTakopiSayRandom();
    return { ok:true, total, qty, price };
  }

  // ---------- render goods ----------
  let currentKind = "seed";

  function renderGoods(){
    // ✅ 表示前にも同期（ズレ固定を防ぐ）
    syncCollabSeedsToInv();

    const inv = ensureInvKeys();
    const grid = $("#goodsGrid");
    if(!grid) return;

    const list = GOODS.filter(g => g.kind === currentKind);

    grid.innerHTML = list.map(g => {
      const own = ownedCount(inv, g.kind, g.id);
      const badge = g.tag ? `<span class="miniTag">${escapeHTML(g.tag)}</span>` : "";

      // ✅ コラボ期間判定（collabIdがあるseedのみ）
      let active = true;
      let periodLabel = "";
      if(!g.buyable && g.collabId){
        const win = getCollabWindow(g.collabId);
        active = !!win.active;
        periodLabel = g.period || win.label || "";
      }

      // ✅ 非売品（シリアル限定）なら BOOTHボタンをタグの右に出す
      // - 期間内：通常BOOTH
      // - 期間外：BOOTH終了（タップ不可）
      const boothBtn = (!g.buyable && g.boothUrl)
        ? (
          active
            ? `<a class="boothBtn" href="${escapeAttr(g.boothUrl)}" target="_blank" rel="noopener">BOOTH</a>`
            : `<span class="boothBtn is-disabled" aria-disabled="true">BOOTH終了</span>`
        )
        : "";

      const canBuy = !!g.buyable;

      const priceLine = canBuy
        ? `<div class="priceline">単価 <b>${g.price}</b> オクト</div>`
        : `<div class="priceline">単価 <b>—</b>（シリアル）</div>`;

      // ✅ 期間表示（購入不可の横に出す）
      const periodChip = (!canBuy && periodLabel)
        ? `<span class="periodChip ${active ? "" : "is-off"}">コラボ期間：${escapeHTML(periodLabel)}${active ? "" : "（期間外）"}</span>`
        : "";

      const descHtml = (() => {
        const raw = String(g.desc || "");
        const lines = raw.split("\n");
        if(!canBuy && lines.length){
          // 1行目の後ろに期間を差し込む
          const first = escapeHTML(lines[0]);
          const rest = lines.slice(1).map(x => escapeHTML(x)).join("<br>");
          return `${first}${periodChip}${rest ? "<br>"+rest : ""}`;
        }
        return escapeHTML(raw).replace(/\n/g,"<br>");
      })();

      // ✅ 非売品（コラボ種）の buyBar：スマホでも読めて、BOOTH CTAを確実に出す
      const buyBar = canBuy ? `
        <div class="buybar">
          <div class="qty">
            <button class="btn qtybtn qtyminus" type="button" aria-label="減らす">−</button>
            <input class="qtyin" type="number" inputmode="numeric" min="1" max="99" value="1">
            <button class="btn qtybtn qtyplus" type="button" aria-label="増やす">＋</button>
          </div>
          <button class="btn buybtn" type="button">買う</button>
        </div>
        ${priceLine}
      ` : `
        <div class="buybar">
          <div style="opacity:.88; font-size:12px; flex:1; text-align:left;">
            上のシリアル入力で増える…たこ。
          </div>
        </div>

        <div class="serialHint">
          ✅ BOOTHでカードを購入すると <b>シリアルコード</b> がもらえるよ
          <small>（入力 → タネ増える）</small>
        </div>

        ${g.boothUrl ? (
          active
            ? `<a class="boothCta" href="${escapeAttr(g.boothUrl)}" target="_blank" rel="noopener">🛒 BOOTHでカード購入する <small>→ シリアルGET</small></a>`
            : `<div class="serialHint" style="margin-top:10px; color: rgba(255,211,138,.95);">※このタネのBOOTHは期間外…たこ。</div>`
        ) : ""}

        ${priceLine}
      `;

      return `
        <article class="good ${(!canBuy && !active) ? "is-expired" : ""}" data-kind="${escapeAttr(g.kind)}" data-id="${escapeAttr(g.id)}">
          <div class="good-top">
            <div class="good-img">
              <span class="ownBadge">×<b>${String(own)}</b></span>
              <img src="${escapeAttr(g.img)}" alt="${escapeHTML(g.name)}" loading="lazy">
            </div>
            <div class="good-meta">
              <div class="good-name">${escapeHTML(g.name)} ${badge}${boothBtn}</div>
              <div class="good-desc">${descHtml}</div>
              <div class="good-fx">${g.fx ? `効果：<b>${escapeHTML(g.fx)}</b>` : ""}</div>
            </div>
          </div>
          <div class="good-row">
            <div class="good-buy">${buyBar}</div>
          </div>
        </article>
      `;
    }).join("");

    $$(".good", grid).forEach(card => {
      const kind = card.getAttribute("data-kind");
      const id   = card.getAttribute("data-id");
      const item = GOODS.find(x => x.kind===kind && x.id===id);
      if(!item) return;

      // ✅ 非売品（コラボ種）は購入配線しない
      if(!item.buyable) return;

      const btn   = $(".buybtn", card);
      const minus = $(".qtyminus", card);
      const plus  = $(".qtyplus", card);
      const qtyIn = $(".qtyin", card);

      function getQty(){
        const v = qtyIn ? Number(qtyIn.value || 1) : 1;
        return clamp(v, 1, 99);
      }
      function setQty(v){
        if(!qtyIn) return;
        qtyIn.value = String(clamp(v, 1, 99));
      }

      minus?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); setQty(getQty()-1); });
      plus?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); setQty(getQty()+1); });
      qtyIn?.addEventListener("input", ()=>{ setQty(getQty()); });

      btn?.addEventListener("click", (e)=>{
        e.preventDefault(); e.stopPropagation();

        const qty = getQty();
        const r = buyMany(item, qty);
        if(!r.ok){
          toastHype("💥 オクトが足りない…たこ。", {kind:"bad"});
          return;
        }
        toastHype(`✨ 購入完了！「${item.name}」×${r.qty}（-${r.total}オクト）✨`, {kind:"good"});
      });
    });
  }

  // ✅ XSS対策（innerHTML用の最低限）
  function escapeHTML(s){
    s = String(s ?? "");
    return s.replace(/[&<>"']/g, (c) => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      "\"":"&quot;",
      "'":"&#39;",
    }[c]));
  }
  function escapeAttr(s){
    // 属性向け（最低限）
    return escapeHTML(String(s ?? "")).replace(/`/g, "&#96;");
  }

  // =========================================================
  // ✅ 内訳モーダル（seedは表示中のタネだけ）
  // - HOLDは hidden/blocked なので一覧にも内訳にも出ない
  // =========================================================
  function openBreakdownModal(kindKey){
    syncCollabSeedsToInv();

    const inv = ensureInvKeys();
    const titleMap = { seed:"🌱 種の内訳", water:"💧 水の内訳", fert:"🧪 肥料の内訳" };
    const items = GOODS.filter(g => g.kind === kindKey);

    let rows = items.map(g => {
      const c = ownedCount(inv, g.kind, g.id);

      let memo = "";
      const def = Object.values(COLLAB_BY_ID).find(x => x.seedId === g.id);
      if(def) memo = `（${def.collabId} / seed_token）`;

      return `
        <div class="inv-row">
          <div class="inv-left">
            <span class="inv-name">${escapeHTML(g.name)}</span>
            <span class="inv-memo">${escapeHTML(memo)}</span>
          </div>
          <div class="inv-right">×<b>${String(c)}</b></div>
        </div>
      `;
    }).join("");

    if(kindKey === "seed"){
      const by = countSeedTokensByCollab();
      const keys = Object.keys(by);
      const detail = keys.length
        ? `<div class="note" style="margin-top:10px; opacity:.82;">未使用token内訳：${keys.map(k=>`${escapeHTML(k)}×${by[k]}`).join(" / ")}</div>`
        : `<div class="note" style="margin-top:10px; opacity:.82;">未使用token内訳：まだない…たこ。</div>`;
      rows += detail;
    }

    openModal(titleMap[kindKey] || "📦 内訳", `
      <div class="mikuji-wrap">
        <div class="inv-box">
          <div class="inv-title">${escapeHTML(titleMap[kindKey] || "内訳")}</div>
          ${rows || `<div class="note">まだ何もない…たこ。</div>`}
        </div>
        <div class="row">
          <button class="btn btn-ghost" id="okBreakdown" type="button">閉じる</button>
        </div>
      </div>
    `);

    const root = document.getElementById("modalBody") || document;
    $("#okBreakdown", root)?.addEventListener("click", closeModal);
  }

  function wireChipBreakdowns(){
    $("#chipSeed")?.addEventListener("click", () => { openBreakdownModal("seed"); setTakopiSayRandom(); });
    $("#chipWater")?.addEventListener("click", () => { openBreakdownModal("water"); setTakopiSayRandom(); });
    $("#chipFert")?.addEventListener("click", () => { openBreakdownModal("fert"); setTakopiSayRandom(); });
  }

  // =========================================================
  // ✅ シリアル（新GAS方式）
  // - 上部の入力（#serialInlineInput/#serialInlineBtn）で完結
  // =========================================================
  function getDeviceId(){
    let id = localStorage.getItem(LS.deviceId);
    if(!id){
      id = "dev_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(LS.deviceId, id);
    }
    return id;
  }

  async function gasPost(payload){
    const res = await fetch(GAS_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    if(!res.ok) throw new Error("通信エラー: HTTP " + res.status);
    const txt = await res.text();
    let json;
    try{ json = JSON.parse(txt); }catch(e){ throw new Error("JSON parse failed: " + txt); }
    return json;
  }

  async function redeemOnServer(code){
    return await gasPost({
      api: "redeem",
      apiKey: GAS_KEY,
      code: String(code||"").trim(),
      deviceId: getDeviceId(),
      app: "roten",
      ts: Date.now()
    });
  }

  // ✅ redeem結果（tokens）を seedTokens に追加保存（重複排除つき）
  function applyRedeemTokens(tokens){
    const st = loadSeedTokens();
    const now = Date.now();
    const before = st.tokens.length;

    for(const t of (tokens || [])){
      const token = String(t?.token || "").trim();
      const collabId = String(t?.collabId || "").trim();
      if(!token) continue;
      st.tokens.push({ token, collabId, issuedAt: now, status: "ISSUED" });
    }

    // 重複排除
    const seen = new Set();
    st.tokens = st.tokens.filter(x=>{
      if(!x || !x.token) return false;
      if(seen.has(x.token)) return false;
      seen.add(x.token);
      return true;
    });

    saveSeedTokens(st);

    const added = st.tokens.length - before;

    // ✅ inv側も同期して “必ず反映される” 状態にする
    syncCollabSeedsToInv();

    return { total: st.tokens.length, added };
  }

  // （HTMLにインライン入力がある場合だけ活かす：無ければ何もしない）
  function wireSerialInline(){
    const input = $("#serialInlineInput");
    const btn   = $("#serialInlineBtn");
    if(!input || !btn) return;

    const run = async () => {
      const code = (input.value || "").trim().toUpperCase();
      if(!code) return;

      btn.disabled = true;

      try{
        const data = await redeemOnServer(code);

        if(!data?.ok){
          toastHype(`💥 ${data?.error || "無効なコード…たこ。"}`, {kind:"bad"});
          return;
        }

        const tokens = data.tokens || [];
        if(!Array.isArray(tokens) || tokens.length === 0){
          toastHype("💥 トークンが発行されなかった…たこ。", {kind:"bad"});
          return;
        }

        applyRedeemTokens(tokens);
        input.value = "";
        pushLog(`シリアル：${code}（seed_token +${tokens.length} / ${data.collabId}）`);

        refreshHUD();
        renderGoods();
        toastHype(`✨ 成功！seed_token +${tokens.length}（${data.collabId}）✨`, {kind:"good"});
      }catch(e){
        toastHype("💥 通信に失敗した…たこ。", {kind:"bad"});
      }finally{
        btn.disabled = false;
      }
    };

    btn.addEventListener("click", run);
    input.addEventListener("keydown", (e)=>{ if(e.key === "Enter") run(); });
  }

  // =========================================================
  // ✅ 《タネ、ミズ、ヒリョウについて》モーダル
  // =========================================================
  function openAboutModal(){
    openModal("📘 タネ/ミズ/ヒリョウについて", `
      <div class="mikuji-wrap">
        <div class="note">
          ここは「仕様書」じゃなく、<b>引きを良くするための作戦メモ</b>…たこ。<br>
          ※ただし <b>コラボの排出はサーバー側で確定</b>…たこ。
        </div>

        <div class="inv-box">
          <div class="inv-title">🌱 タネ</div>
          <div class="note">
            通常タネは「候補（プール）」に影響…たこ。<br>
            <b>【コラボ】各タネ</b>は、上の<b>シリアル入力</b>でseed_tokenを増やして、畑で使う…たこ。<br>
            <b>BOOTHでカード購入 → シリアルが付く</b>なら、ここが入口…たこ。
          </div>
          <div style="margin-top:10px; text-align:right;">
            <a class="boothBtn" href="${escapeAttr(BOOTH_SHOP_URL)}" target="_blank" rel="noopener">BOOTHへ</a>
          </div>
        </div>

        <div class="inv-box">
          <div class="inv-title">💧 ミズ</div>
          <div class="note">
            ミズはレア抽選の上振れを狙う…たこ。<br>
            （ただしコラボはGASで確定しているから、コラボには効かない想定…たこ）
          </div>
        </div>

        <div class="inv-box">
          <div class="inv-title">🧪 ヒリョウ</div>
          <div class="note">
            ヒリョウは時短と事故率…たこ。<br>
            （コラボtoken運用では、時短は「植えてから収穫」演出にだけ効かせるのが安全…たこ）
          </div>
        </div>

        <div class="row">
          <button class="btn btn-ghost" id="okAbout" type="button">閉じる</button>
        </div>
      </div>
    `);

    const root = document.getElementById("modalBody") || document;
    $("#okAbout", root)?.addEventListener("click", closeModal);
  }

  function placeAboutButton(){
    let btn = $("#btnOpenRates");
    if(!btn){
      btn = document.createElement("button");
      btn.id = "btnOpenRates";
      btn.className = "btn roten-about-btn";
      btn.type = "button";
      btn.textContent = "タネ/ミズ/ヒリョウについて";
      document.body.appendChild(btn);
    }
    btn.textContent = "タネ/ミズ/ヒリョウについて";
    btn.classList.add("roten-about-btn");

    const candidates = $$("h1,h2,h3,h4,div,section,p,span").filter(el => {
      const t = (el.textContent || "").replace(/\s+/g,"");
      return t.includes("購入") || t.includes("タップで買う");
    });
    const anchor = candidates.length ? candidates[candidates.length - 1] : null;

    let wrap = $("#_roten_about_wrap");
    if(!wrap){
      wrap = document.createElement("div");
      wrap.id = "_roten_about_wrap";
      wrap.className = "roten-about-wrap";
    }
    wrap.innerHTML = "";
    wrap.appendChild(btn);

    if(anchor && anchor.parentElement){
      anchor.parentElement.insertBefore(wrap, anchor.nextSibling);
    }else{
      const app = $("#rotenApp") || document.body;
      app.insertBefore(wrap, app.firstChild);
    }
    wrap.style.setProperty("margin-top","0","important");
  }

  // =========================================================
  // ✅ たこ焼きみくじ（既存そのまま）
  // =========================================================
  const OMKUJI = [
    { w: 8,  luck:"大吉", kind:"seed",  id:"seed_special", qty:1, octo:7777, label:"たこぴのタネ×1 + オクト+7777",
      msg:"焼き台が歌ってる…たこ。今日は“伝説”が出る…たこ。" },
    { w: 18, luck:"中吉", kind:"water", id:"water_regret", qty:1, octo:3000, label:"押さなきゃよかった水×1 + オクト+3000",
      msg:"事件の匂い…たこ。SNS向けの運…たこ。" },
    { w: 28, luck:"末吉", kind:"water", id:"water_overdo", qty:1, octo:1000, label:"やりすぎな水×1 + オクト+1000",
      msg:"勝負の一滴…たこ。うまく焼けるといいね…たこ。" },
    { w: 28, luck:"凶",   kind:"fert",  id:"fert_skip",    qty:1, octo: 500, label:"工程すっ飛ばし肥料×1 + オクト+500",
      msg:"焦ると…焼ける…たこ。近道はだいたい罠…たこ。" },
    { w: 18, luck:"大凶", kind:"octo",  id:"octo",         qty:1, octo:   1, label:"オクト+1",
      msg:"……大凶でも、1オクトは“希望”…たこ。明日がある…たこ。" },
  ];

  function pickWeighted(list){
    const sum = list.reduce((a,b)=>a + (Number(b.w)||0), 0);
    let r = Math.random() * sum;
    for(const it of list){
      r -= (Number(it.w)||0);
      if(r <= 0) return it;
    }
    return list[0];
  }

  function applyReward(reward){
    if(Number(reward.octo) > 0) addOcto(Number(reward.octo));
    if(reward.kind === "octo") return;

    const inv = ensureInvKeys();
    inv[reward.kind] = inv[reward.kind] || {};
    inv[reward.kind][reward.id] = Number(inv[reward.kind][reward.id] || 0) + Number(reward.qty || 1);
    saveInv(inv);
  }

  function openMikuji(){
    const done = localStorage.getItem(LS.mikujiDate) === todayKey();
    if(done){
      openModal("🎲 たこ焼きみくじ", `<div class="mikuji-wrap"><div class="note">今日はもう引いた…たこ。明日またおいで…たこ。</div></div>`);
      return;
    }

    const ballImg = "https://ul.h3z.jp/PHREbelx.png";

    openModal("🎲 たこ焼きみくじ（1日1回）", `
      <div class="mikuji-wrap">
        <div class="note">
          たこぴ：<br>
          「焼き台から1つ選んで…たこ。<br>
          運勢が出る…たこ。」
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

    const root = document.getElementById("modalBody") || document;
    const grill = $("#grill", root);
    $$(".ball", grill).forEach(b => {
      b.addEventListener("click", () => doMikuji(), { once:true });
    });
  }

  function doMikuji(){
    const r = pickWeighted(OMKUJI);

    applyReward(r);
    localStorage.setItem(LS.mikujiDate, todayKey());
    pushLog(`みくじ：${r.luck} / ${r.label}`);

    openModal("🎴 おみくじ結果", `
      <div class="mikuji-wrap">
        <div style="text-align:center; font-weight:1000; font-size:44px; letter-spacing:.08em; line-height:1; margin: 8px 0 10px;">
          ${r.luck}
        </div>

        <div style="text-align:center; font-weight:900; font-size:16px; margin-bottom: 10px;">
          ${r.label}
        </div>

        <div class="note" style="text-align:center;">
          たこぴ：<br>「${r.msg}」
        </div>

        <div class="row">
          <button class="btn big" id="okMikuji" type="button">OK</button>
        </div>
      </div>
    `);

    const root = document.getElementById("modalBody") || document;
    $("#okMikuji", root)?.addEventListener("click", () => {
      closeModal();
      refreshHUD();
      renderGoods();
    });
  }

  // =========================================================
  // ✅ 公開記念プレゼント（既存そのまま）
  // =========================================================
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
          <div class="note">🌱 店頭タネ×15</div>
          <div class="note">🌱 回線タネ×15</div>
          <div class="note">🌱 たこぴのタネ×1</div>
          <hr class="sep">
          <div class="note">💧 なんか良さそう×10 / 怪しい×10 / やりすぎ×10</div>
          <div class="note">🧪 気のせい×10 / 根性×10 / 工程すっ飛ばし×10</div>
        </div>

        <div class="row">
          <button class="btn big" id="claimGift" type="button">受け取る（取り消し不可）</button>
          <button class="btn btn-ghost" id="cancelGift" type="button">やめる</button>
        </div>

        <div class="note">※1回だけ。押したら戻れない…たこ。</div>
      </div>
    `);

    const root = document.getElementById("modalBody") || document;
    $("#cancelGift", root)?.addEventListener("click", closeModal);
    $("#claimGift", root)?.addEventListener("click", () => {
      claimLaunchGift();
      closeModal();
    });
  }

  function claimLaunchGift(){
    const inv = ensureInvKeys();

    inv.seed["seed_shop"]    = Number(inv.seed["seed_shop"]||0) + 15;
    inv.seed["seed_line"]    = Number(inv.seed["seed_line"]||0) + 15;
    inv.seed["seed_special"] = Number(inv.seed["seed_special"]||0) + 1;

    inv.water["water_nice"]       = Number(inv.water["water_nice"]||0) + 10;
    inv.water["water_suspicious"] = Number(inv.water["water_suspicious"]||0) + 10;
    inv.water["water_overdo"]     = Number(inv.water["water_overdo"]||0) + 10;

    inv.fert["fert_feel"] = Number(inv.fert["fert_feel"]||0) + 10;
    inv.fert["fert_guts"] = Number(inv.fert["fert_guts"]||0) + 10;
    inv.fert["fert_skip"] = Number(inv.fert["fert_skip"]||0) + 10;

    saveInv(inv);
    localStorage.setItem(LS.launchGift, "1");
    pushLog("公開記念プレゼント受取");

    setTakopiSayRandom();
    refreshHUD();
    renderGoods();
    toastHype("🎁 プレゼント受取！", {kind:"good"});
  }

  // =========================================================
  // ✅ タブ/ボタン配線
  // =========================================================
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
    $("#btnDebugPlus100000")?.addEventListener("click", () => {
      addOcto(100000);
      pushLog("デバッグ：オクト +100000");
      refreshHUD();
      setTakopiSayRandom();
      toastHype("🧪 オクト +100000！", {kind:"good"});
    });

    $("#btnOpenInv")?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toastHype("📦 所持内訳は、上の 🌱/💧/🧪 をタップ…たこ。", {kind:"info"});
    });

    $("#btnOpenRates")?.addEventListener("click", () => {
      openAboutModal();
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

    $("#btnOpenSell")?.addEventListener("click", () => {
      toastHype("🏮 売却ページを開いた！", {kind:"info"});
      setTakopiSayRandom();
    });

    $("#rotenBackBtn")?.addEventListener("click", () => {
      if(history.length > 1) history.back();
      else location.href = "./index.html";
    });
  }

  function boot(){
    ensureToast();
    injectBuyRowCSS();
    ensureInvKeys();

    // ✅ 起動時に必ず同期（これで “反映されない” が起きにくい）
    syncCollabSeedsToInv();

    placeAboutButton();

    setTakopiSayRandom();
    wireModalClose();
    wireTabs();
    wireButtons();
    wireSerialInline();
    wireChipBreakdowns();

    refreshHUD();
    renderGoods();
    toastHype("✨ 露店 起動！…たこ。", {kind:"info"});
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot, { once:true });
  }else{
    boot();
  }
})();
