✅ 3) ttower.js（フル実装）
/* =========================================================
  Takoyaki Tower (Matter.js)
  - Portrait only
  - Base takoyaki fixed as foundation (Floor 1)
  - Tap to start / tap to drop
  - Real physics: gravity + rotation + collisions
  - Bad balance collapses and ends quickly
  - Camera follows tower upward smoothly (Render.lookAt)
  - Height meter (Lv1–Lv100) + level naming
========================================================= */

(() => {
  const {
    Engine, Render, Runner, World, Bodies, Body, Composite, Events, Vector
  } = Matter;

  // ---------- DOM ----------
  const canvas = document.getElementById("world");
  const startScreen = document.getElementById("startScreen");
  const gameOverScreen = document.getElementById("gameOverScreen");
  const goScore = document.getElementById("goScore");
  const goReason = document.getElementById("goReason");

  const floorNumEl = document.getElementById("floorNum");
  const lvNumEl = document.getElementById("lvNum");
  const lvNameEl = document.getElementById("lvName");
  const meterFill = document.getElementById("meterFill");
  const meterText = document.getElementById("meterText");

  const startBtnImg = document.getElementById("startBtnImg");

  // ---------- Game constants ----------
  const MAX_LV = 100;

  // World sizes in "physics units" (pixels)
  const VIEW_W = () => Math.max(320, Math.min(520, window.innerWidth));
  const VIEW_H = () => Math.max(520, window.innerHeight);

  // Base reference
  let baseBody = null;
  let baseWidth = 140;     // updated at init
  let baseX = 0;
  let floorY = 0;

  // Current state
  let engine, runner, render;
  let walls = [];
  let current = null;      // preview / dropping piece
  let currentIsDropped = false;
  let floorCount = 1;      // base = 1
  let bestTopY = 0;        // smallest y (higher = smaller)
  let cameraY = 0;         // camera center
  let gameRunning = false;
  let startedOnce = false;
  let isGameOver = false;

  // For "exclude currently falling one" rule:
  let lastSpawnId = 0;

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
    { lv: 100,name: "伝説：Takoyaki Tower 100階分" },
  ];

  // ---------- Sprite generation (no external assets needed) ----------
  function makePixelSprite(typeKey) {
    const c = document.createElement("canvas");
    c.width = 128; c.height = 128;
    const g = c.getContext("2d");

    // helper
    const px = (x,y,w,h,fill)=>{ g.fillStyle = fill; g.fillRect(x|0,y|0,w|0,h|0); };
    const circle = (cx,cy,r,fill)=>{ g.fillStyle=fill; g.beginPath(); g.arc(cx,cy,r,0,Math.PI*2); g.fill(); };
    const outlineCircle = (cx,cy,r,stroke,w=2)=>{ g.strokeStyle=stroke; g.lineWidth=w; g.beginPath(); g.arc(cx,cy,r,0,Math.PI*2); g.stroke(); };
    const dot = (x,y,fill)=>px(x,y,3,3,fill);

    // base takoyaki body
    const bodyColor = "#c58a52";
    const bodyDark  = "#a46d3f";
    const ink = "#2a1a10";
    const hi  = "#e5c59e";

    // background transparent
    g.imageSmoothingEnabled = false;

    // Takoyaki main (slightly off round)
    circle(64,68,44,bodyColor);
    circle(58,64,40,bodyDark);   // subtle depth
    outlineCircle(64,68,44,ink,3);

    // highlight blob (readability)
    circle(48,52,10,hi);

    // common "bake dots"
    for (let i=0;i<18;i++){
      dot(30 + (i*5)%70, 70 + ((i*13)%30), "#7b4b2a");
    }

    // toppings per type
    const k = typeKey;

    if (k==="SUYAKI"){
      // no sauce
    }
    if (k==="SAUCE"){
      // brown sauce
      px(32,56,64,12,"#5a2f16");
      px(36,66,56,10,"#5a2f16");
      px(42,74,44,8,"#5a2f16");
      // small shine
      px(78,58,10,4,"#7a4425");
    }
    if (k==="SPICY"){
      // darker sauce + bias (heavier on right)
      px(34,56,70,12,"#2b140b");
      px(44,66,62,10,"#2b140b");
      px(54,76,50,8,"#2b140b");
      // drip hint
      px(92,80,10,18,"#2b140b");
    }
    if (k==="MENTA"){
      // menta + mayo stripes bias
      px(34,58,64,10,"#5a2f16");
      px(36,70,58,8,"#5a2f16");
      for (let i=0;i<7;i++){
        px(38+i*10,56+i*4,8,6,"#f3f0e8");
      }
      // small red bits
      for (let i=0;i<12;i++){
        dot(42 + (i*7)%50, 62 + ((i*11)%26), "#d65a4a");
      }
    }
    if (k==="AGEDAMA"){
      // crunchy bumps
      px(34,60,62,10,"#5a2f16");
      for (let i=0;i<22;i++){
        dot(34 + (i*6)%62, 54 + ((i*9)%40), "#e2c07b");
      }
      // mustard mayo blobs
      px(40,52,10,8,"#f3f0e8");
      px(52,62,12,8,"#f3f0e8");
      px(70,70,10,8,"#f3f0e8");
      px(62,52,10,6,"#c7b23a");
    }
    if (k==="NEGI"){
      // wide visual cue: green scatter horizontal
      px(34,60,62,10,"#4b2b16");
      for (let i=0;i<24;i++){
        dot(30 + (i*5)%78, 56 + ((i*7)%34), "#2e7a3b");
      }
      for (let i=0;i<10;i++){
        dot(44 + (i*9)%50, 62 + ((i*10)%20), "#9b6a3f"); // miso spots
      }
    }
    if (k==="CHEESE"){
      // cheese drips (down-weight hint)
      px(34,60,62,10,"#5a2f16");
      px(40,56,56,10,"#f1d76a");
      px(48,66,44,10,"#f1d76a");
      px(56,78,10,20,"#f1d76a");
      px(72,82,8,18,"#f1d76a");
    }
    if (k==="SALT"){
      // small pepper dots
      for (let i=0;i<26;i++){
        dot(38 + (i*7)%54, 54 + ((i*13)%34), "#151515");
      }
      // salt sparks
      for (let i=0;i<18;i++){
        dot(34 + (i*9)%60, 52 + ((i*11)%38), "#f3f0e8");
      }
    }
    if (k==="PIZZA"){
      // oval feel via topping distribution
      px(30,60,72,10,"#5a2f16");
      // cheese + pepperoni bias
      px(36,56,58,10,"#f1d76a");
      for (let i=0;i<7;i++){
        circle(44 + i*8, 70 + (i%2)*4, 5, "#c94c3b");
      }
      // green bits to one side
      for (let i=0;i<10;i++){
        dot(70 + (i*5)%20, 58 + ((i*9)%34), "#2e7a3b");
      }
    }
    if (k==="DONUT"){
      // donut hole (visual trap)
      px(34,60,62,10,"#5a2f16");
      circle(64,70,16,"rgba(0,0,0,.35)");
      outlineCircle(64,70,16,"rgba(0,0,0,.65)",3);
      // glaze ring
      outlineCircle(64,68,36,"rgba(255,255,255,.15)",2);
    }

    // pixel border tick marks (retro)
    px(20,20,88,2,"rgba(255,255,255,.08)");
    px(20,106,88,2,"rgba(255,255,255,.08)");

    return c.toDataURL("image/png");
  }

  // Start image (day/night) also generated so it always works
  function makeStartBanner(isNight=false){
    const c = document.createElement("canvas");
    c.width = 420; c.height = 520;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;

    // bg
    g.fillStyle = isNight ? "#08121f" : "#132235";
    g.fillRect(0,0,c.width,c.height);

    // stars / sun
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

    // title
    g.fillStyle = "rgba(255,255,255,.92)";
    g.font = "900 44px system-ui, sans-serif";
    g.fillText("Takoyaki", 36, 120);
    g.fillText("Tower", 36, 170);

    // tower icon
    const sprite = makePixelSprite("SAUCE");
    const img = new Image();
    img.src = sprite;

    // draw after load synchronously? Use immediate small wait not possible.
    // Instead draw simple stacked circles now:
    const drawTako = (x,y,scale,fill,stroke)=>{
      g.fillStyle = fill; g.beginPath(); g.arc(x,y,38*scale,0,Math.PI*2); g.fill();
      g.strokeStyle = stroke; g.lineWidth = 6*scale; g.beginPath(); g.arc(x,y,38*scale,0,Math.PI*2); g.stroke();
      g.fillStyle="rgba(255,255,255,.22)"; g.beginPath(); g.arc(x-12*scale,y-14*scale,10*scale,0,Math.PI*2); g.fill();
    };

    const ink = "#20120c";
    drawTako(210, 270, 1.1, "#c58a52", ink);
    drawTako(210, 345, 1.0, "#c58a52", ink);
    drawTako(210, 415, 0.92, "#c58a52", ink);

    // caption
    g.fillStyle = "rgba(255,255,255,.88)";
    g.font = "800 18px system-ui, sans-serif";
    g.fillText("Tap the image to start", 96, 485);

    return c.toDataURL("image/png");
  }

  // ---------- Takoyaki type config (collision + physics + trap design) ----------
  // Categories: normal / risky / trap
  const TAKO_TYPES = [
    // Normal-ish
    { key:"SAUCE",  category:"normal", restitution:0.16, friction:0.95, frictionAir:0.020, density:0.00175,
      comShift:{x:0,y:0},
      vertices:[{x:-28,y:-26},{x:30,y:-22},{x:34,y:8},{x:22,y:32},{x:-20,y:30},{x:-34,y:6}]
    },
    { key:"SUYAKI", category:"normal", restitution:0.18, friction:0.70, frictionAir:0.012, density:0.00155,
      comShift:{x:0,y:0},
      vertices:[{x:-30,y:-24},{x:30,y:-24},{x:36,y:6},{x:24,y:32},{x:-24,y:32},{x:-36,y:6}]
    },

    // Risky
    { key:"MENTA", category:"risky", restitution:0.17, friction:0.88, frictionAir:0.016, density:0.00170,
      comShift:{x:2,y:-1},
      vertices:[{x:-28,y:-25},{x:30,y:-23},{x:34,y:8},{x:20,y:33},{x:-22,y:30},{x:-35,y:6}]
    },
    // Wide: good horizontal, bad vertical
    { key:"NEGI", category:"risky", restitution:0.14, friction:0.96, frictionAir:0.020, density:0.00185,
      comShift:{x:0,y:0},
      vertices:[{x:-42,y:-18},{x:42,y:-18},{x:30,y:22},{x:-30,y:22}]
    },
    { key:"PIZZA", category:"risky", restitution:0.16, friction:0.84, frictionAir:0.018, density:0.00175,
      comShift:{x:3,y:0},
      vertices:[{x:-40,y:-16},{x:38,y:-20},{x:44,y:8},{x:26,y:24},{x:-32,y:24},{x:-46,y:2}]
    },
    // Small & bouncy-ish: hard to control
    { key:"SALT", category:"risky", restitution:0.22, friction:0.62, frictionAir:0.012, density:0.00120,
      comShift:{x:0,y:0},
      vertices:[{x:-24,y:-22},{x:22,y:-24},{x:28,y:6},{x:20,y:22},{x:-18,y:24},{x:-28,y:4}]
    },

    // Trap set
    { key:"SPICY", category:"trap", restitution:0.14, friction:0.90, frictionAir:0.022, density:0.00185,
      comShift:{x:4,y:0}, // honest bias
      vertices:[{x:-29,y:-24},{x:28,y:-24},{x:34,y:6},{x:18,y:34},{x:-22,y:30},{x:-36,y:10}]
    },
    { key:"CHEESE", category:"trap", restitution:0.12, friction:1.05, frictionAir:0.024, density:0.00235,
      comShift:{x:0,y:2}, // heavy
      vertices:[{x:-32,y:-22},{x:32,y:-22},{x:36,y:10},{x:14,y:34},{x:-18,y:34},{x:-38,y:8}]
    },
    // Point contact trap (looks round but bottom is尖り気味)
    { key:"AGEDAMA", category:"trap", restitution:0.16, friction:0.72, frictionAir:0.014, density:0.00160,
      comShift:{x:0,y:0},
      vertices:[{x:-26,y:-26},{x:26,y:-26},{x:10,y:18},{x:0,y:30},{x:-10,y:18}]
    },
    // Donut: looks stable, actually slippery & rotation-friendly
    { key:"DONUT", category:"trap", restitution:0.20, friction:0.58, frictionAir:0.010, density:0.00130,
      comShift:{x:2,y:0},
      vertices:[{x:-30,y:-20},{x:30,y:-24},{x:38,y:2},{x:22,y:30},{x:-22,y:30},{x:-38,y:2}]
    },
  ];

  // sprites generated on load
  const SPRITES = {};
  function buildSprites(){
    for (const t of TAKO_TYPES) SPRITES[t.key] = makePixelSprite(t.key);
    // Start screen images (day/night)
    const day = makeStartBanner(false);
    const night = makeStartBanner(true);
    startBtnImg.dataset.day = day;
    startBtnImg.dataset.night = night;
    startBtnImg.src = day;
  }

  // day/night switch helper
  function isNightNow(){
    const h = new Date().getHours();
    return (h < 6 || h >= 18);
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
    // clamp
    const lv = Math.max(1, Math.min(MAX_LV, level));
    const rule = SPAWN_TABLE.find(s => lv>=s.lv[0] && lv<=s.lv[1]) || SPAWN_TABLE[SPAWN_TABLE.length-1];

    const cat = pickByWeight([
      { v:"normal", w: rule.normal },
      { v:"risky",  w: rule.risky  },
      { v:"trap",   w: rule.trap   },
    ]);

    const pool = TAKO_TYPES.filter(t => t.category === cat);
    // slight bias: higher levels slightly prefer trap within the category too
    return pool[(Math.random() * pool.length) | 0];
  }

  // ---------- Create takoyaki body ----------
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

    // Slight random size variance (shapes may be wide/tall/irregular)
    // Keep it subtle for readability.
    const s = scaleMul * (0.92 + Math.random()*0.16);
    Body.scale(body, s, s);

    // Honest bias: shift center of mass slightly (trap/risky)
    if (typeCfg.comShift && (typeCfg.comShift.x || typeCfg.comShift.y)){
      // move center of mass (in local coords)
      const com = { x: typeCfg.comShift.x, y: typeCfg.comShift.y };
      Body.setCentre(body, Vector.add(body.position, com), true);
    }

    // No angle lock. No infinite inertia. No resets.
    // Slight horizontal damping allowed via frictionAir already.

    body.plugin = {
      isCurrent: false,
      spawnId: 0,
      settledFrames: 0
    };

    return body;
  }

  // ---------- Init / Reset ----------
  function destroyIfExists(){
    if (render){
      Render.stop(render);
      render.canvas.remove();
      render.textures = {};
    }
    if (runner) Runner.stop(runner);
    engine = runner = render = null;
    walls = [];
    baseBody = null;
    current = null;
    currentIsDropped = false;
  }

  function initMatter(){
    destroyIfExists();

    const W = window.innerWidth;
    const H = window.innerHeight;

    engine = Engine.create();
    engine.gravity.y = 1; // gravity enabled
    engine.gravity.scale = 0.0011;

    // Render
    render = Render.create({
      element: document.getElementById("gameWrap"),
      canvas,
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

    // Floor and walls
    baseX = W / 2;
    floorY = H - 60;     // visible ground line position

    const ground = Bodies.rectangle(W/2, floorY + 40, W + 800, 120, {
      isStatic: true,
      label: "ground",
      friction: 1.0,
      render: { fillStyle: "rgba(255,255,255,.04)" }
    });

    const leftWall  = Bodies.rectangle(-260, H/2, 520, H + 2000, { isStatic:true, label:"wall", render:{visible:false} });
    const rightWall = Bodies.rectangle(W+260, H/2, 520, H + 2000, { isStatic:true, label:"wall", render:{visible:false} });

    walls = [ground, leftWall, rightWall];
    World.add(engine.world, walls);

    // Base takoyaki (fixed) = Floor 1
    // Make it a bit wider and heavier-looking but static so it never moves.
    const baseCfg = TAKO_TYPES.find(t=>t.key==="SAUCE");
    baseBody = createTakoyakiBody(baseX, floorY - 10, baseCfg, 1.15);
    Body.setStatic(baseBody, true);
    baseBody.label = "base";
    baseBody.render.opacity = 1;
    World.add(engine.world, baseBody);

    // baseWidth estimate from bounds
    baseWidth = (baseBody.bounds.max.x - baseBody.bounds.min.x) * 0.92;

    // Camera init
    bestTopY = baseBody.position.y;
    cameraY = baseBody.position.y - 260;

    // Reset counters
    floorCount = 1;
    isGameOver = false;
    startedOnce = true;
    lastSpawnId = 0;

    updateHUD();

    // Start loops
    Render.run(render);
    Runner.run(runner, engine);

    // Events
    Events.on(engine, "beforeUpdate", onBeforeUpdate);
    Events.on(engine, "afterUpdate", onAfterUpdate);
  }

  function resetGame(){
    initMatter();
    spawnNextPreview(); // create moving piece at top
    gameRunning = true;
  }

  // ---------- Preview movement & Drop ----------
  function spawnNextPreview(){
    if (isGameOver) return;
    if (floorCount >= MAX_LV){
      // reached max (treat as clear)
      endGame("100階到達。…でも物理は終わらない。");
      return;
    }

    // next type by current floor
    const type = pickTakoyakiType(floorCount);

    // spawn above current camera view
    const W = window.innerWidth;
    const topY = cameraY - window.innerHeight*0.45;  // near top of view
    const spawnY = Math.min(bestTopY - 220, topY);

    const b = createTakoyakiBody(baseX, spawnY, type, 1.0);
    b.plugin.isCurrent = true;
    b.plugin.spawnId = ++lastSpawnId;

    // Preview = kinematic-ish:
    // keep it static while sliding to ensure "straight drop" on tap
    Body.setStatic(b, true);
    b.render.opacity = 0.98;

    // Movement params
    b.plugin.movePhase = Math.random() * Math.PI * 2;
    b.plugin.moveSpeed = 0.020 + Math.random()*0.012; // left-right speed

    current = b;
    currentIsDropped = false;
    World.add(engine.world, b);
  }

  function dropCurrent(){
    if (!gameRunning || isGameOver) return;
    if (!current || currentIsDropped) return;

    // Start falling straight down:
    // - Set dynamic
    // - Keep current x as is
    // - Set velocity to zero then let gravity do it
    Body.setStatic(current, false);
    Body.setVelocity(current, { x: 0, y: 0 });
    current.plugin.isCurrent = false; // after drop, it becomes a real piece
    currentIsDropped = true;

    // Immediately spawn next preview after short delay so player sees outcome
    setTimeout(() => {
      if (!isGameOver) spawnNextPreview();
    }, 220);
  }

  // ---------- HUD ----------
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

  // ---------- Camera follow ----------
  function updateCamera(){
    // Find highest piece top
    const bodies = Composite.allBodies(engine.world)
      .filter(b => b.label === "takoyaki" || b.label === "base");

    let top = Infinity;
    for (const b of bodies){
      top = Math.min(top, b.bounds.min.y);
    }
    if (!isFinite(top)) top = baseBody.bounds.min.y;

    // Smoothly follow upward only (no downward chase)
    bestTopY = Math.min(bestTopY, top);

    const targetY = bestTopY + 260; // keep some headroom above tower
    // critically damped-ish
    cameraY += (targetY - cameraY) * 0.06;

    const W = window.innerWidth;
    const H = window.innerHeight;

    // Keep bounds stable width; follow y
    Render.lookAt(render, {
      min: { x: 0, y: cameraY - H/2 },
      max: { x: W, y: cameraY + H/2 }
    });
  }

    // ---------- Height counting (floors) ----------
  // Floor = “安定して積まれた”たこ焼きの数（ピクセルではない）
  // - base は常に Floor1
  // - 落下中（lastDroppedId）は除外
  const SETTLE_V = 0.20;       // 速度しきい値
  const SETTLE_W = 0.06;       // 角速度しきい値
  const SETTLE_FRAMES = 22;    // この連続フレームで“安定”とみなす

  let lastDroppedId = 0;

  function countSettledFloors(){
    if (!engine || isGameOver) return;

    const bodies = Composite.allBodies(engine.world);

    for (const b of bodies){
      if (b.label !== "takoyaki") continue;
      if (!b.plugin) continue;

      // “現在落下中の1個”はカウント対象外（落ちてる最中にスコア入れない）
      if (b.plugin.spawnId === lastDroppedId && !b.plugin.counted) {
        // 落下してきて安定したらカウント対象にする
      }

      // 既にカウント済みならスキップ
      if (b.plugin.counted) continue;

      // 落下直後の1個は、安定判定が通るまでカウントしない
      const v = b.velocity;
      const speed = Math.hypot(v.x, v.y);
      const ang = Math.abs(b.angularVelocity);

      // 地面付近まで落ちているのにベース外なら、先にゲームオーバーになる設計
      // → ここでのカウントは “塔として成立している” ことが前提

      if (speed < SETTLE_V && ang < SETTLE_W){
        b.plugin.settledFrames = (b.plugin.settledFrames || 0) + 1;
      }else{
        b.plugin.settledFrames = 0;
      }

      if (b.plugin.settledFrames >= SETTLE_FRAMES){
        // この時点で “積めた” と認定
        b.plugin.counted = true;
        floorCount += 1;
        updateHUD();

        // 100到達
        if (floorCount >= MAX_LV){
          endGame("100階到達。…でも物理は終わらない。");
          return;
        }
      }
    }
  }

  // ---------- Game over detection ----------
  function checkGameOver(){
    if (!engine || isGameOver) return;

    const W = window.innerWidth;
    const H = window.innerHeight;

    const bodies = Composite.allBodies(engine.world);

    // ベース許容範囲（左右）
    const leftLimit  = baseX - baseWidth/2;
    const rightLimit = baseX + baseWidth/2;

    for (const b of bodies){
      // 落下中の“現在の1個”は除外（仕様）
      if (b.label === "takoyaki" && b.plugin && b.plugin.spawnId === lastDroppedId && !b.plugin.counted){
        // ただし「画面外へ消える」場合は即死（安全策）
        if (b.position.y > (cameraY + H/2 + 1100)) {
          endGame("落下が深すぎる。塔は戻らない。");
          return;
        }
        continue;
      }

      // ベース自体は除外
      if (b.label === "base") continue;

      // 対象：積まれたたこ焼き
      if (b.label === "takoyaki"){
        // ① 地面近くまで落ちた AND ベース幅の外 → 即ゲームオーバー
        const nearFloor = (b.position.y >= floorY + 10); // “床に近い”判定
        const outOfBase = (b.position.x < leftLimit || b.position.x > rightLimit);

        if (nearFloor && outOfBase){
          endGame("ベース外へ落下。崩壊確定。");
          return;
        }

        // ② 安全策：視界のはるか下へ消える → ゲームオーバー
        if (b.position.y > (cameraY + H/2 + 1400)){
          endGame("視界の外へ消えた。終わり。");
          return;
        }
      }
    }
  }

  // ---------- Update loop hooks ----------
  function onBeforeUpdate(){
    if (!gameRunning || isGameOver) return;

    // Start画面の昼夜更新はここでは不要（Start中だけ）
    // プレビュー左右移動
    if (current && !currentIsDropped && current.isStatic){
      const W = window.innerWidth;

      // 左右往復（サイン波）＋少しランダム
      const t = (engine.timing.timestamp || 0) * (current.plugin.moveSpeed || 0.02);
      const amp = Math.min(160, W * 0.24); // 画面幅に依存
      const x = baseX + Math.sin(t + (current.plugin.movePhase || 0)) * amp;

      Body.setPosition(current, { x, y: current.position.y });
      Body.setAngle(current, 0); // プレビュー中は角度固定（落下後に物理で回る）
    }
  }

  function onAfterUpdate(){
    if (!gameRunning || isGameOver) return;

    // 塔のトップに合わせてカメラ追従
    updateCamera();

    // “積めた”判定でフロア加算
    countSettledFloors();

    // 崩壊（ベース外落下）判定
    checkGameOver();
  }

  // ---------- End / UI ----------
  function endGame(reason){
    if (isGameOver) return;
    isGameOver = true;
    gameRunning = false;

    // 物理を止める（余韻は短く、即終わる）
    try{
      engine.timing.timeScale = 0;
    }catch(e){}

    // UI
    gameOverScreen.hidden = false;
    goScore.textContent = `${floorCount} 階`;
    goReason.textContent = reason || "崩壊。";

    // ついでに current を無効化
    current = null;
    currentIsDropped = false;
  }

  function hideAllOverlays(){
    startScreen.hidden = true;
    gameOverScreen.hidden = true;
  }

  function showStart(){
    startScreen.hidden = false;
    gameOverScreen.hidden = true;
    updateStartDayNight();
  }

  // ---------- Input ----------
  function onTap(e){
    // スクロール抑止（スマホ）
    if (e && e.cancelable) e.preventDefault();

    // Start前
    if (!gameRunning && !startedOnce){
      hideAllOverlays();
      resetGame();
      return;
    }

    // GameOver中 → リスタート
    if (isGameOver){
      // 物理再初期化
      gameOverScreen.hidden = true;
      resetGame();
      // timeScale を戻す
      try{ engine.timing.timeScale = 1; }catch(e){}
      return;
    }

    // プレイ中：ドロップ
    if (gameRunning){
      dropCurrent();
    }
  }

  // ---------- Drop hook (remember falling piece id) ----------
  const _dropCurrent = dropCurrent;
  dropCurrent = function(){
    if (!gameRunning || isGameOver) return;
    if (!current || currentIsDropped) return;

    // 落下中として記録（この1個は “落ちてる最中” はゲームオーバー判定から除外）
    if (current.plugin && current.plugin.spawnId){
      lastDroppedId = current.plugin.spawnId;
    }

    _dropCurrent();
  };

  // ---------- Resize ----------
  function onResize(){
    // ゲーム中にウィンドウサイズが変わると地獄になりやすいので、
    // ここでは “見た目だけ” 対応し、物理はリセットしない。
    if (!render) return;

    const W = window.innerWidth;
    const H = window.innerHeight;

    render.options.width = W;
    render.options.height = H;
    render.canvas.width = W * (window.devicePixelRatio || 1);
    render.canvas.height = H * (window.devicePixelRatio || 1);
    render.canvas.style.width = W + "px";
    render.canvas.style.height = H + "px";

    // baseX は画面中央の“見た目”として維持
    baseX = W/2;

    // カメラは次の afterUpdate で追従
  }

  // ---------- Boot ----------
  function boot(){
    buildSprites();
    showStart();

    // Start画面は昼夜で変える
    updateStartDayNight();
    setInterval(() => {
      if (!gameRunning && !startedOnce && !startScreen.hidden){
        updateStartDayNight();
      }
    }, 30_000);

    // タップ受付（画面どこでも）
    // passive:false で preventDefault を効かせる
    window.addEventListener("pointerdown", onTap, { passive:false });

    // リサイズ
    window.addEventListener("resize", onResize);

    // Start画像クリックでも開始したい場合（保険）
    startBtnImg.addEventListener("pointerdown", (e) => {
      if (e && e.cancelable) e.preventDefault();
      onTap(e);
    }, { passive:false });

    // GameOver画面もタップで再開できるように
    gameOverScreen.addEventListener("pointerdown", (e) => {
      if (e && e.cancelable) e.preventDefault();
      onTap(e);
    }, { passive:false });
  }

  boot();

})();

