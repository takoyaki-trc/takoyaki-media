(() => {
  // ===== 読み込み確認バッジ =====
  (function(){
    const id = "ttDbgBadge";
    if (document.getElementById(id)) return;
    const b = document.createElement("div");
    b.id = id;
    b.textContent = "ttower2.js LOADED ✅";
    b.style.position = "fixed";
    b.style.left = "10px";
    b.style.bottom = "10px";
    b.style.zIndex = "999999";
    b.style.background = "#000";
    b.style.color = "#fff";
    b.style.border = "2px solid #fff";
    b.style.padding = "6px 8px";
    b.style.fontSize = "12px";
    document.body.appendChild(b);
  })();

  // ===== Matter.js存在チェック =====
  if (!window.Matter){
    alert("Matter.js が読み込まれていません（matter.min.jsが先に読み込まれてるか確認）");
    return;
  }

  const { Engine, Render, Runner, World, Bodies, Body, Events, Composite } = Matter;

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

  if (!gameEl || !wrapEl){
    alert("DOMが見つかりません：#ttGame / #ttWrap がHTMLにあるか確認してください");
    return;
  }

  // ===== localStorage =====
  const LS_KEY = "takoyakiTowerBest";
  const getBest = () => Number(localStorage.getItem(LS_KEY) || "0");
  const setBest = (v) => localStorage.setItem(LS_KEY, String(v));

  // ===== Tunables =====
  const CONF = {
    bg: "#0b0f14",
    gravityY: 1,
    gravityScale: 0.00115,

    floorH: 70,
    wallW: 40,

    rMin: 22,
    rMax: 26,
    friction: 0.85,
    frictionStatic: 0.95,
    restitution: 0.02,
    air: 0.04,

    spawnYPad: 170,
    spawnClampPad: 60,

    windBase: 0.000006,
    windPerScore: 0.000000009,
    windHeightFactor: 0.0000012,
    windSinSpeed: 0.035,
    windNoise: 0.35,

    deadLinePad: 140,
    maxBodies: 140,
    cleanBelowPad: 900,

    camLerp: 0.10,
    camTopMargin: 220,
  };

  // ===== State =====
  let engine, render, runner;
  let W = 0, H = 0;
  let baseX = 0, groundY = 0;

  let previewBody = null;
  let previewX = 0;

  let score = 0;
  let best = getBest();
  let windValue = 0;
  let gameOver = false;

  let camY = 0;
  let highestY = 0;

  let dragging = false;
  let dragStartX = 0;
  let dragStartPreviewX = 0;
  let keyLeft = false, keyRight = false;

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function setHint(text){
    if (elHint) elHint.textContent = text;
  }

  function updateHUD(){
    if (elScore) elScore.textContent = String(score);
    if (elBest)  elBest.textContent  = String(best);
    if (elWind)  elWind.textContent  = String(Math.round(windValue * 1000));
  }

  function openGameOver(){
    if (overScoreEl) overScoreEl.textContent = String(score);
    if (overBestEl)  overBestEl.textContent  = String(best);
    if (overEl){
      overEl.classList.add("is-open");
      overEl.setAttribute("aria-hidden", "false");
    }
  }

  function closeGameOver(){
    if (!overEl) return;
    overEl.classList.remove("is-open");
    overEl.setAttribute("aria-hidden", "true");
  }

  function shakeScreen(){
    wrapEl.classList.remove("tt-shake");
    void wrapEl.offsetWidth;
    wrapEl.classList.add("tt-shake");
  }

  function destroyWorld(){
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

  function makeTakoyaki(x, y, r, isPreview){
    const body = Bodies.circle(x, y, r, {
      isStatic: !!isPreview,
      friction: CONF.friction,
      frictionStatic: CONF.frictionStatic,
      restitution: CONF.restitution,
      frictionAir: CONF.air,
      density: 0.0045,
      render: { fillStyle: "#b36a2a", strokeStyle: "#1a0f08", lineWidth: 2 }
    });

    // ✅ 回転ロック＝転がらない（ぷよぷよ風）
    Body.setInertia(body, Infinity);
    body.label = isPreview ? "TAKO_PREVIEW" : "TAKO";
    return body;
  }

  function spawnPreview(){
    const r = Math.round(CONF.rMin + Math.random() * (CONF.rMax - CONF.rMin));
    const top = render.bounds.min.y;
    const y = top + CONF.spawnYPad;

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

    Body.setStatic(previewBody, false);
    Body.applyForce(previewBody, previewBody.position, { x: 0, y: 0.0008 });

    score += 10;
    best = Math.max(best, score);
    setBest(best);
    updateHUD();

    previewBody = null;
    spawnPreview();
  }

  function computeWind(){
    const base = CONF.windBase + score * CONF.windPerScore;
    const t = engine.timing.timestamp || 0;
    const s = Math.sin(t * CONF.windSinSpeed);
    const n = (Math.random() * 2 - 1) * CONF.windNoise;
    windValue = (s + n * 0.25) * base;
  }

  function applyWind(){
    computeWind();
    const bodies = Composite.allBodies(engine.world);
    for (const b of bodies){
      if (b.isStatic) continue;
      if (b.label !== "TAKO") continue;

      const heightFromGround = (groundY - b.position.y);
      const hFactor = Math.max(0, heightFromGround) * CONF.windHeightFactor;
      const fx = windValue * (1 + hFactor);
      Body.applyForce(b, b.position, { x: fx, y: 0 });
    }
  }

  function updateHighest(){
    highestY = groundY;
    const bodies = Composite.allBodies(engine.world);
    for (const b of bodies){
      if (b.label !== "TAKO") continue;
      const topY = b.position.y - (b.circleRadius || 0);
      if (topY < highestY) highestY = topY;
    }
  }

  function updateCamera(){
    const targetCamY = Math.min(0, highestY - CONF.camTopMargin);
    camY = camY + (targetCamY - camY) * CONF.camLerp;

    render.bounds.min.y = camY;
    render.bounds.max.y = camY + H;
    render.bounds.min.x = 0;
    render.bounds.max.x = W;
  }

  function cleanupBodies(){
    const bodies = Composite.allBodies(engine.world);
    const yBottom = render.bounds.max.y;

    let takos = 0;
    for (const b of bodies) if (b.label === "TAKO") takos++;
    if (takos <= CONF.maxBodies) return;

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

  function onBeforeUpdate(){
    if (gameOver) return;

    applyWind();

    if (previewBody){
      const y = render.bounds.min.y + CONF.spawnYPad;
      Body.setPosition(previewBody, { x: previewBody.position.x, y });
      Body.setInertia(previewBody, Infinity);
    }

    // ✅ 回転完全禁止（保険）
    const bodies = Composite.allBodies(engine.world);
    for (const b of bodies){
      if (b.label === "TAKO" || b.label === "TAKO_PREVIEW"){
        Body.setInertia(b, Infinity);
        if (Math.abs(b.angularVelocity) > 0.0001){
          Body.setAngularVelocity(b, 0);
        }
      }
    }

    if (previewBody && !dragging){
      const speed = 8;
      if (keyLeft)  movePreviewTo(previewBody.position.x - speed);
      if (keyRight) movePreviewTo(previewBody.position.x + speed);
    }
  }

  function onAfterUpdate(){
    updateHighest();
    updateCamera();
    cleanupBodies();
    checkGameOver();
    updateHUD();
  }

  function getClientX(e){
    if (e.touches && e.touches[0]) return e.touches[0].clientX;
    if (e.changedTouches && e.changedTouches[0]) return e.changedTouches[0].clientX;
    return e.clientX;
  }

  function bindInputs(){
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
    const onUp = () => { dragging = false; };

    gameEl.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });

    btnLeft?.addEventListener("click", () => previewBody && !gameOver && movePreviewTo(previewBody.position.x - 18));
    btnRight?.addEventListener("click", () => previewBody && !gameOver && movePreviewTo(previewBody.position.x + 18));
    btnDrop?.addEventListener("click", () => !gameOver && dropPreview());
    btnRestart?.addEventListener("click", () => initWorld());
    btnAgain?.addEventListener("click", () => initWorld());

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

    window.addEventListener("resize", () => initWorld());
  }

  function initWorld(){
    destroyWorld();
    closeGameOver();
    gameOver = false;

    score = 0;
    windValue = 0;
    best = getBest();
    updateHUD();
    setHint("左右に動かして落とす（ドラッグ可）");

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

    render.bounds.min.x = 0;
    render.bounds.min.y = 0;
    render.bounds.max.x = W;
    render.bounds.max.y = H;

    camY = 0;
    highestY = groundY;

    const floor = Bodies.rectangle(
      baseX, groundY + CONF.floorH/2,
      W + 600, CONF.floorH,
      { isStatic: true, render: { fillStyle: "#111822" } }
    );

    const wallL = Bodies.rectangle(-CONF.wallW/2, H/2, CONF.wallW, H * 6, { isStatic: true, render: { visible: false } });
    const wallR = Bodies.rectangle(W + CONF.wallW/2, H/2, CONF.wallW, H * 6, { isStatic: true, render: { visible: false } });

    World.add(engine.world, [floor, wallL, wallR]);

    spawnPreview();

    Events.on(engine, "beforeUpdate", onBeforeUpdate);
    Events.on(engine, "afterUpdate", onAfterUpdate);

    Render.run(render);
    Runner.run(runner, engine);
  }

  bindInputs();
  initWorld();
})();

