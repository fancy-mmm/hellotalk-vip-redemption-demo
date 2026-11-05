/* Browser-local review prototype. No email, authentication or analytics requests. */
function createEmailLoginDemo({ render, onSuccess, onClose, onPreview }) {
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const scenarios = {
    normal: ['正常登录', '官网布局 · 演示交互'],
    email: ['邮箱格式错误', '官网实测提示的中文翻译'],
    wrong: ['验证码错误', '补充演示文案，非官网实测原文'],
    expired: ['验证码过期', '补充演示文案，非官网实测原文'],
    unregistered: ['账号未注册', '官网实测场景；移除注册引导，适配仅登录'],
    send: ['验证码发送失败', '补充演示文案，非官网实测原文'],
    login: ['登录失败', '补充演示文案，非官网实测原文'],
    network: ['网络异常', '补充演示文案，非官网实测原文'],
  };
  const messages = {
    email: '请输入有效的邮箱地址。',
    wrong: '验证码错误，请重新输入。',
    expired: '验证码已过期，请重新获取。',
    unregistered: '该账号尚未注册，请使用已注册的 HelloTalk 账号登录。',
    send: '验证码发送失败，请稍后重试。',
    login: '登录失败，请重试。',
    network: '网络异常，请检查连接后重试。',
  };
  const state = { open:false, email:'', code:'', busy:'', cooldownUntil:0, expiresAt:0,
    sent:false, help:false, error:'', scenario:'normal', field:'', status:'' };
  let pending, ticker, generation = 0;
  const emailValid = () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim());
  const seconds = () => Math.max(0, Math.ceil((state.cooldownUntil-Date.now())/1000));
  const canLogin = () => emailValid() && /^\d{6}$/.test(state.code) && !state.busy;
  function cancelPending() { clearTimeout(pending); generation++; state.busy=''; }
  function stopTicker() { clearInterval(ticker); ticker=undefined; }
  function showError(type) {
    state.error=messages[type]; state.field=type==='email'?'email':['wrong','expired'].includes(type)?'code':'';
    state.status=''; refresh();
  }
  function refresh() {
    const dialog=document.querySelector('[data-email-dialog]');
    if (!dialog) return;
    const send=dialog.querySelector('[data-send-code]');
    send.textContent=state.busy==='send'?'发送中…':seconds()>0?`${seconds()}s`:'获取验证码';
    send.disabled=Boolean(state.busy)||seconds()>0;
    const login=dialog.querySelector('[data-email-submit]');
    login.disabled=!canLogin(); login.textContent=state.busy==='login'?'登录中…':'登录';
    for(const field of ['email','code']) {
      const input=dialog.querySelector(`[name="${field}"]`);
      input.disabled=Boolean(state.busy);
      input.setAttribute('aria-invalid',String(state.field===field));
    }
    dialog.setAttribute('aria-busy',String(Boolean(state.busy)));
    const alert=dialog.querySelector('[data-email-error]'); alert.textContent=state.error; alert.hidden=!state.error;
    const status=dialog.querySelector('[data-email-status]'); status.textContent=state.status; status.hidden=!state.status;
  }
  function startTicker() {
    stopTicker();
    ticker=setInterval(()=>{ refresh(); if(!seconds())stopTicker(); },250);
  }
  function schedule(callback) {
    const id=++generation;
    pending=setTimeout(()=>{if(id===generation && state.open){ state.busy=''; callback(); }},900);
  }
  function sendCode() {
    if(state.busy||seconds()>0)return;
    if(!emailValid())return showError('email');
    state.busy='send'; state.error=''; state.field=''; state.status=''; refresh();
    schedule(()=>{
      if(['send','network'].includes(state.scenario))return showError(state.scenario);
      state.sent=true; state.cooldownUntil=Date.now()+60000; state.expiresAt=Date.now()+300000;
      if(['wrong','expired'].includes(state.scenario))state.scenario='normal';
      // Demo code validity is explicitly a prototype parameter, not a production specification.
      state.status=''; startTicker(); refresh();
    });
  }
  function submit() {
    if(!canLogin())return;
    if(!state.sent){state.error='请先获取验证码。';state.field='code';return refresh();}
    state.busy='login'; state.error=''; state.field=''; refresh();
    schedule(()=>{
      if(state.scenario==='expired'||Date.now()>state.expiresAt)return showError('expired');
      if(state.scenario==='wrong'||state.code!=='123456')return showError('wrong');
      if(['unregistered','login','network'].includes(state.scenario))return showError(state.scenario);
      const email=state.email.trim(); close(false); onSuccess(email);
    });
  }
  function open() {
    state.open=true; state.error=''; state.field=''; render();
    document.querySelector('[data-email-dialog] input')?.focus();
  }
  function close(notify=true) {
    cancelPending(); stopTicker(); state.open=false; state.help=false; state.error='';
    if(notify){onClose();render(); document.querySelector('[data-action="login"]')?.focus();}
  }
  function reset() {
    cancelPending(); stopTicker(); Object.assign(state,{open:false,email:'',code:'',busy:'',cooldownUntil:0,expiresAt:0,sent:false,help:false,error:'',scenario:'normal',field:'',status:''});
  }
  function preview(scenario) {
    onPreview();
    reset(); state.scenario=scenario; state.open=true;
    state.email=scenario==='email'?'invalid-email':'member@example.com';
    if(scenario!=='normal'){
      state.code=scenario==='wrong'?'000000':'123456'; state.sent=true; state.expiresAt=Date.now()+300000;
      state.error=messages[scenario]; state.field=scenario==='email'?'email':['wrong','expired'].includes(scenario)?'code':'';
    }
    render(); document.querySelector('[data-email-dialog] input')?.focus();
  }
  function markup() {
    if(!state.open)return '';
    return `<div class="email-modal-backdrop"><section class="email-dialog" data-email-dialog role="dialog" aria-modal="true" aria-labelledby="email-login-title" aria-describedby="email-login-scope">
      <button class="email-close" data-email-close aria-label="关闭登录弹窗">×</button>
      <h2 id="email-login-title">登录 HelloTalk</h2>
      <form data-email-form novalidate>
        <div class="email-fields"><label class="sr-only" for="login-email">邮箱地址</label>
          <input id="login-email" name="email" type="email" autocomplete="email" placeholder="请输入邮箱地址" value="${escape(state.email)}" aria-describedby="email-error" spellcheck="false">
          <div class="email-code-row"><label class="sr-only" for="login-code">验证码</label>
            <input id="login-code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="请输入验证码" value="${escape(state.code)}" aria-describedby="email-error">
            <button type="button" data-send-code>获取验证码</button></div></div>
        <div class="email-feedback"><p id="email-error" data-email-error role="alert" ${state.error?'':'hidden'}>${escape(state.error)}</p>
          <p data-email-status role="status" hidden></p>
          <button type="button" class="email-help-toggle" data-email-help aria-expanded="${state.help}" aria-controls="email-help">收不到验证码？</button></div>
        <p id="email-help" class="email-help" ${state.help?'':'hidden'}>60 秒后可重新获取验证码。如果原验证码仍有效，重新发送时会发送同一验证码，并更新其有效期。</p>
        <button class="email-submit" data-email-submit type="submit">登录</button>
      </form>
      <p class="email-agreement">登录即代表你同意 <a href="https://www.hellotalk.com/en/terms-of-service" target="_blank" rel="noopener noreferrer">用户协议</a> 和 <a href="https://www.hellotalk.com/en/privacy-policy" target="_blank" rel="noopener noreferrer">隐私协议</a></p>
      <span id="email-login-scope" class="sr-only">仅演示已有账号的邮箱登录，不会发送真实验证码或创建真实会话。</span>
    </section></div>`;
  }
  function controls() {
    return `<div class="control-divider"></div><p class="control-title">邮箱登录 · 状态演示</p>
      <label class="scenario-label" for="login-scenario">选择要查看的状态</label>
      <select id="login-scenario" class="scenario-select">${Object.entries(scenarios).map(([key,[name]])=>`<option value="${key}" ${state.scenario===key?'selected':''}>${name}</option>`).join('')}</select>
      <button class="secondary-button" data-email-preview>查看此状态</button>
      <p class="login-demo-instructions">${scenarios[state.scenario][1]}。正常流程：填写任意有效格式邮箱 → 获取验证码 → 输入 <strong>123456</strong> → 登录。其他六位数字可测试验证码错误。</p>
      <p class="login-demo-disclaimer">纯本地模拟，不发送真实邮件。错误、过期、失败为补充演示；演示验证码按 5 分钟有效，不代表线上规则。未注册账号不提供注册入口。</p>`;
  }
  function bind() {
    document.querySelector('[data-email-preview]')?.addEventListener('click',()=>preview(document.querySelector('#login-scenario').value));
    document.querySelector('#login-scenario')?.addEventListener('change',event=>{
      const value=event.target.value;
      document.querySelector('.login-demo-instructions').firstChild.textContent=scenarios[value][1]+'。正常流程：填写任意有效格式邮箱 → 获取验证码 → 输入 ';
    });
    const dialog=document.querySelector('[data-email-dialog]'); if(!dialog)return;
    dialog.querySelector('[data-email-close]').addEventListener('click',()=>close());
    dialog.querySelector('[data-send-code]').addEventListener('click',sendCode);
    dialog.querySelector('[data-email-form]').addEventListener('submit',event=>{event.preventDefault();submit();});
    dialog.querySelector('[data-email-help]').addEventListener('click',()=>{
      state.help=!state.help; dialog.querySelector('#email-help').hidden=!state.help;
      dialog.querySelector('[data-email-help]').setAttribute('aria-expanded',String(state.help));
    });
    for(const field of ['email','code'])dialog.querySelector(`[name="${field}"]`).addEventListener('input',event=>{
      const value=field==='code'?event.target.value.replace(/\D/g,'').slice(0,6):event.target.value;
      if(field==='email'&&value!==state.email){state.sent=false;state.code='';state.expiresAt=0;state.cooldownUntil=0;state.scenario='normal';stopTicker();dialog.querySelector('[name="code"]').value='';}
      state[field]=value;event.target.value=value;state.error='';state.field='';refresh();
    });
    dialog.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();close();}
      if(event.key==='Tab'){
        const els=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')];
        const first=els[0],last=els.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    });
    refresh(); if(seconds()>0)startTicker();
  }
  return { state, open, close, reset, preview, markup, controls, bind };
}
