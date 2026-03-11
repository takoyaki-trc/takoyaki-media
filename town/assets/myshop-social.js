(() => {
"use strict";

const LS_KEY = "roten_v1_guest_affection";

/* ===============================
   ユーティリティ
================================*/

function shuffle(arr){
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function normalizeDelta(d){
  if(d>0) return 1;
  if(d<0) return -1;
  return 0;
}

function clamp(n,min,max){
  return Math.max(min,Math.min(max,n));
}

function pick(arr){
  return arr[Math.floor(Math.random()*arr.length)];
}

function safeJSON(raw,fallback){
  try{return JSON.parse(raw);}
  catch(e){return fallback;}
}

/* ===============================
   状態管理
================================*/

function loadState(){
  const raw=localStorage.getItem(LS_KEY);
  const parsed=safeJSON(raw,null);

  if(!parsed||typeof parsed!=="object"){
    return{ver:1,guests:{}};
  }

  if(!parsed.guests) parsed.guests={};

  return parsed;
}

function saveState(s){
  localStorage.setItem(LS_KEY,JSON.stringify(s));
}

function getGuestState(id){
  const s=loadState();
  if(!s.guests[id]){
    return{
      love:0,
      talkCount:0,
      buyCount:0,
      ignoreCount:0,
      lastTalkAt:0,
      lastSeenAt:0
    };
  }
  return s.guests[id];
}

function patchGuest(id,patch){

  const s=loadState();

  if(!s.guests[id]){
    s.guests[id]={
      love:0,
      talkCount:0,
      buyCount:0,
      ignoreCount:0,
      lastTalkAt:0,
      lastSeenAt:0
    };
  }

  Object.assign(s.guests[id],patch||{});

  s.guests[id].love=clamp(Number(s.guests[id].love||0),0,100);

  saveState(s);

  return s.guests[id];
}

/* ===============================
   好感度UI
================================*/

function heartsFromLove(love){

  if(love>=80) return 5;
  if(love>=60) return 4;
  if(love>=40) return 3;
  if(love>=20) return 2;
  if(love>=8) return 1;

  return 0;
}

/* ===============================
   会話
================================*/

let els={
modal:null,
guestName:null,
guestMood:null,
timer:null,
message:null,
c1:null,
c2:null,
c3:null
};

let activeTalk=null;
let countdownTimer=null;

function bindEls(){

  els.modal=document.getElementById("talkModal");
  els.guestName=document.getElementById("talkGuestName");
  els.guestMood=document.getElementById("talkGuestMood");
  els.timer=document.getElementById("talkTimer");
  els.message=document.getElementById("talkMessage");
  els.c1=document.getElementById("talkChoice1");
  els.c2=document.getElementById("talkChoice2");
  els.c3=document.getElementById("talkChoice3");
}

function openTalkModal(){
  if(!els.modal) return;

  els.modal.classList.add("show");
  els.modal.setAttribute("aria-hidden","false");
  document.body.classList.add("noscroll");
}

function closeTalkModal(){
  if(!els.modal) return;

  els.modal.classList.remove("show");
  els.modal.setAttribute("aria-hidden","true");
  document.body.classList.remove("noscroll");
}

/* ===============================
   会話終了
================================*/

function finishTalk(){

  activeTalk=null;

  if(countdownTimer){
    clearInterval(countdownTimer);
    countdownTimer=null;
  }

  closeTalkModal();
}

/* ===============================
   選択肢処理
================================*/

function applyChoice(choice){

  if(!activeTalk) return;

  const guestId=activeTalk.guestId;
  const guestName=activeTalk.guestName;

  const prev=getGuestState(guestId);

  const delta=normalizeDelta(choice.delta);

  const nextLove=clamp(prev.love+delta,0,100);

  patchGuest(guestId,{
    love:nextLove,
    talkCount:prev.talkCount+1,
    lastTalkAt:Date.now(),
    lastSeenAt:Date.now()
  });

  if(els.message){
    els.message.textContent=choice.reply||"……";
  }

  setTimeout(()=>{
    finishTalk();
  },1000);
}

/* ===============================
   会話開始
================================*/

function startConversation(ctx){

  bindEls();

  const guestId=ctx.guestId;
  const guestName=ctx.guestName||guestId;

  const ev=pick(ctx.pool);

  const deadlineAt=Date.now()+10000;

  activeTalk={
    guestId,
    guestName,
    event:ev,
    deadlineAt
  };

  if(els.guestName) els.guestName.textContent=guestName;
  if(els.message) els.message.textContent=ev.ask;

  if(els.guestMood) els.guestMood.textContent=ev.mood||"";

  const choices=shuffle(ev.choices||[]);

  const c1=choices[0];
  const c2=choices[1];
  const c3=choices[2];

  els.c1.textContent=c1.text;
  els.c2.textContent=c2.text;
  els.c3.textContent=c3.text;

  els.c1.onclick=()=>applyChoice(c1);
  els.c2.onclick=()=>applyChoice(c2);
  els.c3.onclick=()=>applyChoice(c3);

  openTalkModal();

  if(els.timer) els.timer.textContent="10s";

  countdownTimer=setInterval(()=>{

    const remain=Math.max(0,Math.ceil((deadlineAt-Date.now())/1000));

    if(els.timer) els.timer.textContent=remain+"s";

    if(remain<=0){
      finishTalk();
    }

  },200);
}

/* ===============================
   来店時トリガー
================================*/

function maybeStartConversation(ctx){

  if(!ctx||!ctx.guestId) return false;

  if(activeTalk) return false;

  setTimeout(()=>{
    startConversation(ctx);
  },2000);

  return true;
}

/* ===============================
   購入成功
================================*/

function onPurchaseSuccess(guestId){

  const g=getGuestState(guestId);

  patchGuest(guestId,{
    love:clamp(g.love+1,0,100),
    buyCount:g.buyCount+1,
    lastSeenAt:Date.now()
  });
}

/* ===============================
   API
================================*/

function init(){
  bindEls();
  return true;
}

window.RotenSocial={
init,
maybeStartConversation,
onPurchaseSuccess
};

})();
