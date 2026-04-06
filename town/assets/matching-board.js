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

  function getTimeMode() {
    const h = nowTokyo().getHours();
    return (h >= 6 && h < 18) ? "day" : "night";
  }

  function showTakopiToast(text, ms = 2400) {
    const wrap = $("#takopiToast");
    const inner = $("#takopiToastInner");
    if (!wrap || !inner) return;
    inner.textContent = text;
    wrap.classList.add("show");
    clearTimeout(showTakopiToast._t);
    showTakopiToast._t = setTimeout(() => wrap.classList.remove("show"), ms);
  }

  function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
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
    "今日は誰に焼かれるたこ？",
    "条件が合えば、もうそれは運命たこ。",
    "恋じゃない、在庫のマッチングたこ。",
    "今日の相手、たぶん全員ちょっと重いたこ。"
  ];

  const TAKOPI_LINES = [
    "……その相手、重いたこ",
    "ヒント見すぎると、恋が作業になるたこ",
    "一発で当てたら、かなりモテるたこ",
    "今日は沼が多いたこ",
    "♥か💔かは、渡してからのお楽しみたこ"
  ];

  const FALLBACK_LINES = {
    impulse: ["一瞬触れただけなのに、まだ忘れられないたこ"],
    picky: ["あの日の君じゃなきゃダメなたこ"],
    king: ["選ぶ側だったのに、選ばれなかったたこ"],
    flipper: ["好きだったのか、ただの記憶か分からないたこ"],
    careful: ["好きって言葉にすると終わりそうなたこ"],
    looker: ["あの日どこかに置き忘れた君を探してるたこ"],
    rich: ["いくら払えば、あの頃に戻れるたこ"],
    climber: ["あと一歩だったのに届かないたこ"],
    guide: ["案内してる側なのに迷ってるたこ"],
    relax: ["理由もなく好きだったのが一番残るたこ"],
    artisan: ["触れた質感まで覚えてるたこ"],
    diet: ["欲しくないって言い聞かせてるだけたこ"],
    overflow: ["普通じゃ足りなかったたこ"],
    collector: ["手元に置いておきたかったたこ"],
    shadow: ["濡れた記憶ほど残るたこ"],
    ramen: ["一回じゃ足りなかったたこ"],
    streamer: ["軽いはずだったたこ"],
    gourmet: ["あの日の味が忘れられないたこ"],
    opener: ["中身を知らないまま惹かれてたこ"],
    party: ["祭りのあとに残るやつたこ"],
    pilgrim: ["あの日に置いてきた気持ちを探してるたこ"]
  };

  function getSpeechLines(type) {
    const external = (window.LOVE_LINES && window.LOVE_LINES[type]) || null;
    if (Array.isArray(external) && external.length) return external;
    return FALLBACK_LINES[type] || ["まだ忘れられないたこ"];
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
    { id: "TP-008", name: "入学たこぴ", img: "https://ul.h3z.jp/DidPdK9b.png", rarity: "UR" }
  ];

  const BUSSASARI_POOL = [
    { id: "BS-001", name: "たこ焼きダーツインフェルノ《對馬裕佳子》", img: "https://ul.h3z.jp/l5roYZJ4.png", rarity: "N" },
    { id: "BS-002", name: "店主反撃レビュー《佐俣雄一郎》", img: "https://ul.h3z.jp/BtOTLlSo.png", rarity: "N" },
    { id: "BS-003", name: "自己啓発タコ塾《井上諒》", img: "https://ul.h3z.jp/P5vsAste.png", rarity: "N" },
    { id: "BS-004", name: "カロリーゼロ理論《仁木治》", img: "https://ul.h3z.jp/ZGBzzH2r.png", rarity: "N" },
    { id: "BS-005", name: "白い契約《稲石裕》", img: "https://ul.h3z.jp/nmiaCKae.png", rarity: "N" }
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
    { id: "NK-012", name: "てりたま", img: "https://ul.h3z.jp/MU6ehdTH.png", rarity: "SR" }
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
    { id: "fert_timeno", name: "時間を信じない肥料" }
  ];

  const REWARD_ITEMS = {
    seed: Object.fromEntries(SEEDS.map(v => [v.id, v])),
    water: Object.fromEntries(WATERS.map(v => [v.id, v])),
    fert: Object.fromEntries(FERTS.map(v => [v.id, v]))
  };

  const REWARD_PROFILES = {
    careful: { fixed: [["water", "water_plain_free"]], rand: [["fert", "fert_feel", 18], ["seed", "seed_random", 18], ["water", "water_nice", 12]] },
    impulse: { fixed: [["water", "water_nice"]], rand: [["seed", "seed_shop", 18], ["seed", "seed_line", 10], ["fert", "fert_guts", 10]] },
    looker: { fixed: [["water", "water_plain_free"]], rand: [["water", "water_regret", 8], ["fert", "fert_agedama", 12], ["seed", "seed_random", 16]] },
    picky: { fixed: [["water", "water_rotten"]], rand: [["water", "water_sea", 14], ["fert", "fert_timeno", 8], ["seed", "seed_bussasari", 6]] },
    king: { fixed: [["water", "water_yunokawa"]], rand: [["seed", "seed_namara_kawasar", 12], ["seed", "seed_special", 8], ["fert", "fert_skip", 10]] },
    flipper: { fixed: [["water", "water_nice"]], rand: [["fert", "fert_feel", 12], ["water", "water_regret", 8], ["seed", "seed_random", 14]] },
    rich: { fixed: [["water", "water_overdo"], ["seed", "seed_namara_kawasar"]], rand: [["water", "water_supergod", 8], ["seed", "seed_bussasari", 18], ["fert", "fert_timeno", 12]] },
    climber: { fixed: [["water", "water_suspicious"]], rand: [["fert", "fert_guts", 15], ["seed", "seed_line", 10], ["seed", "seed_shop", 12]] },
    guide: { fixed: [["water", "water_plain_free"], ["seed", "seed_random"]], rand: [["fert", "fert_feel", 18], ["water", "water_nice", 12]] },
    relax: { fixed: [["water", "water_plain_free"]], rand: [["seed", "seed_random", 16], ["fert", "fert_feel", 16], ["water", "water_nice", 8]] },
    artisan: { fixed: [["fert", "fert_guts"]], rand: [["fert", "fert_skip", 18], ["water", "water_suspicious", 10], ["seed", "seed_shop", 12]] },
    diet: { fixed: [["fert", "fert_agedama"]], rand: [["water", "water_regret", 10], ["fert", "fert_feel", 12], ["seed", "seed_random", 18]] },
    overflow: { fixed: [["water", "water_rotten"]], rand: [["water", "water_sea", 12], ["fert", "fert_timeno", 8], ["seed", "seed_bussasari", 6]] },
    collector: { fixed: [["seed", "seed_special"]], rand: [["water", "water_yunokawa", 10], ["seed", "seed_namara_kawasar", 10], ["fert", "fert_skip", 8]] },
    shadow: { fixed: [["water", "water_suspicious"]], rand: [["water", "water_rotten", 8], ["water", "water_sea", 10], ["water", "water_overdo", 8]] },
    ramen: { fixed: [["seed", "seed_random"]], rand: [["seed", "seed_shop", 12], ["fert", "fert_guts", 10], ["fert", "fert_feel", 12]] },
    streamer: { fixed: [], rand: [["water", "water_nice", 12], ["seed", "seed_special", 8], ["fert", "fert_skip", 8], ["seed", "seed_bussasari", 10]] },
    gourmet: { fixed: [["water", "water_yunokawa"]], rand: [["water", "water_nice", 14], ["seed", "seed_namara_kawasar", 10], ["fert", "fert_feel", 10]] },
    opener: { fixed: [["water", "water_nice"]], rand: [["seed", "seed_shop", 16], ["seed", "seed_line", 10], ["fert", "fert_skip", 8]] },
    party: { fixed: [["seed", "seed_random"]], rand: [["seed", "seed_shop", 12], ["water", "water_nice", 12], ["fert", "fert_guts", 10]] },
    pilgrim: { fixed: [["water", "water_overdo"], ["fert", "fert_timeno"]], rand: [["water", "water_supergod", 10], ["seed", "seed_special", 10], ["seed", "seed_bussasari", 14]] }
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

  function saveAffectionState(state) {
    localStorage.setItem(AFFECTION_LS_KEY, JSON.stringify(state));
  }

  function getDefaultAffectionGuest() {
    return {
      love: 0,
      talkCount: 0,
      buyCount: 0,
      ignoreCount: 0,
      lastTalkAt: 0,
      lastSeenAt: 0
    };
  }

  function patchAffectionGuest(id, patch) {
    const state = loadAffectionState();
    if (!state.guests[id]) {
      state.guests[id] = getDefaultAffectionGuest();
    }
    Object.assign(state.guests[id], patch || {});
    state.guests[id].love = clamp(Number(state.guests[id].love || 0), 0, 100);
    saveAffectionState(state);
    return state.guests[id];
  }

  function addAffection(id, delta) {
    const state = loadAffectionState();
    if (!state.guests[id]) {
      state.guests[id] = getDefaultAffectionGuest();
    }
    state.guests[id].love = clamp(Number(state.guests[id].love || 0) + Number(delta || 0), 0, 100);
    state.guests[id].lastSeenAt = Date.now();
    saveAffectionState(state);
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
      impulse: ["まだ勢いで来ている。", "ノリが合う店だと思い始めている。", "勢いで来て、愛着で帰る常連。"],
      picky: ["まだ厳しく見定めている。", "少しずつ認め始めている。", "うるさいけど、かなり気に入っている。"],
      king: ["まだ試す目で見ている。", "店の格を認め始めている。", "王が認めた相手。かなり強い。"],
      flipper: ["まだ打算で見ている。", "数字以外の価値も少し見えてきた。", "打算から始まったのに、なぜか情がある。"],
      careful: ["まだ警戒しながら様子見。", "少しずつ安心してきている。", "かなり信頼している。"],
      looker: ["まだ“見るだけ”の距離感。", "眺めるだけでは済まなくなってきた。", "口では軽いが、かなり好き。"],
      rich: ["金で測っている。", "値段以外の面白さも認め始めた。", "財布より先に心が動いている。"],
      climber: ["まだ試練の棚だと思っている。", "登る価値のある相手だと思い始めた。", "景色の見える常連ポジション。"],
      guide: ["まだ外から案内している。", "語りたくなる相手になってきた。", "もう半分この店の広報。"],
      relax: ["まだ様子見で空気を読んでいる。", "居心地の良さを感じ始めている。", "癒やし目的でも来ている。"],
      artisan: ["仕事として見ている。", "腕前を認めてきている。", "技術も空気も含めて評価している。"],
      diet: ["理屈で距離を取っている。", "理論の中に好意が混ざり始めた。", "もはや理屈を超えて好き。"],
      overflow: ["まだ枠外から見ている。", "ズレた会話を楽しみ始めている。", "規格外どうしで相性が良い。"],
      collector: ["まだ管理対象として見ている。", "保存以上の感情が生まれ始めた。", "かなり大切な相手認定。"],
      shadow: ["まだ慎重に距離を測っている。", "守れる価値を感じ始めている。", "信用しているから近づいている。"],
      ramen: ["まだ濃さだけ見ている。", "味わうように通い始めている。", "締めに寄りたくなる相手になった。"],
      streamer: ["まだネタとして見ている。", "映え以上の面白さを感じている。", "本気で推したくなっている。"],
      gourmet: ["まだ厳しく品定めしている。", "余韻のある相手だと感じ始めた。", "かなり深く気に入っている。"],
      opener: ["まだ勢いだけで近づいている。", "テンション以上に楽しみ始めた。", "勢い込みでかなり好き。"],
      party: ["まだ祭りのノリで来ている。", "ノリ以上の居場所感が出てきた。", "騒がしいけど本気で好き。"],
      pilgrim: ["まだ巡礼先のひとつ。", "来た意味がある場所だと思い始めた。", "わざわざ来る価値があると確信している。"]
    };

    const row = map[type] || ["まだ距離を測っている。", "少しずつ距離が縮んでいる。", "かなり気に入っている。"];
    if (n >= 80) return row[2];
    if (n >= 40) return row[1];
    return row[0];
  }

  function getAffectionRows() {
    const state = loadAffectionState();

    const rows = Object.keys(state.guests).map((id) => {
      const g = { ...getDefaultAffectionGuest(), ...(state.guests[id] || {}) };
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

  function getBook() {
    const book = loadJSON(KEY.book, { got: {} });
    if (!book.got || typeof book.got !== "object") book.got = {};
    return book;
  }

  function saveBook(book) {
    saveJSON(KEY.book, book);
  }

  function getOwnedCount(cardId) {
    const book = getBook();
    return Number(book.got?.[cardId]?.count || 0);
  }

  function addOwned(cardId, delta) {
    const book = getBook();
    const info = CARD_MAP[cardId] || { name: cardId, rarity: "N" };
    if (!book.got[cardId]) {
      book.got[cardId] = { count: 0, name: info.name, rarity: info.rarity };
    }
    book.got[cardId].count = Math.max(0, Number(book.got[cardId].count || 0) + Number(delta || 0));
    if (book.got[cardId].count <= 0) delete book.got[cardId];
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

  function ensureDefaults() {
    if (localStorage.getItem(KEY.octo) == null) localStorage.setItem(KEY.octo, "1000");
    if (localStorage.getItem(KEY.heat) == null) localStorage.setItem(KEY.heat, "0");

    const inv = loadJSON(KEY.inv, null);
    if (!inv) saveJSON(KEY.inv, { ver: 1, seed: {}, water: {}, fert: {} });

    const meta = loadJSON(KEY.matchingMeta, null);
    if (!meta) {
      saveJSON(KEY.matchingMeta, {
        totalAttempts: 0,
        totalSuccess: 0,
        totalFail: 0,
        statsByType: {}
      });
    }

    const book = loadJSON(KEY.book, null);
    if (!book) {
      const got = {};
      CARDS_ALL.forEach(card => {
        let count = 0;
        if (card.rarity === "N") count = Math.random() < 0.65 ? Math.floor(Math.random() * 4) : 0;
        else if (card.rarity === "R") count = Math.random() < 0.45 ? Math.floor(Math.random() * 3) : 0;
        else if (card.rarity === "SR") count = Math.random() < 0.28 ? Math.floor(Math.random() * 2) : 0;
        else if (card.rarity === "UR") count = Math.random() < 0.12 ? 1 : 0;
        else if (card.rarity === "LR") count = Math.random() < 0.05 ? 1 : 0;
        else if (card.rarity === "SP") count = Math.random() < 0.04 ? 1 : 0;

        if (count > 0) got[card.id] = { count, name: card.name, rarity: card.rarity };
      });
      saveJSON(KEY.book, { got });
    }

    const affection = loadAffectionState();
    if (!affection || !affection.guests) {
      saveAffectionState({ ver: 1, guests: {} });
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
        "第一弾の外にいる特別な相手たこ",
        "普通の第一弾とは別枠のカードたこ",
        "特別セット側を探すと近いたこ"
      );
    }

    if (/ソース|塩|マヨ|明太|チーズ|味噌|牡蠣/.test(name) || tags.includes("taste")) {
      candidates.push(
        "味つけやメニュー名っぽいカードたこ",
        "食べ方や味の名前が入るカードたこ",
        "ソース・塩・マヨ系から探すと近いたこ"
      );
    }

    if (tags.includes("love")) {
      candidates.push(
        "恋愛っぽい名前のカードたこ",
        "気持ちや関係を感じる名前のカードたこ",
        "恋・デート・契約みたいな雰囲気のカードたこ"
      );
    }

    if (tags.includes("darts")) {
      candidates.push(
        "ダーツやプロ選手に関係あるカードたこ",
        "競技っぽい雰囲気のカードたこ",
        "ダーツ系から探すと近いたこ"
      );
    }

    if (tags.includes("shop")) {
      candidates.push(
        "お店・露店・店主に関係あるカードたこ",
        "店っぽい言葉が入るカードたこ",
        "お店まわりのカードたこ"
      );
    }

    if (tags.includes("onsen")) {
      candidates.push(
        "温泉や場所のイメージが強いカードたこ",
        "ゆのかわ・温泉寄りのカードたこ",
        "場所を思い出すと近いたこ"
      );
    }

    if (tags.includes("god")) {
      candidates.push(
        "特別感が強いカードたこ",
        "神・女神・御神体っぽいカードたこ",
        "ありがたそうな空気のカードたこ"
      );
    }

    if (tags.includes("crowd")) {
      candidates.push(
        "大会・会議・行列みたいに人が多いカードたこ",
        "人が集まってる場面のカードたこ",
        "にぎやかな感じのカードたこ"
      );
    }

    if (tags.includes("heat")) {
      candidates.push(
        "熱さや火力を感じるカードたこ",
        "アツい雰囲気のカードたこ",
        "火力高めのイメージのカードたこ"
      );
    }

    if (tags.includes("memory")) {
      candidates.push(
        "昔・記憶・過去っぽいカードたこ",
        "時間や思い出を感じるカードたこ",
        "懐かしさがあるカードたこ"
      );
    }

    if (tags.includes("speed")) {
      candidates.push(
        "走る・飛ぶ・勢いがあるカードたこ",
        "動きが強いカードたこ",
        "スピード感があるカードたこ"
      );
    }

    if (tags.includes("danger") || tags.includes("dark_special")) {
      candidates.push(
        "ちょっと怪しい感じのカードたこ",
        "普通じゃない空気のカードたこ",
        "クセ強めのカードたこ"
      );
    }

    if (!candidates.length) {
      if (card.rarity === "N" || card.rarity === "R") {
        candidates.push(
          "第一弾の中でも探しやすい側のカードたこ",
          "基本寄りのカードたこ",
          "図鑑を広く見れば見つけやすいたこ"
        );
      } else {
        candidates.push(
          "第一弾の中でも印象が強いカードたこ",
          "目立つタイプのカードたこ",
          "ちょっと特別感のあるカードたこ"
        );
      }
    }

    return pick(candidates, randFromSeed(`hint1::${todayKey()}::${card.id}`));
  }

  function buildHint2(card, isExtraPool) {
    const candidates = [];

    if (isExtraPool) {
      candidates.push(
        "かなり特別でレア寄りなたこ",
        "普通の手札ではあまり見かけないたこ",
        "特別枠なので持ってる人が少なめなたこ"
      );
      return pick(candidates, randFromSeed(`hint2-extra::${todayKey()}::${card.id}`));
    }

    if (card.rarity === "N") {
      candidates.push(
        "かなり見つけやすいほうたこ",
        "手持ちにある人が多いほうたこ",
        "最初に探すと見つけやすいレベルたこ"
      );
    } else if (card.rarity === "R") {
      candidates.push(
        "少し珍しいけど、まだ見つけやすいほうたこ",
        "Nより一段だけ珍しいたこ",
        "ちょっと探せば見つかるレベルたこ"
      );
    } else if (card.rarity === "SR") {
      candidates.push(
        "そこそこレアなたこ",
        "人によっては持ってないレベルたこ",
        "少し本気で探す側たこ"
      );
    } else if (card.rarity === "UR") {
      candidates.push(
        "かなりレアなたこ",
        "上位レア寄りで持ってると強いたこ",
        "簡単には出てこない側たこ"
      );
    } else if (card.rarity === "LR") {
      candidates.push(
        "最上位クラスのかなりレアなたこ",
        "出会えたらかなりアツいレベルたこ",
        "持ってる人がかなり少ないたこ"
      );
    } else if (card.rarity === "SP") {
      candidates.push(
        "特殊枠レベルのかなり珍しいたこ",
        "普通のレアよりさらに特別なたこ",
        "かなり限られた人しか持ってないたこ"
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
    if (!cleaned) return "名前の中にヒントがあるたこ";

    const variants = [
      `タイトルの最初の3文字は「${cleaned.slice(0, 3)}」たこ`,
      `タイトルの真ん中の3文字は「${getMiddle3(cleaned)}」たこ`,
      `タイトルの最後の3文字は「${cleaned.slice(-3)}」たこ`
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
  function makeTakopiThought(card, isExtraPool, difficulty) {
    if (isExtraPool) {
      const lines = [
        "……これは第一弾の外から来てるたこ。かなりアツいたこ",
        "……特別枠の恋は、だいたい重いたこ",
        "……普通の手札じゃ届かない相手たこ"
      ];
      return pick(lines, randFromSeed(`${todayKey()}::thought-extra::${card.id}`));
    }

    const rarity = card.rarity || "N";
    const thoughtMap = {
      N: [
        "……この恋なら、まだ追いつけるたこ",
        "……会える可能性は高いたこ",
        "……手を伸ばせば届きそうなたこ"
      ],
      R: [
        "……少し探せば、また会えそうなたこ",
        "……想ってる人はそこそこいるたこ",
        "……軽い恋より、ちょっと深いたこ"
      ],
      SR: [
        "……ここから急に本気の恋になるたこ",
        "……人によってはまだ会えてないたこ",
        "……選ぶ相手を間違えると痛いたこ"
      ],
      UR: [
        "……現実はなかなか厳しい恋たこ",
        "……会えたら相当強い気持ちたこ",
        "……在庫より覚悟の問題たこ"
      ],
      LR: [
        "……それ、本気で惚れてるたこ？",
        "……会えたらもう奇跡たこ",
        "……かなり本気の恋たこ"
      ],
      SP: [
        "……もう運命の領域たこ",
        "……普通の恋愛難易度じゃないたこ",
        "……会える人かなり限られるたこ"
      ]
    };

    if (difficulty >= 5 && rarity !== "LR" && rarity !== "SP") {
      return "……条件だけでもう重たい恋たこ";
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
      out.push({ kind, id, qty: difficulty >= 4 ? 2 : 1 });
    }

    const count = difficulty <= 2 ? 4 : difficulty === 3 ? 5 : difficulty === 4 ? 6 : 7;
    const randPool = profile.rand.map(([kind, id, weight]) => ({ kind, id, weight }));

    for (let i = 0; i < count; i++) {
      const p = weightedPick(randPool, rnd);
      out.push({ kind: p.kind, id: p.id, qty: 1 });
    }

    if (difficulty >= 4) {
      const bonusPick = weightedPick(randPool, rnd);
      out.push({ kind: bonusPick.kind, id: bonusPick.id, qty: 2 });
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
      return EXTRA_SERIES_CARDS.length
        ? EXTRA_SERIES_CARDS
        : FIRST_SERIES_CARDS.filter(c => ["UR", "LR"].includes(c.rarity));
    }

    if (type === "gourmet") {
      return FIRST_SERIES_CARDS.filter(c => /焼き|ソース|マヨ|塩|明太|味噌|牡蠣|温泉|イカ/.test(c.name));
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

    if (legend && EXTRA_SERIES_CARDS.length) {
      return { card: pick(EXTRA_SERIES_CARDS, rnd), qty: 1, isExtraPool: true };
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
      takopiThought: makeTakopiThought(wanted.card, wanted.isExtraPool, difficulty),
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
    return loadJSON(KEY.board, null) || generateBoard(false);
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

  function getJobStatus(job) {
    if (job.completed) {
      return { cls: "done", label: "成立済み", action: "成立済み", disabled: true };
    }
    if (job.retryCount >= 3) {
      return { cls: "ng", label: "本日終了", action: "本日終了", disabled: true };
    }
    return {
      cls: "ok",
      label: "挑戦可能",
      action: `マッチングする ${job.retryCount + 1}/3`,
      disabled: false
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

  function renderHero() {
    const heroImage = $("#heroImage");
    const heroSpeechText = $("#heroSpeechText");
    if (!heroImage || !heroSpeechText) return;

    heroImage.src = getTimeMode() === "day"
      ? "https://ul.h3z.jp/lqCNnwQH.png"
      : "https://ul.h3z.jp/UtPlWaZz.png";

    const rnd = randFromSeed(`hero::${todayKey()}`);
    heroSpeechText.textContent = pick(HERO_LINES, rnd);
    renderHeroStats();
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
          今日は特別な相手が来ているたこ。<br>
          報酬は 🪙 ${state.legendJob.rewardOcto.toLocaleString()} オクトたこ。
        </p>
      `;
    } else {
      box.innerHTML = `
        <div class="legendNoticeBadge">伝説マッチ</div>
        <h3>本日、伝説マッチは見つからなかった</h3>
        <p>
          今日は静かな日だったたこ。<br>
          また別の日に探してみるたこ。
        </p>
      `;
    }
  }

  // =========================================================
  // Render board
  // =========================================================
  function renderRewardChips(job) {
    const topItems = job.rewardItems.slice(0, 2);
    return `
      <div class="rewardShowcase">
        <span class="rewardShowChip">🪙 ${job.rewardOcto.toLocaleString()}オクト</span>
        <span class="rewardShowChip">🔥 ${job.rewardExp}熱量</span>
        ${topItems.map(item => `<span class="rewardShowChip">${itemIcon(item.kind)} ${escapeHtml(itemLabel(item.kind, item.id))}×${item.qty}</span>`).join("")}
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
            nextIdx < job.hints.length
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
          !job.completed && job.retryCount > 0 && job.retryCount < 3
            ? `<div class="matchRetryNote">失敗 ${job.retryCount}/3 回。あと ${3 - job.retryCount} 回たこ。</div>`
            : !job.completed && job.retryCount >= 3
              ? `<div class="matchRetryNote isEnd">今日はこの相手とはもう挑戦できないたこ。</div>`
              : ""
        }
      </div>
    `;
  }

  function renderJobCard(job) {
    const status = getJobStatus(job);

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
            <div class="matchThoughtCap">🐙 たこぴの心の声</div>
            <div class="matchThoughtText">${escapeHtml(job.takopiThought)}</div>
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
  }

  // =========================================================
  // Actions
  // =========================================================
  function openNextHint(jobId) {
    const job = getJobById(jobId);
    if (!job) return;

    const nextIdx = Number(job.currentHintIndex || 0) + 1;
    if (nextIdx >= job.hints.length) return;

    const cost = Number(job.hintCosts[nextIdx] || 0);
    if (getOcto() < cost) {
      showTakopiToast("オクトが足りないたこ");
      return;
    }

    addOcto(-cost);
    updateJob(jobId, (j) => {
      j.currentHintIndex = nextIdx;
    });

    renderBoard();
    showTakopiToast(`ヒントを見たたこ（-${cost}オクト）`);
  }

  function openSelectModal(jobId) {
    const job = getJobById(jobId);
    if (!job) return;

    const status = getJobStatus(job);
    if (status.disabled) return;

    const owned = getBook();
    const rarityOrder = { SP: 6, LR: 5, UR: 4, SR: 3, R: 2, N: 1 };

    const ownedCards = CARDS_ALL
      .map(card => ({ ...card, count: Number(owned.got?.[card.id]?.count || 0) }))
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
          <p class="modalLine">どのカードを渡す？</p>
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
            <div class="modalStatusLine ok">⑥ 失敗カウントは3回全部だめだった時だけ反映</div>
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
          <div class="suspenseText">ドキドキドキドキ…</div>
        </div>
      `;
      document.body.appendChild(suspense);
    }

    if (!$("#heartJudgeLayer")) {
      const judge = document.createElement("div");
      judge.id = "heartJudgeLayer";
      judge.className = "heartJudgeLayer";
      judge.innerHTML = `
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
    await wait(2000);
    layer.classList.remove("show");
    await wait(120);
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
    inner.classList.add(judgement.verdict === "fail" ? "fail" : "success");

    icon.textContent = judgement.icon;
    icon.style.color = "#ff2a52";
    text.textContent = judgement.verdict === "fail" ? "片想いだった" : "恋が届いた";
    sub.textContent = judgement.text;

    layer.classList.add("show");
    await wait(1550);
    layer.classList.remove("show");
    await wait(150);
  }

  async function showRewardModal(job) {
    const modal = $("#rewardModal");
    const title = $("#rewardTitle");
    const sub = $("#rewardSub");
    const list = $("#rewardList");
    if (!modal || !title || !sub || !list || !job) return;

    title.textContent = "……焼けたね";
    sub.textContent = `${job.visitorName} とマッチ成立。`;

    const rows = [];

    if (job.lastBonusOcto > 0) {
      rows.push(`<div class="rewardItem show rewardItemBonus">✨ +報酬　一発正解ボーナス +${job.lastBonusOcto.toLocaleString()} オクト</div>`);
    }

    rows.push(`<div class="rewardItem">🪙 ${job.rewardOcto.toLocaleString()} オクト</div>`);
    rows.push(`<div class="rewardItem">🔥 熱量 +${job.rewardExp}</div>`);
    rows.push(`<div class="rewardItem">好感度 +${job.lastAffectionGain}</div>`);
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
      showTakopiToast("そのカードは持ってないたこ");
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
        renderBoard();
        showTakopiToast("……今日はこの相手、もう心を開かないたこ");
      } else {
        renderBoard();
        showTakopiToast("……違う、それじゃないたこ");
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
    renderBoard();
    renderAffectionModal();
    await showRewardModal(getJobById(jobId));

    if (isFirstTryNoHint2) {
      showTakopiToast("一発正解！ +報酬 つきたこ");
    } else {
      showTakopiToast("……焼けたね");
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

    const takopiFloat = $("#takopiFloat");
    if (takopiFloat) {
      takopiFloat.addEventListener("click", () => {
        const rnd = randFromSeed(`${todayKey()}::takopi::${Date.now()}`);
        showTakopiToast(pick(TAKOPI_LINES, rnd));
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
  ensureDefaults();
  ensureHowToModal();
  generateBoard(false);
  bindUI();
  ensurePlayGuideButton();
  renderHero();
  renderBoard();
  renderAffectionModal();
})();
