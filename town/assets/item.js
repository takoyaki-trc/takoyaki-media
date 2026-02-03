/* =====================================================
   assets/item.js
   たこ焼きファーム：アイテム/カードデータ定義（純データ）
   - ロジック禁止（関数は書かない）
   - farm側は window.TF_ITEMS から読む
   ===================================================== */

(() => {
  "use strict";

  // ====== 実在カードプール（レアリティごと）=====
  const CARD_POOLS = {
    N: [
      { no:"TN-005", name:"たこ焼きタワー112", img:"https://ul.h3z.jp/LoXMSiYd.jpg" },
      { no:"TN-006", name:"塩顔パレード焼き", img:"https://ul.h3z.jp/7L7rcrnM.jpg" },
      { no:"TN-009", name:"塩マヨ露天焼き", img:"https://ul.h3z.jp/bF9QmTE8.jpg" },
      { no:"TN-011", name:"チーズ火山焼き", img:"https://ul.h3z.jp/BEj3BIcP.jpg" },
      { no:"TN-012", name:"揚げ玉会議焼き", img:"https://ul.h3z.jp/vVw2FjQp.jpg" },
      { no:"TN-013", name:"くたびれ塩こしょう焼き", img:"https://ul.h3z.jp/DlX5pLJ5.jpg" },
      { no:"TN-016", name:"たこ焼き、発射オーライ", img:"https://ul.h3z.jp/50WYMkYw.jpg" },
      { no:"TN-018", name:"ゆのかわの主", img:"https://ul.h3z.jp/mkLBMxIT.jpg" },
      { no:"TN-019", name:"誤入店トラップ", img:"https://ul.h3z.jp/YfON5rBJ.jpg" },
      { no:"TN-021", name:"たこ焼き、流れて候", img:"https://ul.h3z.jp/O4s1VpWd.jpg" },
      { no:"TN-023", name:"芝生かたこ焼きか大会", img:"https://ul.h3z.jp/FZcOaXY8.jpg" },
      { no:"TN-024", name:"温泉女神のありがた迷惑", img:"https://ul.h3z.jp/A6WhBsqj.jpg" },
      { no:"TN-026", name:"たこ焼き48回リボ払い", img:"https://ul.h3z.jp/hz7JXyky.jpg" },
      { no:"TN-027", name:"全身たこ焼きダイエット", img:"https://ul.h3z.jp/FQ3poZLg.jpg" },
      { no:"TN-028", name:"自己啓発たこ塾《井上諒プロ🎯》", img:"https://ul.h3z.jp/sPChFFlG.jpg" },
      { no:"TN-029", name:"カロリーゼロ理論《仁木治プロ🎯》", img:"https://ul.h3z.jp/4HEbt3YP.jpg" },
      { no:"TN-031", name:"行列の最後尾が別県", img:"https://ul.h3z.jp/LBdFqlLI.jpg" },
      { no:"TN-034", name:"エシカル過剰焼き", img:"https://ul.h3z.jp/KRkSq4WD.jpg" },
      { no:"TN-036", name:"マヨネーズ詐欺", img:"https://ul.h3z.jp/NzVgPYdG.jpg" },
      { no:"TN-037", name:"勘違いデート", img:"https://ul.h3z.jp/riYYAnEi.jpg" },
      { no:"TN-041", name:"玉の上にも三年", img:"https://ul.h3z.jp/pQg0jZMy.jpg" },
      { no:"TN-043", name:"転生したら即売れたこ焼き", img:"https://ul.h3z.jp/I3JWnpoL.jpg" },
      { no:"TN-046", name:"ごますりたこ焼き", img:"https://ul.h3z.jp/tuLsTiaz.jpg" },
      { no:"TN-048", name:"店主反撃レビュー《佐俣雄一郎🎯》", img:"https://ul.h3z.jp/ge8b4cQ5.jpg" },
    ],
    R: [
      { no:"TN-002", name:"熱々地獄の給たこ所", img:"https://ul.h3z.jp/otr0dAQi.jpg" },
      { no:"TN-003", name:"爆走！たこ焼きライダー菜々", img:"https://ul.h3z.jp/06HrUPMT.jpg" },
      { no:"TN-008", name:"明太ギャラクシー焼き", img:"https://ul.h3z.jp/xye1uAfV.jpg" },
      { no:"TN-014", name:"世界たこ焼き釣り選手権大会", img:"https://ul.h3z.jp/cyekwiam.jpg" },
      { no:"TN-017", name:"たこ焼きマニフェスト", img:"https://ul.h3z.jp/zeSwFyjz.jpg" },
      { no:"TN-022", name:"たこ焼きダーツ･インフェルノ《對馬裕佳子プロ🎯》", img:"https://ul.h3z.jp/Prf7KxRk.jpg" },
      { no:"TN-032", name:"国境超えた恋", img:"https://ul.h3z.jp/9AZcVNmR.jpg" },
      { no:"TN-035", name:"デリバリー長距離便", img:"https://ul.h3z.jp/z0xhODVy.jpg" },
      { no:"TN-038", name:"恋落ちマッチング", img:"https://ul.h3z.jp/BPEoWjuY.jpg" },
      { no:"TN-042", name:"たこ焼きループザループ", img:"https://ul.h3z.jp/vxKamb6f.jpg" },
      { no:"TN-044", name:"白い契約(稲石裕プロ🎯)", img:"https://ul.h3z.jp/bC1B4WkQ.jpg" },
      { no:"TN-047", name:"ボスゲート", img:"https://ul.h3z.jp/GHWrtaYk.jpg" },
    ],
    SR: [
      { no:"TN-004", name:"見えるフリ焼き", img:"https://ul.h3z.jp/irs6Sxoy.jpg" },
      { no:"TN-010", name:"焼ク者ノ証", img:"https://ul.h3z.jp/6A2LOn4A.jpg" },
      { no:"TN-015", name:"顔コイン", img:"https://ul.h3z.jp/7GUyGDU1.jpg" },
      { no:"TN-020", name:"ピック不要の真実", img:"https://ul.h3z.jp/Bu1pk4ul.jpg" },
      { no:"TN-030", name:"ガチャたこ焼き", img:"https://ul.h3z.jp/kFpjcqSv.jpg" },
      { no:"TN-039", name:"ドローン誤配達", img:"https://ul.h3z.jp/70A10oHf.jpg" },
      { no:"TN-040", name:"推し活たこ団扇", img:"https://ul.h3z.jp/jY5MVsrt.jpg" },
      { no:"TN-049", name:"たこ焼きの御神体", img:"https://ul.h3z.jp/GQ8H0lGq.jpg" },
    ],
    UR: [
      { no:"TN-001", name:"黒き真珠イカさま焼き", img:"https://ul.h3z.jp/2KeO7gmu.jpg" },
      { no:"TN-007", name:"ローソク出せ！", img:"https://ul.h3z.jp/FI5xXdQ7.jpg" },
      { no:"TN-033", name:"鉄板のビーナス", img:"https://ul.h3z.jp/0Tvf0Asc.jpg" },
      { no:"TN-045", name:"ドリームファイト", img:"https://ul.h3z.jp/IzPy6UsO.jpg" },
    ],
    LR: [
      { no:"TN-025", name:"たこ焼き化石in函館山", img:"https://ul.h3z.jp/YSFRycmY.jpg" },
      { no:"TN-050", name:"焼かれし記憶、ソースに還る", img:"https://ul.h3z.jp/0I6s0icl.jpg" },
    ],
  };

  // ====== 種 / 水 / 肥料（画像カード）=====
  const SEEDS = [
    {
      id:"seed_random",
      name:"【なに出るタネ】",
      desc:"何が育つかは完全ランダム。\n店主も知らない。",
      factor:1.00,
      img:"https://ul.h3z.jp/gnyvP580.png",
      fx:"完全ランダム"
    },
    {
      id:"seed_shop",
      name:"【店頭タネ】",
      desc:"店で生まれたタネ。\n店頭ナンバーを宿している。",
      factor:1.00,
      img:"https://ul.h3z.jp/IjvuhWoY.png",
      fx:"店頭の気配"
    },
    {
      id:"seed_line",
      name:"【回線タネ】",
      desc:"画面の向こうから届いたタネ。\nクリックすると芽が出る。",
      factor:1.00,
      img:"https://ul.h3z.jp/AonxB5x7.png",
      fx:"回線由来"
    },
    {
      id:"seed_special",
      name:"【たこぴのタネ】",
      desc:"今はまだ何も起きない。\nそのうち何か起きる。",
      factor:1.00,
      img:"https://ul.h3z.jp/29OsEvjf.png",
      fx:"待て"
    },
    {
      id:"seed_colabo",
      name:"【コラボのタネ】",
      desc:"今はまだ何も起きない。\nそのうち何か起きる。",
      factor:1.00,
      img:"https://ul.h3z.jp/AWBcxVls.png",
      fx:"シリアル解放"
    },
  ];

  // 水：確率（rates）で抽選
  const WATERS = [
    {
      id:"water_plain_free",
      name:"《ただの水》",
      desc:"無料・UR/LRなし。\n無課金の基準。",
      factor:1.00,
      fx:"基準（水）",
      img:"https://ul.h3z.jp/13XdhuHi.png",
      rates:{ N:62.5, R:31.2, SR:6.3, UR:0, LR:0 }
    },
    {
      id:"water_nice",
      name:"《なんか良さそうな水》",
      desc:"ちょい上振れ・LRなし。\n初心者の背中押し。",
      factor:0.98,
      fx:"ちょい上振れ",
      img:"https://ul.h3z.jp/3z04ypEd.png",
      rates:{ N:57.2, R:31.8, SR:8.9, UR:2.1, LR:0 }
    },
    {
      id:"water_suspicious",
      name:"《怪しい水》",
      desc:"現実準拠・標準。\n実パックと同じ空気。",
      factor:0.95,
      fx:"標準（現実準拠）",
      img:"https://ul.h3z.jp/wtCO9mec.png",
      rates:{ N:61.5, R:30.8, SR:6.15, UR:1.03, LR:0.51 }
    },
    {
      id:"water_overdo",
      name:"《やりすぎな水》",
      desc:"勝負水・現実より上。\n体感で強い。",
      factor:0.90,
      fx:"勝負",
      img:"https://ul.h3z.jp/vsL9ggf6.png",
      rates:{ N:49.7, R:31.9, SR:12.8, UR:4.1, LR:1.5 }
    },
    {
      id:"water_regret",
      name:"《押さなきゃよかった水》",
      desc:"確定枠・狂気。\n事件製造機（SNS向け）",
      factor:1.00,
      fx:"事件",
      img:"https://ul.h3z.jp/L0nafMOp.png",
      rates:{ N:99.97, R:0, SR:0, UR:0, LR:0.03 }
    },
  ];

  // 肥料：時短＋副作用
  const FERTS = [
    {
      id:"fert_agedama",
      name:"①ただの揚げ玉",
      desc:"時短0。\n《焼きすぎたカード》率UP",
      factor:1.00,
      fx:"時短 0%",
      img:"https://ul.h3z.jp/9p5fx53n.png",
      burnCardUp:0.12,
      rawCardChance:0.00,
      mantra:false,
      skipGrowAnim:false
    },
    {
      id:"fert_feel",
      name:"②《気のせい肥料》",
      desc:"早くなった気がする。\n気のせいかもしれない。",
      factor:0.95,
      fx:"時短 5%",
      img:"https://ul.h3z.jp/XqFTb7sw.png",
      burnCardUp:0.00,
      rawCardChance:0.00,
      mantra:false,
      skipGrowAnim:false
    },
    {
      id:"fert_guts",
      name:"③《根性論ぶち込み肥料》",
      desc:"理由はない。\n気合いだ。",
      factor:0.80,
      fx:"時短 20%",
      img:"https://ul.h3z.jp/bT9ZcNnS.png",
      burnCardUp:0.00,
      rawCardChance:0.00,
      mantra:true,
      skipGrowAnim:false
    },
    {
      id:"fert_skip",
      name:"④《工程すっ飛ばし肥料》",
      desc:"途中は、\n見なかったことにした。",
      factor:0.60,
      fx:"時短 40%",
      img:"https://ul.h3z.jp/FqPzx12Q.png",
      burnCardUp:0.00,
      rawCardChance:0.01,
      mantra:false,
      skipGrowAnim:true
    },
    {
      id:"fert_timeno",
      name:"⑤《時間を信じない肥料》",
      desc:"最終兵器・禁忌。\n稀に《ドロドロ生焼けカード》",
      factor:0.10,
      fx:"時短 90〜100%",
      img:"https://ul.h3z.jp/l2njWY57.png",
      burnCardUp:0.00,
      rawCardChance:0.03,
      mantra:false,
      skipGrowAnim:true
    },
  ];

  // ====== グローバル公開（farm/rotenから共通利用）=====
  window.TF_ITEMS = Object.freeze({
    CARD_POOLS: Object.freeze(CARD_POOLS),
    SEEDS: Object.freeze(SEEDS),
    WATERS: Object.freeze(WATERS),
    FERTS: Object.freeze(FERTS),
  });
})();

