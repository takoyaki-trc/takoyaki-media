// 消費（コラボは token を消費、通常は inv を消費）
let usedSeedToken = null;

if(isCollab){
  usedSeedToken = takeOneIssuedToken(collabId);
  if(!usedSeedToken){
    openModal("token不足", `<div class="step">このコラボの seed_token が足りない。</div><div class="row"><button type="button" id="ok">OK</button></div>`);
    document.getElementById("ok").addEventListener("click", closeModal);
    return;
  }

  // ✅ 重要：植えた瞬間にGASへ plant（ISSUED→PLANTED）
  // これをやらないと harvest が bad status で落ちる
  try{
    const planted = await gasPost({
      api: "plant",
      token: String(usedSeedToken),
      ts: Date.now(),
      app: "farm"
    });

    if(!planted?.ok){
      // ローカルだけPLANTEDになっちゃったのを戻す
      markTokenStatus(usedSeedToken, "ISSUED");

      openModal("植え付け失敗", `
        <div class="step">
          サーバー側でPLANTEDにできなかった。<br>
          ${escapeHtml(planted?.error || "unknown error")}
        </div>
        <div class="row"><button type="button" id="ok">OK</button></div>
      `);
      document.getElementById("ok").addEventListener("click", closeModal);
      return;
    }
  }catch(e){
    // ローカルだけPLANTEDになっちゃったのを戻す
    markTokenStatus(usedSeedToken, "ISSUED");

    openModal("植え付け通信失敗", `
      <div class="step">
        plant通信に失敗した…（回線/URL/権限）<br>
        もう一度試してね。
      </div>
      <pre style="white-space:pre-wrap; font-size:12px; opacity:.92; line-height:1.35; max-height:40vh; overflow:auto; border:1px solid rgba(255,255,255,.18); padding:10px; border-radius:12px;">${escapeHtml(String(e && (e.stack || e.message || e)))}</pre>
      <div class="row"><button type="button" id="ok">OK</button></div>
    `);
    document.getElementById("ok").addEventListener("click", closeModal);
    return;
  }

}else{
  if(!invDec(inv, "seed", seedId)){
    openModal("タネ不足", `<div class="step">タネが足りない。</div><div class="row"><button type="button" id="ok">OK</button></div>`);
    document.getElementById("ok").addEventListener("click", closeModal);
    return;
  }
}

// ✅ ここから先の消費は plant 成功後（または通常種）
invDec(inv, "water", waterId);
invDec(inv, "fert",  fertId);
saveInv(inv);
