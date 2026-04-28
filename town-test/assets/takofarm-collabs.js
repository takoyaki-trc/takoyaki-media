(() => {
  "use strict";

  const BASE = "https://takoyaki-card.com/town/assets/images/collabo/";

  window.TAKOFARM_COLLAB_SEEDS = [
    {
      id: "seed_fes_2026_day1",
      name: "たこ焼きフェス\n6月6日のタネ",
      desc: "DAY1限定\n5種から\n収穫する",
      factor: 1.0,
      img: BASE + "seed_fes_2026_day1.png",
      fx: "FES DAY1 全5種《N/R/SR/UR/LR》",
      badge: "フェス",
      active: true,
      category: "COL",
      rates: { N: 55, R: 25, SR: 14, UR: 5, LR: 1 },

      pool: [
        {
          id: "COL-FES26-D1-001",
          displayId: "FES-26-SP-D1-001",
          name: "仕掛け人T",
          img: BASE + "FES26SPD1001.png",
          rarity: "COL",
          tier: "SR"
        },
        {
          id: "COL-FES26-D1-002",
          displayId: "FES-26-SP-D1-002",
          name: "時速たこ焼き",
          img: BASE + "FES26SPD1002.png",
          rarity: "COL",
          tier: "R"
        },
        {
          id: "COL-FES26-D1-003",
          displayId: "FES-26-SP-D1-003",
          name: "開幕5分前",
          img: BASE + "FES26SPD1003.png",
          rarity: "COL",
          tier: "N"
        },
        {
          id: "COL-FES26-D1-004",
          displayId: "FES-26-SP-D1-004",
          name: "食べながら並ぶ人",
          img: BASE + "FES26SPD1004.png",
          rarity: "COL",
          tier: "UR",
          premium: true
        },
        {
          id: "COL-FES26-D1-005",
          displayId: "FES-26-SP-D1-005",
          name: "全方位フェスティバル",
          img: BASE + "FES26SPD1005.png",
          rarity: "COL",
          tier: "LR",
          premium: true
        }
      ]
    },

    {
      id: "seed_fes_2026_day2",
      name: "たこ焼きフェス\n6月7日のタネ",
      desc: "DAY2限定\n5種から\n収穫する",
      factor: 1.0,
      img: BASE + "seed_fes_2026_day2.png",
      fx: "FES DAY2 全5種《N/R/SR/UR/LR》",
      badge: "フェス",
      active: true,
      category: "COL",
      rates: { N: 55, R: 25, SR: 14, UR: 5, LR: 1 },

      pool: [
        {
          id: "COL-FES26-D2-001",
          displayId: "FES-26-SP-D2-001",
          name: "食べたすぎて焼いてる人",
          img: BASE + "FES26SPD2001.png",
          rarity: "COL",
          tier: "N"
        },
        {
          id: "COL-FES26-D2-002",
          displayId: "FES-26-SP-D2-002",
          name: "全部いく人",
          img: BASE + "FES26SPD2002.png",
          rarity: "COL",
          tier: "R"
        },
        {
          id: "COL-FES26-D2-003",
          displayId: "FES-26-SP-D2-003",
          name: "全員優勝抽選会",
          img: BASE + "FES26SPD2003.png",
          rarity: "COL",
          tier: "SR"
        },
        {
          id: "COL-FES26-D2-004",
          displayId: "FES-26-SP-D2-004",
          name: "たこ焼き無限マジックショー",
          img: BASE + "FES26SPD2004.png",
          rarity: "COL",
          tier: "UR",
          premium: true
        },
        {
          id: "COL-FES26-D2-005",
          displayId: "FES-26-SP-D2-005",
          name: "余韻ポスター",
          img: BASE + "FES26SPD2005.png",
          rarity: "COL",
          tier: "LR",
          premium: true
        }
      ]
    }
  ];

})();
