(() => {
  "use strict";

  /* =========================================
     たこ焼きファーム街 2ページ目専用
     たこぴナビゲーター 完全版（next不具合修正版）
  ========================================= */

  const CONFIG = {
    icon: "https://ul.h3z.jp/xtmKojxp.png",

    storage: {
      seenIntro: "takopi_farm_nav_seen_intro_v6",
      closedHint: "takopi_farm_nav_closed_hint_v6",
      step: "takopi_farm_nav_step_v6"
    },

    selectors: {
      giftBtn: "#giftBoxBtn",
      serialBtn: "#serialCodeBtn",
      guideBtn: "#farmGuideBtn",

      omikujiBuilding: ".b4",
      farmBuilding: ".b1",
      matchingBuilding: ".b2",
      myshopBuilding: ".b3",
      shopBuilding: ".b6",

      takopiNpc: ".t10"
    },

    links: {
      serial: "https://takoyaki-card.com/town-test/code.html",
      fish: "./takofish-01.html",
      tower: "./takoyaki-tower01.html"
    }
  };

  function getLS(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : v;
    } catch (_) {
      return fallback;
    }
  }

  function setLS(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch (_) {}
  }

  function getJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function getInv() {
    const inv = getJSON("tf_v1_inv", { ver: 1, seed: {}, water: {}, fert: {} }) || {};
    inv.seed = inv.seed || {};
    inv.water = inv.water || {};
    inv.fert = inv.fert || {};
    return inv;
  }

  function totalCount(obj) {
    return Object.values(obj || {}).reduce((sum, v) => sum + Math.max(0, Number(v || 0)), 0);
  }

  function getOcto() {
    const n = Number(getLS("roten_v1_octo", "0"));
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  function hasClaimedGift() {
    return getLS("roten_v1_launch_gift_claimed", "0") === "1";
  }

  function hasAnySeed(inv = getInv()) {
    return totalCount(inv.seed) > 0;
  }

  function hasAnyWater(inv = getInv()) {
    return totalCount(inv.water) > 0;
  }

  function hasAnyFert(inv = getInv()) {
    return totalCount(inv.fert) > 0;
  }

  function inferRecommendedStep() {
    const first = !getLS(CONFIG.storage.seenIntro);
    if (first) return 0;

    const inv = getInv();
    const octo = getOcto();
    const giftClaimed = hasClaimedGift();

    const seed = hasAnySeed(inv);
    const water = hasAnyWater(inv);
    const fert = hasAnyFert(inv);

    if (!giftClaimed) return 0;

    if (giftClaimed && !getLS("takopi_farm_nav_omikuji_seen_v3")) {
      return 1;
    }

    if (!seed) return 0;

    if (!water || !fert) {
      if (octo > 0) return 2;
      return 5;
    }

    return 3;
  }

  function qs(sel) {
    try {
      return document.querySelector(sel);
    } catch (_) {
      return null;
    }
  }

  function injectStyle() {
    const style = document.createElement("style");
    style.textContent = `
      .takopi-farm-nav{
        position: fixed;
        right: max(12px, env(safe-area-inset-right));
        bottom: max(12px, calc(env(safe-area-inset-bottom) + 8px));
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 10px;
        pointer-events: none;
      }

      .takopi-farm-nav *{
        box-sizing: border-box;
        pointer-events: auto;
      }

      .takopi-farm-nav__hint{
        max-width: 220px;
        padding: 8px 10px;
        border-radius: 12px;
        background: rgba(0,0,0,.84);
        color: #fff;
        font-size: 12px;
        line-height: 1.45;
        border: 1px solid rgba(255,255,255,.12);
        box-shadow: 0 10px 24px rgba(0,0,0,.28);
        opacity: 0;
        visibility: hidden;
        transform: translateY(6px);
        transition: .22s ease;
      }

      .takopi-farm-nav.is-hint .takopi-farm-nav__hint{
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      .takopi-farm-nav__panel{
        width: min(92vw, 384px);
        border: 3px solid rgba(255,255,255,.22);
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(15,20,32,.97), rgba(8,10,18,.97));
        box-shadow: 0 18px 40px rgba(0,0,0,.42), 0 0 0 1px rgba(255,255,255,.06) inset;
        color: #fff;
        padding: 14px 14px 12px;
        transform-origin: right bottom;
        transform: translateY(8px) scale(.96);
        opacity: 0;
        visibility: hidden;
        transition: .22s ease;
        backdrop-filter: blur(8px);
        position: relative;
      }

      .takopi-farm-nav.is-open .takopi-farm-nav__panel{
        transform: translateY(0) scale(1);
        opacity: 1;
        visibility: visible;
      }

      .takopi-farm-nav__close{
        position: absolute;
        top: 10px;
        right: 10px;
        width: 30px;
        height: 30px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.06);
        color: #fff;
        font-size: 16px;
        font-weight: 900;
        cursor: pointer;
      }

      .takopi-farm-nav__badge{
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .03em;
        color: #08111f;
        background: linear-gradient(180deg, #ffd76f, #ffb648);
        margin-bottom: 8px;
        box-shadow: 0 6px 16px rgba(255,182,72,.3);
      }

      .takopi-farm-nav__title{
        margin: 0 0 8px;
        font-size: 16px;
        line-height: 1.4;
        font-weight: 900;
      }

      .takopi-farm-nav__text{
        margin: 0 0 12px;
        font-size: 13px;
        line-height: 1.74;
        color: rgba(255,255,255,.92);
        min-height: 7.6em;
        white-space: pre-line;
      }

      .takopi-farm-nav__chips{
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 0 0 12px;
      }

      .takopi-farm-nav__chip{
        border: 1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.06);
        color: rgba(255,255,255,.92);
        border-radius: 999px;
        padding: 6px 9px;
        font-size: 11px;
        font-weight: 800;
        white-space: nowrap;
      }

      .takopi-farm-nav__actions{
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .takopi-farm-nav__btn{
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 42px;
        padding: 10px 10px;
        border-radius: 12px;
        text-decoration: none;
        font-size: 13px;
        font-weight: 900;
        border: 2px solid rgba(255,255,255,.14);
        transition: .15s ease;
        text-align: center;
        cursor: pointer;
        appearance: none;
      }

      .takopi-farm-nav__btn--primary{
        background: linear-gradient(180deg, #ffd76f, #ffb648);
        color: #231400;
        box-shadow: 0 8px 18px rgba(255,182,72,.28);
      }

      .takopi-farm-nav__btn--secondary{
        background: linear-gradient(180deg, rgba(120,190,255,.22), rgba(255,255,255,.08));
        color: #fff;
        border-color: rgba(170,220,255,.22);
      }

      .takopi-farm-nav__btn--ghost{
        grid-column: 1 / -1;
        background: rgba(255,255,255,.06);
        color: rgba(255,255,255,.95);
      }

      .takopi-farm-nav__fab{
        position: relative;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-height: 62px;
        padding: 8px 14px 8px 10px;
        border: 0;
        border-radius: 999px;
        background: linear-gradient(180deg, #ffcf6b 0%, #ffab39 100%);
        color: #251300;
        font-weight: 900;
        font-size: 14px;
        box-shadow: 0 14px 28px rgba(0,0,0,.32), 0 0 0 3px rgba(255,255,255,.14);
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }

      .takopi-farm-nav__fab::after{
        content:"";
        position:absolute;
        inset:-3px;
        border-radius:999px;
        border:2px solid rgba(255,208,107,.45);
        animation: takopiFarmNavPulse 1.8s ease-out infinite;
        pointer-events:none;
      }

      .takopi-farm-nav.is-open .takopi-farm-nav__fab::after{
        animation:none;
        opacity:0;
      }

      .takopi-farm-nav__icon-wrap{
        width: 42px;
        height: 42px;
        border-radius: 999px;
        background: rgba(255,255,255,.24);
        display:flex;
        align-items:center;
        justify-content:center;
        flex:0 0 42px;
        overflow:hidden;
      }

      .takopi-farm-nav__icon{
        width: 34px;
        height: 34px;
        object-fit: contain;
        display:block;
      }

      .takopi-farm-nav__label{
        display:flex;
        flex-direction:column;
        align-items:flex-start;
        line-height:1.05;
      }

      .takopi-farm-nav__label small{
        font-size:10px;
        font-weight:800;
        opacity:.84;
        margin-top:3px;
      }

      .takopi-nav-target{
        position: relative !important;
        z-index: 99990 !important;
        box-shadow:
          0 0 0 3px rgba(255,212,107,.95),
          0 0 0 8px rgba(255,212,107,.22),
          0 0 24px rgba(255,190,60,.75) !important;
        border-radius: 16px !important;
        animation: takopiTargetPulse 1.2s ease-in-out infinite;
      }

      .takopi-nav-bounce{
        animation: takopiBounce .45s ease 2 !important;
      }

      .tf-building > img.takopi-nav-target{
        display: block;
        border-radius: 18px !important;
      }

      .takomin > img.takopi-nav-target{
        display: block;
        border-radius: 14px !important;
      }

      .hud-btn.takopi-nav-target{
        border-radius: 12px !important;
      }

      @keyframes takopiFarmNavPulse{
        0%{ transform:scale(1); opacity:.9; }
        70%{ transform:scale(1.12); opacity:0; }
        100%{ transform:scale(1.12); opacity:0; }
      }

      @keyframes takopiTargetPulse{
        0%,100%{
          box-shadow:
            0 0 0 3px rgba(255,212,107,.95),
            0 0 0 8px rgba(255,212,107,.22),
            0 0 24px rgba(255,190,60,.75);
        }
        50%{
          box-shadow:
            0 0 0 3px rgba(255,247,180,1),
            0 0 0 10px rgba(255,212,107,.28),
            0 0 34px rgba(255,190,60,.95);
        }
      }

      @keyframes takopiBounce{
        0%{ transform: translateY(0); }
        35%{ transform: translateY(-6px); }
        70%{ transform: translateY(0); }
        100%{ transform: translateY(-2px); }
      }

      @media (max-width:480px){
        .takopi-farm-nav{
          right:10px;
          bottom:max(10px, calc(env(safe-area-inset-bottom) + 8px));
        }
        .takopi-farm-nav__panel{
          width:min(94vw, 338px);
          padding:13px 12px 11px;
        }
        .takopi-farm-nav__title{
          font-size:15px;
        }
        .takopi-farm-nav__text{
          font-size:12.5px;
          min-height:7.8em;
        }
        .takopi-farm-nav__actions{
          grid-template-columns:1fr;
        }
        .takopi-farm-nav__btn--ghost{
          grid-column:auto;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createRoot() {
    const root = document.createElement("div");
    root.className = "takopi-farm-nav";
    root.id = "takopiFarmNav";

    root.innerHTML = `
      <div class="takopi-farm-nav__hint" id="takopiFarmNavHint">次に押す場所、案内するたこ🐙</div>

      <div class="takopi-farm-nav__panel" id="takopiFarmNavPanel" aria-hidden="true">
        <button class="takopi-farm-nav__close" id="takopiFarmNavClose" type="button" aria-label="たこぴナビを閉じる">×</button>
        <div class="takopi-farm-nav__badge">🐙 たこぴナビ</div>
        <h2 class="takopi-farm-nav__title" id="takopiFarmNavTitle"></h2>
        <p class="takopi-farm-nav__text" id="takopiFarmNavText"></p>
        <div class="takopi-farm-nav__chips" id="takopiFarmNavChips"></div>
        <div class="takopi-farm-nav__actions" id="takopiFarmNavActions"></div>
      </div>

      <button class="takopi-farm-nav__fab" id="takopiFarmNavFab" type="button" aria-expanded="false" aria-controls="takopiFarmNavPanel">
        <span class="takopi-farm-nav__icon-wrap">
          <img class="takopi-farm-nav__icon" src="${CONFIG.icon}" alt="たこぴ">
        </span>
        <span class="takopi-farm-nav__label">
          たこぴナビ
          <small>次やること</small>
        </span>
      </button>
    `;

    document.body.appendChild(root);
    return root;
  }

  function clearTargets() {
    document.querySelectorAll(".takopi-nav-target").forEach(el => {
      el.classList.remove("takopi-nav-target");
    });
    document.querySelectorAll(".takopi-nav-bounce").forEach(el => {
      el.classList.remove("takopi-nav-bounce");
    });
  }

  function resolveHighlightTarget(selector) {
    const el = qs(selector);
    if (!el) return null;

    if (el.classList.contains("tf-building")) {
      const img = el.querySelector("img");
      if (img) return img;
    }

    if (el.classList.contains("takomin")) {
      const img = el.querySelector("img");
      if (img) return img;
    }

    return el;
  }

  function markTarget(selector, bounce = false) {
    clearTargets();
    const target = resolveHighlightTarget(selector);
    if (!target) return null;

    target.classList.add("takopi-nav-target");

    if (bounce) {
      target.classList.add("takopi-nav-bounce");
      setTimeout(() => target.classList.remove("takopi-nav-bounce"), 900);
    }

    return target;
  }

  function scrollToTarget(selector) {
    const el = qs(selector);
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    } catch (_) {
      el.scrollIntoView();
    }
  }

  function clickTarget(selector) {
    const el = qs(selector);
    if (!el) return;
    el.click();
  }

  function goToHref(href) {
    if (!href) return;
    location.href = href;
  }

  function goToSelector(selector) {
    const el = qs(selector);
    if (!el) return;

    markTarget(selector, true);
    scrollToTarget(selector);

    if (selector === CONFIG.selectors.omikujiBuilding) {
      setLS("takopi_farm_nav_omikuji_seen_v3", "1");
    }

    if (el.tagName === "A" && el.href) {
      setTimeout(() => {
        location.href = el.href;
      }, 180);
      return;
    }

    el.click();
  }

  const STEPS = [
    {
      id: 0,
      title: "まずは🎁プレゼントたこ🐙",
      text:
`最初はここから始めるたこ🐙
何も持ってないまま畑に行っても始められないたこ。
まず🎁を開いて、そのあとシリアルがある人は入力するたこ。`,
      chips: ["最初の一手", "資材確保", "シリアルもここ"],
      target: CONFIG.selectors.giftBtn,
      actions: [
        { label: "🎁を開く", kind: "click", selector: CONFIG.selectors.giftBtn, type: "primary" },
        { label: "🎫シリアル入力へ", kind: "href", href: CONFIG.links.serial, type: "secondary" },
        { label: "次へ進むたこ", kind: "next", type: "ghost" }
      ]
    },
    {
      id: 1,
      title: "次は、たこ焼きみくじたこ🐙",
      text:
`プレゼントのあとに、たこ焼きみくじも見ておくたこ🐙
オクトや資材が増えることがあるたこ。
ここを挟むと、そのあと畑やお店が進めやすいたこ。`,
      chips: ["たこ焼きみくじ", "補充", "毎日こつこつ"],
      target: CONFIG.selectors.omikujiBuilding,
      actions: [
        { label: "たこ焼きみくじへ", kind: "selector", selector: CONFIG.selectors.omikujiBuilding, type: "primary" },
        { label: "ここを光らせる", kind: "focus", selector: CONFIG.selectors.omikujiBuilding, type: "secondary" },
        { label: "次へ進むたこ", kind: "next", type: "ghost" }
      ]
    },
    {
      id: 2,
      title: "足りないなら、たこぴのお店たこ🐙",
      text:
`タネ・ミズ・ヒリョウが足りないなら、たこぴのお店へ行くたこ🐙
オクトがある時は、ここで必要な分をそろえるたこ。
足りないまま畑へ行くより、先に補充するたこ。`,
      chips: ["たこぴのお店", "資材補充", "オクト消費"],
      target: CONFIG.selectors.shopBuilding,
      actions: [
        { label: "お店へ行く", kind: "selector", selector: CONFIG.selectors.shopBuilding, type: "primary" },
        { label: "ここを光らせる", kind: "focus", selector: CONFIG.selectors.shopBuilding, type: "secondary" },
        { label: "次へ進むたこ", kind: "next", type: "ghost" }
      ]
    },
    {
      id: 3,
      title: "準備できたら、たこ焼き畑たこ🐙",
      text:
`ここからが本番たこ🐙
たこ焼き畑では、タネを選んで、
ミズとヒリョウを装備して、ワンタップ植えするたこ。
分からなければ「始め方」も見るたこ。`,
      chips: ["たこ焼き畑", "タネ", "ミズ", "ヒリョウ"],
      target: CONFIG.selectors.farmBuilding,
      actions: [
        { label: "たこ焼き畑へ", kind: "selector", selector: CONFIG.selectors.farmBuilding, type: "primary" },
        { label: "始め方を見る", kind: "click", selector: CONFIG.selectors.guideBtn, type: "secondary" },
        { label: "次へ進むたこ", kind: "next", type: "ghost" }
      ]
    },
    {
      id: 4,
      title: "植えたあとは、使い道たこ🐙",
      text:
`植えたあとは、育ったカードを収穫して終わりじゃないたこ🐙
収穫したカードは、
露店や、たこ焼きマッチングで使って進めるたこ。`,
      chips: ["収穫後", "露店", "たこ焼きマッチング"],
      target: CONFIG.selectors.myshopBuilding,
      actions: [
        { label: "露店へ行く", kind: "selector", selector: CONFIG.selectors.myshopBuilding, type: "primary" },
        { label: "たこ焼きマッチングへ", kind: "selector", selector: CONFIG.selectors.matchingBuilding, type: "secondary" },
        { label: "次へ進むたこ", kind: "next", type: "ghost" }
      ]
    },
    {
      id: 5,
      title: "資材が足りない時はミニゲームたこ🐙",
      text:
`ミズやヒリョウが足りなくなったら、
たこ焼きバランスタワーや、たこ焼き釣りへ行くたこ🐙
詰まった時の補充先として使うたこ。`,
      chips: ["たこ焼きバランスタワー", "たこ焼き釣り", "補充先"],
      target: CONFIG.selectors.takopiNpc,
      actions: [
        { label: "バランスタワーへ", kind: "href", href: CONFIG.links.tower, type: "primary" },
        { label: "たこ焼き釣りへ", kind: "href", href: CONFIG.links.fish, type: "secondary" },
        { label: "最初に戻る", kind: "reset", type: "ghost" }
      ]
    }
  ];

  let state = {
    currentStep: Number(getLS(CONFIG.storage.step, inferRecommendedStep())) || 0
  };

  injectStyle();
  const root = createRoot();

  const panel = document.getElementById("takopiFarmNavPanel");
  const fab = document.getElementById("takopiFarmNavFab");
  const closeBtn = document.getElementById("takopiFarmNavClose");
  const titleEl = document.getElementById("takopiFarmNavTitle");
  const textEl = document.getElementById("takopiFarmNavText");
  const chipsEl = document.getElementById("takopiFarmNavChips");
  const actionsEl = document.getElementById("takopiFarmNavActions");

  function saveStep() {
    setLS(CONFIG.storage.step, String(state.currentStep));
  }

  function nextStep() {
    state.currentStep = (state.currentStep + 1) % STEPS.length;
    saveStep();
    renderStep();
  }

  function resetStep() {
    state.currentStep = 0;
    saveStep();
    renderStep();
  }

  function openNav(markSeen = true) {
    root.classList.add("is-open");
    fab.setAttribute("aria-expanded", "true");
    panel.setAttribute("aria-hidden", "false");
    root.classList.remove("is-hint");

    if (markSeen) {
      setLS(CONFIG.storage.seenIntro, "1");
    }
  }

  function closeNav() {
    root.classList.remove("is-open");
    fab.setAttribute("aria-expanded", "false");
    panel.setAttribute("aria-hidden", "true");
  }

  function renderStep() {
    if (state.currentStep < 0) state.currentStep = 0;
    if (state.currentStep >= STEPS.length) state.currentStep = 0;

    const step = STEPS[state.currentStep];
    if (!step) return;

    titleEl.textContent = step.title;
    textEl.textContent = step.text;

    chipsEl.innerHTML = "";
    (step.chips || []).forEach(chipText => {
      const chip = document.createElement("span");
      chip.className = "takopi-farm-nav__chip";
      chip.textContent = chipText;
      chipsEl.appendChild(chip);
    });

    actionsEl.innerHTML = "";
    (step.actions || []).forEach(action => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `takopi-farm-nav__btn takopi-farm-nav__btn--${action.type || "ghost"}`;
      btn.textContent = action.label;

      btn.addEventListener("click", () => {
        if (action.kind === "click") {
          clickTarget(action.selector);
          return;
        }

        if (action.kind === "focus") {
          markTarget(action.selector, true);
          scrollToTarget(action.selector);
          return;
        }

        if (action.kind === "href") {
          goToHref(action.href);
          return;
        }

        if (action.kind === "selector") {
          goToSelector(action.selector);
          return;
        }

        if (action.kind === "next") {
          nextStep();
          return;
        }

        if (action.kind === "reset") {
          resetStep();
          return;
        }
      });

      actionsEl.appendChild(btn);
    });

    if (step.target) {
      markTarget(step.target);
    } else {
      clearTargets();
    }
  }

  function jumpRecommended() {
    state.currentStep = inferRecommendedStep();
    saveStep();
    renderStep();
  }

  fab.addEventListener("click", () => {
    if (root.classList.contains("is-open")) {
      closeNav();
      return;
    }
    jumpRecommended();
    openNav(true);
  });

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

  if (!getLS(CONFIG.storage.closedHint)) {
    setTimeout(() => {
      root.classList.add("is-hint");
    }, 900);

    setTimeout(() => {
      root.classList.remove("is-hint");
      setLS(CONFIG.storage.closedHint, "1");
    }, 5200);
  }

  if (!getLS(CONFIG.storage.seenIntro)) {
    setTimeout(() => {
      state.currentStep = 0;
      saveStep();
      renderStep();
      openNav(false);
    }, 1200);

    setTimeout(() => {
      closeNav();
      setLS(CONFIG.storage.seenIntro, "1");
      state.currentStep = inferRecommendedStep();
      saveStep();
      renderStep();
    }, 7600);
  } else {
    renderStep();
  }

  window.addEventListener("storage", () => {
    renderStep();
  });

  window.addEventListener("pageshow", () => {
    renderStep();
  });

  renderStep();
})();