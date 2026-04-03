(() => {
  "use strict";

  // =========================================================
  // Keys
  // =========================================================
  const KEY = {
    board: "ttc_matching_board_v6",
    octo: "roten_v1_octo",
    book: "tf_v1_book",
    inv: "tf_v1_inv",
    matchingMeta: "ttc_matching_meta_v6"
  };

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

  function scaleOcto(v) {
    return Math.round(v * 1.3);
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
      {
        id: "SP-MIZU-001",
        name: "腐敗したカード",
        img: "https://takoyaki-card.com/town/assets/images/sp/huhai.png",
        rarity: "SP"
      },
      {
        id: "SP-MIZU-002",
        name: "浸食したカード",
        img: "https://takoyaki-card.com/town/assets/images/sp/sinsykou.png",
        rarity: "SP"
      }
    ],
    sea: [
      {
        id: "SP-MIZU-001",
        name: "腐敗したカード",
        img: "https://takoyaki-card.com/town/assets/images/sp/huhai.png",
        rarity: "SP"
      },
      {
        id: "SP-MIZU-002",
        name: "浸食したカード",
        img: "https://takoyaki-card.com/town/assets/images/sp/sinsykou.png",
        rarity: "SP"
      }
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

  const CARDS_ALL = [
    ...FIRST_SERIES_CARDS,
    ...EXTRA_SERIES_CARDS
  ];

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
    careful: {
      fixed: [["water", "water_plain_free"]],
      rand: [["fert", "fert_feel", 18], ["seed", "seed_random", 18], ["water", "water_nice", 12]]
    },
    impulse: {
      fixed: [["water", "water_nice"]],
      rand: [["seed", "seed_shop", 18], ["seed", "seed_line", 10], ["fert", "fert_guts", 10]]
    },
    looker: {
      fixed: [["water", "water_plain_free"]],
      rand: [["water", "water_regret", 8], ["fert", "fert_agedama", 12], ["seed", "seed_random", 16]]
    },
    picky: {
      fixed: [["water", "water_rotten"]],
      rand: [["water", "water_sea", 14], ["fert", "fert_timeno", 8], ["seed", "seed_bussasari", 6]]
    },
    king: {
      fixed: [["water", "water_yunokawa"]],
      rand: [["seed", "seed_namara_kawasar", 12], ["seed", "seed_special", 8], ["fert", "fert_skip", 10]]
    },
    flipper: {
      fixed: [["water", "water_nice"]],
      rand: [["fert", "fert_feel", 12], ["water", "water_regret", 8], ["seed", "seed_random", 14]]
    },
    rich: {
      fixed: [["water", "water_overdo"], ["seed", "seed_namara_kawasar"]],
      rand: [["water", "water_supergod", 8], ["seed", "seed_bussasari", 18], ["fert", "fert_timeno", 12]]
    },
    climber: {
      fixed: [["water", "water_suspicious"]],
      rand: [["fert", "fert_guts", 15], ["seed", "seed_line", 10], ["seed", "seed_shop", 12]]
    },
    guide: {
      fixed: [["water", "water_plain_free"], ["seed", "seed_random"]],
      rand: [["fert", "fert_feel", 18], ["water", "water_nice", 12]]
    },
    relax: {
      fixed: [["water", "water_plain_free"]],
      rand: [["seed", "seed_random", 16], ["fert", "fert_feel", 16], ["water", "water_nice", 8]]
    },
    artisan: {
      fixed: [["fert", "fert_guts"]],
      rand: [["fert", "fert_skip", 18], ["water", "water_suspicious", 10], ["seed", "seed_shop", 12]]
    },
    diet: {
      fixed: [["fert", "fert_agedama"]],
      rand: [["water", "water_regret", 10], ["fert", "fert_feel", 12], ["seed", "seed_random", 18]]
    },
    overflow: {
      fixed: [["water", "water_rotten"]],
      rand: [["water", "water_sea", 12], ["fert", "fert_timeno", 8], ["seed", "seed_bussasari", 6]]
    },
    collector: {
      fixed: [["seed", "seed_special"]],
      rand: [["water", "water_yunokawa", 10], ["seed", "seed_namara_kawasar", 10], ["fert", "fert_skip", 8]]
    },
    shadow: {
      fixed: [["water", "water_suspicious"]],
      rand: [["water", "water_rotten", 8], ["water", "water_sea", 10], ["water", "water_overdo", 8]]
    },
    ramen: {
      fixed: [["seed", "seed_random"]],
      rand: [["seed", "seed_shop", 12], ["fert", "fert_guts", 10], ["fert", "fert_feel", 12]]
    },
    streamer: {
      fixed: [],
      rand: [["water", "water_nice", 12], ["seed", "seed_special", 8], ["fert", "fert_skip", 8], ["seed", "seed_bussasari", 10]]
    },
    gourmet: {
      fixed: [["water", "water_yunokawa"]],
      rand: [["water", "water_nice", 14], ["seed", "seed_namara_kawasar", 10], ["fert", "fert_feel", 10]]
    },
    opener: {
      fixed: [["water", "water_nice"]],
      rand: [["seed", "seed_shop", 16], ["seed", "seed_line", 10], ["fert", "fert_skip", 8]]
    },
    party: {
      fixed: [["seed", "seed_random"]],
      rand: [["seed", "seed_shop", 12], ["water", "water_nice", 12], ["fert", "fert_guts", 10]]
    },
    pilgrim: {
      fixed: [["water", "water_overdo"], ["fert", "fert_timeno"]],
      rand: [["water", "water_supergod", 10], ["seed", "seed_special", 10], ["seed", "seed_bussasari", 14]]
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
      book.got[cardId] = {
        count: 0,
        name: info.name,
        rarity: info.rarity
      };
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
    if (localStorage.getItem(KEY.octo) == null) {
      localStorage.setItem(KEY.octo, "1000");
    }

    const inv = loadJSON(KEY.inv, null);
    if (!inv) {
      saveJSON(KEY.inv, { ver: 1, seed: {}, water: {}, fert: {} });
    }

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

        if (count > 0) {
          got[card.id] = {
            count,
            name: card.name,
            rarity: card.rarity
          };
        }
      });
      saveJSON(KEY.book, { got });
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

  function pickVariant(seed, variants) {
    return pick(variants, randFromSeed(seed));
  }

  function buildHint1(card, isExtraPool, jobType) {
    const name = card.name || "";
    const tags = deriveTags(card);

    const pools = [];

    if (/ソース|塩|マヨ|明太|チーズ|味噌|牡蠣/.test(name) || tags.includes("taste")) {
      pools.push([
        "味が主役のやつたこ",
        "味つけで思い出せるタイプたこ",
        "ソースや塩っぽい方向のやつたこ",
        "食べ方の名前が入ってそうなたこ",
        "味系の中から探すと近いたこ"
      ]);
    }

    if (tags.includes("love")) {
      pools.push([
        "恋とか気持ち寄りのやつたこ",
        "感情が入ってるタイプたこ",
        "恋愛っぽい空気のやつたこ",
        "気持ちで覚えやすいやつたこ",
        "関係性を感じる名前のやつたこ"
      ]);
    }

    if (tags.includes("darts")) {
      pools.push([
        "ダーツに関係あるやつたこ",
        "プロっぽい空気あるやつたこ",
        "競技寄りのタイプたこ",
        "狙う感じがあるやつたこ",
        "ダーツ系から探すと近いたこ"
      ]);
    }

    if (tags.includes("shop")) {
      pools.push([
        "お店や店主寄りのやつたこ",
        "現場感あるタイプたこ",
        "店っぽい言葉が入るやつたこ",
        "露店・店主系のやつたこ",
        "お店まわりから探すと近いたこ"
      ]);
    }

    if (tags.includes("god")) {
      pools.push([
        "特別感が強いやつたこ",
        "神とか御神体寄りのやつたこ",
        "格が高そうなタイプたこ",
        "ありがたい空気のやつたこ",
        "普通枠じゃない感じのやつたこ"
      ]);
    }

    if (tags.includes("onsen")) {
      pools.push([
        "場所のイメージが強いやつたこ",
        "温泉っぽさあるやつたこ",
        "函館・ゆのかわ寄りのやつたこ",
        "地名や温泉を思い出すやつたこ",
        "場所から探すと見つけやすいたこ"
      ]);
    }

    if (tags.includes("crowd")) {
      pools.push([
        "人が集まってそうなやつたこ",
        "大会や行列っぽいやつたこ",
        "賑やかさがあるタイプたこ",
        "一人で完結しないやつたこ",
        "人の多さを感じるやつたこ"
      ]);
    }

    if (tags.includes("heat")) {
      pools.push([
        "熱そうなやつたこ",
        "火力高めの空気あるたこ",
        "アツさで覚えやすいやつたこ",
        "熱量つよめのタイプたこ",
        "燃えてそうなやつたこ"
      ]);
    }

    if (tags.includes("memory")) {
      pools.push([
        "過去や記憶っぽいやつたこ",
        "昔を思い出すタイプたこ",
        "記憶寄りの言葉があるやつたこ",
        "時間を感じるやつたこ",
        "過去系から探すと近いたこ"
      ]);
    }

    if (tags.includes("speed")) {
      pools.push([
        "勢いあるやつたこ",
        "走る・飛ぶ感じのやつたこ",
        "動きが強いやつたこ",
        "スピード感あるタイプたこ",
        "アクション寄りのやつたこ"
      ]);
    }

    if (tags.includes("danger") || tags.includes("dark_special")) {
      pools.push([
        "ちょっと怪しいやつたこ",
        "黒さや違和感あるやつたこ",
        "普通じゃない空気のやつたこ",
        "少し危ない感じのやつたこ",
        "クセ強めから探すと近いたこ"
      ]);
    }

    if (isExtraPool) {
      pools.push([
        "第一弾の外にいる特別枠たこ",
        "特別セット寄りのやつたこ",
        "通常枠じゃないほうたこ",
        "外伝っぽい立ち位置たこ",
        "第一弾以外から探すたこ"
      ]);
    }

    if (!pools.length) {
      const rarity = card.rarity || "N";
      if (rarity === "LR" || rarity === "UR") {
        pools.push([
          "目立つやつたこ",
          "上位っぽい空気のやつたこ",
          "レア寄りから探すと近いたこ",
          "印象強めのやつたこ",
          "一発で覚えやすい側たこ"
        ]);
      } else {
        pools.push([
          "第一弾の中で見かけやすい側たこ",
          "図鑑の前の方でも見つけやすいたこ",
          "基本寄りのやつたこ",
          "まずは広めに探すと近いたこ",
          "王道寄りのやつたこ"
        ]);
      }
    }

    const basePool = pickVariant(`hint1-pool::${todayKey()}::${jobType}::${card.id}`, pools);
    return pickVariant(`hint1-line::${todayKey()}::${jobType}::${card.id}`, basePool);
  }

  function buildHint2(card, isExtraPool, jobType) {
    if (isExtraPool) {
      const variants = [
        "第一弾以外の特別枠たこ。かなりレア寄りたこ",
        "通常枠じゃないやつたこ。見つけたら強いたこ",
        "外伝っぽい特別枠たこ。手持ち次第でかなり差が出るたこ",
        "第一弾以外から来てるやつたこ。持ってる人は限られるたこ",
        "特別セット側のやつたこ。普通の図鑑だけだと見逃しやすいたこ"
      ];
      return pickVariant(`hint2-extra::${todayKey()}::${jobType}::${card.id}`, variants);
    }

    const rarity = card.rarity || "N";
    const variantMap = {
      N: [
        "比較的見つけやすい側たこ",
        "図鑑を広く見れば案外いるたこ",
        "持ってる人はそこそこいるたこ",
        "まずは手持ちの基本側を見てみるたこ",
        "難しすぎないほうたこ"
      ],
      R: [
        "珍しすぎないけど印象に残るたこ",
        "ちょっと探す必要あるたこ",
        "人によっては持ってるたこ",
        "基本より一段上を見ると近いたこ",
        "軽く迷うレベルたこ"
      ],
      SR: [
        "そこそこレアなたこ",
        "人によっては持ってないたこ",
        "ここから少し怪しくなるたこ",
        "SR帯を見ると近いたこ",
        "手持ちによって差が出るたこ"
      ],
      UR: [
        "かなりレア寄りたこ",
        "簡単には出てこないたこ",
        "持ってたら強い手札たこ",
        "上位レア側から見るたこ",
        "ここは運も絡むたこ"
      ],
      LR: [
        "最上位クラスたこ",
        "出会えたらかなりアツいたこ",
        "かなり限られてるたこ",
        "本気で探す側たこ",
        "覚悟がいるやつたこ"
      ],
      SP: [
        "かなり特殊なたこ",
        "普通の手札では見かけにくいたこ",
        "特殊枠から探すたこ",
        "通常とは別物寄りたこ",
        "持ってる人かなり少なめたこ"
      ]
    };

    return pickVariant(`hint2-line::${todayKey()}::${jobType}::${card.id}`, variantMap[rarity] || variantMap.SR);
  }

  function takeMid3(text) {
    if (text.length <= 3) return text;
    const start = Math.max(0, Math.floor((text.length - 3) / 2));
    return text.slice(start, start + 3);
  }

  function buildHint3(card, jobType) {
    const cleaned = (card.name || "").replace(/《.*?》/g, "").trim();
    if (!cleaned) return "名前の中にヒントがあるたこ";

    const parts = [];
    if (cleaned.length <= 3) {
      parts.push({ where: "そのまま", value: cleaned });
    } else {
      parts.push({ where: "最初", value: cleaned.slice(0, 3) });
      parts.push({ where: "真ん中", value: takeMid3(cleaned) });
      parts.push({ where: "最後", value: cleaned.slice(-3) });
    }

    const picked = pickVariant(`hint3-part::${todayKey()}::${jobType}::${card.id}`, parts);

    const templates = {
      "最初": [
        `名前の最初に「${picked.value}」があるたこ`,
        `名前の出だしは「${picked.value}」たこ`,
        `最初の3文字は「${picked.value}」たこ`,
        `タイトルの頭に「${picked.value}」が来るたこ`,
        `最初の方を見ると「${picked.value}」たこ`
      ],
      "真ん中": [
        `名前の真ん中あたりに「${picked.value}」があるたこ`,
        `真ん中の3文字は「${picked.value}」たこ`,
        `タイトルの中央寄りに「${picked.value}」が入るたこ`,
        `中ほどを見ると「${picked.value}」たこ`,
        `真ん中あたりのヒントは「${picked.value}」たこ`
      ],
      "最後": [
        `名前の最後に「${picked.value}」があるたこ`,
        `最後の3文字は「${picked.value}」たこ`,
        `タイトルの終わりは「${picked.value}」たこ`,
        `しっぽ側を見ると「${picked.value}」たこ`,
        `名前の後ろのヒントは「${picked.value}」たこ`
      ],
      "そのまま": [
        `名前のヒントは「${picked.value}」たこ`,
        `タイトルの中に「${picked.value}」があるたこ`,
        `名前を見ると「${picked.value}」たこ`,
        `言葉のヒントは「${picked.value}」たこ`,
        `そのまま読むと「${picked.value}」たこ`
      ]
    };

    return pickVariant(`hint3-line::${todayKey()}::${jobType}::${card.id}`, templates[picked.where] || templates["そのまま"]);
  }

  function makeHintsForCard(card, isExtraPool, jobType) {
    return [
      buildHint1(card, isExtraPool, jobType),
      buildHint2(card, isExtraPool, jobType),
      buildHint3(card, jobType)
    ];
  }

  // =========================================================
  // Reward helpers
  // =========================================================
  function rewardOctoByRarity(rarity, rnd) {
    const map = {
      N: [150, 320],
      R: [320, 620],
      SR: [650, 980],
      UR: [1000, 1500],
      LR: [2000, 2800],
      SP: [2200, 3200]
    };
    const range = map[rarity] || [400, 800];
    return scaleOcto(Math.floor(rnd() * (range[1] - range[0] + 1)) + range[0]);
  }

  function rewardOctoHighExtra(rnd) {
    const table = [
      { value: 3000, weight: 70 },
      { value: 4000, weight: 15 },
      { value: 5000, weight: 7 },
      { value: 6000, weight: 5 },
      { value: 7777, weight: 3 }
    ];
    return scaleOcto(weightedPick(table, rnd).value);
  }

  function rewardExpByDifficulty(difficulty) {
    return Math.max(2, difficulty * 3);
  }

  function rewardRepByDifficulty(difficulty) {
    return Math.max(1, difficulty);
  }

  function makeRewardItems(type, difficulty, rnd) {
    const profile = REWARD_PROFILES[type] || REWARD_PROFILES.careful;
    const out = [];

    for (const [kind, id] of profile.fixed) {
      out.push({ kind, id, qty: 1 });
    }

    const count = difficulty <= 2 ? 2 : difficulty === 3 ? 2 : difficulty === 4 ? 3 : 4;
    const randPool = profile.rand.map(([kind, id, weight]) => ({ kind, id, weight }));

    for (let i = 0; i < count; i++) {
      const p = weightedPick(randPool, rnd);
      out.push({ kind: p.kind, id: p.id, qty: 1 });
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
      targetCardId: wanted.card.id,
      targetQty: 1,
      isExtraPool: wanted.isExtraPool,
      rewardOcto: wanted.isExtraPool ? rewardOctoHighExtra(rnd) : rewardOctoByRarity(wanted.card.rarity, rnd),
      rewardExp: rewardExpByDifficulty(difficulty),
      rewardRep: rewardRepByDifficulty(difficulty),
      rewardItems: makeRewardItems(type, difficulty, rnd),
      hints: makeHintsForCard(wanted.card, wanted.isExtraPool, type),
      currentHintIndex: 0,
      hintCosts: [0, 200, 300],
      completed: false,
      completedAt: null,
      retryCount: 0,
      lastBonusOcto: 0
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

    const state = {
      date: today,
      jobs,
      legendJob
    };
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
    b.forEach(tag => {
      if (a.has(tag)) overlap++;
    });
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

  function calcFirstTryBonus(job) {
    return Math.max(180, Math.round(job.rewardOcto * 0.35));
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
    if (speechWrap) {
      speechWrap.insertAdjacentElement("afterend", wrap);
    } else {
      hero.appendChild(wrap);
    }
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
        <div class="matchCardHead">
          <div class="matchAvatarFrame">
            <img
              class="matchAvatar"
              src="${job.visitorImg}"
              alt="${escapeHtml(job.visitorName)}"
              style="width:84px;height:84px;object-fit:contain;transform:scale(1.08);filter:drop-shadow(0 6px 10px rgba(126,70,92,.16));">
          </div>

          <div class="matchHeadRight">
            <div class="matchMetaRow">
              <h3 class="matchName">${escapeHtml(job.visitorName)}</h3>
              <div class="metaRight">
                <div class="matchStars s${job.difficulty}">${stars(job.difficulty)}</div>
                <span class="matchBadge ${status.cls}">${status.label}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="matchMain">
          <div class="matchRewardTitle">マッチング報酬</div>
          ${renderRewardChips(job)}
          ${renderHintBlock(job)}
        </div>
      </article>
    `;
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
      .map(card => ({
        ...card,
        count: Number(owned.got?.[card.id]?.count || 0)
      }))
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
          <p class="modalLine">どのカードを渡すたこ？</p>
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
                        <div
                          class="selectCardOwn"
                          style="
                            right:4px;
                            bottom:4px;
                            min-width:28px;
                            padding:1px 4px;
                            border-radius:4px;
                            font-size:9px;
                            font-weight:900;
                            background:linear-gradient(180deg,#ffea71,#ffb300);
                            color:#4d2400;
                            box-shadow:0 0 0 1px rgba(255,255,255,.8),0 6px 10px rgba(0,0,0,.18);
                          "
                        >所持${card.count}</div>
                      </div>
                      <div class="selectCardName">${escapeHtml(card.name)}</div>
                    </button>
                  </div>
                `).join("")}
               </div>`
            : `<div class="modalStatusList"><div class="modalStatusLine ng">所持カードがないたこ。</div></div>`
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
            <div class="modalStatusLine ok">① ヒントを見て相手が探しているカードを読むたこ</div>
            <div class="modalStatusLine ok">② 所持カードから1枚選んで渡すたこ</div>
            <div class="modalStatusLine ok">③ ぴったりなら ♥ でマッチ成立たこ</div>
            <div class="modalStatusLine ok">④ 失敗しても3回まで挑戦できるたこ</div>
            <div class="modalStatusLine ok">⑤ ヒント2を見る前に一発で当てると +報酬 たこ</div>
            <div class="modalStatusLine ok">⑥ 失敗カウントは3回全部だめだった時だけ反映たこ</div>
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
        <div class="suspenseInner" style="display:flex;align-items:center;justify-content:center;width:100vw;padding:0 10px;">
          <div
            class="suspenseText"
            style="
              white-space:nowrap;
              font-size:min(12vw,56px);
              line-height:1;
              letter-spacing:.06em;
              text-align:center;
              transform-origin:center center;
            "
          >ドキドキドキドキ…</div>
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
    sub.textContent = `${job.visitorName} とマッチ成立たこ。`;

    const rows = [];

    if (job.lastBonusOcto > 0) {
      rows.push(`
        <div class="rewardItem show" style="
          opacity:1;
          transform:none;
          background:linear-gradient(180deg,#fff6b7,#ffd86b);
          color:#6a4300;
          font-weight:900;
          font-size:15px;
          border:1px solid rgba(160,110,0,.18);
          box-shadow:0 10px 18px rgba(255,210,70,.22);
        ">✨ +報酬　一発正解ボーナス +${job.lastBonusOcto.toLocaleString()} オクト</div>
      `);
    }

    rows.push(`<div class="rewardItem">🪙 ${job.rewardOcto.toLocaleString()} オクト</div>`);
    rows.push(`<div class="rewardItem">評判 +${job.rewardRep} / 熱量 +${job.rewardExp}</div>`);
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
      j.completed = true;
      j.completedAt = Date.now();
      j.lastBonusOcto = bonus;
      addOcto(j.rewardOcto + bonus);
      j.rewardItems.forEach(item => addInventory(item.kind, item.id, item.qty));
    });

    renderHeroStats();
    renderBoard();
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
})();