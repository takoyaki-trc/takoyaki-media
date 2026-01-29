/* assets/roten.market.js
   - まずは最小スタブ（後で日替わり相場/客層プールを入れる）
*/
(() => {
  window.ROTEN_MARKET = {
    version: 1,
    // 日替わり判定用（roten.jsで今日の日付を入れて使う想定）
    todayKey: null,
    // 相場（後で：レアリティ別の基準価格など）
    basePrices: {
      N: 10, R: 25, SR: 60, UR: 120, LR: 200
    }
  };
})();

