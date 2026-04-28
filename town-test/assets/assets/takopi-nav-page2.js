(() => {
  "use strict";

  // ===============================
  // すでに存在してたら作らない（二重防止）
  // ===============================
  if (document.getElementById("takopiNav")) return;

  // ===============================
  // HTML生成
  // ===============================
  const nav = document.createElement("div");
  nav.id = "takopiNav";
  nav.innerHTML = `
    <button id="takopiNavFab" aria-label="たこぴナビ">🐙</button>

    <div id="takopiNavPanel" aria-hidden="true">
      <div class="takopi-header">
        <span>たこぴナビ</span>
        <button id="takopiNavClose">×</button>
      </div>

      <div class="takopi-body">
        <button class="takopi-btn" data-go="gift">🎁 プレゼント</button>
        <button class="takopi-btn" data-go="omikuji">🎯 みくじ</button>
        <button class="takopi-btn" data-go="serial">🎫 シリアル</button>
        <button class="takopi-btn" data-go="farm">🌱 畑</button>
        <button class="takopi-btn" data-go="shop">🛒 ショップ</button>
        <button class="takopi-btn" data-go="game">🎮 ミニゲーム</button>
      </div>
    </div>
  `;
  document.body.appendChild(nav);

  // ===============================
  // CSS（ここが重要）
  // ===============================
  const style = document.createElement("style");
  style.textContent = `
  #takopiNav{
    position:fixed;
    right:16px;
    bottom:16px;
    z-index:9999;
  }

  #takopiNavFab{
    width:56px;
    height:56px;
    border-radius:50%;
    border:none;
    font-size:26px;
    background:#ff5d5f;
    color:#fff;
    box-shadow:0 8px 20px rgba(0,0,0,.3);
    cursor:pointer;
  }

  #takopiNavPanel{
    position:absolute;
    right:0;
    bottom:70px;
    width:220px;
    background:#111;
    border-radius:14px;
    display:none;
    overflow:hidden;
    box-shadow:0 12px 40px rgba(0,0,0,.4);
  }

  #takopiNav.is-open #takopiNavPanel{
    display:block;
  }

  .takopi-header{
    display:flex;
    justify-content:space-between;
    align-items:center;
    padding:10px;
    background:#222;
    font-weight:bold;
    color:#fff;
  }

  .takopi-body{
    display:flex;
    flex-direction:column;
  }

  .takopi-btn{
    padding:12px;
    border:none;
    background:#111;
    color:#fff;
    text-align:left;
    cursor:pointer;
    border-top:1px solid rgba(255,255,255,.1);
  }

  .takopi-btn:hover{
    background:#1a1a1a;
  }
  `;
  document.head.appendChild(style);

  // ===============================
  // 動作
  // ===============================
  const root = document.getElementById("takopiNav");
  const fab = document.getElementById("takopiNavFab");
  const closeBtn = document.getElementById("takopiNavClose");

  fab.onclick = () => {
    root.classList.toggle("is-open");
  };

  closeBtn.onclick = () => {
    root.classList.remove("is-open");
  };

  document.querySelectorAll(".takopi-btn").forEach(btn => {
    btn.onclick = () => {
      const type = btn.dataset.go;

      if (type === "gift") {
        if (window.openGiftBox) openGiftBox();
      }
      if (type === "omikuji") {
        location.href = "./omikuji.html";
      }
      if (type === "serial") {
        location.href = "https://takoyaki-card.com/town-test/code.html";
      }
      if (type === "farm") {
        location.href = "./farm.html";
      }
      if (type === "shop") {
        location.href = "./roten.html";
      }
      if (type === "game") {
        location.href = "./tower.html";
      }

      root.classList.remove("is-open");
    };
  });

})();