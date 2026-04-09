window.TAKOMIN_ITEMS = {
  healCards: [
    {
      id: "REAL_TAKOYAKI_01",
      name: "実写たこ焼きカード",
      healMode: "percent",
      healValue: 0.5 // 最大HPの50%回復
    }
  ],

  battleItems: [
    {
      id: "SP-RAW",
      name: "生焼けカード",
      type: "stun",
      stunSeconds: 3
    },
    {
      id: "SP-BURN",
      name: "焼きすぎたカード",
      type: "cut_hp",
      cutRate: 1 / 3
    }
  ]
};