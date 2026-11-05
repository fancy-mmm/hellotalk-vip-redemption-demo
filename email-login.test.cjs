const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');

function setup(){
  let now=1000000,id=0,success=0;
  const timeouts=new Map(),intervals=new Map(),nodes=new Map();
  class Element {
    constructor(){this.value='';this.handlers={};this.attrs={};this.hidden=false;this.disabled=false;}
    addEventListener(type,fn){this.handlers[type]=fn;}
    setAttribute(k,v){this.attrs[k]=v;}
    focus(){}
    querySelector(s){return node(s);}
    querySelectorAll(){return [...nodes.values()];}
    fire(type,event={}){this.handlers[type]?.({target:this,preventDefault(){},...event});}
  }
  function node(s){if(!nodes.has(s))nodes.set(s,new Element());return nodes.get(s);}
  const document={activeElement:null,querySelector:s=>s==='[data-email-dialog]'?dialog:null};
  const dialog=new Element();
  const clock={now:()=>now};
  const context=vm.createContext({document,Date:clock,setTimeout:fn=>{timeouts.set(++id,fn);return id;},
    clearTimeout:id=>timeouts.delete(id),setInterval:fn=>{intervals.set(++id,fn);return id;},clearInterval:id=>intervals.delete(id)});
  vm.runInContext(fs.readFileSync(`${__dirname}/email-login.js`,'utf8')+'\nthis.factory=createEmailLoginDemo;',context);
  const app=context.factory({render(){},onPreview(){},onClose(){},onSuccess(){success++;}});
  app.open();app.bind();
  const input=(name,value)=>{const el=node(`[name="${name}"]`);el.value=value;el.fire('input');};
  return {app,node,input,timeouts,success:()=>success,advance(ms){now+=ms;for(const fn of intervals.values())fn();},flush(){const tasks=[...timeouts.values()];timeouts.clear();tasks.forEach(fn=>fn());}};
}
test('validate email, block duplicate send, count down, reject wrong code, then login',()=>{
  const t=setup();t.input('email','invalid');t.node('[data-send-code]').fire('click');
  assert.equal(t.app.state.error,'请输入有效的邮箱地址。');
  t.input('email','member@example.com');t.node('[data-send-code]').fire('click');
  assert.equal(t.app.state.busy,'send');assert.equal(t.node('[data-send-code]').disabled,true);
  t.node('[data-send-code]').fire('click');assert.equal(t.timeouts.size,1);
  t.flush();assert.equal(t.node('[data-send-code]').textContent,'60s');
  t.input('code','000000');t.node('[data-email-form]').fire('submit');t.flush();
  assert.equal(t.app.state.error,'验证码错误，请重新输入。');assert.equal(t.success(),0);
  t.input('code','123456');t.node('[data-email-form]').fire('submit');
  assert.equal(t.node('[data-email-submit]').disabled,true);t.flush();assert.equal(t.success(),1);
});
test('closing a pending request cancels it and cannot authenticate later',()=>{
  const t=setup();t.input('email','member@example.com');t.node('[data-send-code]').fire('click');
  t.app.close();t.flush();assert.equal(t.app.state.sent,false);assert.equal(t.success(),0);
});
test('editing email invalidates code and resets cooldown',()=>{
  const t=setup();t.input('email','one@example.com');t.node('[data-send-code]').fire('click');t.flush();
  t.input('code','123456');t.input('email','two@example.com');
  assert.equal(t.app.state.code,'');assert.equal(t.app.state.sent,false);assert.equal(t.app.state.cooldownUntil,0);
});
test('expired demo code fails, resend renews it, and login can recover',()=>{
  const t=setup();t.input('email','member@example.com');t.node('[data-send-code]').fire('click');t.flush();
  t.advance(300001);t.input('code','123456');t.node('[data-email-form]').fire('submit');t.flush();
  assert.equal(t.app.state.error,'验证码已过期，请重新获取。');
  t.node('[data-send-code]').fire('click');t.flush();t.node('[data-email-form]').fire('submit');t.flush();assert.equal(t.success(),1);
});
test('all seven preview states have an error and no QR/phone/sign-up action',()=>{
  const t=setup();for(const scenario of ['email','wrong','expired','unregistered','send','login','network']){
    t.app.preview(scenario);assert.ok(t.app.state.error);const html=t.app.markup();
    assert.ok(!html.includes('QR code'));assert.ok(!html.includes('手机号'));assert.ok(!html.includes('href="/signup'));
  }
});
test('empty or partial codes cannot enable login; input filters non-digits',()=>{
  const t=setup();t.input('email','member@example.com');t.input('code','12x');
  assert.equal(t.app.state.code,'12');assert.equal(t.node('[data-email-submit]').disabled,true);
  t.input('code','12345678');assert.equal(t.app.state.code,'123456');
});
