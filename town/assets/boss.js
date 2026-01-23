/* =========================
   boss.js（最終・安全版）
   ボス：画像タップ → 会話 → バトル（1日1回）
   仕様：
   - カードは端末ごとにランダム
   - 「その日最初に引いたカード」は即固定（1回目からブレない）
   - 初回バトルで「カード/結果/点数」を保存
   - 2回目以降は保存内容を表示（同じカード/同じ結果）
   夜判定：html.is-night に統一
   追加：
   - ゲートモーダルが開いてたら閉じる
   - talk/overlay を body 最後尾へ移動して最前面固定
   - z-index を JS でも強制（CSSが負けても勝つ）
========================= */
(() => {


  // ===== 読み込み確認（これが出なければboss.jsが読めてない） =====
  (function(){
    const id = "bossDebugBadge";
    if (document.getElementById(id)) return;
    const b = document.createElement("div");
    b.id = id;
    b.textContent = "boss.js LOADED ✅";
    b.style.position = "fixed";
    b.style.left = "10px";
    b.style.bottom = "10px";
    b.style.zIndex = "999999";
    b.style.background = "#000";
    b.style.color = "#fff";
    b.style.border = "2px solid #fff";
    b.style.padding = "6px 8px";
    b.style.fontSize = "12px";
    document.body.appendChild(b);
  })();




   

  /* ---------- 夜ガード（統一） ---------- */
  function isNightNow(){
    return document.documentElement.classList.contains("is-night");
  }

  /* ---------- 東京時間（端末ズレ対策） ---------- */
  function nowTokyo(){
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  }

  function todayKey(){
    const d = nowTokyo();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}${m}${day}`;
  }

  /* ✅ 1日1回保存キー（結果用） */
  const STORAGE_KEY = "takoyaki_boss_battle_" + todayKey();

  /* ✅ 1回目に引いたカード固定キー（カード用） */
  const CARD_KEY = "takoyaki_boss_card_" + todayKey();

  /* ---------- カードプール ---------- */
  const cardPool = [
    { id:"TN-001", name:"《TN-001:黒き真珠イカさま焼き》", url:"https://ul.h3z.jp/aYt8hDY1.jpg" },
    { id:"TN-002", name:"《TN-002:熱々地獄の給たこ所》", url:"https://ul.h3z.jp/dxnNY56w.jpg" },
    { id:"TN-003", name:"《TN-003:爆走！たこ焼きライダー菜々》", url:"https://ul.h3z.jp/czHthBQm.jpg" },
    { id:"TN-004", name:"《TN-004:見えるフリ焼き》", url:"https://ul.h3z.jp/YQrtCiqQ.jpg" },
    { id:"TN-005", name:"《TN-005:たこ焼きタワー112》", url:"https://ul.h3z.jp/NczWHJgZ.jpg" },
    { id:"TN-006", name:"《TN-006:塩顔パレード焼き》", url:"https://ul.h3z.jp/jqX8X1Tp.jpg" },
    { id:"TN-007", name:"《TN-007:ローソク出せ！》", url:"https://ul.h3z.jp/0z98V2VS.jpg" },
    { id:"TN-008", name:"《TN-008:明太ギャラクシー焼き》", url:"https://ul.h3z.jp/Rg3EobQ1.jpg" },
    { id:"TN-009", name:"《TN-009:塩マヨ露天焼き》", url:"https://ul.h3z.jp/hu8PPlmg.jpg" },
    { id:"TN-010", name:"《TN-010:焼ク者ノ証》", url:"https://ul.h3z.jp/PKP6BCzL.jpg" },

    { id:"TN-011", name:"《TN-011:チーズ火山焼き》", url:"https://ul.h3z.jp/GtMwhWpc.jpg" },
    { id:"TN-012", name:"《TN-012:揚げ玉会議焼き》", url:"https://ul.h3z.jp/0wOenehh.jpg" },
    { id:"TN-013", name:"《TN-013:くたびれ塩こしょう焼き》", url:"https://ul.h3z.jp/wNP5OuPx.jpg" },
    { id:"TN-014", name:"《TN-014:世界たこ焼き釣り選手権大会》", url:"https://ul.h3z.jp/bd5lQXIZ.jpg" },
    { id:"TN-015", name:"《TN-015:顔コイン》", url:"https://ul.h3z.jp/XxLUP9PV.jpg" },
    { id:"TN-016", name:"《TN-016:たこ焼き、発射オーライ》", url:"https://ul.h3z.jp/vxwMGLxg.jpg" },
    { id:"TN-017", name:"《TN-017:たこ焼きマニフェスト》", url:"https://ul.h3z.jp/GtSLIdNB.jpg" },
    { id:"TN-018", name:"《TN-018:ゆのかわの主》", url:"https://ul.h3z.jp/YBcKCsUW.jpg" },
    { id:"TN-019", name:"《TN-019:誤入店トラップ》", url:"https://ul.h3z.jp/1txlHwMQ.jpg" },
    { id:"TN-020", name:"《TN-020:ピック不要の真実》", url:"https://ul.h3z.jp/B67AoEme.jpg" },

    { id:"TN-021", name:"《TN-021:たこ焼き、流れて候》", url:"https://ul.h3z.jp/gNZ9Opan.jpg" },
    { id:"TN-022", name:"《TN-022:たこ焼きダーツ･インフェルノ《對馬裕佳子プロ🎯》》", url:"https://ul.h3z.jp/ew3mWU8A.jpg" },
    { id:"TN-023", name:"《TN-023:芝生かたこ焼きか大会》", url:"https://ul.h3z.jp/9N5IBtcR.jpg" },
    { id:"TN-024", name:"《TN-024:温泉女神のありがた迷惑》", url:"https://ul.h3z.jp/23KBjt98.jpg" },
    { id:"TN-025", name:"《TN-025:たこ焼き化石in函館山》", url:"https://ul.h3z.jp/IaYO2gwF.jpg" },
    { id:"TN-026", name:"《TN-026:たこ焼き48回リボ払い》", url:"https://ul.h3z.jp/J7eZcPGB.jpg" },
    { id:"TN-027", name:"《TN-027:全身たこ焼きダイエット》", url:"https://ul.h3z.jp/QIO06fhX.jpg" },
    { id:"TN-028", name:"《TN-028:自己啓発たこ塾《井上諒プロ🎯》》", url:"https://ul.h3z.jp/ob1siUsu.jpg" },
    { id:"TN-029", name:"《TN-029:カロリーゼロ理論《仁木治プロ🎯》》", url:"https://ul.h3z.jp/gHDJdYlP.jpg" },
    { id:"TN-030", name:"《TN-030:ガチャたこ焼き》", url:"https://ul.h3z.jp/uqAQqBXR.jpg" },

    { id:"TN-031", name:"《TN-031:行列の最後尾が別県》", url:"https://ul.h3z.jp/RSORgeS2.jpg" },
    { id:"TN-032", name:"《TN-032:国境超えた恋》", url:"https://ul.h3z.jp/94fWyiqv.jpg" },
    { id:"BN-033", name:"《BN-033:鉄板のビーナス》", url:"https://ul.h3z.jp/Ofm73ByX.jpg" },
    { id:"TN-034", name:"《TN-034:エシカル過剰焼き》", url:"https://ul.h3z.jp/n0rIx1bc.jpg" },
    { id:"TN-035", name:"《TN-035:デリバリー長距離便》", url:"https://ul.h3z.jp/18GpIRaI.jpg" },
    { id:"TN-036", name:"《TN-036:マヨネーズ詐欺》", url:"https://ul.h3z.jp/UUOd3ivf.jpg" },
    { id:"TN-037", name:"《TN-037:勘違いデート》", url:"https://ul.h3z.jp/Kt99E33g.jpg" },
    { id:"TN-038", name:"《TN-038:恋落ちマッチング》", url:"https://ul.h3z.jp/aMbcsTMw.jpg" },
    { id:"TN-039", name:"《TN-039:ドローン誤配達》", url:"https://ul.h3z.jp/ftgoUa2e.jpg" },
    { id:"TN-040", name:"《TN-040:推し活たこ団扇》", url:"https://ul.h3z.jp/AKFb9qat.jpg" },

    { id:"TN-041", name:"《TN-041:玉の上にも三年》", url:"https://ul.h3z.jp/QnyJ60L4.jpg" },
    { id:"TN-042", name:"《TN-042:たこ焼きループザループ》", url:"https://ul.h3z.jp/7Qd051iC.jpg" },
    { id:"TN-043", name:"《TN-043:転生したら即売れたこ焼き》", url:"https://ul.h3z.jp/g3NtAXnh.jpg" },
    { id:"TN-044", name:"《TN-044:白い契約(稲石裕プロ🎯)》", url:"https://ul.h3z.jp/9ncnN3l4.jpg" },
    { id:"TN-046", name:"《TN-046:ごますりたこ焼き》", url:"https://ul.h3z.jp/oarvGJDA.jpg" },
    { id:"TN-047", name:"《TN-047:ボスゲート》", url:"https://ul.h3z.jp/vcqsYTKN.jpg" },
    { id:"TN-048", name:"《TN-048:店主反撃レビュー《佐俣雄一郎🎯》》", url:"https://ul.h3z.jp/itQ85zyP.jpg" },

    /* URLが不正でも動作は止めない（画像が出ないだけ） */
    { id:"TN-049", name:"《TN-049:たこ焼きの御神体》", url:"https://ul.h3z.jp/KJQrt??.jpg" },

    { id:"BN-050", name:"《BN-050:焼かれし記憶、ソースに還る》", url:"https://ul.h3z.jp/nMEEgSCs.jpg" }
  ];

  const BOSS_NAME = "ボスバトル";

  const TAKOPI_PRELUDE = [
    "……出たたこ。夜のボスだよ。今日は機嫌、最悪。",
    "静かにしたほうがいいたこ。夜のボス、起きちゃった。",
    "あーあ、来たたこ。街灯が一段暗くなるやつ。",
    "……感じる？たこ。空気が重くなった。",
    "わぁ…夜のボスだたこ！たこぴ、ちょっとだけ見守るたこ…！",
    "夜が動いたたこ。ボスが出る合図。"
  ];

  const commentsWin  = [
    "やったね…勝っちゃったたこ。夜がちょっとだけ静かになった。",
    "勝利ログ、刻んだたこ。…街が覚えちゃうやつ。"
  ];
  const commentsLose = [
    "負けちゃったたこ。…でもね、夜は“負け”を栄養にするんだ。",
    "敗北ログ、保存されたたこ。消せないやつ…ふふ。"
  ];
  const commentsDraw = [
    "引き分けたこ。夜がね、まだ決めたくないってさ。",
    "決着つかなかったたこ。余熱だけが残ってる。"
  ];

  function pick(a){ return a[Math.floor(Math.random() * a.length)]; }

  function getOrPickTodayCardId(){
    const saved = localStorage.getItem(STORAGE_KEY);
    if(saved){
      try{
        const data = JSON.parse(saved);
        if(data && data.cardId) return data.cardId;
      }catch(_){}
    }

    const fixed = localStorage.getItem(CARD_KEY);
    if(fixed) return fixed;

    const idx = Math.floor(Math.random() * cardPool.length);
    const pickedId = (cardPool[idx] && cardPool[idx].id) ? cardPool[idx].id : cardPool[0].id;

    localStorage.setItem(CARD_KEY, pickedId);
    return pickedId;
  }

  function findCardById(id){
    return cardPool.find(c => c.id === id) || cardPool[0];
  }

  function battleOutcome(){
    const r = Math.random();
    if(r < 0.62) return "WIN";
    if(r < 0.90) return "LOSE";
    return "DRAW";
  }

  function scoreFor(out){
    if(out === "WIN")  return 60 + Math.floor(Math.random() * 31);
    if(out === "LOSE") return 10 + Math.floor(Math.random() * 36);
    return 40 + Math.floor(Math.random() * 20);
  }

  function isRainbow(){ return Math.random() < 0.03; }

  function formatDate(){
    const d = nowTokyo();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${y}.${m}.${day}`;
  }

  function talkForCard(card){
    const id = String(card.id || "");
    const raw = String(card.name || id);
    const name = raw.replace(/[《》]/g, "");
    const display = card.name || id || "そのカード";

    const OVERRIDE_TALK = {
      "TN-047": [
        `……${display}。\n扉が“開く”んじゃない。\nお前が“入る”んだ。`,
        `そのカードで来たか…。\nゲートは選ばない。\n選ばれるのは、お前だ。`
      ],
      "TN-014": [
        `……${display}。\n釣るつもりか？\n夜の“主”は、お前だ。`,
        `釣り大会？\nふふ…獲物は変わったな。\n今夜はお前が“釣られる”。`
      ]
    };
    if(OVERRIDE_TALK[id]) return OVERRIDE_TALK[id];

    const RULES = [
      { test:/ボスゲート|ゲート|扉/, lines:[
        `……${display}。\n鍵はない。\nあるのは、覚悟だけだ。`,
        `ゲートは道じゃない。\n“戻れない”って意味だ。`
      ]},
      { test:/温泉|露天|ゆのかわ|湯|主/, lines:[
        `……${display}。\n湯気の向こうに、夜がいる。`,
        `その湯は癒しじゃない。\n“試練”だ。`
      ]},
      { test:/明太|ギャラクシー|宇宙|銀河/, lines:[
        `……${display}。\n宇宙の味か。\n夜は広いぞ。`,
        `星屑みたいに散らしてみろ。\n点数でな。`
      ]},
      { test:/チーズ|火山|噴火|溶岩/, lines:[
        `……${display}。\n噴くなよ。\n夜が燃える。`,
        `熱で来たか。\nじゃあ…熱で終わろう。`
      ]},
      { test:/塩|こしょう|塩顔/, lines:[
        `……${display}。\n塩は誤魔化せない。\n夜もな。`,
        `味を削るほど、真実が残る。\n…焼け。`
      ]},
      { test:/マヨ|詐欺|白/, lines:[
        `……${display}。\n白いやつで来たか。\n夜は見抜くぞ。`,
        `盛るほどにバレる。\n焼きで証明しろ。`
      ]},
      { test:/ダーツ|プロ|🎯|的|矢/, lines:[
        `……${display}。\n狙うのは点数か。\n外したら食われるぞ。`,
        `夜の的は逃げない。\n逃げるのは…お前だ。`
      ]},
      { test:/釣り|選手権|大会|世界/, lines:[
        `……${display}。\n大会？\n夜は“本番”しかない。`,
        `獲物を選ぶな。\n夜はお前を選ぶ。`
      ]},
      { test:/行列|最後尾|別県/, lines:[
        `……${display}。\n列は伸びる。\n逃げ道は伸びない。`,
        `夜は待てない。\n待つほど、焦げる。`
      ]},
      { test:/契約|白い契約/, lines:[
        `……${display}。\n契約で来たか。\n夜は条文を食う。`,
        `サインは不要。\n代わりに“焼き”を置け。`
      ]},
      { test:/転生|異世界|転生したら/, lines:[
        `……${display}。\n転生？\n夜は何度でも生まれ変わる。`,
        `次の人生に逃げても同じ。\n今ここで焼け。`
      ]},
      { test:/リボ払い|48回|分割/, lines:[
        `……${display}。\n支払いは後回し？\n夜は前払いだ。`,
        `利息みたいに増えるぞ。\n…恐怖がな。`
      ]},
      { test:/化石|函館山|山/, lines:[
        `……${display}。\n昔の熱を掘り起こすか。`,
        `化石は語る。\n“焼かれた証拠”をな。`
      ]},
      { test:/御神体|女神|証/, lines:[
        `……${display}。\n信仰で来たか。\n夜は祈りを試す。`,
        `神頼みはいい。\nでも最後は…焼きだ。`
      ]},
      { test:/誤入店|トラップ|罠/, lines:[
        `……${display}。\n罠で来たか。\n夜は罠の中だ。`,
        `踏んだ瞬間、終わる。\n…覚悟しろ。`
      ]},
      { test:/ガチャ/, lines:[
        `……${display}。\n運で来たか。\n夜は運も食う。`,
        `回せ。\n当たりは…生き残りだ。`
      ]}
    ];

    for(const r of RULES){
      if(r.test.test(name)) return r.lines;
    }

    return [
      `そのカードで来たか…。\n${display}\n夜向きの匂いはする。`,
      `……${display}。\n名前だけじゃ勝てない。\n焼きで語れ。`
    ];
  }

  /* ====== 会話オーバーレイ生成 ====== */
  let talk = document.querySelector(".boss-talk");
  if(!talk){
    talk = document.createElement("div");
    talk.className = "boss-talk";
    talk.innerHTML = `
      <div class="boss-talk-panel" role="dialog" aria-modal="true" aria-label="ボスのひとこと">
        <div class="boss-talk-title" id="bossTalkTitle"></div>
        <div class="boss-talk-text" id="bossTalkText"></div>
        <div class="boss-talk-buttons">
          <button type="button" id="bossFight">戦う</button>
          <button type="button" id="bossBack">戻る</button>
        </div>
      </div>
    `;
    document.body.appendChild(talk);
    talk.addEventListener("click", (e)=>{
      if(e.target === talk) closeTalk();
    });
  }

  /* ====== 結果オーバーレイ生成 ====== */
  let overlay = document.querySelector(".boss-overlay");
  if(!overlay){
    overlay = document.createElement("div");
    overlay.className = "boss-overlay";
    overlay.innerHTML = `
      <div class="boss-panel" role="dialog" aria-modal="true" aria-label="ボスバトル結果">
        <div class="boss-head">夜の一戦 / 今日の１枚</div>
        <div class="boss-name" id="bossName"></div>
        <div class="boss-cardframe">
          <img id="bossCardImg" class="boss-cardimg" src="" alt="">
        </div>
        <div class="boss-result" id="bossResult"></div>
        <div class="boss-score" id="bossScore"></div>
        <div class="boss-comment" id="bossComment"></div>
        <div class="boss-footer" id="bossFooter"></div>
        <div class="boss-buttons">
          <button type="button" id="bossClose">閉じる</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e)=>{
      if(e.target === overlay) closeOverlay();
    });
  }

  /* ====== 最前面固定（スタッキング対策：最重要） ====== */
  function forceFront(){
    // DOMの最後尾に移動（最前面になりやすい）
    document.body.appendChild(talk);
    document.body.appendChild(overlay);

    // CSSが負ける環境でも勝つように style 直指定
    talk.style.zIndex = "30000";
    talk.style.position = "fixed";
    talk.style.inset = "0";

    overlay.style.zIndex = "30001";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
  }
  forceFront();

  // ESCで閉じる
  document.addEventListener("keydown", (e)=>{
    if(e.key === "Escape"){
      closeTalk();
      closeOverlay();
    }
  });

  const elTalkTitle = talk.querySelector("#bossTalkTitle");
  const elTalkText  = talk.querySelector("#bossTalkText");
  const btnFight    = talk.querySelector("#bossFight");
  const btnBack     = talk.querySelector("#bossBack");

  const panel      = overlay.querySelector(".boss-panel");
  const elBossName = overlay.querySelector("#bossName");
  const elImg      = overlay.querySelector("#bossCardImg");
  const elResult   = overlay.querySelector("#bossResult");
  const elScore    = overlay.querySelector("#bossScore");
  const elComment  = overlay.querySelector("#bossComment");
  const elFooter   = overlay.querySelector("#bossFooter");
  const btnClose   = overlay.querySelector("#bossClose");

  function openTalkUI(){
    forceFront();
    talk.classList.add("is-open");
    talk.style.display = "block";
  }
  function closeTalk(){
    talk.classList.remove("is-open");
    talk.style.display = "none";
  }
  function openOverlayUI(){
    forceFront();
    overlay.classList.add("is-open");
    overlay.style.display = "block";
  }
  function closeOverlay(){
    overlay.classList.remove("is-open");
    overlay.style.display = "none";
  }

  btnClose.addEventListener("click", closeOverlay);

  function render(data){
    const card = findCardById(data.cardId);

    elImg.src = card.url;
    elImg.alt = card.name;

    panel.classList.toggle("rainbow", !!data.rainbow);

    elBossName.textContent = `BOSS：${BOSS_NAME}`;
    elResult.textContent   = data.resultText;
    elScore.textContent    = `焼かれし点数：${data.score}`;
    elComment.textContent  = data.comment;
    elFooter.textContent   = data.footer;
  }

  function runBattleOnce(){
    openOverlayUI();
    panel.classList.remove("rainbow");

    const saved = localStorage.getItem(STORAGE_KEY);
    if(saved){
      try{
        render(JSON.parse(saved));
        return;
      }catch(_){}
    }

    const cardId = getOrPickTodayCardId();
    const out = battleOutcome();
    const score = scoreFor(out);
    const rainbow = isRainbow();

    let resultText, comment;
    if(out === "WIN"){ resultText = "勝利"; comment = pick(commentsWin); }
    else if(out === "LOSE"){ resultText = "敗北"; comment = pick(commentsLose); }
    else { resultText = "引き分け"; comment = pick(commentsDraw); }

    const footer = `#たこ焼きトレカ  #今日の一枚  #夜のボス  ${formatDate()}  ※演出です（配布なし）`;

    const data = { cardId, resultText, score, comment, rainbow, footer };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    render(data);
  }

  function closeGateModalIfOpen(){
    // ゲートモーダルが開いてたら閉じる（重なり事故防止）
    const gm = document.getElementById("gateModal");
    if(gm) gm.classList.remove("is-open");
  }

  function openTalk(){
    if(!isNightNow()) return;

    closeGateModalIfOpen();
    forceFront();

    const cardId = getOrPickTodayCardId();
    const card = findCardById(cardId);

    elTalkTitle.textContent = "たこぴ";
    elTalkText.textContent  = pick(TAKOPI_PRELUDE);
    openTalkUI();

    // たこぴ → ボス（1.2秒後）
    setTimeout(() => {
      if (talk.style.display !== "block") return;
      elTalkTitle.textContent = `BOSS：${BOSS_NAME}`;
      elTalkText.textContent  = pick(talkForCard(card));
    }, 1200);

    btnFight.onclick = ()=>{
      closeTalk();
      runBattleOnce();
    };
    btnBack.onclick = closeTalk;
  }

  /* ✅ クリックの安定化：直接bind + 委譲 */
  function bindBossGate(){
    const bossGate = document.querySelector(".boss-gate");

    if(bossGate && !bossGate.dataset.bound){
      bossGate.dataset.bound = "1";
      bossGate.addEventListener("click", (e)=>{
        e.preventDefault();
        openTalk();
      });
    }

    if(!document.body.dataset.bossDelegated){
      document.body.dataset.bossDelegated = "1";
      document.body.addEventListener("click", (e)=>{
        const a = e.target.closest && e.target.closest(".boss-gate");
        if(!a) return;
        e.preventDefault();
        openTalk();
      });
    }
  }

  bindBossGate();
  setTimeout(bindBossGate, 500);
  setTimeout(bindBossGate, 1500);

})();
