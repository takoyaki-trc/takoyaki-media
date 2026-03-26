(() => {
  "use strict";

  const WEATHER_KEY = "trc_weather_state_v1";

  const WEATHER_LABELS = {
    clear: "☀ 晴れ",
    cloudy: "☁ 曇り",
    rain: "☔ 雨",
    thunder: "⚡ 雷雨",
    snow: "❄ 雪",
    fog: "🌫 霧",
    sakura: "🌸 桜",
    meteor: "🌠 流れ星"
  };

  function nowTokyo(){
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  }

  function pad2(n){
    return String(n).padStart(2, "0");
  }

  function getSeason(month){
    if (month === 3 || month === 4) return "spring";
    if (month >= 5 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "autumn";
    return "winter";
  }

  function seededNumber(seedStr){
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }

  function random01(seedStr){
    return seededNumber(seedStr) / 4294967295;
  }

  function pickWeighted(seedStr, list){
    const total = list.reduce((sum, item) => sum + Number(item.weight || 0), 0);
    if (total <= 0) return list[0]?.type || "clear";

    let r = random01(seedStr) * total;
    for (const item of list) {
      r -= Number(item.weight || 0);
      if (r <= 0) return item.type;
    }
    return list[list.length - 1]?.type || "clear";
  }

  function getWeatherState(now){
    const year  = now.getFullYear();
    const month = now.getMonth() + 1;
    const day   = now.getDate();
    const hour  = now.getHours();
    const slot  = Math.floor(hour / 3);
    const season = getSeason(month);
    const night = (hour >= 20 || hour < 5);
    const early = (hour < 10);

    const seed = `${year}-${pad2(month)}-${pad2(day)}-${slot}-${season}`;
    const extra = random01(seed + "-extra");

    let table;

    if (season === "spring") {
      table = [
        { type: "clear",   weight: 28 },
        { type: "cloudy",  weight: 18 },
        { type: "rain",    weight: 16 },
        { type: "fog",     weight: 10 },
        { type: "sakura",  weight: 18 },
        { type: "thunder", weight: 4  },
        { type: "snow",    weight: early ? 4 : 0  },
        { type: "meteor",  weight: night ? 2 : 0 }
      ];
    } else if (season === "summer") {
      table = [
        { type: "clear",   weight: 30 },
        { type: "cloudy",  weight: 16 },
        { type: "rain",    weight: 20 },
        { type: "thunder", weight: 14 },
        { type: "fog",     weight: 6  },
        { type: "snow",    weight: 0  },
        { type: "sakura",  weight: 0  },
        { type: "meteor",  weight: night ? 4 : 0 }
      ];
    } else if (season === "autumn") {
      table = [
        { type: "clear",   weight: 24 },
        { type: "cloudy",  weight: 22 },
        { type: "rain",    weight: 18 },
        { type: "fog",     weight: 16 },
        { type: "thunder", weight: 6  },
        { type: "snow",    weight: 0  },
        { type: "sakura",  weight: 0  },
        { type: "meteor",  weight: night ? 5 : 0 }
      ];
    } else {
      table = [
        { type: "clear",   weight: 18 },
        { type: "cloudy",  weight: 20 },
        { type: "rain",    weight: 10 },
        { type: "fog",     weight: 10 },
        { type: "snow",    weight: 28 },
        { type: "thunder", weight: 3  },
        { type: "sakura",  weight: 0  },
        { type: "meteor",  weight: night ? 4 : 0 }
      ];
    }

    let result = pickWeighted(seed, table);

    if (result === "rain" && extra < 0.22) {
      result = "thunder";
    }

    return result;
  }

  function ensureWeatherUI(){
    let layer = document.getElementById("weatherLayer");
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "weatherLayer";
      layer.setAttribute("aria-hidden", "true");
      document.body.appendChild(layer);
    }

    let label = document.getElementById("weatherLabel");
    if (!label) {
      label = document.createElement("div");
      label.id = "weatherLabel";
      label.className = "weather-label";
      label.setAttribute("aria-hidden", "true");
      document.body.appendChild(label);
    }

    return { layer, label };
  }

  function injectWeatherCSS(){
    if (document.getElementById("weather-js-style")) return;

    const style = document.createElement("style");
    style.id = "weather-js-style";
    style.textContent = `
      #weatherLayer{
        position:fixed;
        inset:0;
        pointer-events:none;
        z-index:12;
        overflow:hidden;
      }

      .weather-particle{
        position:absolute;
        top:-14vh;
        will-change:transform, opacity;
      }

      .weather-rain{
        width:2px;
        border-radius:999px;
        background:linear-gradient(to bottom, rgba(255,255,255,0), rgba(210,235,255,.9));
        animation: trcRainFall linear infinite;
        filter:drop-shadow(0 0 3px rgba(180,220,255,.35));
      }

      .weather-snow{
        border-radius:50%;
        background:rgba(255,255,255,.95);
        box-shadow:0 0 8px rgba(255,255,255,.4);
        animation: trcSnowFall linear infinite;
      }

      .weather-sakura{
        width:10px;
        height:8px;
        border-radius:80% 20% 70% 30%;
        background:rgba(255,188,214,.95);
        box-shadow:0 0 8px rgba(255,188,214,.25);
        animation: trcSakuraFall linear infinite;
        transform: rotate(18deg);
      }

      .weather-fog-band{
        position:absolute;
        left:-10%;
        width:120%;
        border-radius:999px;
        background:linear-gradient(to right,
          rgba(255,255,255,0),
          rgba(255,255,255,.12),
          rgba(255,255,255,.18),
          rgba(255,255,255,.12),
          rgba(255,255,255,0)
        );
        filter:blur(8px);
        animation: trcFogMove linear infinite;
      }

      .weather-cloud{
        position:absolute;
        width:140px;
        height:52px;
        border-radius:999px;
        background:rgba(255,255,255,.16);
        filter:blur(2px);
        animation: trcCloudMove linear infinite;
      }

      .weather-cloud::before,
      .weather-cloud::after{
        content:"";
        position:absolute;
        border-radius:50%;
        background:rgba(255,255,255,.16);
      }

      .weather-cloud::before{
        width:54px;
        height:54px;
        left:18px;
        top:-18px;
      }

      .weather-cloud::after{
        width:62px;
        height:62px;
        right:20px;
        top:-24px;
      }

      .weather-meteor{
        position:absolute;
        width:90px;
        height:2px;
        border-radius:999px;
        background:linear-gradient(to left, rgba(255,255,255,.95), rgba(255,255,255,0));
        filter:drop-shadow(0 0 6px rgba(255,255,255,.38));
        animation: trcMeteor linear infinite;
      }

      .weather-flash{
        position:absolute;
        inset:0;
        background:rgba(255,255,255,.22);
        opacity:0;
        animation: trcFlash 7s linear infinite;
      }

      .weather-label{
        position:fixed;
        left:50%;
        bottom:14px;
        transform:translateX(-50%);
        z-index:14;
        pointer-events:none;
        padding:8px 12px;
        border-radius:999px;
        border:1px solid rgba(255,255,255,.14);
        background:rgba(0,0,0,.28);
        backdrop-filter:blur(6px);
        -webkit-backdrop-filter:blur(6px);
        color:rgba(255,255,255,.88);
        font-size:12px;
        font-weight:800;
        letter-spacing:.03em;
        opacity:0;
        transition:opacity .25s ease;
        white-space:nowrap;
      }

      .weather-label.show{
        opacity:1;
      }

      @keyframes trcRainFall{
        0%   { transform:translate3d(0,0,0) rotate(13deg); opacity:0; }
        8%   { opacity:.95; }
        100% { transform:translate3d(-18vw,120vh,0) rotate(13deg); opacity:0; }
      }

      @keyframes trcSnowFall{
        0%   { transform:translate3d(0,0,0); opacity:0; }
        10%  { opacity:.95; }
        50%  { transform:translate3d(18px,50vh,0); }
        100% { transform:translate3d(-14px,120vh,0); opacity:0; }
      }

      @keyframes trcSakuraFall{
        0%   { transform:translate3d(0,0,0) rotate(12deg); opacity:0; }
        10%  { opacity:.95; }
        50%  { transform:translate3d(26px,50vh,0) rotate(180deg); }
        100% { transform:translate3d(-18px,120vh,0) rotate(330deg); opacity:0; }
      }

      @keyframes trcFogMove{
        0%   { transform:translateX(-8%); opacity:0; }
        10%  { opacity:.8; }
        50%  { opacity:.95; }
        100% { transform:translateX(8%); opacity:0; }
      }

      @keyframes trcCloudMove{
        0%   { transform:translateX(-18vw); opacity:0; }
        10%  { opacity:.8; }
        100% { transform:translateX(118vw); opacity:0; }
      }

      @keyframes trcMeteor{
        0%   { transform:translate3d(0,0,0) rotate(-22deg); opacity:0; }
        8%   { opacity:1; }
        100% { transform:translate3d(-42vw,32vh,0) rotate(-22deg); opacity:0; }
      }

      @keyframes trcFlash{
        0%, 9%, 11%, 58%, 60%, 100% { opacity:0; }
        10% { opacity:.52; }
        59% { opacity:.28; }
      }

      @media (prefers-reduced-motion: reduce){
        .weather-particle,
        .weather-fog-band,
        .weather-cloud,
        .weather-meteor,
        .weather-flash{
          animation:none !important;
          opacity:.18 !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function showWeatherLabel(text){
    const { label } = ensureWeatherUI();
    label.textContent = text || "";
    label.classList.add("show");
    clearTimeout(showWeatherLabel._timer);
    showWeatherLabel._timer = setTimeout(() => {
      label.classList.remove("show");
    }, 2400);
  }

  function clearWeatherLayer(){
    const { layer } = ensureWeatherUI();
    layer.innerHTML = "";
  }

  function addRain(layer, isThunder){
    const count = isThunder ? 72 : 56;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("span");
      p.className = "weather-particle weather-rain";
      p.style.left = `${Math.random() * 100}%`;
      p.style.height = `${34 + Math.random() * 38}px`;
      p.style.animationDuration = `${0.65 + Math.random() * 0.7}s`;
      p.style.animationDelay = `${Math.random() * -8}s`;
      p.style.opacity = `${0.28 + Math.random() * 0.45}`;
      layer.appendChild(p);
    }

    if (isThunder) {
      const flash = document.createElement("div");
      flash.className = "weather-flash";
      layer.appendChild(flash);
    }
  }

  function addSnow(layer){
    for (let i = 0; i < 34; i++) {
      const p = document.createElement("span");
      p.className = "weather-particle weather-snow";
      const size = 4 + Math.random() * 7;
      p.style.left = `${Math.random() * 100}%`;
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.animationDuration = `${4.5 + Math.random() * 4.8}s`;
      p.style.animationDelay = `${Math.random() * -10}s`;
      p.style.opacity = `${0.45 + Math.random() * 0.4}`;
      layer.appendChild(p);
    }
  }

  function addSakura(layer){
    for (let i = 0; i < 28; i++) {
      const p = document.createElement("span");
      p.className = "weather-particle weather-sakura";
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDuration = `${5 + Math.random() * 4}s`;
      p.style.animationDelay = `${Math.random() * -10}s`;
      p.style.opacity = `${0.5 + Math.random() * 0.35}`;
      layer.appendChild(p);
    }
  }

  function addFog(layer){
    for (let i = 0; i < 5; i++) {
      const band = document.createElement("div");
      band.className = "weather-fog-band";
      band.style.top = `${12 + i * 17}%`;
      band.style.height = `${36 + Math.random() * 26}px`;
      band.style.animationDuration = `${12 + Math.random() * 8}s`;
      band.style.animationDelay = `${Math.random() * -6}s`;
      band.style.opacity = `${0.3 + Math.random() * 0.35}`;
      layer.appendChild(band);
    }
  }

  function addCloudy(layer){
    for (let i = 0; i < 7; i++) {
      const cloud = document.createElement("div");
      cloud.className = "weather-cloud";
      cloud.style.top = `${8 + Math.random() * 26}%`;
      cloud.style.left = `${-20 - Math.random() * 20}%`;
      cloud.style.transform = `scale(${0.7 + Math.random() * 0.9})`;
      cloud.style.animationDuration = `${18 + Math.random() * 16}s`;
      cloud.style.animationDelay = `${Math.random() * -12}s`;
      cloud.style.opacity = `${0.3 + Math.random() * 0.25}`;
      layer.appendChild(cloud);
    }
  }

  function addMeteor(layer){
    const count = 3;
    for (let i = 0; i < count; i++) {
      const m = document.createElement("div");
      m.className = "weather-meteor";
      m.style.top = `${10 + Math.random() * 18}%`;
      m.style.left = `${55 + Math.random() * 30}%`;
      m.style.animationDuration = `${3.5 + Math.random() * 2.5}s`;
      m.style.animationDelay = `${Math.random() * -8}s`;
      layer.appendChild(m);
    }
  }

  function renderWeather(type){
    injectWeatherCSS();
    const { layer } = ensureWeatherUI();

    layer.innerHTML = "";
    layer.dataset.weather = type;

    if (type === "clear") return;
    if (type === "cloudy") {
      addCloudy(layer);
      return;
    }
    if (type === "rain") {
      addRain(layer, false);
      return;
    }
    if (type === "thunder") {
      addCloudy(layer);
      addRain(layer, true);
      return;
    }
    if (type === "snow") {
      addSnow(layer);
      return;
    }
    if (type === "fog") {
      addFog(layer);
      return;
    }
    if (type === "sakura") {
      addSakura(layer);
      return;
    }
    if (type === "meteor") {
      addMeteor(layer);
    }
  }

  function applyWeather(forceLabel = false){
    const now = nowTokyo();
    const type = getWeatherState(now);
    const prev = localStorage.getItem(WEATHER_KEY);

    renderWeather(type);

    if (forceLabel || prev !== type) {
      showWeatherLabel(WEATHER_LABELS[type] || type);
      localStorage.setItem(WEATHER_KEY, type);
    }
  }

  window.TRCWeather = {
    apply: applyWeather,
    getCurrentType(){
      return localStorage.getItem(WEATHER_KEY) || "clear";
    },
    recalc(){
      applyWeather(true);
    },
    clear(){
      clearWeatherLayer();
      localStorage.removeItem(WEATHER_KEY);
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    applyWeather(false);
    setInterval(() => applyWeather(false), 20 * 1000);
  });

  window.addEventListener("pageshow", () => {
    applyWeather(false);
  });
})();
