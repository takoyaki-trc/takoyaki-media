(() => {
  "use strict";

  const LS_INV = "tf_v1_inv";
  const LS_STATE = "tf_v1_state";
  const DEBUG_GIVE_KEY = "debug_fes_collab_seed_100_once_v1";

  const TEST_GROW_MS = 10 * 1000;

  const TEST_SEEDS = [
    "seed_fes_2026_day1",
    "seed_fes_2026_day2"
  ];

  function loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function giveTestSeedsOnce() {
    if (localStorage.getItem(DEBUG_GIVE_KEY)) return;

    const inv = loadJson(LS_INV, { ver: 1, seed: {}, water: {}, fert: {} });

    inv.seed = inv.seed || {};
    inv.water = inv.water || {};
    inv.fert = inv.fert || {};

    TEST_SEEDS.forEach((seedId) => {
      inv.seed[seedId] = Number(inv.seed[seedId] || 0) + 100;
    });

    saveJson(LS_INV, inv);
    localStorage.setItem(DEBUG_GIVE_KEY, "1");

    console.log("✅ テスト用コラボタネを100個ずつ配布しました");
  }

  function forceTenSecondGrow() {
    const state = loadJson(LS_STATE, null);
    if (!state || !Array.isArray(state.plots)) return;

    let changed = false;
    const now = Date.now();

    state.plots.forEach((p) => {
      if (!p || p.state !== "GROW") return;

      if (!TEST_SEEDS.includes(p.seedId)) return;

      const startAt = Number(p.startAt || now);
      const targetReadyAt = startAt + TEST_GROW_MS;

      if (Number(p.readyAt || 0) !== targetReadyAt) {
        p.readyAt = targetReadyAt;
        changed = true;
      }

      if (now >= p.readyAt) {
        p.state = "READY";
        p.burnAt = p.readyAt + 24 * 60 * 60 * 1000;
        changed = true;
      }
    });

    if (changed) {
      saveJson(LS_STATE, state);
    }
  }

  giveTestSeedsOnce();

  setInterval(forceTenSecondGrow, 500);

  window.__takofarmDebug = {
    giveAgain() {
      localStorage.removeItem(DEBUG_GIVE_KEY);
      giveTestSeedsOnce();
      location.reload();
    },
    clearGiveFlag() {
      localStorage.removeItem(DEBUG_GIVE_KEY);
      console.log("✅ 再配布フラグを削除しました");
    },
    forceTenSecondGrow
  };
})();