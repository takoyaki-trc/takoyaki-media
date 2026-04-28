(() => {
  "use strict";

  window.TAKOFARM_COLLAB_SEEDS = window.TAKOFARM_COLLAB_SEEDS || [];

  window.TAKOFARM_COLLAB_SEEDS.push(
    {
      id: "seed_colabo",
      name: "【ｺﾗﾎﾞ】ぐらたん\nのタネ",
      desc: "2種だけを\nランダムで\n収穫する",
      factor: 1.0,
      img: "https://ul.h3z.jp/wbnwoTzm.png",
      growImgs: {
        stage1: "https://ul.h3z.jp/cq1soJdm.gif",
        stage2: "https://ul.h3z.jp/I6Iu4J32.gif"
      },
      fx: "全2種《N/LR》",
      badge: "コラボ",
      active: true,
      category: "COL",
      rates: { N: 95, R: 0, SR: 0, UR: 0, LR: 5 },
      pool: [
        {
          id: "col-001",
          displayId: "col-001",
          name: "伝説のたこ焼きライバー",
          img: "https://ul.h3z.jp/CmVTkAd2.png",
          rarity: "COL",
          tier: "LR",
          premium: true
        },
        {
          id: "col-002",
          displayId: "col-002",
          name: "たこ焼き実況者ライバー",
          img: "https://ul.h3z.jp/1VQvIP7v.png",
          rarity: "COL",
          tier: "N"
        }
      ]
    },

    {
      id: "seed_anniv",
      name: "ﾊｰﾌｱﾆﾊﾞｰｻﾘｰ\nのタネ",
      desc: "5種から\nランダムで\n収穫する",
      factor: 1.0,
      img: "https://takoyaki-card.com/town/assets/images/anniversary/anv1.png",
      growImgs: {
        stage1: "https://takoyaki-card.com/town/assets/images/anniversary/tane1.gif",
        stage2: "https://takoyaki-card.com/town/assets/images/anniversary/tane2.gif"
      },
      fx: "全5種《N/R/SR/UR/LR》",
      badge: "期間限定",
      active: true,
      category: "SP",
      rates: { N: 66, R: 20, SR: 10, UR: 3, LR: 1 },
      pool: [
        {
          id: "SP-ANV-001",
          displayId: "SP-ANV-001",
          name: "会話トリガー:店主",
          img: "https://takoyaki-card.com/town/assets/images/anniversary/1.png",
          rarity: "SP",
          tier: "N"
        },
        {
          id: "SP-ANV-002",
          displayId: "SP-ANV-002",
          name: "定型ループNPC",
          img: "https://takoyaki-card.com/town/assets/images/anniversary/2.png",
          rarity: "SP",
          tier: "R"
        },
        {
          id: "SP-ANV-003",
          displayId: "SP-ANV-003",
          name: "始まりの合図",
          img: "https://takoyaki-card.com/town/assets/images/anniversary/3.png",
          rarity: "SP",
          tier: "SR"
        },
        {
          id: "SP-ANV-004",
          displayId: "SP-ANV-004",
          name: "ここにいる店主",
          img: "https://takoyaki-card.com/town/assets/images/anniversary/4a.jpg",
          rarity: "SP",
          tier: "UR",
          premium: true
        },
        {
          id: "SP-ANV-005",
          displayId: "SP-ANV-005",
          name: "物語の外側",
          img: "https://takoyaki-card.com/town/assets/images/anniversary/4b.jpg",
          rarity: "SP",
          tier: "LR",
          premium: true
        }
      ]
    }
  );
})();
