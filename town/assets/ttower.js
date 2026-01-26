(() => {
  'use strict';

  // =========================================================
  // CONFIG
  // =========================================================
  const CFG = {
    // スタート画像（townのタワー）
    START_IMG_DAY:  'https://ul.h3z.jp/QJX6Wqrs.png',
    START_IMG_NIGHT:'https://ul.h3z.jp/Rbm88XCj.png',

    // 定番10種（ここはあなたのURL/ローカル混在でOK）
    TAKO_IMGS: [
      'https://ul.h3z.jp/gDi9QPz6.png', // ソース
      'https://ul.h3z.jp/j17HHdHp.png', // 辛口（夜画像を流用してもOK）
      'https://ul.h3z.jp/2aMjMOS1.png', // 素焼き
      'https://ul.h3z.jp/rZUWtrIU.png', // 明太マヨ
      'https://ul.h3z.jp/0MMuzDin.png', // ぶっかけ揚げ玉からしマヨ
      'https://ul.h3z.jp/XBqIjQot.png', // ネギ味噌
      './assets/tako_07_cheese_mayo.png',         // チーズソースマヨ
      './assets/tako_08_salt_mayo_pepper.png',    // 塩マヨ黒胡椒
      './assets/tako_09_pizza.png',               // ピザ風
      './assets/tako_10_donut.png',               // ドーナツ風
    ],

    // 物理
    GRAVITY: 1.15,

    // 落下テンポ
    DROP_COOLDOWN_MS: 220,
    NEXT_SPAWN_DELAY_MS: 380,

    // 上で左右に動く（ここが今回の肝）
    MOVE_AMPLITUDE: 140, // 左右の振れ幅(px)
    MOVE_SPEED: 2.2,     // 左右移動の速さ（大きいほど速い）

    // カメラ
    CAM_PAD_TOP: 150,
    CAM_PAD_BOTTOM: 260,

    // ゲームオーバー（落下判定）
    FALL_LINE: 260,
    FALLEN_COUNT_GAMEOVER: 2,

    // 横転がり禁止の強さ（強いほど「絶対動かない」）
    LOCK_X_STRENGTH: 1.0, // 1.0=完全固定（推奨）
  };

  // =========================================================
  // DOM
  // =========================================================
  const wrap = document.getElementById('ttWrap');
  const overlay = document.getElementById('ttOverlay');
  const startBtn = document.getElementById('ttStartImageBtn');
  const startImg = document.getElementById('ttStartImage');
  const toast = document.getElementById('ttToast');

  const elHeight = document.getElementById('ttHeight');
  const elScore  = document.getElementById('ttScore');
  const elBest   = document.getElementById('ttBest');

  // 昼夜判定（town側のis-nightがあればそれ優先でもOK）
  function isNightNow(){
    const h = new Date().getHours();
    return (h >= 18 || h < 6);
  }
  if (startImg){
    startImg.src = isNightNow() ? CFG.START_IMG_NIGHT : CFG.START_IMG_DAY;
  }

  // =========================================================
  // State
  // =========================================================
  const S = {
    playing: false,
    gameOver: false,

    // 現在の「動いている1個」
    current: null,
    canDrop: false,
    lastDropAt: 0,

    // 落としたもの（X固定の対象）
    locked: [],

    // world
    floorY: 0,
    worldWidth: 0,
    worldHeight: 0,
    spawnX: 0,
    spawnY: 0,

    // score
    height: 0,
    score: 0,
    best: Number(localStorage.getItem('takoyakiTowerBest') || 0),

    // images
    images: [],
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

  // ドットをくっきり
  render.canvas.style.imageRendering = 'pixelated';
  render.canvas.style.imageRendering = 'crisp-edges';
  render.canvas.style.touchAction = 'manipulation';

  const runner = Runner.create();

  // =========================================================
  // Utils
  // =========================================================
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randi = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function showToast(msg){
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 900);
  }

  function makeFallbackImage(){
    // 読めない画像があってもゲームが止まらないようにするダミー
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#FF69B4';
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(8, 8, 48, 48);
    ctx.fillStyle = '#4ECDC4';
    ctx.fillRect(16, 16, 32, 32);
    const img = new Image();
    img.src = c.toDataURL();
    return img;
  }

  async function loadImagesSafe(srcList){
    const fallback = makeFallbackImage();
    const results = [];
    for (const src of srcList){
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;

      try{
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        results.push(img);
      }catch{
        // 失敗しても止めない
        results.push(fallback);
      }
    }
    return results;
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
      S.worldWidth / 2,
      S.floorY + 45,
      S.worldWidth + 600,
      90,
      { isStatic: true, label: 'floor', render:{ visible:false } }
    );

    const wallL = Bodies.rectangle(-140, S.floorY - 9000, 300, 18000, {
      isStatic: true, render:{ visible:false }
    });
    const wallR = Bodies.rectangle(S.worldWidth + 140, S.floorY - 9000, 300, 18000, {
      isStatic: true, render:{ visible:false }
    });

    Composite.add(engine.world, [floor, wallL, wallR]);

    S.spawnX = S.worldWidth / 2;
    S.spawnY = S.floorY - (S.worldHeight * 0.60);

    S.height = 0;
    S.score = 0;

    S.current = null;
    S.canDrop = false;
    S.locked = [];
    S.gameOver = false;

    if (elHeight) elHeight.textContent = '0';
    if (elScore)  elScore.textContent = '0';

    Render.lookAt(render, {
      min: { x: 0, y: S.floorY - S.worldHeight },
      max: { x: S.worldWidth, y: S.floorY }
    });
  }

  // =========================================================
  // Bodies (当たり判定の形だけ変える)
  // 見た目は画像。転がりを止めるために回転を抑える設定を入れる。
  // =========================================================
  function baseProps(){
    return {
      restitution: 0.0,
      friction: 1.0,
      frictionStatic: 1.0,
      density: 0.0022,
      frictionAir: 0.03,
      render: { visible: false },
      label: 'takoyaki'
    };
  }

  function lockNoRoll(body){
    // 回転しない（転がりの根本を消す）
    Body.setInertia(body, Infinity);
    Body.setAngularVelocity(body, 0);
    Body.setAngle(body, 0);
  }

  function makeBodyByIndex(idx, x, y){
    const p = baseProps();
    const s = rand(0.92, 1.08);
    let body;

    // 10種：当たり判定の形を適当に散らす（バランスゲーム用）
    switch(idx){
      case 0: { // ソース：丸
        const r = 30*s;
        body = Bodies.circle(x, y, r, p);
        body._drawW = r*2; body._drawH = r*2;
        break;
      }
      case 1: { // 辛口：縦長（難しめ）
        const w = 42*s, h = 78*s;
        body = Bodies.rectangle(x, y, w, h, { ...p, chamfer:{ radius: 16*s } });
        body._drawW = w; body._drawH = h;
        break;
      }
      case 2: { // 素焼き：小さめ丸（安定）
        const r = 28*s;
        body = Bodies.circle(x, y, r, p);
        body._drawW = r*2; body._drawH = r*2;
        break;
      }
      case 3: { // 明太：横長
        const w = 74*s, h = 40*s;
        body = Bodies.rectangle(x, y, w, h, { ...p, chamfer:{ radius: 16*s } });
        body._drawW = w; body._drawH = h;
        break;
      }
      case 4: { // 揚げ玉：多角形
        const sides = 7, r = 32*s;
        body = Bodies.polygon(x, y, sides, r, p);
        body._drawW = r*2; body._drawH = r*2;
        break;
      }
      case 5: { // ネギ味噌：複合（片寄り）
        const a = Bodies.circle(x, y, 26*s, p);
        const b = Bodies.circle(x + 12*s, y - 10*s, 18*s, p);
        body = Body.create({ parts:[a,b] });
        body.label = 'takoyaki';
        body.render.visible = false;
        body.frictionAir = 0.03;
        body._drawW = 76*s; body._drawH = 66*s;
        break;
      }
      case 6: { // チーズ：大きめ丸
        const r = 34*s;
        body = Bodies.circle(x, y, r, { ...p, density: 0.0026 });
        body._drawW = r*2; body._drawH = r*2;
        break;
      }
      case 7: { // 塩マヨ胡椒：5角
        const sides = 5, r = 32*s;
        body = Bodies.polygon(x, y, sides, r, p);
        body._drawW = r*2; body._drawH = r*2;
        break;
      }
      case 8: { // ピザ：台形っぽい複合
        const a = Bodies.rectangle(x, y, 62*s, 40*s, { ...p, chamfer:{ radius: 14*s } });
        const b = Bodies.rectangle(x, y - 18*s, 44*s, 24*s, { ...p, chamfer:{ radius: 10*s }, density: 0.0025 });
        body = Body.create({ parts:[a,b] });
        body.label = 'takoyaki';
        body.render.visible = false;
        body.frictionAir = 0.03;
        body._drawW = 82*s; body._drawH = 78*s;
        break;
      }
      case 9: { // ドーナツ：丸（見た目は穴だが当たり判定は丸でOK）
        const r = 30*s;
        body = Bodies.circle(x, y, r, p);
        body._drawW = r*2; body._drawH = r*2;
        break;
      }
      default: {
        const r = 30*s;
        body = Bodies.circle(x, y, r, p);
        body._drawW = r*2; body._drawH = r*2;
      }
    }

    // 見た目
    body.spriteIndex = idx;

    // 転がり防止（回転しない）
    lockNoRoll(body);

    // 落下前の左右移動フラグ
    body._moving = true;
    body._spawnTime = performance.now();

    return body;
  }

  function spawnTakoyaki(){
    const idx = randi(0, 9);
    const body = makeBodyByIndex(idx, S.spawnX, S.spawnY);

    // 最初は「空中待機」なので速度ゼロ
    Body.setVelocity(body, { x: 0, y: 0 });
    Body.setAngularVelocity(body, 0);

    Composite.add(engine.world, body);

    S.current = body;
    S.canDrop = true;
  }

  // =========================================================
  // 左右移動（落下前の1個だけ）
  // =========================================================
  function updateMovingCurrent(){
    if (!S.playing || S.gameOver) return;
    const b = S.current;
    if (!b || !S.canDrop || !b._moving) return;

    const t = (performance.now() - (b._spawnTime || 0)) / 1000;
    const x = S.spawnX + Math.sin(t * CFG.MOVE_SPEED) * CFG.MOVE_AMPLITUDE;
    const y = S.spawnY;

    Body.setPosition(b, { x, y });
    Body.setVelocity(b, { x: 0, y: 0 });
    Body.setAngularVelocity(b, 0);
    Body.setAngle(b, 0);
  }

  // =========================================================
  // 落下（タップ）
  // =========================================================
  function dropCurrent(){
    if (!S.playing || S.gameOver) return;
    if (!S.current || !S.canDrop) return;

    const now = Date.now();
    if (now - S.lastDropAt < CFG.DROP_COOLDOWN_MS) return;
    S.lastDropAt = now;

    const b = S.current;

    // 左右移動停止
    b._moving = false;

    // 「落とした場所から動かない」ためのロック（X固定）
    b._lockX = b.position.x; // 落とした瞬間のXを固定
    b._locked = true;

    // 落下開始
    Body.setVelocity(b, { x: 0, y: 0.6 });

    // 次の準備
    S.canDrop = false;
    S.current = null;

    // ロック対象に追加
    S.locked.push(b);

    setTimeout(() => {
      if (!S.playing || S.gameOver) return;
      spawnTakoyaki();
      // canDrop は spawnTakoyaki 内で true
    }, CFG.NEXT_SPAWN_DELAY_MS);
  }

  // =========================================================
  // 落下後の「横移動禁止」最終ガード
  //  - 横速度0
  //  - X位置を固定（強制）
  //  - 回転ゼロ
  // =========================================================
  function enforceLocks(){
    if (!S.locked.length) return;

    // 軽量化：下に落ちすぎたやつは外す
    S.locked = S.locked.filter(b => b && b.position && b.position.y < S.floorY + 1800);

    for (const b of S.locked){
      if (!b._locked) continue;

      // 横速度ゼロ
      if (Math.abs(b.velocity.x) > 0.0001){
        Body.setVelocity(b, { x: 0, y: b.velocity.y });
      }

      // X固定（完全固定）
      if (CFG.LOCK_X_STRENGTH >= 1.0){
        if (b.position.x !== b._lockX){
          Body.setPosition(b, { x: b._lockX, y: b.position.y });
        }
      } else {
        // 少しだけ許す場合（今回は使わない）
        const dx = b._lockX - b.position.x;
        Body.setPosition(b, { x: b.position.x + dx * CFG.LOCK_X_STRENGTH, y: b.position.y });
      }

      // 回転ゼロ
      if (Math.abs(b.angularVelocity) > 0.0001){
        Body.setAngularVelocity(b, 0);
        Body.setAngle(b, 0);
      }
    }
  }

  // =========================================================
  // Draw（画像）
  // =========================================================
  Events.on(render, 'afterRender', () => {
    const ctx = render.context;
    ctx.imageSmoothingEnabled = false;

    // floor（見た目）
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

// ✅ 画像は常に正方形で描く（四角引き伸ばし事故を防ぐ）
const size = b._spriteSize ?? 64;  // ←好きな基準値にできる
ctx.drawImage(img, -size/2, -size/2, size, size);

      ctx.restore();
    }
  });

  // =========================================================
  // HUD / Camera / GameOver
  // =========================================================
  function updateHUDAndCamera(){
    if (!S.playing) return;

    const bodies = Composite.allBodies(engine.world).filter(b => !b.isStatic && b.label === 'takoyaki');
    let topY = S.floorY;

    for (const b of bodies){
      const y = b.bounds.min.y;
      if (y < topY) topY = y;
    }

    S.height = Math.max(0, Math.floor((S.floorY - topY) / 10));
    S.score  = S.height + (bodies.length * 10);

    if (elHeight) elHeight.textContent = String(S.height);
    if (elScore)  elScore.textContent  = String(S.score);

    const viewH = render.options.height;
    const bottom = S.floorY + CFG.CAM_PAD_BOTTOM;
    const targetTop = Math.min(topY - CFG.CAM_PAD_TOP, bottom - viewH);

    const currentMinY = render.bounds.min.y;
    const lerpY = currentMinY + (targetTop - currentMinY) * 0.12;

    Render.lookAt(render, {
      min: { x: 0, y: lerpY },
      max: { x: S.worldWidth, y: lerpY + viewH }
    });
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
    // スタート（画像タップ）
    startBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      startGame();
    }, { passive:false });

    startBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      startGame();
    }, { passive:false });

    // プレイ中：どこタップでも落下（1回で1個）
    document.addEventListener('pointerdown', (e) => {
      if (!S.playing || S.gameOver) return;
      // スタート画像押しは無視（誤爆防止）
      if (e.target.closest('#ttStartImageBtn')) return;
      dropCurrent();
    }, { passive:true });
  }

  // =========================================================
  // Main Loop
  // =========================================================
  Events.on(engine, 'afterUpdate', () => {
    if (!S.playing) return;

    // ① 上の1個を左右移動
    updateMovingCurrent();

    // ② 落とした後の横移動禁止
    enforceLocks();

    // ③ HUD/Camera/判定
    updateHUDAndCamera();
    checkGameOver();
  });

  // =========================================================
  // Boot
  // =========================================================
  async function boot(){
    setupWorld();
    bindInputs();

    // 画像先読み（失敗しても止まらない）
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
