(() => {
  // ===== DOM =====
  const wrap = document.getElementById("ttWrap");
  const canvas = document.getElementById("ttCanvas");
  const ctx = canvas.getContext("2d", { alpha: false });

  const elFloor = document.getElementById("ttFloor");
  const elBest  = document.getElementById("ttBest");
  const elCombo = document.getElementById("ttCombo");
  const elHint  = document.getElementById("ttHint");

  const btnDrop    = document.getElementById("ttDrop");
  const btnRestart = document.getElementById("ttRestart");

  const over = document.getElementById("ttOver");
  const overFloor = document.getElementById("ttOverFloor");
  const overBest  = document.getElementById("ttOverBest");
  const btnAgain  = document.getElementById("ttAgain");

  const pop = document.getElementById("ttPop");

  // ===== Storage =====
  const LS_KEY = "takoyakiTimingTowerBest";
  const getBest = () => Number(localStorage.getItem(LS_KEY) || "0");
  const setBest = (v) => localStorage.setItem(LS_KEY, String(v));

  // ===== Config =====
  const CONF = {
    bg: "#0b0f14",
    baseYPad: 140,          // bottom padding area for controls
    blockH: 42,             // takoyaki thickness (visual)
    startW: 240,            // starting width
    minW: 24,               // minimum width before it becomes brutal
    speedBase: 220,         // px/sec
    speedUpPerFloor: 4.2,   // speed increases per floor
    perfectPx: 6,           // perfect threshold
    comboBonus: 1,          // floors gained as points per perfect chain (display only)
    cutFallSpeed: 820,      // px/sec for cut piece falling
    cameraLerp: 0.10,
  };

  // ===== State =====
  let W = 0, H = 0, DPR = 1;
  let running = true;
  let gameOver = false;

  let best = getBest();
  elBest.textContent = String(best);

  let floors = 0;
  let combo = 0;

  // blocks are rectangles: { x, y, w, h }
  // world coordinates: x center, y center (positive downward)
  const stack = [];
  const falling = []; // cut pieces: { x,y,w,h,vy }

  // moving block (current)
  let cur = null; // { x, y, w, h, dir, speed }

  // camera offset (world y -> screen y)
  let camY = 0;

  // time
  let lastT = 0;

  // ===== Utils =====
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));

  function resize(){
    DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    W = Math.floor(window.innerWidth);
    H = Math.floor(window.innerHeight);
    canvas.width  = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }

  function setHint(t){ if (elHint) elHint.textContent = t; }

  function hud(){
    elFloor.textContent = String(floors);
    elCombo.textContent = String(combo);
    elBest.textContent  = String(best);
  }

  function showPop(text){
    if (!pop) return;
    pop.textContent = text;
    pop.classList.add("is-show");
    pop.setAttribute("aria-hidden", "false");
    clearTimeout(showPop._t);
    showPop._t = setTimeout(() => {
      pop.classList.remove("is-show");
      pop.setAttribute("aria-hidden", "true");
    }, 520);
  }

  function openOver(){
    overFloor.textContent = String(floors);
    overBest.textContent  = String(best);
    over.classList.add("is-open");
    over.setAttribute("aria-hidden", "false");
  }
  function closeOver(){
    over.classList.remove("is-open");
    over.setAttribute("aria-hidden", "true");
  }
  function shake(){
    wrap.classList.remove("tt-shake");
    void wrap.offsetWidth;
    wrap.classList.add("tt-shake");
  }

  // ===== Drawing (simple + clean) =====
  function drawBG(){
    ctx.fillStyle = CONF.bg;
    ctx.fillRect(0,0,W,H);

    // subtle grid
    ctx.globalAlpha = 0.10;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    const step = 56;
    for (let x= (W%step)/2; x<W; x+=step){
      ctx.beginPath();
      ctx.moveTo(x,0); ctx.lineTo(x,H);
      ctx.stroke();
    }
    for (let y= (H%step)/2; y<H; y+=step){
      ctx.beginPath();
      ctx.moveTo(0,y); ctx.lineTo(W,y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function worldToScreenY(y){
    return y - camY;
  }

  function drawTakoyakiRect(x,y,w,h,isCurrent){
    const sy = worldToScreenY(y);
    const left = x - w/2;
    const top  = sy - h/2;

    // base body
    ctx.fillStyle = isCurrent ? "#c97b2c" : "#b36a2a";
    ctx.strokeStyle = "#1a0f08";
    ctx.lineWidth = 2;
    roundRect(left, top, w, h, Math.min(18, h/2));
    ctx.fill();
    ctx.stroke();

    // highlight
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#ffffff";
    roundRect(left+6, top+6, Math.max(0, w-18), Math.max(0, h-18), 14);
    ctx.fill();
    ctx.globalAlpha = 1;

    // "takoyaki dots" (very light)
    ctx.globalAlpha = 0.20;
    ctx.fillStyle = "#000000";
    for (let i=0;i<6;i++){
      const px = left + 18 + (i* (w-36)/5);
      const py = top + h*0.60 + ((i%2)*3);
      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function roundRect(x,y,w,h,r){
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
  }

  function draw(){
    drawBG();

    // base ground marker (screen bottom)
    const groundY = H - CONF.baseYPad;
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(W, groundY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // stack blocks
    for (const b of stack){
      drawTakoyakiRect(b.x, b.y, b.w, b.h, false);
    }

    // falling cut pieces
    ctx.globalAlpha = 0.85;
    for (const f of falling){
      drawTakoyakiRect(f.x, f.y, f.w, f.h, false);
    }
    ctx.globalAlpha = 1;

    // current moving block
    if (cur){
      drawTakoyakiRect(cur.x, cur.y, cur.w, cur.h, true);

      // guide line (drop hint)
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = "#ffffff";
      ctx.setLineDash([6,6]);
      ctx.beginPath();
      ctx.moveTo(cur.x, worldToScreenY(cur.y + cur.h/2));
      ctx.lineTo(cur.x, H - CONF.baseYPad);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }

  // ===== Game logic =====
  function reset(){
    closeOver();
    gameOver = false;
    floors = 0;
    combo = 0;
    stack.length = 0;
    falling.length = 0;

    // base block
    const baseY = getBaseYWorld();
    stack.push({
      x: W/2,
      y: baseY,
      w: CONF.startW,
      h: CONF.blockH
    });

    spawnCurrent();
    camY = 0;
    setHint("タップ/スペースで落とす");
    hud();
  }

  function getBaseYWorld(){
    // base block sits above control area
    const groundScreenY = H - CONF.baseYPad;
    // convert to world: y = screen + camY
    return groundScreenY + camY - CONF.blockH/2;
  }

  function getNextY(){
    // next block sits on top of last stacked
    const last = stack[stack.length - 1];
    return last.y - CONF.blockH; // move up by one thickness
  }

  function spawnCurrent(){
    const last = stack[stack.length - 1];

    const y = getNextY();
    const w = clamp(last.w, CONF.minW, 10000);

    const dir = Math.random() < 0.5 ? -1 : 1;
    const speed = CONF.speedBase + floors * CONF.speedUpPerFloor;

    const startX = dir > 0 ? (W*0.15) : (W*0.85);
    cur = { x: startX, y, w, h: CONF.blockH, dir, speed };
  }

  function drop(){
    if (!running || gameOver) return;
    if (!cur) return;

    const prev = stack[stack.length - 1];
    const curLeft  = cur.x - cur.w/2;
    const curRight = cur.x + cur.w/2;
    const prevLeft  = prev.x - prev.w/2;
    const prevRight = prev.x + prev.w/2;

    const overlapLeft = Math.max(curLeft, prevLeft);
    const overlapRight = Math.min(curRight, prevRight);
    const overlapW = overlapRight - overlapLeft;

    // no overlap => game over
    if (overlapW <= 0){
      end();
      return;
    }

    // compute cut piece (overhanging)
    const leftOver = overlapLeft - curLeft;       // positive means left cut
    const rightOver = curRight - overlapRight;    // positive means right cut

    // perfect?
    const offset = Math.abs(cur.x - prev.x);
    const isPerfect = offset <= CONF.perfectPx;

    // snap to center if perfect
    let newX = (overlapLeft + overlapRight) / 2;
    if (isPerfect){
      newX = prev.x;
    }

    // add falling piece(s)
    // left piece
    if (leftOver > 0){
      const fw = leftOver;
      const fx = curLeft + fw/2;
      falling.push({ x: fx, y: cur.y, w: fw, h: cur.h, vy: 0 });
    }
    // right piece
    if (rightOver > 0){
      const fw = rightOver;
      const fx = overlapRight + fw/2;
      falling.push({ x: fx, y: cur.y, w: fw, h: cur.h, vy: 0 });
    }

    // push new stacked block
    stack.push({ x: newX, y: cur.y, w: (isPerfect ? prev.w : overlapW), h: cur.h });

    floors++;
    if (isPerfect){
      combo++;
      showPop(combo >= 2 ? `PERFECT ×${combo}` : "PERFECT!");
      setHint("いいね、そのまま中心で積め！");
    } else {
      combo = 0;
      setHint("タップ/スペースで落とす");
    }

    // best
    if (floors > best){
      best = floors;
      setBest(best);
    }
    hud();

    // next block
    spawnCurrent();

    // camera target: keep top visible
    // camera y wants to move upward as tower grows
    // (world y decreases as we go up)
  }

  function end(){
    gameOver = true;
    cur = null;
    hud();
    shake();
    setHint("ゲームオーバー！");
    openOver();
  }

  // ===== Update loop =====
  function update(dt){
    if (!running) return;

    if (!gameOver && cur){
      // move left-right
      cur.x += cur.dir * cur.speed * dt;

      // bounce at edges (soft bounds)
      const pad = 40;
      const minX = pad + cur.w/2;
      const maxX = W - pad - cur.w/2;
      if (cur.x < minX){ cur.x = minX; cur.dir *= -1; }
      if (cur.x > maxX){ cur.x = maxX; cur.dir *= -1; }
    }

    // falling pieces animation (simple)
    const groundScreenY = H - CONF.baseYPad;
    const groundWorldY = groundScreenY + camY + 120; // allow offscreen fall
    for (let i = falling.length - 1; i >= 0; i--){
      const f = falling[i];
      f.vy += CONF.cutFallSpeed * dt;
      f.y += f.vy * dt;

      // remove if far below
      if (worldToScreenY(f.y) > H + 300 || f.y > groundWorldY){
        falling.splice(i,1);
      }
    }

    // camera follow (keep current/top area visible)
    // target camY so that top of tower sits around 30% from top
    const top = stack[stack.length - 1];
    const topScreenDesired = H * 0.32;
    const topWorldY = top.y - top.h/2; // top edge
    const targetCam = topWorldY - topScreenDesired;
    camY += (targetCam - camY) * CONF.cameraLerp;

    // clamp camera so base doesn't float too high at start
    camY = Math.min(camY, 0);

    // keep base Y consistent (since base is in world coords, it will appear to move with camera; that's fine)
  }

  function loop(t){
    if (!lastT) lastT = t;
    const dt = Math.min(0.033, (t - lastT) / 1000);
    lastT = t;

    update(dt);
    draw();

    requestAnimationFrame(loop);
  }

  // ===== Inputs =====
  function bind(){
    btnDrop?.addEventListener("click", drop);
    btnRestart?.addEventListener("click", reset);
    btnAgain?.addEventListener("click", reset);

    // tap/click anywhere to drop (but avoid double-trigger on button)
    const onPointer = (e) => {
      const target = e.target;
      if (target && (target.closest?.("#ttDrop") || target.closest?.("#ttRestart") || target.closest?.("#ttOver"))) return;
      drop();
    };
    canvas.addEventListener("pointerdown", onPointer, { passive: true });

    // keyboard
    window.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter"){
        e.preventDefault();
        drop();
      }
      if (e.key.toLowerCase() === "r"){
        reset();
      }
    });

    // resize
    window.addEventListener("resize", () => {
      resize();
      // rebuild base width relative to new screen: keep gameplay consistent
      reset();
    });
  }

  // ===== Boot =====
  resize();
  bind();
  reset();
  requestAnimationFrame(loop);
})();
