/* =========================================================
  たこ焼きタワー（転がらない・ぷよぷよ風）
  - Matter.js
  - 左右ズレ蓄積でグラグラ → 最終崩壊
  - 回転ロック（inertia Infinity）
  - カメラ追従（Render.boundsを滑らかに）
========================================================= */

(() => {
  const {
    Engine, Render, Runner, World, Bodies, Body, Events, Composite
  } = Matter;

  // ===== DOM =====
  const gameEl = document.getElementById("ttGame");
  const wrapEl = document.getElementById("ttWrap");

  const elScore = document.getElementById("ttScore");
  const elBest  = document.getElementById("ttBest");
  const elWind  = document.getElementById("ttWind");
  const elHint  = document.getElementById("ttHint");

  const btnLeft    = document.getElementById("ttLeft");
  const btnRight   = document.getElementById("ttRight");
  const btnDrop    = document.getElementById("ttDrop");
  const btnRestart = document.getElementById("ttRestart");

  const overEl = document.getElementById("ttOver");
  const overScoreEl = document.getElementById("ttOverScore");
  const overBestEl  = document.getElementById("ttOverBest");
  const btnAgain = document.getElementById("ttAgain");

  // ===== localStorage =====
  const LS_KEY = "takoyakiTowerBest";
  const getBest = () => Number(localStorage.getItem(LS_KEY) || "0");
  const setBest = (v) => localStorage.setItem(LS_KEY, String(v));

  // ===== Tunables =====
  const CONF = {
    bg: "#0b0f14",
    gravityY: 1,
    gravityScale: 0.00115,

    // tower space
    floorH: 70,
    wallW: 40,

    // takoyaki
    rMin: 22,
    rMax: 26,
    friction: 0.85,
    frictionStatic: 0.95,
    restitution: 0.02,
    air: 0.04,

    // spawn
    spawnYPad: 170,   // drop line from top bound
    spawnClampPad: 60,

    // wobble wind
    windBase: 0.000006,     // base sideways force scale
    windPerScore: 0.000000009, // increase with score
    windHeightFactor: 0.0000012, // increase with y-height
    windSinSpeed: 0.035,     // sin wave speed
    windNoise: 0.35,         // randomize amount

    // stability / game over
    deadLinePad: 140,        // below bottom bound -> game over
    maxBodies: 140,          // limit
    cleanBelowPad: 900,      // remove bodies far below camera

    // camera
    camLerp: 0.10,
    camTopMargin: 220,
    camBottomMargin: 140,
  };

  // ===== State =====
  let engine, render, runner;
  let W = 0, H = 0;
  let baseX = 0, groundY = 0;

  let floor, wallL, wallR;
  let isRunning = false;

  let previewBody = null;   // static until drop
  let previewX = 0;

  let score = 0;
  let best = getBest();
  elBest.textContent = String(best);

  let windValue = 0;
  let gameOver = false;

  // camera target
  let camY = 0; // bounds.min.y
  let highestY = 0;

  // input
  let dragging = false;
  let dragStartX = 0;
  let dragStartPreviewX = 0;
  let keyLeft = false, keyRight = false;

  // ===== Helpers =====
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function setHint(text){
    if (!elHint) return;
    elHint.textContent = text;
  }

  function updateHUD(){
    elScore.textContent = String(score);
    elBest.textContent  = String(best);
    elWind.textContent  = String(Math.round(windValue * 1000)); // feel-only number
  }

  function openGameOver(){
    overScoreEl.textContent = String(score);
    overBestEl.textContent  = String(best);
    overEl.classList.add("is-open");
    overEl.setAttribute("aria-hidden", "false");
  }

  function closeGameOver(){
    overEl.classList.remove("is-open");
    overEl.setAttribute("aria-hidden", "true");
  }

  function shakeScreen(){
    wrapEl.classList.remove("tt-shake");
    // reflow
    void wrapEl.offsetWidth;
    wrapEl.classList.add("tt-shake");
  }

  // ===== World lifecycle =====
  function destroyWorld(){
    isRunning = false;
    if (render){
      Render.stop(render);
      if (render.canvas && render.canvas.parentNode){
        render.canvas.parentNode.removeChild(render.canvas);
      }
    }
    if (runner) Runner.stop(runner);
    engine = render = runner = null;
    previewBody = null;
  }

  function initWorld(){
    destroyWorld();

    closeGameOver();
    gameOver = false;

    // reset score
    score = 0;
    windValue = 0;
    updateHUD();
    setHint("左右に動かして落とす（ドラッグ可）");

    // size
    W = window.innerWidth;
    H = window.innerHeight;

    baseX = W / 2;
    groundY = H - CONF.floorH;

    engine = Engine.create();
    engine.gravity.y = CONF.gravityY;
    engine.gravity.scale = CONF.gravityScale;

    render = Render.create({
      element: gameEl,
      engine,
      options: {
        width: W,
        height: H,
        hasBounds: true,
        wireframes: false,
        background: CONF.bg,
        pixelRatio: window.devicePixelRatio || 1
      }
    });

    runner = Runner.create();

    // bounds start: show base
    render.bounds.min.x = 0;
    render.bounds.min.y = 0;
    render.bounds.max.x = W;
    render.bounds.max.y = H;

    camY = 0;
    highestY = groundY;

    // floor & walls
    floor = Bodies.rectangle(
      baseX, groundY + CONF.floorH/2,
      W + 600, CONF.floorH,
      { isStatic: true, render: { fillStyle: "#111822" } }
    );

    wallL = Bodies.rectangle(
      -CONF.wallW/2, H/2, CONF.wallW, H * 6,
      { isStatic: true, render: { visible: false } }
    );
    wallR = Bodies.rectangle(
      W + CONF.wallW/2, H/2, CONF.wallW, H * 6,
      { isStatic: true, render: { visible: false } }
    );

    World.add(engine.world, [floor, wallL, wallR]);

    // spawn first preview
    spawnPreview();

    // events
    Events.on(engine, "beforeUpdate", onBeforeUpdate);
    Events.on(engine, "afterUpdate", onAfterUpdate);

    Render.run(render);
    Runner.run(runner, engine);

    isRunning = true;
  }

  // ===== Takoyaki creation =====
  function makeTakoyaki(x, y, r, isPreview){
    // circle + NO ROTATION = "puyo-ish"
    const body = Bodies.circle(x, y, r, {
      isStatic: !!isPreview,
      friction: CONF.friction,
      frictionStatic: CONF.frictionStatic,
      restitution: CONF.restitution,
      frictionAir: CONF.air,
      density: 0.0045,
      render: {
        fillStyle: "#b36a2a",
        strokeStyle: "#1a0f08",
        lineWidth: 2
      }
    });

    // rotation lock (very important)
    Body.setInertia(body, Infinity);

    // slight "squish" feel (visual only) via render properties not supported well,
    // so we keep it simple. You can later swap to sprite images if you want.

    // tag
    body.label = isPreview ? "TAKO_PREVIEW" : "TAKO";
    body.plugin = body.plugin || {};
    body.plugin.noRotate = true;

    return body;
  }

  function spawnPreview(){
    if (!engine) return;

    // radius slight variation
    const r = Math.round(CONF.rMin + Math.random() * (CONF.rMax - CONF.rMin));

    // spawn y: a bit below top of camera
    const top = render.bounds.min.y;
    const y = top + CONF.spawnYPad;

    // x default center
    const xMin = CONF.spawnClampPad;
    const xMax = W - CONF.spawnClampPad;

    previewX = clamp(baseX, xMin, xMax);

    previewBody = makeTakoyaki(previewX, y, r, true);
    World.add(engine.world, previewBody);
  }

  function movePreviewTo(x){
    if (!previewBody || gameOver) return;

    const xMin = CONF.spawnClampPad;
    const xMax = W - CONF.spawnClampPad;

    previewX = clamp(x, xMin, xMax);
    Body.setPosition(previewBody, { x: previewX, y: previewBody.position.y });
  }

  function dropPreview(){
    if (!previewBody || gameOver) return;

    // convert to dynamic
    Body.setStatic(previewBody, false);

    // small downward nudge so it "commits"
    Body.applyForce(previewBody, previewBody.position, { x: 0, y: 0.0008 });

    // score: +10 per placed
    score += 10;
    best = Math.max(best, score);
    setBest(best);
    updateHUD();

    previewBody = null;
    spawnPreview();
  }

  // ===== Wind / wobble =====
  function computeWind(){
    // wind increases with score
    const base = CONF.windBase + score * CONF.windPerScore;

    // sinus wave + noise
    const t = engine.timing.timestamp || 0;
    const s = Math.sin(t * CONF.windSinSpeed);
    const n = (Math.random() * 2 - 1) * CONF.windNoise;

    // keep small
    windValue = (s + n * 0.25) * base;
  }

  function applyWind(){
    if (!engine || gameOver) return;
    computeWind();

    const bodies = Composite.allBodies(engine.world);

    for (const b of bodies){
      if (b.isStatic) continue;
      if (b.label !== "TAKO") continue;

      // higher up => more effect
      const heightFromGround = (groundY - b.position.y);
      const hFactor = Math.max(0, heightFromGround) * CONF.windHeightFactor;

      const fx = windValue * (1 + hFactor);

      // apply horizontal force
      Body.applyForce(b, b.position, { x: fx, y: 0 });
    }
  }

  // ===== Camera =====
  function updateHighest(){
    if (!engine) return;

    highestY = groundY;
    const bodies = Composite.allBodies(engine.world);
    for (const b of bodies){
      if (b.label !== "TAKO") continue;
      // top of circle = y - r
      const topY = b.position.y - (b.circleRadius || 0);
      if (topY < highestY) highestY = topY;
    }
  }

  function updateCamera(){
    if (!render) return;

    // Want to keep highest area visible near top
    // target camY so that highestY sits at (camY + camTopMargin)
    const targetCamY = Math.min(
      0,
      highestY - CONF.camTopMargin
    );

    camY = camY + (targetCamY - camY) * CONF.camLerp;

    // Bounds
    render.bounds.min.y = camY;
    render.bounds.max.y = camY + H;

    // lock x to screen width
    render.bounds.min.x = 0;
    render.bounds.max.x = W;
  }

  // ===== Cleanup & game over checks =====
  function cleanupBodies(){
    const bodies = Composite.allBodies(engine.world);
    const yBottom = render.bounds.max.y;

    // remove far-below takos if too many
    let takos = 0;
    for (const b of bodies){
      if (b.label === "TAKO") takos++;
    }
    if (takos <= CONF.maxBodies) return;

    // remove older / low ones
    for (const b of bodies){
      if (b.label !== "TAKO") continue;
      if (b.position.y > yBottom + CONF.cleanBelowPad){
        World.remove(engine.world, b);
      }
    }
  }

  function checkGameOver(){
    if (gameOver) return;

    const yBottom = render.bounds.max.y;
    const deadY = yBottom + CONF.deadLinePad;

    const bodies = Composite.allBodies(engine.world);
    for (const b of bodies){
      if (b.label !== "TAKO") continue;
      if (b.position.y > deadY){
        endGame();
        return;
      }
    }
  }

  function endGame(){
    gameOver = true;
    setHint("ゲームオーバー！");
    updateHUD();
    shakeScreen();
    openGameOver();
  }

  // ===== Engine hooks =====
  function onBeforeUpdate(){
    if (!engine || gameOver) return;

    // apply wind each tick
    applyWind();

    // keep preview aligned with camera top (so it doesn't drift off-screen)
    if (previewBody){
      const y = render.bounds.min.y + CONF.spawnYPad;
      Body.setPosition(previewBody, { x: previewBody.position.x, y });
      // also keep no-rotation
      Body.setInertia(previewBody, Infinity);
    }

    // keep no-rotation for all takos (safety)
    const bodies = Composite.allBodies(engine.world);
    for (const b of bodies){
      if (b.label === "TAKO" || b.label === "TAKO_PREVIEW"){
        Body.setInertia(b, Infinity);
        // kill angular velocity if any
        if (Math.abs(b.angularVelocity) > 0.0001){
          Body.setAngularVelocity(b, 0);
        }
      }
    }

    // keyboard continuous move
    if (previewBody && !dragging){
      const speed = 8;
      if (keyLeft)  movePreviewTo(previewBody.position.x - speed);
      if (keyRight) movePreviewTo(previewBody.position.x + speed);
    }
  }

  function onAfterUpdate(){
    if (!engine) return;

    updateHighest();
    updateCamera();
    cleanupBodies();
    checkGameOver();
    updateHUD();
  }

  // ===== Input =====
  function getClientX(e){
    if (e.touches && e.touches[0]) return e.touches[0].clientX;
    if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0].clientX;
    return e.clientX;
  }

  function bindInputs(){
    // Drag anywhere in game area to move preview
    const onDown = (e) => {
      if (!previewBody || gameOver) return;
      dragging = true;
      dragStartX = getClientX(e);
      dragStartPreviewX = previewBody.position.x;
    };

    const onMove = (e) => {
      if (!dragging || !previewBody || gameOver) return;
      const x = getClientX(e);
      const dx = x - dragStartX;
      movePreviewTo(dragStartPreviewX + dx);
    };

    const onUp = () => {
      dragging = false;
    };

    gameEl.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });

    // Touch fallback
    gameEl.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp, { passive: true });

    // Buttons
    const step = 18;
    btnLeft.addEventListener("click", () => {
      if (!previewBody || gameOver) return;
      movePreviewTo(previewBody.position.x - step);
    });
    btnRight.addEventListener("click", () => {
      if (!previewBody || gameOver) return;
      movePreviewTo(previewBody.position.x + step);
    });
    btnDrop.addEventListener("click", () => {
      if (gameOver) return;
      dropPreview();
    });
    btnRestart.addEventListener("click", () => initWorld());
    btnAgain.addEventListener("click", () => initWorld());

    // Keyboard
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") keyLeft = true;
      if (e.key === "ArrowRight") keyRight = true;
      if (e.key === " " || e.key === "Enter"){
        if (!gameOver) dropPreview();
      }
    });
    window.addEventListener("keyup", (e) => {
      if (e.key === "ArrowLeft") keyLeft = false;
      if (e.key === "ArrowRight") keyRight = false;
    });

    // Resize
    window.addEventListener("resize", () => {
      // re-init to keep everything aligned (simple & stable)
      initWorld();
    });
  }

  // ===== Boot =====
  bindInputs();
  initWorld();

})();
