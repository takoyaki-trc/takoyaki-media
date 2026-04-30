(() => {
  "use strict";

  // =========================================================
  // Keys
  // =========================================================
  const KEY = {
    board: "ttc_matching_board_v7",
    octo: "roten_v1_octo",
    book: "tf_v1_book",
    inv: "tf_v1_inv",
    matchingMeta: "ttc_matching_meta_v6",
    heat: "matching_heat_v1"
  };

  const AFFECTION_LS_KEY = "roten_v1_guest_affection";
  const REGULAR_LOVE_THRESHOLD = 80;
  const GACHA_HEAT_COST = 500;
  const GACHA_URL = "kasumipi-gacha.html";

  const KASUMIPI_FLOAT_ICON = "https://ul.h3z.jp/eUMxATXQ.png";
  const HERO_IMAGE_URL = "https://ul.h3z.jp/KyGJh82d.png";

  // =========================================================
  // Utils
  // =========================================================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function nowTokyo() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  }

  function todayKey() {
    const d = nowTokyo();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function todayLabelJP() {
    const d = nowTokyo();
    return `${d.getMonth() + 1}月${d.getDate()}日の募集相手`;
  }

  function safeJSONParse(raw, fallback) {
    try {
      const v = JSON.parse(raw);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function loadJSON(key, fallback) {
    return safeJSONParse(localStorage.getItem(key), fallback);
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function randFromSeed(seedStr) {
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return function () {
      h += h << 13; h ^= h >>> 7;
      h += h << 3; h ^= h >>> 17;
      h += h << 5;
      return ((h >>> 0) / 4294967295);
    };
  }

  function pick(arr, rnd) {
    return arr[Math.floor(rnd() * arr.length)];
  }

  function weightedPick(list, rnd) {
    const total = list.reduce((sum, item) => sum + (item.weight || 1), 0);
    let roll = rnd() * total;
    for (const item of list) {
      roll -= (item.weight || 1);
      if (roll <= 0) return item;
    }
    return list[list.length - 1];
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[s]);
  }

  function stars(n) {
    return "★".repeat(n) + "☆".repeat(5 - n);
  }

  function showKasumipiToast(text, ms = 2400) {
    const wrap = $("#takopiToast");
    const inner = $("#takopiToastInner");
    if (!wrap || !inner) return;
    inner.textContent = text;
    wrap.classList.add("show");
    clearTimeout(showKasumipiToast._t);
    showKasumipiToast._t = setTimeout(() => wrap.classList.remove("show"), ms);
  }

  function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  function getRepresentativeRewardLabels(items, limit = 2) {
    const out = [];
    for (const item of (items || [])) {
      const label = `${itemIcon(item.kind)} ${itemLabel(item.kind, item.id)}×${item.qty}`;
      out.push(label);
      if (out.length >= limit) break;
    }
    return out;
  }

  function toSafeCount(v, fallback = 0) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.floor(n));
  }

  // =========================================================
  // Dynamic style
  // =========================================================
  function ensureDynamicStyles() {
    if ($("#matchingDynamicStyles")) return;

    const style = document.createElement("style");
    style.id = "matchingDynamicStyles";
    style.textContent = `
      .heroHeatWrap{
        display:flex;
        align-items:center;
        gap:10px;
        width:100%;
        min-width:0;
      }

      .heroHeatNode{
        flex:0 0 auto;
      }

      .heroHeatBarWrap{
        flex:1 1 auto;
        min-width:0;
      }

      .heroHeatBar{
        width:100%;
      }

      .heroHeatAction{
        flex:0 0 auto;
        display:flex;
        align-items:center;
      }

      .heroHeatGachaBtn{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-width:112px;
        height:42px;
        padding:0 14px;
        border-radius:12px;
        text-decoration:none;
        font-weight:900;
        font-size:13px;
        line-height:1;
        white-space:nowrap;
        user-select:none;
        transition:transform .15s ease, opacity .15s ease, filter .15s ease;
      }

      .heroHeatGachaBtn.isDisabled{
        pointer-events:none;
        opacity:.45;
        filter:grayscale(.18);
      }

      .heroHeatGachaBtn.isEnabled:hover{
        transform:translateY(-1px);
      }

      @media (max-width: 640px){
        .heroHeatWrap{
          gap:8px;
        }
        .heroHeatGachaBtn{
          min-width:94px;
          height:38px;
          padding:0 10px;
          font-size:12px;
          border-radius:10px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // =========================================================
  // Customer master
  // =========================================================
  const CUSTOMER_NAME_MAP = {
    impulse: "即決タコ民",
    picky: "見えないタコ民",
    king: "王様タコ民",
    flipper: "よっぱらいタコ民",
    careful: "つぶやきタコ民",
    looker: "冷やかしタコ民",
    rich: "札束タコ民",
    climber: "踏破タコ民",
    guide: "ナビタコ民",
    relax: "ほぐしタコ民",
    artisan: "返し職人タコ民",
    diet: "ゼロ理論タコ民",
    overflow: "枠外タコ民",
    collector: "未開封保護タコ民",
    shadow: "防水タコ民",
    ramen: "替え玉タコ民",
    streamer: "投げ銭タコ民",
    gourmet: "舌判定タコ民",
    opener: "即バリタコ民",
    party: "宴タコ民",
    pilgrim: "覚悟タコ民"
  };

  const CUSTOMER_ICON_MAP = {
    careful:   "https://ul.h3z.jp/RpLPCRTc.png",
    impulse:   "https://ul.h3z.jp/TMXU9ztW.png",
    looker:    "https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/roten/kyaku16.png",
    picky:     "https://ul.h3z.jp/MZYfusKm.png",
    king:      "https://ul.h3z.jp/wMM8PrcP.png",
    flipper:   "https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/roten/kyaku20.png",
    rich:      "https://ul.h3z.jp/pZKu3lSE.png",
    climber:   "https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/roten/kyaku2.png",
    guide:     "https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/roten/kyaku3.png",
    relax:     "https://ul.h3z.jp/dbBbLypa.png",
    artisan:   "https://ul.h3z.jp/OA5StkvT.png",
    diet:      "https://ul.h3z.jp/KVImBYZ8.png",
    overflow:  "https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/kyaku7.png",
    collector: "https://ul.h3z.jp/zSvGyVq9.png",
    shadow:    "https://ul.h3z.jp/IBKDrVAm.png",
    ramen:     "https://ul.h3z.jp/NViRwhdj.png",
    streamer:  "https://ul.h3z.jp/8PukOegd.png",
    gourmet:   "https://ul.h3z.jp/We4UXFSI.png",
    opener:    "https://ul.h3z.jp/9usFHTdU.png",
    party:     "https://ul.h3z.jp/pByCAUMC.png",
    pilgrim:   "https://ul.h3z.jp/eW2dluw2.png"
  };

  const CUSTOMER_RATE = {
    careful: 13,
    impulse: 12,
    looker: 12,
    relax: 10,
    gourmet: 10,
    artisan: 8,
    diet: 8,
    climber: 8,
    flipper: 7,
    collector: 7,
    opener: 6,
    party: 6,
    ramen: 6,
    streamer: 5,
    king: 5,
    shadow: 4,
    overflow: 4,
    picky: 4,
    rich: 3,
    guide: 2,
    pilgrim: 2
  };

  const HERO_LINES = [
    "今日は、どの願いが深く沈んでるじゃなイカ？",
    "条件が揃えば、それはもう運命じゃなイカ？",
    "恋じゃなくて執着かもしれないじゃなイカ。",
    "今日の相手、だいたいみんな重ためじゃなイカ？"
  ];

  const KASUMIPI_LINES = [
    "……その願い、深く沈んでるじゃなイカ",
    "ヒントを見すぎると、ロマンが作業になるじゃなイカ",
    "一発で当てたら、かなり冴えてるじゃなイカ",
    "今日は沼っぽい相手が多いじゃなイカ",
    "♥か💔か、渡してみるまで分からないじゃなイカ"
  ];

  const FALLBACK_LINES = {
    impulse: ["一瞬だったのに、まだ忘れられないじゃなイカ"],
    picky: ["あの日のそれじゃなきゃダメじゃなイカ"],
    king: ["選ぶ側のはずが、心を持っていかれたじゃなイカ"],
    flipper: ["好きなのか執着なのか、自分でも怪しいじゃなイカ"],
    careful: ["言葉にしたら壊れそうで、まだ黙ってるじゃなイカ"],
    looker: ["見てるだけのはずが、ずっと目で追ってるじゃなイカ"],
    rich: ["いくら積めば、あの時に戻れるじゃなイカ"],
    climber: ["あと少しだったのに届かなかったじゃなイカ"],
    guide: ["案内してるのに、自分が迷ってるじゃなイカ"],
    relax: ["理由もなく惹かれたものほど残るじゃなイカ"],
    artisan: ["触れた感触まで覚えてるじゃなイカ"],
    diet: ["欲しくないって言い聞かせてるだけじゃなイカ"],
    overflow: ["普通の枠には収まらなかったじゃなイカ"],
    collector: ["手元に置いておきたい気持ちが強すぎるじゃなイカ"],
    shadow: ["濡れた記憶ほど、乾かないじゃなイカ"],
    ramen: ["一回じゃ足りなかったじゃなイカ"],
    streamer: ["軽い気持ちのはずが、妙に残るじゃなイカ"],
    gourmet: ["あの日の余韻が忘れられないじゃなイカ"],
    opener: ["中身も知らないのに惹かれてるじゃなイカ"],
    party: ["祭りのあとほど、本音が残るじゃなイカ"],
    pilgrim: ["置いてきた気持ちを、まだ探してるじゃなイカ"]
  };

  function getSpeechLines(type) {
    const external = (window.LOVE_LINES && window.LOVE_LINES[type]) || null;
    if (Array.isArray(external) && external.length) return external;
    return FALLBACK_LINES[type] || ["まだ忘れられないじゃなイカ"];
  }

  // =========================================================
  // Card pools / master
  // =========================================================
  const CARD_POOLS = {
    N: [
      { no: "TN-005", name: "たこ焼きタワー112", img: "https://ul.h3z.jp/LoXMSiYd.jpg" },
      { no: "TN-006", name: "塩顔パレード焼き", img: "https://ul.h3z.jp/7L7rcrnM.jpg" },
      { no: "TN-009", name: "塩マヨ露天焼き", img: "https://ul.h3z.jp/bF9QmTE8.jpg" },
      { no: "TN-011", name: "チーズ火山焼き", img: "https://ul.h3z.jp/BEj3BIcP.jpg" },
      { no: "TN-012", name: "揚げ玉会議焼き", img: "https://ul.h3z.jp/vVw2FjQp.jpg" },
      { no: "TN-013", name: "くたびれ塩こしょう焼き", img: "https://ul.h3z.jp/DlX5pLJ5.jpg" },
      { no: "TN-016", name: "たこ焼き、発射オーライ", img: "https://ul.h3z.jp/50WYMkYw.jpg" },
      { no: "TN-018", name: "ゆのかわの主", img: "https://ul.h3z.jp/mkLBMxIT.jpg" },
      { no: "TN-019", name: "誤入店トラップ", img: "https://ul.h3z.jp/YfON5rBJ.jpg" },
      { no: "TN-021", name: "たこ焼き、流れて候", img: "https://ul.h3z.jp/O4s1VpWd.jpg" },
      { no: "TN-023", name: "芝生かたこ焼きか大会", img: "https://ul.h3z.jp/FZcOaXY8.jpg" },
      { no: "TN-024", name: "温泉女神のありがた迷惑", img: "https://ul.h3z.jp/A6WhBsqj.jpg" },
      { no: "TN-026", name: "たこ焼き48回リボ払い", img: "https://ul.h3z.jp/hz7JXyky.jpg" },
      { no: "TN-027", name: "全身たこ焼きダイエット", img: "https://ul.h3z.jp/FQ3poZLg.jpg" },
      { no: "TN-028", name: "自己啓発たこ塾《井上諒プロ🎯》", img: "https://ul.h3z.jp/sPChFFlG.jpg" },
      { no: "TN-029", name: "カロリーゼロ理論《仁木治プロ🎯》", img: "https://ul.h3z.jp/4HEbt3YP.jpg" },
      { no: "TN-031", name: "行列の最後尾が別県", img: "https://ul.h3z.jp/LBdFqlLI.jpg" },
      { no: "TN-034", name: "エシカル過剰焼き", img: "https://ul.h3z.jp/KRkSq4WD.jpg" },
      { no: "TN-036", name: "マヨネーズ詐欺", img: "https://ul.h3z.jp/NzVgPYdG.jpg" },
      { no: "TN-037", name: "勘違いデート", img: "https://ul.h3z.jp/riYYAnEi.jpg" },
      { no: "TN-041", name: "玉の上にも三年", img: "https://ul.h3z.jp/pQg0jZMy.jpg" },
      { no: "TN-043", name: "転生したら即売れたこ焼き", img: "https://ul.h3z.jp/I3JWnpoL.jpg" },
      { no: "TN-046", name: "ごますりたこ焼き", img: "https://ul.h3z.jp/tuLsTiaz.jpg" },
      { no: "TN-048", name: "店主反撃レビュー《佐俣雄一郎🎯》", img: "https://ul.h3z.jp/ge8b4cQ5.jpg" }
    ],
    R: [
      { no: "TN-002", name: "熱々地獄の給たこ所", img: "https://ul.h3z.jp/otr0dAQi.jpg" },
      { no: "TN-003", name: "爆走！たこ焼きライダー菜々", img: "https://ul.h3z.jp/06HrUPMT.jpg" },
      { no: "TN-008", name: "明太ギャラクシー焼き", img: "https://ul.h3z.jp/xye1uAfV.jpg" },
      { no: "TN-014", name: "世界たこ焼き釣り選手権大会", img: "https://ul.h3z.jp/cyekwiam.jpg" },
      { no: "TN-017", name: "たこ焼きマニフェスト", img: "https://ul.h3z.jp/zeSwFyjz.jpg" },
      { no: "TN-022", name: "たこ焼きダーツインフェルノ《對馬裕佳子プロ🎯》", img: "https://ul.h3z.jp/Prf7KxRk.jpg" },
      { no: "TN-032", name: "国境超えた恋", img: "https://ul.h3z.jp/9AZcVNmR.jpg" },
      { no: "TN-035", name: "デリバリー長距離便", img: "https://ul.h3z.jp/z0xhODVy.jpg" },
      { no: "TN-038", name: "恋落ちマッチング", img: "https://ul.h3z.jp/BPEoWjuY.jpg" },
      { no: "TN-042", name: "たこ焼きループザループ", img: "https://ul.h3z.jp/vxKamb6f.jpg" },
      { no: "TN-044", name: "白い契約(稲石裕プロ🎯)", img: "https://ul.h3z.jp/bC1B4WkQ.jpg" },
      { no: "TN-047", name: "ボスゲート", img: "https://ul.h3z.jp/GHWrtaYk.jpg" }
    ],
    SR: [
      { no: "TN-004", name: "見えるフリ焼き", img: "https://ul.h3z.jp/irs6Sxoy.jpg" },
      { no: "TN-010", name: "焼ク者ノ証", img: "https://ul.h3z.jp/6A2LOn4A.jpg" },
      { no: "TN-015", name: "顔コイン", img: "https://ul.h3z.jp/7GUyGDU1.jpg" },
      { no: "TN-020", name: "ピック不要の真実", img: "https://ul.h3z.jp/Bu1pk4ul.jpg" },
      { no: "TN-030", name: "ガチャたこ焼き", img: "https://ul.h3z.jp/kFpjcqSv.jpg" },
      { no: "TN-039", name: "ドローン誤配達", img: "https://ul.h3z.jp/70A10oHf.jpg" },
      { no: "TN-040", name: "推し活たこ団扇", img: "https://ul.h3z.jp/jY5MVsrt.jpg" },
      { no: "TN-049", name: "たこ焼きの御神体", img: "https://ul.h3z.jp/GQ8H0lGq.jpg" }
    ],
    UR: [
      { no: "TN-001", name: "黒き真珠イカさま焼き", img: "assets/images/1stcard/001ur1.png" },
      { no: "TN-007", name: "ローソク出せ！", img: "assets/images/1stcard/007ur1.png" },
      { no: "TN-033", name: "鉄板のビーナス", img: "assets/images/1stcard/033ur1.png" },
      { no: "TN-045", name: "ドリームファイト", img: "assets/images/1stcard/045ur1.png" }
    ],
    LR: [
      { no: "TN-025", name: "たこ焼き化石in函館山", img: "https://ul.h3z.jp/NEuFQ7PB.png" },
      { no: "TN-050", name: "焼かれし記憶、ソースに還る", img: "assets/images/1stcard/050lr1.png" }
    ]
  };

  
  const TAKOPI_SEED_POOL = [
  { id: "TP-001", name: "届け！たこぴ便", img: "https://ul.h3z.jp/rjih1Em9.png", rarity: "N" },
  { id: "TP-002", name: "ハロウィンたこぴ", img: "https://ul.h3z.jp/hIDWKss0.png", rarity: "N" },
  { id: "TP-003", name: "紅葉たこぴ", img: "https://ul.h3z.jp/G05m1hbT.png", rarity: "N" },
  { id: "TP-004", name: "クリスマスたこぴ", img: "https://ul.h3z.jp/FGEKvxhK.png", rarity: "N" },
  { id: "TP-005", name: "お年玉たこぴ", img: "https://ul.h3z.jp/OPz58Wt6.png", rarity: "N" },
  { id: "TP-006", name: "バレンタインたこぴ", img: "https://ul.h3z.jp/J0kj3CLb.png", rarity: "N" },
  { id: "TP-007", name: "花見たこぴ", img: "https://ul.h3z.jp/KrCy4WQb.png", rarity: "N" },
  { id: "TP-008", name: "入学たこぴ", img: "https://ul.h3z.jp/DidPdK9b.png", rarity: "N" },
  { id: "TP-009", name: "こいのぼりたこぴ", img: "https://takoyaki-card.com/town/assets/images/takopi/takopi9.png", rarity: "N" }
];

  const BUSSASARI_POOL = [
    { id: "BS-001", name: "たこ焼きダーツインフェルノ《對馬裕佳子》", img: "https://ul.h3z.jp/l5roYZJ4.png", rarity: "N" },
    { id: "BS-002", name: "店主反撃レビュー《佐俣雄一郎》", img: "https://ul.h3z.jp/BtOTLlSo.png", rarity: "N" },
    { id: "BS-003", name: "自己啓発タコ塾《井上諒》", img: "https://ul.h3z.jp/P5vsAste.png", rarity: "N" },
    { id: "BS-004", name: "カロリーゼロ理論《仁木治》", img: "https://ul.h3z.jp/ZGBzzH2r.png", rarity: "N" },
    { id: "BS-005", name: "白い契約《稲石裕》", img: "https://ul.h3z.jp/nmiaCKae.png", rarity: "N" },
  ];

  const NAMARA_POOL = [
    { id: "NK-001", name: "イカさま焼き", img: "https://ul.h3z.jp/1UB3EY1B.png", rarity: "LR" },
    { id: "NK-002", name: "定番のソース", img: "https://ul.h3z.jp/MBZcFmq9.png", rarity: "N" },
    { id: "NK-003", name: "すっぴん", img: "https://ul.h3z.jp/A6botkfp.png", rarity: "N" },
    { id: "NK-004", name: "チーズソースマヨ", img: "https://ul.h3z.jp/MmkNjIJM.png", rarity: "SR" },
    { id: "NK-005", name: "めんたいマヨ", img: "https://ul.h3z.jp/9oc1iVPt.png", rarity: "SR" },
    { id: "NK-006", name: "ねぎ味噌", img: "https://ul.h3z.jp/vf60iccW.png", rarity: "SR" },
    { id: "NK-007", name: "牡蠣だし醤油", img: "https://ul.h3z.jp/zwVHhrgx.png", rarity: "SR" },
    { id: "NK-008", name: "塩こしょう", img: "https://ul.h3z.jp/KlgnlC2H.png", rarity: "UR" },
    { id: "NK-009", name: "辛口ソース", img: "https://ul.h3z.jp/OavcxTBn.png", rarity: "R" },
    { id: "NK-010", name: "ぶっかけ揚げ玉からしマヨ", img: "https://ul.h3z.jp/CcOw6yLq.png", rarity: "SR" },
    { id: "NK-011", name: "塩マヨペッパー", img: "https://ul.h3z.jp/7UJoTCe7.png", rarity: "R" },
    { id: "NK-012", name: "てりたま", img: "https://ul.h3z.jp/MU6ehdTH.png", rarity: "SR" },
    { id: "NK-013", name: "濃厚たらマヨ", img: "https://takoyaki-card.com/town/assets/images/shopcard/shop13.png", rarity: "UR" }
  ];

  const WATER_SPECIAL_CARDS = {
    rotten: [
      { id: "SP-MIZU-001", name: "腐敗したカード", img: "https://takoyaki-card.com/town/assets/images/sp/huhai.png", rarity: "SP" },
      { id: "SP-MIZU-002", name: "浸食したカード", img: "https://takoyaki-card.com/town/assets/images/sp/sinsykou.png", rarity: "SP" }
    ],
    sea: [
      { id: "SP-MIZU-001", name: "腐敗したカード", img: "https://takoyaki-card.com/town/assets/images/sp/huhai.png", rarity: "SP" },
      { id: "SP-MIZU-002", name: "浸食したカード", img: "https://takoyaki-card.com/town/assets/images/sp/sinsykou.png", rarity: "SP" }
    ]
  };

  const FIRST_SERIES_CARDS = [
    ...CARD_POOLS.N.map(v => ({ ...v, id: v.no, rarity: "N" })),
    ...CARD_POOLS.R.map(v => ({ ...v, id: v.no, rarity: "R" })),
    ...CARD_POOLS.SR.map(v => ({ ...v, id: v.no, rarity: "SR" })),
    ...CARD_POOLS.UR.map(v => ({ ...v, id: v.no, rarity: "UR" })),
    ...CARD_POOLS.LR.map(v => ({ ...v, id: v.no, rarity: "LR" }))
  ];

  const EXTRA_SERIES_CARDS = [
    ...TAKOPI_SEED_POOL.map(v => ({ ...v, id: v.id, rarity: v.rarity || "UR" })),
    ...BUSSASARI_POOL.map(v => ({ ...v, id: v.id, rarity: v.rarity || "UR" })),
    ...NAMARA_POOL.map(v => ({ ...v, id: v.id, rarity: v.rarity || "UR" })),
    ...WATER_SPECIAL_CARDS.rotten.map(v => ({ ...v, id: `${v.id}_rotten`, rarity: v.rarity || "SP" })),
    ...WATER_SPECIAL_CARDS.sea.map(v => ({ ...v, id: `${v.id}_sea`, rarity: v.rarity || "SP" }))
  ];

  // 伝説マッチでは水SPカードを出さない
  const LEGEND_EXTRA_SERIES_CARDS = EXTRA_SERIES_CARDS.filter(v => !/^SP-MIZU-/.test(String(v.id || "")));

  const CARDS_ALL = [...FIRST_SERIES_CARDS, ...EXTRA_SERIES_CARDS];
  const CARD_MAP = Object.fromEntries(CARDS_ALL.map(v => [v.id, v]));

  // =========================================================
  // Reward items
  // =========================================================
  const SEEDS = [
    { id: "seed_random", name: "なに出るタネ" },
    { id: "seed_shop", name: "店頭タネ" },
    { id: "seed_line", name: "回線タネ" },
    { id: "seed_special", name: "たこぴのタネ" },
    { id: "seed_bussasari", name: "ブッ刺さりタネ" },
    { id: "seed_namara_kawasar", name: "なまら買わさるタネ" }
  ];

  const WATERS = [
    { id: "water_plain_free", name: "ただの水" },
    { id: "water_nice", name: "なんか良さそうな水" },
    { id: "water_suspicious", name: "怪しい水" },
    { id: "water_overdo", name: "やりすぎな水" },
    { id: "water_regret", name: "押さなきゃよかった水" },
    { id: "water_rotten", name: "腐ったミズ" },
    { id: "water_sea", name: "海水" },
    { id: "water_yunokawa", name: "ゆのかわの温泉ミズ" },
    { id: "water_supergod", name: "超神水" }
  ];

  const FERTS = [
    { id: "fert_agedama", name: "ただの揚げ玉" },
    { id: "fert_feel", name: "気のせい肥料" },
    { id: "fert_guts", name: "根性論ぶち込み肥料" },
    { id: "fert_skip", name: "工程すっ飛ばし肥料" },
    { id: "fert_timeno", name: "時間を信じない肥料" },
    { id: "fert_balance", name: "天秤にかけた肥料" },
    { id: "fert_sleep", name: "寝かせた肥料" },
    { id: "fert_takoyaki", name: "たこ焼き風味の肥料" },
    { id: "fert_drop", name: "天からの一滴" }
  ];

  const REWARD_ITEMS = {
    seed: Object.fromEntries(SEEDS.map(v => [v.id, v])),
    water: Object.fromEntries(WATERS.map(v => [v.id, v])),
    fert: Object.fromEntries(FERTS.map(v => [v.id, v]))
  };

  const REWARD_PROFILES = {
    careful: {
      fixed: [["water", "water_plain_free"]],
      rand: [
        ["fert", "fert_feel", 18],
        ["seed", "seed_random", 18],
        ["water", "water_nice", 12],
        ["fert", "fert_takoyaki", 8]
      ]
    },
    impulse: {
      fixed: [["water", "water_nice"]],
      rand: [
        ["seed", "seed_shop", 18],
        ["seed", "seed_line", 10],
        ["fert", "fert_guts", 10],
        ["fert", "fert_balance", 8]
      ]
    },
    looker: {
      fixed: [["water", "water_plain_free"]],
      rand: [
        ["water", "water_regret", 8],
        ["fert", "fert_agedama", 12],
        ["seed", "seed_random", 16],
        ["fert", "fert_balance", 6]
      ]
    },
    picky: {
      fixed: [["water", "water_rotten"]],
      rand: [
        ["water", "water_sea", 14],
        ["fert", "fert_timeno", 8],
        ["seed", "seed_bussasari", 6],
        ["fert", "fert_sleep", 8]
      ]
    },
    king: {
      fixed: [["water", "water_yunokawa"]],
      rand: [
        ["seed", "seed_namara_kawasar", 12],
        ["seed", "seed_special", 8],
        ["fert", "fert_skip", 10],
        ["fert", "fert_drop", 5]
      ]
    },
    flipper: {
      fixed: [["water", "water_nice"]],
      rand: [
        ["fert", "fert_feel", 12],
        ["water", "water_regret", 8],
        ["seed", "seed_random", 14],
        ["fert", "fert_balance", 8]
      ]
    },
    rich: {
      fixed: [["water", "water_overdo"], ["seed", "seed_namara_kawasar"]],
      rand: [
        ["water", "water_supergod", 8],
        ["seed", "seed_bussasari", 18],
        ["fert", "fert_timeno", 12],
        ["fert", "fert_drop", 10],
        ["fert", "fert_sleep", 8]
      ]
    },
    climber: {
      fixed: [["water", "water_suspicious"]],
      rand: [
        ["fert", "fert_guts", 15],
        ["seed", "seed_line", 10],
        ["seed", "seed_shop", 12],
        ["fert", "fert_takoyaki", 8]
      ]
    },
    guide: {
      fixed: [["water", "water_plain_free"], ["seed", "seed_random"]],
      rand: [
        ["fert", "fert_feel", 18],
        ["water", "water_nice", 12],
        ["fert", "fert_takoyaki", 8]
      ]
    },
    relax: {
      fixed: [["water", "water_plain_free"]],
      rand: [
        ["seed", "seed_random", 16],
        ["fert", "fert_feel", 16],
        ["water", "water_nice", 8],
        ["fert", "fert_takoyaki", 10]
      ]
    },
    artisan: {
      fixed: [["fert", "fert_guts"]],
      rand: [
        ["fert", "fert_skip", 18],
        ["water", "water_suspicious", 10],
        ["seed", "seed_shop", 12],
        ["fert", "fert_balance", 8],
        ["fert", "fert_takoyaki", 8]
      ]
    },
    diet: {
      fixed: [["fert", "fert_agedama"]],
      rand: [
        ["water", "water_regret", 10],
        ["fert", "fert_feel", 12],
        ["seed", "seed_random", 18],
        ["fert", "fert_takoyaki", 8]
      ]
    },
    overflow: {
      fixed: [["water", "water_rotten"]],
      rand: [
        ["water", "water_sea", 12],
        ["fert", "fert_timeno", 8],
        ["seed", "seed_bussasari", 6],
        ["fert", "fert_sleep", 8],
        ["fert", "fert_drop", 4]
      ]
    },
    collector: {
      fixed: [["seed", "seed_special"]],
      rand: [
        ["water", "water_yunokawa", 10],
        ["seed", "seed_namara_kawasar", 10],
        ["fert", "fert_skip", 8],
        ["fert", "fert_sleep", 10]
      ]
    },
    shadow: {
      fixed: [["water", "water_suspicious"]],
      rand: [
        ["water", "water_rotten", 8],
        ["water", "water_sea", 10],
        ["water", "water_overdo", 8],
        ["fert", "fert_sleep", 8]
      ]
    },
    ramen: {
      fixed: [["seed", "seed_random"]],
      rand: [
        ["seed", "seed_shop", 12],
        ["fert", "fert_guts", 10],
        ["fert", "fert_feel", 12],
        ["fert", "fert_takoyaki", 8]
      ]
    },
    streamer: {
      fixed: [],
      rand: [
        ["water", "water_nice", 12],
        ["seed", "seed_special", 8],
        ["fert", "fert_skip", 8],
        ["seed", "seed_bussasari", 10],
        ["fert", "fert_balance", 8]
      ]
    },
    gourmet: {
      fixed: [["water", "water_yunokawa"]],
      rand: [
        ["water", "water_nice", 14],
        ["seed", "seed_namara_kawasar", 10],
        ["fert", "fert_feel", 10],
        ["fert", "fert_takoyaki", 12],
        ["fert", "fert_sleep", 6]
      ]
    },
    opener: {
      fixed: [["water", "water_nice"]],
      rand: [
        ["seed", "seed_shop", 16],
        ["seed", "seed_line", 10],
        ["fert", "fert_skip", 8],
        ["fert", "fert_balance", 8]
      ]
    },
    party: {
      fixed: [["seed", "seed_random"]],
      rand: [
        ["seed", "seed_shop", 12],
        ["water", "water_nice", 12],
        ["fert", "fert_guts", 10],
        ["fert", "fert_balance", 8],
        ["fert", "fert_takoyaki", 8]
      ]
    },
    pilgrim: {
      fixed: [["water", "water_overdo"], ["fert", "fert_timeno"]],
      rand: [
        ["water", "water_supergod", 10],
        ["seed", "seed_special", 10],
        ["seed", "seed_bussasari", 14],
        ["fert", "fert_drop", 10],
        ["fert", "fert_sleep", 8]
      ]
    }
  };

  function itemIcon(kind) {
    if (kind === "seed") return "🌱";
    if (kind === "water") return "💧";
    return "🧪";
  }

  function itemLabel(kind, id) {
    return REWARD_ITEMS[kind]?.[id]?.name || id;
  }

  // =========================================================
  // Affection
  // =========================================================
  function loadAffectionState() {
    const raw = localStorage.getItem(AFFECTION_LS_KEY);
    const parsed = safeJSONParse(raw, null);
    if (!parsed || typeof parsed !== "object") {
      return { ver: 1, guests: {} };
    }
    if (!parsed.guests || typeof parsed.guests !== "object") {
      parsed.guests = {};
    }
    return parsed;
  }

  function addAffection(id, delta) {
    const state = loadAffectionState();
    if (!state.guests[id]) {
      state.guests[id] = {
        love: 0,
        talkCount: 0,
        buyCount: 0,
        ignoreCount: 0,
        lastTalkAt: 0,
        lastSeenAt: 0
      };
    }
    state.guests[id].love = clamp(Number(state.guests[id].love || 0) + Number(delta || 0), 0, 100);
    state.guests[id].lastSeenAt = Date.now();
    localStorage.setItem(AFFECTION_LS_KEY, JSON.stringify(state));
    return state.guests[id].love;
  }

  function heartsFromLove(love) {
    const n = Number(love || 0);
    if (n >= 80) return 5;
    if (n >= 60) return 4;
    if (n >= 40) return 3;
    if (n >= 20) return 2;
    if (n >= 8) return 1;
    return 0;
  }

  function isRegularLove(love) {
    return Number(love || 0) >= REGULAR_LOVE_THRESHOLD;
  }

  function affectionLabel(type, love) {
    const n = Number(love || 0);

    const map = {
      impulse: ["まだ勢いだけで来ています。", "ノリだけじゃない相性を感じ始めています。", "勢いで来て、情で通う常連です。"],
      picky: ["まだ厳しく見定めています。", "少しずつ認め始めています。", "うるさいけど、かなり気に入っています。"],
      king: ["まだ試している側です。", "価値を認め始めています。", "王が認めた相手。かなり強いです。"],
      flipper: ["まだ打算で見ています。", "数字以外も少し見えてきています。", "打算のはずが、情まで乗っています。"],
      careful: ["まだ慎重に様子見しています。", "少しずつ安心しています。", "かなり信頼しています。"],
      looker: ["まだ“見るだけ”の距離感です。", "眺めるだけでは済まなくなっています。", "口では軽いのに、かなり好きです。"],
      rich: ["まだ値段で測っています。", "値段以外の面白さも認め始めています。", "財布より先に心が動いています。"],
      climber: ["まだ試練として見ています。", "登る価値があると感じ始めています。", "景色が見える位置まで来ています。"],
      guide: ["まだ外から案内しています。", "語りたくなる相手になってきています。", "もう半分この店の語り部です。"],
      relax: ["まだ様子見です。", "居心地の良さを感じ始めています。", "癒やし目当てでも来ています。"],
      artisan: ["まだ仕事目線です。", "腕を認め始めています。", "技術ごと信頼しています。"],
      diet: ["まだ理屈で距離を取っています。", "理論の中に好意が混ざっています。", "もはや理屈を超えています。"],
      overflow: ["まだ枠外から見ています。", "ズレまで楽しみ始めています。", "規格外どうし、相性が良いです。"],
      collector: ["まだ管理対象です。", "保存以上の感情が出てきています。", "かなり大切な相手認定です。"],
      shadow: ["まだ慎重に距離を測っています。", "守る価値を感じ始めています。", "信用しているから近いです。"],
      ramen: ["まだ濃さだけ見ています。", "味わうように通っています。", "締めに寄りたくなる相手です。"],
      streamer: ["まだネタとして見ています。", "映え以上の面白さを感じています。", "本気で推したくなっています。"],
      gourmet: ["まだ厳しく品定めしています。", "余韻を感じ始めています。", "かなり深く気に入っています。"],
      opener: ["まだ勢いで近づいています。", "テンション以上に楽しんでいます。", "勢い込みでかなり好きです。"],
      party: ["まだ祭りのノリです。", "ノリ以上の居場所感が出てきています。", "騒がしいけど本気です。"],
      pilgrim: ["まだ巡礼先のひとつです。", "来た意味がある場所だと思い始めています。", "わざわざ来る価値があると確信しています。"]
    };

    const row = map[type] || ["まだ距離を測っています。", "少しずつ距離が縮んでいます。", "かなり気に入っています。"];
    if (n >= 80) return row[2];
    if (n >= 40) return row[1];
    return row[0];
  }

  function getAffectionRows() {
    const state = loadAffectionState();
    const rows = Object.keys(state.guests).map((id) => {
      const g = state.guests[id] || {};
      const love = Number(g.love || 0);
      return {
        id,
        name: CUSTOMER_NAME_MAP[id] || id,
        icon: CUSTOMER_ICON_MAP[id] || "",
        love,
        hearts: heartsFromLove(love),
        talkCount: Number(g.talkCount || 0),
        buyCount: Number(g.buyCount || 0),
        ignoreCount: Number(g.ignoreCount || 0),
        isRegular: isRegularLove(love),
        label: affectionLabel(id, love),
        lastSeenAt: Number(g.lastSeenAt || 0)
      };
    });

    rows.sort((a, b) =>
      (Number(b.isRegular) - Number(a.isRegular)) ||
      (b.love - a.love) ||
      (b.lastSeenAt - a.lastSeenAt) ||
      String(a.name).localeCompare(String(b.name), "ja")
    );

    return rows;
  }

  function renderAffectionModal() {
    const list = $("#affectionList");
    const empty = $("#affectionEmpty");
    if (!list || !empty) return;

    const rows = getAffectionRows();
    list.innerHTML = "";

    if (!rows.length) {
      empty.classList.remove("hidden");
      return;
    }

    empty.classList.add("hidden");

    list.innerHTML = rows.map(row => {
      const hearts = Array.from({ length: 5 }, (_, i) =>
        `<span class="${i < row.hearts ? "on" : "off"}">♥</span>`
      ).join("");

      return `
        <article class="affectionItem">
          <div class="affectionItemTop">
            <div class="affectionIcon">
              ${row.icon ? `<img src="${escapeHtml(row.icon)}" alt="${escapeHtml(row.name)}">` : ``}
            </div>

            <div class="affectionMain">
              <div class="affectionNameRow">
                <div class="affectionName">${escapeHtml(row.name)}</div>
                ${row.isRegular ? `<span class="affectionRegular">常連</span>` : ``}
              </div>
              <div class="affectionDesc">${escapeHtml(row.label)}</div>
              <div class="affectionSub">会話 ${row.talkCount}回 ・ 放置 ${row.ignoreCount}回</div>
            </div>

            <div class="affectionMeta">
              <div class="affectionLove">好感度 ${row.love}/100</div>
              <div class="affectionHearts">${hearts}</div>
            </div>
          </div>

          <div class="affectionGaugeWrap">
            <div class="affectionGauge">
              <div class="affectionGaugeBar" style="width:${clamp(row.love, 0, 100)}%"></div>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function openAffectionModal() {
    const modal = $("#affectionModal");
    if (!modal) return;
    renderAffectionModal();
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeAffectionModal() {
    const modal = $("#affectionModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  // =========================================================
  // Storage helpers
  // =========================================================
  function getOcto() {
    return Number(localStorage.getItem(KEY.octo) || 0);
  }

  function addOcto(delta) {
    const next = Math.max(0, getOcto() + Number(delta || 0));
    localStorage.setItem(KEY.octo, String(next));
    return next;
  }

  function getHeat() {
    return Number(localStorage.getItem(KEY.heat) || 0);
  }

  function setHeat(value) {
    const next = Math.max(0, Number(value || 0));
    localStorage.setItem(KEY.heat, String(next));
    return next;
  }

  function addHeat(delta) {
    return setHeat(getHeat() + Number(delta || 0));
  }

  // =========================================================
  // Book normalize helpers
  // =========================================================
  function normalizeBookEntry(cardId, rawEntry) {
    const info = CARD_MAP[cardId] || { id: cardId, name: cardId, rarity: "N", img: "" };

    if (rawEntry == null) return null;

    let count = 0;
    let base = {};

    if (typeof rawEntry === "number") {
      count = Math.max(0, Math.floor(rawEntry));
    } else if (typeof rawEntry === "boolean") {
      count = rawEntry ? 1 : 0;
    } else if (typeof rawEntry === "string") {
      const n = Number(rawEntry);
      count = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
    } else if (typeof rawEntry === "object") {
      base = rawEntry;

      if (typeof rawEntry.count === "number" || typeof rawEntry.count === "string") {
        count = Number(rawEntry.count);
      } else if (typeof rawEntry.owned === "number" || typeof rawEntry.owned === "string") {
        count = Number(rawEntry.owned);
      } else if (typeof rawEntry.qty === "number" || typeof rawEntry.qty === "string") {
        count = Number(rawEntry.qty);
      } else {
        count = 1;
      }

      count = Math.max(0, Math.floor(Number(count) || 0));
    }

    if (count <= 0) return null;

    return {
      ...base,
      id: base.id || info.id || cardId,
      name: base.name || info.name || cardId,
      img: base.img || info.img || "",
      rarity: base.rarity || info.rarity || "N",
      tier: base.tier || base.rarity || info.rarity || "N",
      at: base.at ?? "",
      lastAt: base.lastAt ?? "",
      lastAddedAt: base.lastAddedAt ?? "",
      count
    };
  }

  function getBook() {
    const book = loadJSON(KEY.book, { ver: 1, got: {} });

    if (!book || typeof book !== "object") {
      return { ver: 1, got: {} };
    }

    if (!book.got || typeof book.got !== "object") {
      book.got = {};
    }

    const normalizedGot = {};
    let changed = false;

    for (const [cardId, rawEntry] of Object.entries(book.got)) {
      const normalized = normalizeBookEntry(cardId, rawEntry);
      if (!normalized) {
        changed = true;
        continue;
      }

      normalizedGot[cardId] = normalized;

      if (
        typeof rawEntry !== "object" ||
        rawEntry == null ||
        String(rawEntry.id || "") !== String(normalized.id || "") ||
        String(rawEntry.name || "") !== String(normalized.name || "") ||
        String(rawEntry.img || "") !== String(normalized.img || "") ||
        String(rawEntry.rarity || "") !== String(normalized.rarity || "") ||
        String(rawEntry.tier || "") !== String(normalized.tier || "") ||
        String(rawEntry.at ?? "") !== String(normalized.at ?? "") ||
        String(rawEntry.lastAt ?? "") !== String(normalized.lastAt ?? "") ||
        String(rawEntry.lastAddedAt ?? "") !== String(normalized.lastAddedAt ?? "") ||
        Number(rawEntry.count || 0) !== Number(normalized.count || 0)
      ) {
        changed = true;
      }
    }

    book.got = normalizedGot;
    if (!("ver" in book)) book.ver = 1;

    if (changed) {
      saveBook(book);
    }

    return book;
  }

  function saveBook(book) {
    if (!book || typeof book !== "object") {
      saveJSON(KEY.book, { ver: 1, got: {} });
      return;
    }

    const next = {
      ver: "ver" in book ? book.ver : 1,
      got: {}
    };

    const rawGot = (book.got && typeof book.got === "object") ? book.got : {};

    for (const [cardId, rawEntry] of Object.entries(rawGot)) {
      const normalized = normalizeBookEntry(cardId, rawEntry);
      if (!normalized) continue;
      next.got[cardId] = normalized;
    }

    saveJSON(KEY.book, next);
  }

  function getOwnedCount(cardId) {
    const book = getBook();
    const entry = book.got?.[cardId];
    return Math.max(0, Math.floor(Number(entry?.count || 0)));
  }

  function addOwned(cardId, delta) {
    const book = getBook();
    const info = CARD_MAP[cardId] || { id: cardId, name: cardId, rarity: "N", img: "" };

    const current = normalizeBookEntry(cardId, book.got?.[cardId]) || {
      id: cardId,
      name: info.name,
      img: info.img || "",
      rarity: info.rarity || "N",
      tier: info.rarity || "N",
      at: "",
      lastAt: "",
      lastAddedAt: "",
      count: 0
    };

    const now = Date.now();
    const nextCount = Math.max(0, Math.floor(Number(current.count || 0) + Number(delta || 0)));

    if (nextCount <= 0) {
      delete book.got[cardId];
    } else {
      book.got[cardId] = {
        ...current,
        id: current.id || cardId,
        name: current.name || info.name || cardId,
        img: current.img || info.img || "",
        rarity: current.rarity || info.rarity || "N",
        tier: current.tier || current.rarity || info.rarity || "N",
        at: current.at || now,
        lastAt: now,
        lastAddedAt: Number(delta || 0) > 0 ? now : (current.lastAddedAt || now),
        count: nextCount
      };
    }

    saveBook(book);
  }

  function addInventory(kind, id, qty) {
    const inv = loadJSON(KEY.inv, { ver: 1, seed: {}, water: {}, fert: {} });
    inv.seed = inv.seed || {};
    inv.water = inv.water || {};
    inv.fert = inv.fert || {};
    inv[kind] = inv[kind] || {};
    inv[kind][id] = Number(inv[kind][id] || 0) + Number(qty || 0);
    saveJSON(KEY.inv, inv);
  }

  function autoRepairBook() {
    const book = loadJSON(KEY.book, null);
    if (!book || typeof book !== "object" || !book.got || typeof book.got !== "object") return;

    let changed = false;
    const nextGot = {};

    for (const [cardId, rawEntry] of Object.entries(book.got)) {
      const normalized = normalizeBookEntry(cardId, rawEntry);
      if (!normalized) continue;

      const info = CARD_MAP[cardId] || null;

      if (!normalized.img && info?.img) {
        normalized.img = info.img;
        changed = true;
      }

      if (!normalized.name && info?.name) {
        normalized.name = info.name;
        changed = true;
      }

      if (!normalized.rarity && info?.rarity) {
        normalized.rarity = info.rarity;
        changed = true;
      }

      if (!normalized.tier) {
        normalized.tier = normalized.rarity || info?.rarity || "N";
        changed = true;
      }

      if (!normalized.id) {
        normalized.id = cardId;
        changed = true;
      }

      nextGot[cardId] = normalized;
    }

    if (changed) {
      book.got = nextGot;
      saveBook(book);
    }
  }

  function ensureDefaults() {
    if (localStorage.getItem(KEY.octo) == null) {
      localStorage.setItem(KEY.octo, "1000");
    }

    if (localStorage.getItem(KEY.heat) == null) {
      localStorage.setItem(KEY.heat, "0");
    }

    const inv = loadJSON(KEY.inv, null);
    if (!inv || typeof inv !== "object") {
      saveJSON(KEY.inv, { ver: 1, seed: {}, water: {}, fert: {} });
    } else {
      inv.seed = inv.seed && typeof inv.seed === "object" ? inv.seed : {};
      inv.water = inv.water && typeof inv.water === "object" ? inv.water : {};
      inv.fert = inv.fert && typeof inv.fert === "object" ? inv.fert : {};
      if (!("ver" in inv)) inv.ver = 1;
      saveJSON(KEY.inv, inv);
    }

    const meta = loadJSON(KEY.matchingMeta, null);
    if (!meta || typeof meta !== "object") {
      saveJSON(KEY.matchingMeta, {
        totalAttempts: 0,
        totalSuccess: 0,
        totalFail: 0,
        statsByType: {}
      });
    } else {
      meta.totalAttempts = Number(meta.totalAttempts || 0);
      meta.totalSuccess = Number(meta.totalSuccess || 0);
      meta.totalFail = Number(meta.totalFail || 0);
      meta.statsByType = meta.statsByType && typeof meta.statsByType === "object"
        ? meta.statsByType
        : {};
      saveJSON(KEY.matchingMeta, meta);
    }

    const book = loadJSON(KEY.book, null);
    if (!book || typeof book !== "object") {
      saveJSON(KEY.book, { ver: 1, got: {} });
    } else {
      saveBook(book);
    }

    const affection = loadJSON(AFFECTION_LS_KEY, null);
    if (!affection || typeof affection !== "object" || !affection.guests || typeof affection.guests !== "object") {
      localStorage.setItem(AFFECTION_LS_KEY, JSON.stringify({ ver: 1, guests: {} }));
    } else {
      if (!("ver" in affection)) affection.ver = 1;
      localStorage.setItem(AFFECTION_LS_KEY, JSON.stringify(affection));
    }
  }

  // =========================================================
  // Meta / stats
  // =========================================================
  function getMeta() {
    return loadJSON(KEY.matchingMeta, {
      totalAttempts: 0,
      totalSuccess: 0,
      totalFail: 0,
      statsByType: {}
    });
  }

  function saveMeta(meta) {
    saveJSON(KEY.matchingMeta, meta);
  }

  function ensureTypeStats(meta, type) {
    meta.statsByType[type] = meta.statsByType[type] || { attempts: 0, success: 0, fail: 0 };
    return meta.statsByType[type];
  }

  function commitFinalFail(meta, jobType) {
    meta.totalAttempts += 1;
    meta.totalFail += 1;
    const typeStats = ensureTypeStats(meta, jobType);
    typeStats.attempts += 1;
    typeStats.fail += 1;
    saveMeta(meta);
  }

  function commitSuccess(meta, jobType) {
    meta.totalAttempts += 1;
    meta.totalSuccess += 1;
    const typeStats = ensureTypeStats(meta, jobType);
    typeStats.attempts += 1;
    typeStats.success += 1;
    saveMeta(meta);
  }

  // =========================================================
  // Hint generation
  // =========================================================
  function deriveTags(card) {
    const tags = new Set();
    const name = card.name || "";

    if (/ソース|味噌|塩|マヨ|明太|チーズ|牡蠣/.test(name)) tags.add("taste");
    if (/ソース/.test(name)) tags.add("sauce");
    if (/塩/.test(name)) tags.add("salt");
    if (/マヨ/.test(name)) tags.add("mayo");
    if (/明太/.test(name)) tags.add("mentai");
    if (/チーズ/.test(name)) tags.add("cheese");
    if (/味噌/.test(name)) tags.add("miso");
    if (/牡蠣/.test(name)) tags.add("oyster");

    if (/温泉|ゆのかわ/.test(name)) tags.add("onsen");
    if (/露店|店主|店頭/.test(name)) tags.add("shop");
    if (/ダーツ|プロ🎯/.test(name)) tags.add("darts");
    if (/恋|デート|契約|マッチング/.test(name)) tags.add("love");
    if (/神|御神体|女神|ビーナス/.test(name)) tags.add("god");
    if (/真珠|黒き|イカ/.test(name)) tags.add("dark_special");
    if (/火山|地獄|インフェルノ|熱々|焼ク/.test(name)) tags.add("heat");
    if (/記憶|化石|ループ|転生/.test(name)) tags.add("memory");
    if (/行列|大会|会議/.test(name)) tags.add("crowd");
    if (/発射|爆走|ライダー|ドローン/.test(name)) tags.add("speed");
    if (/トラップ|詐欺|迷惑/.test(name)) tags.add("danger");

    return Array.from(tags);
  }

  function buildHint1(card, isExtraPool) {
    const name = card.name || "";
    const tags = deriveTags(card);
    const candidates = [];

    if (isExtraPool) {
      candidates.push(
        "第一弾の外から来た特別枠じゃなイカ",
        "普通の第一弾とは別の流れにいるじゃなイカ",
        "特別セット側を探すと近いじゃなイカ"
      );
    }

    if (/ソース|塩|マヨ|明太|チーズ|味噌|牡蠣/.test(name) || tags.includes("taste")) {
      candidates.push(
        "味つけやメニュー名っぽいカードじゃなイカ",
        "食べ方や味の名前が入るカードじゃなイカ",
        "ソース・塩・マヨ系から探すと近いじゃなイカ"
      );
    }

    if (tags.includes("love")) {
      candidates.push(
        "恋愛っぽい名前のカードじゃなイカ",
        "気持ちや関係を感じる名前じゃなイカ",
        "恋・デート・契約っぽい空気じゃなイカ"
      );
    }

    if (tags.includes("darts")) {
      candidates.push(
        "ダーツやプロ選手に関係あるカードじゃなイカ",
        "競技っぽい雰囲気のカードじゃなイカ",
        "ダーツ系から探すと近いじゃなイカ"
      );
    }

    if (tags.includes("shop")) {
      candidates.push(
        "お店・露店・店主に関係あるカードじゃなイカ",
        "店っぽい言葉が入るカードじゃなイカ",
        "お店まわりのカードじゃなイカ"
      );
    }

    if (tags.includes("onsen")) {
      candidates.push(
        "温泉や場所のイメージが強いカードじゃなイカ",
        "ゆのかわ寄りの気配じゃなイカ",
        "場所を思い出すと近いじゃなイカ"
      );
    }

    if (tags.includes("god")) {
      candidates.push(
        "特別感が強いカードじゃなイカ",
        "神・女神・御神体っぽい空気じゃなイカ",
        "ありがたそうな気配じゃなイカ"
      );
    }

    if (tags.includes("crowd")) {
      candidates.push(
        "大会・会議・行列みたいに人が多いじゃなイカ",
        "人が集まってる場面のカードじゃなイカ",
        "にぎやかな感じじゃなイカ"
      );
    }

    if (tags.includes("heat")) {
      candidates.push(
        "熱さや火力を感じるカードじゃなイカ",
        "アツい雰囲気のカードじゃなイカ",
        "火力高めのイメージじゃなイカ"
      );
    }

    if (tags.includes("memory")) {
      candidates.push(
        "昔・記憶・過去っぽいカードじゃなイカ",
        "時間や思い出を感じるカードじゃなイカ",
        "懐かしさのあるカードじゃなイカ"
      );
    }

    if (tags.includes("speed")) {
      candidates.push(
        "走る・飛ぶ・勢いがあるカードじゃなイカ",
        "動きが強いカードじゃなイカ",
        "スピード感があるじゃなイカ"
      );
    }

    if (tags.includes("danger") || tags.includes("dark_special")) {
      candidates.push(
        "ちょっと怪しい感じのカードじゃなイカ",
        "普通じゃない空気があるじゃなイカ",
        "クセ強めのカードじゃなイカ"
      );
    }

    if (!candidates.length) {
      if (card.rarity === "N" || card.rarity === "R") {
        candidates.push(
          "第一弾の中でも探しやすい側じゃなイカ",
          "基本寄りのカードじゃなイカ",
          "図鑑を広く見れば見つけやすいじゃなイカ"
        );
      } else {
        candidates.push(
          "第一弾の中でも印象が強いじゃなイカ",
          "目立つタイプのカードじゃなイカ",
          "ちょっと特別感があるじゃなイカ"
        );
      }
    }

    return pick(candidates, randFromSeed(`hint1::${todayKey()}::${card.id}`));
  }

  function buildHint2(card, isExtraPool) {
    const candidates = [];

    if (isExtraPool) {
      candidates.push(
        "かなり特別でレア寄りじゃなイカ",
        "普通の手札ではあまり見かけないじゃなイカ",
        "特別枠だから持ってる人が少なめじゃなイカ"
      );
      return pick(candidates, randFromSeed(`hint2-extra::${todayKey()}::${card.id}`));
    }

    if (card.rarity === "N") {
      candidates.push(
        "かなり見つけやすいほうじゃなイカ",
        "手持ちにある人が多いほうじゃなイカ",
        "最初に探すと見つけやすいレベルじゃなイカ"
      );
    } else if (card.rarity === "R") {
      candidates.push(
        "少し珍しいけど、まだ見つけやすいじゃなイカ",
        "Nより一段だけ珍しいじゃなイカ",
        "ちょっと探せば見つかるレベルじゃなイカ"
      );
    } else if (card.rarity === "SR") {
      candidates.push(
        "そこそこレアじゃなイカ",
        "人によってはまだ持ってないじゃなイカ",
        "少し本気で探す側じゃなイカ"
      );
    } else if (card.rarity === "UR") {
      candidates.push(
        "かなりレアじゃなイカ",
        "上位レア寄りじゃなイカ",
        "簡単には出てこない側じゃなイカ"
      );
    } else if (card.rarity === "LR") {
      candidates.push(
        "最上位クラスでかなりレアじゃなイカ",
        "出会えたらかなりアツいじゃなイカ",
        "持ってる人がかなり少ないじゃなイカ"
      );
    } else if (card.rarity === "SP") {
      candidates.push(
        "特殊枠レベルでかなり珍しいじゃなイカ",
        "普通のレアよりさらに特別じゃなイカ",
        "かなり限られた人しか持ってないじゃなイカ"
      );
    }

    return pick(candidates, randFromSeed(`hint2::${todayKey()}::${card.id}`));
  }

  function getMiddle3(text) {
    if (!text) return "";
    if (text.length <= 3) return text;
    const start = Math.max(0, Math.floor((text.length - 3) / 2));
    return text.slice(start, start + 3);
  }

  function buildHint3(card) {
    const cleaned = (card.name || "").replace(/《.*?》/g, "").trim();
    if (!cleaned) return "名前の中にヒントがあるじゃなイカ";

    const variants = [
      `タイトルの最初の3文字は「${cleaned.slice(0, 3)}」じゃなイカ`,
      `タイトルの真ん中の3文字は「${getMiddle3(cleaned)}」じゃなイカ`,
      `タイトルの最後の3文字は「${cleaned.slice(-3)}」じゃなイカ`
    ];

    return pick(variants, randFromSeed(`hint3::${todayKey()}::${card.id}`));
  }

  function makeHintsForCard(card, isExtraPool) {
    return [
      buildHint1(card, isExtraPool),
      buildHint2(card, isExtraPool),
      buildHint3(card)
    ];
  }

  // =========================================================
  // Thoughts
  // =========================================================
  function makeKasumipiThought(card, isExtraPool, difficulty) {
    if (isExtraPool) {
      const lines = [
        "……これは第一弾の外から漂ってきた特別枠じゃなイカ",
        "……特別枠の願いは、だいたい重たいじゃなイカ",
        "……普通の手札じゃ届きにくい相手じゃなイカ"
      ];
      return pick(lines, randFromSeed(`${todayKey()}::thought-extra::${card.id}`));
    }

    const rarity = card.rarity || "N";
    const thoughtMap = {
      N: [
        "……この願いなら、まだ追いつけるじゃなイカ",
        "……会える可能性は高いじゃなイカ",
        "……手を伸ばせば届きそうじゃなイカ"
      ],
      R: [
        "……少し探せば、また会えそうじゃなイカ",
        "……思ってる人はそこそこ多いじゃなイカ",
        "……軽い願いより、ちょっと深いじゃなイカ"
      ],
      SR: [
        "……ここから急に本気度が上がるじゃなイカ",
        "……人によってはまだ会えてないじゃなイカ",
        "……選ぶ相手を間違えると刺さるじゃなイカ"
      ],
      UR: [
        "……現実はなかなか厳しいじゃなイカ",
        "……会えたらかなり強いじゃなイカ",
        "……在庫より覚悟の問題じゃなイカ"
      ],
      LR: [
        "……それ、本気で惚れてるんじゃなイカ？",
        "……会えたらもう奇跡じゃなイカ",
        "……かなり本気の願いじゃなイカ"
      ],
      SP: [
        "……もう運命の領域じゃなイカ",
        "……普通の難易度じゃないじゃなイカ",
        "……会える人、かなり限られるじゃなイカ"
      ]
    };

    if (difficulty >= 5 && rarity !== "LR" && rarity !== "SP") {
      return "……条件だけでもう重たいじゃなイカ";
    }

    return pick(thoughtMap[rarity] || thoughtMap.SR, randFromSeed(`${todayKey()}::thought::${card.id}`));
  }

  // =========================================================
  // Reward helpers
  // =========================================================
  function rewardOctoByRarity(rarity, rnd) {
    const map = {
      N: [320, 560],
      R: [620, 980],
      SR: [1100, 1600],
      UR: [1700, 2400],
      LR: [2900, 3900],
      SP: [3200, 4600]
    };
    const range = map[rarity] || [600, 1000];
    return Math.floor(rnd() * (range[1] - range[0] + 1)) + range[0];
  }

  function rewardOctoHighExtra(rnd) {
    const table = [
      { value: 4500, weight: 48 },
      { value: 5500, weight: 22 },
      { value: 6500, weight: 14 },
      { value: 7777, weight: 10 },
      { value: 9999, weight: 6 }
    ];
    return weightedPick(table, rnd).value;
  }

  function rewardExpByDifficulty(difficulty) {
    return Math.max(4, difficulty * 4);
  }

  function rewardAffectionByDifficulty(difficulty) {
    return Math.max(2, difficulty + 1);
  }

  function makeRewardItems(type, difficulty, rnd) {
    const profile = REWARD_PROFILES[type] || REWARD_PROFILES.careful;
    const out = [];

    for (const [kind, id] of profile.fixed) {
      out.push({ kind, id, qty: 1 });
    }

    const count = difficulty <= 2 ? 2 : difficulty === 3 ? 3 : difficulty === 4 ? 4 : 5;
    const randPool = profile.rand.map(([kind, id, weight]) => ({ kind, id, weight }));

    for (let i = 0; i < count; i++) {
      const p = weightedPick(randPool, rnd);
      out.push({ kind: p.kind, id: p.id, qty: 1 });
    }

    if (difficulty >= 5 && rnd() < 0.45) {
      const bonusPick = weightedPick(randPool, rnd);
      out.push({ kind: bonusPick.kind, id: bonusPick.id, qty: 1 });
    }

    const merged = new Map();
    out.forEach(item => {
      const key = `${item.kind}:${item.id}`;
      merged.set(key, {
        kind: item.kind,
        id: item.id,
        qty: (merged.get(key)?.qty || 0) + item.qty
      });
    });

    return Array.from(merged.values());
  }

  function calcFirstTryBonus(job) {
    return Math.max(400, Math.round(job.rewardOcto * 0.4));
  }

  // =========================================================
  // Board generation
  // =========================================================
  const CUSTOMER_TYPES = Object.keys(CUSTOMER_NAME_MAP);

  function buildWeightedCustomerPool() {
    const out = [];
    for (const type of CUSTOMER_TYPES) {
      const weight = CUSTOMER_RATE[type] || 1;
      for (let i = 0; i < weight; i++) out.push(type);
    }
    return out;
  }

  const CUSTOMER_WEIGHTED_POOL = buildWeightedCustomerPool();

  function uniqueCustomerTypes(count, rnd) {
    const set = new Set();
    let guard = 0;
    while (set.size < count && guard < 500) {
      set.add(pick(CUSTOMER_WEIGHTED_POOL, rnd));
      guard++;
    }
    return Array.from(set);
  }

  function getDisplayPoolByType(type, legend = false) {
    if (legend) {
      return LEGEND_EXTRA_SERIES_CARDS.length
        ? LEGEND_EXTRA_SERIES_CARDS
        : FIRST_SERIES_CARDS.filter(c => ["UR", "LR"].includes(c.rarity));
    }

    if (type === "gourmet") {
      return FIRST_SERIES_CARDS.filter(c => /焼き|ソース|マヨ|塩|明太|味噌|温泉|イカ/.test(c.name));
    }
    if (type === "collector") {
      return FIRST_SERIES_CARDS.filter(c => ["SR", "UR", "LR"].includes(c.rarity) || /御神体|真珠|記憶|神/.test(c.name));
    }
    if (type === "shadow" || type === "picky" || type === "overflow") {
      return FIRST_SERIES_CARDS.filter(c => ["SR", "UR", "LR"].includes(c.rarity));
    }
    if (type === "rich" || type === "king" || type === "pilgrim") {
      return FIRST_SERIES_CARDS.filter(c => ["SR", "UR", "LR"].includes(c.rarity));
    }
    if (type === "guide") {
      return FIRST_SERIES_CARDS.filter(c => ["N", "R"].includes(c.rarity));
    }
    if (type === "impulse" || type === "opener" || type === "streamer") {
      return FIRST_SERIES_CARDS.filter(c => ["N", "R", "SR"].includes(c.rarity));
    }
    if (type === "climber" || type === "artisan") {
      return FIRST_SERIES_CARDS.filter(c => ["R", "SR", "UR"].includes(c.rarity));
    }
    if (type === "party" || type === "ramen") {
      return FIRST_SERIES_CARDS.filter(c => ["N", "R", "SR", "UR"].includes(c.rarity));
    }
    return FIRST_SERIES_CARDS.filter(c => ["N", "R", "SR"].includes(c.rarity));
  }

  function getDifficultyForType(type, rnd) {
    if (type === "rich") return 5;
    if (type === "pilgrim") return rnd() < 0.55 ? 4 : 5;
    if (type === "king") return rnd() < 0.45 ? 4 : 5;
    if (type === "picky" || type === "shadow" || type === "overflow") return rnd() < 0.4 ? 4 : 5;
    if (type === "collector" || type === "artisan" || type === "climber" || type === "gourmet") return rnd() < 0.35 ? 3 : 4;
    if (type === "guide" || type === "careful" || type === "relax") return rnd() < 0.6 ? 2 : 3;
    if (type === "looker" || type === "diet") return rnd() < 0.55 ? 2 : 3;
    return rnd() < 0.34 ? 2 : rnd() < 0.72 ? 3 : 4;
  }

  function chooseWantedCard(type, difficulty, rnd, legend = false) {
    let pool = getDisplayPoolByType(type, legend);

    if (legend && LEGEND_EXTRA_SERIES_CARDS.length) {
      return { card: pick(LEGEND_EXTRA_SERIES_CARDS, rnd), qty: 1, isExtraPool: true };
    }

    if (difficulty >= 5) {
      const hardPool = pool.filter(c => ["UR", "LR", "SR"].includes(c.rarity));
      if (hardPool.length) pool = hardPool;
    } else if (difficulty === 4) {
      const midPool = pool.filter(c => ["SR", "UR", "R", "LR"].includes(c.rarity));
      if (midPool.length) pool = midPool;
    }

    const picked = pick(pool, rnd);
    return { card: picked, qty: 1, isExtraPool: false };
  }

  function getCustomerLine(type, rnd) {
    const lines = getSpeechLines(type);
    return pick(lines, rnd);
  }

  function makeJob(type, idx, dateSeed, featured = false, legend = false) {
    const rnd = randFromSeed(`${dateSeed}::job::${type}::${idx}::${legend ? "legend" : "normal"}`);
    const difficulty = legend ? 5 : Math.min(5, Math.max(featured ? 3 : 1, getDifficultyForType(type, rnd)));
    const wanted = chooseWantedCard(type, difficulty, rnd, legend);

    return {
      id: `${legend ? "legend" : "job"}_${idx + 1}_${type}`,
      type,
      visitorName: CUSTOMER_NAME_MAP[type],
      visitorImg: CUSTOMER_ICON_MAP[type],
      difficulty,
      featured,
      legend,
      line: getCustomerLine(type, rnd),
      targetCardId: wanted.card.id,
      targetQty: 1,
      isExtraPool: wanted.isExtraPool,
      rewardOcto: wanted.isExtraPool ? rewardOctoHighExtra(rnd) : rewardOctoByRarity(wanted.card.rarity, rnd),
      rewardExp: rewardExpByDifficulty(difficulty),
      rewardAffection: rewardAffectionByDifficulty(difficulty),
      rewardItems: makeRewardItems(type, difficulty, rnd),
      hints: makeHintsForCard(wanted.card, wanted.isExtraPool),
      currentHintIndex: 0,
      hintCosts: [0, 200, 300],
      kasumipiThought: makeKasumipiThought(wanted.card, wanted.isExtraPool, difficulty),
      completed: false,
      completedAt: null,
      retryCount: 0,
      lastBonusOcto: 0,
      lastAffectionGain: 0
    };
  }

  function generateBoard(force = false) {
    const today = todayKey();
    const old = loadJSON(KEY.board, null);
    if (!force && old?.date === today) return old;

    const rnd = randFromSeed(`board::${today}`);
    const chosen = uniqueCustomerTypes(5, rnd);
    const featuredIndex = Math.floor(rnd() * chosen.length);

    const jobs = chosen.map((type, idx) => makeJob(type, idx, today, idx === featuredIndex, false));

    let legendJob = null;
    const legendCandidates = ["rich", "king", "pilgrim", "picky", "overflow", "shadow"];
    if (rnd() < 0.38) {
      legendJob = makeJob(pick(legendCandidates, rnd), 99, today, true, true);
    }

    const state = { date: today, jobs, legendJob };
    saveJSON(KEY.board, state);
    return state;
  }

  function getBoard() {
    const state = loadJSON(KEY.board, null) || generateBoard(false);
    let changed = false;

    if (state && Array.isArray(state.jobs)) {
      state.jobs.forEach(job => {
        if (!job.kasumipiThought) {
          if (job.takopiThought) {
            job.kasumipiThought = job.takopiThought;
          } else {
            const card = CARD_MAP[job.targetCardId];
            job.kasumipiThought = card
              ? makeKasumipiThought(card, !!job.isExtraPool, Number(job.difficulty || 1))
              : "……まだ深くは読めないじゃなイカ";
          }
          changed = true;
        }
      });
    }

    if (state && state.legendJob && !state.legendJob.kasumipiThought) {
      if (state.legendJob.takopiThought) {
        state.legendJob.kasumipiThought = state.legendJob.takopiThought;
      } else {
        const card = CARD_MAP[state.legendJob.targetCardId];
        state.legendJob.kasumipiThought = card
          ? makeKasumipiThought(card, !!state.legendJob.isExtraPool, Number(state.legendJob.difficulty || 1))
          : "……まだ深くは読めないじゃなイカ";
      }
      changed = true;
    }

    if (changed) saveBoard(state);
    return state;
  }

  function saveBoard(state) {
    saveJSON(KEY.board, state);
  }

  function getJobById(jobId) {
    const state = getBoard();
    return state.jobs.find(v => v.id === jobId) || (state.legendJob?.id === jobId ? state.legendJob : null);
  }

  function updateJob(jobId, fn) {
    const state = getBoard();
    let target = state.jobs.find(v => v.id === jobId);
    if (!target && state.legendJob?.id === jobId) target = state.legendJob;
    if (!target) return null;
    fn(target, state);
    saveBoard(state);
    return target;
  }

  // =========================================================
  // Status / scoring
  // =========================================================
  function cardScoreAgainstJob(card, job) {
    const target = CARD_MAP[job.targetCardId];
    if (!target || !card) return 0;
    if (card.id === target.id) return 100;

    let score = 0;
    if (card.rarity === target.rarity) score += 28;

    const a = new Set(deriveTags(card));
    const b = new Set(deriveTags(target));
    let overlap = 0;
    b.forEach(tag => { if (a.has(tag)) overlap++; });
    score += overlap * 12;

    if (
      (card.rarity === "UR" || card.rarity === "LR" || card.rarity === "SP") &&
      (target.rarity === "UR" || target.rarity === "LR" || target.rarity === "SP")
    ) {
      score += 10;
    }

    return clamp(score, 0, 94);
  }

  function judgeScore(score) {
    if (score >= 100) return { icon: "♥", verdict: "perfect", text: "運命の一枚だったようだ" };
    if (score >= 65) return { icon: "♥", verdict: "success", text: "想いが届いたようだ" };
    return { icon: "💔", verdict: "fail", text: "片想いのままだったようだ" };
  }

  function canAttemptJob(job) {
    return getOwnedCount(job.targetCardId) > 0;
  }

  function getJobStatus(job) {
    if (job.completed) {
      return {
        cls: "done",
        label: "成立済み",
        action: "成立済み",
        disabled: true,
        unavailable: false
      };
    }

    if (job.retryCount >= 3) {
      return {
        cls: "ng",
        label: "本日終了",
        action: "本日終了",
        disabled: true,
        unavailable: false
      };
    }

    if (!canAttemptJob(job)) {
      return {
        cls: "ng",
        label: "今は渡せない",
        action: "カード不足",
        disabled: true,
        unavailable: true
      };
    }

    return {
      cls: "ok",
      label: "挑戦可能",
      action: `マッチングする ${job.retryCount + 1}/3`,
      disabled: false,
      unavailable: false
    };
  }

  // =========================================================
  // Hero / intro / legend
  // =========================================================
  function ensureHeroStatsShell() {
    const hero = $(".hero");
    if (!hero) return null;

    let wrap = $("#heroStatsWrap");
    if (wrap) return wrap;

    wrap = document.createElement("div");
    wrap.id = "heroStatsWrap";
    wrap.className = "heroStatsWrap";
    wrap.innerHTML = `
      <div class="heroStatsNode">
        <div>
          <div class="heroStatsNodeNum" id="heroChallengeCount">0</div>
          <div class="heroStatsNodeLabel">挑戦</div>
        </div>
      </div>

      <div class="heroStatsBarWrap">
        <div class="heroStatsBar" id="heroStatsBar">
          <div class="heroStatsBarSuccess" id="heroStatsBarSuccess"></div>
          <div class="heroStatsBarFail" id="heroStatsBarFail"></div>
        </div>
        <div class="heroStatsMeta">
          <span id="heroStatsRate">成功率 0%</span>
          <span id="heroStatsBreakdown">成功 0 / 失敗 0</span>
        </div>
      </div>
    `;

    const speechWrap = $(".heroSpeechWrap", hero);
    if (speechWrap) speechWrap.insertAdjacentElement("afterend", wrap);
    else hero.appendChild(wrap);

    return wrap;
  }

  function renderHeroStats() {
    ensureHeroStatsShell();

    const meta = getMeta();
    const attempts = Number(meta.totalAttempts || 0);
    const success = Number(meta.totalSuccess || 0);
    const fail = Number(meta.totalFail || 0);
    const rate = attempts ? Math.round((success / attempts) * 100) : 0;

    const countEl = $("#heroChallengeCount");
    const rateEl = $("#heroStatsRate");
    const breakdownEl = $("#heroStatsBreakdown");
    const successEl = $("#heroStatsBarSuccess");
    const failEl = $("#heroStatsBarFail");

    if (countEl) countEl.textContent = attempts;
    if (rateEl) rateEl.textContent = `成功率 ${rate}%`;
    if (breakdownEl) breakdownEl.textContent = `成功 ${success} / 失敗 ${fail}`;

    const successW = attempts ? (success / attempts) * 100 : 0;
    const failW = attempts ? (fail / attempts) * 100 : 0;
    if (successEl) successEl.style.width = `${successW}%`;
    if (failEl) failEl.style.width = `${failW}%`;
  }

  function heatRankLabel(value) {
    const n = Number(value || 0);
    if (n >= 5000) return "爆発寸前";
    if (n >= 3000) return "灼熱";
    if (n >= 1500) return "高熱";
    if (n >= 500) return "中熱";
    if (n >= 100) return "微熱";
    return "平熱";
  }

  function ensureHeatMeterShell() {
    ensureDynamicStyles();

    const hero = $(".hero");
    if (!hero) return null;

    let wrap = $("#heroHeatWrap");
    if (wrap) return wrap;

    wrap = document.createElement("div");
    wrap.id = "heroHeatWrap";
    wrap.className = "heroHeatWrap";
    wrap.innerHTML = `
      <div class="heroHeatNode">
        <div>
          <div class="heroHeatNodeNum" id="heroHeatNow">0</div>
          <div class="heroHeatNodeLabel">熱量</div>
        </div>
      </div>

      <div class="heroHeatBarWrap">
        <div class="heroHeatBar" id="heroHeatBar">
          <div class="heroHeatBarFill" id="heroHeatBarFill"></div>
        </div>
        <div class="heroHeatMeta">
          <span id="heroHeatRank">平熱</span>
          <span id="heroHeatGuide">500でガチャ1回</span>
        </div>
      </div>

      <div class="heroHeatAction">
        <a
          id="heroHeatGachaBtn"
          class="heroHeatGachaBtn isDisabled"
          href="#"
          aria-disabled="true"
          tabindex="-1"
          title="熱量が足りないじゃなイカ"
        >かすみぴガチャ</a>
      </div>
    `;

    const statsWrap = $("#heroStatsWrap");
    if (statsWrap) {
      statsWrap.insertAdjacentElement("afterend", wrap);
    } else {
      const speechWrap = $(".heroSpeechWrap", hero);
      if (speechWrap) speechWrap.insertAdjacentElement("afterend", wrap);
      else hero.appendChild(wrap);
    }

    return wrap;
  }

  function renderHeatMeter() {
    ensureHeatMeterShell();

    const heat = getHeat();
    const nowEl = $("#heroHeatNow");
    const fillEl = $("#heroHeatBarFill");
    const rankEl = $("#heroHeatRank");
    const guideEl = $("#heroHeatGuide");
    const gachaBtn = $("#heroHeatGachaBtn");

    if (nowEl) nowEl.textContent = heat.toLocaleString();
    if (rankEl) rankEl.textContent = heatRankLabel(heat);

    const percent = Math.max(0, Math.min(100, (heat / GACHA_HEAT_COST) * 100));
    if (fillEl) fillEl.style.width = `${percent}%`;

    const remain = Math.max(0, GACHA_HEAT_COST - heat);
    if (guideEl) {
      guideEl.textContent = remain === 0
        ? "ガチャが引けるじゃなイカ"
        : `あと ${remain} でガチャ1回`;
    }

    if (gachaBtn) {
      const enabled = heat >= GACHA_HEAT_COST;
      gachaBtn.classList.toggle("isEnabled", enabled);
      gachaBtn.classList.toggle("isDisabled", !enabled);
      gachaBtn.setAttribute("aria-disabled", enabled ? "false" : "true");
      gachaBtn.tabIndex = enabled ? 0 : -1;
      gachaBtn.href = enabled ? GACHA_URL : "#";
      gachaBtn.title = enabled ? "かすみぴガチャへ" : "熱量が足りないじゃなイカ";
    }
  }

  function renderHero() {
    const heroImage = $("#heroImage");
    const heroSpeechText = $("#heroSpeechText");
    const heroSpeechBadge = $(".heroSpeechBadge");

    if (heroImage) heroImage.src = HERO_IMAGE_URL;
    if (heroSpeechBadge) heroSpeechBadge.textContent = "かすみぴ";
    if (heroSpeechText) {
      const rnd = randFromSeed(`hero::${todayKey()}`);
      heroSpeechText.textContent = pick(HERO_LINES, rnd);
    }

    renderHeroStats();
    renderHeatMeter();
  }

  function ensurePlayGuideButton() {
    const introLeft = $(".introLeft");
    if (!introLeft) return;

    let head = $("#boardDateHead");
    if (!head) {
      head = document.createElement("div");
      head.id = "boardDateHead";
      head.className = "boardDateHead";
      head.innerHTML = `
        <h2 id="boardDateTitle">${todayLabelJP()}</h2>
        <button class="howToBtn" id="howToBtn" type="button">遊び方</button>
      `;

      const oldH2 = $("h2", introLeft);
      if (oldH2) oldH2.replaceWith(head);
      else introLeft.prepend(head);
    } else {
      const title = $("#boardDateTitle");
      if (title) title.textContent = todayLabelJP();
    }

    const howToBtn = $("#howToBtn");
    if (howToBtn && !howToBtn.dataset.bound) {
      howToBtn.dataset.bound = "1";
      howToBtn.addEventListener("click", openHowToModal);
    }
  }

  function renderLegendNotice() {
    const box = $(".legendNotice");
    if (!box) return;
    const state = getBoard();

    if (state.legendJob) {
      box.innerHTML = `
        <div class="legendNoticeBadge">伝説マッチ出現中</div>
        <h3>${escapeHtml(state.legendJob.visitorName)}</h3>
        <p>
          今日は特別な相手が来ているじゃなイカ。<br>
          報酬は 🪙 ${state.legendJob.rewardOcto.toLocaleString()} オクトじゃなイカ。
        </p>
      `;
    } else {
      box.innerHTML = `
        <div class="legendNoticeBadge">伝説マッチ</div>
        <h3>本日、伝説マッチは見つからなかった</h3>
        <p>
          今日は静かな海じゃなイカ。<br>
          また別の日に探してみるじゃなイカ。
        </p>
      `;
    }
  }

  function applyKasumipiCharacter() {
    const floatBtn = $("#takopiFloat");
    if (floatBtn) {
      floatBtn.setAttribute("aria-label", "かすみぴのひとこと");
      floatBtn.setAttribute("title", "かすみぴ");
      floatBtn.innerHTML = `<img src="${KASUMIPI_FLOAT_ICON}" alt="かすみぴ">`;
    }

    const heroSpeechBadge = $(".heroSpeechBadge");
    if (heroSpeechBadge) heroSpeechBadge.textContent = "かすみぴ";

    const thoughtCaps = $$(".matchThoughtCap");
    thoughtCaps.forEach(el => {
      el.textContent = "🦑 かすみぴの心の声";
    });
  }

  // =========================================================
  // Render board
  // =========================================================
  function renderRewardChips(job) {
    const rep = getRepresentativeRewardLabels(job.rewardItems, 2);

    let extraHtml = "";
    if (rep.length > 0) {
      extraHtml = `
        <span class="rewardShowChip">🎁 追加報酬あり</span>
        ${rep.map(v => `<span class="rewardShowChip">${escapeHtml(v)}</span>`).join("")}
      `;
    }

    return `
      <div class="rewardShowcase">
        <span class="rewardShowChip">🪙 ${job.rewardOcto.toLocaleString()}オクト</span>
        <span class="rewardShowChip">🔥 ${job.rewardExp}熱量</span>
        ${extraHtml}
      </div>
    `;
  }

  function renderHintBlock(job) {
    const idx = Number(job.currentHintIndex || 0);
    const currentText = job.hints[idx];
    const nextIdx = idx + 1;
    const status = getJobStatus(job);

    return `
      <div class="matchHintPanel">
        <div class="matchHintBadge">今日の希望のカードは…</div>

        <div class="matchHintLargeBox">
          <div class="matchHintLabel">ヒント${idx + 1}</div>
          <div class="matchHintCurrent">${escapeHtml(currentText)}</div>
        </div>

        <div class="matchActionRow">
          ${
            status.unavailable
              ? `<button class="matchHintNextBtn" disabled>今は渡せない</button>`
              : nextIdx < job.hints.length
                ? `<button class="matchHintNextBtn" data-open-next-hint="${job.id}">
                     次のヒントへ（${job.hintCosts[nextIdx]}オクト）
                   </button>`
                : `<button class="matchHintNextBtn" disabled>ヒント終了</button>`
          }

          <button class="matchPuffyBtn" data-open-select="${job.id}" ${status.disabled ? "disabled" : ""}>
            ${status.action}
          </button>
        </div>

        ${
          status.unavailable
            ? `<div class="matchRetryNote isEnd">この相手の答えのカードは、現在の所持カードにありません。</div>`
            : !job.completed && job.retryCount > 0 && job.retryCount < 3
              ? `<div class="matchRetryNote">失敗 ${job.retryCount}/3 回。あと ${3 - job.retryCount} 回じゃなイカ。</div>`
              : !job.completed && job.retryCount >= 3
                ? `<div class="matchRetryNote isEnd">今日はこの相手とはもう挑戦できないじゃなイカ。</div>`
                : ""
        }
      </div>
    `;
  }

  function renderJobCard(job) {
    const status = getJobStatus(job);
    const thoughtText = job.kasumipiThought || job.takopiThought || "……まだ深くは読めないじゃなイカ";

    return `
      <article class="matchCard ${job.completed ? "isDone" : ""}">
        <div class="matchTopRow">
          <h3 class="matchName">${escapeHtml(job.visitorName)}</h3>
          <div class="metaRight">
            <div class="matchStars s${job.difficulty}">${stars(job.difficulty)}</div>
            <span class="matchBadge ${status.cls}">${status.label}</span>
          </div>
        </div>

        <div class="matchCardHead">
          <div class="matchAvatarFrame">
            <img class="matchAvatar" src="${job.visitorImg}" alt="${escapeHtml(job.visitorName)}">
          </div>

          <div class="matchHeadRight">
            <div class="matchSpeech" data-love-rotate="${job.id}">${escapeHtml(job.line)}</div>
          </div>
        </div>

        <div class="matchMain">
          <div class="matchRewardTitle">マッチング報酬</div>
          ${renderRewardChips(job)}

          <div class="matchThoughtBox">
            <div class="matchThoughtCap">🦑 かすみぴの心の声</div>
            <div class="matchThoughtText">${escapeHtml(thoughtText)}</div>
          </div>

          ${renderHintBlock(job)}
        </div>
      </article>
    `;
  }

  function startLoveLineRotation(job, el) {
    if (!job || !el) return;

    const lines = getSpeechLines(job.type);
    if (!lines || !lines.length) return;

    const seedRnd = randFromSeed(`${todayKey()}::love-index::${job.id}`);
    let i = Math.floor(seedRnd() * lines.length);

    el.textContent = lines[i];
    el.style.opacity = "1";

    if (el._timer) clearInterval(el._timer);

    el._timer = setInterval(() => {
      i = (i + 1) % lines.length;
      el.style.opacity = "0";
      setTimeout(() => {
        el.textContent = lines[i];
        el.style.opacity = "1";
      }, 180);
    }, 10000);
  }

  function bindLoveLineRotation() {
    $$("[data-love-rotate]").forEach(el => {
      const jobId = el.getAttribute("data-love-rotate");
      const job = getJobById(jobId);
      startLoveLineRotation(job, el);
    });
  }

  function renderBoard() {
    const state = getBoard();
    const list = $("#matchList");
    const legend = $("#legendMatch");
    if (!list) return;

    list.innerHTML = state.jobs.map(renderJobCard).join("");

    if (legend) {
      if (state.legendJob) {
        legend.classList.remove("hidden");
        legend.innerHTML = renderJobCard(state.legendJob);
      } else {
        legend.classList.add("hidden");
        legend.innerHTML = "";
      }
    }

    renderLegendNotice();
    bindBoardButtons();
    bindLoveLineRotation();
    applyKasumipiCharacter();
  }

  // =========================================================
  // Actions
  // =========================================================
  function openNextHint(jobId) {
    const job = getJobById(jobId);
    if (!job) return;

    const status = getJobStatus(job);
    if (status.unavailable) {
      showKasumipiToast("……その一枚、まだ手元に来てないじゃなイカ");
      return;
    }

    const nextIdx = Number(job.currentHintIndex || 0) + 1;
    if (nextIdx >= job.hints.length) return;

    const cost = Number(job.hintCosts[nextIdx] || 0);
    if (getOcto() < cost) {
      showKasumipiToast("オクトが足りないじゃなイカ");
      return;
    }

    addOcto(-cost);
    updateJob(jobId, (j) => {
      j.currentHintIndex = nextIdx;
    });

    renderBoard();
    showKasumipiToast(`ヒントを見たじゃなイカ（-${cost}オクト）`);
  }

  function openSelectModal(jobId) {
    const job = getJobById(jobId);
    if (!job) return;

    const status = getJobStatus(job);
    if (status.unavailable) {
      showKasumipiToast("……その一枚、まだ手元に来てないじゃなイカ");
      return;
    }
    if (status.disabled) return;

    const rarityOrder = { SP: 6, LR: 5, UR: 4, SR: 3, R: 2, N: 1 };

    const ownedCards = CARDS_ALL
      .map(card => ({ ...card, count: getOwnedCount(card.id) }))
      .filter(v => v.count > 0)
      .sort((a, b) => {
        const rd = (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
        if (rd !== 0) return rd;
        return a.name.localeCompare(b.name, "ja");
      });

    const modal = $("#jobModal");
    const body = $("#jobModalBody");
    if (!modal || !body) return;

    body.innerHTML = `
      <div class="modalTop">
        <img class="modalAvatar" src="${job.visitorImg}" alt="${escapeHtml(job.visitorName)}">

        <div>
          <h2 class="modalName" id="modalJobName">${escapeHtml(job.visitorName)}</h2>
          <p class="modalLine">どのカードを渡すじゃなイカ？</p>
        </div>

        <div class="modalRight">
          <div class="matchStars s${job.difficulty}">${stars(job.difficulty)}</div>
          <div class="modalTagRow">
            <span class="modalTag">${status.action}</span>
          </div>
        </div>
      </div>

      <section>
        <h3 class="modalSectionTitle">所持カードから選ぶ</h3>
        ${
          ownedCards.length
            ? `<div class="modalCardGrid">
                ${ownedCards.map(card => `
                  <div class="selectCardItem">
                    <button class="selectCardBtn" data-choose-card="${job.id}" data-card-id="${card.id}">
                      <div class="selectCardBox">
                        <img src="${card.img}" alt="${escapeHtml(card.name)}">
                        <div class="selectCardOwn">所持${card.count}</div>
                      </div>
                      <div class="selectCardName">${escapeHtml(card.name)}</div>
                    </button>
                  </div>
                `).join("")}
               </div>`
            : `<div class="modalStatusList"><div class="modalStatusLine ng">所持カードがない。</div></div>`
        }
      </section>
    `;

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    $$("[data-choose-card]", body).forEach(btn => {
      btn.addEventListener("click", () => {
        judgeCard(job.id, btn.getAttribute("data-card-id"));
      });
    });
  }

  function closeJobModal() {
    const modal = $("#jobModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  // =========================================================
  // How to modal
  // =========================================================
  function ensureHowToModal() {
    if ($("#howToModal")) return;

    const div = document.createElement("div");
    div.className = "modal";
    div.id = "howToModal";
    div.setAttribute("aria-hidden", "true");
    div.innerHTML = `
      <div class="modalCard modalCard--howto" role="dialog" aria-modal="true" aria-labelledby="howToTitle">
        <button class="modalClose" id="howToClose" aria-label="閉じる">✕</button>
        <div class="modalBody">
          <h2 class="modalName" id="howToTitle">遊び方</h2>
          <div class="modalStatusList">
            <div class="modalStatusLine ok">① 相手のセリフとヒントを見る</div>
            <div class="modalStatusLine ok">② 所持カードから1枚選んで渡す</div>
            <div class="modalStatusLine ok">③ ぴったりなら ♥ でマッチ成立</div>
            <div class="modalStatusLine ok">④ 失敗しても3回まで挑戦できる</div>
            <div class="modalStatusLine ok">⑤ ヒント2を見る前に一発正解すると +報酬</div>
            <div class="modalStatusLine ok">⑥ 追加報酬は成立後に全部開くじゃなイカ</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(div);

    $("#howToClose").addEventListener("click", closeHowToModal);
    div.addEventListener("click", (e) => {
      if (e.target === div) closeHowToModal();
    });
  }

  function openHowToModal() {
    ensureHowToModal();
    const modal = $("#howToModal");
    if (!modal) return;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeHowToModal() {
    const modal = $("#howToModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  // =========================================================
  // Suspense / result
  // =========================================================
  function ensureJudgeLayers() {
    if (!$("#suspenseLayer")) {
      const suspense = document.createElement("div");
      suspense.id = "suspenseLayer";
      suspense.className = "suspenseLayer";
      suspense.innerHTML = `
        <div class="suspenseInner">
          <div class="suspenseText">ドキドキ…</div>
        </div>
      `;
      document.body.appendChild(suspense);
    }

    if (!$("#heartJudgeLayer")) {
      const judge = document.createElement("div");
      judge.id = "heartJudgeLayer";
      judge.className = "heartJudgeLayer";
      judge.innerHTML = `
        <div class="heartJudgeBurst heartJudgeBurst--success"></div>
        <div class="heartJudgeBurst heartJudgeBurst--fail"></div>
        <div class="heartJudgeInner" id="heartJudgeInner">
          <div class="heartJudgeIcon" id="heartJudgeIcon">♥</div>
          <div class="heartJudgeText" id="heartJudgeText">……</div>
          <div class="heartJudgeSub" id="heartJudgeSub">……</div>
        </div>
      `;
      document.body.appendChild(judge);
    }
  }

  async function showSuspense() {
    ensureJudgeLayers();
    const layer = $("#suspenseLayer");
    if (!layer) return;
    layer.classList.add("show");
    await wait(2500);
    layer.classList.remove("show");
    await wait(160);
  }

  async function showJudge(judgement) {
    ensureJudgeLayers();

    const layer = $("#heartJudgeLayer");
    const inner = $("#heartJudgeInner");
    const icon = $("#heartJudgeIcon");
    const text = $("#heartJudgeText");
    const sub = $("#heartJudgeSub");
    if (!layer || !inner || !icon || !text || !sub) return;

    inner.classList.remove("success", "fail");
    layer.classList.remove("success", "fail");

    inner.classList.add(judgement.verdict === "fail" ? "fail" : "success");
    layer.classList.add(judgement.verdict === "fail" ? "fail" : "success");

    icon.textContent = judgement.icon;
    icon.style.color = judgement.verdict === "fail" ? "#7aa8ff" : "#ff2a52";
    text.textContent = judgement.verdict === "fail" ? "届かなかった…" : "願いが届いた";
    sub.textContent = judgement.verdict === "fail"
      ? "ドヨーーン…気まずい空気が流れている。"
      : "パァーーッと眩しく刺さった。";

    layer.classList.add("show");
    await wait(1650);
    layer.classList.remove("show");
    layer.classList.remove("success", "fail");
    await wait(150);
  }

  async function showRewardModal(job) {
    const modal = $("#rewardModal");
    const title = $("#rewardTitle");
    const sub = $("#rewardSub");
    const list = $("#rewardList");
    if (!modal || !title || !sub || !list || !job) return;

    title.textContent = "……深く刺さったじゃなイカ";
    sub.textContent = `${job.visitorName} とマッチ成立。`;

    const rows = [];

    if (job.lastBonusOcto > 0) {
      rows.push(`<div class="rewardItem show rewardItemBonus">✨ 一発正解ボーナス +${job.lastBonusOcto.toLocaleString()} オクト</div>`);
    }

    rows.push(`<div class="rewardItem">🪙 ${job.rewardOcto.toLocaleString()} オクト</div>`);
    rows.push(`<div class="rewardItem">🔥 熱量 +${job.rewardExp}</div>`);
    rows.push(`<div class="rewardItem">💞 好感度 +${job.lastAffectionGain}</div>`);
    rows.push(...job.rewardItems.map(v => `<div class="rewardItem">${itemIcon(v.kind)} ${itemLabel(v.kind, v.id)} ×${v.qty}</div>`));

    list.innerHTML = rows.join("");
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");

    const items = $$(".rewardItem", list);
    for (let i = 0; i < items.length; i++) {
      if (!items[i].classList.contains("show")) {
        await wait(120);
        items[i].classList.add("show");
      }
    }
  }

  function hideRewardModal() {
    const modal = $("#rewardModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    const list = $("#rewardList");
    if (list) list.innerHTML = "";
  }

  async function judgeCard(jobId, cardId) {
    const job = getJobById(jobId);
    if (!job) return;

    const status = getJobStatus(job);
    if (status.disabled) return;

    if (getOwnedCount(cardId) <= 0) {
      showKasumipiToast("そのカードは持ってないじゃなイカ");
      return;
    }

    const isFirstTryNoHint2 = Number(job.currentHintIndex || 0) === 0 && Number(job.retryCount || 0) === 0;

    closeJobModal();
    await showSuspense();

    const card = CARD_MAP[cardId];
    const score = cardScoreAgainstJob(card, job);
    const judgement = judgeScore(score);

    await showJudge(judgement);

    if (judgement.verdict === "fail") {
      updateJob(jobId, (j) => {
        j.retryCount += 1;
      });

      const latest = getJobById(jobId);

      if (latest && latest.retryCount >= 3) {
        const meta = getMeta();
        commitFinalFail(meta, job.type);
        renderHeroStats();
        renderHeatMeter();
        renderBoard();
        showKasumipiToast("……今日はもう心を開かないじゃなイカ");
      } else {
        renderBoard();
        showKasumipiToast("……その一枚じゃなかったじゃなイカ");
      }
      return;
    }

    const meta = getMeta();
    commitSuccess(meta, job.type);

    addOwned(cardId, -1);

    updateJob(jobId, (j) => {
      const bonus = isFirstTryNoHint2 ? calcFirstTryBonus(j) : 0;
      const affectionGain = Number(j.rewardAffection || 0);

      j.completed = true;
      j.completedAt = Date.now();
      j.lastBonusOcto = bonus;
      j.lastAffectionGain = affectionGain;

      addOcto(j.rewardOcto + bonus);
      addHeat(j.rewardExp);
      j.rewardItems.forEach(item => addInventory(item.kind, item.id, item.qty));
      addAffection(j.type, affectionGain);
    });

    renderHeroStats();
    renderHeatMeter();
    renderBoard();
    renderAffectionModal();
    await showRewardModal(getJobById(jobId));

    if (isFirstTryNoHint2) {
      showKasumipiToast("一発で当てたら、かなり冴えてるじゃなイカ");
    } else {
      showKasumipiToast("……願いが届いたじゃなイカ");
    }
  }

  // =========================================================
  // Bind
  // =========================================================
  function bindBoardButtons() {
    $$("[data-open-next-hint]").forEach(btn => {
      btn.addEventListener("click", () => {
        openNextHint(btn.getAttribute("data-open-next-hint"));
      });
    });

    $$("[data-open-select]").forEach(btn => {
      btn.addEventListener("click", () => {
        openSelectModal(btn.getAttribute("data-open-select"));
      });
    });
  }

  function bindUI() {
    const backBtn = $("#backBtn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        if (history.length > 1) history.back();
        else location.href = "./";
      });
    }

    const affectionBtn = $("#affectionBtn");
    if (affectionBtn) {
      affectionBtn.addEventListener("click", (e) => {
        e.preventDefault();
        openAffectionModal();
      });
    }

    const affectionClose = $("#affectionClose");
    if (affectionClose) {
      affectionClose.addEventListener("click", closeAffectionModal);
    }

    const affectionOk = $("#affectionOk");
    if (affectionOk) {
      affectionOk.addEventListener("click", closeAffectionModal);
    }

    const affectionModal = $("#affectionModal");
    if (affectionModal) {
      affectionModal.addEventListener("click", (e) => {
        if (e.target === affectionModal) closeAffectionModal();
      });
    }

    const floatBtn = $("#takopiFloat");
    if (floatBtn) {
      floatBtn.addEventListener("click", () => {
        const rnd = randFromSeed(`${todayKey()}::kasumipi::${Date.now()}`);
        showKasumipiToast(pick(KASUMIPI_LINES, rnd), 2600);
      });
    }

    const closeBtn = $("#jobModalClose");
    if (closeBtn) closeBtn.addEventListener("click", closeJobModal);

    const modal = $("#jobModal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeJobModal();
      });
    }

    const rewardClose = $("#rewardCloseBtn");
    if (rewardClose) rewardClose.addEventListener("click", hideRewardModal);

    const rewardModal = $("#rewardModal");
    if (rewardModal) {
      rewardModal.addEventListener("click", (e) => {
        if (e.target === rewardModal) hideRewardModal();
      });
    }

    document.addEventListener("click", (e) => {
      const gachaBtn = $("#heroHeatGachaBtn");
      if (!gachaBtn || e.target !== gachaBtn) return;

      if (getHeat() < GACHA_HEAT_COST) {
        e.preventDefault();
        showKasumipiToast(`あと ${Math.max(0, GACHA_HEAT_COST - getHeat())} 熱量でガチャじゃなイカ`);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeJobModal();
        hideRewardModal();
        closeHowToModal();
        closeAffectionModal();
      }
    });
  }

  // =========================================================
  // Boot
  // =========================================================
  ensureDynamicStyles();
  ensureDefaults();
  autoRepairBook();
  ensureHowToModal();
  generateBoard(false);
  bindUI();
  ensurePlayGuideButton();
  renderHero();
  renderBoard();
  renderAffectionModal();
  applyKasumipiCharacter();
})();
