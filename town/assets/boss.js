(() => {
  // ===== 会話UIを作る（無ければ生成） =====
  let talk = document.querySelector(".boss-talk");
  if (!talk) {
    talk = document.createElement("div");
    talk.className = "boss-talk";
    talk.innerHTML = `
      <div class="boss-talk-panel" role="dialog" aria-modal="true">
        <div class="boss-talk-title" id="bossTalkTitle">鉄板魔グマ</div>
        <div class="boss-talk-text" id="bossTalkText">……鉄板の奥が、赤く脈打っている。</div>
        <div class="boss-talk-buttons">
          <button type="button" id="bossBack">退く</button>
        </div>
      </div>
    `;
    document.body.appendChild(talk);
  }

  const openTalk = () => {
    // gateモーダルが開いてたら閉じる（事故防止）
    const gm = document.getElementById("gateModal");
    if (gm) gm.classList.remove("is-open");

    // 最前面固定
    document.body.appendChild(talk);
    talk.style.position = "fixed";
    talk.style.inset = "0";
    talk.style.zIndex = "30000";
    talk.style.background = "rgba(0,0,0,0.85)";

    talk.classList.add("is-open");
  };

  const closeTalk = () => {
    talk.classList.remove("is-open");
  };

  // 閉じる
  const back = talk.querySelector("#bossBack");
  if (back) back.onclick = closeTalk;

  // boss-gate を押したら開く（遅延生成対策つき）
  const bindBossGate = () => {
    const gate = document.querySelector(".boss-gate");
    if (!gate || gate.dataset.bound) return;

    gate.dataset.bound = "1";
    gate.addEventListener("click", (e) => {
      e.preventDefault();
      openTalk();
    });
  };

  // 実行
  bindBossGate();
  setTimeout(bindBossGate, 500);
  setTimeout(bindBossGate, 1500);
})();
