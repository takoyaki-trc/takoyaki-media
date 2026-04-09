(() => {
  "use strict";

  window.RotenSocialData = {
    CUSTOMER_NAME_MAP: {
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
    },

    CUSTOMER_ICON_MAP: {
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
    },

    GUEST_LABELS: {
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
    },

    TALK_POOLS: {
      /* ここに今の careful / impulse / looker ... 全部そのまま入れる */
    },

    GENERIC_POOL: [
      {
        mood: "少し気になった顔でこちらを見ている。",
        ask: "この棚って、なんでこんなに気になるんだろう。",
        choices: [
          { text: "たぶん、見た目より中身が危ないからです。", delta: +3, reply: "……その言い方、嫌いじゃない。", stage: "……“危ない”の一言が刺さったようだ。", log: "汎用会話で危険さを伝えた" },
          { text: "気になる時点で、もう片足入ってます。", delta: 0, reply: "……それ、ちょっと認めたくないな。", stage: "……図星っぽい。", log: "汎用会話で図星を刺した" },
          { text: "気のせいかもしれません。", delta: -5, reply: "……急に興ざめした。", stage: "……空気が少ししぼんだ。", log: "汎用会話で気のせい扱いした" }
        ]
      }
    ],

    IGNORE_LINES_COMMON: [
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
    ],

    IGNORE_LINES_BY_TYPE: {
      careful: ["……返事がないと、余計に不安になるな……。","……慎重に聞いたつもりだったんだけど。","……やっぱり聞かない方がよかったかな。"],
      impulse: ["えっ、いま乗るとこじゃなかった！？","うわ、勢いだけ置いていかれた！","テンションの着地に失敗した！"],
      looker: ["……あ、見るだけどころか会話もスルーなんだ。","……まあ、そういう距離感もあるか。","……軽い気持ちで話しかけたら重傷だった。"],
      picky: ["……雑に流された感じがする。","……答えがないのも評価対象なんだけどな。","……なるほど、そういう店か。"],
      king: ["余を待たせるだけでなく、黙らせるか。","……王の問いに沈黙とは、大胆だな。","……面白い。だが減点だ。"],
      flipper: ["……返答コストすら払わないタイプか。","……数字より先に無視が来るとは。","……会話の利回り、最悪だな。"]
    }
  };
})();
