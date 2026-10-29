const initialState = () => ({
  screen: "mail", loggedIn: false, redeemed: false, modal: false, review: false,
  activeRule: "FR-001", context: "未创建", contextLeft: "—",
  orderStatus: "Awaiting redemption", tiktokStatus: "Delivered", account: "—",
  logs: ["订单商品项已绑定会员权益凭证", "等待用户访问会员兑换页面"],
});

let state = initialState();
const order = { orderLineId: "577312884102938416", sku: "HT-VIP-YEAR-US", product: "HelloTalk VIP 年卡", purchaseAt: "2026-10-29 10:18" };
const entrances = [
  ["mail", "权益领取邮件", "查看邮件内容"],
  ["landing", "会员兑换页面", "查看未登录状态"],
  ["return", "登录后返回", "查看已登录状态"],
  ["confirm", "兑换完成", "查看兑换结果"],
];
const rules = [
  ["FR-001", "邮件兑换入口", "邮件仅提供官网会员兑换页面链接，不展示二维码、App 引导或明文兑换码。"],
  ["FR-002", "官网登录承接", "未登录用户停留在当前兑换页；点击右上角“登录”，不出现注册入口。"],
  ["FR-003", "登录回跳", "登录前保存短期 order context；登录成功后自动返回原兑换页，不跳转官网首页。"],
  ["FR-004", "会员权益兑换", "登录后展示订单对应权益，用户确认后完成兑换；同一订单商品项不可重复兑换。"],
  ["FR-005", "失效与售后", "退款、权益回收及订单状态变更沿用原权益凭证处理，不重新生成权益。"],
  ["FR-007", "履约状态回传", "兑换完成后向 TikTok Shop 回传状态；失败时记录原因并按履约时效重试。"],
  ["FR-008", "异常任务处理", "后台展示登录回跳、兑换、退款、权益回收及状态回传异常，支持筛选、查看与幂等重试。"],
];

