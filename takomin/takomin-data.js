window.TAKOMIN_DATA = {
  maxStat: 500,
  growthDays: 10,

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

  takomins: [
    { id: "tkm_001", name: "札束タコ民", rarity: "R", attackStyle: "札束ビンタ" },
    { id: "tkm_002", name: "冷やかしタコ民", rarity: "N", attackStyle: "指さし連打" },
    { id: "tkm_003", name: "王様タコ民", rarity: "SR", attackStyle: "王様プレス" },
    { id: "tkm_004", name: "見えないタコ民", rarity: "R", attackStyle: "透明アタック" },
    { id: "tkm_005", name: "よっぱらいタコ民", rarity: "N", attackStyle: "千鳥足タックル" },
    { id: "tkm_006", name: "札束タコ民・極", rarity: "UR", attackStyle: "超札束乱打" },

    // 仮データ。ここに25種を入れていけばOK
  ],

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