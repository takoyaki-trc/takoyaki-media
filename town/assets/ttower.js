(() => {
  'use strict';

const CFG = {
  START_IMG_DAY:  'https://ul.h3z.jp/QJX6Wqrs.png',
  START_IMG_NIGHT:'https://ul.h3z.jp/Rbm88XCj.png',

    // 10種たこ焼き画像（定番：常に出る）
    TAKO_IMGS: [
      'https://ul.h3z.jp/gDi9QPz6.png',
      'https://ul.h3z.jp/j17HHdHp.png',
      'https://ul.h3z.jp/2aMjMOS1.png',
      'https://ul.h3z.jp/rZUWtrIU.png',
      'https://ul.h3z.jp/0MMuzDin.png',
      'https://ul.h3z.jp/XBqIjQot.png',
      'https://ul.h3z.jp/kbWxJSyI.png',
      'https://ul.h3z.jp/G7hIQKGj.png',
      'https://ul.h3z.jp/v4tCnB7g.png',
      'https://ul.h3z.jp/he8DdILQ.png',
    ],

    // 物理・テンポ
    GRAVITY: 1.15,
    DROP_COOLDOWN_MS: 240,
    NEXT_SPAWN_DELAY_MS: 520,

    // カメラ
    CAM_PAD_TOP: 150,
    CAM_PAD_BOTTOM: 260,

    // ゲームオーバー判定
    FALL_LINE: 240,          // floorよりこの下に落ちたら「落下扱い」
    FALLEN_COUNT_GAMEOVER: 2 // 2個以上落ちたら終了
  };

  // =========================
  // DOM
  // =========================
  const wrap = document.getElementById('ttWrap');
  const overlay = document.getElementById('ttOverlay');
  const startBtn = document.getElementById('ttStartImageBtn');
  const startImg = document.getElementById('ttStartImage');
  const toast = document.getElementById('ttToast');

  const elHeight = document.getElementById('ttHeight');
  const elScore  = document.getElementById('ttScore');
  const elBest   = document.getElementById('ttBest');

function isNightNow(){
  const h = new Date().getHours();
  return (h >= 18 || h < 6);
}

if (startImg){
  startImg.src = isNightNow() ? CFG.START_IMG_NIGHT : CFG.START_IMG_DAY;
}





  
  // =========================
  // State
  // =========================
  const S = {
    playing: false,
    gameOver: false,

    current: null,
    canDrop: false,
    lastDropAt: 0,

    floorY: 0,
    worldWidth: 0,
    worldHeight: 0,
    spawnX: 0,
    spawnY: 0,

    height: 0,
    score: 0,
    best: Number(localStorage.getItem('takoyakiTowerBest') || 0),

    images: [], // preloaded takoyaki images
  };
  elBest.textContent = String(S.best);

  // =========================
  // Matter.js
  // =========================
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

  // ドットをくっきり（超重要）
  render.canvas.style.imageRendering = 'pixelated';
  render.canvas.style.imageRendering = 'crisp-edges';
  render.canvas.style.touchAction = 'manipulation';

  const runner = Runner.create();

  // =========================
  // Utils
  // =========================
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randi = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

  function showToast(msg){
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 900);
  }

  function loadImages(srcList){
    return Promise.all(srcList.map(src => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image load failed: ' + src));
      img.src = src;
    })));
  }

  // =========================
  // World
  // =========================
  function setupWorld(){
    Composite.clear(engine.world, false);
    Engine.clear(engine);
    engine.gravity.y = CFG.GRAVITY;

    S.worldWidth  = Math.max(360, window.innerWidth);
    S.worldHeight = Math.max(640, window.innerHeight);

    S.floorY = S.worldHeight - 110;

    const floor = Bodies.rectangle(S.worldWidth/2, S.floorY + 45, S.worldWidth + 600, 90, {
      isStatic: true,
      label: 'floor',
      render: { visible: false }
    });

    const wallL = Bodies.rectangle(-140, S.floorY - 9000, 300, 18000, {
      isStatic: true, render: { visible: false }
    });
    const wallR = Bodies.rectangle(S.worldWidth + 140, S.floorY - 9000, 300, 18000, {
      isStatic: true, render: { visible: false }
    });

    Composite.add(engine.world, [floor, wallL, wallR]);

    S.spawnX = S.worldWidth / 2;
    S.spawnY = S.floorY - (S.worldHeight * 0.60);

    S.height = 0;
    S.score  = 0;
    S.current = null;
    S.canDrop = false;
    S.gameOver = false;

    elHeight.textContent = '0';
    elScore.textContent  = '0';

    Render.lookAt(render, {
      min: { x: 0, y: S.floorY - S.worldHeight },
      max: { x: S.worldWidth, y: S.floorY }
    });
  }

  // =========================
  // Physics Shapes（当たり判定：10種の形）
  //  ※見た目は画像、当たり判定は形状
  // =========================
  function baseProps(){
    return {
      restitution: 0.08,
      friction: 0.85,
      frictionStatic: 1.0,
      density: 0.0022,
      render: { visible: false },
      label: 'takoyaki'
    };
  }

  // 10種：形状はバリエーション（ゲーム性）
  function makeBodyByIndex(idx, x, y){
    const p = baseProps();
    const s = rand(0.90, 1.10);
    let body;

    switch(idx){
      case 0: { // ソース：丸（基準）
        const r = 30*s;
        body = Bodies.circle(x, y, r, p);
        body._drawW = r*2; body._drawH = r*2;
        break;
      }
      case 1: { // 辛口：少し不安定（縦長）
        const w = 40*s, h = 78*s;
        body = Bodies.rectangle(x, y, w, h, { ...p, chamfer:{ radius: 16*s }, friction: 0.78 });
        body._drawW = w; body._drawH = h;
        break;
      }
      case 2: { // 素焼き：丸（安定）
        const r = 28*s;
        body = Bodies.circle(x, y, r, { ...p, friction: 0.92 });
        body._drawW = r*2; body._drawH = r*2;
        break;
      }
      case 3: { // 明太マヨ：横長
        const w = 72*s, h = 40*s;
        body = Bodies.rectangle(x, y, w, h, { ...p, chamfer:{ radius: 16*s } });
        body._drawW = w; body._drawH = h;
        break;
      }
      case 4: { // 揚げ玉：ゴツゴツ（7角）
        const sides = 7, r = 32*s;
        body = Bodies.polygon(x, y, sides, r, { ...p, friction: 0.80, density: 0.0024 });
        Body.rotate(body, rand(-0.6,0.6));
        body._drawW = r*2; body._drawH = r*2;
        break;
      }
      case 5: { // ネギ味噌：重心ズレ複合
        const main = Bodies.circle(x, y, 26*s, p);
        const top  = Bodies.circle(x + 12*s, y - 10*s, 18*s, p);
        body = Body.create({ parts:[main, top] });
        body.label = 'takoyaki';
        body.render.visible = false;
        body.friction = 0.84;
        body._drawW = 72*s; body._drawH = 64*s;
        break;
      }
      case 6: { // チーズ：丸（やや重めで安定）
        const r = 34*s;
        body = Bodies.circle(x, y, r, { ...p, density: 0.0027, friction: 0.90 });
        body._drawW = r*2; body._drawH = r*2;
        break;
      }
      case 7: { // 塩マヨ黒胡椒：5角（ヒヤッと）
        const sides = 5, r = 32*s;
        body = Bodies.polygon(x, y, sides, r, { ...p, friction: 0.78 });
        Body.rotate(body, rand(-0.6,0.6));
        body._drawW = r*2; body._drawH = r*2;
        break;
      }
      case 8: { // ピザ：台形複合（上重心）
        const a = Bodies.rectangle(x, y, 62*s, 40*s, { ...p, chamfer:{ radius: 14*s } });
        const b = Bodies.rectangle(x, y - 18*s, 44*s, 24*s, { ...p, chamfer:{ radius: 10*s }, density: 0.0025 });
        body = Body.create({ parts:[a,b] });
        body.label = 'takoyaki';
        body.render.visible = false;
        body.friction = 0.76;
        body._drawW = 78*s; body._drawH = 76*s;
        break;
      }
      case 9: { // ドーナツ：丸（滑り気味）
        const r = 30*s;
        body = Bodies.circle(x, y, r, { ...p, friction: 0.74, density: 0.0020 });
        body._drawW = r*2; body._drawH = r*2;
        break;
      }
      default: {
        const r = 30*s;
        body = Bodies.circle(x, y, r, p);
        body._drawW = r*2; body._drawH = r*2;
      }
    }

    // sprite index（見た目）
    body.spriteIndex = idx;
    return body;
  }

  function spawnTakoyaki(){
    const idx = randi(0, 9); // 定番10種が常に出る
    const body = makeBodyByIndex(idx, S.spawnX, S.spawnY);

    Body.setVelocity(body, { x: 0, y: 0 });
    Body.setAngularVelocity(body, 0);

    Composite.add(engine.world, body);
    S.current = body;
    S.canDrop = true;
  }

  function dropCurrent(){
    if (!S.playing || S.gameOver) return;
    if (!S.current || !S.canDrop) return;

    const now = Date.now();
    if (now - S.lastDropAt < CFG.DROP_COOLDOWN_MS) return;
    S.lastDropAt = now;

    // 確実に落ちる
    Body.applyForce(S.current, S.current.position, { x: 0, y: S.current.mass * 0.06 });

    S.canDrop = false;
    S.current = null;

    setTimeout(() => {
      if (!S.playing || S.gameOver) return;
      spawnTakoyaki();
    }, CFG.NEXT_SPAWN_DELAY_MS);
  }

  // =========================
  // Custom Draw（画像をボディに貼る）
  // =========================
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

      const w = b._drawW ?? (b.bounds.max.x - b.bounds.min.x);
      const h = b._drawH ?? (b.bounds.max.y - b.bounds.min.y);

      ctx.drawImage(img, -w/2, -h/2, w, h);
      ctx.restore();
    }
  });

  // =========================
  // HUD / Camera / GameOver
  // =========================
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

    elHeight.textContent = String(S.height);
    elScore.textContent  = String(S.score);

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
      elBest.textContent = String(S.best);
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

  // =========================
  // Start / Input
  // =========================
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
    // ✅ 画像タップで開始（最重要：pointerdown + click）
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

    // ✅ プレイ中：画面タップで落下
    document.addEventListener('pointerdown', (e) => {
      if (!S.playing || S.gameOver) return;
      // スタート画像タップは落下にしない
      if (e.target.closest('#ttStartImageBtn')) return;
      dropCurrent();
    }, { passive:true });
  }

  // =========================
  // Main loop
  // =========================
  Events.on(engine, 'afterUpdate', () => {
    if (!S.playing) return;
    updateHUDAndCamera();
    checkGameOver();
  });

  // =========================
  // Boot（確実起動）
  // =========================
  async function boot(){
    try{
      setupWorld();
      bindInputs();

      // 画像を先読み（失敗したらエラーを出す）
      S.images = await loadImages(CFG.TAKO_IMGS);

      Render.run(render);
      Runner.run(runner, engine);

      overlay.style.display = 'flex';
      overlay.setAttribute('aria-hidden', 'false');
    }catch(err){
      console.error(err);
      alert('画像の読み込みに失敗しました。パスを確認してね。\n' + String(err));
    }
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, { once:true });
  } else {
    boot();
  }

  // =========================
  // Resize（安全に作り直し）
  // =========================
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

