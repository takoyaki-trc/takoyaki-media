/* =====================================================
   TAKOYAKI ROTEN - CLEAN JS
   CSS混入ゼロ / 安定版 / 軽量 / 壊れない構成
===================================================== */

(() => {
"use strict";

/* =====================================================
   Storage Keys
===================================================== */

const LS = {
  octo : "roten_v1_octo",
  inv  : "tf_v1_inv",
  book : "tf_v1_book",
  gift : "roten_v1_gift",
  mikuji : "roten_v1_mikuji_day"
};


/* =====================================================
   データ
===================================================== */

const SEEDS = [
 {id:"seed_shop", name:"店頭タネ", unit:18, img:"https://ul.h3z.jp/IjvuhWoY.png"},
 {id:"seed_line", name:"回線タネ", unit:18, img:"https://ul.h3z.jp/AonxB5x7.png"},
 {id:"seed_special", name:"たこぴのタネ", unit:180, img:"https://ul.h3z.jp/29OsEvjf.png"}
];

const WATERS = [
 {id:"water_nice", unit:30, name:"良さ水", img:"https://ul.h3z.jp/3z04ypEd.png"},
 {id:"water_overdo", unit:90, name:"やりすぎ水", img:"https://ul.h3z.jp/vsL9ggf6.png"}
];

const FERTS = [
 {id:"fert_feel", unit:20, name:"気のせい肥料", img:"https://ul.h3z.jp/XqFTb7sw.png"},
 {id:"fert_guts", unit:45, name:"根性肥料", img:"https://ul.h3z.jp/bT9ZcNnS.png"}
];

const SELL_PRICE = {
  N:6, R:18, SR:45, UR:120, LR:220
};


/* =====================================================
   Utils
===================================================== */

const $  = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const load = (k,f)=>JSON.parse(localStorage.getItem(k)||JSON.stringify(f));
const save = (k,v)=>localStorage.setItem(k,JSON.stringify(v));

function toast(msg){
  const t=$("#toast");
  t.innerHTML=msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),1200);
}


/* =====================================================
   Octo
===================================================== */

function getOcto(){ return +localStorage.getItem(LS.octo)||0 }
function setOcto(n){ localStorage.setItem(LS.octo,n) }

function addOcto(n){
  setOcto(getOcto()+n);
  renderHud();
}


/* =====================================================
   Inventory
===================================================== */

function loadInv(){
  return load(LS.inv,{seed:{},water:{},fert:{}});
}

function addInv(type,id,q){
  const inv=loadInv();
  inv[type][id]=(inv[type][id]||0)+q;
  save(LS.inv,inv);
}

function getInv(type,id){
  return loadInv()[type][id]||0;
}


/* =====================================================
   HUD
===================================================== */

function renderHud(){
  $("#octoNow").textContent=getOcto();

  const inv=loadInv();

  const sum = o => Object.values(o).reduce((a,b)=>a+b,0);

  $("#chipSeed").textContent=sum(inv.seed);
  $("#chipWater").textContent=sum(inv.water);
  $("#chipFert").textContent=sum(inv.fert);

  const book=load(LS.book,{got:{}});
  $("#chipDex").textContent=Object.keys(book.got).length;
}


/* =====================================================
   SHOP RENDER
===================================================== */

function renderShop(type){

  const map={
    seed:SEEDS,
    water:WATERS,
    fert:FERTS
  };

  const grid=$("#shopGrid");

  grid.innerHTML = map[type].map(it=>`
    <div class="card">
      <div class="imgbox"><img src="${it.img}"></div>
      <div class="body">
        <div class="name">${it.name}</div>
        所持×${getInv(type,it.id)}
        <div class="actions">
          <button class="qbtn" data-q="1">+1</button>
          <button class="qbtn" data-q="10">+10</button>
          <button class="qbtn" data-q="50">+50</button>
        </div>
      </div>
    </div>
  `).join("");

  grid.querySelectorAll(".card").forEach((card,i)=>{
    const it=map[type][i];
    card.querySelectorAll(".qbtn").forEach(btn=>{
      btn.onclick=()=>{
        const q=+btn.dataset.q;
        const cost=it.unit*q;

        if(getOcto()<cost){
          toast("オクト不足…たこ");
          return;
        }

        addOcto(-cost);
        addInv(type,it.id,q);
        renderHud();
        renderShop(type);
        toast(`${it.name} ×${q} 仕入れた…たこ！`);
      };
    });
  });
}


/* =====================================================
   SELL
===================================================== */

function renderSell(){

  const list=$("#sellList");
  const book=load(LS.book,{got:{}});

  const rows=Object.entries(book.got);

  list.innerHTML="";

  rows.forEach(([id,rec])=>{

    const price=(SELL_PRICE[rec.rarity]||6);

    const div=document.createElement("div");
    div.className="sell-item";

    div.innerHTML=`
      <div class="sell-thumb"><img src="${rec.img||""}"></div>
      <div>
        ${rec.name}<br>
        所持×${rec.count}
        <button data-s="1">1枚</button>
        <button data-s="10">10枚</button>
        <button data-s="all">全部</button>
      </div>
    `;

    div.querySelectorAll("button").forEach(b=>{
      b.onclick=()=>{
        let qty=b.dataset.s==="all"?rec.count:+b.dataset.s;

        qty=Math.min(qty,rec.count);

        rec.count-=qty;
        if(rec.count<=0) delete book.got[id];

        save(LS.book,book);

        addOcto(price*qty);

        toast(`${qty}枚 売却 +${price*qty}🪙`);

        renderSell();
        renderHud();
      };
    });

    list.appendChild(div);
  });
}


/* =====================================================
   Gift
===================================================== */

$("#btnGift").onclick=()=>{
  if(localStorage.getItem(LS.gift)){
    toast("もう受け取り済み…たこ");
    return;
  }

  addInv("seed","seed_shop",10);
  addInv("seed","seed_line",10);
  addInv("water","water_nice",3);
  addInv("fert","fert_feel",3);

  localStorage.setItem(LS.gift,"1");

  toast("プレゼント受け取り完了！");
  renderHud();
};


/* =====================================================
   Mikuji
===================================================== */

$("#btnMikuji").onclick=()=>{
  const today=new Date().toDateString();
  if(localStorage.getItem(LS.mikuji)===today){
    toast("今日はもう引いた…たこ");
    return;
  }

  const gain=Math.random()<0.7?50:200;

  addOcto(gain);

  localStorage.setItem(LS.mikuji,today);

  toast(`みくじ結果 +${gain}🪙`);
};


/* =====================================================
   Tabs
===================================================== */

$$(".tab").forEach(t=>{
  t.onclick=()=>{
    $$(".tabpane").forEach(p=>p.style.display="none");
    $(`.tabpane[data-pane="${t.dataset.tab}"]`).style.display="block";
  };
});

$$(".subtab").forEach(t=>{
  t.onclick=()=>{
    renderShop(t.dataset.sub);
  };
});


/* =====================================================
   Init
===================================================== */

renderHud();
renderShop("seed");
renderSell();

})();


