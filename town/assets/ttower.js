(() => {
  'use strict';

  // =========================================================
  // CONFIG
  // =========================================================
  const CFG = {
    START_IMG_DAY:  'https://ul.h3z.jp/QJX6Wqrs.png',
    START_IMG_NIGHT:'https://ul.h3z.jp/Rbm88XCj.png',

    TAKO_IMGS: [
      'https://ul.h3z.jp/gDi9QPz6.png',
      'https://ul.h3z.jp/j17HHdHp.png',
      'https://ul.h3z.jp/2aMjMOS1.png',
      'https://ul.h3z.jp/rZUWtrIU.png',
      'https://ul.h3z.jp/0MMuzDin.png',
      'https://ul.h3z.jp/XBqIjQot.png',
      './assets/tako_07_cheese_mayo.png',
      './assets/tako_08_salt_mayo_pepper.png',
      './assets/tako_09_pizza.png',
      './assets/tako_10_donut.png',
    ],

    // physics
    GRAVITY: 1.1,

    // pacing
    DROP_COOLDOWN_MS: 220,
    NEXT_SPAWN_DELAY_MS: 420,

    // moving (pre-drop)
    MOVE_AMPLITUDE: 150,
    MOVE_SPEED: 2.0,

    // camera
    CAM_PAD_TOP: 180,
    CAM_PAD_BOTTOM: 240,
    CAMERA_LERP: 0.22, // 追随速度（大きいほど追う）

    // gameover
    FALL_LINE: 200,            // 床よりこれだけ下に落ちたらアウト判定
    FALLEN_COUNT_GAMEOVER: 1,  // 1個落ちたら終了（緊張感）

    // anti-rolling (NOT zero) ：横滑りだけ少し抑える
    X_DAMP: 0.86,              // 0.0に近いほど横止まり。0.86くらいが自然
    ANGULAR_DAMP: 0.98         // 回転は止めすぎない（1.0で減衰なし）
  };

  // =========================================================
  // DOM
  // =========================================================
  const wrap    = document.getElementById('ttWrap');
  const overlay = document.getElementById('ttOverlay');
  const startBtn= document.getElementById('ttStartImageBtn');
  const startImg= document.getElementById('ttStartImage');
  const toast   = document.getElementById('ttToast');

  const elHeight= document.getElementById('ttHeight');
  const elScore = document.getElementById('ttScore');
  const elBest  = document.getElementById('ttBest');

  // （メーターを付けるならHTMLにこれらのIDが必要）
  const elMeterFill   = document.getElementById('ttMeterFill');
  const elMeterKnob   = document.getElementById('ttMeterKnob');
  const elMeterLv     = document.getElementById('ttMeterLv');
  const elMeterFloors = document.getElementById('ttMeterFloors');
  const elMeterName   = document.getElementById('ttMeterName');

  function isNightNow(){
    const h = new Date().getHours();
    return (h >= 18 || h < 6);
  }
  if (startImg){
    startImg.src = isNightNow() ? CFG.START_IMG_NIGHT : CFG.START_IMG_DAY;
  }

  // =========================================================
  // Level names (1-100) ※短縮版：未定義なら表示だけスキップ
  // =========================================================
  const LEVEL_NAMES = (typeof window.LEVEL_NAMES_OVERRIDE !== 'undefined')
    ? window.LEVEL_NAMES_OVERRIDE
    : null;

  // =========================================================
  // State
  // =========================================================
  const S = {
    playing: false,
    gameOver: false,

    current: null,
    canDrop: false,
    lastDropAt: 0,

    // placed count (1個=1階)
    floors: 0,

    floorY: 0,
    worldWidth: 0,
    worldHeight: 0,
    spawnX: 0,
    spawnY: 0,

    height: 0,
    score: 0,
    best: Number(localStorage.getItem('takoyakiTowerBest') || 0),

    images: [],
    cameraY: null, // smoothing
  };
  if (elBest) elBest.textContent = String(S.best);

  // =========================================================
  // Matter.js
  // =========================================================
  const { Engine, Render, Runner, Bodies, Body, Composite, Events } = Matter;

  const engine = Engine.create();
  engine.gravity.y = CFG.GRAVITY;

  const render = Render.create({
    element: wrap,
    engine,
    options: {
      width: window.innerWidth,
      height: window.innerHeight,
      wireframes: false,
      background: 'transparent',
      pixelRatio: Math.min(2, window.devicePixelRatio || 1),
    }
  });

  render.canvas.style.imageRendering = 'pixelated';
  render.canvas.style.imageRendering = 'crisp-edges';
  render.canvas.style.touchAction = 'manipulation';

  const runner = Runner.create();

  // =========================================================
  // Utils
  // =========================================================
  const rand  = (min, max) => Math.random() * (max - min) + min;
  const randi = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function showToast(msg){
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 900);
  }

  function makeFallbackImage(){
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#FF69B4';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(10, 10, 44, 44);
    const img = new Image();
    img.src = c.toDataURL();
    return img;
  }

  async function loadImagesSafe(srcList){
    const fallback = makeFallbackImage();
    const out = [];
    for (const src of srcList){
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      try{
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
        out.push(img);
      }catch{
        out.push(fallback);
      }
    }
    return out;
  }

  // =========================================================
  // World setup
  // =========================================================
  function setupWorld(){
    Composite.clear(engine.world, false);
    Engine.clear(engine);
    engine.gravity.y = CFG.GRAVITY;

    S.worldWidth  = Math.max(360, window.innerWidth);
    S.worldHeight = Math.max(640, window.innerHeight);

    S.floorY = S.worldHeight - 110;

    const floor = Bodies.rectangle(
      S.worldWidth/2, S.floorY + 45,
      S.worldWidth + 600, 90,
      { isStatic:true, label:'floor', render:{visible:false} }
    );

    const wallL = Bodies.rectangle(-140, S.floorY - 9000, 300, 18000, { isStatic:true, render:{visible:false} });
    const wallR = Bodies.rectangle(S.worldWidth + 140, S.floorY - 9000, 300, 18000, { isStatic:true, render:{visible:false} });

    Composite.add(engine.world, [floor, wallL, wallR]);

    S.spawnX = S.worldWidth / 2;
    S.spawnY = S.floorY - (S.worldHeight * 0.60);

    S.height = 0;
    S.score = 0;
    S.floors = 0;

    S.current = null;
    S.canDrop = false;
    S.gameOver = false;

    S.cameraY = null;

    if (elHeight) elHeight.textContent = '0';
    if (elScore)  elScore.textContent  = '0';

    Render.lookAt(render, {
      min: { x: 0, y: S.floorY - S.worldHeight },
      max: { x: S.worldWidth, y: S.floorY }
    });
  }

  // =========================================================
  // Bodies (balance-friendly)
  // 重要：回転OK（倒れる） / 横だけ少し抑える
  // =========================================================
  function baseProps(){
    return {
      restitution: 0.0,
      friction: 0.9,
      frictionStatic: 0.95,
      density: 0.0022,
      frictionAir: 0.012,
      render: { visible:false },
      label: 'takoyaki'
    };
  }

  function makeBodyByIndex(idx, x, y){
    const p = baseProps();
    const s = rand(0.92, 1.08);
    let body;

    switch(idx){
      case 0: { const r = 30*s; body = Bodies.circle(x,y,r,p); body._spriteSize = 64; break; }
      case 1: { const w=40*s,h=78*s; body = Bodies.rectangle(x,y,w,h,{...p,chamfer:{radius:14*s}}); body._spriteSize = 66; break; }
      case 2: { const r = 28*s; body = Bodies.circle(x,y,r,p); body._spriteSize = 60; break; }
      case 3: { const w=74*s,h=40*s; body = Bodies.rectangle(x,y,w,h,{...p,chamfer:{radius:14*s}}); body._spriteSize = 66; break; }
      case 4: { const sides=7,r=32*s; body = Bodies.polygon(x,y,sides,r,p); Body.rotate(body, rand(-0.6,0.6)); body._spriteSize=66; break; }
      case 5: { // ネギ味噌：偏り複合（倒れやすい）
        const a = Bodies.circle(x,y,26*s,p);
        const b = Bodies.circle(x+12*s,y-10*s,18*s,p);
        body = Body.create({ parts:[a,b] });
        body.label='takoyaki'; body.render.visible=false;
        body.frictionAir = 0.012;
        body._spriteSize = 70;
        break;
      }
      case 6: { const r=34*s; body = Bodies.circle(x,y,r,{...p,density:0.0026}); body._spriteSize=72; break; }
      case 7: { const sides=5,r=32*s; body = Bodies.polygon(x,y,sides,r,p); Body.rotate(body, rand(-0.6,0.6)); body._spriteSize=66; break; }
      case 8: { // ピザ：上重心複合（難しい）
        const a = Bodies.rectangle(x,y,62*s,40*s,{...p,chamfer:{radius:12*s}});
        const b = Bodies.rectangle(x,y-18*s,44*s,24*s,{...p,chamfer:{radius:10*s},density:0.0025});
        body = Body.create({ parts:[a,b] });
        body.label='takoyaki'; body.render.visible=false;
        body.frictionAir = 0.012;
        body._spriteSize = 74;
        break;
      }
      case 9: { const r=30*s; body = Bodies.circle(x,y,r,p); body._spriteSize=66; break; }
      default:{ const r=30*s; body = Bodies.circle(x,y,r,p); body._spriteSize=64; }
    }

    body.spriteIndex = idx;

    // 落下前移動
    body._moving = true;
    body._spawnTime = performance.now();

    return body;
  }

  function spawnTakoyaki(){
    const idx = randi(0, 9);
    const body = makeBodyByIndex(idx, S.spawnX, S.spawnY);

    Body.setVelocity(body, { x: 0, y: 0 });
    Composite.add(engine.world, body);

    S.current = body;
    S.canDrop = true;
  }

  function updateMovingCurrent(){
    if (!S.playing || S.gameOver) return;
    const b = S.current;
    if (!b || !S.canDrop || !b._moving) return;

    const t = (performance.now() - (b._spawnTime || 0)) / 1000;
    const x = S.spawnX + Math.sin(t * CFG.MOVE_SPEED) * CFG.MOVE_AMPLITUDE;
    const y = S.spawnY;

    // 落下前は「位置を強制」して左右移動
    Body.setPosition(b, { x, y });
    Body.setVelocity(b, { x: 0, y: 0 });
  }

  function dropCurrent(){
    if (!S.playing || S.gameOver) return;
    if (!S.current || !S.canDrop) return;

    const now = Date.now();
    if (now - S.lastDropAt < CFG.DROP_COOLDOWN_MS) return;
    S.lastDropAt = now;

    const b = S.current;
    b._moving = false;

    // 落下開始（真下）
    Body.setVelocity(b, { x: 0, y: 0.8 });

    // 階数（1個=1階）
    S.floors += 1;

    S.canDrop = false;
    S.current = null;

    setTimeout(() => {
      if (!S.playing || S.gameOver) return;
      spawnTakoyaki();
    }, CFG.NEXT_SPAWN_DELAY_MS);
  }

  // 横転がりを少し抑える（完全停止しない＝ゲーム性残す）
  function dampAllTakoyaki(){
    const bodies = Composite.allBodies(engine.world).filter(b => !b.isStatic && b.label === 'takoyaki');
    for (const b of bodies){
      // 落下前の移動中は触らない
      if (b._moving) continue;

      // 横だけ減衰
      if (Math.abs(b.velocity.x) > 0.0001){
        Body.setVelocity(b, { x: b.velocity.x * CFG.X_DAMP, y: b.velocity.y });
      }
      // 回転も少しだけ減衰（止めない）
      if (Math.abs(b.angularVelocity) > 0.0001){
        Body.setAngularVelocity(b, b.angularVelocity * CFG.ANGULAR_DAMP);
      }
    }
  }

  // =========================================================
  // Draw (images)
  // =========================================================
  Events.on(render, 'afterRender', () => {
    const ctx = render.context;
    ctx.imageSmoothingEnabled = false;

    // floor
    ctx.save();
    ctx.translate(0, S.floorY);
    ctx.fillStyle = '#9370DB';
    ctx.fillRect(0, 0, S.worldWidth, 130);
    ctx.fillStyle = '#BA9CE8';
    for(let i=0; i<S.worldWidth; i+=40){
      ctx.beginPath();
      ctx.arc(i, 0, 20, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();

    const bodies = Composite.allBodies(engine.world);
    for (const b of bodies){
      if (b.isStatic) continue;
      if (b.label !== 'takoyaki') continue;

      const img = S.images[b.spriteIndex ?? 0];
      if (!img) continue;

      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);

      // ★見た目は常に正方形（四角伸び事故を防ぐ）
      const size = b._spriteSize ?? 64;
      ctx.drawImage(img, -size/2, -size/2, size, size);

      ctx.restore();
    }
  });

  // =========================================================
  // HUD / Camera / GameOver + Meter
  // =========================================================
  function updateHUDAndCamera(){
    if (!S.playing) return;

    const bodies = Composite.allBodies(engine.world).filter(b => !b.isStatic && b.label === 'takoyaki');
    let topY = S.floorY;

    for (const b of bodies){
      const y = b.bounds.min.y;
      if (y < topY) topY = y;
    }

    // score
    S.height = Math.max(0, Math.floor((S.floorY - topY) / 10));
    S.score  = S.height + (bodies.length * 10);

    if (elHeight) elHeight.textContent = String(S.height);
    if (elScore)  elScore.textContent  = String(S.score);

    // camera follow
    const viewH = render.options.height;
    const bottom = S.floorY + CFG.CAM_PAD_BOTTOM;
    const targetTop = Math.min(topY - CFG.CAM_PAD_TOP, bottom - viewH);

    if (S.cameraY === null) S.cameraY = render.bounds.min.y;
    S.cameraY = S.cameraY + (targetTop - S.cameraY) * CFG.CAMERA_LERP;

    Render.lookAt(render, {
      min: { x: 0, y: S.cameraY },
      max: { x: S.worldWidth, y: S.cameraY + viewH }
    });

    // meter (optional)
    const floors = Math.max(1, S.floors);
    const lv = Math.min(100, floors);

    if (elMeterFloors) elMeterFloors.textContent = String(floors);
    if (elMeterLv) elMeterLv.textContent = `Lv ${lv}`;
    if (elMeterName){
      if (LEVEL_NAMES && LEVEL_NAMES[lv - 1]) elMeterName.textContent = LEVEL_NAMES[lv - 1];
      else elMeterName.textContent = '高さメーター（Lv）';
    }
    const pct = (lv / 100) * 100;
    if (elMeterFill) elMeterFill.style.height = `${pct}%`;
    if (elMeterKnob) elMeterKnob.style.bottom = `${pct}%`;
  }

  function endGame(msg){
    S.gameOver = true;
    S.playing = false;

    if (S.height > S.best){
      S.best = S.height;
      localStorage.setItem('takoyakiTowerBest', String(S.best));
      if (elBest) elBest.textContent = String(S.best);
    }

    showToast(msg);
    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
  }

  function checkGameOver(){
    if (!S.playing || S.gameOver) return;

    const bodies = Composite.allBodies(engine.world).filter(b => !b.isStatic && b.label === 'takoyaki');
    const fallen = bodies.filter(b => b.position.y > S.floorY + CFG.FALL_LINE).length;

    if (fallen >= CFG.FALLEN_COUNT_GAMEOVER){
      endGame('崩れちゃった…');
    }
  }

  // =========================================================
  // Start / Input
  // =========================================================
  function startGame(){
    if (S.playing) return;

    if (S.gameOver){
      setupWorld();
      S.gameOver = false;
    }

    S.playing = true;
    overlay.style.display = 'none';
    overlay.setAttribute('aria-hidden', 'true');
    S.lastDropAt = Date.now();

    showToast('スタート！');

    if (!S.current) spawnTakoyaki();
  }

  function bindInputs(){
    startBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      startGame();
    }, { passive:false });

    startBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      startGame();
    }, { passive:false });

    document.addEventListener('pointerdown', (e) => {
      if (!S.playing || S.gameOver) return;
      if (e.target.closest('#ttStartImageBtn')) return;
      dropCurrent();
    }, { passive:true });
  }

  // =========================================================
  // Main loop
  // =========================================================
  Events.on(engine, 'afterUpdate', () => {
    if (!S.playing) return;

    updateMovingCurrent();   // 上で左右移動
    dampAllTakoyaki();       // 横転がり抑制（止めすぎない）
    updateHUDAndCamera();    // 追随＆メーター
    checkGameOver();         // 崩れたら終了
  });

  // =========================================================
  // Boot
  // =========================================================
  async function boot(){
    setupWorld();
    bindInputs();

    S.images = await loadImagesSafe(CFG.TAKO_IMGS);

    Render.run(render);
    Runner.run(runner, engine);

    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }

  // =========================================================
  // Resize
  // =========================================================
  window.addEventListener('resize', () => {
    render.options.width = window.innerWidth;
    render.options.height = window.innerHeight;
    Render.setSize(render, window.innerWidth, window.innerHeight);
    Render.setPixelRatio(render, Math.min(2, window.devicePixelRatio || 1));

    setupWorld();
    S.playing = false;
    S.gameOver = false;

    overlay.style.display = 'flex';
    overlay.setAttribute('aria-hidden', 'false');
  });

})();

