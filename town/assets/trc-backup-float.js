/* =========================================================
   assets/trc-backup-float.js  (門番モーダル付き)
   TRC 共通：バックアップ / 復元（固定フローティングUI）
   - どのページでも <script src="assets/trc-backup-float.js"></script> だけでOK
   - 復元は「門番の確認モーダル」でワンクッション（誤タップ防止）
   - ✅ 住民票（紙プロフィール版）もバックアップ対象に追加
      - trc_v1_resident_paper（今回の住民票ページ）
      - trc_v1_resident（旧/入口側が使ってる場合）
      - trc_v1_last_login（旧）
   ========================================================= */
(() => {
  "use strict";

  // =========================
  // 設定（必要ならここだけ）
  // =========================
  const CONFIG = {
    position: "top-right",     // "top-right" | "top-left" | "bottom-right" | "bottom-left"
    zIndex: 9999,
    compactOnMobile: true,
    showRestore: true,         // 入口だけ復元にしたいなら false にして、入口だけ別UI運用も可
    reloadAfterRestore: true,

    // UIラベル
    labelBackup: "バックアップ",
    labelRestore: "復元",
    labelWorking: "作成中…",
    labelReading: "読込中…",

    // 復元確認（門番）
    guardTitle: "門番の確認",
    guardLine1: "この扉を開けば、いまの記録は上書きされる。",
    guardLine2: "元に戻せない。それでも、過去の記録へ戻るのか？",
    guardSub: "※ 復元＝端末データの上書きです。心配なら先にバックアップを2本作ってください。",
    guardBtnCancel: "今を選ぶ",
    guardBtnProceed: "過去へ戻る",

    // 復元確認のあと、ファイル選択へ進むか？
    // true: 確認OK→ファイル選択ダイアログ
    // false: まずファイルを選ばせてから最終確認
    confirmThenPickFile: true,

    // ページ側で無効化したい場合：id="trcBackupFloatDisable" があれば出さない
  };

  // =========================
  // 保存対象キー（✅住民票を追加）
  // =========================
  const KEY = {
    // 旧（入口側などが使う）
    resident: "trc_v1_resident",
    lastLogin: "trc_v1_last_login",

    // ✅ 新（紙プロフィール住民票ページが使う）
    residentPaper: "trc_v1_resident_paper",
  };

  const EXIST = {
    farmBook: "tf_v1_book",
    farmInv:  "tf_v1_inv",
    rotenOcto:"roten_v1_octo",
    tower: "tower_v1_state",
    fish:  "fish_v1_state",
  };

  // =========================
  // utils
  // =========================
  function safeJSONParse(raw, fallback) {
    try { return JSON.parse(raw); } catch (_) { return fallback; }
  }
  function safeStringify(obj) {
    try { return JSON.stringify(obj); } catch (_) { return "null"; }
  }
  const getRaw = (k) => {
    const v = localStorage.getItem(k);
    return (v === null || v === undefined) ? null : String(v);
  };
  function listKeysByRegex(re) {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (re.test(k)) out.push(k);
    }
    return out;
  }

  // =========================
  // 図鑑 slim化
  // =========================
  function slimBookRawKeepImg() {
    const raw = getRaw(EXIST.farmBook);
    if (!raw) return null;

    const book = safeJSONParse(raw, null);
    if (!book || typeof book !== "object") return raw;

    const got = (book.got && typeof book.got === "object") ? book.got : {};
    const outGot = {};
    for (const id of Object.keys(got)) {
      const node = got[id] || {};
      const c = Number(node.count || 0);
      if (c > 0) {
        const out = { id, count: c };
        if (typeof node.img === "string" && node.img.trim()) out.img = node.img.trim();
        if (typeof node.name === "string" && node.name.trim()) out.name = node.name.trim();
        if (typeof node.rarity === "string" && node.rarity.trim()) out.rarity = node.rarity.trim();
        if (node.at != null && String(node.at).trim()) out.at = node.at;
        if (node.lastAt != null && String(node.lastAt).trim()) out.lastAt = node.lastAt;
        outGot[id] = out;
      }
    }

    const slim = { ver: book.ver ?? 1, got: outGot };
    return safeStringify(slim);
  }

  function findFarmProgressKeys() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (!/^tf_v1_/i.test(k)) continue;
      if (/log|history|debug/i.test(k)) continue;
      if (k === EXIST.farmBook || k === EXIST.farmInv) continue;
      out.push(k);
    }
    const prefer = ["tf_v1_state", "tf_v1_level", "tf_v1_xp", "tf_v1_farm", "tf_v1_progress"];
    const ordered = [];
    for (const p of prefer) {
      if (localStorage.getItem(p) != null && !ordered.includes(p)) ordered.push(p);
    }
    for (const k of out) {
      if (!ordered.includes(k)) ordered.push(k);
    }
    return ordered.slice(0, 40);
  }

  function findRotenProgressKeys() {
    const out = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (!/^roten_v1_/i.test(k)) continue;
      if (/log|history|debug/i.test(k)) continue;
      out.push(k);
    }
    const prefer = [
      "roten_v1_level","roten_v1_rep","roten_v1_myshop","roten_v1_inventory",
      "roten_v1_market","roten_v1_state","roten_v1_shelves","roten_v1_octo"
    ];
    const ordered = [];
    for (const p of prefer) {
      if (localStorage.getItem(p) != null && !ordered.includes(p)) ordered.push(p);
    }
    for (const k of out) {
      if (!ordered.includes(k)) ordered.push(k);
    }
    return ordered.slice(0, 90);
  }

  // =========================
  // payload & backup
  // =========================
  function buildSlimBackupPayload() {
    const keys = {};

    // ✅ 住民票：旧 + 新（紙プロフィール）
    keys[KEY.resident] = getRaw(KEY.resident);
    keys[KEY.lastLogin] = getRaw(KEY.lastLogin);
    keys[KEY.residentPaper] = getRaw(KEY.residentPaper);

    // 基本
    keys[EXIST.rotenOcto] = getRaw(EXIST.rotenOcto);
    keys[EXIST.farmInv]   = getRaw(EXIST.farmInv);

    // 図鑑は slim
    keys[EXIST.farmBook]  = slimBookRawKeepImg();

    // 畑進行
    for (const k of findFarmProgressKeys()) {
      const v = getRaw(k);
      if (v != null) keys[k] = v;
    }

    // 露店進行
    for (const k of findRotenProgressKeys()) {
      const v = getRaw(k);
      if (v != null) keys[k] = v;
    }

    // タワー関連
    if (getRaw(EXIST.tower) != null) keys[EXIST.tower] = getRaw(EXIST.tower);
    for (const k of listKeysByRegex(/tower/i)) {
      const v = getRaw(k);
      if (v != null) keys[k] = v;
    }

    // 釣り関連
    if (getRaw(EXIST.fish) != null) keys[EXIST.fish] = getRaw(EXIST.fish);
    for (const k of listKeysByRegex(/fish|takofish|tako_fish|tfish/i)) {
      const v = getRaw(k);
      if (v != null) keys[k] = v;
    }

    // null削除
    for (const k of Object.keys(keys)) {
      if (keys[k] === null || keys[k] === undefined) delete keys[k];
    }

    return {
      app: "takoyaki-trc",
      ver: 6, // ✅ 住民票追加でver更新
      kind: "slim+roten+residentPaper",
      exportedAt: new Date().toISOString(),
      note: "住民票(旧/新)/オクト/資材/図鑑(count+img+id)/畑進行(tf_v1_*)/露店進行(roten_v1_*)/タワー/釣り を保存。ログは保存しない。",
      keys
    };
  }

  function downloadJson(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function backupSlim() {
    const payload = buildSlimBackupPayload();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadJson(payload, `takoyaki-trc-backup_${stamp}.json`);
    return payload;
  }

  async function restoreFromFile(file) {
    const text = await file.text();
    const data = safeJSONParse(text, null);

    if (!data || !data.keys || typeof data.keys !== "object") {
      alert("このファイルはバックアップ形式ではありません。");
      return false;
    }

    const keys = Object.keys(data.keys);
    const ok = confirm(
      "バックアップから復元します。\n" +
      "現在のデータは上書きされます（元に戻せません）。\n\n" +
      `復元キー数: ${keys.length}\n` +
      `書き出し日時: ${String(data.exportedAt || "")}\n\n` +
      "続行しますか？"
    );
    if (!ok) return false;

    for (const k of keys) {
      const v = data.keys[k];
      if (v === null || v === undefined) localStorage.removeItem(k);
      else localStorage.setItem(k, String(v));
    }

    alert("復元しました。" + (CONFIG.reloadAfterRestore ? " ページを再読み込みします。" : ""));
    if (CONFIG.reloadAfterRestore) location.reload();
    return true;
  }

  // =========================
  // UI / Modal
  // =========================
  function alreadyDisabledByPage() {
    return !!document.getElementById("trcBackupFloatDisable");
  }
  function alreadyExists() {
    return !!document.getElementById("trcBackupFloat");
  }

  function injectCSS() {
    if (document.getElementById("trcBackupFloatStyle")) return;

    const css = `
#trcBackupFloat{
  position: fixed;
  z-index: ${CONFIG.zIndex};
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px;
  border: 2px solid rgba(255,255,255,.28);
  border-radius: 14px;
  background: rgba(10,10,18,.78);
  backdrop-filter: blur(6px);
  box-shadow: 0 18px 50px rgba(0,0,0,.65);
  color: #fff;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans JP", sans-serif;
}
#trcBackupFloat .trcBtn{
  border: 2px solid rgba(255,255,255,.35);
  background: rgba(255,255,255,.08);
  color: #fff;
  border-radius: 12px;
  padding: 10px 12px;
  font-weight: 900;
  letter-spacing: .03em;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  white-space: nowrap;
}
#trcBackupFloat .trcBtn:active{ transform: translateY(1px); }
#trcBackupFloat .trcBtnPrimary{
  background: linear-gradient(180deg, rgba(140,200,255,.22), rgba(255,255,255,.08));
  border-color: rgba(180,220,255,.55);
}
#trcBackupFloat .trcCap{
  font-size: 12px;
  color: rgba(255,255,255,.78);
  font-weight: 900;
  letter-spacing: .04em;
  padding: 0 2px;
}
#trcBackupFloat .trcDot{
  width: 6px; height: 6px;
  border-radius: 999px;
  background: rgba(180,220,255,.75);
  box-shadow: 0 0 0 2px rgba(180,220,255,.18);
  opacity: .9;
}
#trcBackupFloat .trcMini{
  font-size: 11px;
  color: rgba(255,255,255,.68);
  margin-left: 4px;
  display:none;
}

/* ---- 門番モーダル ---- */
#trcGuardModal{
  position: fixed;
  inset: 0;
  z-index: ${CONFIG.zIndex + 1};
  display: none;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0,0,0,.72);
}
#trcGuardModal.on{ display:flex; }
#trcGuardModal .card{
  width: min(560px, 100%);
  border-radius: 14px;
  border: 3px solid #fff;
  background: #0a0a12;
  box-shadow: 0 18px 60px rgba(0,0,0,.75);
  overflow: hidden;
  position: relative;
}
#trcGuardModal .card::before{
  content:"";
  position:absolute;
  inset: 7px;
  border: 2px solid rgba(255,255,255,.35);
  border-radius: 12px;
  pointer-events:none;
}
#trcGuardModal .head{
  padding: 12px 12px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 10px;
  border-bottom: 1px solid rgba(255,255,255,.18);
  background: rgba(255,255,255,.06);
}
#trcGuardModal .ttl{
  font-weight: 900;
  letter-spacing: .03em;
}
#trcGuardModal .xbtn{
  border: 2px solid rgba(255,255,255,.35);
  background: rgba(255,255,255,.06);
  color:#fff;
  border-radius: 10px;
  padding: 8px 10px;
  cursor: pointer;
  font-weight: 900;
}
#trcGuardModal .body{
  padding: 12px 12px 14px;
}
#trcGuardModal .line{
  font-size: 14px;
  line-height: 1.7;
  letter-spacing: .02em;
  padding: 2px 2px;
}
#trcGuardModal .sub{
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255,255,255,.74);
  line-height: 1.6;
}
#trcGuardModal .actions{
  margin-top: 12px;
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
#trcGuardModal .gbtn{
  border: 2px solid rgba(255,255,255,.35);
  background: rgba(255,255,255,.06);
  color:#fff;
  border-radius: 12px;
  padding: 12px 12px;
  cursor: pointer;
  font-weight: 900;
  letter-spacing: .03em;
}
#trcGuardModal .gbtn:active{ transform: translateY(1px); }
#trcGuardModal .gbtn.danger{
  background: linear-gradient(180deg, rgba(255,120,120,.22), rgba(255,255,255,.06));
  border-color: rgba(255,160,160,.55);
}
@media (max-width: 420px){
  #trcBackupFloat{ padding: 8px; border-radius: 12px; }
  #trcBackupFloat .trcBtn{ padding: 9px 10px; border-radius: 11px; font-size: 12px; }
  ${CONFIG.compactOnMobile ? `#trcBackupFloat .trcCap{ display:none; }` : ``}
  #trcBackupFloat .trcMini{ display:${CONFIG.compactOnMobile ? "inline" : "none"}; }
  #trcGuardModal .actions{ grid-template-columns: 1fr; }
}
    `.trim();

    const style = document.createElement("style");
    style.id = "trcBackupFloatStyle";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function calcPosStyle() {
    const safeT = "env(safe-area-inset-top, 0px)";
    const safeB = "env(safe-area-inset-bottom, 0px)";
    const safeL = "env(safe-area-inset-left, 0px)";
    const safeR = "env(safe-area-inset-right, 0px)";
    const pad = "10px";

    if (CONFIG.position === "top-left") return `top: calc(${pad} + ${safeT}); left: calc(${pad} + ${safeL});`;
    if (CONFIG.position === "bottom-left") return `bottom: calc(${pad} + ${safeB}); left: calc(${pad} + ${safeL});`;
    if (CONFIG.position === "bottom-right") return `bottom: calc(${pad} + ${safeB}); right: calc(${pad} + ${safeR});`;
    return `top: calc(${pad} + ${safeT}); right: calc(${pad} + ${safeR});`; // top-right default
  }

  function openModal(modal){ modal.classList.add("on"); }
  function closeModal(modal){ modal.classList.remove("on"); }

  function ensureGuardModal() {
    let m = document.getElementById("trcGuardModal");
    if (m) return m;

    m = document.createElement("div");
    m.id = "trcGuardModal";
    m.setAttribute("aria-hidden", "true");

    m.innerHTML = `
      <div class="card" role="dialog" aria-modal="true" aria-label="復元の確認">
        <div class="head">
          <div class="ttl">${escapeHtml(CONFIG.guardTitle)}</div>
          <button class="xbtn" type="button" data-act="close">×</button>
        </div>
        <div class="body">
          <div class="line">${escapeHtml(CONFIG.guardLine1)}</div>
          <div class="line">${escapeHtml(CONFIG.guardLine2)}</div>
          <div class="sub">${escapeHtml(CONFIG.guardSub)}</div>
          <div class="actions">
            <button class="gbtn" type="button" data-act="cancel">${escapeHtml(CONFIG.guardBtnCancel)}</button>
            <button class="gbtn danger" type="button" data-act="proceed">${escapeHtml(CONFIG.guardBtnProceed)}</button>
          </div>
        </div>
      </div>
    `.trim();

    document.body.appendChild(m);

    // 背景クリックで閉じる
    m.addEventListener("click", (e) => {
      if (e.target === m) closeModal(m);
    });

    // ボタン（close/cancel）
    m.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === "close" || act === "cancel") closeModal(m);
    });

    // ESC
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && m.classList.contains("on")) closeModal(m);
    });

    return m;
  }

  function escapeHtml(s){
    return String(s || "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#39;");
  }

  function injectUI() {
    if (alreadyExists() || alreadyDisabledByPage()) return;

    injectCSS();

    const wrap = document.createElement("div");
    wrap.id = "trcBackupFloat";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "バックアップ/復元");
    wrap.style.cssText = calcPosStyle();

    const dot = document.createElement("span");
    dot.className = "trcDot";
    wrap.appendChild(dot);

    const cap = document.createElement("span");
    cap.className = "trcCap";
    cap.textContent = "DATA";
    wrap.appendChild(cap);

    const mini = document.createElement("span");
    mini.className = "trcMini";
    mini.textContent = "DATA";
    wrap.appendChild(mini);

    const btnBackup = document.createElement("button");
    btnBackup.type = "button";
    btnBackup.className = "trcBtn trcBtnPrimary";
    btnBackup.textContent = CONFIG.labelBackup;

    const btnRestore = document.createElement("button");
    btnRestore.type = "button";
    btnRestore.className = "trcBtn";
    btnRestore.textContent = CONFIG.labelRestore;

    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "application/json";
    inp.style.display = "none";

    wrap.appendChild(btnBackup);
    if (CONFIG.showRestore) wrap.appendChild(btnRestore);
    wrap.appendChild(inp);

    document.body.appendChild(wrap);

    // backup
    btnBackup.addEventListener("click", () => {
      const normal = CONFIG.labelBackup;
      btnBackup.disabled = true;
      btnBackup.textContent = CONFIG.labelWorking;
      setTimeout(() => {
        try { backupSlim(); }
        finally {
          btnBackup.disabled = false;
          btnBackup.textContent = normal;
        }
      }, 60);
    });

    // restore: 門番モーダルでワンクッション
    if (CONFIG.showRestore) {
      const modal = ensureGuardModal();

      const startPick = () => inp.click();

      const proceed = () => {
        closeModal(modal);
        setTimeout(() => startPick(), 60);
      };

      btnRestore.addEventListener("click", () => {
        openModal(modal);

        // proceed のワンショット（多重登録防止）
        const onProceed = (e) => {
          const b = e.target.closest("button");
          if (!b) return;
          if (b.dataset.act === "proceed") {
            modal.removeEventListener("click", onProceed);
            proceed();
          }
        };
        modal.addEventListener("click", onProceed);
      });

      // ファイル選択→復元
      inp.addEventListener("change", async () => {
        const f = inp.files && inp.files[0];
        inp.value = "";
        if (!f) return;

        const normal = CONFIG.labelRestore;
        btnRestore.disabled = true;
        btnRestore.textContent = CONFIG.labelReading;

        try { await restoreFromFile(f); }
        finally {
          if (!CONFIG.reloadAfterRestore) {
            btnRestore.disabled = false;
            btnRestore.textContent = normal;
          }
        }
      });
    }
  }

  // ready
  function ready(fn) {
    if (document.readyState === "complete" || document.readyState === "interactive") fn();
    else document.addEventListener("DOMContentLoaded", fn, { once: true });
  }

  // 外部からも呼べるように（任意）
  window.TRCBackupFloat = {
    backup: () => backupSlim(),
    build: () => buildSlimBackupPayload(),
  };

  ready(() => {
    if (!document.body) return;
    injectUI();
  });
})();

