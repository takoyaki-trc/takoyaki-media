window.TAKOPI_NAV_PAGE2 = {
  first: [
    {
      title: "🎁 まずプレゼントを受け取るたこ",
      text: "はじめて来た人は、まず右上の🎁からプレゼントを受け取るたこ。\nタネ・ミズ・ヒリョウ・オクトがもらえるから、畑を始める準備ができるたこ。",
      button: "🎁 プレゼントを開く",
      guideButton: "始め方を詳しく見る",
      tags: ["初回", "プレゼント", "資材"],
      actionName: "openGiftBox"
    },
    {
      title: "🎯 次はたこ焼きみくじたこ",
      text: "プレゼントを受け取ったら、次はたこ焼きみくじを引くたこ。\n毎日の運試しで、オクトや資材が手に入ることもあるたこ。",
      button: "🎯 たこ焼きみくじへ",
      guideButton: "始め方を詳しく見る",
      tags: ["みくじ", "運試し", "毎日"],
      href: "./omikuji.html"
    },
    {
      title: "🎫 シリアルコードは持ってるたこ？",
      text: "カードやチラシにシリアルコードがある人は入力するたこ。\n持っていない人は、そのまま畑へ進めばOKたこ。",
      button: "🎫 シリアル入力へ",
      guideButton: "持ってないので畑へ",
      tags: ["シリアル", "コード", "タネ"],
      href: "https://takoyaki-card.com/town-test/code.html",
      guideHref: "./farm.html"
    },
    {
      title: "🌱 畑に行ってタネを植えるたこ",
      text: "タネを選んで、ミズやヒリョウを使って、畑に植えるたこ。\nここからカード収穫が始まるたこ。",
      button: "🌱 たこ焼き畑へ",
      guideButton: "始め方を詳しく見る",
      tags: ["畑", "タネ", "収穫"],
      href: "./farm.html",
      markFirstDone: true
    },
    {
      title: "🛒 資材ショップも見るたこ",
      text: "畑を続けるなら、ミズやヒリョウが大事になるたこ。\n足りなくなったら、たこぴのお店で資材を確認するたこ。",
      button: "🛒 たこぴのお店へ",
      guideButton: "始め方を詳しく見る",
      tags: ["資材ショップ", "ミズ", "ヒリョウ"],
      href: "./roten.html",
      markFirstDone: true
    },
    {
      title: "🎮 ミニゲームでも遊べるたこ",
      text: "バランスタワーやたこ焼き釣りでも、報酬や限定カードを狙えるたこ。\n畑に植えたあと、待ち時間に遊ぶのがおすすめたこ。",
      button: "🗼 バランスタワーへ",
      guideButton: "🎣 たこ焼き釣りへ",
      tags: ["ミニゲーム", "タワー", "釣り"],
      href: "./tower.html",
      guideHref: "./fishing.html",
      markFirstDone: true
    },
    {
      title: "🏮 慣れてきたらカードを使うたこ",
      text: "カードを集めたら、マイ露店やカード募集板でも遊べるたこ。\n集めて終わりじゃなく、使って楽しむたこ。",
      button: "🏪 マイ露店へ",
      guideButton: "📋 カード募集板へ",
      tags: ["露店", "募集板", "カード活用"],
      href: "./myshop.html",
      guideHref: "https://takoyaki-card.com/town-test/matching-board.html",
      markFirstDone: true
    }
  ],

  normal: [
    {
      title: "🎮 今日はどこで遊ぶたこ？",
      text: "畑の待ち時間は、ミニゲームで遊ぶのがおすすめたこ。\nバランスタワーやたこ焼き釣りで、報酬や限定カードを狙うたこ。",
      button: "🗼 バランスタワーへ",
      guideButton: "🎣 たこ焼き釣りへ",
      tags: ["ミニゲーム", "タワー", "釣り"],
      href: "./tower.html",
      guideHref: "./fishing.html"
    },
    {
      title: "🌱 カードを集めるなら畑たこ",
      text: "タネを植えて、カードを収穫するたこ。\n限定タネやコラボタネを持っている人は、畑で使うたこ。",
      button: "🌱 たこ焼き畑へ",
      guideButton: "🛒 資材ショップへ",
      tags: ["畑", "収穫", "資材"],
      href: "./farm.html",
      guideHref: "./roten.html"
    },
    {
      title: "🏮 集めたカードを使うたこ",
      text: "マイ露店ではカードを並べて販売できるたこ。\nカード募集板では、持っているカードを使って報酬を狙えるたこ。",
      button: "🏪 マイ露店へ",
      guideButton: "📋 カード募集板へ",
      tags: ["露店", "募集板", "カード活用"],
      href: "./myshop.html",
      guideHref: "https://takoyaki-card.com/town-test/matching-board.html"
    },
    {
      title: "🎯 今日の運試しも忘れずにたこ",
      text: "たこ焼きみくじは毎日の運試したこ。\nログインボーナス感覚で見ていくと、ちょっと得するかもしれないたこ。",
      button: "🎯 たこ焼きみくじへ",
      guideButton: "🎫 シリアル入力へ",
      tags: ["みくじ", "シリアル", "毎日"],
      href: "./omikuji.html",
      guideHref: "https://takoyaki-card.com/town-test/code.html"
    },
    {
      title: "🏆 月間記録も見てみるたこ",
      text: "収穫・販売・釣り・タワーの記録を確認できるたこ。\n称号を狙うなら、月間記録の祭壇を見るたこ。",
      button: "🏆 月間記録の祭壇へ",
      guideButton: "始め方を見る",
      tags: ["記録", "称号", "ランキング"],
      href: "./title-panel.html"
    }
  ]
};