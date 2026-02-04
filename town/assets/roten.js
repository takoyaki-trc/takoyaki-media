/* =========================================================
   roten.js  完全版
   露店システム本体（takofarmと完全分離）
========================================================= */

(() => {




/* =====================================================
   定数
===================================================== */

const LS = {
  octo: "roten_v1_octo",
  state: "roten_v1_state",
  gift: "roten_v1_first_gift",
  mikuji: "roten_v1_mikuji_day",
  book: "tf_v1_book",
  inv: "tf_v1_inv"
};

const RARITIES = ["N","R","SR","UR","LR"];

const BASE_PRICE = {
  N:40,
  R:80,
  SR:150,
  UR:300,
  LR:600
};

const UPDATE_MIN = 15;




/* =====================================================
   util
===================================================== */

const $ = s => document.querySelector(s);

function load(key, def){
  try{
    return JSON.parse(localStorage.getItem(key)) ?? def;
  }catch{
    return def;
  }
}
function save(key,val){
  localStorage.setItem(key,JSON.stringify(val));
}




/* =====================================================
   オクト通貨
===================================================== */

function getOcto(){
  return +localStorage.getItem(LS.octo) || 0;
}

function setOcto(v){
  localStorage.setItem(LS.octo, v);
  renderMoney();
}

function addOcto(v){
  setOcto(getOcto()+v);
}

function renderMoney(){
  const el = $(".roten-money span");
  if(el) el.textContent = getOcto();
}




/* =====================================================
   相場システム
===================================================== */

let state = load(LS.state, null);

if(!state) initMarket();

function initMarket(){
  state = {
    next: nextTick(),
    rates: randomRates(),
    history: {}
  };
  save(LS.state,state);
}

function nextTick(){
  const now = new Date();
  const m = now.getMinutes();
  const next = Math.ceil(m/UPDATE_MIN)*UPDATE_MIN;
  now.setMinutes(next,0,0);
  return now.getTime();
}

function randomRates(){
  const r = {};
  RARITIES.forEach(k=>{
    r[k] = +(0.85 + Math.random()*0.3).toFixed(2); // ±15%
  });
  return r;
}

function updateMarket(){
  if(Date.now() >= state.next){
    state.rates = randomRates();
    state.next = nextTick();
    save(LS.state,state);
    renderChart();
  }
}

setInterval(updateMarket, 1000);




/* =====================================================
   チャート描画（軽量）
===================================================== */

let currentRare = "SR";

function renderChart(){

  const cvs = $(".roten-chart");
  if(!cvs) return;

  const ctx = cvs.getContext("2d");

  cvs.width = cvs.clientWidth;
  cvs.height = cvs.clientHeight;

  ctx.clearRect(0,0,cvs.width,cvs.height);

  const rate = state.rates[currentRare];
  const price = Math.floor(BASE_PRICE[currentRare]*rate);

  $(".roten-market-title").textContent =
    `${currentRare} 相場 ${price}🪙 (×${rate})`;

  ctx.strokeStyle="#7cffb2";
  ctx.lineWidth=2;
  ctx.beginPath();

  let y=cvs.height/2;

  for(let x=0;x<cvs.width;x+=10){
    y+= (Math.random()-.5)*8;
    ctx.lineTo(x,y);
  }
  ctx.stroke();
}




/* =====================================================
   レア切替
===================================================== */

function setupRareButtons(){
  document.querySelectorAll(".roten-chip").forEach(btn=>{
    btn.onclick = ()=>{
      document.querySelectorAll(".roten-chip").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      currentRare = btn.dataset.r;
      renderChart();
      showSell(); // 売却リスト再描画
    };
  });
}




/* =====================================================
   タブ切替
===================================================== */

function setupTabs(){
  document.querySelectorAll(".roten-tab").forEach(btn=>{
    btn.onclick=()=>{
      document.querySelectorAll(".roten-tab").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      const t = btn.dataset.tab;

      if(t==="buy") showBuy();
      if(t==="sell") showSell();
      if(t==="inv") showInv();
    };
  });
}




/* =====================================================
   仕入れ
===================================================== */

function addInv(type,id,n){
  const inv = load(LS.inv,{seed:{},water:{},fert:{}});
  inv[type][id] = (inv[type][id]||0)+n;
  save(LS.inv,inv);
}

function showBuy(){

  const wrap = $(".roten-content");
  wrap.innerHTML="";

  const items = [
    ["seed","店頭タネ",30],
    ["water","水",20],
    ["fert","肥料",20]
  ];

  items.forEach(([type,name,price])=>{

    const row = createRow(name,price,()=>{
      if(getOcto()<price) return;
      addOcto(-price);
      addInv(type,name,1);
      toast(`✨ ${name} 仕入れた…たこ！`);
    });

    wrap.appendChild(row);
  });
}




/* =====================================================
   売却（ダブりのみ）
===================================================== */

function showSell(){

  const wrap = $(".roten-content");
  wrap.innerHTML="";

  const book = load(LS.book,{got:{}}).got;

  Object.entries(book).forEach(([id,data])=>{

    if(data.rare !== currentRare) return;
    if(data.count <= 1) return;

    const sellable = data.count-1;

    const rate = state.rates[currentRare];
    const price = Math.floor(BASE_PRICE[currentRare]*rate);

    const row = createRow(
      `${data.name} ×${sellable}`,
      price,
      ()=>{
        data.count--;
        addOcto(price);
        save(LS.book,{got:book});
        toast(`✨ 売却した…たこ！`);
        showSell();
      },
      "sell"
    );

    wrap.appendChild(row);
  });
}




/* =====================================================
   在庫
===================================================== */

function showInv(){

  const wrap = $(".roten-content");
  wrap.innerHTML="在庫確認モード（ここに資材/図鑑表示追加可）";
}




/* =====================================================
   行UI生成
===================================================== */

function createRow(name,price,fn,mode="buy"){

  const row=document.createElement("div");
  row.className="roten-row";

  row.innerHTML=`
    <div class="roten-name">${name}</div>
    <div class="roten-price">${price}🪙</div>
  `;

  const btn=document.createElement("button");
  btn.className=`roten-btn ${mode}`;
  btn.textContent = mode==="sell" ? "換金" : "仕入れる…たこ";
  btn.onclick = fn;

  row.appendChild(btn);
  return row;
}




/* =====================================================
   トースト
===================================================== */

function toast(msg){
  const t=$(".roten-toast");
  t.textContent=msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),1200);
}




/* =====================================================
   みくじ（1日1回）
===================================================== */

function checkMikuji(){
  const today = new Date().toDateString();
  const last = localStorage.getItem(LS.mikuji);

  if(last===today) return;

  localStorage.setItem(LS.mikuji,today);
  addOcto(50);
  toast("🎉 たこ焼きみくじ +50🪙");
}




/* =====================================================
   初回プレゼント
===================================================== */

function firstGift(){

  if(localStorage.getItem(LS.gift)) return;

  localStorage.setItem(LS.gift,"1");

  addInv("seed","店頭タネ",10);
  addInv("seed","回線タネ",10);
  addInv("water","水",3);
  addInv("fert","肥料",3);

  toast("🎁 たこぴからプレゼント！");
}




/* =====================================================
   初期化
===================================================== */

window.addEventListener("DOMContentLoaded",()=>{

  renderMoney();
  renderChart();

  setupRareButtons();
  setupTabs();

  firstGift();
  checkMikuji();

  showBuy();
});

})();



