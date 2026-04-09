(() => {
  "use strict";

  const KEY = {
    state: "takomin_room_v1_state",
    book: "takomin_room_v1_book",
    log: "takomin_room_v1_log",
    ownedCards: "takomin_player_cards_v1",
    roomBg: "takomin_room_bg_v1"
  };

  const MAX_STAT = TAKOMIN_DATA.maxStat;
  const GROWTH_DAYS = TAKOMIN_DATA.growthDays;

  const $ = (sel, root = document) => root.querySelector(sel);
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const choice = arr => arr[Math.floor(Math.random() * arr.length)];
  const now = () => Date.now();

  function toTodayKeyJP() {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function loadJSON(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function weightedPick(list) {
    const total = list.reduce((s, v) => s + v.weight, 0);
    let r = Math.random() * total;
    for (const item of list) {
      r -= item.weight;
      if (r <= 0) return item;
    }
    return list[list.length - 1];
  }

  function pickTakominByRarity() {
    const rarityObj = weightedPick(TAKOMIN_DATA.rarityRate);
    const rarity = rarityObj.rarity;
    const pool = TAKOMIN_DATA.takomins.filter(v => v.rarity === rarity);

    if (!pool.length) {
      return {
        id: "fallback_n",
        name: "のっぺりタコ民",
        rarity: "N",
        icon: "",
        attackStyle: "タコ殴り",
        attackIcon: "👊"
      };
    }

    return choice(pool);
  }

  function getDefaultRoomBg() {
    return TAKOMIN_DATA.roomBackgrounds.find(v => v.defaultOwned) || TAKOMIN_DATA.roomBackgrounds[0];
  }

  function ensureRoomBgState() {
    let bgState = loadJSON(KEY.roomBg, null);
    if (bgState && Array.isArray(bgState.ownedIds) && bgState.selectedId) return bgState;

    const def = getDefaultRoomBg();
    bgState = {
      selectedId: def.id,
      ownedIds: [def.id]
    };
    saveJSON(KEY.roomBg, bgState);
    return bgState;
  }

  function getRoomBgState() {
    return loadJSON(KEY.roomBg, ensureRoomBgState());
  }

  function setRoomBgState(v) {
    saveJSON(KEY.roomBg, v);
  }

  let roomBgState = ensureRoomBgState();

  function buildNewState() {
    const takomin = pickTakominByRarity();
    const base = TAKOMIN_DATA.rarityBaseStat[takomin.rarity] || TAKOMIN_DATA.rarityBaseStat.N;

    return {
      createdAt: now(),
      takominId: takomin.id,
      takominName: takomin.name,
      takominRarity: takomin.rarity,
      takominIcon: takomin.icon || "",
      takominAttackStyle: takomin.attackStyle || "タコ殴り",
      takominAttackIcon: takomin.attackIcon || "👊",
      babyImg: choice(TAKOMIN_DATA.babyImages),
      day: 1,
      personality: null,
      hp: base.hp,
      maxHp: base.hp,
      atk: base.atk,
      def: base.def,
      taste: base.taste,
      love: base.love,
      octo: 0,
      dailyFeedUsed: 0,
      dailyFeedLimit: TAKOMIN_DATA.rarityFeedLimit[takomin.rarity] || 3,
      lastDayKey: toTodayKeyJP(),
      todayEventDone: false,
      lockedUntil: 0,
      feedHistory: [],
      raidCurrent: null
    };
  }

  let state = loadJSON(KEY.state, null);
  if (!state) {
    state = buildNewState();
    saveJSON(KEY.state, state);
  }

  let book = loadJSON(KEY.book, []);
  let logs = loadJSON(KEY.log, []);

  function ensureOwnedCards() {
    let owned = loadJSON(KEY.ownedCards, null);
    if (owned && typeof owned === "object") return owned;

    const demo = {};
    (TAKOMIN_CARDS || []).slice(0, 12).forEach((card, i) => {
      demo[card.id] = i % 3 === 0 ? 3 : 1;
    });
    saveJSON(KEY.ownedCards, demo);
    return demo;
  }

  function getOwnedCards() {
    return loadJSON(KEY.ownedCards, {});
  }

  function setOwnedCards(obj) {
    saveJSON(KEY.ownedCards, obj);
  }

  ensureOwnedCards();

  function pushLog(text) {
    logs.unshift({
      at: new Date().toLocaleString("ja-JP"),
      text
    });
    logs = logs.slice(0, 60);
    saveJSON(KEY.log, logs);
  }

  function saveState() {
    saveJSON(KEY.state, state);
  }

  function isLocked() {
    return state.lockedUntil && now() < state.lockedUntil;
  }

  function getRemainingLockMs() {
    return Math.max(0, state.lockedUntil - now());
  }

  function formatRemain(ms) {
    const sec = Math.ceil(ms / 1000);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}時間${m}分`;
  }

  function getPhaseInfo(day) {
    if (day <= 3) return { key: "baby", label: "幼体フェーズ" };
    if (day <= 6) return { key: "reveal", label: "判明フェーズ" };
    if (day === 7) return { key: "personality", label: "性格確定フェーズ" };
    if (day <= 9) return { key: "grown", label: "完成直前フェーズ" };
    return { key: "adult", label: "卒業フェーズ" };
  }

  function maybeResetDaily() {
    const today = toTodayKeyJP();
    if (state.lastDayKey !== today) {
      state.lastDayKey = today;
      state.dailyFeedUsed = 0;
      state.todayEventDone = false;
      saveState();
    }
  }

  function applyStat(name, amount) {
    state[name] = clamp(Math.floor(state[name] + amount), 0, MAX_STAT);
  }

  function applyCardToStats(card) {
    const rarityMul = TAKOMIN_DATA.rarityCardMultiplier[card.rarity] || 1;
    const scale = TAKOMIN_DATA.cardStatScale;

    applyStat("atk",   Math.round(card.atk * scale * rarityMul));
    applyStat("def",   Math.round(card.def * scale * rarityMul));
    applyStat("taste", Math.round(card.taste * scale * rarityMul));
    applyStat("love",  Math.round(card.love * scale * rarityMul));
  }

  function determinePersonality() {
    const arr = [
      { key: "攻撃型", value: state.atk },
      { key: "防御型", value: state.def },
      { key: "味職人型", value: state.taste },
      { key: "地元愛型", value: state.love }
    ].sort((a, b) => b.value - a.value);

    if (Math.abs(arr[0].value - arr[1].value) <= 12) {
      state.personality = "バランス型";
    } else {
      state.personality = arr[0].key;
    }
  }

  function advanceDay() {
    maybeResetDaily();

    if (isLocked()) {
      alert(`行動不能中です。残り ${formatRemain(getRemainingLockMs())}`);
      return;
    }

    if (state.day >= GROWTH_DAYS) {
      graduateTakomin();
      return;
    }

    state.day += 1;

    if (state.day === 7) {
      determinePersonality();
      pushLog(`Day7: 性格が ${state.personality} に確定`);
    }

    if (state.day === 10) {
      pushLog("Day10: 大人のタコ民になった");
    }

    state.dailyFeedUsed = 0;
    state.todayEventDone = false;
    saveState();
    renderAll();
  }

  function graduateTakomin() {
    const rewardOcto = Math.floor(
      (state.atk + state.def + state.taste + state.love) * 0.8 + rand(50, 180)
    );

    const record = {
      takominId: state.takominId,
      name: state.takominName,
      rarity: state.takominRarity,
      personality: state.personality || "未確定",
      finalStats: {
        hp: state.hp,
        atk: state.atk,
        def: state.def,
        taste: state.taste,
        love: state.love
      },
      rewardOcto,
      graduatedAt: new Date().toLocaleString("ja-JP")
    };

    book.unshift(record);
    book = book.slice(0, 200);
    saveJSON(KEY.book, book);

    pushLog(`${state.takominName}「今まで世話になったな！」 報酬 ${rewardOcto} オクト`);
    alert(`${state.takominName}「今まで世話になったな！」\n${rewardOcto}オクトを残して旅立ちました。`);

    localStorage.removeItem(KEY.state);
    state = buildNewState();
    saveState();
    renderAll();
  }

  function setEventText(text) {
    $("#eventBox").textContent = text;
  }

  function runDailyEvent() {
    maybeResetDaily();

    if (isLocked()) {
      alert(`行動不能中です。残り ${formatRemain(getRemainingLockMs())}`);
      return;
    }

    if (state.todayEventDone) {
      alert("今日はもうイベントを実行済みです。");
      return;
    }

    const r = Math.random();
    state.todayEventDone = true;

    if (r < TAKOMIN_DATA.eventRate.janken) {
      runJanken();
    } else if (r < TAKOMIN_DATA.eventRate.janken + TAKOMIN_DATA.eventRate.raid) {
      runRaidIntro();
    } else {
      runMemoryGame();
    }

    saveState();
    renderAll();
  }

  function runJanken() {
    const win = Math.random() < 0.55;
    if (win) {
      const targets = ["atk", "def", "taste", "love"];
      const t = choice(targets);
      const gain = rand(5, 12);
      applyStat(t, gain);

      const jpName = { atk: "攻撃", def: "防御", taste: "味", love: "函館愛" }[t];
      setEventText(`じゃんけんに勝った！ ${jpName} が ${gain} 上がった。`);
      pushLog(`じゃんけん勝利：${jpName}+${gain}`);
    } else {
      state.hp = clamp(state.hp - 15, 0, state.maxHp);
      setEventText("じゃんけんに負けた……HPが15減った。");
      pushLog("じゃんけん敗北：HP-15");
      checkLockIfNeeded();
    }
  }

  function runMemoryGame() {
    const pairs = rand(1, 5);
    const gain = pairs === 5 ? 14 : pairs === 4 ? 10 : pairs === 3 ? 7 : pairs === 2 ? 5 : 3;
    const targets = ["atk", "def", "taste", "love"];
    const t = choice(targets);
    applyStat(t, gain);

    const jpName = { atk: "攻撃", def: "防御", taste: "味", love: "函館愛" }[t];
    setEventText(`神経衰弱で ${pairs} 組そろえた！ ${jpName} が ${gain} 上がった。`);
    pushLog(`神経衰弱：${pairs}組 / ${jpName}+${gain}`);
  }

  // ===== 背景 =====
  function applyRoomBackground() {
    roomBgState = getRoomBgState();
    const bg = TAKOMIN_DATA.roomBackgrounds.find(v => v.id === roomBgState.selectedId) || getDefaultRoomBg();
    $("#roomPanel").style.setProperty("--room-bg", `url("${bg.img}")`);
  }

  function openBgModal() {
    renderBgModal();
    $("#bgModal").style.display = "flex";
  }

  function closeBgModal() {
    $("#bgModal").style.display = "none";
  }

  function renderBgModal() {
    roomBgState = getRoomBgState();
    const root = $("#bgGrid");
    root.innerHTML = "";

    TAKOMIN_DATA.roomBackgrounds.forEach(bg => {
      const owned = roomBgState.ownedIds.includes(bg.id);
      const selected = roomBgState.selectedId === bg.id;

      const el = document.createElement("div");
      el.className = "bg-card";
      el.innerHTML = `
        <div class="bg-thumb"><img src="${escapeHtml(bg.img)}" alt=""></div>
        <div class="bg-title">${escapeHtml(bg.name)}</div>
        <div class="bg-badge ${owned ? "owned" : "locked"}">${owned ? (selected ? "使用中" : "所持") : "未所持"}</div>
        <button class="btn ${owned ? "" : "secondary"}" ${owned ? "" : "disabled"}>${selected ? "使用中" : "この背景にする"}</button>
      `;
      const btn = el.querySelector("button");
      if (owned && !selected) {
        btn.addEventListener("click", () => {
          roomBgState.selectedId = bg.id;
          setRoomBgState(roomBgState);
          applyRoomBackground();
          renderBgModal();
          pushLog(`背景を「${bg.name}」に変更`);
        });
      }
      root.appendChild(el);
    });
  }

  function maybeDropRoomBg() {
    roomBgState = getRoomBgState();

    const unowned = TAKOMIN_DATA.roomBackgrounds.filter(v =>
      !roomBgState.ownedIds.includes(v.id) && !v.defaultOwned
    );

    if (!unowned.length) return null;
    if (Math.random() > TAKOMIN_DATA.roomBgDropRate) return null;

    const dropped = choice(unowned);
    roomBgState.ownedIds.push(dropped.id);
    setRoomBgState(roomBgState);
    return dropped;
  }

  // ===== 強襲 =====
  let raidTimer = null;
  let introTimer1 = null;
  let introTimer2 = null;

  function buildRaidEnemy() {
    const enemyInfo = weightedPick(TAKOMIN_DATA.raidEnemyRate);
    const base = TAKOMIN_DATA.raidEnemies[enemyInfo.id];
    return {
      ...base,
      hp: base.maxHp,
      stunnedUntil: 0,
      usedItem: false,
      hitCount: 0
    };
  }

  function getEnemySpriteHtml(enemyId) {
    if (enemyId === "gokiburi") return "🪳";
    if (enemyId === "takonyan") return "🐱";
    return "🐻";
  }

  function runRaidIntro() {
    state.raidCurrent = {
      enemy: buildRaidEnemy(),
      playerHp: state.hp,
      result: null,
      finished: false
    };

    const intro = $("#raidIntro");
    const introText = $("#raidIntroText");

    intro.classList.remove("hidden");
    introText.textContent = `${state.raidCurrent.enemy.name} があらわれた!!`;

    introTimer1 = setTimeout(() => {
      intro.classList.add("boom");
    }, 450);

    introTimer2 = setTimeout(() => {
      intro.classList.add("hidden");
      intro.classList.remove("boom");
      openRaidScreen();
      renderRaid();
      setEventText(`強襲発生！ ${state.raidCurrent.enemy.name} が部屋に紛れ込んだ。`);
      pushLog(`強襲開始：${state.raidCurrent.enemy.name}`);
      startRaidEnemyLoop();
    }, 1350);
  }

  function openRaidScreen() {
    $("#raidScreen").classList.remove("hidden");
  }

  function closeRaidScreen(force = false) {
    if (state.raidCurrent && !state.raidCurrent.finished && !force) return;
    stopRaidEnemyLoop();
    $("#raidScreen").classList.add("hidden");
  }

  function startRaidEnemyLoop() {
    stopRaidEnemyLoop();
    if (!state.raidCurrent || state.raidCurrent.finished) return;

    const loop = () => {
      if (!state.raidCurrent || state.raidCurrent.finished) return;

      const raid = state.raidCurrent;
      const enemy = raid.enemy;

      if (now() < enemy.stunnedUntil) {
        raidTimer = setTimeout(loop, 250);
        renderRaid();
        return;
      }

      const damage = clamp(Math.round(enemy.attack - state.def * 0.15), 3, 9999);
      raid.playerHp = clamp(raid.playerHp - damage, 0, state.maxHp);
      $("#raidStatus").textContent = `${enemy.name} の攻撃！ HP -${damage}`;

      if (raid.playerHp <= 0) {
        finishRaid(false);
        return;
      }

      renderRaid();
      raidTimer = setTimeout(loop, enemy.attackIntervalMs);
    };

    raidTimer = setTimeout(loop, state.raidCurrent.enemy.attackIntervalMs);
  }

  function stopRaidEnemyLoop() {
    if (raidTimer) {
      clearTimeout(raidTimer);
      raidTimer = null;
    }
  }

  function calcTapDamage() {
    return Math.max(1, Math.floor(state.atk / 20) + 1);
  }

  function showHitFx(text, critical = false) {
    const root = $("#hitFx");
    const el = document.createElement("div");
    el.className = "hit-number" + (critical ? " critical" : "");
    el.textContent = text;
    el.style.left = `${45 + rand(-12, 12)}%`;
    el.style.top = `${45 + rand(-10, 10)}%`;
    root.appendChild(el);
    setTimeout(() => el.remove(), 520);
  }

  function shakeEnemy() {
    const box = $("#raidEnemyTapArea");
    box.classList.remove("shake");
    void box.offsetWidth;
    box.classList.add("shake");
  }

  function attackRaid() {
    if (!state.raidCurrent || state.raidCurrent.finished) return;

    const raid = state.raidCurrent;
    const enemy = raid.enemy;
    const baseAttack = state.day <= 3 ? "タコ殴り" : (state.takominAttackStyle || "固有攻撃");

    enemy.hitCount += 1;

    let damage = calcTapDamage();
    let critical = Math.random() < 0.12;

    if (critical) {
      damage *= 2;
      showHitFx(`CRITICAL!! ${damage} HIT!!`, true);
    } else {
      const hitLabel = enemy.hitCount % 10 === 0 ? `${enemy.hitCount} HIT!!` : `${damage} HIT`;
      showHitFx(hitLabel, false);
    }

    shakeEnemy();

    enemy.hp = clamp(enemy.hp - damage, 0, enemy.maxHp);
    $("#raidStatus").textContent = `${baseAttack}！ ${enemy.name} に ${damage} ダメージ`;

    if (enemy.hp <= 0) {
      finishRaid(true);
      return;
    }

    renderRaid();
  }

  function useRaidItem(itemId) {
    if (!state.raidCurrent || state.raidCurrent.finished) return;
    if (state.raidCurrent.enemy.usedItem) {
      alert("この強襲ではもうアイテムを使っています。");
      return;
    }

    const raid = state.raidCurrent;
    const enemy = raid.enemy;

    if (itemId === "SP-RAW") {
      const rawItem = TAKOMIN_ITEMS.battleItems.find(v => v.id === "SP-RAW");
      enemy.stunnedUntil = now() + ((rawItem?.stunSeconds || 3) * 1000);
      enemy.usedItem = true;
      $("#raidStatus").textContent = `生焼けカード！ ${enemy.name} が腹を壊して動けない。`;
      pushLog("強襲：生焼けカードを使用");
    }

    if (itemId === "SP-BURN") {
      const burnItem = TAKOMIN_ITEMS.battleItems.find(v => v.id === "SP-BURN");
      const cutRate = burnItem?.cutRate || (1 / 3);
      const cut = Math.max(1, Math.floor(enemy.hp * cutRate));
      enemy.hp = clamp(enemy.hp - cut, 0, enemy.maxHp);
      enemy.usedItem = true;
      $("#raidStatus").textContent = `焼きすぎたカード！ ${enemy.name} のHPを ${cut} 削った。`;
      pushLog(`強襲：焼きすぎたカードを使用 / 敵HP-${cut}`);

      if (enemy.hp <= 0) {
        finishRaid(true);
        return;
      }
    }

    renderRaid();
  }

  function finishRaid(win) {
    stopRaidEnemyLoop();

    if (!state.raidCurrent) return;
    const raid = state.raidCurrent;
    raid.finished = true;

    if (win) {
      const enemy = raid.enemy;
      const gain = rand(enemy.rewardMin, enemy.rewardMax);

      applyStat("atk", gain);
      applyStat("def", gain);
      applyStat("taste", gain);
      applyStat("love", gain);

      const octo = rand(enemy.octoMin, enemy.octoMax);
      state.octo += octo;
      state.hp = clamp(raid.playerHp, 0, state.maxHp);

      let result = `勝利！ 全パラメーター +${gain} / オクト +${octo}`;

      const droppedBg = maybeDropRoomBg();
      if (droppedBg) {
        result += ` / 背景アイテム「${droppedBg.name}」入手！`;
        pushLog(`背景ドロップ：${droppedBg.name}`);
      }

      raid.result = result;
      setEventText(result);
      pushLog(`強襲勝利：${enemy.name} / 全パラ+${gain} / オクト+${octo}`);
    } else {
      state.hp = 0;
      state.lockedUntil = now() + 24 * 60 * 60 * 1000;
      raid.result = "敗北……HPが尽きたため24時間行動不能。";
      setEventText(`${raid.enemy.name} に敗北……24時間何もできない。`);
      pushLog(`強襲敗北：${raid.enemy.name} / 24時間行動不能`);
    }

    saveState();
    renderRaid();

    $("#raidResultBox").classList.remove("hidden");
    $("#btnRaidClose").classList.remove("hidden");

    renderAll();
  }

  function renderRaid() {
    const raid = state.raidCurrent;
    if (!raid) return;

    $("#raidEnemyName").textContent = raid.enemy.name;
    $("#raidEnemySprite").innerHTML = getEnemySpriteHtml(raid.enemy.id);

    $("#raidPlayerSprite").innerHTML = getTakominSpriteHtml();
    $("#attackOrbIcon").textContent = state.takominAttackIcon || "👊";
    $("#attackOrbLabel").textContent = state.day <= 3 ? "タコ殴り" : (state.takominAttackStyle || "攻撃");

    $("#enemyHpText").textContent = `${raid.enemy.hp} / ${raid.enemy.maxHp}`;
    $("#enemyHpBar").style.width = `${(raid.enemy.hp / raid.enemy.maxHp) * 100}%`;

    $("#playerHpText").textContent = `${raid.playerHp} / ${state.maxHp}`;
    $("#playerHpBar").style.width = `${(raid.playerHp / state.maxHp) * 100}%`;

    $("#btnRaidAttack").disabled = raid.finished;
    $("#btnUseRaw").disabled = raid.finished || raid.enemy.usedItem;
    $("#btnUseBurn").disabled = raid.finished || raid.enemy.usedItem;

    const resultBox = $("#raidResultBox");
    if (raid.finished) {
      resultBox.classList.remove("hidden");
      resultBox.textContent = raid.result || "";
    } else {
      resultBox.classList.add("hidden");
      resultBox.textContent = "";
    }
  }

  // ===== 回復 =====
  function healWithCard() {
    if (!TAKOMIN_ITEMS.healCards?.length) {
      alert("回復カードがありません。");
      return;
    }

    const healCard = TAKOMIN_ITEMS.healCards[0];
    const healAmount = Math.max(1, Math.floor(state.maxHp * (healCard.healValue || 0.5)));

    state.hp = clamp(state.hp + healAmount, 0, state.maxHp);

    if (isLocked() && state.hp > 0) {
      state.lockedUntil = 0;
      pushLog("回復カード使用：行動不能から復帰");
    }

    setEventText(`${healCard.name} で HP を ${healAmount} 回復した。`);
    pushLog(`回復カード使用：HP+${healAmount}`);
    saveState();
    renderAll();
  }

  function checkLockIfNeeded() {
    if (state.hp <= 0) {
      state.hp = 0;
      state.lockedUntil = now() + 24 * 60 * 60 * 1000;
    }
  }

  // ===== 所持カードモーダル =====
  function openFeedModal() {
    maybeResetDaily();

    if (isLocked()) {
      alert(`行動不能中です。残り ${formatRemain(getRemainingLockMs())}`);
      return;
    }

    renderOwnedCardModal();
    $("#feedModal").style.display = "flex";
  }

  function closeFeedModal() {
    $("#feedModal").style.display = "none";
  }

  function renderOwnedCardModal() {
    const root = $("#ownedCardGrid");
    root.innerHTML = "";

    const owned = getOwnedCards();
    const ownedList = (TAKOMIN_CARDS || [])
      .map(card => ({ ...card, count: Number(owned[card.id] || 0) }))
      .filter(card => card.count > 0);

    if (!ownedList.length) {
      root.innerHTML = `<div class="sub">所持カードがありません。</div>`;
      return;
    }

    ownedList.forEach(card => {
      const item = document.createElement("div");
      item.className = "owned-card";
      item.innerHTML = `
        <div class="owned-thumb">
          ${card.img ? `<img src="${escapeHtml(card.img)}" alt="">` : `<div>NO IMAGE</div>`}
        </div>
        <div class="owned-name">${escapeHtml(card.name || card.id)}</div>
        <div class="owned-meta">[${escapeHtml(card.rarity)}] 攻:${card.atk} / 防:${card.def} / 味:${card.taste} / 愛:${card.love}</div>
        <div class="owned-count">所持 ${card.count} 枚</div>
        <button class="btn" type="button">このカードを与える</button>
      `;
      item.querySelector("button").addEventListener("click", () => feedOwnedCard(card.id));
      root.appendChild(item);
    });
  }

  function feedOwnedCard(cardId) {
    maybeResetDaily();

    if (isLocked()) {
      alert(`行動不能中です。残り ${formatRemain(getRemainingLockMs())}`);
      return;
    }

    if (state.dailyFeedUsed >= state.dailyFeedLimit) {
      alert(`今日はこれ以上与えられません（上限 ${state.dailyFeedLimit} 枚）`);
      return;
    }

    const owned = getOwnedCards();
    const count = Number(owned[cardId] || 0);
    if (count <= 0) {
      alert("そのカードは所持していません。");
      renderOwnedCardModal();
      return;
    }

    const card = (TAKOMIN_CARDS || []).find(v => v.id === cardId);
    if (!card) {
      alert("カードデータが見つかりません。");
      return;
    }

    applyCardToStats(card);
    owned[cardId] = count - 1;
    if (owned[cardId] <= 0) delete owned[cardId];
    setOwnedCards(owned);

    state.dailyFeedUsed += 1;
    state.feedHistory.push({
      day: state.day,
      cardId: card.id,
      cardName: card.name || card.id
    });
    state.feedHistory = state.feedHistory.slice(-200);

    pushLog(`Day${state.day}: ${card.name || card.id} を与えた`);
    saveState();
    renderAll();
    renderOwnedCardModal();

    if (state.dailyFeedUsed >= state.dailyFeedLimit) {
      closeFeedModal();
    }
  }

  // ===== 描画 =====
  function getTakominDisplayName() {
    if (state.day <= 3) return "のっぺりタコ民";
    return state.takominName;
  }

  function getTakominBalloonText() {
    if (isLocked()) return "ぐったりしているたこ……";
    if (state.day <= 3) return choice(TAKOMIN_DATA.phaseTexts.baby);
    if (state.day >= 7 && state.personality) {
      return {
        "攻撃型": "今日は暴れたい気分たこ",
        "防御型": "受けて立つたこ",
        "味職人型": "味で語るたこ",
        "地元愛型": "函館に捧げるたこ",
        "バランス型": "全部それなりに大事たこ"
      }[state.personality] || choice(TAKOMIN_DATA.phaseTexts.adult);
    }
    return choice(TAKOMIN_DATA.phaseTexts.adult);
  }

  function getTakominSpriteHtml() {
    if (state.day <= 3) {
      return `<img src="${escapeHtml(state.babyImg)}" alt="">`;
    }
    if (state.takominIcon) {
      return `<img src="${escapeHtml(state.takominIcon)}" alt="">`;
    }
    return `🐙`;
  }

  function renderHUD() {
    $("#hudDay").textContent = `${state.day} / ${GROWTH_DAYS}`;
    $("#hudHp").textContent = `${state.hp} / ${state.maxHp}`;
    $("#hudOcto").textContent = String(state.octo);
    $("#hudFeed").textContent = `${Math.max(0, state.dailyFeedLimit - state.dailyFeedUsed)} / ${state.dailyFeedLimit}`;
  }

  function renderRoom() {
    const phase = getPhaseInfo(state.day);
    $("#phaseBadge").textContent = phase.label;
    $("#personalityBadge").textContent = `性格：${state.personality || "未確定"}`;
    $("#takominBalloon").textContent = getTakominBalloonText();
    $("#takominName").textContent = getTakominDisplayName();
    $("#takominSprite").innerHTML = getTakominSpriteHtml();
    applyRoomBackground();
  }

  function renderStats() {
    $("#valAtk").textContent = state.atk;
    $("#valDef").textContent = state.def;
    $("#valTaste").textContent = state.taste;
    $("#valLove").textContent = state.love;

    $("#barAtk").style.width = `${state.atk / MAX_STAT * 100}%`;
    $("#barDef").style.width = `${state.def / MAX_STAT * 100}%`;
    $("#barTaste").style.width = `${state.taste / MAX_STAT * 100}%`;
    $("#barLove").style.width = `${state.love / MAX_STAT * 100}%`;
  }

  function drawRadarChart() {
    const canvas = $("#radarChart");
    const ctx = canvas.getContext("2d");
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = canvas.clientWidth || 500;
    const height = 260;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.31;

    const labels = [
      { name: "HP", value: state.hp },
      { name: "攻撃", value: state.atk },
      { name: "防御", value: state.def },
      { name: "味", value: state.taste },
      { name: "函館愛", value: state.love }
    ];

    ctx.strokeStyle = "rgba(255,255,255,.16)";
    ctx.lineWidth = 1;

    for (let ring = 1; ring <= 5; ring++) {
      ctx.beginPath();
      labels.forEach((_, i) => {
        const angle = -Math.PI / 2 + (Math.PI * 2 / labels.length) * i;
        const r = radius * (ring / 5);
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    }

    labels.forEach((label, i) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 / labels.length) * i;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();

      const lx = cx + Math.cos(angle) * (radius + 20);
      const ly = cy + Math.sin(angle) * (radius + 20);
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label.name, lx, ly);
    });

    ctx.beginPath();
    labels.forEach((label, i) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 / labels.length) * i;
      const r = radius * (clamp(label.value, 0, MAX_STAT) / MAX_STAT);
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(251,146,60,.28)";
    ctx.strokeStyle = "rgba(251,146,60,1)";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }

  function renderLogs() {
    const root = $("#logList");
    root.innerHTML = "";
    if (!logs.length) {
      root.innerHTML = `<div class="sub">まだログがありません。</div>`;
      return;
    }
    logs.forEach(item => {
      const el = document.createElement("div");
      el.className = "log-item";
      el.innerHTML = `<strong>${escapeHtml(item.at)}</strong><br>${escapeHtml(item.text)}`;
      root.appendChild(el);
    });
  }

  function renderButtons() {
    const locked = isLocked();
    $("#btnFeedOpen").disabled = locked;
    $("#btnRunEvent").disabled = locked || state.todayEventDone;
    $("#btnNextDay").disabled = locked;

    if (locked) {
      setEventText(`現在行動不能中です。残り ${formatRemain(getRemainingLockMs())}`);
    }
  }

  function renderAll() {
    maybeResetDaily();
    renderHUD();
    renderRoom();
    renderStats();
    drawRadarChart();
    renderLogs();
    renderButtons();
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  // ===== イベント =====
  $("#btnFeedOpen").addEventListener("click", openFeedModal);
  $("#btnFeedClose").addEventListener("click", closeFeedModal);

  $("#btnOpenBg").addEventListener("click", openBgModal);
  $("#btnBgClose").addEventListener("click", closeBgModal);

  $("#btnRunEvent").addEventListener("click", runDailyEvent);
  $("#btnHeal").addEventListener("click", healWithCard);
  $("#btnNextDay").addEventListener("click", advanceDay);

  $("#btnRaidAttack").addEventListener("click", attackRaid);
  $("#raidEnemyTapArea").addEventListener("click", attackRaid);
  $("#btnUseRaw").addEventListener("click", () => useRaidItem("SP-RAW"));
  $("#btnUseBurn").addEventListener("click", () => useRaidItem("SP-BURN"));
  $("#btnRaidClose").addEventListener("click", () => closeRaidScreen(false));

  window.addEventListener("resize", drawRadarChart);

  applyRoomBackground();
  renderAll();
})();