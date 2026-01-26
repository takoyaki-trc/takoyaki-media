/* =========================================================
  Takoyaki Tower (Matter.js) - Full Working Build
  - Portrait only
  - Base takoyaki fixed as foundation (Floor 1)
  - Tap start / Tap drop (no buttons during play)
  - Real physics: gravity + rotation + collisions (NO angle lock)
  - Bad balance collapses quickly
  - Game over if any stacked takoyaki falls off base area
  - Camera follows tower upward smoothly (Render.lookAt)
  - Height meter (Lv1–Lv100) + level naming
  - No external assets required (sprites are generated)
========================================================= */

(() => {
  const { Engine, Render, Runner, World, Bodies, Body, Composite, Events, Vector } = Matter;

  // ---------- DOM ----------
  const gameWrap = document.getElementById("gameWrap");
  const startScreen = document.getElementById("startScreen");
  const gameOverScreen = document.getElementById("gameOverScreen");
  const goScore = document.getElementById("goScore");
  const goReason = document.getElementById("goReason");
  const startBtnImg = document.getElementById("startBtnImg");

  const floorNumEl = document.getElementById("floorNum");
  const lvNumEl = document.getElementById("lvNum");
  const lvNameEl = document.getElementById("lvName");
  const meterFill = document.getElementById("meterFill");
  const meterText = document.getElementById("meterText");

  // ---------- Constants ----------
  const MAX_LV = 100;

  // "Settle" logic (count floors by stability, not pixels)
  const SETTLE_V = 0.20;
  const SETTLE_W = 0.06;
  const SETTLE_FRAMES = 22;

  // Game Over detection
  const FAR_BELOW_EXTRA = 1400; // if far below view -> game over

  // ---------- State ----------
  let engine, render, runner;
  let baseBody = null;
  let baseX = 0;
  let baseWidth = 160;
  let groundY = 0;

  let currentPreview = null;     // static preview piece sliding
  let currentDropped = null;     // last dropped piece reference (for exclude rule)
  let lastSpawnId = 0;
  let lastDroppedId = 0;

  let floorCount = 1;            // base = 1
  let bestTopY = Infinity;       // smallest y observed
  let cameraY = 0;

  let startedOnce = false;
  let gameRunning = false;
  let isGameOver = false;

  // ---------- Level Names (Lv1-100) ----------
  const LEVEL_NAMES = [
    { lv: 1,  name: "たこ焼き台 1階分" },
    { lv: 2,  name: "たこ焼き台 2階分" },
    { lv: 3,  name: "たこ焼き屋台 3階分" },
    { lv: 4,  name: "屋台増築 4階分" },
    { lv: 5,  name: "行列発生 5階分" },
    { lv: 6,  name: "湯気の壁 6階分" },
    { lv: 7,  name: "ソース階 7階分" },
    { lv: 8,  name: "明太マヨ階 8階分" },
    { lv: 9,  name: "揚げ玉階 9階分" },
    { lv: 10, name: "タワー入口 10階分" },
    { lv: 11, name: "たこ焼き塔 11階分" },
    { lv: 12, name: "塩マヨ黒胡椒階 12階分" },
    { lv: 13, name: "ねぎ味噌階 13階分" },
    { lv: 14, name: "チーズ層 14階分" },
    { lv: 15, name: "ピザ風層 15階分" },
    { lv: 16, name: "素焼き禁欲階 16階分" },
    { lv: 17, name: "辛口黒ソース階 17階分" },
    { lv: 18, name: "ドーナツ偽装階 18階分" },
    { lv: 19, name: "回転注意階 19階分" },
    { lv: 20, name: "たこ焼きタワー 20階分" },
    { lv: 21, name: "重心学入門 21階分" },
    { lv: 22, name: "ぐらつき観測階 22階分" },
    { lv: 23, name: "傾き自白階 23階分" },
    { lv: 24, name: "崩壊予告階 24階分" },
    { lv: 25, name: "焼き台第二形態 25階分" },
    { lv: 26, name: "反復練習階 26階分" },
    { lv: 27, name: "微調整地獄階 27階分" },
    { lv: 28, name: "無言集中階 28階分" },
    { lv: 29, name: "祈りの間 29階分" },
    { lv: 30, name: "三十路の塔 30階分" },
    { lv: 31, name: "たこ焼きビル 31階分" },
    { lv: 32, name: "耐震幻想階 32階分" },
    { lv: 33, name: "風評被害階 33階分" },
    { lv: 34, name: "監視カメラ階 34階分" },
    { lv: 35, name: "安全基準無視階 35階分" },
    { lv: 36, name: "スリル営業階 36階分" },
    { lv: 37, name: "手汗検知階 37階分" },
    { lv: 38, name: "微振動増幅階 38階分" },
    { lv: 39, name: "崩壊前夜階 39階分" },
    { lv: 40, name: "四十層の沈黙 40階分" },
    { lv: 41, name: "たこ焼き高層棟 41階分" },
    { lv: 42, name: "絶妙ズレ階 42階分" },
    { lv: 43, name: "角度税徴収階 43階分" },
    { lv: 44, name: "転がり癖公開階 44階分" },
    { lv: 45, name: "偏心美学階 45階分" },
    { lv: 46, name: "落下礼儀作法階 46階分" },
    { lv: 47, name: "摩擦信仰階 47階分" },
    { lv: 48, name: "回転神殿前 48階分" },
    { lv: 49, name: "終焉予感階 49階分" },
    { lv: 50, name: "五十階記念碑 50階分" },
    { lv: 51, name: "たこ焼き塔・中層 51階分" },
    { lv: 52, name: "焦げの誘惑階 52階分" },
    { lv: 53, name: "左右往復地獄 53階分" },
    { lv: 54, name: "手元狂い階 54階分" },
    { lv: 55, name: "根性試験階 55階分" },
    { lv: 56, name: "上空寒風階 56階分" },
    { lv: 57, name: "震え伝播階 57階分" },
    { lv: 58, name: "崩壊予備軍階 58階分" },
    { lv: 59, name: "片寄り告白階 59階分" },
    { lv: 60, name: "六十階の幻 60階分" },
    { lv: 61, name: "たこ焼き塔・上層 61階分" },
    { lv: 62, name: "心拍数上昇階 62階分" },
    { lv: 63, name: "微妙に当たる階 63階分" },
    { lv: 64, name: "回転開始階 64階分" },
    { lv: 65, name: "落下芸術階 65階分" },
    { lv: 66, name: "角度の沼 66階分" },
    { lv: 67, name: "すべり台階 67階分" },
    { lv: 68, name: "連鎖崩壊階 68階分" },
    { lv: 69, name: "不吉な揺れ階 69階分" },
    { lv: 70, name: "七十階・強風注意 70階分" },
    { lv: 71, name: "たこ焼き摩天楼 71階分" },
    { lv: 72, name: "上空孤独階 72階分" },
    { lv: 73, name: "手が勝手に動く階 73階分" },
    { lv: 74, name: "タップ早漏階 74階分" },
    { lv: 75, name: "タップ遅漏階 75階分" },
    { lv: 76, name: "最適解不在階 76階分" },
    { lv: 77, name: "角度修羅場階 77階分" },
    { lv: 78, name: "微振動耐久階 78階分" },
    { lv: 79, name: "崩壊が近い階 79階分" },
    { lv: 80, name: "八十階・空中鉄板 80階分" },
    { lv: 81, name: "たこ焼き大塔 81階分" },
    { lv: 82, name: "重心の神託階 82階分" },
    { lv: 83, name: "揺れが言葉になる階 83階分" },
    { lv: 84, name: "慣性の裁判所 84階分" },
    { lv: 85, name: "傾き教団本部 85階分" },
    { lv: 86, name: "落下観客席 86階分" },
    { lv: 87, name: "焦げ臭い未来階 87階分" },
    { lv: 88, name: "連続回転階 88階分" },
    { lv: 89, name: "崩壊確定演出階 89階分" },
    { lv: 90, name: "九十階・天辺手前 90階分" },
    { lv: 91, name: "たこ焼き天守 91階分" },
    { lv: 92, name: "最終重心調整階 92階分" },
    { lv: 93, name: "指先の真実階 93階分" },
    { lv: 94, name: "積みの業火階 94階分" },
    { lv: 95, name: "塔の呼吸階 95階分" },
    { lv: 96, name: "重力礼拝堂 96階分" },
    { lv: 97, name: "崩壊神殿 97階分" },
    { lv: 98, name: "たこ焼き天空塔 98階分" },
    { lv: 99, name: "最終試練・99 99階分" },
    { lv: 100, name: "伝説：Takoyaki Tower 100階分" },
  ];

  // ---------- Sprite generation (no external assets needed) ----------
  function makePixelSprite(typeKey) {
    const c = document.createElement("canvas");
    c.width = 128; c.height = 128;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;

    const px = (x,y,w,h,fill)=>{ g.fillStyle = fill; g.fillRect(x|0,y|0,w|0,h|0); };
    const circle = (cx,cy,r,fill)=>{ g.fillStyle=fill; g.beginPath(); g.arc(cx,cy,r,0,Math.PI*2); g.fill(); };
    const outlineCircle = (cx,cy,r,stroke,w=2)=>{ g.strokeStyle=stroke; g.lineWidth=w; g.beginPath(); g.arc(cx,cy,r,0,Math.PI*2); g.stroke(); };
    const dot = (x,y,fill)=>px(x,y,3,3,fill);

    const bodyColor = "#c58a52";
    const bodyDark  = "#a46d3f";
    const ink = "#2a1a10";
    const hi  = "#e5c59e";

    // main
    circle(64,68,44,bodyColor);
    circle(58,64,40,bodyDark);
    outlineCircle(64,68,44,ink,3);
    circle(48,52,10,hi);

    // bake dots
    for (let i=0;i<18;i++){
      dot(30 + (i*5)%70, 70 + ((i*13)%30), "#7b4b2a");
    }

    const k = typeKey;

    if (k==="SAUCE"){
      px(32,56,64,12,"#5a2f16");
      px(36,66,56,10,"#5a2f16");
      px(42,74,44,8,"#5a2f16");
      px(78,58,10,4,"#7a4425");
    }
    if (k==="SPICY"){
      px(34,56,70,12,"#2b140b");
      px(44,66,62,10,"#2b140b");
      px(54,76,50,8,"#2b140b");
      px(92,80,10,18,"#2b140b");
    }
    if (k==="SUYAKI"){
      // no sauce
    }
    if (k==="MENTA"){
      px(34,58,64,10,"#5a2f16");
      px(36,70,58,8,"#5a2f16");
      for (let i=0;i<7;i++){
        px(38+i*10,56+i*4,8,6,"#f3f0e8");
      }
      for (let i=0;i<12;i++){
        dot(42 + (i*7)%50, 62 + ((i*11)%26), "#d65a4a");
      }
    }
    if (k==="AGEDAMA"){
      px(34,60,62,10,"#5a2f16");
      for (let i=0;i<22;i++){
        dot(34 + (i*6)%62, 54 + ((i*9)%40), "#e2c07b");
      }
      px(40,52,10,8,"#f3f0e8");
      px(52,62,12,8,"#f3f0e8");
      px(70,70,10,8,"#f3f0e8");
      px(62,52,10,6,"#c7b23a");
    }
    if (k==="NEGI"){
      px(34,60,62,10,"#4b2b16");
      for (let i=0;i<24;i++){
        dot(30 + (i*5)%78, 56 + ((i*7)%34), "#2e7a3b");
      }
      for (let i=0;i<10;i++){
        dot(44 + (i*9)%50, 62 + ((i*10)%20), "#9b6a3f");
      }
    }
    if (k==="CHEESE"){
      px(34,60,62,10,"#5a2f16");
      px(40,56,56,10,"#f1d76a");
      px(48,66,44,10,"#f1d76a");
      px(56,78,10,20,"#f1d76a");
      px(72,82,8,18,"#f1d76a");
    }
    if (k==="SALT"){
      for (let i=0;i<26;i++){
        dot(38 + (i*7)%54, 54 + ((i*13)%34), "#151515");
      }
      for (let i=0;i<18;i++){
        dot(34 + (i*9)%60, 52 + ((i*11)%38), "#f3f0e8");
      }
    }
    if (k==="PIZZA"){
      px(30,60,72,10,"#5a2f16");
      px(36,56,58,10,"#f1d76a");
      for (let i=0;i<7;i++){
        circle(44 + i*8, 70 + (i%2)*4, 5, "#c94c3b");
      }
      for (let i=0;i<10;i++){
        dot(70 + (i*5)%20, 58 + ((i*9)%34), "#2e7a3b");
      }
    }
    if (k==="DONUT"){
      px(34,60,62,10,"#5a2f16");
      circle(64,70,16,"rgba(0,0,0,.35)");
      outlineCircle(64,70,16,"rgba(0,0,0,.65)",3);
      outlineCircle(64,68,36,"rgba(255,255,255,.15)",2);
    }

    // subtle top/bottom scan line
    px(20,20,88,2,"rgba(255,255,255,.08)");
    px(20,106,88,2,"rgba(255,255,255,.08)");

    return c.toDataURL("image/png");
  }

  // Start banner generator (day/night)
  function makeStartBanner(isNight=false){
    const c = document.createElement("canvas");
    c.width = 420; c.height = 520;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;

    g.fillStyle = isNight ? "#08121f" : "#132235";
    g.fillRect(0,0,c.width,c.height);

    if (isNight){
      g.fillStyle = "rgba(255,255,255,.75)";
      for (let i=0;i<60;i++){
        g.fillRect((i*37)%420, (i*53)%520, 2,2);
      }
      g.fillStyle = "rgba(255,255,255,.18)";
      g.beginPath(); g.arc(320,110,70,0,Math.PI*2); g.fill();
    }else{
      g.fillStyle = "rgba(255,255,255,.22)";
      g.beginPath(); g.arc(320,110,90,0,Math.PI*2); g.fill();
    }

    g.fillStyle = "rgba(255,255,255,.92)";
    g.font = "900 44px system-ui, sans-serif";
    g.fillText("Takoyaki", 36, 120);
    g.fillText("Tower", 36, 170);

    const drawTako = (x,y,scale)=>{
      g.fillStyle = "#c58a52"; g.beginPath(); g.arc(x,y,38*scale,0,Math.PI*2); g.fill();
      g.strokeStyle = "#20120c"; g.lineWidth = 6*scale; g.beginPath(); g.arc(x,y,38*scale,0,Math.PI*2); g.stroke();
      g.fillStyle="rgba(255,255,255,.22)"; g.beginPath(); g.arc(x-12*scale,y-14*scale,10*scale,0,Math.PI*2); g.fill();
    };
    drawTako(210, 270, 1.1);
    drawTako(210, 345, 1.0);
    drawTako(210, 415, 0.92);

    g.fillStyle = "rgba(255,255,255,.88)";
    g.font = "800 18px system-ui, sans-serif";
    g.fillText("Tap the image to start", 96, 485);

    return c.toDataURL("image/png");
  }

  function isNightNow(){
    const h = new Date().getHours();
    return (h < 6 || h >= 18);
  }

  // ---------- Takoyaki type config (collision + physics + trap design) ----------
  // Categories: normal / risky / trap
  const TAKO_TYPES = [
    // normal
    { key:"SAUCE",  category:"normal", restitution:0.16, friction:0.95, frictionAir:0.020, density:0.00175, comShift:{x:0,y:0},
      vertices:[{x:-28,y:-26},{x:30,y:-22},{x:34,y:8},{x:22,y:32},{x:-20,y:30},{x:-34,y:6}] },

    { key:"SUYAKI", category:"normal", restitution:0.18, friction:0.70, frictionAir:0.012, density:0.00155, comShift:{x:0,y:0},
      vertices:[{x:-30,y:-24},{x:30,y:-24},{x:36,y:6},{x:24,y:32},{x:-24,y:32},{x:-36,y:6}] },

    // risky
    { key:"MENTA", category:"risky", restitution:0.17, friction:0.88, frictionAir:0.016, density:0.00170, comShift:{x:2,y:-1},
      vertices:[{x:-28,y:-25},{x:30,y:-23},{x:34,y:8},{x:20,y:33},{x:-22,y:30},{x:-35,y:6}] },

    { key:"NEGI", category:"risky", restitution:0.14, friction:0.96, frictionAir:0.020, density:0.00185, comShift:{x:0,y:0},
      vertices:[{x:-42,y:-18},{x:42,y:-18},{x:30,y:22},{x:-30,y:22}] },

    { key:"PIZZA", category:"risky", restitution:0.16, friction:0.84, frictionAir:0.018, density:0.00175, comShift:{x:3,y:0},
      vertices:[{x:-40,y:-16},{x:38,y:-20},{x:44,y:8},{x:26,y:24},{x:-32,y:24},{x:-46,y:2}] },

    { key:"SALT", category:"risky", restitution:0.22, friction:0.62, frictionAir:0.012, density:0.00120, comShift:{x:0,y:0},
      vertices:[{x:-24,y:-22},{x:22,y:-24},{x:28,y:6},{x:20,y:22},{x:-18,y:24},{x:-28,y:4}] },

    // trap
    { key:"SPICY", category:"trap", restitution:0.14, friction:0.90, frictionAir:0.022, density:0.00185, comShift:{x:4,y:0},
      vertices:[{x:-29,y:-24},{x:28,y:-24},{x:34,y:6},{x:18,y:34},{x:-22,y:30},{x:-36,y:10}] },

    { key:"CHEESE", category:"trap", restitution:0.12, friction:1.05, frictionAir:0.024, density:0.00235, comShift:{x:0,y:2},
      vertices:[{x:-32,y:-22},{x:32,y:-22},{x:36,y:10},{x:14,y:34},{x:-18,y:34},{x:-38,y:8}] },

    // point-contact trap (looks round but bottom尖り)
    { key:"AGEDAMA", category:"trap", restitution:0.16, friction:0.72, frictionAir:0.014, density:0.00160, comShift:{x:0,y:0},
      vertices:[{x:-26,y:-26},{x:26,y:-26},{x:10,y:18},{x:0,y:30},{x:-10,y:18}] },

    // donut trap: slippery + rotation-friendly
    { key:"DONUT", category:"trap", restitution:0.20, friction:0.58, frictionAir:0.010, density:0.00130, comShift:{x:2,y:0},
      vertices:[{x:-30,y:-20},{x:30,y:-24},{x:38,y:2},{x:22,y:30},{x:-22,y:30},{x:-38,y:2}] },
  ];

  // sprites
  const SPRITES = {};
  function buildSprites(){
    for (const t of TAKO_TYPES) SPRITES[t.key] = makePixelSprite(t.key);

    const day = makeStartBanner(false);
    const night = makeStartBanner(true);
    startBtnImg.dataset.day = day;
    startBtnImg.dataset.night = night;
    startBtnImg.src = isNightNow() ? night : day;
  }

  function updateStartDayNight(){
    const src = isNightNow() ? startBtnImg.dataset.night : startBtnImg.dataset.day;
    startBtnImg.src = src;
  }

  // ---------- Spawn table by level ----------
  const SPAWN_TABLE = [
    { lv:[1,10],   normal:80, risky:20, trap:0 },
    { lv:[11,20],  normal:60, risky:35, trap:5 },
    { lv:[21,30],  normal:45, risky:40, trap:15 },
    { lv:[31,40],  normal:30, risky:45, trap:25 },
    { lv:[41,60],  normal:20, risky:40, trap:40 },
    { lv:[61,80],  normal:10, risky:35, trap:55 },
    { lv:[81,100], normal:0,  risky:30, trap:70 },
  ];

  function pickByWeight(items){
    const total = items.reduce((s,it)=>s+it.w,0);
    let r = Math.random()*total;
    for (const it of items){
      r -= it.w;
      if (r <= 0) return it.v;
    }
    return items[items.length-1].v;
  }

  function pickTakoyakiType(level){
    const lv = Math.max(1, Math.min(MAX_LV, level));
    const rule = SPAWN_TABLE.find(s => lv>=s.lv[0] && lv<=s.lv[1]) || SPAWN_TABLE[SPAWN_TABLE.length-1];

    const cat = pickByWeight([
      { v:"normal", w: rule.normal },
      { v:"risky",  w: rule.risky  },
      { v:"trap",   w: rule.trap   },
    ]);

    const pool = TAKO_TYPES.filter(t => t.category === cat);
    return pool[(Math.random() * pool.length) | 0];
  }

  // ---------- Helpers ----------
  function levelNameFor(lv){
    const i = Math.max(1, Math.min(MAX_LV, lv)) - 1;
    return LEVEL_NAMES[i]?.name || `Lv${lv}`;
  }

  function updateHUD(){
    const lv = Math.max(1, Math.min(MAX_LV, floorCount));
    floorNumEl.textContent = String(floorCount);
    lvNumEl.textContent = String(lv);
    lvNameEl.textContent = levelNameFor(lv);

    const pct = Math.max(0, Math.min(1, lv / MAX_LV));
    meterFill.style.height = `${pct * 100}%`;
    meterText.textContent = `${lv} / ${MAX_LV}`;
  }

  // Create takoyaki body from vertices + sprite
  function createTakoyakiBody(x, y, typeCfg, scaleMul=1){
    const body = Bodies.fromVertices(
      x, y, [typeCfg.vertices],
      {
        label: "takoyaki",
        restitution: typeCfg.restitution,
        friction: typeCfg.friction,
        frictionAir: typeCfg.frictionAir,
        density: typeCfg.density,
        render: {
          sprite: {
            texture: SPRITES[typeCfg.key],
            xScale: scaleMul,
            yScale: scaleMul
          }
        }
      },
      true
    );

    // subtle size variance (physics readability kept)
    const s = scaleMul * (0.92 + Math.random()*0.16);
    Body.scale(body, s, s);

    // center-of-mass shift (trap/risky honesty)
    if (typeCfg.comShift && (typeCfg.comShift.x || typeCfg.comShift.y)){
      const com = { x: typeCfg.comShift.x, y: typeCfg.comShift.y };
      Body.setCentre(body, Vector.add(body.position, com), true);
    }

    body.plugin = {
      spawnId: ++lastSpawnId,
      counted: false,
      settledFrames: 0,
      preview: false,
      movePhase: Math.random()*Math.PI*2,
      moveSpeed: 0.020 + Math.random()*0.012
    };

    return body;
  }

  // ---------- Matter setup ----------
  function destroyWorld(){
    if (render){
      Render.stop(render);
      if (render.canvas && render.canvas.parentNode){
        render.canvas.parentNode.removeChild(render.canvas);
      }
    }
    if (runner) Runner.stop(runner);
    engine = render = runner = null;
  }

  function initWorld(){
    destroyWorld();

    const W = window.innerWidth;
    const H = window.innerHeight;

    engine = Engine.create();
    engine.gravity.y = 1;
    engine.gravity.scale = 0.0011;

    render = Render.create({
      element: gameWrap,
      engine,
      options: {
        width: W,
        height: H,
        wireframes: false,
        background: "#0b0f14",
        pixelRatio: window.devicePixelRatio || 1
      }
    });

    runner = Runner.create();

    baseX = W/2;
    groundY = H - 60;

    // ground + walls (walls invisible; allow sideways wobble but keep in world)
    const ground = Bodies.rectangle(W/2, groundY + 50, W + 1200, 140, {
      isStatic: true,
      label: "ground",
      friction: 1.0,
      render: { fillStyle: "rgba(255,255,255,.04)" }
    });

    const leftWall  = Bodies.rectangle(-320, H/2, 640, H + 4000, { isStatic:true, label:"wall", render:{ visible:false }});
    const rightWall = Bodies.rectangle(W+320, H/2, 640, H + 4000, { isStatic:true, label:"wall", render:{ visible:false }});

    World.add(engine.world, [ground, leftWall, rightWall]);

    // base (static, never moves)
    const baseCfg = TAKO_TYPES.find(t=>t.key==="SAUCE");
    baseBody = createTakoyakiBody(baseX, groundY - 10, baseCfg, 1.18);
    Body.setStatic(baseBody, true);
    baseBody.label = "base";
    baseBody.plugin.counted = true; // treat as already counted
    World.add(engine.world, baseBody);

    baseWidth = (baseBody.bounds.max.x - baseBody.bounds.min.x) * 0.92;

    // camera
    bestTopY = baseBody.bounds.min.y;
    cameraY = baseBody.position.y - 260;

    // counters
    floorCount = 1;
    isGameOver = false;
    gameRunning = true;
    currentPreview = null;
    currentDropped = null;
    lastDroppedId = 0;
    lastSpawnId = 0; // reset ids (ok; plugin uses ++)

    updateHUD();

    Render.run(render);
    Runner.run(runner, engine);

    Events.on(engine, "beforeUpdate", onBeforeUpdate);
    Events.on(engine, "afterUpdate", onAfterUpdate);

    spawnNextPreview();
  }

  // ---------- Spawn / Drop ----------
  function spawnNextPreview(){
    if (!gameRunning || isGameOver) return;

    if (floorCount >= MAX_LV){
      endGame("100階到達。…でも物理は終わらない。");
      return;
    }

    const W = window.innerWidth;
    const H = window.innerHeight;

    const typeCfg = pickTakoyakiType(floorCount);

    // spawn near top of current view
    const spawnY = Math.min(bestTopY - 220, cameraY - H*0.45);

    const b = createTakoyakiBody(baseX, spawnY, typeCfg, 1.0);
    b.plugin.preview = true;

    // preview stays static and slides; drop makes it dynamic
    Body.setStatic(b, true);
    Body.setVelocity(b, {x:0,y:0});
    Body.setAngle(b, 0);

    currentPreview = b;
    World.add(engine.world, b);
  }

  function dropPreview(){
    if (!gameRunning || isGameOver) return;
    if (!currentPreview) return;

    // drop straight down: make dynamic
    Body.setStatic(currentPreview, false);
    Body.setVelocity(currentPreview, {x:0,y:0});
    // do NOT lock angle; physics will rotate naturally

    currentPreview.plugin.preview = false;

    currentDropped = currentPreview;
    lastDroppedId = currentPreview.plugin.spawnId;

    currentPreview = null;

    // spawn next preview shortly after, so player sees outcome
    setTimeout(() => {
      if (!isGameOver) spawnNextPreview();
    }, 220);
  }

  // ---------- Camera ----------
  function updateCamera(){
    const W = window.innerWidth;
    const H = window.innerHeight;

    const bodies = Composite.allBodies(engine.world).filter(b => b.label === "takoyaki" || b.label === "base");
    let top = Infinity;
    for (const b of bodies){
      top = Math.min(top, b.bounds.min.y);
    }
    if (!isFinite(top)) top = baseBody.bounds.min.y;

    // follow upward only
    bestTopY = Math.min(bestTopY, top);

    const targetY = bestTopY + 260;
    cameraY += (targetY - cameraY) * 0.06;

    Render.lookAt(render, {
      min: { x: 0, y: cameraY - H/2 },
      max: { x: W, y: cameraY + H/2 }
    });
  }

  // ---------- Floor counting ----------
  function countSettledFloors(){
    const bodies = Composite.allBodies(engine.world);
    for (const b of bodies){
      if (b.label !== "takoyaki") continue;
      if (!b.plugin) continue;
      if (b.plugin.preview) continue;
      if (b.plugin.counted) continue;

      // exclude currently falling one (the latest dropped piece) UNTIL it settles
      // (it becomes countable only when stable)
      const v = b.velocity;
      const speed = Math.hypot(v.x, v.y);
      const ang = Math.abs(b.angularVelocity);

      if (speed < SETTLE_V && ang < SETTLE_W){
        b.plugin.settledFrames = (b.plugin.settledFrames || 0) + 1;
      }else{
        b.plugin.settledFrames = 0;
      }

      if (b.plugin.settledFrames >= SETTLE_FRAMES){
        b.plugin.counted = true;
        floorCount += 1;
        updateHUD();

        if (floorCount >= MAX_LV){
          endGame("100階到達。…でも物理は終わらない。");
          return;
        }
      }
    }
  }

  // ---------- Game Over detection ----------
  function checkGameOver(){
    const H = window.innerHeight;

    const leftLimit  = baseX - baseWidth/2;
    const rightLimit = baseX + baseWidth/2;

    const bodies = Composite.allBodies(engine.world);

    for (const b of bodies){
      if (b.label !== "takoyaki") continue;
      if (!b.plugin) continue;

      // Exclude “currently falling one” from off-base check (spec),
      // BUT if it falls far below the screen, end anyway.
      if (!b.plugin.counted && b.plugin.spawnId === lastDroppedId){
        if (b.position.y > (cameraY + H/2 + FAR_BELOW_EXTRA)){
          endGame("落下が深すぎる。塔は戻らない。");
          return;
        }
        continue;
      }

      // stacked ones: if near ground and outside base width => game over
      const nearFloor = (b.position.y >= groundY + 10);
      const outOfBase = (b.position.x < leftLimit || b.position.x > rightLimit);

      if (nearFloor && outOfBase){
        endGame("ベース外へ落下。崩壊確定。");
        return;
      }

      // safety: if far below view -> game over
      if (b.position.y > (cameraY + H/2 + FAR_BELOW_EXTRA)){
        endGame("視界の外へ消えた。終わり。");
        return;
      }
    }
  }

  // ---------- Update hooks ----------
  function onBeforeUpdate(){
    if (!gameRunning || isGameOver) return;

    // slide preview left-right at top
    if (currentPreview && currentPreview.isStatic && currentPreview.plugin?.preview){
      const W = window.innerWidth;
      const t = (engine.timing.timestamp || 0) * (currentPreview.plugin.moveSpeed || 0.02);
      const amp = Math.min(160, W * 0.24);
      const x = baseX + Math.sin(t + (currentPreview.plugin.movePhase || 0)) * amp;

      Body.setPosition(currentPreview, { x, y: currentPreview.position.y });
      Body.setAngle(currentPreview, 0); // preview is flat; drop unlocks rotation
    }
  }

  function onAfterUpdate(){
    if (!gameRunning || isGameOver) return;
    updateCamera();
    countSettledFloors();
    checkGameOver();
  }

  // ---------- UI ----------
  function showStart(){
    startScreen.hidden = false;
    gameOverScreen.hidden = true;
    updateStartDayNight();
  }

  function hideOverlays(){
    startScreen.hidden = true;
    gameOverScreen.hidden = true;
  }

  function endGame(reason){
    if (isGameOver) return;
    isGameOver = true;
    gameRunning = false;

    // stop physics quickly (clear, immediate ending)
    try { engine.timing.timeScale = 0; } catch(e){}

    gameOverScreen.hidden = false;
    goScore.textContent = `${floorCount} 階`;
    goReason.textContent = reason || "崩壊。";
  }

  // ---------- Input ----------
  function onTap(e){
    if (e && e.cancelable) e.preventDefault();

    // Start -> init
    if (!startedOnce){
      startedOnce = true;
      hideOverlays();
      // restore time scale (in case)
      // world init sets its own engine anyway
      initWorld();
      return;
    }

    // Game Over -> restart
    if (isGameOver){
      // rebuild start fresh
      hideOverlays();
      // new world
      initWorld();
      // restore time scale
      try { engine.timing.timeScale = 1; } catch(e){}
      return;
    }

    // Playing -> drop
    if (gameRunning){
      dropPreview();
    }
  }

  // ---------- Resize ----------
  function onResize(){
    // Keep it simple: if running, just resize render viewport.
    if (!render) return;

    const W = window.innerWidth;
    const H = window.innerHeight;

    render.options.width = W;
    render.options.height = H;

    render.canvas.width = W * (window.devicePixelRatio || 1);
    render.canvas.height = H * (window.devicePixelRatio || 1);
    render.canvas.style.width = W + "px";
    render.canvas.style.height = H + "px";

    baseX = W/2;
  }

  // ---------- Boot ----------
  function boot(){
    buildSprites();
    showStart();

    // start banner day/night auto-refresh while on start screen
    setInterval(() => {
      if (!startedOnce && !startScreen.hidden){
        updateStartDayNight();
      }
    }, 30_000);

    window.addEventListener("pointerdown", onTap, { passive:false });
    window.addEventListener("resize", onResize);

    // also allow tapping the start image explicitly (same handler)
    startBtnImg.addEventListener("pointerdown", onTap, { passive:false });
    gameOverScreen.addEventListener("pointerdown", onTap, { passive:false });
  }

  boot();
})();
