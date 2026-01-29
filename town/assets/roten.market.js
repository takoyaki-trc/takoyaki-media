/* assets/roten.market.js
   - 日替わりの「市場の空気（ムード）」だけ最小実装
   - 相場は後で本実装に拡張する（今はUI表示用）
*/
(() => {
  const moods = [
    { id:"poor_day",  label:"今日は貧乏タコ民が多そうだ。", hint:"値切りの匂いがする。焦るな。" },
    { id:"normal",    label:"今日は普通の日。市場は静かだ。", hint:"淡々と回せ。欲張りすぎるな。" },
    { id:"rich_day",  label:"今日は懐が深い客が来るらしい。", hint:"強気でも、売れる日がある。" },
    { id:"weird",     label:"今日は…嫌な予感がする。", hint:"運は甘くない。だが、稀に跳ねる。" },
    { id:"festival",  label:"今日は市場がざわついている。", hint:"噂が走る日は、財布も走る。" }
  ];

  window.ROTEN_MARKET = {
    version: 1,
    basePrices: { N: 10, R: 25, SR: 60, UR: 120, LR: 200 },

    // その日を決めるためのキー（YYYY-MM-DD）
    todayKey: null,

    // 今日のムード（roten.js が決定して保存する）
    mood: null,

    moods
  };
})();
