/* assets/roten.customers.js
   - 露店の客層データ（初期12人 + コラボ枠5）
   - “データだけ”にする（ロジックは roten.js）
*/

(() => {
  const CUSTOMERS_V1 = {
    version: 1,

    // ====== 初期客層 12人（王様含む） ======
    base: [
      // よく来る：下層〜日常
      {
        id: "poor",
        name: "貧乏タコ民",
        tier: "common",
        weight: 26,
        buyMult: 0.6,
        allBuy: false,
        tags: ["値切り多め"],
        lines: [
          "……その値段、胃に刺さる。",
          "半額なら、心が動く。",
          "今日は財布が焼けてる。"
        ]
      },
      {
        id: "apprentice",
        name: "見習いタコ民",
        tier: "common",
        weight: 18,
        buyMult: 0.85,
        allBuy: false,
        tags: ["勉強中"],
        lines: [
          "これ…勉強になります！",
          "焼きの奥深さ、感じました…！",
          "いつか立派な屋台主に…！"
        ]
      },
      {
        id: "citizen",
        name: "一般タコ民",
        tier: "common",
        weight: 22,
        buyMult: 1.0,
        allBuy: false,
        tags: ["相場どおり"],
        lines: [
          "いいね、ちょうど欲しかった。",
          "相場どおり。安心だ。",
          "今日の気分に合ってる。"
        ]
      },
      {
        id: "gossip",
        name: "噂好きタコ民",
        tier: "common",
        weight: 14,
        buyMult: 1.05,
        allBuy: false,
        tags: ["情報屋"],
        lines: [
          "これ、今夜の噂になるよ。",
          "市場で話題になる匂い…！",
          "値段より“ネタ”が大事。"
        ]
      },

      // たまに来る：中層
      {
        id: "traveler",
        name: "旅人タコ民",
        tier: "uncommon",
        weight: 9,
        buyMult: 1.2,
        allBuy: false,
        tags: ["気分屋"],
        lines: [
          "旅の途中で出会うのが一番だ。",
          "今日は風が良い。買っていく。",
          "次の町でも、また会おう。"
        ]
      },
      {
        id: "craftsman",
        name: "職人タコ民",
        tier: "uncommon",
        weight: 7,
        buyMult: 1.25,
        allBuy: false,
        tags: ["目利き"],
        lines: [
          "焼きの“芯”が通ってる。",
          "雑な焼きは嫌いだ。",
          "この一枚…手が入ってるな。"
        ]
      },
      {
        id: "merchant",
        name: "商人タコ民",
        tier: "uncommon",
        weight: 7,
        buyMult: 1.3,
        allBuy: false,
        tags: ["まとめ買い気味"],
        lines: [
          "これは回る。買いだ。",
          "安い日は仕込む、高い日は捌く。",
          "市場は流れ。君は読めてるか？"
        ]
      },
      {
        id: "gambler",
        name: "ギャンブラータコ民",
        tier: "uncommon",
        weight: 6,
        buyMult: 1.4,
        allBuy: false,
        tags: ["運で買う"],
        lines: [
          "運が言ってる。買えって。",
          "当たりの匂いがするんだよ。",
          "外れても笑えるなら勝ち。"
        ]
      },

      // レア：上層
      {
        id: "rich",
        name: "金持ちタコ民",
        tier: "rare",
        weight: 3,
        buyMult: 1.8,
        allBuy: false,
        tags: ["高くても買う"],
        lines: [
          "値段？…まあ、払うよ。",
          "欲しいと思った瞬間が買い時。",
          "いい棚だ。気に入った。"
        ]
      },
      {
        id: "noble",
        name: "貴族タコ民",
        tier: "rare",
        weight: 2,
        buyMult: 2.2,
        allBuy: false,
        tags: ["上品に爆買い"],
        lines: [
          "ふむ…棚の品が整っている。",
          "品は金で買えるが、格は買えぬ。",
          "今日は“献上”に値する。"
        ]
      },
      {
        id: "masked",
        name: "覆面タコ民",
        tier: "rare",
        weight: 2,
        buyMult: 0, // ←ロジック側でランダム倍率にする用（例：0.8〜2.5）
        allBuy: false,
        tags: ["倍率ランダム"],
        lines: [
          "……気分次第だ。",
          "今日は買う。明日は知らん。",
          "見えない価値ほど、よく燃える。"
        ]
      },

      // 伝説：王様（超レア）
      {
        id: "king",
        name: "王様タコ民",
        tier: "legend",
        weight: 1,       // ←ここはロジック側でさらに“超低確率化”してOK
        buyMult: 3.0,    // ←最低倍率（演出で上乗せ可）
        allBuy: true,    // ←棚を全部買う
        tags: ["全買い", "超レア"],
        lines: [
          "この棚ごと、もらおう。",
          "価値は、焼かれた後に決まる。",
          "民よ…よい屋台であった。"
        ]
      }
    ],

    // ====== コラボ枠 5人（確保枠：最初は inactive） ======
    // 追加はここにオブジェクト1つ足す or 既存スロットを書き換えるだけ
    collabSlots: [
      { slotId: "collab1", active: false, data: null },
      { slotId: "collab2", active: false, data: null },
      { slotId: "collab3", active: false, data: null },
      { slotId: "collab4", active: false, data: null },
      { slotId: "collab5", active: false, data: null }
    ]
  };

  // グローバルに公開（roten.js から読む）
  window.ROTEN_CUSTOMERS = CUSTOMERS_V1;
})();

