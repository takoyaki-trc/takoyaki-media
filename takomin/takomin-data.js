(() => {
  "use strict";

  window.RotenSocialData = {
    CUSTOMER_NAME_MAP: {
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
      pilgrim: "覚悟タコ民",
      miko: "みこぴ",
      kasumi: "かすみぴ",
      takopi: "たこぴ",
      takonana: "たこなな"
    },

    CUSTOMER_ICON_MAP: {
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
      pilgrim:   "https://ul.h3z.jp/eW2dluw2.png",

      // 特別枠（画像は必要なら差し替え）
      miko: "assets/takomin/miko.png",
      kasumi: "assets/takomin/kasumi.png",
      takopi: "assets/takomin/takopi.png",
      takonana: "assets/takomin/takonana.png"
    }
  };

  const BABY_TAKOMIN_IMAGES = [
    "https://ul.h3z.jp/dCLDxQhb.png",
    "https://ul.h3z.jp/HsgJ3Ju2.png",
    "https://ul.h3z.jp/Janjf3eu.png",
    "https://ul.h3z.jp/kWd9he8J.png"
  ];

  const CUSTOMER_RARITY_ASSIGN = {
    N: [
      "careful",
      "looker",
      "guide",
      "relax",
      "diet",
      "overflow",
      "ramen",
      "streamer",
      "opener",
      "party",
      "pilgrim"
    ],
    R: [
      "impulse",
      "picky",
      "flipper",
      "climber",
      "collector",
      "shadow"
    ],
    SR: [
      "rich",
      "king",
      "artisan",
      "gourmet"
    ],
    UR: [
      "miko",
      "kasumi"
    ],
    LR: [
      "takopi"
    ],
    SECRET: [
      "takonana"
    ]
  };

  function buildTakominList() {
    const out = [];

    Object.entries(CUSTOMER_RARITY_ASSIGN).forEach(([rarity, ids]) => {
      ids.forEach(id => {
        const name = window.RotenSocialData.CUSTOMER_NAME_MAP[id] || id;
        const icon = window.RotenSocialData.CUSTOMER_ICON_MAP[id] || "";
        out.push({
          id,
          name,
          rarity,
          icon,
          attackStyle:
            id === "rich" ? "札束で殴る" :
            id === "king" ? "王様の威圧" :
            id === "artisan" ? "返し職人ラッシュ" :
            id === "gourmet" ? "舌判定ショック" :
            id === "miko" ? "祈りの一撃" :
            id === "kasumi" ? "記憶の揺らぎ" :
            id === "takopi" ? "焼かれた運命" :
            id === "takonana" ? "店主の真髄" :
            "タコ殴り"
        });
      });
    });

    return out;
  }

  window.TAKOMIN_DATA = {
    maxStat: 500,
    growthDays: 10,
    babyImages: BABY_TAKOMIN_IMAGES,

    rarityRate: [
      { rarity: "N", weight: 60 },
      { rarity: "R", weight: 24 },
      { rarity: "SR", weight: 10 },
      { rarity: "UR", weight: 4 },
      { rarity: "LR", weight: 1.5 },
      { rarity: "SECRET", weight: 0.5 }
    ],

    rarityFeedLimit: {
      N: 3,
      R: 3,
      SR: 4,
      UR: 4,
      LR: 5,
      SECRET: 5
    },

    rarityBaseStat: {
      N:      { hp: 100, atk: 10, def: 10, taste: 10, love: 10 },
      R:      { hp: 110, atk: 14, def: 14, taste: 14, love: 14 },
      SR:     { hp: 125, atk: 18, def: 18, taste: 18, love: 18 },
      UR:     { hp: 140, atk: 24, def: 24, taste: 24, love: 24 },
      LR:     { hp: 160, atk: 30, def: 30, taste: 30, love: 30 },
      SECRET: { hp: 180, atk: 36, def: 36, taste: 36, love: 36 }
    },

    rarityCardMultiplier: {
      N: 1.0,
      R: 1.1,
      SR: 1.2,
      UR: 1.3,
      LR: 1.5,
      SECRET: 1.6
    },

    cardStatScale: 0.2,

    eventRate: {
      janken: 0.30,
      raid: 0.50,
      memory: 0.20
    },

    raidEnemyRate: [
      { id: "gokiburi", weight: 60 },
      { id: "takonyan", weight: 30 },
      { id: "kumatako", weight: 10 }
    ],

    raidEnemies: {
      gokiburi: {
        id: "gokiburi",
        name: "ゴキブリタコ",
        maxHp: 55,
        attack: 12,
        attackIntervalMs: 1600,
        rewardMin: 1,
        rewardMax: 5,
        octoMin: 50,
        octoMax: 120
      },
      takonyan: {
        id: "takonyan",
        name: "タコにゃん",
        maxHp: 90,
        attack: 18,
        attackIntervalMs: 1300,
        rewardMin: 3,
        rewardMax: 8,
        octoMin: 120,
        octoMax: 220
      },
      kumatako: {
        id: "kumatako",
        name: "クマタコ",
        maxHp: 130,
        attack: 26,
        attackIntervalMs: 1100,
        rewardMin: 5,
        rewardMax: 10,
        octoMin: 220,
        octoMax: 380
      }
    },

    takomins: buildTakominList(),

    phaseTexts: {
      baby: [
        "……",
        "ぽよ",
        "まだ何者でもないたこ",
        "ぬめ…"
      ],
      adult: [
        "今日は何を食べるたこ？",
        "強くなる予感がするたこ",
        "まだ伸びるたこ"
      ]
    }
  };
})();