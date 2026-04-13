(() => {
  "use strict";

  // =========================================================
  // takofarm.js（釣り連携 完全版）
  // ✅ アニバーサリー：図鑑ではSP扱い（rarity="SP"固定）
  // ✅ XP：rarityではなく tier（N/R/SR/UR/LR）に沿って入る（tier優先）
  // ✅ 図鑑：tierも保存
  // ✅ タネ選択モーダルで
  //        seed_colabo → 「コラボ」(赤)
  //        seed_anniv  → 「期間限定」(目立つ色)
  // ✅ 月間記録 ttc_monthly_stats_v1 に harvest を自動反映
  // ✅ 釣りドロップ水4種に対応
  // ✅ 腐ったミズ / 海水 専用カード対応
  // ✅ 焦げは1タップで即回収
  // ✅ ミズはレアリティ抽選のみ反映
  // ✅ 時短はヒリョウのみ反映
  // ✅ 70%時短で 1時間30分 になるよう修正
  // ✅ 収穫モーダル：カード下に「閉じる」「図鑑を確認する」の2ボタン
  // ✅ タワー肥料4種を追加
  // ✅ 寝かせた肥料から低確率で SP-HR-001 / SP-HR-002 が出る
  // ✅ レベルアップ時：中央に大きく3秒演出表示 → その後に報酬モーダル
  // ✅ レベルアップ報酬モーダルを今風に整理
  //    ・説明文削除
  //    ・「図鑑へ」ボタン削除
  //    ・閉じるボタンのみ
  // =========================================================

  // =========================
  // マス画像（状態ごと）
  // =========================
  const PLOT_IMG = {
    EMPTY: "https://ul.h3z.jp/muPEAkao.png",

    GROW1: "https://ul.h3z.jp/BrHRk8C4.png",
    GROW2: "https://ul.h3z.jp/tD4LUB6F.png",

    COLABO_GROW1: "https://ul.h3z.jp/cq1soJdm.gif",
    COLABO_GROW2: "https://ul.h3z.jp/I6Iu4J32.gif",

    ANNIV_GROW1: "https://takoyaki-card.com/town/assets/images/anniversary/tane1.gif",
    ANNIV_GROW2: "https://takoyaki-card.com/town/assets/images/anniversary/tane2.gif",

    READY: "https://ul.h3z.jp/AmlnQA1b.png",
    BURN: "https://ul.h3z.jp/q9hxngx6.png",

    GROW2_SR65: "https://ul.h3z.jp/HfpFoeBk.png",
    GROW2_SR100: "https://ul.h3z.jp/tBVUoc8w.png",
  };

  // =========================
  // LocalStorage Keys
  // =========================
  const LS_STATE = "tf_v1_state";
  const LS_BOOK = "tf_v1_book";
  const LS_PLAYER = "tf_v1_player";
  const LS_INV = "tf_v1_inv";
  const LS_LOADOUT = "tf_v1_loadout";
  const LS_OCTO = "roten_v1_octo";
  const LS_MONTHLY_STATS = "ttc_monthly_stats_v1";

  const BASE_GROW_MS = 5 * 60 * 60 * 1000;
  const READY_TO_BURN_MS = 24 * 60 * 60 * 1000;
  const TICK_MS = 1000;

  const BASE_RARITY_RATE = { N: 70, R: 20, SR: 8, UR: 1.8, LR: 0.2 };

  // =========================================================
  // 月間記録
  // =========================================================
  function getMonthKey(date = new Date()) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
  }

  function defaultMonthlyStats() {
    return {
      monthKey: getMonthKey(),
      harvest: 0,
      sales: 0,
      fishing: 0,
      tower: 0,
    };
  }

  function normalizeMonthlyStats(raw) {
    const curMonth = getMonthKey();

    if (!raw || typeof raw !== "object") {
      return defaultMonthlyStats();
    }

    const monthKey = String(raw.monthKey || "");
    if (monthKey !== curMonth) {
      return defaultMonthlyStats();
    }

    return {
      monthKey: curMonth,
      harvest: Number(raw.harvest || 0),
      sales: Number(raw.sales || 0),
      fishing: Number(raw.fishing || 0),
      tower: Number(raw.tower || 0),
    };
  }

  function loadMonthlyStats() {
    try {
      const raw = localStorage.getItem(LS_MONTHLY_STATS);
      if (!raw) {
        const def = defaultMonthlyStats();
        localStorage.setItem(LS_MONTHLY_STATS, JSON.stringify(def));
        return def;
      }
      const parsed = JSON.parse(raw);
      const norm = normalizeMonthlyStats(parsed);
      localStorage.setItem(LS_MONTHLY_STATS, JSON.stringify(norm));
      return norm;
    } catch (e) {
      const def = defaultMonthlyStats();
      localStorage.setItem(LS_MONTHLY_STATS, JSON.stringify(def));
      return def;
    }
  }

  function saveMonthlyStats(stats) {
    const norm = normalizeMonthlyStats(stats);
    localStorage.setItem(LS_MONTHLY_STATS, JSON.stringify(norm));
  }

  function addMonthlyHarvest(count = 1) {
    const s = loadMonthlyStats();
    s.monthKey = getMonthKey();
    s.harvest = Number(s.harvest || 0) + Math.max(0, Number(count || 0));
    saveMonthlyStats(s);
  }

  // =========================================================
  // カードプール
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
      { no: "TN-048", name: "店主反撃レビュー《佐俣雄一郎🎯》", img: "https://ul.h3z.jp/ge8b4cQ5.jpg" },
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
      { no: "TN-047", name: "ボスゲート", img: "https://ul.h3z.jp/GHWrtaYk.jpg" },
    ],
    SR: [
      { no: "TN-004", name: "見えるフリ焼き", img: "https://ul.h3z.jp/irs6Sxoy.jpg" },
      { no: "TN-010", name: "焼ク者ノ証", img: "https://ul.h3z.jp/6A2LOn4A.jpg" },
      { no: "TN-015", name: "顔コイン", img: "https://ul.h3z.jp/7GUyGDU1.jpg" },
      { no: "TN-020", name: "ピック不要の真実", img: "https://ul.h3z.jp/Bu1pk4ul.jpg" },
      { no: "TN-030", name: "ガチャたこ焼き", img: "https://ul.h3z.jp/kFpjcqSv.jpg" },
      { no: "TN-039", name: "ドローン誤配達", img: "https://ul.h3z.jp/70A10oHf.jpg" },
      { no: "TN-040", name: "推し活たこ団扇", img: "https://ul.h3z.jp/jY5MVsrt.jpg" },
      { no: "TN-049", name: "たこ焼きの御神体", img: "https://ul.h3z.jp/GQ8H0lGq.jpg" },
    ],
    UR: [
      { no: "TN-001", name: "黒き真珠イカさま焼き", img: "assets/images/1stcard/001ur1.png" },
      { no: "TN-007", name: "ローソク出せ！", img: "assets/images/1stcard/007ur1.png" },
      { no: "TN-033", name: "鉄板のビーナス", img: "assets/images/1stcard/033ur1.png" },
      { no: "TN-045", name: "ドリームファイト", img: "assets/images/1stcard/045ur1.png" },
    ],
    LR: [
      { no: "TN-025", name: "たこ焼き化石in函館山", img: "https://ul.h3z.jp/NEuFQ7PB.png" },
      { no: "TN-050", name: "焼かれし記憶、ソースに還る", img: "assets/images/1stcard/050lr1.png" },
    ],
  };

  // =========================================================
  // タネ一覧
  // =========================================================
  const SEEDS = [
    {
      id: "seed_random",
      name: "なに出るタネ",
      desc: "何が出るか\n誰もまだ\n知らない",
      factor: 1.0,
      img: "https://ul.h3z.jp/gnyvP580.png",
      fx: "第一弾全50種"
    },
    {
      id: "seed_shop",
      name: "店頭タネ",
      desc: "店頭カード\nだけ出る\nタネです",
      factor: 1.0,
      img: "https://ul.h3z.jp/IjvuhWoY.png",
      fx: "店頭全25種"
    },
    {
      id: "seed_line",
      name: "回線タネ",
      desc: "通販カード\nだけ出る\nタネです",
      factor: 1.0,
      img: "https://ul.h3z.jp/AonxB5x7.png",
      fx: "BOOTH全25種"
    },
    {
      id: "seed_special",
      name: "たこぴのタネ",
      desc: "植えると\nたこぴだけ\n出てくる",
      factor: 1.0,
      img: "https://ul.h3z.jp/29OsEvjf.png",
      fx: "たこぴカード8種"
    },

    {
      id: "seed_bussasari",
      name: "ブッ刺さりタネ",
      desc: "ダーツプロ\n5種だけが\n出てくる",
      factor: 1.05,
      img: "https://ul.h3z.jp/MjWkTaU3.png",
      fx: "ダーツプロ全5種"
    },
    {
      id: "seed_namara_kawasar",
      name: "なまら買わさるタネ",
      desc: "限定カード\nだけ狙える\n特別タネ",
      factor: 1.08,
      img: "https://ul.h3z.jp/yiqHzfi0.png",
      fx: "限定ｼｮｯﾌﾟｶｰﾄﾞ全12種"
    },

    {
      id: "seed_colabo",
      name: "【ｺﾗﾎﾞ】ぐらたん\nのタネ",
      desc: "2種だけを\nランダムで\n収穫する",
      factor: 1.0,
      img: "https://ul.h3z.jp/wbnwoTzm.png",
      fx: "全2種《N/LR》"
    },
    {
      id: "seed_anniv",
      name: "ﾊｰﾌｱﾆﾊﾞｰｻﾘｰ\nのタネ",
      desc: "5種から\nランダムで\n収穫する",
      factor: 1.0,
      img: "https://takoyaki-card.com/town/assets/images/anniversary/anv1.png",
      fx: "全5種《N/R/SR/UR/LR》"
    },
  ];

  // =========================================================
  // 水一覧
  // =========================================================
  const WATERS = [
    {
      id: "water_plain_free",
      name: "ただの水",
      desc: "基本の水\n高レアは\n出ません",
      factor: 1.0,
      fx: "基準（水）",
      img: "https://ul.h3z.jp/13XdhuHi.png",
      rates: { N: 62.5, R: 31.2, SR: 6.3, UR: 0, LR: 0 }
    },
    {
      id: "water_nice",
      name: "なんか良さそうな水",
      desc: "少しだけ\n上振れする\nやさしい水",
      factor: 0.98,
      fx: "ちょい上振れ",
      img: "https://ul.h3z.jp/3z04ypEd.png",
      rates: { N: 60.5, R: 31.0, SR: 7.3, UR: 1.2, LR: 0 }
    },
    {
      id: "water_suspicious",
      name: "怪しい水",
      desc: "現実寄りの\n標準抽選\nのミズです",
      factor: 0.95,
      fx: "標準（現実準拠）",
      img: "https://ul.h3z.jp/wtCO9mec.png",
      rates: { N: 66.0, R: 28.5, SR: 4.5, UR: 0.8, LR: 0.2 }
    },
    {
      id: "water_overdo",
      name: "やりすぎな水",
      desc: "高レアを\n狙いやすい\n勝負の水",
      factor: 0.9,
      fx: "勝負",
      img: "https://ul.h3z.jp/vsL9ggf6.png",
      rates: { N: 58.0, R: 29.0, SR: 9.5, UR: 2.8, LR: 0.7 }
    },
    {
      id: "water_regret",
      name: "押さなきゃよかった水",
      desc: "ほぼ事件\nほぼNしか\n出ません",
      factor: 1.0,
      fx: "事件",
      img: "https://ul.h3z.jp/L0nafMOp.png",
      rates: { N: 99.97, R: 0, SR: 0, UR: 0, LR: 0.03 }
    },

    {
      id: "water_rotten",
      name: "腐ったミズ",
      desc: "レア段階が\n1つ下がる\nSPもある",
      factor: 1.06,
      fx: "1段階ダウン / SPカード出るかも",
      img: "https://takoyaki-card.com/town/assets/images/mizu/6.png",
      rates: { N: 0, R: 0, SR: 0, UR: 0, LR: 0 }
    },
    {
      id: "water_sea",
      name: "海水",
      desc: "Nが多めで\nたまにSPも\n混ざります",
      factor: 0.98,
      fx: "N多め / SPカード稀に出るかも",
      img: "https://takoyaki-card.com/town/assets/images/mizu/7.png",
      rates: { N: 0, R: 0, SR: 0, UR: 0, LR: 0 }
    },
    {
      id: "water_yunokawa",
      name: "ゆのかわの温泉ミズ",
      desc: "Rがかなり\n出やすくて\n安定型です",
      factor: 0.88,
      fx: "安定",
      img: "https://takoyaki-card.com/town/assets/images/mizu/8.png",
      rates: { N: 30.0, R: 68.0, SR: 1.5, UR: 0.4, LR: 0.1 }
    },
    {
      id: "water_supergod",
      name: "超神水",
      desc: "高レアを\n強く呼ぶ\n神のミズ",
      factor: 0.72,
      fx: "アツい",
      img: "https://takoyaki-card.com/town/assets/images/mizu/9.png",
      rates: { N: 38.0, R: 50.0, SR: 10.0, UR: 1.0, LR: 1.0 }
    },
  ];

  // =========================================================
  // タワー肥料 / SP
  // =========================================================
  const TOWER_FERT_IDS = new Set([
    "fert_balance",
    "fert_sleep",
    "fert_takoyaki",
    "fert_drop"
  ]);

  const TOWER_SP_REWARD = {
    id: "SP-TOWER-001",
    name: "たこ焼きタワーSPカード",
    img: "https://ul.h3z.jp/LoXMSiYd.jpg",
    rarity: "SP"
  };

  const SLEEP_FERT_SP_CARDS = [
    {
      id: "SP-HR-001",
      name: "元カード、現ヒリョウ",
      img: "https://takoyaki-card.com/town/assets/images/sp/hiryo01.png",
      rarity: "SP",
      tier: "SR",
      weight: 85
    },
    {
      id: "SP-HR-002",
      name: "先輩ヒリョウ",
      img: "https://takoyaki-card.com/town/assets/images/sp/hiryo02.png",
      rarity: "SP",
      tier: "LR",
      weight: 15
    }
  ];

  // =========================================================
  // 肥料
  // =========================================================
  const FERTS = [
    {
      id: "fert_sleep",
      name: "寝かせた肥料",
      desc: "時間は\n1.5倍に\nなります",
      factor: 1.5,
      fx: "時間 1.5倍 / 低確率でSPカード",
      img: "https://takoyaki-card.com/town/assets/images/hiryou/hiryou7.png",
      burnCardUp: 0.0,
      rawCardChance: 0.0,
      towerSpChance: 0.0,
      sleepSpChance: 0.05,
      mantra: false,
      skipGrowAnim: false
    },
    {
      id: "fert_balance",
      name: "天秤にかけた肥料",
      desc: "10秒か\n2倍時間か\n半々です",
      factor: 1.0,
      fx: "10秒 or 2倍",
      img: "https://takoyaki-card.com/town/assets/images/hiryou/hiryou6.png",
      burnCardUp: 0.0,
      rawCardChance: 0.0,
      towerSpChance: 0.0,
      mantra: false,
      skipGrowAnim: false,
      specialGrow: "balance"
    },
    {
      id: "fert_agedama",
      name: "ただの揚げ玉",
      desc: "時短なし\nたまに焼き\nすぎカード",
      factor: 1.0,
      fx: "時短 0%",
      img: "https://ul.h3z.jp/9p5fx53n.png",
      burnCardUp: 0.12,
      rawCardChance: 0.0,
      towerSpChance: 0.0,
      mantra: false,
      skipGrowAnim: false
    },
    {
      id: "fert_feel",
      name: "気のせい肥料",
      desc: "少しだけ\n早くなる\n気がする",
      factor: 0.95,
      fx: "時短 5%",
      img: "https://ul.h3z.jp/XqFTb7sw.png",
      burnCardUp: 0.0,
      rawCardChance: 0.0,
      towerSpChance: 0.0,
      mantra: false,
      skipGrowAnim: false
    },
    {
      id: "fert_guts",
      name: "根性論ぶち込み肥料",
      desc: "気合いで\n少し早く\n育てます",
      factor: 0.8,
      fx: "時短 20%",
      img: "https://ul.h3z.jp/bT9ZcNnS.png",
      burnCardUp: 0.0,
      rawCardChance: 0.0,
      towerSpChance: 0.0,
      mantra: true,
      skipGrowAnim: false
    },
    {
      id: "fert_skip",
      name: "工程すっ飛ばし肥料",
      desc: "途中を\n飛ばして\n早く育つ",
      factor: 0.6,
      fx: "時短 40%",
      img: "https://ul.h3z.jp/FqPzx12Q.png",
      burnCardUp: 0.0,
      rawCardChance: 0.01,
      towerSpChance: 0.0,
      mantra: false,
      skipGrowAnim: true
    },
    {
      id: "fert_takoyaki",
      name: "たこ焼き風味の肥料",
      desc: "香ばしく\nかなり早く\n育てます",
      factor: 0.4,
      fx: "時短 60%",
      img: "https://takoyaki-card.com/town/assets/images/hiryou/hiryou8.png",
      burnCardUp: 0.0,
      rawCardChance: 0.0,
      towerSpChance: 0.0,
      mantra: false,
      skipGrowAnim: false
    },
    {
      id: "fert_timeno",
      name: "時間を信じない肥料",
      desc: "禁忌級の\n強い時短\nたまに生焼け",
      factor: 0.25,
      fx: "時短 75%",
      img: "https://ul.h3z.jp/l2njWY57.png",
      burnCardUp: 0.0,
      rawCardChance: 0.03,
      towerSpChance: 0.0,
      mantra: false,
      skipGrowAnim: true
    },
    {
      id: "fert_drop",
      name: "天からの一滴",
      desc: "ほぼ待たず\nすぐ育つ\n最速肥料",
      factor: 0.1,
      fx: "時短 90%",
      img: "https://takoyaki-card.com/town/assets/images/hiryou/hiryou9.png",
      burnCardUp: 0.0,
      rawCardChance: 0.0,
      towerSpChance: 0.0,
      mantra: false,
      skipGrowAnim: true
    },
  ];

  const TAKOPI_SEED_POOL = [
    { id: "TP-001", name: "届け！たこぴ便", img: "https://ul.h3z.jp/rjih1Em9.png", rarity: "N" },
    { id: "TP-002", name: "ハロウィンたこぴ", img: "https://ul.h3z.jp/hIDWKss0.png", rarity: "N" },
    { id: "TP-003", name: "紅葉たこぴ", img: "https://ul.h3z.jp/G05m1hbT.png", rarity: "N" },
    { id: "TP-004", name: "クリスマスたこぴ", img: "https://ul.h3z.jp/FGEKvxhK.png", rarity: "N" },
    { id: "TP-005", name: "お年玉たこぴ", img: "https://ul.h3z.jp/OPz58Wt6.png", rarity: "N" },
    { id: "TP-006", name: "バレンタインたこぴ", img: "https://ul.h3z.jp/J0kj3CLb.png", rarity: "N" },
    { id: "TP-007", name: "花見たこぴ", img: "https://ul.h3z.jp/KrCy4WQb.png", rarity: "N" },
    { id: "TP-008", name: "入学たこぴ", img: "https://ul.h3z.jp/DidPdK9b.png", rarity: "UR" },
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
  ];

  const GRATIN_POOL = [
    { id: "col-001", name: "伝説のたこ焼きライバー", img: "https://ul.h3z.jp/CmVTkAd2.png", rarity: "LR" },
    { id: "col-002", name: "たこ焼き実況者ライバー", img: "https://ul.h3z.jp/1VQvIP7v.png", rarity: "N" },
  ];
  const GRATIN_LR_CHANCE = 0.05;

  const ANNIV_POOL = [
    { id: "SP-ANV-001", name: "会話トリガー:店主", img: "https://takoyaki-card.com/town/assets/images/anniversary/1.png", rarity: "SP", tier: "N" },
    { id: "SP-ANV-002", name: "定型ループNPC", img: "https://takoyaki-card.com/town/assets/images/anniversary/2.png", rarity: "SP", tier: "R" },
    { id: "SP-ANV-003", name: "始まりの合図", img: "https://takoyaki-card.com/town/assets/images/anniversary/3.png", rarity: "SP", tier: "SR" },
    { id: "SP-ANV-004", name: "ここにいる店主", img: "https://takoyaki-card.com/town/assets/images/anniversary/4a.jpg", rarity: "SP", tier: "UR" },
    { id: "SP-ANV-005", name: "物語の外側", img: "https://takoyaki-card.com/town/assets/images/anniversary/4b.jpg", rarity: "SP", tier: "LR" },
  ];

  // =========================================================
  // 腐ったミズ / 海水 専用カード
  // =========================================================
  const WATER_SPECIAL_CARDS = {
    rotten: [
      {
        id: "SP-MIZU-001",
        name: "腐敗したカード",
        img: "https://takoyaki-card.com/town/assets/images/sp/huhai.png",
        rarity: "N",
        tier: "N",
        weight: 95
      },
      {
        id: "SP-MIZU-002",
        name: "浸食したカード",
        img: "https://takoyaki-card.com/town/assets/images/sp/sinsykou.png",
        rarity: "LR",
        tier: "LR",
        weight: 5
      }
    ],
    sea: [
      {
        id: "SP-MIZU-001",
        name: "腐敗したカード",
        img: "https://takoyaki-card.com/town/assets/images/sp/huhai.png",
        rarity: "N",
        tier: "N",
        weight: 98
      },
      {
        id: "SP-MIZU-002",
        name: "浸食したカード",
        img: "https://takoyaki-card.com/town/assets/images/sp/sinsykou.png",
        rarity: "LR",
        tier: "LR",
        weight: 2
      }
    ]
  };

  function pickWeightedCard(list) {
    const total = list.reduce((sum, x) => sum + Math.max(0, Number(x.weight || 0)), 0);
    if (total <= 0) return list[0];
    let r = Math.random() * total;
    for (const item of list) {
      r -= Math.max(0, Number(item.weight || 0));
      if (r <= 0) return item;
    }
    return list[0];
  }

  function pickWaterSpecialReward(waterId) {
    let pool = null;

    if (waterId === "water_rotten") {
      pool = WATER_SPECIAL_CARDS.rotten;
    } else if (waterId === "water_sea") {
      pool = WATER_SPECIAL_CARDS.sea;
    }

    if (!pool || !pool.length) return null;

    const c = pickWeightedCard(pool);
    return {
      id: c.id,
      name: c.name,
      img: c.img,
      rarity: c.rarity,
      tier: c.tier
    };
  }

  function pickSleepFertSpecialReward() {
    const c = pickWeightedCard(SLEEP_FERT_SP_CARDS);
    return {
      id: c.id,
      name: c.name,
      img: c.img,
      rarity: "SP",
      tier: c.tier
    };
  }

  const ANNIV_RATES = {
    N: 66,
    R: 20,
    SR: 10,
    UR: 3,
    LR: 1
  };

  const MAX_PLOTS = 25;
  const START_UNLOCK = 3;

  const XP_BY_RARITY = { N: 10, R: 20, SR: 40, UR: 130, LR: 200, SP: 0 };

  function xpNeedForLevel(level) {
    return 120 + (level - 1) * 50 + Math.floor(Math.pow(level - 1, 1.6) * 20);
  }

  function defaultPlayer() {
    return { ver: 1, level: 1, xp: 0, unlocked: START_UNLOCK };
  }

  function loadPlayer() {
    try {
      const raw = localStorage.getItem(LS_PLAYER);
      if (!raw) return defaultPlayer();
      const p = JSON.parse(raw);
      if (!p || typeof p !== "object") return defaultPlayer();
      const lvl = Math.max(1, Number(p.level || 1));
      const xp = Math.max(0, Number(p.xp || 0));
      const unl = Math.min(MAX_PLOTS, Math.max(START_UNLOCK, Number(p.unlocked || START_UNLOCK)));
      return { ver: 1, level: lvl, xp: xp, unlocked: unl };
    } catch (e) {
      return defaultPlayer();
    }
  }

  function savePlayer(p) {
    localStorage.setItem(LS_PLAYER, JSON.stringify(p));
  }

  let player = loadPlayer();

  // =========================================================
  // 在庫
  // =========================================================
  function defaultInv() {
    const inv = { ver: 1, seed: {}, water: {}, fert: {} };
    SEEDS.forEach((x) => (inv.seed[x.id] = 0));
    WATERS.forEach((x) => (inv.water[x.id] = 0));
    FERTS.forEach((x) => (inv.fert[x.id] = 0));
    return inv;
  }

  function loadInv() {
    try {
      const raw = localStorage.getItem(LS_INV);
      if (!raw) return defaultInv();
      const inv = JSON.parse(raw);
      if (!inv || typeof inv !== "object") return defaultInv();
      inv.seed = inv.seed || {};
      inv.water = inv.water || {};
      inv.fert = inv.fert || {};
      for (const x of SEEDS) if (!(x.id in inv.seed)) inv.seed[x.id] = 0;
      for (const x of WATERS) if (!(x.id in inv.water)) inv.water[x.id] = 0;
      for (const x of FERTS) if (!(x.id in inv.fert)) inv.fert[x.id] = 0;
      return inv;
    } catch (e) {
      return defaultInv();
    }
  }

  function saveInv(inv) {
    localStorage.setItem(LS_INV, JSON.stringify(inv));
  }

  function invGet(inv, invType, id) {
    const box = inv[invType] || {};
    const n = Number(box[id] ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  function invAdd(inv, invType, id, delta) {
    if (!inv[invType]) inv[invType] = {};
    const cur = Number(inv[invType][id] ?? 0);
    inv[invType][id] = Math.max(0, cur + delta);
  }

  function invDec(inv, invType, id) {
    const cur = invGet(inv, invType, id);
    if (cur <= 0) return false;
    invAdd(inv, invType, id, -1);
    return true;
  }

  function loadOcto() {
    const n = Number(localStorage.getItem(LS_OCTO) ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  function saveOcto(n) {
    localStorage.setItem(LS_OCTO, String(Math.max(0, Math.floor(Number(n) || 0))));
  }

  function addOcto(delta) {
    const cur = loadOcto();
    const next = Math.max(0, cur + Math.floor(Number(delta) || 0));
    saveOcto(next);
    return next;
  }

  function randInt(min, max) {
    min = Math.floor(min);
    max = Math.floor(max);
    if (max < min) [min, max] = [max, min];
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function clamp(x, a, b) {
    return Math.max(a, Math.min(b, x));
  }

  function octoRewardForLevel(level) {
    const lv = Math.max(1, Math.floor(level));
    const t = Math.min(1, (lv - 1) / 18);
    const min = Math.round(3000 + 2500 * t);
    const max = Math.round(6500 + 3500 * t);
    return clamp(randInt(min, max), 3000, 10000);
  }

  function pickWeighted(list) {
    const total = list.reduce((a, x) => a + (x.w || 0), 0);
    if (total <= 0) return list[0]?.v;
    let r = Math.random() * total;
    for (const x of list) {
      r -= x.w || 0;
      if (r <= 0) return x.v;
    }
    return list[list.length - 1]?.v;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function itemRewardForLevel(level) {
    const lv = Math.max(1, Math.floor(level));

    const count =
      lv >= 15 ? pickWeighted([{ v: 2, w: 55 }, { v: 3, w: 45 }]) :
      lv >= 8 ? pickWeighted([{ v: 1, w: 30 }, { v: 2, w: 70 }]) :
      1;

    const cat =
      lv >= 12 ? pickWeighted([{ v: "seed", w: 45 }, { v: "water", w: 30 }, { v: "fert", w: 25 }]) :
      lv >= 6 ? pickWeighted([{ v: "seed", w: 55 }, { v: "water", w: 25 }, { v: "fert", w: 20 }]) :
      pickWeighted([{ v: "seed", w: 70 }, { v: "water", w: 20 }, { v: "fert", w: 10 }]);

    const seedChoices = SEEDS.filter((x) => x.id !== "seed_colabo" && x.id !== "seed_anniv");
    const waterChoices = WATERS.slice();
    const fertChoices = FERTS.filter((x) => !TOWER_FERT_IDS.has(x.id));

    const rewards = [];
    for (let k = 0; k < count; k++) {
      let picked = null;
      if (cat === "seed") picked = pick(seedChoices);
      if (cat === "water") picked = pick(waterChoices);
      if (cat === "fert") picked = pick(fertChoices);
      if (!picked) picked = pick(seedChoices);

      rewards.push({
        kind: cat,
        id: picked.id,
        name: picked.name,
        img: picked.img,
        qty: 1,
      });
    }

    const map = new Map();
    for (const r of rewards) {
      const key = `${r.kind}:${r.id}`;
      const prev = map.get(key);
      if (prev) prev.qty += r.qty;
      else map.set(key, { ...r });
    }
    return Array.from(map.values());
  }

  function grantLevelRewards(level) {
    const octo = octoRewardForLevel(level);
    addOcto(octo);

    const items = itemRewardForLevel(level);
    const inv = loadInv();
    for (const it of items) {
      if (it.kind === "seed") invAdd(inv, "seed", it.id, it.qty);
      if (it.kind === "water") invAdd(inv, "water", it.id, it.qty);
      if (it.kind === "fert") invAdd(inv, "fert", it.id, it.qty);
    }
    saveInv(inv);

    return { octo, items };
  }

  function addXP(amount) {
    if (!Number.isFinite(amount) || amount <= 0) {
      return { leveled: false, unlockedDelta: 0, rewards: [] };
    }

    let leveled = false;
    let unlockedDelta = 0;
    const rewards = [];

    player.xp += Math.floor(amount);

    while (player.xp >= xpNeedForLevel(player.level)) {
      player.xp -= xpNeedForLevel(player.level);
      player.level += 1;
      leveled = true;

      const r = grantLevelRewards(player.level);
      let unlockedNow = 0;

      if (player.unlocked < MAX_PLOTS) {
        player.unlocked += 1;
        unlockedDelta += 1;
        unlockedNow = 1;
      }

      rewards.push({
        level: player.level,
        unlockedNow,
        ...r
      });
    }

    savePlayer(player);
    return { leveled, unlockedDelta, rewards };
  }

  function defaultLoadout() {
    return { ver: 1, seedId: null, waterId: null, fertId: null };
  }

  function loadLoadout() {
    try {
      const raw = localStorage.getItem(LS_LOADOUT);
      if (!raw) return defaultLoadout();
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== "object") return defaultLoadout();
      return {
        ver: 1,
        seedId: obj.seedId || null,
        waterId: obj.waterId || null,
        fertId: obj.fertId || null,
      };
    } catch (e) {
      return defaultLoadout();
    }
  }

  function saveLoadout(l) {
    localStorage.setItem(LS_LOADOUT, JSON.stringify(l));
  }

  let loadout = loadLoadout();

  const defaultPlot = () => ({ state: "EMPTY" });
  const defaultState = () => ({ ver: 1, plots: Array.from({ length: MAX_PLOTS }, defaultPlot) });

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_STATE);
      if (!raw) return defaultState();
      const obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.plots) || obj.plots.length !== MAX_PLOTS) return defaultState();
      return obj;
    } catch (e) {
      return defaultState();
    }
  }

  function saveState(s) {
    localStorage.setItem(LS_STATE, JSON.stringify(s));
  }

  function loadBook() {
    try {
      const raw = localStorage.getItem(LS_BOOK);
      if (!raw) return { ver: 1, got: {} };
      const obj = JSON.parse(raw);
      if (!obj || typeof obj.got !== "object") return { ver: 1, got: {} };
      return obj;
    } catch (e) {
      return { ver: 1, got: {} };
    }
  }

  function saveBook(b) {
    localStorage.setItem(LS_BOOK, JSON.stringify(b));
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function fmtRemain(ms) {
    if (ms <= 0) return "00:00:00";
    const s = Math.floor(ms / 1000);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
  }

  function pickRarityWithWater(waterId) {
    const w = WATERS.find((x) => x.id === waterId);

    if (w && w.id === "water_rotten") {
      if (Math.random() < 0.12) return "WATER_SPECIAL";

      const baseRates = {
        N: 70.0,
        R: 24.0,
        SR: 5.0,
        UR: 0.8,
        LR: 0.2
      };
      const keys = ["N", "R", "SR", "UR", "LR"];

      let total = 0;
      for (const k of keys) total += Math.max(0, Number(baseRates[k] ?? 0));
      if (total <= 0) return "N";

      let r = Math.random() * total;
      for (const k of keys) {
        r -= Math.max(0, Number(baseRates[k] ?? 0));
        if (r <= 0) {
          if (k === "LR") return "UR";
          if (k === "UR") return "SR";
          if (k === "SR") return "R";
          if (k === "R") return "N";
          return "N";
        }
      }
      return "N";
    }

    if (w && w.id === "water_sea") {
      if (Math.random() < 0.03) return "WATER_SPECIAL";

      const rates = {
        N: 82.0,
        R: 16.5,
        SR: 1.1,
        UR: 0.3,
        LR: 0.1
      };
      const keys = ["N", "R", "SR", "UR", "LR"];

      let total = 0;
      for (const k of keys) total += Math.max(0, Number(rates[k] ?? 0));
      if (total <= 0) return "N";

      let r = Math.random() * total;
      for (const k of keys) {
        r -= Math.max(0, Number(rates[k] ?? 0));
        if (r <= 0) return k;
      }
      return "N";
    }

    if (w && w.id === "water_yunokawa") {
      const rates = {
        N: 30.0,
        R: 68.0,
        SR: 1.5,
        UR: 0.4,
        LR: 0.1
      };
      const keys = ["N", "R", "SR", "UR", "LR"];

      let total = 0;
      for (const k of keys) total += Math.max(0, Number(rates[k] ?? 0));
      if (total <= 0) return "N";

      let r = Math.random() * total;
      for (const k of keys) {
        r -= Math.max(0, Number(rates[k] ?? 0));
        if (r <= 0) return k;
      }
      return "N";
    }

    if (w && w.id === "water_supergod") {
      const rates = {
        N: 30.0,
        R: 50.0,
        SR: 18.0,
        UR: 1.0,
        LR: 1.0
      };
      const keys = ["N", "R", "SR", "UR", "LR"];

      let total = 0;
      for (const k of keys) total += Math.max(0, Number(rates[k] ?? 0));
      if (total <= 0) return "N";

      let r = Math.random() * total;
      for (const k of keys) {
        r -= Math.max(0, Number(rates[k] ?? 0));
        if (r <= 0) return k;
      }
      return "N";
    }

    if (w && w.rates) {
      const rates = w.rates;
      const keys = ["N", "R", "SR", "UR", "LR"];
      let total = 0;
      for (const k of keys) total += Math.max(0, Number(rates[k] ?? 0));
      if (total <= 0) return "N";

      let r = Math.random() * total;
      for (const k of keys) {
        r -= Math.max(0, Number(rates[k] ?? 0));
        if (r <= 0) return k;
      }
      return "N";
    }

    const keys = Object.keys(BASE_RARITY_RATE);
    let total = 0;
    for (const k of keys) total += Math.max(0, BASE_RARITY_RATE[k]);
    let r = Math.random() * total;
    for (const k of keys) {
      r -= Math.max(0, BASE_RARITY_RATE[k]);
      if (r <= 0) return k;
    }
    return "N";
  }

  function makeTNSet(from, to) {
    const set = new Set();
    for (let i = from; i <= to; i++) {
      set.add(`TN-${String(i).padStart(3, "0")}`);
    }
    return set;
  }

  const SHOP_TN_SET = makeTNSet(1, 25);
  const LINE_TN_SET = makeTNSet(26, 50);

  function filterPoolBySeed(seedId, pool) {
    if (!Array.isArray(pool)) return [];
    if (seedId === "seed_shop") return pool.filter((c) => SHOP_TN_SET.has(c.no));
    if (seedId === "seed_line") return pool.filter((c) => LINE_TN_SET.has(c.no));
    return pool;
  }

  function getPoolByRarity(rarity) {
    const p = CARD_POOLS && CARD_POOLS[rarity] ? CARD_POOLS[rarity] : [];
    return Array.isArray(p) ? p : [];
  }

  function fallbackPickBySeed(seedId, startRarity) {
    const order = ["LR", "UR", "SR", "R", "N"];
    const startIdx = order.indexOf(startRarity);
    const list = startIdx >= 0 ? order.slice(startIdx) : order;
    for (const r of list) {
      const pool = filterPoolBySeed(seedId, getPoolByRarity(r));
      if (pool.length) return { rarity: r, card: pick(pool) };
    }
    const baseN = getPoolByRarity("N");
    return { rarity: "N", card: pick(baseN.length ? baseN : [{ no: "TN-000", name: "NO DATA", img: "" }]) };
  }

  function pickBussasariReward() {
    const c = pick(BUSSASARI_POOL);
    return { id: c.id, name: c.name, img: c.img, rarity: "N" };
  }

  function pickNamaraReward() {
    const c = pick(NAMARA_POOL);
    return { id: c.id, name: c.name, img: c.img, rarity: c.rarity };
  }

  function pickGratinReward() {
    const isLR = Math.random() < GRATIN_LR_CHANCE;
    const c = isLR ? GRATIN_POOL.find((x) => x.rarity === "LR") : GRATIN_POOL.find((x) => x.rarity === "N");
    return { id: c.id, name: c.name, img: c.img, rarity: c.rarity };
  }

  function pickAnnivTier() {
    const keys = ["N", "R", "SR", "UR", "LR"];
    let total = 0;
    for (const k of keys) total += Math.max(0, Number(ANNIV_RATES[k] ?? 0));
    if (total <= 0) return "N";
    let r = Math.random() * total;
    for (const k of keys) {
      r -= Math.max(0, Number(ANNIV_RATES[k] ?? 0));
      if (r <= 0) return k;
    }
    return "N";
  }

  function pickAnnivReward() {
    const tier = pickAnnivTier();
    const c =
      ANNIV_POOL.find((x) => String(x.tier || "").toUpperCase() === tier) ||
      ANNIV_POOL.find((x) => String(x.tier || "").toUpperCase() === "N") ||
      ANNIV_POOL[0];
    return { id: c.id, name: c.name, img: c.img, rarity: "SP", tier: c.tier || tier };
  }

  function pickFertSPIfAny(p) {
    if (!p) return null;
    const fert = FERTS.find((x) => x.id === (p.fertId || null));
    if (!fert) return null;

    if (fert.id === "fert_sleep") {
      const sleepSpP = Number(fert.sleepSpChance ?? 0);
      if (sleepSpP > 0 && Math.random() < sleepSpP) {
        return pickSleepFertSpecialReward();
      }
    }

    const towerSpP = Number(fert.towerSpChance ?? 0);
    if (towerSpP > 0 && Math.random() < towerSpP) {
      return { ...TOWER_SP_REWARD };
    }

    const burnP = Number(fert.burnCardUp ?? 0);
    if (burnP > 0 && Math.random() < burnP) {
      return {
        id: "SP-BURN",
        name: "焼きすぎたカード",
        img: "https://ul.h3z.jp/VSQupsYH.png",
        rarity: "SP",
        tier: "N"
      };
    }

    const rawP = Number(fert.rawCardChance ?? 0);
    if (rawP > 0 && Math.random() < rawP) {
      return {
        id: "SP-RAW",
        name: "ドロドロ生焼けカード",
        img: "https://ul.h3z.jp/5E5NpGKP.png",
        rarity: "SP",
        tier: "N"
      };
    }

    return null;
  }

  function drawRewardForPlot(p) {
    const sp = pickFertSPIfAny(p);
    if (sp) return sp;

    if (p && p.seedId === "seed_special") {
      const c = pick(TAKOPI_SEED_POOL);
      return { id: c.id, name: c.name, img: c.img, rarity: c.rarity || "N" };
    }
    if (p && p.seedId === "seed_colabo") {
      return pickGratinReward();
    }
    if (p && p.seedId === "seed_anniv") {
      return pickAnnivReward();
    }
    if (p && p.seedId === "seed_bussasari") {
      return pickBussasariReward();
    }
    if (p && p.seedId === "seed_namara_kawasar") {
      return pickNamaraReward();
    }

    const rarity = p && p.fixedRarity ? p.fixedRarity : pickRarityWithWater(p ? p.waterId : null);

    if (rarity === "WATER_SPECIAL") {
      const special = pickWaterSpecialReward(p ? p.waterId : null);
      if (special) return special;
    }

    const seedId = p ? p.seedId : null;
    const filtered = filterPoolBySeed(seedId, getPoolByRarity(rarity));
    const picked = filtered.length ? { rarity, card: pick(filtered) } : fallbackPickBySeed(seedId, rarity);

    const c = picked.card;
    return { id: c.no, name: c.name, img: c.img, rarity: picked.rarity };
  }

  function rarityLabel(r, tier) {
    const R = String(r || "").toUpperCase();
    const T = String(tier || "").toUpperCase();
    if (R === "SP" && T) return `SP（${T}）`;
    return r || "";
  }

  function calcGrowMsByFert(fert) {
    if (!fert) return BASE_GROW_MS;

    if (fert.specialGrow === "balance") {
      return Math.random() < 0.5 ? 10 * 1000 : BASE_GROW_MS * 2;
    }

    const growFactor = clamp((fert.factor ?? 1), 0.1, 2.0);
    return Math.floor(BASE_GROW_MS * growFactor);
  }

  const farmEl = document.getElementById("farm");
  const stBook = document.getElementById("stBook");
  const stGrow = document.getElementById("stGrow");
  const stReady = document.getElementById("stReady");
  const stBurn = document.getElementById("stBurn");

  const stLevel = document.getElementById("stLevel");
  const stXP = document.getElementById("stXP");
  const stXpLeft = document.getElementById("stXpLeft");
  const stXpNeed = document.getElementById("stXpNeed");
  const stXpBar = document.getElementById("stXpBar");
  const stUnlock = document.getElementById("stUnlock");

  const equipSeedBtn = document.getElementById("equipSeed");
  const equipWaterBtn = document.getElementById("equipWater");
  const equipFertBtn = document.getElementById("equipFert");

  const equipSeedImg = document.getElementById("equipSeedImg");
  const equipWaterImg = document.getElementById("equipWaterImg");
  const equipFertImg = document.getElementById("equipFertImg");

  const equipSeedName = document.getElementById("equipSeedName");
  const equipWaterName = document.getElementById("equipWaterName");
  const equipFertName = document.getElementById("equipFertName");

  const equipSeedCnt = document.getElementById("equipSeedCnt");
  const equipWaterCnt = document.getElementById("equipWaterCnt");
  const equipFertCnt = document.getElementById("equipFertCnt");

  const modal = document.getElementById("modal");
  const mTitle = document.getElementById("mTitle");
  const mBody = document.getElementById("mBody");
  const mClose = document.getElementById("mClose");

  const __missing = [];
  if (!farmEl) __missing.push("#farm");
  if (!stBook) __missing.push("#stBook");
  if (!stGrow) __missing.push("#stGrow");
  if (!stReady) __missing.push("#stReady");
  if (!stBurn) __missing.push("#stBurn");
  if (!stLevel) __missing.push("#stLevel");
  if (!stXP) __missing.push("#stXP");
  if (!stXpLeft) __missing.push("#stXpLeft");
  if (!stXpNeed) __missing.push("#stXpNeed");
  if (!stXpBar) __missing.push("#stXpBar");
  if (!stUnlock) __missing.push("#stUnlock");

  if (!equipSeedBtn) __missing.push("#equipSeed");
  if (!equipWaterBtn) __missing.push("#equipWater");
  if (!equipFertBtn) __missing.push("#equipFert");

  if (!equipSeedImg) __missing.push("#equipSeedImg");
  if (!equipWaterImg) __missing.push("#equipWaterImg");
  if (!equipFertImg) __missing.push("#equipFertImg");

  if (!equipSeedName) __missing.push("#equipSeedName");
  if (!equipWaterName) __missing.push("#equipWaterName");
  if (!equipFertName) __missing.push("#equipFertName");

  if (!equipSeedCnt) __missing.push("#equipSeedCnt");
  if (!equipWaterCnt) __missing.push("#equipWaterCnt");
  if (!equipFertCnt) __missing.push("#equipFertCnt");

  if (!modal) __missing.push("#modal");
  if (!mTitle) __missing.push("#mTitle");
  if (!mBody) __missing.push("#mBody");
  if (!mClose) __missing.push("#mClose");

  if (__missing.length) {
    console.error("❌ 必須DOMが見つからない:", __missing.join(", "));
    alert("HTMLに必須IDが足りません: " + __missing.join(", "));
    return;
  }

  let state = loadState();
  let book = loadBook();
  let inv = loadInv();

  let __scrollY = 0;
  let __locked = false;

  function isInsideModalContent(target) {
    return !!(target && (target === mBody || mBody.contains(target)));
  }

  function preventTouchMove(e) {
    if (modal.getAttribute("aria-hidden") !== "false") return;
    if (isInsideModalContent(e.target)) return;
    e.preventDefault();
  }

  function preventWheel(e) {
    if (modal.getAttribute("aria-hidden") !== "false") return;
    if (isInsideModalContent(e.target)) return;
    e.preventDefault();
  }

  function lockScroll() {
    if (__locked) return;
    __locked = true;

    __scrollY = window.scrollY || document.documentElement.scrollTop || 0;

    document.body.style.position = "fixed";
    document.body.style.top = `-${__scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    mBody.style.maxHeight = "72vh";
    mBody.style.overflowY = "auto";
    mBody.style.webkitOverflowScrolling = "touch";
    mBody.style.overscrollBehavior = "contain";
    mBody.style.touchAction = "pan-y";

    document.addEventListener("touchmove", preventTouchMove, { passive: false });
    document.addEventListener("wheel", preventWheel, { passive: false });
  }

  function unlockScroll() {
    if (!__locked) return;
    __locked = false;

    document.removeEventListener("touchmove", preventTouchMove, { passive: false });
    document.removeEventListener("wheel", preventWheel, { passive: false });

    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    document.body.style.overflow = "";

    mBody.style.maxHeight = "";
    mBody.style.overflowY = "";
    mBody.style.webkitOverflowScrolling = "";
    mBody.style.overscrollBehavior = "";
    mBody.style.touchAction = "";

    window.scrollTo(0, __scrollY);
  }

  function onBackdrop(e) {
    if (e.target === modal) closeModalOrCommit();
  }

  function onEsc(e) {
    if (e.key === "Escape") closeModalOrCommit();
  }

  function openModal(title, html) {
    modal.removeEventListener("click", onBackdrop);
    document.removeEventListener("keydown", onEsc);

    mTitle.textContent = title;
    mBody.innerHTML = html;
    modal.setAttribute("aria-hidden", "false");

    lockScroll();

    modal.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onEsc);
  }

  function closeModal() {
    modal.setAttribute("aria-hidden", "true");
    modal.removeEventListener("click", onBackdrop);
    document.removeEventListener("keydown", onEsc);
    mBody.innerHTML = "";
    unlockScroll();
  }

  function showToast(message) {
    let el = document.getElementById("farmToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "farmToast";
      el.style.position = "fixed";
      el.style.left = "50%";
      el.style.bottom = "24px";
      el.style.transform = "translateX(-50%)";
      el.style.zIndex = "99999";
      el.style.padding = "10px 14px";
      el.style.borderRadius = "999px";
      el.style.background = "rgba(20,20,20,.88)";
      el.style.color = "#fff";
      el.style.fontSize = "13px";
      el.style.fontWeight = "900";
      el.style.boxShadow = "0 8px 20px rgba(0,0,0,.28)";
      el.style.opacity = "0";
      el.style.pointerEvents = "none";
      el.style.transition = "opacity .18s ease";
      document.body.appendChild(el);
    }

    el.textContent = message;
    el.style.opacity = "1";

    if (showToast._timer) clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      el.style.opacity = "0";
    }, 900);
  }

  // =========================================================
  // レベルアップ演出
  // =========================================================
  function showLevelUpSplash({ fromLevel, toLevel, unlockedDelta = 0, onDone } = {}) {
    const old = document.getElementById("levelUpSplash");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.id = "levelUpSplash";
    overlay.innerHTML = `
      <div class="levelup-bg-glow"></div>
      <div class="levelup-card">
        <div class="levelup-top">LEVEL UP!</div>
        <div class="levelup-main">Lv ${fromLevel} → Lv ${toLevel}</div>
        <div class="levelup-sub">${unlockedDelta > 0 ? `新しい畑が ${unlockedDelta} マス解放！` : "報酬獲得！"}</div>
        <div class="levelup-stars" aria-hidden="true">
          <span>✦</span><span>✦</span><span>✦</span>
        </div>
      </div>
    `;

    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "100001",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(circle at center, rgba(255,214,102,.18), rgba(14,10,30,.82) 42%, rgba(8,7,18,.94) 100%)",
      backdropFilter: "blur(4px)",
      WebkitBackdropFilter: "blur(4px)",
      opacity: "0",
      transition: "opacity .28s ease"
    });

    const glow = overlay.querySelector(".levelup-bg-glow");
    const card = overlay.querySelector(".levelup-card");
    const top = overlay.querySelector(".levelup-top");
    const main = overlay.querySelector(".levelup-main");
    const sub = overlay.querySelector(".levelup-sub");
    const stars = overlay.querySelector(".levelup-stars");

    Object.assign(glow.style, {
      position: "absolute",
      width: "52vmin",
      height: "52vmin",
      maxWidth: "420px",
      maxHeight: "420px",
      borderRadius: "999px",
      background: "radial-gradient(circle, rgba(255,228,140,.35) 0%, rgba(255,180,70,.12) 38%, rgba(255,150,70,0) 72%)",
      filter: "blur(10px)",
      transform: "scale(.8)",
      opacity: ".9"
    });

    Object.assign(card.style, {
      position: "relative",
      width: "min(88vw, 420px)",
      padding: "28px 22px 24px",
      borderRadius: "28px",
      textAlign: "center",
      color: "#fff",
      background: "linear-gradient(180deg, rgba(255,212,94,.98) 0%, rgba(255,155,72,.98) 54%, rgba(214,88,53,.98) 100%)",
      border: "2px solid rgba(255,244,204,.78)",
      boxShadow: "0 18px 48px rgba(0,0,0,.42), inset 0 1px 0 rgba(255,255,255,.35)",
      transform: "translateY(14px) scale(.86)",
      opacity: "0",
      transition: "transform .32s cubic-bezier(.2,.8,.2,1), opacity .28s ease"
    });

    Object.assign(top.style, {
      fontSize: "14px",
      fontWeight: "1000",
      letterSpacing: ".22em",
      marginBottom: "10px",
      color: "#fffef7",
      textShadow: "0 2px 8px rgba(90,30,0,.24)"
    });

    Object.assign(main.style, {
      fontSize: "clamp(28px, 8vw, 42px)",
      lineHeight: "1.08",
      fontWeight: "1000",
      letterSpacing: ".02em",
      color: "#ffffff",
      textShadow: "0 3px 10px rgba(90,25,0,.28)"
    });

    Object.assign(sub.style, {
      marginTop: "12px",
      fontSize: "14px",
      lineHeight: "1.5",
      fontWeight: "900",
      color: "rgba(255,252,245,.98)",
      textShadow: "0 2px 8px rgba(90,25,0,.18)"
    });

    Object.assign(stars.style, {
      marginTop: "14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "16px",
      fontSize: "18px",
      fontWeight: "1000",
      color: "#fff6c7",
      textShadow: "0 0 12px rgba(255,255,200,.62)"
    });

    Array.from(stars.children).forEach((s, idx) => {
      s.style.display = "inline-block";
      s.style.transform = "translateY(0) scale(1)";
      s.style.animation = `farmLevelStarFloat 1.1s ease-in-out ${idx * 0.12}s infinite alternate`;
    });

    if (!document.getElementById("farmLevelUpSplashStyle")) {
      const style = document.createElement("style");
      style.id = "farmLevelUpSplashStyle";
      style.textContent = `
        @keyframes farmLevelStarFloat {
          from { transform: translateY(0) scale(1); opacity: .78; }
          to   { transform: translateY(-6px) scale(1.12); opacity: 1; }
        }
        @keyframes farmLevelCardPulse {
          0%   { box-shadow: 0 18px 48px rgba(0,0,0,.42), 0 0 0 rgba(255,230,120,0), inset 0 1px 0 rgba(255,255,255,.35); }
          50%  { box-shadow: 0 18px 48px rgba(0,0,0,.42), 0 0 34px rgba(255,226,130,.40), inset 0 1px 0 rgba(255,255,255,.35); }
          100% { box-shadow: 0 18px 48px rgba(0,0,0,.42), 0 0 0 rgba(255,230,120,0), inset 0 1px 0 rgba(255,255,255,.35); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      glow.style.transform = "scale(1)";
      card.style.transform = "translateY(0) scale(1)";
      card.style.opacity = "1";
      card.style.animation = "farmLevelCardPulse 1.2s ease-in-out infinite";
    });

    setTimeout(() => {
      overlay.style.opacity = "0";
      card.style.transform = "translateY(-6px) scale(1.04)";
      card.style.opacity = "0";
      glow.style.opacity = "0";

      setTimeout(() => {
        overlay.remove();
        if (typeof onDone === "function") onDone();
      }, 320);
    }, 3000);
  }

  let __harvestCommitFn = null;

  function setHarvestCommit(fn) {
    __harvestCommitFn = typeof fn === "function" ? fn : null;
  }

  function clearHarvestCommit() {
    __harvestCommitFn = null;
  }

  function closeModalOrCommit() {
    if (__harvestCommitFn) {
      const fn = __harvestCommitFn;
      __harvestCommitFn = null;
      fn();
      return;
    }
    closeModal();
  }

  mClose.addEventListener("click", closeModalOrCommit);

  function renderLoadout() {
    inv = loadInv();
    loadout = loadLoadout();

    const seed = SEEDS.find((x) => x.id === loadout.seedId) || null;
    const water = WATERS.find((x) => x.id === loadout.waterId) || null;
    const fert = FERTS.find((x) => x.id === loadout.fertId) || null;

    if (seed) {
      equipSeedImg.src = seed.img;
      equipSeedName.textContent = seed.name;
      equipSeedCnt.textContent = `×${invGet(inv, "seed", seed.id)}`;
    } else {
      equipSeedImg.src = PLOT_IMG.EMPTY;
      equipSeedName.textContent = "未装備";
      equipSeedCnt.textContent = "×0";
    }

    if (water) {
      equipWaterImg.src = water.img;
      equipWaterName.textContent = water.name;
      equipWaterCnt.textContent = `×${invGet(inv, "water", water.id)}`;
    } else {
      equipWaterImg.src = PLOT_IMG.EMPTY;
      equipWaterName.textContent = "未装備";
      equipWaterCnt.textContent = "×0";
    }

    if (fert) {
      equipFertImg.src = fert.img;
      equipFertName.textContent = fert.name;
      equipFertCnt.textContent = `×${invGet(inv, "fert", fert.id)}`;
    } else {
      equipFertImg.src = PLOT_IMG.EMPTY;
      equipFertName.textContent = "未装備";
      equipFertCnt.textContent = "×0";
    }
  }

  function openPickGrid(kind) {
    inv = loadInv();
    loadout = loadLoadout();

    const isSeed = kind === "seed";
    const isWater = kind === "water";
    const isFert = kind === "fert";

    const items = isSeed ? SEEDS : isWater ? WATERS : FERTS;
    const invType = isSeed ? "seed" : isWater ? "water" : "fert";

    const title = isSeed ? "種を選ぶ" : isWater ? "水を選ぶ" : "肥料を選ぶ";

    const FISHING_WATER_IDS = new Set([
      "water_rotten",
      "water_sea",
      "water_yunokawa",
      "water_supergod"
    ]);

    const cells = items
      .map((x) => {
        const cnt = invGet(inv, invType, x.id);
        const disabled = cnt <= 0;
        const selected =
          (isSeed && loadout.seedId === x.id) ||
          (isWater && loadout.waterId === x.id) ||
          (isFert && loadout.fertId === x.id);

        let topBadge = "";

        if (isSeed && x.id === "seed_colabo") {
          topBadge = `
            <div style="
              position:absolute;
              top:6px;
              right:6px;
              z-index:3;
              padding:3px 7px;
              border-radius:999px;
              font-size:10px;
              font-weight:1000;
              letter-spacing:.02em;
              line-height:1;
              background:rgba(255,70,90,.96);
              border:1px solid rgba(255,110,130,.98);
              color:#fff;
              box-shadow:0 3px 10px rgba(0,0,0,.22);
              pointer-events:none;
            ">コラボ</div>
          `;
        } else if (isSeed && x.id === "seed_anniv") {
          topBadge = `
            <div style="
              position:absolute;
              top:6px;
              right:6px;
              z-index:3;
              padding:3px 7px;
              border-radius:999px;
              font-size:10px;
              font-weight:1000;
              letter-spacing:.02em;
              line-height:1;
              background:rgba(255,195,80,.96);
              border:1px solid rgba(255,220,130,.98);
              color:#0b0d17;
              box-shadow:0 3px 10px rgba(0,0,0,.22);
              pointer-events:none;
            ">期間限定</div>
          `;
        } else if (isWater && FISHING_WATER_IDS.has(x.id)) {
          topBadge = `
            <div style="
              position:absolute;
              top:6px;
              right:6px;
              z-index:3;
              padding:3px 7px;
              border-radius:999px;
              font-size:10px;
              font-weight:1000;
              letter-spacing:.02em;
              line-height:1;
              background:rgba(90,180,255,.96);
              border:1px solid rgba(150,215,255,.98);
              color:#07131f;
              box-shadow:0 3px 10px rgba(0,0,0,.22);
              pointer-events:none;
            ">釣り</div>
          `;
        } else if (isFert && TOWER_FERT_IDS.has(x.id)) {
          topBadge = `
            <div style="
              position:absolute;
              top:6px;
              right:6px;
              z-index:3;
              padding:3px 7px;
              border-radius:999px;
              font-size:10px;
              font-weight:1000;
              letter-spacing:.02em;
              line-height:1;
              background:rgba(255,196,70,.98);
              border:1px solid rgba(255,228,145,.98);
              color:#2a1600;
              box-shadow:0 3px 10px rgba(0,0,0,.22);
              pointer-events:none;
            ">タワー</div>
          `;
        }

        return `
        <button class="gridCard ${selected ? "isSelected" : ""}" type="button" data-pick="${x.id}" ${disabled ? "disabled" : ""}>
          <div class="gridImg" style="position:relative;">
            <img src="${x.img}" alt="${x.name}">
            ${topBadge}
            <div class="gridCnt">×${cnt}</div>
            ${selected ? `<div class="gridSel">装備中</div>` : ``}
            ${disabled ? `<div class="gridEmpty">在庫なし</div>` : ``}
          </div>
          <div class="gridName">${x.name}</div>
          <div class="gridDesc">${(x.desc || "").replace(/\n/g, "<br>")}</div>
          <div class="gridFx">${x.fx ? `効果：<b>${x.fx}</b>` : ""}</div>
        </button>
      `;
      })
      .join("");

    openModal(
      title,
      `
      <div class="step">※すべて在庫制。露店で買うか、釣りで増やす。<br>装備は消費しない（植えた時に消費）。</div>
      <div class="gridWrap">${cells}</div>
      <div class="row">
        <button type="button" id="gridClose">閉じる</button>
      </div>
    `
    );

    clearHarvestCommit();

    mBody.querySelectorAll("button[data-pick]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        const id = btn.getAttribute("data-pick");
        const l = loadLoadout();
        if (isSeed) l.seedId = id;
        if (isWater) l.waterId = id;
        if (isFert) l.fertId = id;
        saveLoadout(l);
        renderLoadout();
        closeModal();
      });
    });

    document.getElementById("gridClose").addEventListener("click", closeModal);
  }

  equipSeedBtn.addEventListener("click", () => openPickGrid("seed"));
  equipWaterBtn.addEventListener("click", () => openPickGrid("water"));
  equipFertBtn.addEventListener("click", () => openPickGrid("fert"));

  function render() {
    player = loadPlayer();
    book = loadBook();

    farmEl.innerHTML = "";
    let grow = 0, ready = 0, burn = 0;

    for (let i = 0; i < MAX_PLOTS; i++) {
      const p = state.plots[i] || { state: "EMPTY" };

      const d = document.createElement("div");
      d.className = "plot";

      const locked = i >= player.unlocked;
      d.dataset.state = locked ? "LOCK" : (p.state || "EMPTY");

      const btn = document.createElement("button");
      btn.type = "button";

      if (locked) {
        const b = document.createElement("div");
        b.className = "badge lock";
        b.textContent = "LOCK";
        d.appendChild(b);

        btn.innerHTML = `
          <img src="${PLOT_IMG.EMPTY}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:14px;display:block;opacity:.55;">
          <div class="tag" style="position:absolute;bottom:6px;left:0;right:0;text-align:center;font-size:11px;font-weight:900;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.6);pointer-events:none;">ロック</div>
        `;

        const overlay = document.createElement("div");
        overlay.className = "lockOverlay";
        overlay.innerHTML = `<div class="lk1">🔒</div><div class="lk2">Lvアップで解放</div>`;
        d.appendChild(overlay);

        btn.addEventListener("click", () => onPlotTap(i));
        d.appendChild(btn);
        farmEl.appendChild(d);
        continue;
      }

      let img = PLOT_IMG.EMPTY;
      let label = "植える";

      if (p.state === "GROW") {
        grow++;
        const remain = (p.readyAt || 0) - Date.now();

        const start = typeof p.startAt === "number" ? p.startAt : Date.now();
        const end = typeof p.readyAt === "number" ? p.readyAt : (start + 1);
        const denom = Math.max(1, end - start);
        const progress = (Date.now() - start) / denom;

        if (p.seedId === "seed_colabo") {
          img = progress < 0.5 ? PLOT_IMG.COLABO_GROW1 : PLOT_IMG.COLABO_GROW2;
        } else if (p.seedId === "seed_anniv") {
          img = progress < 0.5 ? PLOT_IMG.ANNIV_GROW1 : PLOT_IMG.ANNIV_GROW2;
        } else {
          if (progress < 0.5) {
            img = PLOT_IMG.GROW1;
          } else {
            if (p.srHint === "SR100") img = PLOT_IMG.GROW2_SR100;
            else if (p.srHint === "SR65") img = PLOT_IMG.GROW2_SR65;
            else img = PLOT_IMG.GROW2;
          }
        }

        label = `育成中 ${fmtRemain(remain)}`;
      } else if (p.state === "READY") {
        ready++;
        img = PLOT_IMG.READY;
        label = "収穫";

        const fx = document.createElement("div");
        fx.className = "plot-fx plot-fx--mild";
        d.appendChild(fx);
      } else if (p.state === "BURN") {
        burn++;
        img = PLOT_IMG.BURN;
        label = "1タップ回収";
      }

      btn.innerHTML = `
        <img src="${img}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:14px;display:block;">
        <div class="tag" style="position:absolute; bottom:6px; left:0; right:0;text-align:center; font-size:11px; font-weight:900; color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.6); pointer-events:none;">${label}</div>
      `;
      btn.addEventListener("click", () => onPlotTap(i));
      d.appendChild(btn);
      farmEl.appendChild(d);
    }

    stGrow.textContent = String(grow);
    stReady.textContent = String(ready);
    stBurn.textContent = String(burn);
    stBook.textContent = String(Object.keys((book && book.got) ? book.got : {}).length);

    stLevel.textContent = String(player.level);
    stXP.textContent = String(player.xp);
    stUnlock.textContent = String(player.unlocked);

    const need = xpNeedForLevel(player.level);
    const now = player.xp;
    const left = Math.max(0, need - now);
    const pct = Math.max(0, Math.min(100, Math.floor((now / need) * 100)));

    stXpLeft.textContent = String(left);
    stXpNeed.textContent = String(need);
    stXpBar.style.width = pct + "%";

    const stXpNow = document.getElementById("stXpNow");
    if (stXpNow) stXpNow.textContent = String(now);

    renderLoadout();
  }

  function ensureLoadoutOrOpen() {
    loadout = loadLoadout();
    if (!loadout.seedId) { openPickGrid("seed"); return false; }
    if (!loadout.waterId) { openPickGrid("water"); return false; }
    if (!loadout.fertId) { openPickGrid("fert"); return false; }
    return true;
  }

  function plantAt(index) {
    inv = loadInv();
    loadout = loadLoadout();

    const seedId = loadout.seedId;
    const waterId = loadout.waterId;
    const fertId = loadout.fertId;

    const okSeed = invGet(inv, "seed", seedId) > 0;
    const okWater = invGet(inv, "water", waterId) > 0;
    const okFert = invGet(inv, "fert", fertId) > 0;

    if (!okSeed || !okWater || !okFert) {
      const lack = !okSeed ? "タネ" : !okWater ? "ミズ" : "ヒリョウ";
      const goKind = !okSeed ? "seed" : !okWater ? "water" : "fert";
      openModal("在庫が足りない", `
        <div class="step">
          <b>${lack}</b> の在庫が足りないため植えられない。<br>
          露店で買うか、装備を変えてね。
        </div>
        <div class="row">
          <button type="button" id="btnChange">装備を変える</button>
          <button type="button" class="primary" id="btnOk">OK</button>
        </div>
      `);
      clearHarvestCommit();

      document.getElementById("btnChange").addEventListener("click", () => {
        closeModal();
        openPickGrid(goKind);
      });
      document.getElementById("btnOk").addEventListener("click", closeModal);
      return;
    }

    const water = WATERS.find((x) => x.id === waterId);
    const fert = FERTS.find((x) => x.id === fertId);

    const growMs = calcGrowMsByFert(fert);
    const now = Date.now();

    invDec(inv, "seed", seedId);
    invDec(inv, "water", waterId);
    invDec(inv, "fert", fertId);
    saveInv(inv);

    const isFixedSeed =
      (seedId === "seed_colabo") ||
      (seedId === "seed_anniv") ||
      (seedId === "seed_special") ||
      (seedId === "seed_bussasari") ||
      (seedId === "seed_namara_kawasar");

    const fixedRarity = isFixedSeed ? null : pickRarityWithWater(water ? water.id : null);

    const srHint =
      isFixedSeed ? "NONE" :
      (fixedRarity === "LR" || fixedRarity === "UR") ? "SR100" :
      (fixedRarity === "SR") ? "SR65" :
      "NONE";

    const plot = {
      state: "GROW",
      seedId,
      waterId,
      fertId,
      startAt: now,
      readyAt: now + growMs,
      fixedRarity,
      srHint,
    };

    plot.reward = drawRewardForPlot(plot);

    if (plot.reward && String(plot.reward.rarity || "").toUpperCase() === "SP") {
      plot.fixedRarity = null;
      plot.srHint = "NONE";
    }

    state.plots[index] = plot;

    saveState(state);
    render();
  }

  function buildLevelRewardHtml(xpRes) {
    const allItems = [];
    let totalOcto = 0;
    let totalUnlocked = 0;

    for (const r of xpRes.rewards) {
      totalOcto += Number(r.octo || 0);
      totalUnlocked += Number(r.unlockedNow || 0);
      for (const it of (r.items || [])) {
        const key = `${it.kind}:${it.id}`;
        const found = allItems.find((x) => x._key === key);
        if (found) {
          found.qty += Number(it.qty || 0);
        } else {
          allItems.push({ ...it, _key: key, qty: Number(it.qty || 0) });
        }
      }
    }

    const finalLevel = xpRes.rewards[xpRes.rewards.length - 1]?.level ?? player.level;

    const octoCard = `
      <div style="
        display:flex;
        align-items:center;
        gap:12px;
        padding:14px;
        border-radius:18px;
        background:linear-gradient(180deg, rgba(255,187,94,.18), rgba(255,149,58,.08));
        border:1px solid rgba(255,185,90,.28);
        box-shadow:0 8px 18px rgba(0,0,0,.06);
      ">
        <div style="
          width:54px;height:54px;flex:0 0 54px;
          border-radius:16px;
          display:grid;place-items:center;
          font-size:26px;
          background:linear-gradient(180deg,#fff2c7,#ffd97f);
          border:1px solid rgba(255,199,96,.55);
        ">💰</div>
        <div style="min-width:0;flex:1;">
          <div style="font-size:12px;font-weight:900;color:#9d6a16;letter-spacing:.08em;">OCTO</div>
          <div style="margin-top:2px;font-size:24px;font-weight:1000;color:#2d220f;line-height:1.05;">+${totalOcto}</div>
        </div>
      </div>
    `;

    const unlockCard = totalUnlocked > 0
      ? `
      <div style="
        display:flex;
        align-items:center;
        gap:12px;
        padding:14px;
        border-radius:18px;
        background:linear-gradient(180deg, rgba(255,233,153,.20), rgba(255,203,86,.08));
        border:1px solid rgba(255,214,110,.30);
        box-shadow:0 8px 18px rgba(0,0,0,.06);
      ">
        <div style="
          width:54px;height:54px;flex:0 0 54px;
          border-radius:16px;
          display:grid;place-items:center;
          font-size:24px;
          background:linear-gradient(180deg,#fff8da,#ffe79a);
          border:1px solid rgba(255,220,126,.6);
        ">🔓</div>
        <div style="min-width:0;flex:1;">
          <div style="font-size:12px;font-weight:900;color:#a17411;letter-spacing:.08em;">UNLOCK</div>
          <div style="margin-top:2px;font-size:18px;font-weight:1000;color:#2d220f;line-height:1.15;">畑が${totalUnlocked}マス解放</div>
        </div>
      </div>
    `
      : "";

    const itemsHtml = allItems.map((it) => {
      return `
        <div style="
          display:flex;
          align-items:center;
          gap:12px;
          padding:12px;
          border-radius:16px;
          background:rgba(255,255,255,.72);
          border:1px solid rgba(0,0,0,.06);
        ">
          <img src="${it.img}" alt="${it.name}" style="
            width:56px;height:56px;flex:0 0 56px;
            object-fit:cover;
            border-radius:14px;
            border:1px solid rgba(0,0,0,.08);
            background:rgba(255,255,255,.9);
            box-shadow:0 4px 10px rgba(0,0,0,.05);
          ">
          <div style="min-width:0;flex:1;">
            <div style="
              font-size:15px;
              font-weight:1000;
              color:#2b2116;
              line-height:1.2;
              word-break:break-word;
            ">${it.name}</div>
            <div style="
              margin-top:4px;
              font-size:13px;
              font-weight:900;
              color:#7a5a2f;
            ">×${it.qty}</div>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div style="
        display:grid;
        gap:14px;
      ">
        <div style="
          text-align:center;
          padding:6px 0 2px;
        ">
          <div style="
            font-size:12px;
            font-weight:1000;
            letter-spacing:.18em;
            color:#a36a18;
          ">LEVEL UP</div>
          <div style="
            margin-top:4px;
            font-size:30px;
            font-weight:1000;
            line-height:1.05;
            color:#2b2015;
          ">Lv ${finalLevel}</div>
        </div>

        <div style="display:grid;gap:10px;">
          ${octoCard}
          ${unlockCard}
        </div>

        ${allItems.length ? `
          <div style="display:grid;gap:10px;">
            <div style="
              font-size:12px;
              font-weight:1000;
              letter-spacing:.12em;
              color:#8e6a34;
              padding-left:2px;
            ">GET ITEMS</div>
            ${itemsHtml}
          </div>
        ` : ""}

        <div class="row" style="margin-top:4px;">
          <button type="button" id="btnLevelClose" class="primary">閉じる</button>
        </div>
      </div>
    `;
  }

  function openLevelRewardModal(xpRes) {
    openModal("Lvアップ！", buildLevelRewardHtml(xpRes));
    clearHarvestCommit();

    const btn = document.getElementById("btnLevelClose");
    if (btn) {
      btn.addEventListener("click", () => {
        closeModal();
        render();
      });
    }
  }

  function commitHarvest(i, reward) {
    addToBook(reward);
    addMonthlyHarvest(1);

    const prevLevel = player.level;

    const xpKey = (reward && reward.tier)
      ? String(reward.tier).toUpperCase()
      : String(reward.rarity || "").toUpperCase();

    const gain = XP_BY_RARITY[xpKey] ?? 4;
    const xpRes = addXP(gain);

    state.plots[i] = { state: "EMPTY" };
    saveState(state);

    render();

    if (xpRes && xpRes.leveled && Array.isArray(xpRes.rewards) && xpRes.rewards.length) {
      const toLevel = xpRes.rewards[xpRes.rewards.length - 1].level;
      const unlockedDelta = Number(xpRes.unlockedDelta || 0);

      closeModal();

      showLevelUpSplash({
        fromLevel: prevLevel,
        toLevel,
        unlockedDelta,
        onDone: () => {
          openLevelRewardModal(xpRes);
          render();
        }
      });
      return;
    }

    closeModal();
    render();
  }

  function onPlotTap(i) {
    player = loadPlayer();

    if (i >= player.unlocked) {
      openModal("ロック中", `
        <div class="step">このマスはまだ使えない。<br>収穫でXPを稼いで <b>Lvアップ</b> すると解放される。</div>
        <div class="row"><button type="button" id="btnOk">OK</button></div>
      `);
      clearHarvestCommit();
      document.getElementById("btnOk").addEventListener("click", closeModal);
      return;
    }

    const p = state.plots[i] || { state: "EMPTY" };

    if (p.state === "EMPTY") {
      if (!ensureLoadoutOrOpen()) return;
      plantAt(i);
      return;
    }

    if (p.state === "GROW") {
      const seed = SEEDS.find((x) => x.id === p.seedId);
      const water = WATERS.find((x) => x.id === p.waterId);
      const fert = FERTS.find((x) => x.id === p.fertId);
      const remain = (p.readyAt || 0) - Date.now();

      openModal("育成中", `
        <div class="step">このマスは育成中。収穫まであと <b>${fmtRemain(remain)}</b></div>
        <div class="reward">
          <div class="big">設定</div>
          <div class="mini">
            種：${seed ? seed.name : "-"}<br>
            水：${water ? water.name : "-"}<br>
            肥料：${fert ? fert.name : "-"}<br>
          </div>
        </div>
        <div class="row"><button type="button" id="btnOk">OK</button></div>
      `);
      clearHarvestCommit();
      document.getElementById("btnOk").addEventListener("click", closeModal);
      return;
    }

    if (p.state === "READY") {
      if (!p.reward) {
        p.reward = drawRewardForPlot(p);
        saveState(state);
      }
      const reward = p.reward;

      openModal("収穫！", `
        <div class="harvWrap">
          <div class="reward">
            <div class="harvMeta">
              <div class="harvName">${reward.name}（${reward.id}）</div>
              <div class="harvId">レア：<b>${rarityLabel(reward.rarity, reward.tier)}</b></div>
              <div class="note">この画面を閉じると自動で図鑑に登録されます。</div>
            </div>

            <div class="harvCard">
              <img src="${reward.img}" alt="${reward.name}">
            </div>

            <div class="row">
              <button type="button" id="btnCancel">閉じる</button>
              <button type="button" class="primary" id="btnConfirm">図鑑を確認する</button>
            </div>
          </div>
        </div>
      `);

      setHarvestCommit(() => commitHarvest(i, reward));

      document.getElementById("btnCancel").addEventListener("click", closeModalOrCommit);

      document.getElementById("btnConfirm").addEventListener("click", () => {
        const fn = __harvestCommitFn;
        __harvestCommitFn = null;
        if (fn) fn();
        location.href = "./zukan.html";
      });

      return;
    }

    if (p.state === "BURN") {
      clearHarvestCommit();
      state.plots[i] = { state: "EMPTY" };
      saveState(state);
      render();
      showToast("焦げを回収した");
      return;
    }
  }

  function addToBook(card) {
    const b = loadBook();
    if (!b.got) b.got = {};

    const prev = b.got[card.id];
    if (prev) {
      const curCount = Number.isFinite(prev.count) ? prev.count : 1;
      prev.count = curCount + 1;
      prev.name = card.name;
      prev.img = card.img;
      prev.rarity = card.rarity || prev.rarity || "";
      prev.tier = card.tier || prev.tier || "";
      prev.lastAt = Date.now();
      b.got[card.id] = prev;
    } else {
      b.got[card.id] = {
        id: card.id,
        name: card.name,
        img: card.img,
        rarity: card.rarity || "",
        tier: card.tier || "",
        count: 1,
        at: Date.now(),
        lastAt: Date.now(),
      };
    }
    saveBook(b);
  }

  function tick() {
    const now = Date.now();
    let changed = false;

    for (let i = 0; i < MAX_PLOTS; i++) {
      const p = state.plots[i];
      if (!p) continue;

      if (p.state === "GROW" && typeof p.readyAt === "number") {
        if (now >= p.readyAt) {
          p.state = "READY";
          p.burnAt = p.readyAt + READY_TO_BURN_MS;
          changed = true;
        }
      } else if (p.state === "READY" && typeof p.burnAt === "number") {
        if (now >= p.burnAt) {
          p.state = "BURN";
          changed = true;
        }
      }
    }

    if (changed) saveState(state);
    render();
  }

  loadMonthlyStats();
  renderLoadout();
  render();
  setInterval(tick, TICK_MS);

  window.__takofarm_onPlotTap = onPlotTap;
})();