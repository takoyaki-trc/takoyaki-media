(() => {
  "use strict";

  const LS_KEY = "roten_v1_guest_affection";
  const REGULAR_LOVE_THRESHOLD = 80;
  const REGULAR_BUDGET_BONUS_RATE = 0.18; // おすすめ値：18%

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

  // 今の価格帯に合わせて調整済み
  // rich（札束タコ民）のみ 10億〜100億
  const CUSTOMER_BUDGET_RANGE = {
    careful:   { min: 800,        max: 3200 },
    looker:    { min: 300,        max: 1200 },
    picky:     { min: 700,        max: 2600 },
    diet:      { min: 900,        max: 3000 },
    overflow:  { min: 1000,       max: 3800 },
    relax:     { min: 1200,       max: 4200 },
    guide:     { min: 1000,       max: 4000 },

    impulse:   { min: 1500,       max: 5500 },
    opener:    { min: 1800,       max: 6000 },
    streamer:  { min: 1800,       max: 6500 },
    party:     { min: 2000,       max: 7000 },
    ramen:     { min: 1800,       max: 6500 },
    climber:   { min: 2200,       max: 7000 },
    shadow:    { min: 2200,       max: 7000 },
    gourmet:   { min: 2500,       max: 8500 },

    flipper:   { min: 2500,       max: 9000 },
    artisan:   { min: 3000,       max: 10000 },
    collector: { min: 3500,       max: 12000 },
    pilgrim:   { min: 4000,       max: 14000 },

    king:      { min: 12000,      max: 30000 },

    rich:      { min: 1000000000, max: 100000000000 }
  };

  const GUEST_LABELS = {
    impulse:   { min:0, text:"まだ勢いだけで来ている。", mid:"ノリが合う店だと思い始めている。", max:"勢いで来て、愛着で帰る常連。" },
    picky:     { min:0, text:"まだ厳しく見定めている。", mid:"少しずつ認め始めている。", max:"うるさいけど、かなり気に入っている。" },
    king:      { min:0, text:"まだ試す目で見ている。", mid:"店の格を認め始めている。", max:"王が認めた棚。かなり強い。" },
    flipper:   { min:0, text:"利益しか見ていない。", mid:"数字以外の価値も少し見えてきた。", max:"打算から始まったのに、なぜか情がある。" },
    careful:   { min:0, text:"まだ警戒しながら様子見。", mid:"少しずつ安心してきている。", max:"かなり信頼している常連候補。" },
    looker:    { min:0, text:"まだ“見るだけ”の距離感。", mid:"眺めるだけでは済まなくなってきた。", max:"口では軽いが、かなり好き。" },
    rich:      { min:0, text:"金で測っている。", mid:"値段以外の面白さも認め始めた。", max:"財布より先に心が動いている。" },
    climber:   { min:0, text:"まだ試練の棚だと思っている。", mid:"登る価値のある店だと思い始めた。", max:"景色の見える常連ポジション。" },
    guide:     { min:0, text:"まだ外から案内している。", mid:"語りたくなる場所になってきた。", max:"もう半分この店の広報。" },
    relax:     { min:0, text:"まだ様子見で空気を読んでいる。", mid:"居心地の良さを感じ始めている。", max:"癒やし目的でも来ている。" },
    artisan:   { min:0, text:"仕事として見ている。", mid:"腕前を認めてきている。", max:"技術も空気も含めて評価している。" },
    diet:      { min:0, text:"理屈で距離を取っている。", mid:"理論の中に好意が混ざり始めた。", max:"もはや理屈を超えて好き。" },
    overflow:  { min:0, text:"まだ枠外から見ている。", mid:"ズレた会話を楽しみ始めている。", max:"規格外どうしで相性が良い。" },
    collector: { min:0, text:"まだ管理対象として見ている。", mid:"保存以上の感情が生まれ始めた。", max:"かなり大切な棚認定。" },
    shadow:    { min:0, text:"まだ慎重に距離を測っている。", mid:"守れる価値を感じ始めている。", max:"信用しているから買う側に寄っている。" },
    ramen:     { min:0, text:"まだ濃さだけ見ている。", mid:"味わうように通い始めている。", max:"締めに寄りたくなる店になった。" },
    streamer:  { min:0, text:"まだネタとして見ている。", mid:"映え以上の面白さを感じている。", max:"本気で推したくなっている。" },
    gourmet:   { min:0, text:"まだ厳しく品定めしている。", mid:"余韻のある店だと感じ始めた。", max:"かなり深く気に入っている。" },
    opener:    { min:0, text:"まだ勢いだけで近づいている。", mid:"開封以上に店も楽しみ始めた。", max:"テンション込みでかなり好き。" },
    party:     { min:0, text:"まだ祭りのノリで来ている。", mid:"ノリ以上の居場所感が出てきた。", max:"騒がしいけど本気で好き。" },
    pilgrim:   { min:0, text:"まだ巡礼先のひとつ。", mid:"来た意味がある場所だと思い始めた。", max:"わざわざ来る価値があると確信している。" }
  };

  const TALK_POOLS = {
    careful: [
      {
        mood: "慎重に棚を見ながら、そっと聞いてきた。",
        ask: "……これ、買ったあと後悔しないやつ？",
        choices: [
          { text: "後悔しても、それ込みで思い出です。", delta: +3, reply: "……その言い方、ずるいな。ちょっと好き。", stage: "……少し肩の力が抜けたみたいだ。", log: "思い出として背中を押した" },
          { text: "人によります。慎重にどうぞ。", delta: 0, reply: "……うん、それが一番信用できる。", stage: "……誠実さは伝わったらしい。", log: "慎重派に誠実対応した" },
          { text: "後悔する前にもう一枚どうですか。", delta: -5, reply: "……急に怖くなってきた。", stage: "……少し引かれた。", log: "慎重派に圧をかけた" }
        ]
      },
      {
        mood: "財布を握りしめて小声で話してきた。",
        ask: "……勢いで買うと危ないかな。",
        choices: [
          { text: "危ない。でもたまに正解です。", delta: +3, reply: "……危ないって言いながら肯定するんだ。", stage: "……危なさごと受け入れたようだ。", log: "慎重派に本音で返した" },
          { text: "今日は見るだけでも大丈夫です。", delta: 0, reply: "……そう言われると逆に安心する。", stage: "……安心感が少し増した。", log: "慎重派を安心させた" },
          { text: "勢いがないと人生つまらないです。", delta: -5, reply: "……今それを言われると困る。", stage: "……押しが強すぎたかもしれない。", log: "慎重派に勢い論をぶつけた" }
        ]
      }
    ],

    impulse: [
      {
        mood: "目を輝かせて身を乗り出してきた。",
        ask: "これ、今いっといた方がいい感じ？",
        choices: [
          { text: "今いかないと、未来の自分がうるさいです。", delta: +3, reply: "そういうの好き！ 未来の自分はあとで謝らせる！", stage: "……完全にテンションが上がった。", log: "即決派の勢いを肯定した" },
          { text: "深呼吸してからでも遅くないです。", delta: 0, reply: "それもそう。でも多分もう遅い気もする！", stage: "……少し理性が戻った。", log: "即決派を少し落ち着かせた" },
          { text: "迷うなら今日はやめましょう。", delta: -5, reply: "えっ、そこは背中押してよ！？", stage: "……勢いを止められて少し不満そうだ。", log: "即決派を止めた" }
        ]
      }
    ],

    looker: [
      {
        mood: "見るだけの顔で話しかけてきた。",
        ask: "……見るだけでも、なんか言われない？",
        choices: [
          { text: "見るだけ勢も立派なお客さんです。", delta: +3, reply: "……そういう言い方されると弱いな。", stage: "……“見るだけ”の防御が少し剥がれた。", log: "冷やかし客を肯定した" },
          { text: "今日は下見でも全然OKです。", delta: 0, reply: "……じゃあ今日はそういうことにする。", stage: "……居やすくなったようだ。", log: "冷やかし客に逃げ道を作った" },
          { text: "見るだけは、まあ、ほどほどに。", delta: -5, reply: "……あ、やっぱそういう空気あるんだ。", stage: "……少し距離を取られた。", log: "冷やかし客にプレッシャーを与えた" }
        ]
      }
    ],

    picky: [
      {
        mood: "かなり細かい目で棚を見ながら聞いてきた。",
        ask: "これ、“なんとなく良い”で済ませてない？",
        choices: [
          { text: "済ませてません。ちゃんと危ない良さです。", delta: +3, reply: "……危ない良さ、嫌いじゃない。", stage: "……厳しい顔のまま、ちょっとだけ口元がゆるんだ。", log: "うるさめ客に言葉で返した" },
          { text: "その目で見てもらえるの、むしろ嬉しいです。", delta: 0, reply: "……へえ、嫌がらないんだ。", stage: "……少し評価された。", log: "うるさめ客の厳しさを歓迎した" },
          { text: "なんとなくも大事ですよ。", delta: -5, reply: "……雑にまとめられた気がする。", stage: "……納得していない。", log: "うるさめ客を雑に流した" }
        ]
      }
    ],

    king: [
      {
        mood: "王の余裕で問いを投げてきた。",
        ask: "余に買う理由をひとつ述べよ。",
        choices: [
          { text: "王が買えば、それが理由になります。", delta: +3, reply: "よい。話が早い。", stage: "……王様はかなり機嫌が良い。", log: "王様を持ち上げた" },
          { text: "理由なら棚にあります。あとは王の目で。", delta: 0, reply: "ふむ。余に委ねるか。悪くない。", stage: "……少し試すような顔になった。", log: "王様に判断を委ねた" },
          { text: "理由がないなら無理に買わなくていいです。", delta: -5, reply: "余を試しているのか？", stage: "……王の機嫌を損ねた。", log: "王様を突き放した" }
        ]
      }
    ],

    flipper: [
      {
        mood: "数字を弾く目で低く聞いてきた。",
        ask: "で、これ、回ると思う？",
        choices: [
          { text: "回るかも。でも“残したくなる”方が危険です。", delta: +3, reply: "……数字じゃない言い方、ちょっと面白いな。", stage: "……計算以外の価値を少し考え始めた。", log: "転売寄り客に情緒を返した" },
          { text: "利益は保証できません。面白さはあります。", delta: 0, reply: "正直だな。嫌いじゃない。", stage: "……正直さは通った。", log: "転売寄り客に正直に答えた" },
          { text: "回る前提で来るなら合わないかも。", delta: -5, reply: "……へえ、そう来るんだ。", stage: "……空気が少し冷えた。", log: "転売寄り客を牽制した" }
        ]
      }
    ],

    rich: [
      {
        mood: "余裕の笑みで値段を眺めている。",
        ask: "高いものには理由がある。で、これは？",
        choices: [
          { text: "理由より先に、刺さる人だけ刺さるやつです。", delta: +3, reply: "いいね。万人向けじゃない顔をしてる。", stage: "……“選ばれた感”が刺さったようだ。", log: "札束客に希少感を返した" },
          { text: "値段じゃなく、後から話したくなるタイプです。", delta: 0, reply: "それはわかる。悪くない。", stage: "……会話の余韻を評価している。", log: "札束客に余韻を売った" },
          { text: "雰囲気です。ほぼ雰囲気です。", delta: -5, reply: "正直すぎるのも考えものだな。", stage: "……ちょっと引かれた。", log: "札束客に雑すぎる説明をした" }
        ]
      }
    ],

    climber: [
      {
        mood: "高みを見る目で話しかけてきた。",
        ask: "これ、登る価値ある？",
        choices: [
          { text: "登った先で、ちょっと景色が変わります。", delta: +3, reply: "……それなら行く意味はあるな。", stage: "……“景色”の言葉が効いた。", log: "踏破客に景色を見せた" },
          { text: "楽ではないけど、だから残ります。", delta: 0, reply: "苦労の分だけ覚えるやつか。嫌いじゃない。", stage: "……納得したようだ。", log: "踏破客に難しさを肯定した" },
          { text: "平坦な道が好きなら向かないです。", delta: -5, reply: "……言い方は嫌いじゃないが、ちょっと刺さる。", stage: "……少しだけ棘が残った。", log: "踏破客に煽り気味に返した" }
        ]
      }
    ],

    guide: [
      {
        mood: "案内人の顔でこちらを見ている。",
        ask: "初見の人にも、この棚は通じると思う？",
        choices: [
          { text: "通じる人には一発で通じます。", delta: +3, reply: "その言い方、案内しがいがあるね。", stage: "……広めたくなってきた顔だ。", log: "ナビ客に語りやすさを渡した" },
          { text: "説明したくなる棚だと思います。", delta: 0, reply: "ああ、それはわかる。", stage: "……少しうれしそうだ。", log: "ナビ客に紹介しやすさを返した" },
          { text: "分かる人だけで十分です。", delta: -5, reply: "……入口を閉じる言い方は惜しいな。", stage: "……少し残念そうだ。", log: "ナビ客に閉じた返しをした" }
        ]
      }
    ],

    relax: [
      {
        mood: "やわらかい空気で話しかけてきた。",
        ask: "ここ、なんか落ち着くね。わざと？",
        choices: [
          { text: "たぶん、焼かれる前の静けさです。", delta: +3, reply: "ふふ、落ち着くのに物騒なの好き。", stage: "……かなり空気を気に入ったようだ。", log: "ほぐし客に世界観で返した" },
          { text: "落ち着いて見えて、中身はだいぶ危ないです。", delta: 0, reply: "そのギャップ、いいね。", stage: "……ギャップが刺さった。", log: "ほぐし客にギャップを見せた" },
          { text: "特に考えてないです。偶然です。", delta: -5, reply: "……急に夢がほどけた。", stage: "……ちょっとしぼんだ。", log: "ほぐし客の気分を壊した" }
        ]
      }
    ],

    artisan: [
      {
        mood: "手元を見るような目で尋ねてきた。",
        ask: "これ、ちゃんと手が入ってる顔してるね。意識してる？",
        choices: [
          { text: "雑に見せないことだけは意地です。", delta: +3, reply: "……いい意地だ。そういうのは出る。", stage: "……職人同士の会話になった。", log: "職人気質に意地で返した" },
          { text: "細かい所ほど見られると思ってます。", delta: 0, reply: "その感覚は信用できる。", stage: "……かなり納得したようだ。", log: "職人気質に細部意識を返した" },
          { text: "雰囲気でごまかしてます。", delta: -5, reply: "……それを言うのはもったいない。", stage: "……一気に評価が下がった。", log: "職人気質に雑な返しをした" }
        ]
      }
    ],

    diet: [
      {
        mood: "理屈っぽい顔で真面目に聞いてきた。",
        ask: "これって実質0カロリーの買い物だよね？",
        choices: [
          { text: "体には入らないので、理論上かなり安全です。", delta: +3, reply: "そう！ それを聞きたかった！", stage: "……理論武装が完成した。", log: "ゼロ理論客の理屈を肯定した" },
          { text: "体重は増えないけど、欲は増えます。", delta: 0, reply: "うわ、それは認めざるを得ない。", stage: "……理論に少し感情が混ざった。", log: "ゼロ理論客に真実を混ぜた" },
          { text: "財布のカロリーは高いです。", delta: -5, reply: "……現実を差し込むのやめて。", stage: "……少ししょんぼりした。", log: "ゼロ理論客に財布現実をぶつけた" }
        ]
      }
    ],

    overflow: [
      {
        mood: "少しズレた角度から話しかけてきた。",
        ask: "普通じゃない方が、逆に信用できる時あるよね？",
        choices: [
          { text: "あります。まともすぎると逆に怖いです。", delta: +3, reply: "いいね、その感覚。話が早い。", stage: "……波長が合ったらしい。", log: "枠外客にズレ感で返した" },
          { text: "ズレてても芯があれば強いです。", delta: 0, reply: "あ、それは好きな言い方。", stage: "……かなり納得している。", log: "枠外客に芯の話をした" },
          { text: "普通が一番です。", delta: -5, reply: "……じゃあ今日は話が合わない日だ。", stage: "……露骨に距離を取られた。", log: "枠外客を真っ向否定した" }
        ]
      }
    ],

    collector: [
      {
        mood: "管理する目で静かに聞いてきた。",
        ask: "これ、開ける用と守る用、どっちが正解だと思う？",
        choices: [
          { text: "正解は、悩んだ時点で2枚です。", delta: +3, reply: "……やっぱりそれか。わかってる。", stage: "……完全に刺さった。", log: "コレクターに2枚理論を返した" },
          { text: "まずは手元に置く用が大事です。", delta: 0, reply: "それもわかる。距離感ってあるよね。", stage: "……かなり共感された。", log: "コレクターに距離感で返した" },
          { text: "開けたら開けたでいいんじゃないですか。", delta: -5, reply: "……雑に触られた感じがする。", stage: "……少し機嫌を損ねた。", log: "コレクターの管理感覚を雑に扱った" }
        ]
      }
    ],

    shadow: [
      {
        mood: "慎重な声で確認してきた。",
        ask: "こういうのって、守る価値ある？",
        choices: [
          { text: "ある。だから持つ前から気を遣うやつです。", delta: +3, reply: "……それなら、ちゃんと守りたい。", stage: "……かなり信用された。", log: "防水客に守る価値を認めた" },
          { text: "守れる人の手にある方が強いです。", delta: 0, reply: "その言い方は好きだ。", stage: "……責任感がくすぐられたようだ。", log: "防水客に任せる言い方をした" },
          { text: "汚れたらそれも味です。", delta: -5, reply: "……今のは聞かなかったことにする。", stage: "……かなり引かれた。", log: "防水客に地雷を踏んだ" }
        ]
      }
    ],

    ramen: [
      {
        mood: "濃いものを前にした顔で聞いてきた。",
        ask: "これ、一枚で終わる気しないんだけど。",
        choices: [
          { text: "だいたいその予感は当たります。", delta: +3, reply: "だよね。そういう顔してるもん。", stage: "……追加購入の気配が強い。", log: "替え玉客の予感を肯定した" },
          { text: "最初の一枚が一番危ないです。", delta: 0, reply: "危ないって言い方、好きだな。", stage: "……危険ワードが効いた。", log: "替え玉客に危険性を伝えた" },
          { text: "一枚で十分だと思います。", delta: -5, reply: "……その言葉は信用できない。", stage: "……空気を読まれていない顔だ。", log: "替え玉客のノリを切った" }
        ]
      }
    ],

    streamer: [
      {
        mood: "撮れ高を探すように笑っている。",
        ask: "これ、ハズしてもおいしい？",
        choices: [
          { text: "当たりでもハズレでも、だいたい話になります。", delta: +3, reply: "それそれ！ そういうの大事！", stage: "……撮れ高の匂いを感じている。", log: "配信客に撮れ高を返した" },
          { text: "むしろリアクション次第です。", delta: 0, reply: "それはわかる。腕が試されるやつだ。", stage: "……少し燃えている。", log: "配信客に腕勝負を返した" },
          { text: "結果だけ見ればいいと思います。", delta: -5, reply: "……いや、そこじゃないんだよな。", stage: "……温度差が出た。", log: "配信客に結果論で返した" }
        ]
      }
    ],

    gourmet: [
      {
        mood: "余韻を見るような顔で尋ねてきた。",
        ask: "これ、買ったあとに“残る”タイプ？",
        choices: [
          { text: "残ります。静かにあとから効く方です。", delta: +3, reply: "……いいね。その言い方。", stage: "……かなり上品に刺さった。", log: "舌判定客に余韻で返した" },
          { text: "派手じゃないけど、忘れにくいです。", delta: 0, reply: "それが一番危ないんだよね。", stage: "……深く納得している。", log: "舌判定客に忘れにくさを返した" },
          { text: "その場の勢いだけです。", delta: -5, reply: "……急に浅くなった。", stage: "……評価がだいぶ下がった。", log: "舌判定客に浅い返しをした" }
        ]
      }
    ],

    opener: [
      {
        mood: "今すぐ触りたい顔で話しかけてきた。",
        ask: "これ、帰るまで待てると思う？",
        choices: [
          { text: "無理です。たぶん数分で限界です。", delta: +3, reply: "わかる！ それを認めてほしかった！", stage: "……完全に同意を得て満足そうだ。", log: "即バリ客の衝動を認めた" },
          { text: "我慢できたら偉いです。でも多分無理です。", delta: 0, reply: "その“多分無理”好き。", stage: "……かなり楽しそうだ。", log: "即バリ客に半分止めた" },
          { text: "家まで待ちましょう。", delta: -5, reply: "……正論だけど今じゃない。", stage: "……少し勢いを削いだ。", log: "即バリ客に正論で返した" }
        ]
      }
    ],

    party: [
      {
        mood: "祭りのテンションで笑っている。",
        ask: "今日くらい、財布も踊ってよくない？",
        choices: [
          { text: "今日は財布も祭りに参加です。", delta: +3, reply: "そうそう！ そういう話！", stage: "……だいぶ気分が上がった。", log: "宴客のテンションを肯定した" },
          { text: "明日の自分が泣いても、今日は景気で。", delta: 0, reply: "明日は明日！ 今日は今日！", stage: "……完全に祭りモードだ。", log: "宴客に明日を捨てさせた" },
          { text: "財布は踊らせない方が平和です。", delta: -5, reply: "……急に冷静さを入れないで。", stage: "……祭りの空気がしぼんだ。", log: "宴客を冷静にしすぎた" }
        ]
      }
    ],

    pilgrim: [
      {
        mood: "少し遠くを見たまま口を開いた。",
        ask: "ここまで来た意味、ちゃんとあるかな。",
        choices: [
          { text: "あります。来た人だけが持ち帰れる温度です。", delta: +3, reply: "……それなら来た甲斐がある。", stage: "……旅路ごと受け止められた顔だ。", log: "巡礼客の旅を肯定した" },
          { text: "意味は、帰る時にじわっと分かるやつです。", delta: 0, reply: "……遅れて効くの、嫌いじゃない。", stage: "……静かに納得している。", log: "巡礼客に余韻で返した" },
          { text: "意味は自分で決めるものです。", delta: -5, reply: "……正しいけど、今は少し冷たいな。", stage: "……少しだけ距離ができた。", log: "巡礼客に突き放した返しをした" }
        ]
      }
    ]
  };

  const GENERIC_POOL = [
    {
      mood: "少し気になった顔でこちらを見ている。",
      ask: "この棚って、なんでこんなに気になるんだろう。",
      choices: [
        { text: "たぶん、見た目より中身が危ないからです。", delta: +3, reply: "……その言い方、嫌いじゃない。", stage: "……“危ない”の一言が刺さったようだ。", log: "汎用会話で危険さを伝えた" },
        { text: "気になる時点で、もう片足入ってます。", delta: 0, reply: "……それ、ちょっと認めたくないな。", stage: "……図星っぽい。", log: "汎用会話で図星を刺した" },
        { text: "気のせいかもしれません。", delta: -5, reply: "……急に興ざめした。", stage: "……空気が少ししぼんだ。", log: "汎用会話で気のせい扱いした" }
      ]
    }
  ];

  const IGNORE_LINES_COMMON = [
    "……無視しないでください……。",
    "……返事、ちょっと待ってたんだけどな。",
    "……あ、いま話しかける流れじゃなかった？",
    "……なるほど、空気だけ吸って帰るやつですね。",
    "……返事がないの、ちょっと刺さる。",
    "……こっちは勇気を出したんですが……。",
    "……黙るなら黙るで、先に言ってほしかった。",
    "……棚より、こっちの心が焼けたかも。",
    "……いまの沈黙、だいぶ長くない？",
    "……気まずさだけ置いて帰る感じになってきた。"
  ];

  const IGNORE_LINES_BY_TYPE = {
    careful: ["……返事がないと、余計に不安になるな……。","……慎重に聞いたつもりだったんだけど。","……やっぱり聞かない方がよかったかな。"],
    impulse: ["えっ、いま乗るとこじゃなかった！？","うわ、勢いだけ置いていかれた！","テンションの着地に失敗した！"],
    looker: ["……あ、見るだけどころか会話もスルーなんだ。","……まあ、そういう距離感もあるか。","……軽い気持ちで話しかけたら重傷だった。"],
    picky: ["……雑に流された感じがする。","……答えがないのも評価対象なんだけどな。","……なるほど、そういう店か。"],
    king: ["余を待たせるだけでなく、黙らせるか。","……王の問いに沈黙とは、大胆だな。","……面白い。だが減点だ。"],
    flipper: ["……返答コストすら払わないタイプか。","……数字より先に無視が来るとは。","……会話の利回り、最悪だな。"]
  };

  let els = {
    stageName: null,
    stageMsg: null,
    talkInline: null,
    talkMoodInline: null,
    timerInline: null,
    c1: null,
    c2: null,
    c3: null,

    guestList: null,
    guestEmpty: null,
    guestCard: null,

    affectionBtn: null,
    affectionModal: null,
    affectionClose: null,
    affectionOk: null,
    affectionModalList: null,
    affectionModalEmpty: null
  };

  let activeTalk = null;
  let countdownTimer = null;
  let talkDelayTimer = null;
  let onStateChangeGlobal = null;
  let onResultGlobal = null;
  let helpersGlobal = null;
  let initDone = false;
  let bootRetryTimer = null;

  function clampValue(n, min, max){
    return Math.max(min, Math.min(max, Number(n || 0)));
  }

  function safeJSON(raw, fallback){
    try{ return JSON.parse(raw); }
    catch(e){ return fallback; }
  }

  function pickValue(arr){
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function shuffle(arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random() * (i+1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function guestDisplayName(id, fallback){
    if(activeTalk && activeTalk.guestId === id && activeTalk.guestName) return activeTalk.guestName;
    return fallback || CUSTOMER_NAME_MAP[id] || id || "来店客";
  }

  function loadState(){
    const raw = localStorage.getItem(LS_KEY);
    const parsed = safeJSON(raw, null);
    if(!parsed || typeof parsed !== "object"){
      return { ver:1, guests:{} };
    }
    if(!parsed.guests || typeof parsed.guests !== "object"){
      parsed.guests = {};
    }
    return parsed;
  }

  function saveState(state){
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }

  function getDefaultGuestState(){
    return {
      love: 0,
      talkCount: 0,
      buyCount: 0,
      ignoreCount: 0,
      lastTalkAt: 0,
      lastSeenAt: 0
    };
  }

  function getGuestState(id){
    const state = loadState();
    if(!state.guests[id]){
      return getDefaultGuestState();
    }
    return { ...getDefaultGuestState(), ...state.guests[id] };
  }

  function patchGuest(id, patch){
    const state = loadState();
    if(!state.guests[id]){
      state.guests[id] = getDefaultGuestState();
    }
    Object.assign(state.guests[id], patch || {});
    if(typeof state.guests[id].love === "number"){
      state.guests[id].love = clampValue(state.guests[id].love, 0, 100);
    }
    saveState(state);
    return state.guests[id];
  }

  function heartsFromLove(love){
    if(love >= 80) return 5;
    if(love >= 60) return 4;
    if(love >= 40) return 3;
    if(love >= 20) return 2;
    if(love >= 8)  return 1;
    return 0;
  }

  function isRegularLove(love){
    return Number(love || 0) >= REGULAR_LOVE_THRESHOLD;
  }

  function getRegularBudgetBonusRate(){
    return REGULAR_BUDGET_BONUS_RATE;
  }

  function getBudgetRangeByGuestId(id){
    return CUSTOMER_BUDGET_RANGE[id] || { min: 1500, max: 5000 };
  }

  function labelFromLove(id, love){
    const row = GUEST_LABELS[id];
    if(!row){
      if(love >= 80) return "かなり気に入っている。";
      if(love >= 40) return "少しずつ距離が縮んでいる。";
      return "まだ距離を測っている。";
    }
    if(love >= 80) return row.max;
    if(love >= 40) return row.mid;
    return row.text;
  }

  function getAffinityRows(){
    const state = loadState();
    const rows = Object.keys(state.guests).map(id => {
      const g = state.guests[id];
      const love = Number(g.love || 0);
      return {
        id,
        name: guestDisplayName(id, CUSTOMER_NAME_MAP[id] || id),
        icon: CUSTOMER_ICON_MAP[id] || "",
        love,
        hearts: heartsFromLove(love),
        talkCount: Number(g.talkCount || 0),
        buyCount: Number(g.buyCount || 0),
        ignoreCount: Number(g.ignoreCount || 0),
        label: labelFromLove(id, love),
        isRegular: isRegularLove(love),
        budgetRange: getBudgetRangeByGuestId(id),
        lastSeenAt: Number(g.lastSeenAt || 0)
      };
    });

    rows.sort((a, b) =>
      (Number(b.isRegular) - Number(a.isRegular)) ||
      (b.love - a.love) ||
      (b.lastSeenAt - a.lastSeenAt) ||
      String(a.name).localeCompare(String(b.name), "ja")
    );

    return rows.slice(0, 30);
  }

  function escapeHTML(s){
    return String(s || "").replace(/[&<>"']/g, m => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      "\"":"&quot;",
      "'":"&#039;"
    }[m]));
  }

  function injectStyles(){
    if(document.getElementById("rotenSocialExtraStyle")) return;

    const style = document.createElement("style");
    style.id = "rotenSocialExtraStyle";
    style.textContent = `
      #guestAffinity,
      #guestAffinityEmpty,
      #guestAffinityCard{
        display:none !important;
        visibility:hidden !important;
        opacity:0 !important;
        height:0 !important;
        max-height:0 !important;
        min-height:0 !important;
        margin:0 !important;
        padding:0 !important;
        overflow:hidden !important;
        pointer-events:none !important;
        border:0 !important;
      }

      .affrow{
        display:grid;
        grid-template-columns:56px 1fr;
        gap:10px;
        align-items:center;
      }
      .afficon{
        width:56px;
        height:56px;
        border-radius:12px;
        overflow:hidden;
        border:1px solid rgba(255,255,255,.14);
        background:rgba(0,0,0,.18);
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 8px 22px rgba(0,0,0,.18);
      }
      .afficon img{
        width:100%;
        height:100%;
        object-fit:contain;
        image-rendering:pixelated;
        display:block;
      }
      .afficon-fallback{
        font-size:11px;
        color:rgba(255,255,255,.66);
        text-align:center;
        line-height:1.2;
        padding:4px;
      }
      .affbody{
        min-width:0;
        display:grid;
        gap:8px;
      }
      .regular-badge{
        margin-left:8px;
        padding:2px 8px;
        border-radius:999px;
        font-size:11px;
        background:rgba(255,215,0,.18);
        border:1px solid rgba(255,215,0,.45);
        color:#ffe082;
        vertical-align:middle;
      }

      /* 所持金バッジの文字にじみ対策 */
      #stageName span[style*="border-radius:999px"]{
        text-shadow:none !important;
        filter:none !important;
        backdrop-filter:none !important;
        -webkit-backdrop-filter:none !important;
      }
      #stageName span[style*="box-shadow"]{
        box-shadow:none !important;
        text-shadow:none !important;
        filter:none !important;
      }

      /* 会話中の質問を目立たせる */
      #stageMsg.talk-question{
        display:block;
        margin-top:6px;
        padding:10px 12px;
        border-radius:12px;
        background:rgba(255, 208, 102, .18);
        border:1px solid rgba(255, 208, 102, .45);
        color:#fff4cf !important;
        font-weight:800;
        line-height:1.55;
        box-shadow:none !important;
      }

      /* 会話パネル全体を見やすく */
      #talkInline{
        margin-top:10px;
        padding:10px;
        border-radius:14px;
        background:rgba(0,0,0,.22);
        border:1px solid rgba(255,255,255,.10);
      }

      #talkMoodInline{
        color:#ffe082 !important;
        font-weight:800;
        letter-spacing:.02em;
      }

      #talkTimerInline{
        color:#ffd6d6 !important;
        font-weight:800;
      }

      .talk-inline-top{
        align-items:center;
        margin-bottom:8px;
      }

      .talk-inline-choices{
        display:grid;
        gap:8px;
        margin-top:8px;
      }

      .talk-inline-choices .talk-choice{
        min-height:44px;
        padding:10px 12px;
        border-radius:12px;
        border:1px solid rgba(255,255,255,.14);
        color:#fff !important;
        font-weight:700;
        line-height:1.45;
        box-shadow:none !important;
        text-shadow:none !important;
        transition:transform .08s ease, opacity .12s ease;
      }

      .talk-inline-choices .talk-choice:hover{
        transform:translateY(-1px);
      }

      .talk-inline-choices .talk-choice:nth-child(1){
        background:rgba(76, 175, 80, .22) !important;
        border-color:rgba(129, 199, 132, .55) !important;
      }

      .talk-inline-choices .talk-choice:nth-child(2){
        background:rgba(66, 165, 245, .20) !important;
        border-color:rgba(144, 202, 249, .50) !important;
      }

      .talk-inline-choices .talk-choice:nth-child(3){
        background:rgba(239, 83, 80, .18) !important;
        border-color:rgba(239, 154, 154, .45) !important;
      }

      .talk-inline-foot{
        margin-top:8px;
        color:rgba(255,255,255,.72);
        font-size:12px;
        line-height:1.5;
      }
    `;
    document.head.appendChild(style);
  }

  function bindEls(){
    els.stageName = document.getElementById("stageName");
    els.stageMsg = document.getElementById("stageMsg");
    els.talkInline = document.getElementById("talkInline");
    els.talkMoodInline = document.getElementById("talkMoodInline");
    els.timerInline = document.getElementById("talkTimerInline");
    els.c1 = document.getElementById("talkChoice1");
    els.c2 = document.getElementById("talkChoice2");
    els.c3 = document.getElementById("talkChoice3");

    els.affectionBtn = document.getElementById("affectionCheckBtn");
    els.affectionModal = document.getElementById("affectionModal");
    els.affectionClose = document.getElementById("affectionClose");
    els.affectionOk = document.getElementById("affectionOk");
    els.affectionModalList = document.getElementById("affectionModalList");
    els.affectionModalEmpty = document.getElementById("affectionModalEmpty");

    if(!els.guestList) els.guestList = document.getElementById("guestAffinity");
    if(!els.guestEmpty) els.guestEmpty = document.getElementById("guestAffinityEmpty");

    const guestCard = (els.guestList && els.guestList.closest(".card")) ||
                      (els.guestEmpty && els.guestEmpty.closest(".card")) ||
                      null;
    if(guestCard){
      els.guestCard = guestCard;
      if(!els.guestCard.id) els.guestCard.id = "guestAffinityCard";
    }
  }

  function bindGuestUI(payload){
    if(!payload) return;
    els.guestList = payload.guestAffinityEl || null;
    els.guestEmpty = payload.guestAffinityEmptyEl || null;

    const guestCard = (els.guestList && els.guestList.closest(".card")) ||
                      (els.guestEmpty && els.guestEmpty.closest(".card")) ||
                      null;
    if(guestCard){
      els.guestCard = guestCard;
      if(!els.guestCard.id) els.guestCard.id = "guestAffinityCard";
    }

    forceHideBottomAffinity();
    renderGuestAffinity();
    bindAffinityButtonDirect();
  }

  function hideElementHard(el){
    if(!el) return;
    el.style.setProperty("display", "none", "important");
    el.style.setProperty("visibility", "hidden", "important");
    el.style.setProperty("opacity", "0", "important");
    el.style.setProperty("height", "0", "important");
    el.style.setProperty("max-height", "0", "important");
    el.style.setProperty("min-height", "0", "important");
    el.style.setProperty("margin", "0", "important");
    el.style.setProperty("padding", "0", "important");
    el.style.setProperty("overflow", "hidden", "important");
    el.style.setProperty("pointer-events", "none", "important");
    el.style.setProperty("border", "0", "important");
  }

  function forceHideBottomAffinity(){
    const list = document.getElementById("guestAffinity") || els.guestList;
    const empty = document.getElementById("guestAffinityEmpty") || els.guestEmpty;
    const card = (list && list.closest(".card")) || (empty && empty.closest(".card")) || els.guestCard || null;

    if(list) els.guestList = list;
    if(empty) els.guestEmpty = empty;
    if(card){
      els.guestCard = card;
      if(!els.guestCard.id) els.guestCard.id = "guestAffinityCard";
    }

    hideElementHard(els.guestList);
    hideElementHard(els.guestEmpty);
    hideElementHard(els.guestCard);
  }

  function renderGuestAffinity(){
    bindEls();
    injectStyles();
    forceHideBottomAffinity();

    if(els.affectionModalList && els.affectionModalEmpty){
      renderAffinityList(els.affectionModalList, els.affectionModalEmpty, true);
    }
  }

  function renderAffinityList(listEl, emptyEl, detailed){
    const rows = getAffinityRows();
    listEl.innerHTML = "";

    if(!rows.length){
      emptyEl.style.display = "block";
      return;
    }
    emptyEl.style.display = "none";

    const frag = document.createDocumentFragment();

    rows.forEach(row => {
      const card = document.createElement("div");
      card.className = "gcard";

      let heartsHTML = "";
      for(let i=0;i<5;i++){
        heartsHTML += `<span class="${i < row.hearts ? "on" : "off"}">♥</span>`;
      }

      const iconHTML = row.icon
        ? `<img alt="${escapeHTML(row.name)}" src="${escapeHTML(row.icon)}">`
        : `<div class="afficon-fallback">画像<br>なし</div>`;

      card.innerHTML = `
        <div class="affrow">
          <div class="afficon">${iconHTML}</div>
          <div class="affbody">
            <div class="ghead">
              <div class="gname" title="${escapeHTML(row.name)}">
                ${escapeHTML(row.name)}
                ${row.isRegular ? `<span class="regular-badge">常連</span>` : ``}
              </div>
              <div class="gmeta">好感度 ${escapeHTML(String(row.love))}/100</div>
            </div>
            <div class="gline">
              <div class="ghearts">${heartsHTML}</div>
              <div class="gauge"><i style="width:${clampValue(row.love,0,100)}%"></i></div>
            </div>
            <div class="gsub">${escapeHTML(row.label)}</div>
            ${
              detailed
                ? `<div class="gsub">会話 ${escapeHTML(String(row.talkCount))}回 ・ 放置 ${escapeHTML(String(row.ignoreCount))}回</div>`
                : ``
            }
          </div>
        </div>
      `;
      frag.appendChild(card);
    });

    listEl.appendChild(frag);
  }

  function setQuestionMode(on){
    bindEls();
    if(!els.stageMsg) return;
    if(on){
      els.stageMsg.classList.add("talk-question");
    }else{
      els.stageMsg.classList.remove("talk-question");
    }
  }

  function updateAffinityButton(){
    bindEls();
    bindAffinityButtonDirect();
  }

  function openAffinityModal(){
    bindEls();
    renderGuestAffinity();

    if(!els.affectionModal){
      return false;
    }

    els.affectionModal.classList.add("show");
    els.affectionModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("noscroll");
    return true;
  }

  function closeAffinityModal(){
    bindEls();
    if(els.affectionModal){
      els.affectionModal.classList.remove("show");
      els.affectionModal.setAttribute("aria-hidden", "true");
    }
    document.body.classList.remove("noscroll");
  }

  function getBuyProbabilityBonus(guestId){
    const g = getGuestState(guestId);
    const love = Number(g.love || 0);

    if(love >= 90) return 0.28;
    if(love >= 75) return 0.20;
    if(love >= 60) return 0.14;
    if(love >= 45) return 0.08;
    if(love >= 30) return 0.04;
    if(love >= 15) return 0.01;
    return 0;
  }

  function onPurchaseSuccess(guestId){
    const g = getGuestState(guestId);
    patchGuest(guestId, {
      buyCount: Number(g.buyCount || 0) + 1,
      lastSeenAt: Date.now()
    });
    renderGuestAffinity();
  }

  function shouldTalk(guestId){
    const g = getGuestState(guestId);
    const love = Number(g.love || 0);
    let p = 0.30;
    if(love >= 60) p += 0.05;
    else if(love >= 30) p += 0.03;
    if(Number(g.talkCount || 0) === 0) p += 0.03;
    return Math.random() < clampValue(p, 0.30, 0.40);
  }

  function pickTalkEvent(guestId){
    const pool = TALK_POOLS[guestId] || GENERIC_POOL;
    return pickValue(pool);
  }

  function setChoicesDisabled(disabled){
    [els.c1, els.c2, els.c3].forEach(btn => {
      if(!btn) return;
      btn.disabled = !!disabled;
      btn.style.opacity = disabled ? "0.65" : "1";
      btn.style.cursor = disabled ? "default" : "pointer";
    });
  }

  function showInlineTalk(show){
    if(!els.talkInline) return;
    els.talkInline.style.display = show ? "grid" : "none";
  }

  function clearTimers(){
    if(countdownTimer){
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    if(talkDelayTimer){
      clearTimeout(talkDelayTimer);
      talkDelayTimer = null;
    }
  }

  function updateTimer(deadlineAt){
    const remain = Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000));
    if(els.timerInline) els.timerInline.textContent = `${remain}s`;
  }

  function finishTalk(result){
    const cb = onResultGlobal;

    clearTimers();
    showInlineTalk(false);
    setQuestionMode(false);

    if(activeTalk && els.stageName){
      els.stageName.textContent = activeTalk.guestName || "来店客";
    }

    activeTalk = null;
    renderGuestAffinity();

    if(typeof cb === "function"){
      cb(result || {});
    }
  }

  function handleIgnoreTimeout(){
    if(!activeTalk) return;

    const guestId = activeTalk.guestId;
    const guestName = activeTalk.guestName;
    const prev = getGuestState(guestId);

    patchGuest(guestId, {
      love: clampValue(Number(prev.love || 0) - 5, 0, 100),
      ignoreCount: Number(prev.ignoreCount || 0) + 1,
      lastSeenAt: Date.now()
    });

    const linePool = [
      ...IGNORE_LINES_COMMON,
      ...(IGNORE_LINES_BY_TYPE[guestId] || [])
    ];

    const leaveLine = pickValue(linePool);

    if(helpersGlobal && typeof helpersGlobal.pushLog === "function"){
      helpersGlobal.pushLog("会話失敗", `${guestName} を放置してしまった`, guestId);
    }
    if(helpersGlobal && typeof helpersGlobal.addRep === "function"){
      helpersGlobal.addRep(-1);
    }
    if(helpersGlobal && typeof helpersGlobal.renderGuestAffinity === "function"){
      helpersGlobal.renderGuestAffinity();
    }

    finishTalk({
      leaveNow: true,
      leaveLine,
      stageMessage: "……返事がなくて、寂しそうに視線をそらした。"
    });
  }

  function applyChoice(choice){
    if(!activeTalk || !choice) return;

    setChoicesDisabled(true);

    const guestId = activeTalk.guestId;
    const guestName = activeTalk.guestName;
    const prev = getGuestState(guestId);
    const delta = Number(choice.delta || 0);
    const nextLove = clampValue(Number(prev.love || 0) + delta, 0, 100);

    patchGuest(guestId, {
      love: nextLove,
      talkCount: Number(prev.talkCount || 0) + 1,
      lastTalkAt: Date.now(),
      lastSeenAt: Date.now()
    });

    if(helpersGlobal && typeof helpersGlobal.pushLog === "function"){
      helpersGlobal.pushLog("会話", `${guestName}：${choice.log || "会話した"}（好感度 ${delta >= 0 ? "+" : ""}${delta}）`, guestId);
    }

    if(helpersGlobal && typeof helpersGlobal.toast === "function"){
      const sign = delta >= 0 ? "+" : "";
      helpersGlobal.toast("会話した", `${guestName}｜好感度 ${sign}${delta}`, "");
    }

    if(els.stageMsg){
      els.stageMsg.textContent = choice.reply || "……";
    }
    if(els.talkMoodInline){
      els.talkMoodInline.textContent = `好感度 ${nextLove}/100`;
    }

    if(helpersGlobal && typeof helpersGlobal.renderGuestAffinity === "function"){
      helpersGlobal.renderGuestAffinity();
    }

    clearTimers();

    setTimeout(() => {
      finishTalk({
        leaveNow: false,
        stageMessage: choice.stage || "……少しだけ空気がやわらいだ。"
      });
    }, 1100);
  }

  function startConversationNow(ctx){
    if(!ctx || !ctx.guestId || !ctx.visitId) return false;
    if(activeTalk) return false;

    bindEls();

    if(!els.stageMsg || !els.c1 || !els.c2 || !els.c3 || !els.talkInline){
      return false;
    }

    const guestId = ctx.guestId;
    const guestName = ctx.guestName || CUSTOMER_NAME_MAP[guestId] || guestId;
    const ev = pickTalkEvent(guestId);
    const deadlineAt = Date.now() + 10000;

    activeTalk = {
      guestId,
      guestName,
      visitId: ctx.visitId,
      event: ev,
      deadlineAt
    };

    onStateChangeGlobal = typeof ctx.onStateChange === "function" ? ctx.onStateChange : null;
    onResultGlobal = typeof ctx.onResult === "function" ? ctx.onResult : null;
    helpersGlobal = ctx.helpers || null;

    patchGuest(guestId, { lastSeenAt: Date.now() });

    if(typeof onStateChangeGlobal === "function"){
      onStateChangeGlobal({
        talking: true,
        talkStartedAt: Date.now(),
        vMsg: ev.ask || "……なにか話したそうだ。"
      });
    }

    if(els.stageName) els.stageName.textContent = guestName;
    if(els.stageMsg) els.stageMsg.textContent = ev.ask || "……";
    if(els.talkMoodInline) els.talkMoodInline.textContent = ev.mood || "会話中…";
    if(els.timerInline) els.timerInline.textContent = "10s";

    setQuestionMode(true);

    const choices = shuffle((ev.choices || []).map(ch => ({
      ...ch,
      delta: Number(ch.delta || 0)
    })));

    const c1 = choices[0] || { text:"うなずく", delta:0, reply:"……。", stage:"……少しだけ落ち着いた。" };
    const c2 = choices[1] || { text:"少し考える", delta:0, reply:"……。", stage:"……少しだけ落ち着いた。" };
    const c3 = choices[2] || { text:"話を流す", delta:-5, reply:"……。", stage:"……少しだけ気まずい空気になった。" };

    els.c1.textContent = c1.text;
    els.c2.textContent = c2.text;
    els.c3.textContent = c3.text;

    els.c1.onclick = () => applyChoice(c1);
    els.c2.onclick = () => applyChoice(c2);
    els.c3.onclick = () => applyChoice(c3);

    setChoicesDisabled(false);
    showInlineTalk(true);
    renderGuestAffinity();

    updateTimer(deadlineAt);
    countdownTimer = setInterval(() => {
      if(!activeTalk) return;
      updateTimer(deadlineAt);
      if(Date.now() >= deadlineAt){
        handleIgnoreTimeout();
      }
    }, 200);

    return true;
  }

  function maybeStartConversation(ctx){
    if(!ctx || !ctx.guestId || !ctx.visitId) return false;
    if(activeTalk) return false;
    if(!shouldTalk(ctx.guestId)) return false;

    clearTimers();
    talkDelayTimer = setTimeout(() => {
      const sameCtx = ctx && typeof ctx.getStageState === "function" ? ctx.getStageState() : null;
      if(sameCtx){
        if(!sameCtx.hasVisitor) return;
        if(sameCtx.visitId !== ctx.visitId) return;
        if(sameCtx.leaving) return;
        if(sameCtx.talking) return;
      }
      startConversationNow(ctx);
    }, 2000);

    return true;
  }

  function forceCloseTalk(){
    activeTalk = null;
    clearTimers();
    showInlineTalk(false);
    setQuestionMode(false);
  }

  function bindAffinityButtonDirect(){
    bindEls();

    if(els.affectionBtn && !els.affectionBtn.__rotenBound){
      els.affectionBtn.__rotenBound = true;
      els.affectionBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openAffinityModal();
      });
    }

    if(els.affectionClose && !els.affectionClose.__rotenBound){
      els.affectionClose.__rotenBound = true;
      els.affectionClose.addEventListener("click", (e) => {
        e.preventDefault();
        closeAffinityModal();
      });
    }

    if(els.affectionOk && !els.affectionOk.__rotenBound){
      els.affectionOk.__rotenBound = true;
      els.affectionOk.addEventListener("click", (e) => {
        e.preventDefault();
        closeAffinityModal();
      });
    }

    if(els.affectionModal && !els.affectionModal.__rotenBoundBackdrop){
      els.affectionModal.__rotenBoundBackdrop = true;
      els.affectionModal.addEventListener("click", (e) => {
        if(e.target === els.affectionModal){
          closeAffinityModal();
        }
      });
    }
  }

  function bindDocumentDelegation(){
    if(document.__rotenAffinityDelegated) return;
    document.__rotenAffinityDelegated = true;

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("#affectionCheckBtn");
      if(btn){
        e.preventDefault();
        e.stopPropagation();
        openAffinityModal();
        return;
      }

      const closeBtn = e.target.closest("#affectionClose, #affectionOk");
      if(closeBtn){
        e.preventDefault();
        closeAffinityModal();
        return;
      }

      if(e.target && e.target.id === "affectionModal"){
        closeAffinityModal();
      }
    });
  }

  function startBottomHideWatcher(){
    forceHideBottomAffinity();

    if(window.__rotenAffinityHideWatcherStarted) return;
    window.__rotenAffinityHideWatcherStarted = true;

    const mo = new MutationObserver(() => {
      bindEls();
      forceHideBottomAffinity();
      bindAffinityButtonDirect();
    });

    mo.observe(document.documentElement || document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"]
    });

    window.__rotenAffinityHideWatcher = mo;
  }

  function readyForInit(){
    bindEls();
    return !!document.body &&
           !!els.affectionModal &&
           !!els.affectionModalList &&
           !!els.affectionModalEmpty;
  }

  function init(){
    bindEls();
    injectStyles();
    bindDocumentDelegation();
    showInlineTalk(false);
    setQuestionMode(false);
    forceHideBottomAffinity();
    startBottomHideWatcher();
    renderGuestAffinity();
    bindAffinityButtonDirect();
    initDone = true;
    return true;
  }

  function boot(){
    if(initDone) return true;
    if(!readyForInit()) return false;
    init();
    return true;
  }

  function scheduleBootRetries(){
    if(boot()) return;

    if(bootRetryTimer){
      clearInterval(bootRetryTimer);
      bootRetryTimer = null;
    }

    let tries = 0;
    bootRetryTimer = setInterval(() => {
      tries += 1;
      if(boot() || tries >= 60){
        clearInterval(bootRetryTimer);
        bootRetryTimer = null;
      }
    }, 250);
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", scheduleBootRetries, { once:true });
  } else {
    scheduleBootRetries();
  }

  window.addEventListener("load", () => {
    scheduleBootRetries();
  }, { once:true });

  window.RotenSocial = {
    init,
    bindGuestUI,
    renderGuestAffinity,
    getAffinityRows,
    getBuyProbabilityBonus,
    maybeStartConversation,
    onPurchaseSuccess,
    forceCloseTalk,
    updateAffinityButton,
    openAffinityModal,
    closeAffinityModal,
    getBudgetRangeByGuestId,
    getRegularBudgetBonusRate,
    isRegularLove,
    startConversationNow
  };
})();