function esc(value) { return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function addLog(message) { state.logs = [message, ...state.logs].slice(0, 6); }
function setScreen(screen) {
  state.screen = screen; state.modal = false;
  if (screen === "landing") { state.loggedIn = false; state.context = "未创建"; state.contextLeft = "—"; }
  if (screen === "return" || screen === "confirm") {
    state.loggedIn = true; state.account = "fancy@hellotalk.com"; state.context = "有效"; state.contextLeft = "14:36";
    addLog("登录成功，已自动回跳至原会员兑换页面");
  }
  render();
}
function statusBar() { return `<div class="statusbar"><span>9:41</span><span class="status-icons">● ◒ ︽</span></div>`; }
function brand() { return `<span class="brand-mark">H</span><strong>HelloTalk</strong>`; }

function mailScreen() {
  return `<div class="mobile-screen mail-page">${statusBar()}
    <div class="mail-toolbar"><button aria-label="返回">‹</button><strong>邮件详情</strong><span>⋯</span></div>
    <div class="mail-meta"><div class="sender-logo">H</div><div><strong>HelloTalk VIP 服务</strong><small>service@hellotalk.com</small></div></div>
    <article class="mail-card"><div class="mail-brand">${brand()}</div><h2>您的 HelloTalk VIP 年卡已准备好，快来领取吧！</h2><p>您好，</p>
      <p>感谢购买 <strong>${order.product}。</strong></p>
      <p>您的会员权益已准备就绪。点击下方按钮，登录 HelloTalk 账号，即可完成兑换，享受 VIP 专属权益。</p>
      <div class="benefit-box"><small>会员权益</small><strong>${order.product}</strong></div>
      <button class="primary-action" data-action="open-link">领取会员权益</button>
      <p class="mail-signoff">祝您使用愉快！<br><strong>HelloTalk 团队</strong></p>
      <p class="mail-tip">请勿转发本邮件。会员权益将发放至你登录的 HelloTalk 账号。</p>
    </article></div>`;
}
function websiteHeader() {
  return `<header class="web-header"><div class="web-brand">${brand()}</div>${state.loggedIn ? `<button class="account-pill">Fancy · 已登录</button>` : `<button class="login-link" data-action="login">登录</button>`}</header>`;
}
function landingScreen() {
  return `<div class="mobile-screen website-page">${statusBar()}${websiteHeader()}
    <div class="redeem-hero"><div class="hero-orbit"><span>VIP</span></div><span class="secure-pill">TikTok Shop 会员权益</span><h1>兑换你的 HelloTalk VIP</h1><p>登录 HelloTalk 账号，确认后即可领取会员权益</p></div>
    <section class="order-card"><div class="product-icon">VIP</div><div class="product-copy"><small>会员商品</small><strong>${order.product}</strong></div>
      <span class="state-chip ${state.redeemed ? "done" : ""}">${state.redeemed ? "已兑换" : "待兑换"}</span>
    </section>
    ${!state.loggedIn ? `<div class="login-notice"><span class="notice-step">1</span><div><strong>登录 HelloTalk</strong><p>登录成功后会自动返回当前页面，无需重新打开邮件。</p></div><button data-action="login">登录并继续</button></div><button class="primary-action page-action" disabled>确认并领取</button>` : ""}
    ${state.loggedIn && !state.redeemed ? `<div class="signed-notice"><span>✓</span><div><small>当前领取账号</small><strong>Fancy</strong></div></div><button class="primary-action page-action" data-action="confirm">确认并领取</button><p class="page-footnote">领取后，会员权益将立即发放至当前账号</p>` : ""}
    ${state.redeemed ? `<div class="success-card"><span>✓</span><strong>会员权益领取成功</strong><p>${order.product} 已发放至账号 Fancy</p><small>现在可以使用 HelloTalk VIP 的全部会员权益</small></div>` : ""}
  </div>`;
}
function loginScreen() {
  return `<div class="mobile-screen login-page">${statusBar()}<div class="login-nav"><button data-action="cancel-login">‹</button><span>登录 HelloTalk</span><i></i></div>
    <div class="login-content"><div class="large-logo">H</div><h1>欢迎回来</h1><p>登录 HelloTalk，继续领取你的会员权益</p><label>手机号或邮箱</label><input value="fancy@hellotalk.com" readonly>
      <label>验证码</label><div class="otp-row"><input value="5208" readonly><button>获取验证码</button></div><button class="primary-action" data-action="login-submit">登录并返回兑换页面</button><small>此页面仅用于登录已有的 HelloTalk 账号</small></div></div>`;
}
function confirmModal() {
  return `<div class="modal-scrim"><div class="confirm-sheet"><div class="sheet-handle"></div><div class="confirm-icon">VIP</div><h2>确认领取会员权益</h2><p>领取后，${order.product} 将发放至以下 HelloTalk 账号。</p><div class="confirm-summary"><span>领取账号</span><strong>Fancy</strong></div><button class="primary-action" data-action="redeem">确认并领取</button><button class="text-action" data-action="close-modal">返回检查</button></div></div>`;
}
function phone() {
  let content = mailScreen();
  if (["landing","return","confirm","success"].includes(state.screen)) content = landingScreen();
  if (state.screen === "login") content = loginScreen();
  return `<div class="phone-wrap"><div class="phone">${content}${state.modal ? confirmModal() : ""}</div><div class="phone-caption"><span class="live-dot"></span>交互演示 · 可点击页面按钮</div></div>`;
}
function controlPanel() {
  return `<aside class="side-panel"><div class="panel-header"><p class="panel-label">CONTENT DEMO</p><h2>内容演示入口</h2></div><div class="panel-body">
    ${entrances.map(([id,title,sub]) => `<button class="mode-button ${state.screen === id || (id === "confirm" && state.screen === "success") ? "is-active" : ""}" data-screen="${id}"><span>${title}</span><span>${sub}</span></button>`).join("")}
    <div class="control-divider"></div><p class="control-title">异常与规则检查</p><button class="secondary-button" data-action="expire">模拟登录上下文过期</button><button class="secondary-button" data-action="duplicate">模拟重复兑换</button><button class="danger-button" data-action="reset">重置演示</button>
    <p class="scenario-note">本 Demo 不模拟 TikTok Shop 的邮件投递情况，仅演示 HelloTalk 可控的官网会员领取链路。</p></div></aside>`;
}
function opsPanel() {
  return `<aside class="ops-panel"><div class="panel-header"><p class="panel-label">BACKEND VIEW</p><h2>订单与履约状态</h2></div><div class="ops-content">
    <section class="ops-section"><h3>订单商品项</h3><dl class="ops-list"><div><dt>order_line_id</dt><dd>${order.orderLineId}</dd></div><div><dt>商品 SKU</dt><dd>${order.sku}</dd></div><div><dt>会员权益</dt><dd>${order.product}</dd></div><div><dt>登录账号</dt><dd>${esc(state.account)}</dd></div><div><dt>order context</dt><dd><span class="status-tag ${state.context === "有效" ? "success" : ""}">${state.context}</span> ${state.contextLeft}</dd></div><div><dt>兑换状态</dt><dd>${state.orderStatus}</dd></div><div><dt>TikTok 状态</dt><dd>${state.tiktokStatus}</dd></div></dl></section>
    <section class="ops-section"><h3>最近事件</h3><ol class="event-list">${state.logs.map((log,i) => `<li><span>${i === 0 ? "刚刚" : `${i + 1} 分钟前`}</span>${esc(log)}</li>`).join("")}</ol></section>
    <section class="ops-section rules"><h3>需求规则</h3>${rules.map(([id,title,desc]) => `<button class="rule-item ${state.activeRule === id ? "is-active" : ""}" data-rule="${id}"><span>${id}</span><strong>${title}</strong><small>${desc}</small></button>`).join("")}</section></div></aside>`;
}
function render() {
  document.querySelector("#app").innerHTML = `<div class="workbench"><header class="workbench-header"><div><p class="eyebrow">HELLOTALK × TIKTOK SHOP</p><h1>VIP 会员官网兑换 Demo</h1><p>中文演示：TikTok Shop 邮件入口、官网仅登录、原页面回跳、会员确认兑换与异常状态。</p></div><label class="review-switch"><input type="checkbox" data-action="review" ${state.review ? "checked" : ""}><span>需求评审模式</span></label></header><div class="demo-grid ${state.review ? "" : "is-previewing"}">${controlPanel()}${phone()}${state.review ? opsPanel() : ""}</div></div>`;
}

document.addEventListener("click", event => {
  const screenButton = event.target.closest("[data-screen]"); if (screenButton) return setScreen(screenButton.dataset.screen);
  const rule = event.target.closest("[data-rule]"); if (rule) { state.activeRule = rule.dataset.rule; return render(); }
  const action = event.target.closest("[data-action]")?.dataset.action; if (!action) return;
  if (action === "open-link") { addLog("用户从邮件进入官网会员兑换页面"); return setScreen("landing"); }
  if (action === "login") { state.context = "有效"; state.contextLeft = "15:00"; addLog("已创建短期 order context，开始官网登录"); state.screen = "login"; return render(); }
  if (action === "cancel-login") { state.screen = "landing"; return render(); }
  if (action === "login-submit") { state.loggedIn = true; state.account = "fancy@hellotalk.com"; state.contextLeft = "14:36"; state.screen = "return"; addLog("登录成功，已按 order context 回跳原兑换页"); return render(); }
  if (action === "confirm") { state.modal = true; return render(); }
  if (action === "close-modal") { state.modal = false; return render(); }
  if (action === "redeem") { state.modal = false; state.redeemed = true; state.screen = "success"; state.orderStatus = "Redeemed"; state.tiktokStatus = "Completed"; addLog("权益发放成功，TikTok Shop 状态已回传 Completed"); return render(); }
  if (action === "expire") { state.screen = "landing"; state.loggedIn = false; state.context = "已过期"; state.contextLeft = "00:00"; state.account = "—"; addLog("order context 已过期，需从原邮件入口重新进入"); return render(); }
  if (action === "duplicate") { state.screen = "success"; state.loggedIn = true; state.redeemed = true; state.account = "fancy@hellotalk.com"; state.orderStatus = "Redeemed"; addLog("检测到重复兑换请求，返回原兑换结果，未重复发放权益"); return render(); }
  if (action === "reset") { state = initialState(); return render(); }
});
document.addEventListener("change", event => { if (event.target.dataset.action === "review") { state.review = event.target.checked; render(); } });
render();
