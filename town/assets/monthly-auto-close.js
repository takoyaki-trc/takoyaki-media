(() => {
  "use strict";

  const LS_MONTHLY = "ttc_monthly_stats_v1";
  const LS_HISTORY = "ttc_monthly_history_v1";
  const LS_INV = "tf_v1_inv";
  const LS_MYSHOP_MONTHLY_SALES = "ttc_myshop_monthly_sales_v1";

  const HISTORY_LIMIT = 24;

  const NORMAL_THRESHOLDS = {
    harvest: 500,
    sales: 50000,
    fishing: 2000,
    tower: 30
  };

  const GOD_THRESHOLDS = {
    harvest: 3000,
    sales: 1000000,
    fishing: 5000,
    tower: 50
  };

  const GOD_SEED_NAMES = {
    seed_god_yaki: "焼き神のタネ",
    seed_god_shop: "露店神のタネ",
    seed_god_fish: "釣り神のタネ",
    seed_god_tower: "塔神のタネ"
  };

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

  function getMonthKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function createDefaultMonthly() {
    return {
      monthKey: getMonthKey(),
      harvest: 0,
      fishing: 0,
      tower: 0
    };
  }

  function loadMonthly() {
    const p = loadJson(LS_MONTHLY, createDefaultMonthly());
    return {
      monthKey: String(p.monthKey || getMonthKey()),
      harvest: Number(p.harvest || 0),
      fishing: Number(p.fishing || 0),
      tower: Number(p.tower || 0)
    };
  }

  function loadShopSalesRecord() {
    const p = loadJson(LS_MYSHOP_MONTHLY_SALES, {
      monthKey: getMonthKey(),
      total: 0
    });

    return {
      monthKey: String(p.monthKey || getMonthKey()),
      total: Number(p.total ?? p.sales ?? 0)
    };
  }

  function saveShopSalesRecord(record) {
    saveJson(LS_MYSHOP_MONTHLY_SALES, {
      monthKey: String(record.monthKey || getMonthKey()),
      total: Number(record.total || 0)
    });
  }

  function loadHistory() {
    const h = loadJson(LS_HISTORY, []);
    return Array.isArray(h) ? h : [];
  }

  function saveHistory(history) {
    saveJson(LS_HISTORY, history.slice(0, HISTORY_LIMIT));
  }

  function loadInv() {
    const inv = loadJson(LS_INV, {});
    return inv && typeof inv === "object" ? inv : {};
  }

  function saveInv(inv) {
    saveJson(LS_INV, inv);
  }

  function getGrantedSeedsFromStats(stats) {
    const seeds = [];

    if (Number(stats.harvest || 0) >= GOD_THRESHOLDS.harvest) {
      seeds.push({ id: "seed_god_yaki", name: GOD_SEED_NAMES.seed_god_yaki });
    }

    if (Number(stats.sales || 0) >= GOD_THRESHOLDS.sales) {
      seeds.push({ id: "seed_god_shop", name: GOD_SEED_NAMES.seed_god_shop });
    }

    if (Number(stats.fishing || 0) >= GOD_THRESHOLDS.fishing) {
      seeds.push({ id: "seed_god_fish", name: GOD_SEED_NAMES.seed_god_fish });
    }

    if (Number(stats.tower || 0) >= GOD_THRESHOLDS.tower) {
      seeds.push({ id: "seed_god_tower", name: GOD_SEED_NAMES.seed_god_tower });
    }

    return seeds;
  }

  function getMainTitleFromStats(stats) {
    const h = Number(stats.harvest || 0);
    const s = Number(stats.sales || 0);
    const f = Number(stats.fishing || 0);
    const t = Number(stats.tower || 0);

    const godCount =
      (h >= GOD_THRESHOLDS.harvest ? 1 : 0) +
      (s >= GOD_THRESHOLDS.sales ? 1 : 0) +
      (f >= GOD_THRESHOLDS.fishing ? 1 : 0) +
      (t >= GOD_THRESHOLDS.tower ? 1 : 0);

    if (godCount >= 4) return "四神到達者";
    if (h >= GOD_THRESHOLDS.harvest) return "神焼きの極";
    if (s >= GOD_THRESHOLDS.sales) return "黄金露店王";
    if (f >= GOD_THRESHOLDS.fishing) return "深海の釣神";
    if (t >= GOD_THRESHOLDS.tower) return "積み上げの神";

    if (h >= NORMAL_THRESHOLDS.harvest) return "焼きの達人";
    if (s >= NORMAL_THRESHOLDS.sales) return "露店の商人";
    if (f >= NORMAL_THRESHOLDS.fishing) return "釣り名人";
    if (t >= NORMAL_THRESHOLDS.tower) return "塔の挑戦者";

    return "タコ民";
  }

  function getHeroSubFromStats(stats) {
    const seeds = getGrantedSeedsFromStats(stats);

    if (seeds.length >= 4) return "四つの神域に到達した、最高位の称号です";
    if (seeds.length > 0) return `${seeds.map(s => s.name).join(" / ")} を獲得しました`;

    return "今月の記録から授与された称号です";
  }

  function alreadyHistoryExists(history, monthKey) {
    return history.some(item => String(item.monthKey) === String(monthKey));
  }

  function closePreviousMonthIfNeeded() {
    const currentMonthKey = getMonthKey();
    const monthly = loadMonthly();
    const shop = loadShopSalesRecord();

    if (monthly.monthKey === currentMonthKey && shop.monthKey === currentMonthKey) {
      return {
        closed: false,
        reason: "same_month"
      };
    }

    const targetMonthKey = monthly.monthKey || shop.monthKey;

    const finalStats = {
      monthKey: targetMonthKey,
      harvest: Number(monthly.harvest || 0),
      sales: Number(shop.total || 0),
      fishing: Number(monthly.fishing || 0),
      tower: Number(monthly.tower || 0)
    };

    const seeds = getGrantedSeedsFromStats(finalStats);
    const title = getMainTitleFromStats(finalStats);
    const heroSub = getHeroSubFromStats(finalStats);

    const history = loadHistory();

    if (!alreadyHistoryExists(history, targetMonthKey)) {
      history.unshift({
        monthKey: targetMonthKey,
        title,
        heroSub,
        stats: finalStats,
        grantedSeeds: seeds,
        closedAt: Date.now()
      });
      saveHistory(history);
    }

    if (seeds.length > 0) {
      const inv = loadInv();
      seeds.forEach(seed => {
        inv[seed.id] = Number(inv[seed.id] || 0) + 1;
      });
      saveInv(inv);
    }

    saveJson(LS_MONTHLY, {
      monthKey: currentMonthKey,
      harvest: 0,
      fishing: 0,
      tower: 0
    });

    saveShopSalesRecord({
      monthKey: currentMonthKey,
      total: 0
    });

    try {
      window.dispatchEvent(new CustomEvent("ttc:monthlyClosed", {
        detail: {
          monthKey: targetMonthKey,
          title,
          heroSub,
          stats: finalStats,
          grantedSeeds: seeds
        }
      }));
    } catch (e) {}

    return {
      closed: true,
      monthKey: targetMonthKey,
      title,
      heroSub,
      stats: finalStats,
      grantedSeeds: seeds
    };
  }

  const result = closePreviousMonthIfNeeded();

  window.TTC_MONTHLY_AUTO_CLOSE = {
    run: closePreviousMonthIfNeeded,
    lastResult: result
  };

})();
