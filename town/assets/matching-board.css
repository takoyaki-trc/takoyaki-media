(() => {
  "use strict";

  // =========================================================
  // Keys
  // =========================================================
  const KEY = {
    board: "ttc_matching_board_v1",
    octo: "roten_v1_octo",
    book: "tf_v1_book",
    inv: "tf_v1_inv",
    matchingMeta: "ttc_matching_meta_v1"
  };

  // =========================================================
  // Utils
  // =========================================================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function nowTokyo() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  }

  function todayKey() {
    const d = nowTokyo();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function safeJSONParse(raw, fallback) {
    try {
      const v = JSON.parse(raw);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function loadJSON(key, fallback) {
    return safeJSONParse(localStorage.getItem(key), fallback);
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function randFromSeed(seedStr) {
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return function () {
      h += h << 13; h ^= h >>> 7;
      h += h << 3;  h ^= h >>> 17;
      h += h << 5;
      return ((h >>> 0) / 4294967295);
    };
  }

  function pick(arr, rnd) {
    return arr[Math.floor(rnd() * arr.length)];
  }

  function weightedPick(list, rnd) {
    const total = list.reduce((sum, item) => sum + (item.weight || 1), 0);
    let roll = rnd() * total;
    for (const item of list) {
      roll -= (item.weight || 1);
      if (roll <= 0) return item;
    }
    return list[list.length - 1];
  }

  function shuffle(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[s]);
  }

  function stars(n) {
    return "★".repeat(n) + "☆".repeat(5 - n);
  }

  function getTimeMode() {
    const h = nowTokyo().getHours();
    return (h >= 6 && h < 18) ? "day" : "night";
  }

  function showTakopiToast(text, ms = 2400) {
    const wrap = $("#takopiToast");
    const inner = $("#takopiToastInner");
    if (!wrap || !inner) return;
    inner.textContent = text;
    wrap.classList.add("show");
    clearTimeout(showTakopiToast._t);
    showTakopiToast._t = setTimeout(() => wrap.classList.remove("show"), ms);
  }

  // =========================================================
  // Customer master
  // =========================================================
  const CUSTOMER_NAME_MAP = {
    impulse: "即決タコ民",
    picky: "見えないタコ民",
    king: "王様タコ民",
    flipper: "よっぱらいタコ民",
    careful: "つぶやきタコ民",
    looker: "冷やかしタコ民",
    rich: "札束タコ民",
    climber: "踏破タコ民",
    guide: "ナビタコ民",
    relax: "ほぐしタコ民",
    artisan: "返し職人タコ民",
    diet: "ゼロ理論タコ民",
    overflow: "枠外タコ民",
    collector: "未開封保護タコ民",
    shadow: "防水タコ民",
    ramen: "替え玉タコ民",
    streamer: "投げ銭タコ民",
    gourmet: "舌判定タコ民",
    opener: "即バリタコ民",
    party: "宴タコ民",
    pilgrim: "覚悟タコ民"
  };

  const CUSTOMER_ICON_MAP = {
    careful:   "https://ul.h3z.jp/RpLPCRTc.png",
    impulse:   "https://ul.h3z.jp/TMXU9ztW.png",
    looker:    "https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/roten/kyaku16.png",
    picky:     "https://ul.h3z.jp/MZYfusKm.png",
    king:      "https://ul.h3z.jp/wMM8PrcP.png",
    flipper:   "https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/roten/kyaku20.png",
    rich:      "https://ul.h3z.jp/pZKu3lSE.png",
    climber:   "https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/roten/kyaku2.png",
    guide:     "https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/roten/kyaku3.png",
    relax:     "https://ul.h3z.jp/dbBbLypa.png",
    artisan:   "https://ul.h3z.jp/OA5StkvT.png",
    diet:      "https://ul.h3z.jp/KVImBYZ8.png",
    overflow:  "https://takoyaki-trc.github.io/takoyaki-media/town/assets/images/kyaku7.png",
    collector: "https://ul.h3z.jp/zSvGyVq9.png",
    shadow:    "https://ul.h3z.jp/IBKDrVAm.png",
    ramen:     "https://ul.h3z.jp/NViRwhdj.png",
    streamer:  "https://ul.h3z.jp/8PukOegd.png",
    gourmet:   "https://ul.h3z.jp/We4UXFSI.png",
    opener:    "https://ul.h3z.jp/9usFHTdU.png",
    party:     "https://ul.h3z.jp/pByCAUMC.png",
    pilgrim:   "https://ul.h3z.jp/eW2dluw2.png"
  };

  const CUSTOMER_RATE = {
    careful: 13,
    impulse: 12,
    looker: 12,
    relax: 10,
    gourmet: 10,
    artisan: 8,
    diet: 8,
    climber: 8,
    flipper: 7,
    collector: 7,
    opener: 6,
    party: 6,
    ramen: 6,
    streamer: 5,
    king: 5,
    shadow: 4,
    overflow: 4,
    picky: 4,
    rich: 3,
    guide: 2,
    pilgrim: 2
  };

  const LOVE_TYPE_LABEL = {
    impulse: "一目惚れ型",
    picky: "幻影追跡型",
    king: "理想高め型",
    flipper: "感情ブレ型",
    careful: "慎重片想い型",
    looker: "未練ごまかし型",
    rich: "執着課金型",
    climber: "完走復縁型",
    guide: "入口沼型",
    relax: "安心依存型",
    artisan: "審美本気型",
    diet: "理屈敗北型",
    overflow: "はみ出し恋型",
    collector: "神格保存型",
    shadow: "湿度記憶型",
    ramen: "追加発注型",
    streamer: "盛り上がり恋型",
    gourmet: "味記憶型",
    opener: "秘密暴き型",
    party: "祭りのあと型",
    pilgrim: "復縁執念型"
  };

  // =========================================================
  // Hero / takopi lines
  // =========================================================
  const HERO_LINES = [
    "今日は誰に焼かれるたこ？",
    "条件が合えば、もうそれは運命たこ。",
    "恋じゃない、在庫のマッチングたこ。",
    "今日の相手、たぶん全員ちょっと重いたこ。"
  ];

  const TAKOPI_LINES = [
    "……その相手、重いたこ",
    "ヒント見る前に当てたら、かなりモテるたこ",
    "恋じゃなくて、だいたい未練たこ",
    "焦ると外すたこ",
    "また来てる相手、いるたこ",
    "それ、たぶん沼たこ",
    "♥か💔かは、渡してからのお楽しみたこ"
  ];

  // =========================================================
  // Love lines by type
  // =========================================================
  const CUSTOMER_LINES = {
    rich: [
      "忘れられない相手ほど、高くつくたこ",
      "もう誰かのものでも、気持ちは止まらないたこ",
      "値段が上がるほど、恋は本物に見えるたこ",
      "手に入らない時間が、気持ちを育てたこ",
      "遅すぎたって分かってる。でも欲しいたこ",
      "一度離れたあの子に、今さら本気になったたこ",
      "他のカードで埋まると思ったのに、全然だめだったたこ",
      "相場を見てるふりして、見てるのは未練たこ"
    ],
    looker: [
      "別に未練なんてないたこ…ちょっと気になるだけたこ",
      "もう終わったはずなのに、目で追ってしまうたこ",
      "買わないつもりなのに、見に来てしまったたこ",
      "他でもいいのに、この一枚だけ残るたこ",
      "見るだけで済む恋なら、楽だったたこ",
      "たまに思い出すだけのはずが、毎回来てるたこ",
      "忘れたつもりでいたのに、また見つけてしまったたこ",
      "本気じゃないと言いながら、名前を探してるたこ"
    ],
    impulse: [
      "見つけた瞬間、もう決まってたこ",
      "逃したら一生後悔するやつたこ",
      "理由はあとでいいたこ",
      "これは運命たこ",
      "考える前に手が伸びたたこ",
      "会えた時に迎えなきゃ、また誰かのものになるたこ",
      "一目見た時から、もう戻れなかったたこ",
      "迷ってる時間がいちばん失礼なたこ"
    ],
    careful: [
      "本当にこの子でいいのか、まだ迷ってるたこ",
      "欲しいけど、今じゃない気もするたこ",
      "また傷つくくらいなら慎重になるたこ",
      "似てるカードじゃダメなんだたこ",
      "決め手が足りないたこ",
      "迎えたい。でも今の自分でふさわしいのか迷うたこ",
      "簡単に決めたくないからこそ、ずっと残ってるたこ",
      "忘れられないのに、まだ言い訳を探してるたこ"
    ],
    climber: [
      "ここまで来たら、あと一枚なんだたこ",
      "完成するまで終われないたこ",
      "途中でやめるのが一番後悔するたこ",
      "残り一枚が一番遠いたこ",
      "ゴールが見えてるのに届かないたこ",
      "足りないのは一枚だけなのに、心の距離は遠いたこ",
      "揃った未来を想像して、今日まで登ってきたたこ",
      "ここで引き返したら、一生忘れられないたこ"
    ],
    flipper: [
      "欲しい気もするし、やめといたほうがいい気もするたこ",
      "今は正しい気がするたこ（たぶん）",
      "夜の判断は危ないたこ",
      "でも今は欲しいたこ",
      "明日の自分に任せるたこ",
      "会いたい理由は分からない。でも会いたいたこ",
      "酔ってる時の再会ほど、危ないものはないたこ",
      "判断力より未練が勝ってる夜たこ"
    ],
    relax: [
      "そばにあるだけで落ち着くたこ",
      "理由はないけど好きなたこ",
      "こういうのが一番残るたこ",
      "ゆっくり選びたい気分たこ",
      "刺激じゃなくて安心たこ",
      "手元にあった景色を、また見たくなったたこ",
      "大げさじゃないけど、ちゃんと好きなたこ",
      "気づけば、いちばん自然に心に残ってたこ"
    ],
    artisan: [
      "分かるやつにしか渡したくないたこ",
      "見た目じゃなくて中身たこ",
      "雑に扱われるくらいなら渡さないたこ",
      "これは作品たこ",
      "価値が分かる相手に渡したいたこ",
      "細部まで見た時、初めて好きだと分かったたこ",
      "これはただのカードじゃないたこ。出会い方まで含めて作品たこ",
      "手に入れることより、ふさわしくありたいたこ"
    ],
    diet: [
      "欲しくないって言えば欲しくなくなるたこ",
      "理屈ではいらないたこ",
      "でも感情が違うたこ",
      "持たなければ傷つかないたこ",
      "結論：欲しいたこ",
      "必要ないはずの相手が、いちばん心を乱すたこ",
      "理性で閉じたはずのファイルが、勝手に開くたこ",
      "忘れれば楽になるはずなのに、忘れないたこ"
    ],
    picky: [
      "あの日確かにそこにいたたこ",
      "誰も信じてくれないたこ",
      "あの一枚じゃなきゃダメなたこ",
      "見えてるのに届かないたこ",
      "まだどこかにあるはずたこ",
      "たしかにあの日、そこにいたたこ",
      "忘れたつもりなのに、気配だけ残ってるたこ",
      "あの一枚は、まだどこかで俺を待ってるたこ"
    ],
    king: [
      "余にふさわしい相手は、そう簡単には現れないたこ",
      "一目で心を奪えないなら、恋としては弱いたこ",
      "格も見た目も揃って、ようやく想う価値があるたこ",
      "安っぽい再会では、心は動かないたこ",
      "余が惹かれる以上、それはもう特別なたこ",
      "求めているのは一枚じゃない。余に似合う運命たこ",
      "王の恋は遅い。でも決まったら長いたこ",
      "余に似合うなら、それは価値があるたこ"
    ],
    guide: [
      "案内する側でも、忘れられない一枚くらいあるたこ",
      "誰かのはじまりみたいな顔して、自分も会いたい子がいるたこ",
      "分かりやすい相手ほど、長く心に残ることもあるたこ",
      "軽く見える恋ほど、あとから効いてくるたこ",
      "人に勧めながら、自分も少し惹かれてるたこ",
      "最初の一枚って、だいたい一番忘れにくいたこ"
    ],
    overflow: [
      "ちゃんと並んでる子より、はみ出した一枚が気になるたこ",
      "普通じゃ足りない心が、今日も勝ってしまったたこ",
      "整いすぎた恋より、少し危うい方が忘れられないたこ",
      "枠の中に収まらない気持ちまで、好きになってしまったたこ",
      "きれいに終わらなかった相手ほど、記憶に残るたこ",
      "あの違和感ごと、もう一度会いたいたこ",
      "欠けてるからこそ、完璧に見える時もあるたこ",
      "収まりの悪い恋ほど、長持ちするたこ"
    ],
    collector: [
      "紙の匂いが忘れられないたこ",
      "あの手ざわりを、まだ指先が覚えてるたこ",
      "保存用まで欲しくなる相手って、だいたい本気なたこ",
      "同じ一枚でも、出会い直したくなる時があるたこ",
      "あの角の輝きが、まだ頭から離れないたこ",
      "触れずに持つのが一番難しいたこ",
      "並べて眺めていた時間まで、恋しかったたこ",
      "傷つけたくないのに、近くに置きたくなるたこ"
    ],
    shadow: [
      "濡れた記憶ほど、乾いても残るたこ",
      "しけった空気の中で出会った一枚が忘れられないたこ",
      "少し曇ったままの思い出に、まだ惹かれてるたこ",
      "乾いた恋より、湿った未練の方がしつこいたこ",
      "水気を含んだみたいに、心だけ重いたこ",
      "あの一枚には、まだ雨の匂いがするたこ",
      "曖昧ににじんだ記憶の方が、きれいに見えるたこ",
      "乾く前に、もう一度会いたいたこ"
    ],
    ramen: [
      "一枚じゃ足りない恋もあるたこ",
      "会えたら終わりじゃなくて、もっと欲しくなるたこ",
      "同じ相手なのに、何度でもときめくたこ",
      "足りるまで足せばいいと思ってた。気持ちも同じたこ",
      "揃えば落ち着くと思ったのに、まだ足りないたこ",
      "一度会えたら満足すると思ってたのに、逆だったたこ",
      "好きって、だいたい追加注文されるたこ",
      "満腹より、未練のほうが長持ちたこ"
    ],
    streamer: [
      "見せ方ひとつで、恋は何倍にも膨らむたこ",
      "盛り上がる相手ほど、あとで本気になるたこ",
      "最初はノリだったのに、気づけば本命みたいなたこ",
      "この出会い、たぶん人に話したくなるたこ",
      "反応が大きいほど、気持ちまで本物っぽくなるたこ",
      "軽い拍手のつもりが、心まで投げてたこ",
      "楽しければいいと思ってたのに、妙に残るたこ",
      "目立つ恋ほど、終わったあと静かに効くたこ"
    ],
    gourmet: [
      "あの日食べたあの味が忘れられなくて…",
      "ソースの香りだけで、昔を思い出すたこ",
      "あの焼き色を、もう一度見たいたこ",
      "一口で終わったのに、記憶だけ残りすぎたこ",
      "うまかった、だけじゃ片づけられないたこ",
      "舌が覚えてるうちに、もう一度会いたいたこ",
      "あの熱さを、今でも心が探してるたこ",
      "味の記憶って、恋よりしつこいたこ"
    ],
    opener: [
      "中身を知る前から、惹かれてたたこ",
      "未開封のまま終わるには、気持ちが強すぎたこ",
      "会う前が一番きれいって言うけど、確かめたいたこ",
      "知らないまま諦める方が、たぶん後悔するたこ",
      "開けた瞬間に終わる恋でも、見ないよりましなたこ",
      "中身を知らない片想いって、意外と重いたこ",
      "破る音まで含めて、運命だった気がするたこ",
      "秘密のままじゃ、気持ちがほどけないたこ"
    ],
    party: [
      "一枚だけじゃ、この気持ちは盛り上がらないたこ",
      "にぎやかな恋ほど、あとで静かに刺さるたこ",
      "並べた時に映える相手って、だいたい忘れにくいたこ",
      "楽しいだけのはずだったのに、ちゃんと残ったたこ",
      "場を明るくする相手ほど、帰り道で恋しくなるたこ",
      "一緒に並んだ景色ごと、思い出してしまうたこ",
      "にぎやかだったからこそ、いなくなると目立つたこ",
      "祭りのあとに気づく恋もあるたこ"
    ],
    pilgrim: [
      "置き忘れたあの日のカードをまた手に入れたくて",
      "一度手放したあの一枚を、まだ忘れられないたこ",
      "昔の恋みたいに、気づけばまた追いかけてたこ",
      "なくしたのはカードなのに、心まで空いたたこ",
      "もう会えないと思ってたのに、また探してるたこ",
      "片想いだって分かってても、探してしまうたこ",
      "また会えたら、今度はちゃんと守れる気がするたこ",
      "あの子を手放した日から、図鑑の空白だけ見ないふりしてるたこ"
    ]
  };

  // =========================================================
  // Card pools / card master
  // =========================================================
  const CARD_POOLS = {
    N: [
      { no: "TN-005", name: "たこ焼きタワー112", img: "https://ul.h3z.jp/LoXMSiYd.jpg" },
      { no: "TN-006", name: "塩顔パレード焼き", img: "https://ul.h3z.jp/7L7rcrnM.jpg" },
      { no: "TN-009", name: "塩マヨ露天焼き", img: "https://ul.h3z.jp/bF9QmTE8.jpg" },
      { no: "TN-011", name: "チーズ火山焼き", img: "https://ul.h3z.jp/BEj3BIcP.jpg" },
      { no: "TN-012", name: "揚げ玉会議焼き", img: "https://ul.h3z.jp/vVw2FjQp.jpg" },
      { no: "TN-013", name: "くたびれ塩こしょう焼き", img: "https://ul.h3z.jp/DlX5pLJ5.jpg" },
      { no: "TN-016", name: "たこ焼き、発射オーライ", img: "https://ul.h3z.jp/50WYMkYw.jpg" },
      { no: "TN-018", name: "ゆのかわの主", img: "https://ul.h3z.jp/mkLBMxIT.jpg" },
      { no: "TN-019", name: "誤入店トラップ", img: "https://ul.h3z.jp/YfON5rBJ.jpg" },
      { no: "TN-021", name: "たこ焼き、流れて候", img: "https://ul.h3z.jp/O4s1VpWd.jpg" },
      { no: "TN-023", name: "芝生かたこ焼きか大会", img: "https://ul.h3z.jp/FZcOaXY8.jpg" },
      { no: "TN-024", name: "温泉女神のありがた迷惑", img: "https://ul.h3z.jp/A6WhBsqj.jpg" },
      { no: "TN-026", name: "たこ焼き48回リボ払い", img: "https://ul.h3z.jp/hz7JXyky.jpg" },
      { no: "TN-027", name: "全身たこ焼きダイエット", img: "https://ul.h3z.jp/FQ3poZLg.jpg" },
      { no: "TN-028", name: "自己啓発たこ塾《井上諒プロ🎯》", img: "https://ul.h3z.jp/sPChFFlG.jpg" },
      { no: "TN-029", name: "カロリーゼロ理論《仁木治プロ🎯》", img: "https://ul.h3z.jp/4HEbt3YP.jpg" },
      { no: "TN-031", name: "行列の最後尾が別県", img: "https://ul.h3z.jp/LBdFqlLI.jpg" },
      { no: "TN-034", name: "エシカル過剰焼き", img: "https://ul.h3z.jp/KRkSq4WD.jpg" },
      { no: "TN-036", name: "マヨネーズ詐欺", img: "https://ul.h3z.jp/NzVgPYdG.jpg" },
      { no: "TN-037", name: "勘違いデート", img: "https://ul.h3z.jp/riYYAnEi.jpg" },
      { no: "TN-041", name: "玉の上にも三年", img: "https://ul.h3z.jp/pQg0jZMy.jpg" },
      { no: "TN-043", name: "転生したら即売れたこ焼き", img: "https://ul.h3z.jp/I3JWnpoL.jpg" },
      { no: "TN-046", name: "ごますりたこ焼き", img: "https://ul.h3z.jp/tuLsTiaz.jpg" },
      { no: "TN-048", name: "店主反撃レビュー《佐俣雄一郎🎯》", img: "https://ul.h3z.jp/ge8b4cQ5.jpg" }
    ],
    R: [
      { no: "TN-002", name: "熱々地獄の給たこ所", img: "https://ul.h3z.jp/otr0dAQi.jpg" },
      { no: "TN-003", name: "爆走！たこ焼きライダー菜々", img: "https://ul.h3z.jp/06HrUPMT.jpg" },
      { no: "TN-008", name: "明太ギャラクシー焼き", img: "https://ul.h3z.jp/xye1uAfV.jpg" },
      { no: "TN-014", name: "世界たこ焼き釣り選手権大会", img: "https://ul.h3z.jp/cyekwiam.jpg" },
      { no: "TN-017", name: "たこ焼きマニフェスト", img: "https://ul.h3z.jp/zeSwFyjz.jpg" },
      { no: "TN-022", name: "たこ焼きダーツインフェルノ《對馬裕佳子プロ🎯》", img: "https://ul.h3z.jp/Prf7KxRk.jpg" },
      { no: "TN-032", name: "国境超えた恋", img: "https://ul.h3z.jp/9AZcVNmR.jpg" },
      { no: "TN-035", name: "デリバリー長距離便", img: "https://ul.h3z.jp/z0xhODVy.jpg" },
      { no: "TN-038", name: "恋落ちマッチング", img: "https://ul.h3z.jp/BPEoWjuY.jpg" },
      { no: "TN-042", name: "たこ焼きループザループ", img: "https://ul.h3z.jp/vxKamb6f.jpg" },
      { no: "TN-044", name: "白い契約(稲石裕プロ🎯)", img: "https://ul.h3z.jp/bC1B4WkQ.jpg" },
      { no: "TN-047", name: "ボスゲート", img: "https://ul.h3z.jp/GHWrtaYk.jpg" }
    ],
    SR: [
      { no: "TN-004", name: "見えるフリ焼き", img: "https://ul.h3z.jp/irs6Sxoy.jpg" },
      { no: "TN-010", name: "焼ク者ノ証", img: "https://ul.h3z.jp/6A2LOn4A.jpg" },
      { no: "TN-015", name: "顔コイン", img: "https://ul.h3z.jp/7GUyGDU1.jpg" },
      { no: "TN-020", name: "ピック不要の真実", img: "https://ul.h3z.jp/Bu1pk4ul.jpg" },
      { no: "TN-030", name: "ガチャたこ焼き", img: "https://ul.h3z.jp/kFpjcqSv.jpg" },
      { no: "TN-039", name: "ドローン誤配達", img: "https://ul.h3z.jp/70A10oHf.jpg" },
      { no: "TN-040", name: "推し活たこ団扇", img: "https://ul.h3z.jp/jY5MVsrt.jpg" },
      { no: "TN-049", name: "たこ焼きの御神体", img: "https://ul.h3z.jp/GQ8H0lGq.jpg" }
    ],
    UR: [
      { no: "TN-001", name: "黒き真珠イカさま焼き", img: "assets/images/1stcard/001ur1.png" },
      { no: "TN-007", name: "ローソク出せ！", img: "assets/images/1stcard/007ur1.png" },
      { no: "TN-033", name: "鉄板のビーナス", img: "assets/images/1stcard/033ur1.png" },
      { no: "TN-045", name: "ドリームファイト", img: "assets/images/1stcard/045ur1.png" }
    ],
    LR: [
      { no: "TN-025", name: "たこ焼き化石in函館山", img: "https://ul.h3z.jp/NEuFQ7PB.png" },
      { no: "TN-050", name: "焼かれし記憶、ソースに還る", img: "assets/images/1stcard/050lr1.png" }
    ]
  };

  const TAKOPI_SEED_POOL = [
    { id: "TP-001", name: "届け！たこぴ便", img: "https://ul.h3z.jp/rjih1Em9.png", rarity: "N" },
    { id: "TP-002", name: "ハロウィンたこぴ", img: "https://ul.h3z.jp/hIDWKss0.png", rarity: "N" },
    { id: "TP-003", name: "紅葉たこぴ", img: "https://ul.h3z.jp/G05m1hbT.png", rarity: "N" },
    { id: "TP-004", name: "クリスマスたこぴ", img: "https://ul.h3z.jp/FGEKvxhK.png", rarity: "N" },
    { id: "TP-005", name: "お年玉たこぴ", img: "https://ul.h3z.jp/OPz58Wt6.png", rarity: "N" },
    { id: "TP-006", name: "バレンタインたこぴ", img: "https://ul.h3z.jp/J0kj3CLb.png", rarity: "N" },
    { id: "TP-007", name: "花見たこぴ", img: "https://ul.h3z.jp/KrCy4WQb.png", rarity: "N" },
    { id: "TP-008", name: "入学たこぴ", img: "https://ul.h3z.jp/DidPdK9b.png", rarity: "UR" }
  ];

  const BUSSASARI_POOL = [
    { id: "BS-001", name: "たこ焼きダーツインフェルノ《對馬裕佳子》", img: "https://ul.h3z.jp/l5roYZJ4.png", rarity: "N" },
    { id: "BS-002", name: "店主反撃レビュー《佐俣雄一郎》", img: "https://ul.h3z.jp/BtOTLlSo.png", rarity: "N" },
    { id: "BS-003", name: "自己啓発タコ塾《井上諒》", img: "https://ul.h3z.jp/P5vsAste.png", rarity: "N" },
    { id: "BS-004", name: "カロリーゼロ理論《仁木治》", img: "https://ul.h3z.jp/ZGBzzH2r.png", rarity: "N" },
    { id: "BS-005", name: "白い契約《稲石裕》", img: "https://ul.h3z.jp/nmiaCKae.png", rarity: "N" }
  ];

  const NAMARA_POOL = [
    { id: "NK-001", name: "イカさま焼き", img: "https://ul.h3z.jp/1UB3EY1B.png", rarity: "LR" },
    { id: "NK-002", name: "定番のソース", img: "https://ul.h3z.jp/MBZcFmq9.png", rarity: "N" },
    { id: "NK-003", name: "すっぴん", img: "https://ul.h3z.jp/A6botkfp.png", rarity: "N" },
    { id: "NK-004", name: "チーズソースマヨ", img: "https://ul.h3z.jp/MmkNjIJM.png", rarity: "SR" },
    { id: "NK-005", name: "めんたいマヨ", img: "https://ul.h3z.jp/9oc1iVPt.png", rarity: "SR" },
    { id: "NK-006", name: "ねぎ味噌", img: "https://ul.h3z.jp/vf60iccW.png", rarity: "SR" },
    { id: "NK-007", name: "牡蠣だし醤油", img: "https://ul.h3z.jp/zwVHhrgx.png", rarity: "SR" },
    { id: "NK-008", name: "塩こしょう", img: "https://ul.h3z.jp/KlgnlC2H.png", rarity: "UR" },
    { id: "NK-009", name: "辛口ソース", img: "https://ul.h3z.jp/OavcxTBn.png", rarity: "R" },
    { id: "NK-010", name: "ぶっかけ揚げ玉からしマヨ", img: "https://ul.h3z.jp/CcOw6yLq.png", rarity: "SR" },
    { id: "NK-011", name: "塩マヨペッパー", img: "https://ul.h3z.jp/7UJoTCe7.png", rarity: "R" },
    { id: "NK-012", name: "てりたま", img: "https://ul.h3z.jp/MU6ehdTH.png", rarity: "SR" }
  ];

  const WATER_SPECIAL_CARDS = {
    rotten: [
      {
        id: "SP-MIZU-001",
        name: "腐敗したカード",
        img: "https://takoyaki-card.com/town/assets/images/sp/huhai.png",
        rarity: "SP",
        tier: "N",
        weight: 95
      },
      {
        id: "SP-MIZU-002",
        name: "浸食したカード",
        img: "https://takoyaki-card.com/town/assets/images/sp/sinsykou.png",
        rarity: "SP",
        tier: "LR",
        weight: 5
      }
    ],
    sea: [
      {
        id: "SP-MIZU-001",
        name: "腐敗したカード",
        img: "https://takoyaki-card.com/town/assets/images/sp/huhai.png",
        rarity: "SP",
        tier: "N",
        weight: 98
      },
      {
        id: "SP-MIZU-002",
        name: "浸食したカード",
        img: "https://takoyaki-card.com/town/assets/images/sp/sinsykou.png",
        rarity: "SP",
        tier: "LR",
        weight: 2
      }
    ]
  };

  const RARITY_ORDER = { N: 1, R: 2, SR: 3, UR: 4, LR: 5, SP: 6 };

  const CARDS_ALL = [
    ...CARD_POOLS.N.map(v => ({ ...v, id: v.no, rarity: "N" })),
    ...CARD_POOLS.R.map(v => ({ ...v, id: v.no, rarity: "R" })),
    ...CARD_POOLS.SR.map(v => ({ ...v, id: v.no, rarity: "SR" })),
    ...CARD_POOLS.UR.map(v => ({ ...v, id: v.no, rarity: "UR" })),
    ...CARD_POOLS.LR.map(v => ({ ...v, id: v.no, rarity: "LR" })),
    ...TAKOPI_SEED_POOL.map(v => ({ ...v, id: v.id, specialPool: "takopi" })),
    ...BUSSASARI_POOL.map(v => ({ ...v, id: v.id, specialPool: "bussasari" })),
    ...NAMARA_POOL.map(v => ({ ...v, id: v.id, specialPool: "namara" })),
    ...WATER_SPECIAL_CARDS.rotten.map(v => ({ ...v, id: `${v.id}_rotten`, specialPool: "water_special" })),
    ...WATER_SPECIAL_CARDS.sea.map(v => ({ ...v, id: `${v.id}_sea`, specialPool: "water_special" }))
  ];

  const CARD_MAP = Object.fromEntries(CARDS_ALL.map(v => [v.id, v]));

  // =========================================================
  // Reward items
  // =========================================================
  const SEEDS = [
    { id: "seed_random", name: "なに出るタネ" },
    { id: "seed_shop", name: "店頭タネ" },
    { id: "seed_line", name: "回線タネ" },
    { id: "seed_special", name: "たこぴのタネ" },
    { id: "seed_bussasari", name: "ブッ刺さりタネ" },
    { id: "seed_namara_kawasar", name: "なまら買わさるタネ" }
  ];

  const WATERS = [
    { id: "water_plain_free", name: "ただの水" },
    { id: "water_nice", name: "なんか良さそうな水" },
    { id: "water_suspicious", name: "怪しい水" },
    { id: "water_overdo", name: "やりすぎな水" },
    { id: "water_regret", name: "押さなきゃよかった水" },
    { id: "water_rotten", name: "腐ったミズ" },
    { id: "water_sea", name: "海水" },
    { id: "water_yunokawa", name: "ゆのかわの温泉ミズ" },
    { id: "water_supergod", name: "超神水" }
  ];

  const FERTS = [
    { id: "fert_agedama", name: "ただの揚げ玉" },
    { id: "fert_feel", name: "気のせい肥料" },
    { id: "fert_guts", name: "根性論ぶち込み肥料" },
    { id: "fert_skip", name: "工程すっ飛ばし肥料" },
    { id: "fert_timeno", name: "時間を信じない肥料" }
  ];

  const REWARD_ITEMS = {
    seed: Object.fromEntries(SEEDS.map(v => [v.id, v])),
    water: Object.fromEntries(WATERS.map(v => [v.id, v])),
    fert: Object.fromEntries(FERTS.map(v => [v.id, v]))
  };

  const REWARD_PROFILES = {
    careful: {
      fixed: [["water", "water_plain_free"]],
      rand: [["fert", "fert_feel", 18], ["seed", "seed_random", 18], ["water", "water_nice", 12]]
    },
    impulse: {
      fixed: [["water", "water_nice"]],
      rand: [["seed", "seed_shop", 18], ["seed", "seed_line", 10], ["fert", "fert_guts", 10]]
    },
    looker: {
      fixed: [["water", "water_plain_free"]],
      rand: [["water", "water_regret", 8], ["fert", "fert_agedama", 12], ["seed", "seed_random", 16]]
    },
    picky: {
      fixed: [["water", "water_rotten"]],
      rand: [["water", "water_sea", 14], ["fert", "fert_timeno", 8], ["seed", "seed_bussasari", 6]]
    },
    king: {
      fixed: [["water", "water_yunokawa"]],
      rand: [["seed", "seed_namara_kawasar", 12], ["seed", "seed_special", 8], ["fert", "fert_skip", 10]]
    },
    flipper: {
      fixed: [["water", "water_nice"]],
      rand: [["fert", "fert_feel", 12], ["water", "water_regret", 8], ["seed", "seed_random", 14]]
    },
    rich: {
      fixed: [["water", "water_overdo"], ["seed", "seed_namara_kawasar"]],
      rand: [["water", "water_supergod", 8], ["seed", "seed_bussasari", 18], ["fert", "fert_timeno", 12]]
    },
    climber: {
      fixed: [["water", "water_suspicious"]],
      rand: [["fert", "fert_guts", 15], ["seed", "seed_line", 10], ["seed", "seed_shop", 12]]
    },
    guide: {
      fixed: [["water", "water_plain_free"], ["seed", "seed_random"]],
      rand: [["fert", "fert_feel", 18], ["water", "water_nice", 12]]
    },
    relax: {
      fixed: [["water", "water_plain_free"]],
      rand: [["seed", "seed_random", 16], ["fert", "fert_feel", 16], ["water", "water_nice", 8]]
    },
    artisan: {
      fixed: [["fert", "fert_guts"]],
      rand: [["fert", "fert_skip", 18], ["water", "water_suspicious", 10], ["seed", "seed_shop", 12]]
    },
    diet: {
      fixed: [["fert", "fert_agedama"]],
      rand: [["water", "water_regret", 10], ["fert", "fert_feel", 12], ["seed", "seed_random", 18]]
    },
    overflow: {
      fixed: [["water", "water_rotten"]],
      rand: [["water", "water_sea", 12], ["fert", "fert_timeno", 8], ["seed", "seed_bussasari", 6]]
    },
    collector: {
      fixed: [["seed", "seed_special"]],
      rand: [["water", "water_yunokawa", 10], ["seed", "seed_namara_kawasar", 10], ["fert", "fert_skip", 8]]
    },
    shadow: {
      fixed: [["water", "water_suspicious"]],
      rand: [["water", "water_rotten", 8], ["water", "water_sea", 10], ["water", "water_overdo", 8]]
    },
    ramen: {
      fixed: [["seed", "seed_random"]],
      rand: [["seed", "seed_shop", 12], ["fert", "fert_guts", 10], ["fert", "fert_feel", 12]]
    },
    streamer: {
      fixed: [],
      rand: [["water", "water_nice", 12], ["seed", "seed_special", 8], ["fert", "fert_skip", 8], ["seed", "seed_bussasari", 10]]
    },
    gourmet: {
      fixed: [["water", "water_yunokawa"]],
      rand: [["water", "water_nice", 14], ["seed", "seed_namara_kawasar", 10], ["fert", "fert_feel", 10]]
    },
    opener: {
      fixed: [["water", "water_nice"]],
      rand: [["seed", "seed_shop", 16], ["seed", "seed_line", 10], ["fert", "fert_skip", 8]]
    },
    party: {
      fixed: [["seed", "seed_random"]],
      rand: [["seed", "seed_shop", 12], ["water", "water_nice", 12], ["fert", "fert_guts", 10]]
    },
    pilgrim: {
      fixed: [["water", "water_overdo"], ["fert", "fert_timeno"]],
      rand: [["water", "water_supergod", 10], ["seed", "seed_special", 10], ["seed", "seed_bussasari", 14]]
    }
  };

  // =========================================================
  // Hint system
  // =========================================================
  function deriveTags(card) {
    const tags = new Set();
    const name = card.name || "";

    if (/ソース/.test(name)) tags.add("sauce");
    if (/塩/.test(name)) tags.add("salt");
    if (/マヨ/.test(name)) tags.add("mayo");
    if (/明太/.test(name)) tags.add("mentai");
    if (/チーズ/.test(name)) tags.add("cheese");
    if (/味噌/.test(name)) tags.add("miso");
    if (/牡蠣/.test(name)) tags.add("oyster");
    if (/温泉|ゆのかわ/.test(name)) tags.add("onsen");
    if (/真珠|黒き/.test(name)) tags.add("pearl");
    if (/女神|ビーナス/.test(name)) tags.add("goddess");
    if (/神|御神体/.test(name)) tags.add("god");
    if (/恋|デート/.test(name)) tags.add("love");
    if (/ループ/.test(name)) tags.add("loop");
    if (/ダーツ/.test(name)) tags.add("darts");
    if (/露店/.test(name)) tags.add("roten");
    if (/火山|地獄|インフェルノ/.test(name)) tags.add("fire");
    if (/化石|記憶/.test(name)) tags.add("memory");
    if (/ドローン|発射|爆走/.test(name)) tags.add("move");
    if (/ガチャ/.test(name)) tags.add("gacha");
    if (/顔|パレード|行列/.test(name)) tags.add("crowd");
    if (/イカ/.test(name)) tags.add("ika");
    if (/焼き/.test(name)) tags.add("yaki");

    if (card.rarity === "N") tags.add("normal");
    if (card.rarity === "R") tags.add("rare");
    if (card.rarity === "SR") tags.add("super");
    if (card.rarity === "UR") tags.add("ultra");
    if (card.rarity === "LR") tags.add("legend");
    if (card.rarity === "SP") tags.add("special");

    return Array.from(tags);
  }

  const HINT_TEXTS = {
    sauce: [
      "ソースの香りだけで、昔を思い出すたこ",
      "濃い匂いの記憶って、しつこく残るたこ",
      "あの日の香りに、まだ引っ張られてるたこ"
    ],
    salt: [
      "しょっぱい記憶ほど、あとで恋しくなるたこ",
      "塩気のある思い出って、妙に刺さるたこ",
      "淡いのに、なぜか忘れられないたこ"
    ],
    mayo: [
      "やさしく包んでくれる感じに弱いたこ",
      "丸くてやわらかい相手ほど残るたこ",
      "見た目よりも余韻が長いたこ"
    ],
    mentai: [
      "少し刺激がある相手に、まだ未練があるたこ",
      "ピリッとした子ほど、記憶に残るたこ",
      "大人しくない相手が忘れられないたこ"
    ],
    cheese: [
      "濃厚すぎる相手って、だいたい忘れられないたこ",
      "重たいのに、また会いたくなるたこ",
      "とろける感じの記憶が残ってるたこ"
    ],
    miso: [
      "少し深い味わいのある相手に弱いたこ",
      "派手じゃないのに、妙に残るたこ",
      "地味に見えて、あとで効いてくるたこ"
    ],
    oyster: [
      "だしみたいに静かに残る相手がいるたこ",
      "旨みが遅れてくる感じ、まだ好きなたこ",
      "静かなのに、印象だけ濃いたこ"
    ],
    onsen: [
      "湯気の向こうにいるみたいな相手を探してるたこ",
      "温かい記憶って、妙に戻りたくなるたこ",
      "ご利益みたいな空気に弱いたこ"
    ],
    pearl: [
      "黒く光る子って、忘れにくいたこ",
      "真珠みたいな輝き、まだ目に残ってるたこ",
      "ちょっと危ない匂いのする相手ほど惹かれるたこ"
    ],
    goddess: [
      "女神っぽい相手って、だいたい距離感がおかしいたこ",
      "ありがたいのに振り回されるたこ",
      "高嶺なのに妙に近い相手が忘れられないたこ"
    ],
    god: [
      "もう人じゃない感じの相手に弱いたこ",
      "信仰みたいな気持ちになるたこ",
      "拝みたくなる相手を探してるたこ"
    ],
    love: [
      "恋っぽい空気をまとった相手が忘れられないたこ",
      "ちゃんと恋だった気がするたこ",
      "気のせいじゃ済ませられないたこ"
    ],
    loop: [
      "何度でも戻ってくる相手に弱いたこ",
      "終わったはずなのに、また会いたくなるたこ",
      "ぐるぐる回る気持ちを止められないたこ"
    ],
    darts: [
      "刺さる相手って、ほんとに急に来るたこ",
      "一撃で決まる恋、嫌いじゃないたこ",
      "狙ったつもりはないのに、刺さってたこ"
    ],
    roten: [
      "露店の灯りの下で会った気がするたこ",
      "ふらっと出会ったのに、妙に残ってるたこ",
      "お祭りみたいな空気を思い出すたこ"
    ],
    fire: [
      "熱すぎる相手ほど、あとで恋しくなるたこ",
      "火傷みたいな記憶が残ってるたこ",
      "少し危ない熱さに、まだ惹かれてるたこ"
    ],
    memory: [
      "昔の記憶に触れると、戻りたくなるたこ",
      "思い出そのものみたいな相手を探してるたこ",
      "今でも頭のどこかに残ってるたこ"
    ],
    move: [
      "落ち着かない相手ほど、忘れられないたこ",
      "走っていく背中がまだ見えるたこ",
      "ちゃんと止まってくれない相手に弱いたこ"
    ],
    gacha: [
      "何が出るか分からない感じに惹かれるたこ",
      "運命まかせの出会い、嫌いじゃないたこ",
      "偶然に期待してしまうたこ"
    ],
    crowd: [
      "人混みの中でも目立つ相手っているたこ",
      "にぎやかな景色ごと残ってるたこ",
      "ひとりだけ妙に印象に残るたこ"
    ],
    ika: [
      "ちょっとズルそうな相手、嫌いじゃないたこ",
      "まっすぐじゃない感じに弱いたこ",
      "危ういのに光る相手を探してるたこ"
    ],
    yaki: [
      "焼き色の記憶って、案外しつこいたこ",
      "あの日の熱さを、まだ探してるたこ",
      "香ばしい思い出ほど忘れにくいたこ"
    ],
    normal: [
      "派手じゃないのに、なぜか残るたこ",
      "普通っぽい相手ほど、あとから効くたこ"
    ],
    rare: [
      "ちょっと特別なくらいが、一番忘れられないたこ",
      "手が届きそうで届かない距離が苦しいたこ"
    ],
    super: [
      "光りすぎないのに、ちゃんと目立つ相手が好きなたこ",
      "少し背伸びした感じの相手を探してるたこ"
    ],
    ultra: [
      "明らかに特別な相手って、隠せないたこ",
      "眩しいくらいの存在感が、まだ残ってるたこ"
    ],
    legend: [
      "もう伝説みたいな相手を、本気で探してるたこ",
      "会えたらたぶん、しばらく立ち直れないたこ"
    ],
    special: [
      "普通じゃ説明できない相手に惹かれるたこ",
      "ちょっとおかしいくらいが、ちょうどいいたこ"
    ]
  };

  function buildHintCandidates(card) {
    const tags = deriveTags(card);
    const lines = [];
    tags.forEach(tag => {
      (HINT_TEXTS[tag] || []).forEach(text => lines.push(text));
    });

    if (!lines.length) {
      lines.push("忘れられない気配だけが残ってるたこ");
      lines.push("名前までは言えないけど、まだ探してるたこ");
      lines.push("あの時の空気ごと、戻ってきてほしいたこ");
    }
    return lines;
  }

  function makeHintsForCard(card, seed) {
    const rnd = randFromSeed(seed);
    const pool = shuffle(buildHintCandidates(card), rnd);
    const hints = pool.slice(0, 3);
    while (hints.length < 3) hints.push(pool[0] || "まだ忘れられないたこ");
    return hints;
  }

  function makeHintTags(card) {
    const tags = deriveTags(card);
    const nice = [];
    if (tags.includes("sauce")) nice.push("#ソース系");
    if (tags.includes("salt")) nice.push("#しょっぱい記憶");
    if (tags.includes("mayo")) nice.push("#やわらか系");
    if (tags.includes("mentai")) nice.push("#刺激あり");
    if (tags.includes("cheese")) nice.push("#濃厚");
    if (tags.includes("onsen")) nice.push("#温泉感");
    if (tags.includes("pearl")) nice.push("#黒く光る");
    if (tags.includes("goddess")) nice.push("#高嶺感");
    if (tags.includes("god")) nice.push("#神格");
    if (tags.includes("love")) nice.push("#恋っぽい");
    if (tags.includes("loop")) nice.push("#戻ってくる");
    if (tags.includes("roten")) nice.push("#露店感");
    if (tags.includes("fire")) nice.push("#熱め");
    if (tags.includes("memory")) nice.push("#記憶枠");
    if (tags.includes("darts")) nice.push("#刺さる");
    if (tags.includes("legend")) nice.push("#伝説級");
    if (tags.includes("special")) nice.push("#説明不能");

    const fallback = ["#未練あり", "#気になる", "#再会希望"];
    return (nice.length ? nice : fallback).slice(0, 3);
  }

  // =========================================================
  // Reward helpers
  // =========================================================
  function rewardOctoByDifficulty(difficulty, isLegend, type, rnd) {
    const base = isLegend ? [800, 1400]
      : difficulty === 1 ? [100, 180]
      : difficulty === 2 ? [180, 300]
      : difficulty === 3 ? [300, 520]
      : difficulty === 4 ? [520, 900]
      : [900, 1500];

    let value = Math.floor(rnd() * (base[1] - base[0] + 1)) + base[0];
    if (type === "rich") value = Math.round(value * 1.2);
    if (type === "streamer" && rnd() < 0.08) value = Math.round(value * 1.5);
    return value;
  }

  function rewardExpByDifficulty(difficulty, isLegend) {
    return isLegend ? 18 : Math.max(2, difficulty * 3);
  }

  function rewardRepByDifficulty(difficulty, isLegend) {
    return isLegend ? 8 : Math.max(1, difficulty);
  }

  function makeRewardItems(type, difficulty, isLegend, rnd) {
    const profile = REWARD_PROFILES[type] || REWARD_PROFILES.careful;
    const out = [];

    for (const [kind, id] of profile.fixed) {
      out.push({ kind, id, qty: 1 });
    }

    let count = difficulty <= 2 ? 2 : difficulty === 3 ? 2 : difficulty === 4 ? 3 : 4;
    if (isLegend) count = 5;

    const randPool = profile.rand.map(([kind, id, weight]) => ({ kind, id, weight }));
    for (let i = 0; i < count; i++) {
      const p = weightedPick(randPool, rnd);
      out.push({ kind: p.kind, id: p.id, qty: 1 });
    }

    const merged = new Map();
    out.forEach(item => {
      const key = `${item.kind}:${item.id}`;
      merged.set(key, {
        kind: item.kind,
        id: item.id,
        qty: (merged.get(key)?.qty || 0) + item.qty
      });
    });

    if (isLegend && rnd() < 0.4) {
      const key = "water:water_supergod";
      merged.set(key, {
        kind: "water",
        id: "water_supergod",
        qty: (merged.get(key)?.qty || 0) + 1
      });
    }

    return Array.from(merged.values());
  }

  // =========================================================
  // Book / inv / player
  // =========================================================
  function ensureDefaults() {
    if (localStorage.getItem(KEY.octo) == null) localStorage.setItem(KEY.octo, "1000");

    const inv = loadJSON(KEY.inv, null);
    if (!inv) {
      saveJSON(KEY.inv, { ver: 1, seed: {}, water: {}, fert: {} });
    } else {
      inv.ver = 1;
      inv.seed = inv.seed || {};
      inv.water = inv.water || {};
      inv.fert = inv.fert || {};
      saveJSON(KEY.inv, inv);
    }

    const book = loadJSON(KEY.book, null);
    if (!book) {
      const got = {};
      CARDS_ALL.forEach(card => {
        let count = 0;
        if (card.rarity === "N") count = Math.random() < 0.6 ? Math.floor(Math.random() * 4) : 0;
        else if (card.rarity === "R") count = Math.random() < 0.45 ? Math.floor(Math.random() * 3) : 0;
        else if (card.rarity === "SR") count = Math.random() < 0.28 ? Math.floor(Math.random() * 2) : 0;
        else if (card.rarity === "UR") count = Math.random() < 0.12 ? 1 : 0;
        else if (card.rarity === "LR") count = Math.random() < 0.05 ? 1 : 0;
        else if (card.rarity === "SP") count = 0;
        if (count > 0) got[card.id] = { count, name: card.name, rarity: card.rarity };
      });
      saveJSON(KEY.book, { got });
    }
  }

  function getBook() {
    const book = loadJSON(KEY.book, { got: {} });
    book.got = book.got || {};
    return book;
  }

  function saveBook(book) {
    saveJSON(KEY.book, book);
  }

  function getOwnedCount(cardId) {
    return Number(getBook().got?.[cardId]?.count || 0);
  }

  function addOwned(cardId, delta) {
    const book = getBook();
    const info = CARD_MAP[cardId] || { name: cardId, rarity: "N" };
    if (!book.got[cardId]) book.got[cardId] = { count: 0, name: info.name, rarity: info.rarity };
    book.got[cardId].count = Math.max(0, Number(book.got[cardId].count || 0) + Number(delta || 0));
    if (book.got[cardId].count <= 0) delete book.got[cardId];
    saveBook(book);
  }

  function getAllOwnedCards() {
    const book = getBook();
    return CARDS_ALL
      .map(card => ({
        ...card,
        count: Number(book.got?.[card.id]?.count || 0)
      }))
      .filter(v => v.count > 0)
      .sort((a, b) => {
        const rd = (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
        if (rd !== 0) return rd;
        return a.name.localeCompare(b.name, "ja");
      });
  }

  function getOcto() {
    return Number(localStorage.getItem(KEY.octo) || 0);
  }

  function addOcto(delta) {
    localStorage.setItem(KEY.octo, String(Math.max(0, getOcto() + Number(delta || 0))));
  }

  function getInv() {
    const inv = loadJSON(KEY.inv, { ver: 1, seed: {}, water: {}, fert: {} });
    inv.seed = inv.seed || {};
    inv.water = inv.water || {};
    inv.fert = inv.fert || {};
    return inv;
  }

  function saveInv(inv) {
    saveJSON(KEY.inv, inv);
  }

  function addInventory(kind, id, qty) {
    const inv = getInv();
    inv[kind] = inv[kind] || {};
    inv[kind][id] = Number(inv[kind][id] || 0) + Number(qty || 0);
    saveInv(inv);
  }

  // =========================================================
  // Board generation
  // =========================================================
  const CUSTOMER_TYPES = Object.keys(CUSTOMER_NAME_MAP);

  function buildWeightedCustomerPool() {
    const out = [];
    for (const type of CUSTOMER_TYPES) {
      const weight = CUSTOMER_RATE[type] || 1;
      for (let i = 0; i < weight; i++) out.push(type);
    }
    return out;
  }

  const CUSTOMER_WEIGHTED_POOL = buildWeightedCustomerPool();

  function uniqueCustomerTypes(count, rnd) {
    const set = new Set();
    let guard = 0;
    while (set.size < count && guard < 500) {
      set.add(pick(CUSTOMER_WEIGHTED_POOL, rnd));
      guard++;
    }
    return Array.from(set);
  }

  function getDisplayPoolByType(type, legend = false) {
    if (legend) return CARDS_ALL.filter(c => ["LR", "SP", "UR"].includes(c.rarity));

    if (type === "gourmet") {
      return CARDS_ALL.filter(c => /焼き|ソース|マヨ|塩|明太|味噌|牡蠣|温泉|イカ/.test(c.name));
    }
    if (type === "collector") {
      return CARDS_ALL.filter(c => ["SR", "UR", "LR"].includes(c.rarity) || /御神体|真珠|記憶|神/.test(c.name));
    }
    if (type === "shadow" || type === "picky" || type === "overflow") {
      return CARDS_ALL.filter(c => c.specialPool === "water_special" || ["SR", "UR", "SP", "LR"].includes(c.rarity));
    }
    if (type === "rich" || type === "king" || type === "pilgrim") {
      return CARDS_ALL.filter(c => ["SR", "UR", "LR", "SP"].includes(c.rarity));
    }
    if (type === "guide") {
      return CARDS_ALL.filter(c => ["N", "R"].includes(c.rarity));
    }
    if (type === "impulse" || type === "opener" || type === "streamer") {
      return CARDS_ALL.filter(c => ["N", "R", "SR"].includes(c.rarity));
    }
    if (type === "climber" || type === "artisan") {
      return CARDS_ALL.filter(c => ["R", "SR", "UR"].includes(c.rarity));
    }
    if (type === "party" || type === "ramen") {
      return CARDS_ALL.filter(c => ["N", "R", "SR", "UR"].includes(c.rarity));
    }
    return CARDS_ALL.filter(c => ["N", "R", "SR"].includes(c.rarity));
  }

  function getDifficultyForType(type, rnd) {
    if (type === "rich") return 5;
    if (type === "pilgrim") return rnd() < 0.55 ? 4 : 5;
    if (type === "king") return rnd() < 0.45 ? 4 : 5;
    if (type === "picky" || type === "shadow" || type === "overflow") return rnd() < 0.4 ? 4 : 5;
    if (type === "collector" || type === "artisan" || type === "climber" || type === "gourmet") return rnd() < 0.35 ? 3 : 4;
    if (type === "guide" || type === "careful" || type === "relax") return rnd() < 0.6 ? 2 : 3;
    if (type === "looker" || type === "diet") return rnd() < 0.55 ? 2 : 3;
    return rnd() < 0.34 ? 2 : rnd() < 0.72 ? 3 : 4;
  }

  function chooseWantedCard(type, difficulty, rnd, legend = false) {
    const pool = getDisplayPoolByType(type, legend);
    const picked = pick(pool, rnd);
    let qty = 1;
    if (!legend) {
      if (difficulty === 2 && rnd() < 0.35) qty = 2;
      if (difficulty === 3 && rnd() < 0.45) qty = 2;
      if (difficulty === 4) qty = rnd() < 0.5 ? 2 : 3;
      if (difficulty >= 5) qty = rnd() < 0.4 ? 2 : 3;
      if (type === "collector" || type === "ramen" || type === "party") qty += rnd() < 0.35 ? 1 : 0;
    }
    return { card: picked, qty };
  }

  function getCustomerLine(type, rnd) {
    const lines = CUSTOMER_LINES[type] || ["まだ忘れられないたこ"];
    return pick(lines, rnd);
  }

  function makeJob(type, idx, dateSeed, featured = false, legend = false) {
    const rnd = randFromSeed(`${dateSeed}::job::${type}::${idx}::${legend ? "legend" : "normal"}`);
    const difficulty = legend ? 5 : Math.min(5, Math.max(featured ? 3 : 1, getDifficultyForType(type, rnd)));
    const wanted = chooseWantedCard(type, difficulty, rnd, legend);
    const hints = makeHintsForCard(wanted.card, `${dateSeed}::hint::${type}::${idx}`);

    return {
      id: `${legend ? "legend" : "job"}_${idx + 1}_${type}`,
      type,
      visitorName: CUSTOMER_NAME_MAP[type],
      visitorImg: CUSTOMER_ICON_MAP[type],
      difficulty,
      featured,
      legend,
      loveType: LOVE_TYPE_LABEL[type] || "未練型",
      line: getCustomerLine(type, rnd),
      targetCardId: wanted.card.id,
      targetQty: wanted.qty,
      hintTags: makeHintTags(wanted.card),
      hints,
      hintCosts: [0, 100, 200],
      rewards: {
        octo: rewardOctoByDifficulty(difficulty, legend, type, rnd),
        exp: rewardExpByDifficulty(difficulty, legend),
        rep: rewardRepByDifficulty(difficulty, legend),
        items: makeRewardItems(type, difficulty, legend, rnd)
      },
      revealedHints: 1,
      completed: false,
      completedAt: null,
      favorite: false,
      retryCount: 0
    };
  }

  function generateBoard(force = false) {
    const today = todayKey();
    const old = loadJSON(KEY.board, null);
    if (!force && old?.date === today) return old;

    const rnd = randFromSeed(`board::${today}`);
    const chosen = uniqueCustomerTypes(5, rnd);
    const featuredIndex = Math.floor(rnd() * chosen.length);
    const jobs = chosen.map((type, idx) => makeJob(type, idx, today, idx === featuredIndex, false));

    let legendJob = null;
    const legendCandidates = ["rich", "king", "pilgrim", "picky", "overflow", "shadow"];
    if (rnd() < 0.38) {
      legendJob = makeJob(pick(legendCandidates, rnd), 99, today, true, true);
    }

    const state = {
      date: today,
      jobs,
      legendJob
    };
    saveJSON(KEY.board, state);
    return state;
  }

  function getBoard() {
    return loadJSON(KEY.board, null) || generateBoard(false);
  }

  function saveBoard(state) {
    saveJSON(KEY.board, state);
  }

  function getMatchingMeta() {
    return loadJSON(KEY.matchingMeta, { favoriteIds: [], reunionMap: {} });
  }

  function saveMatchingMeta(meta) {
    saveJSON(KEY.matchingMeta, meta);
  }

  // =========================================================
  // Match / status / scoring
  // =========================================================
  function getJobNeedStatus(job) {
    const targetCount = getOwnedCount(job.targetCardId);
    return {
      ok: targetCount >= 1,
      own: targetCount,
      need: 1
    };
  }

  function getJobStatus(job) {
    const need = getJobNeedStatus(job);
    if (job.completed) return { cls: "done", text: "成立済み", action: "成立済み" };
    if (need.ok) return { cls: "ok", text: "挑戦可能", action: "カードを選ぶ" };
    return { cls: "ng", text: "片想い", action: "カードを選ぶ" };
  }

  function cardScoreAgainstJob(card, job) {
    const target = CARD_MAP[job.targetCardId];
    if (!target || !card) return 0;

    if (card.id === target.id) return 100;

    let score = 0;
    if (card.rarity === target.rarity) score += 30;

    const a = new Set(deriveTags(card));
    const b = new Set(deriveTags(target));
    let overlap = 0;
    b.forEach(tag => {
      if (a.has(tag)) overlap++;
    });
    score += overlap * 12;

    if ((RARITY_ORDER[card.rarity] || 0) >= (RARITY_ORDER[target.rarity] || 0)) score += 10;
    return Math.min(95, score);
  }

  function judgeScore(score) {
    if (score >= 100) return { icon: "♥", verdict: "perfect", text: "運命の一枚だったようだ" };
    if (score >= 65) return { icon: "♥", verdict: "success", text: "好みだったようだ" };
    return { icon: "💔", verdict: "fail", text: "好みではなかったようだ" };
  }

  // =========================================================
  // UI pieces
  // =========================================================
  function itemIcon(kind) {
    if (kind === "seed") return "🌱";
    if (kind === "water") return "💧";
    return "🧪";
  }

  function itemLabel(kind, id) {
    return REWARD_ITEMS[kind]?.[id]?.name || id;
  }

  function renderHero() {
    const heroImage = $("#heroImage");
    const heroSpeechText = $("#heroSpeechText");
    if (!heroImage || !heroSpeechText) return;

    heroImage.src = getTimeMode() === "day"
      ? "https://ul.h3z.jp/lqCNnwQH.png"
      : "https://ul.h3z.jp/UtPlWaZz.png";

    const rnd = randFromSeed(`hero::${todayKey()}`);
    heroSpeechText.textContent = pick(HERO_LINES, rnd);
  }

  function calcCompatibility(job) {
    const owned = getAllOwnedCards();
    if (!owned.length) return 0;
    let best = 0;
    owned.forEach(card => {
      const s = cardScoreAgainstJob(card, job);
      if (s > best) best = s;
    });
    return best;
  }

  function calcAttachment(job) {
    return Math.min(5, Math.max(1, job.difficulty + (job.legend ? 1 : 0)));
  }

  function ensureStyleTag() {
    if ($("#matchingBoardInlineStyle")) return;
    const style = document.createElement("style");
    style.id = "matchingBoardInlineStyle";
    style.textContent = `
      .matchHintPanel{
        margin-top:10px;
        background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
        border:1px solid rgba(255,255,255,.08);
        border-radius:14px;
        padding:10px;
      }
      .matchHintHead{
        display:flex;
        gap:10px;
        align-items:center;
        margin-bottom:8px;
      }
      .matchHintTakopi{
        width:34px;
        height:34px;
        border-radius:10px;
        display:grid;
        place-items:center;
        background:linear-gradient(180deg, #ffe6ef, #ffc9da);
        box-shadow:0 4px 10px rgba(128,70,95,.10);
        font-size:18px;
      }
      .matchHintTitle{
        font-size:12px;
        line-height:1.5;
        color:#fff5f8;
        font-weight:800;
      }
      .matchHintList{
        display:grid;
        gap:8px;
      }
      .matchHintRow{
        display:flex;
        gap:8px;
        align-items:center;
        justify-content:space-between;
        flex-wrap:wrap;
        padding:8px 10px;
        border-radius:12px;
        background:rgba(255,255,255,.08);
        border:1px solid rgba(255,255,255,.07);
      }
      .matchHintText{
        color:#fff5f8;
        font-size:12px;
        line-height:1.6;
        font-weight:700;
        flex:1 1 180px;
      }
      .matchHintBtn{
        min-height:32px;
        padding:6px 10px;
        border:none;
        border-radius:10px;
        cursor:pointer;
        background:linear-gradient(180deg, #fff1bc, #efc75b);
        color:#5a3614;
        font-size:11px;
        font-weight:800;
        box-shadow:0 4px 10px rgba(0,0,0,.10);
      }
      .matchHintBtn[disabled]{
        opacity:.55;
        cursor:not-allowed;
      }
      .matchMetaStrip{
        display:flex;
        flex-wrap:wrap;
        gap:6px;
        margin-top:8px;
      }
      .matchMetaChip{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        min-height:26px;
        padding:4px 8px;
        border-radius:8px;
        background:rgba(255,255,255,.12);
        color:#fff7f9;
        font-size:11px;
        font-weight:800;
        border:1px solid rgba(255,255,255,.08);
      }
      .matchSecondaryRow{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin-top:10px;
      }
      .matchMiniBtn{
        min-height:34px;
        padding:6px 10px;
        border:none;
        border-radius:10px;
        cursor:pointer;
        background:rgba(255,255,255,.12);
        color:#fff8ef;
        font-size:11px;
        font-weight:800;
        border:1px solid rgba(255,255,255,.08);
      }
      .reunionBadge{
        background:linear-gradient(180deg, #ffe8a8, #efc85a);
        color:#5b3614;
      }
      .modalCardGrid{
        display:grid;
        grid-template-columns:repeat(auto-fit, minmax(88px, max-content));
        gap:10px;
      }
      .selectCardItem{
        width:82px;
      }
      .selectCardBtn{
        width:82px;
        border:none;
        background:none;
        padding:0;
        cursor:pointer;
      }
      .selectCardBox{
        width:82px;
        height:114px;
        position:relative;
        overflow:hidden;
        border-radius:6px;
        background:#fff3db;
        border:3px solid #7a5a28;
        box-shadow:0 6px 14px rgba(0,0,0,.12);
      }
      .selectCardBox img{
        width:100%;
        height:100%;
        object-fit:cover;
        display:block;
      }
      .selectCardOwn{
        position:absolute;
        left:6px;
        top:6px;
        min-width:34px;
        height:24px;
        padding:0 6px;
        border-radius:999px;
        display:grid;
        place-items:center;
        background:rgba(255,255,255,.94);
        color:#4d3623;
        font-size:11px;
        border:2px solid rgba(0,0,0,.08);
      }
      .selectCardName{
        margin-top:6px;
        min-height:32px;
        word-break:break-word;
        font-size:11px;
        line-height:1.45;
        color:#5b4650;
        font-weight:700;
      }
      .heartJudgeLayer{
        position:fixed;
        inset:0;
        z-index:130;
        display:none;
        align-items:center;
        justify-content:center;
        background:radial-gradient(circle at center, rgba(255,255,255,.08), rgba(33,13,24,.72));
        backdrop-filter:blur(6px);
      }
      .heartJudgeLayer.show{
        display:flex;
      }
      .heartJudgeInner{
        text-align:center;
        color:#fff9f5;
        animation:judgeEnter .22s ease;
      }
      .heartJudgeIcon{
        font-size:120px;
        line-height:1;
        filter:drop-shadow(0 12px 26px rgba(0,0,0,.25));
        animation:judgePulse .95s ease;
      }
      .heartJudgeText{
        margin-top:12px;
        font-size:22px;
        line-height:1.4;
        font-weight:800;
      }
      .heartJudgeSub{
        margin-top:8px;
        font-size:14px;
        line-height:1.7;
        color:#ffeef4;
        font-weight:700;
      }
      @keyframes judgeEnter{
        from{ opacity:0; transform:scale(.92); }
        to{ opacity:1; transform:scale(1); }
      }
      @keyframes judgePulse{
        0%{ transform:scale(.7); opacity:0; }
        30%{ transform:scale(1.18); opacity:1; }
        55%{ transform:scale(.96); opacity:1; }
        80%{ transform:scale(1.06); opacity:1; }
        100%{ transform:scale(1); opacity:1; }
      }
    `;
    document.head.appendChild(style);
  }

  function renderHintRows(job) {
    return job.hints.map((hint, idx) => {
      const opened = idx < job.revealedHints;
      const cost = job.hintCosts[idx];
      if (opened) {
        return `
          <div class="matchHintRow">
            <div class="matchHintText">${escapeHtml(hint)}</div>
            <button class="matchHintBtn" disabled>開示済み</button>
          </div>
        `;
      }
      return `
        <div class="matchHintRow">
          <div class="matchHintText">次のヒント（有料 ${cost} オクト）</div>
          <button class="matchHintBtn" data-open-hint="${job.id}" data-hint-index="${idx}">${cost}オクトで見る</button>
        </div>
      `;
    }).join("");
  }

  function renderJobCard(job, isLegend = false) {
    const status = getJobStatus(job);
    const compatibility = calcCompatibility(job);
    const reunionMap = getMatchingMeta().reunionMap || {};
    const reunionCount = Number(reunionMap[job.type] || 0);
    const attachment = calcAttachment(job);

    return `
      <article class="matchCard ${job.completed ? "isDone" : ""}">
        <div class="matchCardHead">
          <div class="matchAvatarFrame">
            <img class="matchAvatar" src="${job.visitorImg}" alt="${escapeHtml(job.visitorName)}">
          </div>

          <div class="matchHeadRight">
            <div class="matchSpeech">${escapeHtml(job.line)}</div>

            <div class="matchMetaRow">
              <h3 class="matchName">${escapeHtml(job.visitorName)}</h3>
              <div class="metaRight">
                <div class="matchStars s${job.difficulty}">${stars(job.difficulty)}</div>
                ${job.featured ? `<span class="matchBadge featured">目玉依頼</span>` : ""}
                ${reunionCount > 0 ? `<span class="matchBadge reunionBadge">再会 ${reunionCount}</span>` : ""}
                <span class="matchBadge ${status.cls}">${status.text}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="matchMain">
          <div class="matchMetaStrip">
            <span class="matchMetaChip">相性 ${compatibility}%</span>
            <span class="matchMetaChip">${escapeHtml(job.loveType)}</span>
            <span class="matchMetaChip">未練度 ${"★".repeat(attachment)}${"☆".repeat(5 - attachment)}</span>
            ${job.hintTags.map(tag => `<span class="matchMetaChip">${escapeHtml(tag)}</span>`).join("")}
          </div>

          <div class="matchHintPanel">
            <div class="matchHintHead">
              <div class="matchHintTakopi">🐙</div>
              <div class="matchHintTitle">今日の希望は……？</div>
            </div>

            <div class="matchHintList">
              ${renderHintRows(job)}
            </div>

            <div class="matchSecondaryRow">
              <button class="matchBtn ${status.cls === "ok" && !job.completed ? "primary" : ""}" data-open-select="${job.id}">
                ${status.action}
              </button>
              <button class="matchMiniBtn" data-toggle-fav="${job.id}">
                ${job.favorite ? "追跡中" : "気になる登録"}
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function renderBoard() {
    const state = getBoard();
    const list = $("#matchList");
    const legend = $("#legendMatch");
    if (!list) return;

    list.innerHTML = state.jobs.map(job => renderJobCard(job, false)).join("");

    if (legend) {
      if (state.legendJob) {
        legend.classList.remove("hidden");
        legend.innerHTML = renderJobCard(state.legendJob, true);
      } else {
        legend.classList.add("hidden");
        legend.innerHTML = "";
      }
    }

    bindBoardButtons();
  }

  // =========================================================
  // Actions
  // =========================================================
  function updateJob(jobId, updater) {
    const state = getBoard();
    let job = state.jobs.find(v => v.id === jobId);
    let owner = "jobs";
    if (!job && state.legendJob?.id === jobId) {
      job = state.legendJob;
      owner = "legend";
    }
    if (!job) return null;

    updater(job, state, owner);
    saveBoard(state);
    return job;
  }

  function openHint(jobId, idx) {
    const costMap = [0, 100, 200];
    const cost = costMap[idx] ?? 100;
    if (getOcto() < cost) {
      showTakopiToast("オクトが足りないたこ");
      return;
    }
    addOcto(-cost);
    updateJob(jobId, (job) => {
      job.revealedHints = Math.max(job.revealedHints, idx + 1);
    });
    renderBoard();
    showTakopiToast(`ヒントを開いたたこ（-${cost}オクト）`);
  }

  function toggleFavorite(jobId) {
    updateJob(jobId, (job) => {
      job.favorite = !job.favorite;
    });
    renderBoard();
  }

  function getJobById(jobId) {
    const state = getBoard();
    return state.jobs.find(v => v.id === jobId) || (state.legendJob?.id === jobId ? state.legendJob : null);
  }

  function openSelectModal(jobId) {
    const job = getJobById(jobId);
    if (!job) return;

    const owned = getAllOwnedCards();
    const modal = $("#jobModal");
    const body = $("#jobModalBody");
    if (!modal || !body) return;

    body.innerHTML = `
      <div class="modalTop">
        <img class="modalAvatar" src="${job.visitorImg}" alt="${escapeHtml(job.visitorName)}">

        <div>
          <h2 class="modalName" id="modalJobName">${escapeHtml(job.visitorName)}</h2>
          <p class="modalLine">この一枚で、あの人は振り向くたこ？</p>
        </div>

        <div class="modalRight">
          <div class="matchStars s${job.difficulty}">${stars(job.difficulty)}</div>
          <div class="modalTagRow">
            <span class="modalTag">${escapeHtml(job.loveType)}</span>
            <span class="modalTag">相性 ${calcCompatibility(job)}%</span>
          </div>
        </div>
      </div>

      <section>
        <h3 class="modalSectionTitle">所持カードから選ぶ</h3>
        ${
          owned.length
            ? `<div class="modalCardGrid">
                ${owned.map(card => `
                  <div class="selectCardItem">
                    <button class="selectCardBtn" data-choose-card="${job.id}" data-card-id="${card.id}">
                      <div class="selectCardBox">
                        <img src="${card.img}" alt="${escapeHtml(card.name)}">
                        <div class="selectCardOwn">所持${card.count}</div>
                      </div>
                      <div class="selectCardName">${escapeHtml(card.name)}</div>
                    </button>
                  </div>
                `).join("")}
               </div>`
            : `<div class="modalStatusList"><div class="modalStatusLine ng">所持カードがないたこ。</div></div>`
        }
      </section>
    `;

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    $$("[data-choose-card]", body).forEach(btn => {
      btn.addEventListener("click", () => {
        const cardId = btn.getAttribute("data-card-id");
        judgeCard(job.id, cardId);
      });
    });
  }

  function closeJobModal() {
    const modal = $("#jobModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function ensureJudgeLayer() {
    if ($("#heartJudgeLayer")) return;
    const layer = document.createElement("div");
    layer.id = "heartJudgeLayer";
    layer.className = "heartJudgeLayer";
    layer.innerHTML = `
      <div class="heartJudgeInner">
        <div class="heartJudgeIcon" id="heartJudgeIcon">♥</div>
        <div class="heartJudgeText" id="heartJudgeText">……</div>
        <div class="heartJudgeSub" id="heartJudgeSub">……</div>
      </div>
    `;
    document.body.appendChild(layer);
  }

  async function showJudge(judgement) {
    ensureJudgeLayer();
    const layer = $("#heartJudgeLayer");
    const icon = $("#heartJudgeIcon");
    const text = $("#heartJudgeText");
    const sub = $("#heartJudgeSub");
    if (!layer || !icon || !text || !sub) return;

    icon.textContent = judgement.icon;
    text.textContent = judgement.verdict === "fail" ? "好みではなかったようだ" : "鼓動が重なった";
    sub.textContent = judgement.text;

    layer.classList.add("show");
    await new Promise(r => setTimeout(r, 1300));
    layer.classList.remove("show");
    await new Promise(r => setTimeout(r, 180));
  }

  async function judgeCard(jobId, cardId) {
    const job = getJobById(jobId);
    if (!job) return;
    if (getOwnedCount(cardId) <= 0) {
      showTakopiToast("そのカードは持ってないたこ");
      return;
    }

    closeJobModal();

    const card = CARD_MAP[cardId];
    const score = cardScoreAgainstJob(card, job);
    const judgement = judgeScore(score);

    await showJudge(judgement);

    if (judgement.verdict === "fail") {
      updateJob(jobId, (j) => {
        j.retryCount = Number(j.retryCount || 0) + 1;
      });
      renderBoard();
      showTakopiToast("……違う、それじゃないたこ");
      return;
    }

    addOwned(cardId, -1);

    updateJob(jobId, (j, state) => {
      j.completed = true;
      j.completedAt = Date.now();

      addOcto(j.rewards.octo);
      const invItems = j.rewards.items || [];
      invItems.forEach(item => addInventory(item.kind, item.id, item.qty));

      const meta = getMatchingMeta();
      meta.reunionMap[j.type] = Number(meta.reunionMap[j.type] || 0) + 1;
      saveMatchingMeta(meta);
    });

    renderBoard();
    await showRewardModal(getJobById(jobId));
    showTakopiToast("……焼けたね");
  }

  async function showRewardModal(job) {
    const modal = $("#rewardModal");
    const title = $("#rewardTitle");
    const sub = $("#rewardSub");
    const list = $("#rewardList");
    if (!modal || !title || !sub || !list || !job) return;

    title.textContent = "……焼けたね";
    sub.textContent = `${job.visitorName} とマッチ成立たこ。`;

    const lines = [
      `🪙 ${job.rewards.octo.toLocaleString()} オクト`,
      `評判 +${job.rewards.rep} / 熱量 +${job.rewards.exp}`,
      ...job.rewards.items.map(v => `${itemIcon(v.kind)} ${itemLabel(v.kind, v.id)} ×${v.qty}`)
    ];

    list.innerHTML = lines.map(v => `<div class="rewardItem">${escapeHtml(v)}</div>`).join("");
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");

    const rows = $$(".rewardItem", list);
    for (let i = 0; i < rows.length; i++) {
      await new Promise(r => setTimeout(r, 120));
      rows[i].classList.add("show");
    }
  }

  function hideRewardModal() {
    const modal = $("#rewardModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    const list = $("#rewardList");
    if (list) list.innerHTML = "";
  }

  // =========================================================
  // Event binding
  // =========================================================
  function bindBoardButtons() {
    $$("[data-open-hint]").forEach(btn => {
      btn.addEventListener("click", () => {
        const jobId = btn.getAttribute("data-open-hint");
        const idx = Number(btn.getAttribute("data-hint-index"));
        openHint(jobId, idx);
      });
    });

    $$("[data-toggle-fav]").forEach(btn => {
      btn.addEventListener("click", () => {
        const jobId = btn.getAttribute("data-toggle-fav");
        toggleFavorite(jobId);
      });
    });

    $$("[data-open-select]").forEach(btn => {
      btn.addEventListener("click", () => {
        const jobId = btn.getAttribute("data-open-select");
        openSelectModal(jobId);
      });
    });
  }

  function bindUI() {
    const backBtn = $("#backBtn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        if (history.length > 1) history.back();
        else location.href = "./";
      });
    }

    const takopiFloat = $("#takopiFloat");
    if (takopiFloat) {
      takopiFloat.addEventListener("click", () => {
        const rnd = randFromSeed(`${todayKey()}::takopi::${Date.now()}`);
        showTakopiToast(pick(TAKOPI_LINES, rnd));
      });
    }

    const closeBtn = $("#jobModalClose");
    if (closeBtn) closeBtn.addEventListener("click", closeJobModal);

    const modal = $("#jobModal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeJobModal();
      });
    }

    const rewardClose = $("#rewardCloseBtn");
    if (rewardClose) rewardClose.addEventListener("click", hideRewardModal);

    const rewardModal = $("#rewardModal");
    if (rewardModal) {
      rewardModal.addEventListener("click", (e) => {
        if (e.target === rewardModal) hideRewardModal();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeJobModal();
        hideRewardModal();
      }
    });
  }

  // =========================================================
  // Boot
  // =========================================================
  ensureDefaults();
  ensureStyleTag();
  generateBoard(false);
  bindUI();
  renderHero();
  renderBoard();
})();