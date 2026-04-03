(() => {
  "use strict";

  // =========================================================
  // Keys
  // =========================================================
  const KEY = {
    board: "ttc_card_board_matching_v3",
    octo: "roten_v1_octo",
    player: "tf_v1_player",
    book: "tf_v1_book",
    inv: "tf_v1_inv"
  };

  // =========================================================
  // Utils
  // =========================================================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function pad2(n) {
    return String(n).padStart(2, "0");
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

  function nowTokyo() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  }

  function todayKey() {
    const d = nowTokyo();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function seededRandom(seedStr) {
    let h = 2166136261;
    for (let i = 0; i < seedStr.length; i++) {
      h ^= seedStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return function () {
      h += h << 13; h ^= h >>> 7;
      h += h << 3; h ^= h >>> 17;
      h += h << 5;
      return ((h >>> 0) / 4294967295);
    };
  }

  function pick(arr, rnd) {
    return arr[Math.floor(rnd() * arr.length)];
  }

  function weightedPick(list, rnd) {
    const total = list.reduce((s, v) => s + (v.weight || 1), 0);
    let roll = rnd() * total;
    for (const item of list) {
      roll -= (item.weight || 1);
      if (roll <= 0) return item;
    }
    return list[list.length - 1];
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

  // =========================================================
  // Maps
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

  // =========================================================
  // Hero / Takopi lines
  // =========================================================
  const HERO_LINES = [
    "今日は誰に焼かれるたこ？",
    "条件が合えば、もうそれは運命たこ。",
    "恋じゃない、在庫のマッチングたこ。",
    "今日の相手、たぶん全員ちょっと重いたこ。"
  ];

  const TAKOPI_LINES = [
    "……この人、たぶん地雷たこ",
    "条件、重すぎない？",
    "SR以上×3とか、愛じゃないたこ",
    "それ、恋じゃなくて在庫処分たこ",
    "……焼けたね",
    "足りないのはカードじゃなくて覚悟たこ",
    "まだ探すの？",
    "今日、運いいたこ",
    "その相手、沼の匂いがするたこ",
    "片想いが一番コスト高いたこ"
  ];

  // =========================================================
  // Type lines（カードを恋愛対象に見立てた版）
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
  // Appear rates
  // =========================================================
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

  // =========================================================
  // Card pools
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
  // Card normalization
  // =========================================================
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
  // Ensure defaults
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

    const player = loadJSON(KEY.player, null);
    if (!player) {
      saveJSON(KEY.player, { exp: 0, rep: 0 });
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

        if (count > 0) {
          got[card.id] = { count, name: card.name, rarity: card.rarity };
        }
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
    const book = getBook();
    return Number(book.got?.[cardId]?.count || 0);
  }

  function addOwned(cardId, delta) {
    const book = getBook();
    const info = CARD_MAP[cardId] || { name: cardId, rarity: "N" };
    if (!book.got[cardId]) book.got[cardId] = { count: 0, name: info.name, rarity: info.rarity };
    book.got[cardId].count = Math.max(0, Number(book.got[cardId].count || 0) + delta);
    if (book.got[cardId].count <= 0) delete book.got[cardId];
    saveBook(book);
  }

  function getOwnedCardsByRarityAtLeast(rarity) {
    const min = RARITY_ORDER[rarity] || 1;
    const book = getBook();
    return CARDS_ALL
      .filter(c => (RARITY_ORDER[c.rarity] || 0) >= min)
      .map(c => ({ ...c, count: Number(book.got?.[c.id]?.count || 0) }))
      .filter(c => c.count > 0)
      .sort((a, b) => (RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity]) || a.name.localeCompare(b.name, "ja"));
  }

  function getOcto() {
    return Number(localStorage.getItem(KEY.octo) || 0);
  }

  function addOcto(delta) {
    localStorage.setItem(KEY.octo, String(Math.max(0, getOcto() + Number(delta || 0))));
  }

  function getPlayer() {
    return loadJSON(KEY.player, { exp: 0, rep: 0 });
  }

  function addPlayerStats(exp, rep) {
    const p = getPlayer();
    p.exp = Number(p.exp || 0) + Number(exp || 0);
    p.rep = Number(p.rep || 0) + Number(rep || 0);
    saveJSON(KEY.player, p);
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
  // Visitors / appearance
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
    const selected = new Set();
    let guard = 0;
    while (selected.size < count && guard < 500) {
      selected.add(pick(CUSTOMER_WEIGHTED_POOL, rnd));
      guard++;
    }
    return Array.from(selected);
  }

  // =========================================================
  // Selection rules
  // =========================================================
  function getDisplayPoolByType(type, legend = false) {
    if (legend) return CARDS_ALL.filter(c => ["LR", "SP", "UR"].includes(c.rarity));

    if (type === "gourmet") {
      return CARDS_ALL.filter(c => /焼き|ソース|マヨ|塩|明太|牡蠣|味噌|てり|イカ|温泉/.test(c.name));
    }
    if (type === "collector") {
      return CARDS_ALL.filter(c => ["SR", "UR", "LR"].includes(c.rarity) || /御神体|証|真珠|ビーナス|記憶/.test(c.name));
    }
    if (type === "shadow" || type === "picky" || type === "overflow") {
      return CARDS_ALL.filter(c => c.specialPool === "water_special" || ["SR", "UR", "SP"].includes(c.rarity));
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

  function makeWant(rnd, type, difficulty, usedIds, legend = false) {
    const rarityQuestChance = legend ? 0.55 : (difficulty >= 4 ? 0.22 : 0.08);

    if (rnd() < rarityQuestChance) {
      const rarityPool = legend
        ? ["UR", "LR", "SP"]
        : difficulty >= 5 ? ["SR", "UR", "LR"]
        : difficulty >= 4 ? ["SR", "UR"]
        : ["R", "SR"];
      const rarity = pick(rarityPool, rnd);
      return {
        type: "rarity",
        rarity,
        qty: difficulty >= 5 ? 2 : 1,
        label: `${rarity}以上`
      };
    }

    let pool = getDisplayPoolByType(type, legend).filter(c => !usedIds.has(c.id));
    if (!pool.length) pool = getDisplayPoolByType(type, legend);

    const card = pick(pool, rnd);
    usedIds.add(card.id);

    let qty = 1;
    if (difficulty === 2 && rnd() < 0.35) qty = 2;
    if (difficulty === 3 && rnd() < 0.45) qty = 2;
    if (difficulty === 4) qty = rnd() < 0.5 ? 2 : 3;
    if (difficulty >= 5) qty = rnd() < 0.4 ? 2 : 3;
    if (type === "collector" || type === "ramen" || type === "party") qty += rnd() < 0.35 ? 1 : 0;
    if (legend) qty = 1;

    return {
      type: "card",
      cardId: card.id,
      name: card.name,
      img: card.img,
      rarity: card.rarity,
      qty
    };
  }

  function rewardOctoByDifficulty(difficulty, isLegend, type, rnd) {
    const base = isLegend ? [380, 620]
      : difficulty === 1 ? [30, 60]
      : difficulty === 2 ? [55, 90]
      : difficulty === 3 ? [90, 150]
      : difficulty === 4 ? [140, 240]
      : [220, 360];

    let val = Math.floor(rnd() * (base[1] - base[0] + 1)) + base[0];
    if (type === "rich") val = Math.round(val * 1.35);
    if (type === "streamer" && rnd() < 0.08) val *= 3;
    return val * 3;
  }

  function rewardExpByDifficulty(difficulty, isLegend) {
    return isLegend ? 12 : Math.max(1, difficulty * 2);
  }

  function makeRewardItems(type, difficulty, isLegend, rnd) {
    const profile = REWARD_PROFILES[type] || REWARD_PROFILES.careful;
    const out = [];

    for (const [kind, id] of profile.fixed) {
      out.push({ kind, id, qty: 1 });
    }

    let randCount = difficulty <= 2 ? 1 : difficulty === 3 ? 1 : 2;
    if (difficulty >= 4) randCount = 2;
    if (difficulty >= 5) randCount = 3;
    if (isLegend) randCount = 3;

    const randPool = profile.rand.map(([kind, id, weight]) => ({ kind, id, weight }));

    for (let i = 0; i < randCount; i++) {
      const picked = weightedPick(randPool, rnd);
      out.push({ kind: picked.kind, id: picked.id, qty: 1 });
    }

    if (isLegend) {
      if (rnd() < 0.28) out.push({ kind: "water", id: "water_supergod", qty: 1 });
      if (rnd() < 0.18) out.push({ kind: "seed", id: "seed_special", qty: 1 });
    } else if (difficulty >= 5 && rnd() < 0.15) {
      out.push({ kind: "water", id: "water_supergod", qty: 1 });
    }

    const map = new Map();
    out.forEach(item => {
      const key = `${item.kind}:${item.id}`;
      map.set(key, {
        kind: item.kind,
        id: item.id,
        qty: (map.get(key)?.qty || 0) + item.qty
      });
    });

    return Array.from(map.values());
  }

  function getCustomerLine(type, rnd) {
    const lines = CUSTOMER_LINES[type] || ["あの一枚に、まだ気持ちが残ってるたこ"];
    return pick(lines, rnd);
  }

  function makeJob(type, idx, dateSeed, featured = false, legend = false) {
    const rnd = seededRandom(`${dateSeed}::job::${type}::${idx}::${legend ? "legend" : "normal"}`);
    const difficulty = legend ? 5 : Math.min(5, Math.max(featured ? 3 : 1, getDifficultyForType(type, rnd)));
    const wantCount = legend ? 1 : difficulty <= 2 ? 1 : difficulty === 3 ? 2 : 2 + (rnd() < 0.55 ? 1 : 0);

    const usedIds = new Set();
    const wants = [];
    for (let i = 0; i < wantCount; i++) {
      wants.push(makeWant(rnd, type, difficulty, usedIds, legend));
    }

    return {
      id: `${legend ? "legend" : "job"}_${idx + 1}_${type}`,
      type,
      visitorName: CUSTOMER_NAME_MAP[type],
      visitorImg: CUSTOMER_ICON_MAP[type],
      difficulty,
      featured,
      legend,
      line: getCustomerLine(type, rnd),
      wants,
      rewards: {
        octo: rewardOctoByDifficulty(difficulty, legend, type, rnd),
        exp: rewardExpByDifficulty(difficulty, legend),
        rep: legend ? 5 : Math.max(0, difficulty - 1),
        items: makeRewardItems(type, difficulty, legend, rnd)
      },
      completed: false,
      completedAt: null
    };
  }

  function generateBoard(force = false) {
    const today = todayKey();
    const old = loadJSON(KEY.board, null);
    if (!force && old?.date === today) return old;

    const rnd = seededRandom(`board::${today}`);
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

  // =========================================================
  // Need / status
  // =========================================================
  function getNeedStatus(job) {
    const lines = [];
    let ok = true;

    for (const want of job.wants) {
      if (want.type === "card") {
        const owned = getOwnedCount(want.cardId);
        const good = owned >= want.qty;
        if (!good) ok = false;
        lines.push({ ok: good, text: `${want.name}　${owned}/${want.qty}` });
      } else {
        const list = getOwnedCardsByRarityAtLeast(want.rarity);
        const total = list.reduce((sum, c) => sum + c.count, 0);
        const good = total >= want.qty;
        if (!good) ok = false;
        lines.push({ ok: good, text: `${want.label}　${total}/${want.qty}` });
      }
    }

    return { ok, lines };
  }

  function consumeNeed(want) {
    if (want.type === "card") {
      if (getOwnedCount(want.cardId) < want.qty) return false;
      addOwned(want.cardId, -want.qty);
      return true;
    }

    let remain = want.qty;
    const list = getOwnedCardsByRarityAtLeast(want.rarity);
    const total = list.reduce((sum, c) => sum + c.count, 0);
    if (total < remain) return false;

    for (const c of list) {
      if (remain <= 0) break;
      const use = Math.min(remain, c.count);
      addOwned(c.id, -use);
      remain -= use;
    }
    return remain === 0;
  }

  function applyRewards(job) {
    addOcto(job.rewards.octo);
    addPlayerStats(job.rewards.exp, job.rewards.rep);
    for (const item of job.rewards.items) {
      addInventory(item.kind, item.id, item.qty);
    }
  }

  function getVisitorStatus(job) {
    const need = getNeedStatus(job);
    if (job.completed) {
      return { cls: "done", text: "成立済み", button: "成立済み" };
    }
    if (need.ok) {
      return { cls: "ok", text: "マッチ成立", button: "今すぐマッチ" };
    }
    return { cls: "ng", text: "片想い", button: "詳細を見る" };
  }

  function sortJobs(jobs) {
    return jobs.slice().sort((a, b) => {
      const sa = getVisitorStatus(a);
      const sb = getVisitorStatus(b);

      const weight = (job, status) => {
        if (job.completed) return 2;
        if (status.cls === "ok") return 0;
        return 1;
      };

      const wa = weight(a, sa);
      const wb = weight(b, sb);
      if (wa !== wb) return wa - wb;
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return b.difficulty - a.difficulty;
    });
  }

  function findJobById(jobId) {
    const state = getBoard();
    return state.jobs.find(v => v.id === jobId) || (state.legendJob?.id === jobId ? state.legendJob : null);
  }

  // =========================================================
  // Render helpers
  // =========================================================
  function itemIcon(kind) {
    if (kind === "seed") return "🌱";
    if (kind === "water") return "💧";
    return "🧪";
  }

  function itemLabel(kind, id) {
    return REWARD_ITEMS[kind]?.[id]?.name || id;
  }

  function miniWantHTML(want) {
    if (want.type === "card") {
      return `
        <div class="wantMini">
          <img src="${want.img}" alt="${escapeHtml(want.name)}">
          <div class="wantMiniQty">×${want.qty}</div>
        </div>
      `;
    }

    return `
      <div class="wantMini">
        <div class="wantMiniRarity ${escapeHtml(want.rarity)}">
          <div>${escapeHtml(want.label)}</div>
          <div>×${want.qty}</div>
        </div>
      </div>
    `;
  }

  function rewardMiniHTML(job) {
    const items = job.rewards.items.slice(0, 2).map(item => {
      return `<span class="rewardChip">${itemIcon(item.kind)} ${escapeHtml(itemLabel(item.kind, item.id))}×${item.qty}</span>`;
    }).join("");

    return `
      <span class="rewardChip">🪙 ${job.rewards.octo.toLocaleString()}</span>
      ${items}
    `;
  }

  function renderHero() {
    const mode = getTimeMode();
    $("#heroImage").src = mode === "day"
      ? "https://ul.h3z.jp/lqCNnwQH.png"
      : "https://ul.h3z.jp/UtPlWaZz.png";

    const rnd = seededRandom(`hero::${todayKey()}`);
    $("#heroSpeechText").textContent = pick(HERO_LINES, rnd);
  }

  function renderMatchList() {
    const state = getBoard();
    const jobs = sortJobs(state.jobs);
    const root = $("#matchList");

    root.innerHTML = jobs.map(job => {
      const status = getVisitorStatus(job);

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
                  <span class="matchBadge ${status.cls}">${status.text}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="matchMain">
            <div class="matchMainGrid">
              <div class="wantCol">
                <div class="wantCards">${job.wants.slice(0, 3).map(miniWantHTML).join("")}</div>
                <div class="rewardRow">${rewardMiniHTML(job)}</div>
              </div>

              <div class="actionCol">
                <button class="matchBtn ${status.cls === "ok" && !job.completed ? "primary" : ""}" data-job-id="${job.id}">
                  ${status.button}
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");

    if (state.legendJob) {
      const job = state.legendJob;
      const need = getNeedStatus(job);
      const label = job.completed ? "成立済み" : need.ok ? "マッチ成立" : "片想い";

      $("#legendMatch").classList.remove("hidden");
      $("#legendMatch").innerHTML = `
        <div class="legendMatchInner">
          <img class="legendAvatar" src="${job.visitorImg}" alt="${escapeHtml(job.visitorName)}">

          <div>
            <div class="legendCap">本日の特別依頼</div>
            <h3 class="legendName">${escapeHtml(job.visitorName)}</h3>
            <p class="legendText">
              ${escapeHtml(job.line)}<br>
              報酬：🪙 ${job.rewards.octo.toLocaleString()}
              ${job.rewards.items.map(v => ` / ${itemIcon(v.kind)} ${itemLabel(v.kind, v.id)}×${v.qty}`).join("")}
            </p>
          </div>

          <div style="display:grid; gap:8px; justify-items:end;">
            <span class="matchBadge ${job.completed ? "done" : need.ok ? "ok" : "ng"}">${label}</span>
            <button class="matchBtn primary" data-job-id="${job.id}">詳細を見る</button>
          </div>
        </div>
      `;
    } else {
      $("#legendMatch").classList.add("hidden");
      $("#legendMatch").innerHTML = "";
    }

    $$("[data-job-id]").forEach(btn => {
      btn.addEventListener("click", () => openJobModal(btn.dataset.jobId));
    });
  }

  function modalWantHTML(want) {
    if (want.type === "card") {
      const owned = getOwnedCount(want.cardId);
      return `
        <div class="modalWantItem">
          <div class="modalWantCard">
            <img src="${want.img}" alt="${escapeHtml(want.name)}">
            <div class="modalOwnQty">所持${owned}</div>
            <div class="modalNeedQty">×${want.qty}</div>
          </div>
          <div class="modalWantName">${escapeHtml(want.name)}</div>
        </div>
      `;
    }

    const ownedList = getOwnedCardsByRarityAtLeast(want.rarity);
    const total = ownedList.reduce((sum, c) => sum + c.count, 0);

    return `
      <div class="modalWantItem">
        <div class="modalWantCard">
          <div class="wantMiniRarity ${escapeHtml(want.rarity)}" style="font-size:12px;">
            <div style="font-size:22px;margin-bottom:6px;">${escapeHtml(want.rarity)}</div>
            <div>${escapeHtml(want.label)}</div>
          </div>
          <div class="modalOwnQty">所持${total}</div>
          <div class="modalNeedQty">×${want.qty}</div>
        </div>
        <div class="modalWantName">${escapeHtml(want.label)}</div>
      </div>
    `;
  }

  function modalRewardHTML(job) {
    const itemLines = job.rewards.items.map(v => {
      const label = itemLabel(v.kind, v.id);
      return `${itemIcon(v.kind)} ${label} ×${v.qty}`;
    }).join("\n");

    return `
      <div class="modalRewardGrid">
        <div class="modalRewardBox">
          <div class="modalRewardBoxLabel">成立報酬</div>
          <div class="modalRewardBoxValue">🪙 ${job.rewards.octo.toLocaleString()} オクト</div>
        </div>

        <div class="modalRewardBox">
          <div class="modalRewardBoxLabel">成長</div>
          <div class="modalRewardBoxValue">EXP +${job.rewards.exp}\n評判 +${job.rewards.rep}</div>
        </div>

        <div class="modalRewardBox" style="grid-column:1 / -1;">
          <div class="modalRewardBoxLabel">追加資材</div>
          <div class="modalRewardBoxValue">${escapeHtml(itemLines)}</div>
        </div>
      </div>
    `;
  }

  function renderModal(job) {
    const need = getNeedStatus(job);
    const status = getVisitorStatus(job);

    $("#jobModalBody").innerHTML = `
      <div class="modalTop">
        <img class="modalAvatar" src="${job.visitorImg}" alt="${escapeHtml(job.visitorName)}">

        <div>
          <h2 class="modalName" id="modalJobName">${escapeHtml(job.visitorName)}</h2>
          <p class="modalLine">${escapeHtml(job.line)}</p>
        </div>

        <div class="modalRight">
          <div class="matchStars s${job.difficulty}">${stars(job.difficulty)}</div>
          <div class="modalTagRow">
            <span class="modalTag">難易度 ${job.difficulty}</span>
            <span class="modalTag">${job.legend ? "特別依頼" : job.featured ? "目玉依頼" : "通常依頼"}</span>
          </div>
        </div>
      </div>

      <section>
        <h3 class="modalSectionTitle">希望条件</h3>
        <div class="modalWantGrid">
          ${job.wants.map(modalWantHTML).join("")}
        </div>
      </section>

      <section>
        <h3 class="modalSectionTitle">成立報酬</h3>
        ${modalRewardHTML(job)}
      </section>

      <section class="modalStatusList">
        ${need.lines.map(v => `<div class="modalStatusLine ${v.ok ? "ok" : "ng"}">${escapeHtml(v.text)}</div>`).join("")}
      </section>

      <div class="modalActions">
        <div class="modalNote">
          ${
            job.completed
              ? "この相手とはすでに成立済みたこ。"
              : need.ok
                ? "条件が合ってるたこ。今すぐマッチできるたこ。"
                : "条件が足りないたこ。片想い解消には在庫が必要たこ。"
          }
        </div>

        <button class="modalPrimaryBtn" id="modalPrimaryBtn" ${job.completed || !need.ok ? "disabled" : ""}>
          ${job.completed ? "成立済み" : status.cls === "ok" ? "今すぐマッチ" : "詳細を見る"}
        </button>
      </div>
    `;

    const btn = $("#modalPrimaryBtn");
    if (btn) {
      btn.addEventListener("click", () => deliverJob(job.id));
    }
  }

  function openJobModal(jobId) {
    const job = findJobById(jobId);
    if (!job) return;
    renderModal(job);
    $("#jobModal").classList.add("show");
    $("#jobModal").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeJobModal() {
    $("#jobModal").classList.remove("show");
    $("#jobModal").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  async function showRewardModal(job) {
    $("#rewardTitle").textContent = "……焼けたね";
    $("#rewardSub").textContent = `${job.visitorName} とマッチ成立たこ。\n報酬を順番に追加するたこ。`;

    const list = $("#rewardList");
    list.innerHTML = "";

    const lines = [
      `🪙 ${job.rewards.octo.toLocaleString()} オクト`,
      `EXP +${job.rewards.exp} / 評判 +${job.rewards.rep}`,
      ...job.rewards.items.map(v => `${itemIcon(v.kind)} ${itemLabel(v.kind, v.id)} ×${v.qty}`)
    ];

    $("#rewardModal").classList.add("show");
    $("#rewardModal").setAttribute("aria-hidden", "false");

    for (const line of lines) {
      const row = document.createElement("div");
      row.className = "rewardItem";
      row.textContent = line;
      list.appendChild(row);
      await new Promise(r => setTimeout(r, 170));
      row.classList.add("show");
    }
  }

  function hideRewardModal() {
    $("#rewardModal").classList.remove("show");
    $("#rewardModal").setAttribute("aria-hidden", "true");
    $("#rewardList").innerHTML = "";
  }

  function deliverJob(jobId) {
    const state = getBoard();
    const job = state.jobs.find(v => v.id === jobId) || (state.legendJob?.id === jobId ? state.legendJob : null);
    if (!job || job.completed) return;

    const need = getNeedStatus(job);
    if (!need.ok) {
      showTakopiLine("……足りないのはカードじゃなくて覚悟たこ");
      renderAll();
      return;
    }

    for (const want of job.wants) {
      const ok = consumeNeed(want);
      if (!ok) {
        showTakopiLine("……交渉決裂たこ");
        renderAll();
        return;
      }
    }

    applyRewards(job);
    job.completed = true;
    job.completedAt = Date.now();
    saveJSON(KEY.board, state);

    closeJobModal();
    renderAll();
    showRewardModal(job);
    showTakopiLine("……焼けたね");
  }

  // =========================================================
  // Takopi
  // =========================================================
  let takopiTimer = null;

  function showTakopiLine(text) {
    $("#takopiToastInner").textContent = text;
    $("#takopiToast").classList.add("show");
    clearTimeout(takopiTimer);
    takopiTimer = setTimeout(() => {
      $("#takopiToast").classList.remove("show");
    }, 2600);
  }

  function randomTakopiLine() {
    const rnd = seededRandom(`${todayKey()}::takopi::${Date.now()}`);
    showTakopiLine(pick(TAKOPI_LINES, rnd));
  }

  function bindTakopiAutoTalk() {
    const queue = [7000, 15000, 26000];
    queue.forEach((delay, idx) => {
      setTimeout(() => {
        const rnd = seededRandom(`${todayKey()}::takopi-auto::${idx}`);
        showTakopiLine(pick(TAKOPI_LINES, rnd));
      }, delay);
    });
  }

  // =========================================================
  // Render
  // =========================================================
  function renderAll() {
    renderHero();
    renderMatchList();
  }

  // =========================================================
  // UI bind
  // =========================================================
  function bindUI() {
    $("#backBtn").addEventListener("click", () => {
      if (history.length > 1) history.back();
      else location.href = "./";
    });

    $("#takopiFloat").addEventListener("click", randomTakopiLine);

    $("#jobModalClose").addEventListener("click", closeJobModal);
    $("#jobModal").addEventListener("click", (e) => {
      if (e.target === $("#jobModal")) closeJobModal();
    });

    $("#rewardCloseBtn").addEventListener("click", hideRewardModal);
    $("#rewardModal").addEventListener("click", (e) => {
      if (e.target === $("#rewardModal")) hideRewardModal();
    });

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
  generateBoard(false);
  bindUI();
  renderAll();
  bindTakopiAutoTalk();
})();