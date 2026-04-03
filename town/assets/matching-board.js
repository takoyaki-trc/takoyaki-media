(() => {
  "use strict";

  // =========================================================
  // Keys
  // =========================================================
  const KEY = {
    board: "ttc_matching_board_v3",
    octo: "roten_v1_octo",
    book: "tf_v1_book",
    inv: "tf_v1_inv",
    matchingMeta: "ttc_matching_meta_v3"
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

  function shuffle(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
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

  const CUSTOMER_LINES = {
    rich: [
      "忘れられない相手ほど、高くつくたこ",
      "もう誰かのものでも、気持ちは止まらないたこ",
      "値段が上がるほど、恋は本物に見えるたこ",
      "手に入らない時間が、気持ちを育てたこ"
    ],
    looker: [
      "別に未練なんてないたこ…ちょっと気になるだけたこ",
      "もう終わったはずなのに、目で追ってしまうたこ",
      "買わないつもりなのに、見に来てしまったたこ"
    ],
    impulse: [
      "見つけた瞬間、もう決まってたこ",
      "逃したら一生後悔するやつたこ",
      "これは運命たこ"
    ],
    careful: [
      "本当にこの子でいいのか、まだ迷ってるたこ",
      "欲しいけど、今じゃない気もするたこ",
      "決め手が足りないたこ"
    ],
    climber: [
      "ここまで来たら、あと一枚なんだたこ",
      "完成するまで終われないたこ",
      "残り一枚が一番遠いたこ"
    ],
    flipper: [
      "欲しい気もするし、やめといたほうがいい気もするたこ",
      "今は正しい気がするたこ（たぶん）",
      "夜の判断は危ないたこ"
    ],
    relax: [
      "そばにあるだけで落ち着くたこ",
      "理由はないけど好きなたこ",
      "こういうのが一番残るたこ"
    ],
    artisan: [
      "分かるやつにしか渡したくないたこ",
      "見た目じゃなくて中身たこ",
      "これは作品たこ"
    ],
    diet: [
      "欲しくないって言えば欲しくなくなるたこ",
      "理屈ではいらないたこ",
      "結論：欲しいたこ"
    ],
    picky: [
      "あの日確かにそこにいたたこ",
      "あの一枚じゃなきゃダメなたこ",
      "まだどこかにあるはずたこ"
    ],
    king: [
      "余にふさわしい相手は、そう簡単には現れないたこ",
      "格も見た目も揃って、ようやく想う価値があるたこ",
      "余が惹かれる以上、それはもう特別なたこ"
    ],
    guide: [
      "案内する側でも、忘れられない一枚くらいあるたこ",
      "最初の一枚って、だいたい一番忘れにくいたこ"
    ],
    overflow: [
      "ちゃんと並んでる子より、はみ出した一枚が気になるたこ",
      "普通じゃ足りない心が、今日も勝ってしまったたこ"
    ],
    collector: [
      "紙の匂いが忘れられないたこ",
      "あの手ざわりを、まだ指先が覚えてるたこ",
      "保存用まで欲しくなる相手って、だいたい本気なたこ"
    ],
    shadow: [
      "濡れた記憶ほど、乾いても残るたこ",
      "しけった空気の中で出会った一枚が忘れられないたこ"
    ],
    ramen: [
      "一枚じゃ足りない恋もあるたこ",
      "会えたら終わりじゃなくて、もっと欲しくなるたこ"
    ],
    streamer: [
      "見せ方ひとつで、恋は何倍にも膨らむたこ",
      "盛り上がる相手ほど、あとで本気になるたこ"
    ],
    gourmet: [
      "あの日食べたあの味が忘れられなくて…",
      "ソースの香りだけで、昔を思い出すたこ",
      "味の記憶って、恋よりしつこいたこ"
    ],
    opener: [
      "中身を知る前から、惹かれてたたこ",
      "未開封のまま終わるには、気持ちが強すぎたこ"
    ],
    party: [
      "一枚だけじゃ、この気持ちは盛り上がらないたこ",
      "祭りのあとに気づく恋もあるたこ"
    ],
    pilgrim: [
      "置き忘れたあの日のカードをまた手に入れたくて",
      "一度手放したあの一枚を、まだ忘れられないたこ",
      "片想いだって分かってても、探してしまうたこ"
    ]
  };

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
        rarity: "SP",
        tier: "N",
        weight: 95
      },
      {
        id: "SP-MIZU-002",
        name: "浸食したカード",
        img: "https://takoyaki-card.com/town/assets/images/sp/sinsykou.png",
        rarity: "SP",
        tier: "LR",
        weight: 5
      }
    ],
    sea: [
      {
        id: "SP-MIZU-001",
        name: "腐敗したカード",
        img: "https://takoyaki-card.com/town/assets/images/sp/huhai.png",
        rarity: "SP",
        tier: "N",
        weight: 98
      },
      {
        id: "SP-MIZU-002",
        name: "浸食したカード",
        img: "https://takoyaki-card.com/town/assets/images/sp/sinsykou.png",
        rarity: "SP",
        tier: "LR",
        weight: 2
      }
    ]
  };

  const CARDS_ALL = [
    ...CARD_POOLS.N.map(v => ({ ...v, id: v.no, rarity: "N" })),
    ...CARD_POOLS.R.map(v => ({ ...v, id: v.no, rarity: "R" })),
    ...CARD_POOLS.SR.map(v => ({ ...v, id: v.no, rarity: "SR" })),
    ...CARD_POOLS.UR.map(v => ({ ...v, id: v.no, rarity: "UR" })),
    ...CARD_POOLS.LR.map(v => ({ ...v, id: v.no, rarity: "LR" })),
    ...TAKOPI_SEED_POOL.map(v => ({ ...v, id: v.id })),
    ...BUSSASARI_POOL.map(v => ({ ...v, id: v.id })),
    ...NAMARA_POOL.map(v => ({ ...v, id: v.id })),
    ...WATER_SPECIAL_CARDS.rotten.map(v => ({ ...v, id: `${v.id}_rotten` })),
    ...WATER_SPECIAL_CARDS.sea.map(v => ({ ...v, id: `${v.id}_sea` }))
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

  function addInventory(kind, id, qty) {
    const inv = loadJSON(KEY.inv, { ver: 1, seed: {}, water: {}, fert: {} });
    inv[kind] = inv[kind] || {};
    inv[kind][id] = Number(inv[kind][id] || 0) + Number(qty || 0);
    saveJSON(KEY.inv, inv);
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

  function getOverallRate() {
    const meta = getMeta();
    if (!meta.totalAttempts) return 0;
    return Math.round((meta.totalSuccess / meta.totalAttempts) * 100);
  }

  // =========================================================
  // Hints
  // =========================================================
  function deriveTags(card) {
    const tags = new Set();
    const name = card.name || "";
    if (/ソース/.test(name)) tags.add("sauce");
    if (/塩/.test(name)) tags.add("salt");
    if (/マヨ/.test(name)) tags.add("mayo");
    if (/明太/.test(name)) tags.add("mentai");
    if (/チーズ/.test(name)) tags.add("cheese");
    if (/味噌/.test(name)) tags.add("miso");
    if (/牡蠣/.test(name)) tags.add("oyster");
    if (/温泉|ゆのかわ/.test(name)) tags.add("onsen");
    if (/真珠|黒き/.test(name)) tags.add("pearl");
    if (/女神|ビーナス/.test(name)) tags.add("goddess");
    if (/神|御神体/.test(name)) tags.add("god");
    if (/恋|デート/.test(name)) tags.add("love");
    if (/ループ/.test(name)) tags.add("loop");
    if (/ダーツ/.test(name)) tags.add("darts");
    if (/露店/.test(name)) tags.add("roten");
    if (/火山|地獄|インフェルノ/.test(name)) tags.add("fire");
    if (/化石|記憶/.test(name)) tags.add("memory");
    if (/イカ/.test(name)) tags.add("ika");
    if (/焼き/.test(name)) tags.add("yaki");
    return Array.from(tags);
  }

  const HINT_TEXTS = {
    sauce: ["ソースの香りだけで、昔を思い出すたこ", "濃い匂いの記憶って、しつこく残るたこ"],
    salt: ["しょっぱい記憶ほど、あとで恋しくなるたこ", "淡いのに、なぜか忘れられないたこ"],
    mayo: ["やさしく包んでくれる感じに弱いたこ", "丸くてやわらかい相手ほど残るたこ"],
    mentai: ["少し刺激がある相手に、まだ未練があるたこ", "ピリッとした子ほど、記憶に残るたこ"],
    cheese: ["濃厚すぎる相手って、だいたい忘れられないたこ", "とろける感じの記憶が残ってるたこ"],
    miso: ["少し深い味わいのある相手に弱いたこ"],
    oyster: ["だしみたいに静かに残る相手がいるたこ"],
    onsen: ["湯気の向こうにいるみたいな相手を探してるたこ", "ご利益みたいな空気に弱いたこ"],
    pearl: ["黒く光る子って、忘れにくいたこ", "真珠みたいな輝き、まだ目に残ってるたこ"],
    goddess: ["高嶺なのに妙に近い相手が忘れられないたこ"],
    god: ["もう人じゃない感じの相手に弱いたこ"],
    love: ["恋っぽい空気をまとった相手が忘れられないたこ"],
    loop: ["終わったはずなのに、また会いたくなるたこ"],
    darts: ["刺さる相手って、ほんとに急に来るたこ"],
    roten: ["露店の灯りの下で会った気がするたこ"],
    fire: ["火傷みたいな記憶が残ってるたこ", "あの日の熱さを、まだ探してるたこ"],
    memory: ["思い出そのものみたいな相手を探してるたこ"],
    ika: ["危ういのに光る相手を探してるたこ"],
    yaki: ["香ばしい思い出ほど忘れにくいたこ"]
  };

  function titleHint(card) {
    const cleaned = (card.name || "").replace(/《.*?》/g, "").trim();
    let chunk = cleaned;
    if (chunk.includes("の")) chunk = chunk.split("の")[0];
    if (chunk.length > 7) chunk = chunk.slice(0, 7);
    if (!chunk) chunk = cleaned.slice(0, 4);
    return `タイトルに「${chunk}」が入ってるたこ`;
  }

  function makeHintsForCard(card, seed) {
    const rnd = randFromSeed(seed);
    const tags = deriveTags(card);
    let base = [];
    tags.forEach(tag => {
      base = base.concat(HINT_TEXTS[tag] || []);
    });
    base = shuffle(base, rnd);
    const hint1 = base[0] || "まだ忘れられないたこ";
    let hint2 = base.find(v => v !== hint1) || "少し特別な気配があるたこ";
    const hint3 = titleHint(card);
    return [hint1, hint2, hint3];
  }

  function makeHintTags(card) {
    const tags = deriveTags(card);
    const out = [];
    if (tags.includes("sauce")) out.push("#ソース系");
    if (tags.includes("salt")) out.push("#しょっぱい記憶");
    if (tags.includes("mayo")) out.push("#やわらか系");
    if (tags.includes("mentai")) out.push("#刺激あり");
    if (tags.includes("cheese")) out.push("#濃厚");
    if (tags.includes("onsen")) out.push("#温泉感");
    if (tags.includes("pearl")) out.push("#黒く光る");
    if (tags.includes("goddess")) out.push("#高嶺感");
    if (tags.includes("god")) out.push("#神格");
    if (tags.includes("love")) out.push("#恋っぽい");
    if (tags.includes("roten")) out.push("#露店感");
    if (tags.includes("fire")) out.push("#熱め");
    if (tags.includes("memory")) out.push("#記憶枠");
    if (!out.length) out.push("#気になる", "#再会希望");
    return out.slice(0, 3);
  }

  function makeTakopiThought(cardRarity, difficulty, seed) {
    const rnd = randFromSeed(seed);

    const byRarity = {
      N: [
        "……この条件ならすぐ見つかるたこ",
        "……在庫でもなんとかなりそうなたこ",
        "……これは優しい世界たこ"
      ],
      R: [
        "……少し探せば見つかるたこ",
        "……持ってる人はそこそこいるたこ",
        "……軽い恋くらいの難易度たこ"
      ],
      SR: [
        "……人によっては持ってないたこ",
        "……ここから少し怪しくなるたこ",
        "……選択ミスると痛いたこ"
      ],
      UR: [
        "……現実はなかなか厳しいたこ",
        "……持ってたらだいぶ強い手札たこ",
        "……在庫というより覚悟の問題たこ"
      ],
      LR: [
        "……それ、本気で言ってるたこ？",
        "……これは“出会えたら奇跡”たこ",
        "……覚悟ないなら触らない方がいいたこ"
      ],
      SP: [
        "……それ、本気で言ってるたこ？",
        "……もう運命の領域たこ",
        "……持ってる人、かなり限られるたこ"
      ]
    };

    const pool = byRarity[cardRarity] || byRarity.SR;
    const line = pick(pool, rnd);

    if (difficulty >= 5 && cardRarity !== "LR" && cardRarity !== "SP") {
      return "……条件だけ見ると、かなり重いたこ";
    }
    return line;
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
      SP: [2200, 3000]
    };
    const range = map[rarity] || [400, 800];
    return Math.floor(rnd() * (range[1] - range[0] + 1)) + range[0];
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

    let count = difficulty <= 2 ? 2 : difficulty === 3 ? 2 : difficulty === 4 ? 3 : 4;
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
    if (legend) return CARDS_ALL.filter(c => ["LR", "SP", "UR"].includes(c.rarity));

    if (type === "gourmet") {
      return CARDS_ALL.filter(c => /焼き|ソース|マヨ|塩|明太|味噌|牡蠣|温泉|イカ/.test(c.name));
    }
    if (type === "collector") {
      return CARDS_ALL.filter(c => ["SR", "UR", "LR"].includes(c.rarity) || /御神体|真珠|記憶|神/.test(c.name));
    }
    if (type === "shadow" || type === "picky" || type === "overflow") {
      return CARDS_ALL.filter(c => ["SR", "UR", "SP", "LR"].includes(c.rarity));
    }
    if (type === "rich" || type === "king" || type === "pilgrim") {
      return CARDS_ALL.filter(c => ["SR", "UR", "LR", "SP"].includes(c.rarity));
    }
    if (type === "guide") {
      return CARDS_ALL.filter(c => ["N", "R"].includes(c.rarity));
    }
    if (type === "impulse" || type === "opener" || type === "streamer") {
      return CARDS_ALL.filter(c => ["N", "R", "SR"].includes(c.rarity));
    }
    if (type === "climber" || type === "artisan") {
      return CARDS_ALL.filter(c => ["R", "SR", "UR"].includes(c.rarity));
    }
    if (type === "party" || type === "ramen") {
      return CARDS_ALL.filter(c => ["N", "R", "SR", "UR"].includes(c.rarity));
    }
    return CARDS_ALL.filter(c => ["N", "R", "SR"].includes(c.rarity));
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
    const pool = getDisplayPoolByType(type, legend);
    const picked = pick(pool, rnd);
    return { card: picked, qty: 1 };
  }

  function getCustomerLine(type, rnd) {
    const lines = CUSTOMER_LINES[type] || ["まだ忘れられないたこ"];
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
      rewardOcto: rewardOctoByRarity(wanted.card.rarity, rnd),
      rewardExp: rewardExpByDifficulty(difficulty),
      rewardRep: rewardRepByDifficulty(difficulty),
      rewardItems: makeRewardItems(type, difficulty, rnd),
      hintTags: makeHintTags(wanted.card),
      hints: makeHintsForCard(wanted.card, `${dateSeed}::hint::${type}::${idx}`),
      currentHintIndex: 0,
      hintCosts: [0, 200, 300],
      takopiThought: makeTakopiThought(wanted.card.rarity, difficulty, `${dateSeed}::thought::${type}::${idx}`),
      completed: false,
      completedAt: null,
      retryCount: 0
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
    if ((card.rarity === "UR" || card.rarity === "LR" || card.rarity === "SP") && (target.rarity === "UR" || target.rarity === "LR" || target.rarity === "SP")) {
      score += 10;
    }
    return Math.min(94, score);
  }

  function judgeScore(score) {
    if (score >= 100) return { icon: "♥", verdict: "perfect", text: "運命の一枚だったようだ" };
    if (score >= 65) return { icon: "♥", verdict: "success", text: "好みだったようだ" };
    return { icon: "💔", verdict: "fail", text: "好みではなかったようだ" };
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
      action: `${job.retryCount + 1}回目のマッチ（${job.retryCount}/3）`,
      disabled: false
    };
  }

  // =========================================================
  // Hero / top meter
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
        <div class="heroStatsNodeNum" id="heroChallengeCount">0</div>
        <div class="heroStatsNodeLabel">挑戦</div>
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

  function renderHintSingle(job) {
    const idx = Number(job.currentHintIndex || 0);
    const currentText = job.hints[idx];
    const nextIdx = idx + 1;

    return `
      <div class="matchHintSingle">
        <div class="matchHintCurrent">${escapeHtml(currentText)}</div>
        <div class="matchHintFooter">
          ${
            nextIdx < job.hints.length
              ? `<button class="matchHintNextBtn" data-open-next-hint="${job.id}">
                   次のヒントへ（${job.hintCosts[nextIdx]}オクト）
                 </button>`
              : `<button class="matchHintNextBtn" disabled>これ以上ヒントなし</button>`
          }
        </div>
      </div>
    `;
  }

  function renderJobCard(job) {
    const status = getJobStatus(job);

    return `
      <article class="matchCard ${job.completed ? "isDone" : ""}">
        <div class="matchCardHead">
          <div class="matchAvatarFrame">
            <img class="matchAvatar" src="${job.visitorImg}" alt="${escapeHtml(job.visitorName)}">
          </div>

          <div class="matchHeadRight">
            <div class="matchSpeech">${escapeHtml(job.line)}</div>

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

          <div class="matchThoughtBox">
            <div class="matchThoughtCap">🐙 たこぴの心の声</div>
            <div class="matchThoughtText">${escapeHtml(job.takopiThought)}</div>
          </div>

          <div class="matchHintPanel">
            <div class="matchHintHead">
              <div class="matchHintTakopi">🐙</div>
              <div class="matchHintTitle">今日の希望は……？</div>
            </div>

            ${renderHintSingle(job)}

            <div class="matchActionRow">
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
    const ownedCards = CARDS_ALL
      .map(card => ({
        ...card,
        count: Number(owned.got?.[card.id]?.count || 0)
      }))
      .filter(v => v.count > 0)
      .sort((a, b) => {
        const rarityOrder = { SP: 6, LR: 5, UR: 4, SR: 3, R: 2, N: 1 };
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
          <p class="modalLine">この一枚で、あの人は振り向くたこ？</p>
        </div>

        <div class="modalRight">
          <div class="matchStars s${job.difficulty}">${stars(job.difficulty)}</div>
          <div class="modalTagRow">
            <span class="modalTag">現在 ${status.action}</span>
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
        <div class="heartJudgeInner">
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
    await new Promise(r => setTimeout(r, 1350));
    layer.classList.remove("show");
    await new Promise(r => setTimeout(r, 120));
  }

  async function showJudge(judgement) {
    ensureJudgeLayers();
    const layer = $("#heartJudgeLayer");
    const icon = $("#heartJudgeIcon");
    const text = $("#heartJudgeText");
    const sub = $("#heartJudgeSub");
    if (!layer || !icon || !text || !sub) return;

    icon.textContent = judgement.icon;
    text.textContent = judgement.verdict === "fail" ? "好みではなかったようだ" : "鼓動が重なった";
    sub.textContent = judgement.text;

    layer.classList.add("show");
    await new Promise(r => setTimeout(r, 1450));
    layer.classList.remove("show");
    await new Promise(r => setTimeout(r, 150));
  }

  async function showRewardModal(job) {
    const modal = $("#rewardModal");
    const title = $("#rewardTitle");
    const sub = $("#rewardSub");
    const list = $("#rewardList");
    if (!modal || !title || !sub || !list || !job) return;

    title.textContent = "……焼けたね";
    sub.textContent = `${job.visitorName} とマッチ成立たこ。`;

    const rows = [
      `🪙 ${job.rewardOcto.toLocaleString()} オクト`,
      `評判 +${job.rewardRep} / 熱量 +${job.rewardExp}`,
      ...job.rewardItems.map(v => `${itemIcon(v.kind)} ${itemLabel(v.kind, v.id)} ×${v.qty}`)
    ];

    list.innerHTML = rows.map(v => `<div class="rewardItem">${escapeHtml(v)}</div>`).join("");
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");

    const items = $$(".rewardItem", list);
    for (let i = 0; i < items.length; i++) {
      await new Promise(r => setTimeout(r, 120));
      items[i].classList.add("show");
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

    closeJobModal();
    await showSuspense();

    const card = CARD_MAP[cardId];
    const score = cardScoreAgainstJob(card, job);
    const judgement = judgeScore(score);

    const meta = getMeta();
    meta.totalAttempts += 1;
    const typeStats = ensureTypeStats(meta, job.type);
    typeStats.attempts += 1;

    await showJudge(judgement);

    if (judgement.verdict === "fail") {
      meta.totalFail += 1;
      typeStats.fail += 1;
      saveMeta(meta);

      updateJob(jobId, (j) => {
        j.retryCount += 1;
      });

      renderHeroStats();
      renderBoard();

      const latest = getJobById(jobId);
      if (latest && latest.retryCount >= 3) {
        showTakopiToast("……今日はこの相手、もう心を開かないたこ");
      } else {
        showTakopiToast("……違う、それじゃないたこ");
      }
      return;
    }

    meta.totalSuccess += 1;
    typeStats.success += 1;
    saveMeta(meta);

    addOwned(cardId, -1);

    updateJob(jobId, (j) => {
      j.completed = true;
      j.completedAt = Date.now();
      addOcto(j.rewardOcto);
      j.rewardItems.forEach(item => addInventory(item.kind, item.id, item.qty));
    });

    renderHeroStats();
    renderBoard();
    await showRewardModal(getJobById(jobId));
    showTakopiToast("……焼けたね");
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
      }
    });
  }

  // =========================================================
  // Boot
  // =========================================================
  ensureDefaults();
  generateBoard(false);
  bindUI();
  renderHero();
  renderBoard();
})();