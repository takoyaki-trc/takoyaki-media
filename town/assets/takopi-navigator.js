(() => {
  "use strict";

  /* =========================
     たこぴナビ 完全版
     - 右下固定
     - 初回だけ自動で開く
     - たこぴ口調
     - ホームページ全体の案内
     - 導線つき
  ========================== */

  const CONFIG = {
    icon: "https://ul.h3z.jp/xtmKojxp.png",

    routes: {
      farm: "./index2.html",
      tower: "./takoyaki-tower01.html",
      fish: "./takofish-01.html",
      shop: "./myshop-social.html",
      matching: "./matching-board.html",
      buy: "https://takoyaki-toreka.booth.pm/item_lists/m7YToKe5"
    },

    storageKeys: {
      seenAutoOpen: "takopi_nav_auto_open_seen_v2",
      seenHint: "takopi_nav_hint_seen_v2",
      lastMessageIndex: "takopi_nav_last_message_v2"
    }
  };

  const MESSAGES = [
    {
      title: "ここは何のページたこ？🐙",
      body:
`ここは、たこ焼きトレカのホームページたこ🐙
カードの販売だけじゃなくて、
遊ぶとデジタルカードが収穫できるゲームもあるたこ。`,
      chips: ["販売ページ", "ゲーム", "デジタルカード"],
      actions: [
        { label: "遊んでカードGET🐙", href: CONFIG.routes.farm, type: "primary" },
        { label: "カードを買う", href: CONFIG.routes.buy, type: "secondary", external: true },
        { label: "あとで見て回るたこ", role: "next", type: "ghost" }
      ]
    },
    {
      title: "まずはここがいちばん入りやすいたこ🐙",
      body:
`たこ焼きファームでは、
遊びながらカードが収穫できるたこ🐙
はじめてなら、まずここからがわかりやすいたこ。`,
      chips: ["たこ焼きファーム", "収穫", "初見向け"],
      actions: [
        { label: "たこ焼きファームへ", href: CONFIG.routes.farm, type: "primary" },
        { label: "カードを買う", href: CONFIG.routes.buy, type: "secondary", external: true },
        { label: "ほかも見るたこ", role: "next", type: "ghost" }
      ]
    },
    {
      title: "遊び方はいろいろあるたこ🐙",
      body:
`たこ焼きバランスタワーもあるたこ🐙
たこ焼き釣りもあるたこ🐙
見るだけじゃなくて、押すといろいろ始まるたこ。`,
      chips: ["バランスタワー", "たこ焼き釣り", "無料"],
      actions: [
        { label: "タワーで遊ぶ", href: CONFIG.routes.tower, type: "primary" },
        { label: "釣ってみる🐙", href: CONFIG.routes.fish, type: "secondary" },
        { label: "次の案内を見る", role: "next", type: "ghost" }
      ]
    },
    {
      title: "まだまだあるたこ🐙",
      body:
`露店ごっこもあるたこ🐙
たこ焼きマッチングの推理ゲームもあるたこ🐙
気になる場所をひとつ押すだけで大丈夫たこ。`,
      chips: ["露店ごっこ", "推理ゲーム", "回遊"],
      actions: [
        { label: "露店ごっこへ", href: CONFIG.routes.shop, type: "primary" },
        { label: "推理ゲームへ", href: CONFIG.routes.matching, type: "secondary" },
        { label: "もう一回案内を見る", role: "next", type: "ghost" }
      ]
    },
    {
      title: "迷ったらこうするたこ🐙",
      body:
`まずはファームで遊ぶたこ🐙
次に、釣りかタワーを触ってみるたこ🐙
最後に気になったカードを買う流れがおすすめたこ。`,
      chips: ["おすすめ順", "ファーム", "釣り・タワー"],
      actions: [
        { label: "おすすめ順で行く🐙", href: CONFIG.routes.farm, type: "primary" },
        { label: "カードを見る", href: CONFIG.routes.buy, type: "secondary", external: true },
        { label: "最初の案内にもどる", role: "reset", type: "ghost" }
      ]
    }
  ];

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .takopi-nav{
        position:fixed;
        right:max(12px, env(safe-area-inset-right));
        bottom:max(12px, calc(env(safe-area-inset-bottom) + 8px));
        z-index:999999;
        display:flex;
        flex-direction:column;
        align-items:flex-end;
        gap:10px;
        pointer-events:none;
      }

      .takopi-nav *{
        box-sizing:border-box;
        pointer-events:auto;
      }

      .takopi-nav__hint{
        max-width:220px;
        padding:8px 10px;
        border-radius:12px;
        background:rgba(0,0,0,.84);
        color:#fff;
        font-size:12px;
        line-height:1.45;
        border:1px solid rgba(255,255,255,.12);
        box-shadow:0 10px 24px rgba(0,0,0,.28);
        opacity:0;
        visibility:hidden;
        transform:translateY(6px);
        transition:.22s ease;
      }

      .takopi-nav.is-hint .takopi-nav__hint{
        opacity:1;
        visibility:visible;
        transform:translateY(0);
      }

      .takopi-nav__panel{
        width:min(92vw, 360px);
        border:3px solid rgba(255,255,255,.22);
        border-radius:18px;
        background:linear-gradient(180deg, rgba(15,20,32,.96), rgba(8,10,18,.96));
        box-shadow:0 18px 40px rgba(0,0,0,.42), 0 0 0 1px rgba(255,255,255,.06) inset;
        color:#fff;
        padding:14px 14px 12px;
        transform-origin:right bottom;
        transform:translateY(8px) scale(.96);
        opacity:0;
        visibility:hidden;
        transition:.22s ease;
        backdrop-filter:blur(8px);
        position:relative;
      }

      .takopi-nav.is-open .takopi-nav__panel{
        transform:translateY(0) scale(1);
        opacity:1;
        visibility:visible;
      }

      .takopi-nav__close{
        position:absolute;
        top:10px;
        right:10px;
        width:30px;
        height:30px;
        border-radius:999px;
        border:1px solid rgba(255,255,255,.14);
        background:rgba(255,255,255,.06);
        color:#fff;
        font-size:16px;
        font-weight:900;
        cursor:pointer;
      }

      .takopi-nav__badge{
        display:inline-flex;
        align-items:center;
        gap:6px;
        padding:4px 8px;
        border-radius:999px;
        font-size:11px;
        font-weight:800;
        letter-spacing:.03em;
        color:#08111f;
        background:linear-gradient(180deg, #ffd76f, #ffb648);
        margin-bottom:8px;
        box-shadow:0 6px 16px rgba(255,182,72,.3);
      }

      .takopi-nav__title{
        margin:0 0 8px;
        font-size:16px;
        line-height:1.4;
        font-weight:900;
        letter-spacing:.01em;
      }

      .takopi-nav__text{
        margin:0 0 10px;
        font-size:13px;
        line-height:1.72;
        color:rgba(255,255,255,.92);
        min-height:7.2em;
        white-space:pre-line;
      }

      .takopi-nav__chips{
        display:flex;
        flex-wrap:wrap;
        gap:6px;
        margin:0 0 12px;
      }

      .takopi-nav__chip{
        border:1px solid rgba(255,255,255,.14);
        background:rgba(255,255,255,.06);
        color:rgba(255,255,255,.92);
        border-radius:999px;
        padding:6px 9px;
        font-size:11px;
        line-height:1;
        font-weight:800;
        white-space:nowrap;
      }

      .takopi-nav__actions{
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:8px;
      }

      .takopi-nav__btn{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-height:42px;
        padding:10px 10px;
        border-radius:12px;
        text-decoration:none;
        font-size:13px;
        font-weight:900;
        letter-spacing:.01em;
        border:2px solid rgba(255,255,255,.14);
        transition:.15s ease;
        text-align:center;
        cursor:pointer;
      }

      .takopi-nav__btn--primary{
        background:linear-gradient(180deg, #ffd76f, #ffb648);
        color:#231400;
        box-shadow:0 8px 18px rgba(255,182,72,.28);
      }

      .takopi-nav__btn--secondary{
        background:linear-gradient(180deg, rgba(120,190,255,.22), rgba(255,255,255,.08));
        color:#fff;
        border-color:rgba(170,220,255,.22);
      }

      .takopi-nav__btn--ghost{
        grid-column:1 / -1;
        background:rgba(255,255,255,.06);
        color:rgba(255,255,255,.95);
      }

      .takopi-nav__btn:active{
        transform:translateY(1px);
      }

      .takopi-nav__fab{
        position:relative;
        display:inline-flex;
        align-items:center;
        gap:10px;
        min-height:62px;
        padding:8px 14px 8px 10px;
        border:0;
        border-radius:999px;
        background:linear-gradient(180deg, #ffcf6b 0%, #ffab39 100%);
        color:#251300;
        font-weight:900;
        font-size:14px;
        letter-spacing:.02em;
        box-shadow:0 14px 28px rgba(0,0,0,.32), 0 0 0 3px rgba(255,255,255,.14);
        cursor:pointer;
        -webkit-tap-highlight-color:transparent;
        touch-action:manipulation;
      }

      .takopi-nav__fab::after{
        content:"";
        position:absolute;
        inset:-3px;
        border-radius:999px;
        border:2px solid rgba(255,208,107,.45);
        animation:takopiNavPulse 1.8s ease-out infinite;
        pointer-events:none;
      }

      .takopi-nav.is-open .takopi-nav__fab::after{
        animation:none;
        opacity:0;
      }

      .takopi-nav__icon-wrap{
        width:42px;
        height:42px;
        border-radius:999px;
        background:rgba(255,255,255,.24);
        box-shadow:inset 0 1px 0 rgba(255,255,255,.45);
        display:flex;
        align-items:center;
        justify-content:center;
        flex:0 0 42px;
        overflow:hidden;
      }

      .takopi-nav__icon{
        width:34px;
        height:34px;
        object-fit:contain;
        display:block;
      }

      .takopi-nav__label{
        display:flex;
        flex-direction:column;
        align-items:flex-start;
        line-height:1.05;
      }

      .takopi-nav__label small{
        font-size:10px;
        font-weight:800;
        opacity:.84;
        margin-top:3px;
      }

      @keyframes takopiNavPulse{
        0%{
          transform:scale(1);
          opacity:.9;
        }
        70%{
          transform:scale(1.12);
          opacity:0;
        }
        100%{
          transform:scale(1.12);
          opacity:0;
        }
      }

      @media (max-width:480px){
        .takopi-nav{
          right:10px;
          bottom:max(10px, calc(env(safe-area-inset-bottom) + 8px));
        }

        .takopi-nav__panel{
          width:min(94vw, 330px);
          padding:13px 12px 11px;
        }

        .takopi-nav__title{
          font-size:15px;
        }

        .takopi-nav__text{
          font-size:12.5px;
          min-height:7.4em;
        }

        .takopi-nav__actions{
          grid-template-columns:1fr;
        }

        .takopi-nav__btn--ghost{
          grid-column:auto;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createNavigator() {
    const root = document.createElement("div");
    root.className = "takopi-nav";
    root.id = "takopiNav";

    root.innerHTML = `
      <div class="takopi-nav__hint" id="takopiNavHint">初見さんはここを押すたこ🐙</div>

      <div class="takopi-nav__panel" id="takopiNavPanel" aria-hidden="true">
        <button class="takopi-nav__close" id="takopiNavClose" type="button" aria-label="たこぴナビを閉じる">×</button>
        <div class="takopi-nav__badge">🐙 たこぴナビ</div>
        <h2 class="takopi-nav__title" id="takopiNavTitle"></h2>
        <p class="takopi-nav__text" id="takopiNavText"></p>
        <div class="takopi-nav__chips" id="takopiNavChips"></div>
        <div class="takopi-nav__actions" id="takopiNavActions"></div>
      </div>

      <button class="takopi-nav__fab" id="takopiNavFab" type="button" aria-expanded="false" aria-controls="takopiNavPanel">
        <span class="takopi-nav__icon-wrap">
          <img class="takopi-nav__icon" src="${CONFIG.icon}" alt="たこぴ">
        </span>
        <span class="takopi-nav__label">
          たこぴナビ
          <small>はじめてならここ</small>
        </span>
      </button>
    `;

    document.body.appendChild(root);
    return root;
  }

  function getSavedIndex() {
    const raw = localStorage.getItem(CONFIG.storageKeys.lastMessageIndex);
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n % MESSAGES.length : 0;
  }

  function saveIndex(index) {
    localStorage.setItem(CONFIG.storageKeys.lastMessageIndex, String(index));
  }

  function renderMessage(index) {
    const data = MESSAGES[index];
    const title = document.getElementById("takopiNavTitle");
    const text = document.getElementById("takopiNavText");
    const chips = document.getElementById("takopiNavChips");
    const actions = document.getElementById("takopiNavActions");

    if (!title || !text || !chips || !actions) return;

    title.textContent = data.title;
    text.textContent = data.body;

    chips.innerHTML = "";
    data.chips.forEach((chipText) => {
      const chip = document.createElement("span");
      chip.className = "takopi-nav__chip";
      chip.textContent = chipText;
      chips.appendChild(chip);
    });

    actions.innerHTML = "";
    data.actions.forEach((action) => {
      const el = document.createElement(action.href ? "a" : "button");
      el.className = `takopi-nav__btn takopi-nav__btn--${action.type || "ghost"}`;
      el.textContent = action.label;

      if (action.href) {
        el.href = action.href;
        if (action.external) {
          el.target = "_blank";
          el.rel = "noopener";
        }
      } else {
        el.type = "button";
      }

      if (action.role === "next") {
        el.addEventListener("click", () => {
          state.index = (state.index + 1) % MESSAGES.length;
          saveIndex(state.index);
          renderMessage(state.index);
        });
      }

      if (action.role === "reset") {
        el.addEventListener("click", () => {
          state.index = 0;
          saveIndex(state.index);
          renderMessage(state.index);
        });
      }

      actions.appendChild(el);
    });
  }

  const state = {
    index: getSavedIndex()
  };

  injectStyles();
  const root = createNavigator();

  const fab = document.getElementById("takopiNavFab");
  const panel = document.getElementById("takopiNavPanel");
  const closeBtn = document.getElementById("takopiNavClose");

  function openNav(markSeen = true) {
    root.classList.add("is-open");
    fab.setAttribute("aria-expanded", "true");
    panel.setAttribute("aria-hidden", "false");
    root.classList.remove("is-hint");

    if (markSeen) {
      localStorage.setItem(CONFIG.storageKeys.seenAutoOpen, "1");
    }
  }

  function closeNav() {
    root.classList.remove("is-open");
    fab.setAttribute("aria-expanded", "false");
    panel.setAttribute("aria-hidden", "true");
  }

  function toggleNav() {
    if (root.classList.contains("is-open")) {
      closeNav();
      return;
    }
    state.index = (state.index + 1) % MESSAGES.length;
    saveIndex(state.index);
    renderMessage(state.index);
    openNav(true);
  }

  renderMessage(state.index);

  fab.addEventListener("click", toggleNav);

  closeBtn.addEventListener("click", () => {
    closeNav();
  });

  document.addEventListener("click", (e) => {
    if (!root.classList.contains("is-open")) return;
    if (root.contains(e.target)) return;
    closeNav();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root.classList.contains("is-open")) {
      closeNav();
    }
  });

  if (!localStorage.getItem(CONFIG.storageKeys.seenHint)) {
    setTimeout(() => {
      root.classList.add("is-hint");
    }, 900);

    setTimeout(() => {
      root.classList.remove("is-hint");
      localStorage.setItem(CONFIG.storageKeys.seenHint, "1");
    }, 5200);
  }

  if (!localStorage.getItem(CONFIG.storageKeys.seenAutoOpen)) {
    setTimeout(() => {
      renderMessage(0);
      openNav(false);
    }, 1300);

    setTimeout(() => {
      closeNav();
      localStorage.setItem(CONFIG.storageKeys.seenAutoOpen, "1");
      state.index = 0;
      saveIndex(0);
    }, 7200);
  }
})();