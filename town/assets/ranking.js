(() => {
  "use strict";

  // =========================
  // ここを自分のGAS WebアプリURLに変える
  // =========================
  const GAS_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbw828xr9EDv7-E5hkCdUgjsyiFR8y29gLcZilOwJNcLkRSs76M-B7s4UWpu3okbbQxZ/exec";

  const LS_USER_ID = "takotore_user_id";
  const LS_USER_NAME = "takotore_user_name";

  const elMyName = document.getElementById("myName");
  const elMyRank = document.getElementById("myRank");
  const elMyMeta = document.getElementById("myMeta");
  const elBoardSub = document.getElementById("boardSub");
  const elRankingBody = document.getElementById("rankingBody");
  const elRefreshBtn = document.getElementById("refreshBtn");

  init().catch(err => {
    console.error(err);
    showError("読み込みに失敗しました");
  });

  elRefreshBtn?.addEventListener("click", () => {
    loadRanking().catch(err => {
      console.error(err);
      showError("更新に失敗しました");
    });
  });

  async function init() {
    let userId = localStorage.getItem(LS_USER_ID);
    let userName = localStorage.getItem(LS_USER_NAME);

    if (!userId || !userName) {
      const created = await initUser(userId);
      userId = created.userId;
      userName = created.userName;
      localStorage.setItem(LS_USER_ID, userId);
      localStorage.setItem(LS_USER_NAME, userName);
    }

    elMyName.textContent = userName;
    await loadRanking();
  }

  async function initUser(existingUserId) {
    const res = await fetch(GAS_WEBAPP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        action: "initUser",
        userId: existingUserId || ""
      })
    });

    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "initUser failed");
    return data;
  }

  async function loadRanking() {
    const userId = localStorage.getItem(LS_USER_ID) || "";
    const userName = localStorage.getItem(LS_USER_NAME) || "";

    if (userName) {
      elMyName.textContent = userName;
    }

    const url = `${GAS_WEBAPP_URL}?action=getRanking&userId=${encodeURIComponent(userId)}`;
    const res = await fetch(url, { method: "GET" });
    const data = await res.json();

    if (!data.ok) throw new Error(data.error || "getRanking failed");

    renderMyStatus(data);
    renderTable(data);
  }

  function renderMyStatus(data) {
    const me = data.me;
    const totalUsers = Number(data.totalUsers || 0);

    elBoardSub.textContent = `${data.month} / 参加者 ${totalUsers}人`;

    if (!me) {
      elMyRank.textContent = `まだランキング対象データがありません`;
      elMyMeta.textContent = `ゲームを遊ぶと順位が表示されます`;
      return;
    }

    elMyRank.textContent = `${me.rank}位 / ${totalUsers}人中`;
    elMyMeta.textContent =
      `総合点 ${formatNumber(me.totalScore)} ｜ 露店 ${formatNumber(me.sales)} oct ｜ 収穫 ${formatNumber(me.harvest)} ｜ 釣り ${formatNumber(me.fishing)} ｜ タワー ${formatNumber(me.tower)}F`;
  }

  function renderTable(data) {
    const list = Array.isArray(data.top20) ? data.top20 : [];
    const myUserId = localStorage.getItem(LS_USER_ID) || "";

    if (!list.length) {
      elRankingBody.innerHTML = `<tr><td colspan="7" class="loading">まだランキングデータがありません</td></tr>`;
      return;
    }

    elRankingBody.innerHTML = list.map(item => {
      const cls = [
        `rank-${item.rank <= 3 ? item.rank : 0}`,
        item.userId === myUserId ? "me" : ""
      ].join(" ").trim();

      return `
        <tr class="${escapeHtml(cls)}">
          <td><span class="rank-badge">${item.rank}位</span></td>
          <td class="name-cell">${escapeHtml(item.userName || "NO NAME")}</td>
          <td class="score-cell">${formatNumber(item.totalScore)}</td>
          <td>${formatNumber(item.sales)} oct</td>
          <td>${formatNumber(item.harvest)}</td>
          <td>${formatNumber(item.fishing)}</td>
          <td>${formatNumber(item.tower)}F</td>
        </tr>
      `;
    }).join("");
  }

  function showError(msg) {
    elMyRank.textContent = msg;
    elMyMeta.textContent = "";
    elRankingBody.innerHTML = `<tr><td colspan="7" class="loading">${escapeHtml(msg)}</td></tr>`;
  }

  function formatNumber(v) {
    return Number(v || 0).toLocaleString("ja-JP");
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[s]));
  }
})();
