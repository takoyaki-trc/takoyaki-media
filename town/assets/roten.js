/* assets/roten.js
   - 最小スタブ：タブ切替 + データ読み込み確認
   - 次に「マイ露店の出店→売れる判定」を実装していく
*/
(() => {
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  function initTabs(){
    const tabs = $$(".roten-tab");
    const panels = $$(".roten-panel");
    tabs.forEach(btn => {
      btn.addEventListener("click", () => {
        tabs.forEach(b => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        const key = btn.dataset.tab;
        panels.forEach(p => p.classList.toggle("is-show", p.dataset.panel === key));
      });
    });
  }

  function debug(){
    const c = window.ROTEN_CUSTOMERS;
    const m = window.ROTEN_MARKET;

    const npc = $("#rotenDebugNpc");
    const my = $("#rotenDebugMy");

    if(npc) npc.textContent =
      "ROTEN_CUSTOMERS.base: " + (c?.base?.length ?? "ERR") + "人\n" +
      "collabSlots: " + (c?.collabSlots?.length ?? "ERR") + "枠\n" +
      "ROTEN_MARKET.basePrices: " + (m?.basePrices ? "OK" : "ERR");

    if(my) my.textContent =
      "次はここに「出店棚→客層抽選→売却結果」を作ります。\n" +
      "王様(allBuy)の挙動もここで実装。";
  }

  function boot(){
    initTabs();
    debug();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})();

