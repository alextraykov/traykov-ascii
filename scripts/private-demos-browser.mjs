import assert from 'node:assert/strict';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { createPrivateWorkDevServer } from './private-work-dev.mjs';
import { createPasswordHash, createSessionValue } from '../server/private-work/session.js';
import { getPrivateWorkConfig, PRIVATE_WORK_PREVIEW_COOKIE_NAME } from '../server/private-work/config.js';

// Runs only against the already-built private bundle. Never rebuilds dist or
// reads a hosted credential. The fixture session exists only in this process.
const env = { ...process.env, VERCEL: '', VERCEL_ENV: 'development', PRIVATE_WORK_LOCAL_PREVIEW: '1', PRIVATE_WORK_BUNDLE_DIR: resolve(process.env.PRIVATE_DEMO_BUNDLE_DIR || '.private-work'), PRIVATE_WORK_SESSION_SECRET: 'private-demo-local-regression-secret-at-least-32-bytes', PRIVATE_WORK_PASSWORD_HASH: await createPasswordHash('local-demo-regression') };
const server = createPrivateWorkDevServer({ root: process.cwd(), env, localPreview: true });
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const evidence = resolve(process.env.PRIVATE_DEMO_EVIDENCE_DIR || '/private/tmp/private-demo-evidence');
mkdirSync(evidence, { recursive: true });
const cookie = { name: PRIVATE_WORK_PREVIEW_COOKIE_NAME, value: createSessionValue(getPrivateWorkConfig(env)), url: base, httpOnly: true, sameSite: 'Strict' };
const errors = [];

const external=[];
async function ready(page,id){const demo=page.locator(`[data-demo-url$="${id}"]`);await demo.scrollIntoViewIfNeeded();await page.waitForFunction(id=>document.querySelector(`[data-demo-url$="${id}"]`)?.dataset.ready==='true',id);return demo;}
async function rest(host,off){await host.locator('.native-document, .surface-root').first().evaluate((node,off)=>{if((node.dataset.portfolioStill || node.dataset.still)!==String(off))throw new Error('Motion preference not applied');},off);}
try {
 const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([cookie]);
 const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{if(/^https?:/.test(request.url())&&!request.url().startsWith(base))external.push(request.url());});
 await page.goto(`${base}/private/pave-redesign/`);
 assert.equal(await page.locator('[data-private-demo]').count(),5);assert.equal(await page.locator('iframe,select').count(),0);
 const home=await ready(page,'blueprint-home');
 await home.locator('#prompt').fill('Track supplier approvals');
 await home.locator('[data-demo-theme]').click();assert.equal(await home.locator('#prompt').inputValue(),'Track supplier approvals');
 await home.locator('[data-demo-motion]').click();await rest(home,true);
 await home.locator('[data-demo-motion]').click();await rest(home,false);
 await home.locator('[data-demo-expand]').click();const dialog=page.locator('.private-demo-preview');await dialog.waitFor();
 assert.equal(await dialog.locator('[data-demo-controls],.private-demo__caption').count(),0);
 assert.equal(await dialog.locator('#prompt').inputValue(),'Track supplier approvals');
 await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert.equal(await home.locator('#prompt').inputValue(),'Track supplier approvals');
 await home.locator('[data-demo-scenario="before"]').click();await home.locator('.pv-home').waitFor();assert.equal(await home.locator('[data-demo-poster]').isVisible(),false);
 await home.locator('[data-demo-scenario="first"]').click();await home.locator('#prompt').waitFor();
 await home.screenshot({path:`${evidence}/home-desktop.png`});
 const pages=await ready(page,'blueprint-pages');await pages.getByRole('button',{name:'Account suspended',exact:true}).click();await pages.getByRole('heading',{name:'This account is suspended'}).waitFor();
 const surfaces=await ready(page,'surface-hierarchy');await surfaces.getByRole('button',{name:'After',exact:true}).click();
 await surfaces.locator('.pave-chat[data-mode="layers"]').waitFor();await surfaces.locator('textarea').fill('Keep this draft');
 await surfaces.getByRole('button',{name:'Share',exact:true}).click();await surfaces.locator('.pv-modal').waitFor();await page.keyboard.press('Escape');await surfaces.locator('.pv-modal').waitFor({state:'detached'});
 await surfaces.locator('[data-demo-theme]').click();assert.equal(await surfaces.locator('textarea').inputValue(),'Keep this draft');
 await surfaces.getByRole('button',{name:'Show layers',exact:true}).click();await surfaces.locator('.layer-key').waitFor();await surfaces.screenshot({path:`${evidence}/surface-after-dark.png`});
 const activity=await ready(page,'activity-comparison');const proposed=activity.locator('[data-demo-variant="proposed"]');
 assert.equal(await activity.locator('[data-demo-variant="today"]').count(),1);assert.equal(await proposed.count(),1);
 assert.equal(await proposed.locator('.reasonToday').count(),0);
 assert.equal(await proposed.locator('.strip > [tabindex]').count(),0);
 const squares=await proposed.locator('.strip').evaluateAll(rows=>rows.map(row=>row.querySelectorAll(':scope > .ts:not(.exit)').length));assert.ok(squares.every(n=>n<=5));
 const head=proposed.locator('.sgHead').first();await head.focus();await page.keyboard.press('Enter');assert.equal(await head.getAttribute('aria-expanded'),'true');await page.keyboard.press('Enter');assert.equal(await head.getAttribute('aria-expanded'),'false');
 for(const label of ['Repeated work','Five-chip limit','Failure','Approval','Full build']){await activity.getByRole('button',{name:label,exact:true}).click();}
 await activity.locator('[data-demo-pause]').click();await activity.locator('[data-demo-replay]').click();
 await page.waitForFunction(()=>Number(document.querySelector('[data-demo-url$="activity-comparison"] [data-demo-variant="proposed"]').dataset.replayCursor)>0);
 await home.scrollIntoViewIfNeeded();await page.waitForTimeout(150);
 const pausedCursor=Number(await proposed.getAttribute('data-replay-cursor'));await page.waitForTimeout(450);assert.equal(Number(await proposed.getAttribute('data-replay-cursor')),pausedCursor,'Offscreen replay stops advancing');
 await activity.scrollIntoViewIfNeeded();await page.waitForFunction(cursor=>Number(document.querySelector('[data-demo-url$="activity-comparison"] [data-demo-variant="proposed"]').dataset.replayCursor)>cursor,pausedCursor);
 await activity.locator('[data-demo-pause]').click();
 await activity.locator('[data-demo-motion]').click();await rest(proposed,true);await activity.screenshot({path:`${evidence}/activity-desktop.png`});
 const thinking=await ready(page,'thinking-cases');for(const label of ['Thinking with no summary','Stopped while thinking','After a reload','The recorded turn']){await thinking.getByRole('button',{name:label,exact:true}).click();}
 await page.emulateMedia({reducedMotion:'reduce'});await rest(thinking,true);await thinking.screenshot({path:`${evidence}/thinking-reduced.png`});
 await page.emulateMedia({reducedMotion:'no-preference'});await rest(thinking,false);
 assert.deepEqual(external,[]);assert.deepEqual(errors,[]);await context.close();
 for(const [name,settings]of[['mobile',{viewport:{width:390,height:844},reducedMotion:'reduce'}],['no-js',{viewport:{width:390,height:844},javaScriptEnabled:false}]]){
  const ctx=await browser.newContext(settings);await ctx.addCookies([cookie]);const p=await ctx.newPage();p.setDefaultTimeout(15000);p.on('pageerror',error=>errors.push(error.message));await p.goto(`${base}/private/pave-redesign/`);
  if(name==='no-js'){assert.equal(await p.locator('[data-demo-poster]').count(),5);assert.equal(await p.locator('iframe').count(),0);}
  else{
   const h=await ready(p,'blueprint-home');await rest(h,true);await h.locator('[data-demo-expand]').click();await p.locator('.private-demo-preview #prompt').fill('Mobile draft');await p.getByRole('button',{name:'Close preview'}).click();assert.equal(await h.locator('#prompt').inputValue(),'Mobile draft');
   await h.screenshot({path:`${evidence}/home-mobile.png`});
   const surface=await ready(p,'surface-hierarchy');await surface.getByRole('button',{name:'After',exact:true}).click();await surface.screenshot({path:`${evidence}/surface-mobile.png`});
   const t=await ready(p,'activity-comparison');assert.equal(await t.locator('[data-demo-variant]').count(),2);await t.screenshot({path:`${evidence}/activity-mobile.png`});
  }
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.screenshot({path:`${evidence}/${name}.png`});await ctx.close();
 }
 // Isolate the real authenticated activity module and control its clock. This
 // checks state progression and retained resources without test-only product APIs.
 const lifecycle=await browser.newContext({viewport:{width:1000,height:800}});await lifecycle.addCookies([cookie]);
 const lp=await lifecycle.newPage();lp.on('pageerror',error=>errors.push(error.message));
 await lp.route('**/native-test-shell',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'}));
 await lp.goto(`${base}/native-test-shell`);await lp.clock.install({time:new Date('2026-10-12T00:00:00Z')});await lp.clock.pauseAt(new Date('2026-10-12T00:00:01Z'));
 await lp.evaluate(async()=>{
  window.__observerAudit=new Map();window.__eventTimers=new Set();
  for(const kind of ['ResizeObserver','IntersectionObserver']){
   const Base=window[kind];window[kind]=class extends Base{
    constructor(...args){super(...args);window.__observerAudit.set(this,{kind,targets:new Map()});}
    observe(target,...args){window.__observerAudit.get(this).targets.set(target,target.getRootNode().host||target);return super.observe(target,...args);}
    unobserve(target){window.__observerAudit.get(this).targets.delete(target);return super.unobserve(target);}
    disconnect(){window.__observerAudit.get(this).targets.clear();return super.disconnect();}
   };
  }
  const nativeSet=window.setTimeout,nativeClear=window.clearTimeout;
  window.setTimeout=(fn,ms,...args)=>{let id;id=nativeSet(()=>{window.__eventTimers.delete(id);fn(...args);},ms);if(String(fn).includes('apply(stNow'))window.__eventTimers.add(id);return id;};
  window.clearTimeout=id=>{window.__eventTimers.delete(id);nativeClear(id);};
  const host=document.createElement('div');host.style.cssText='width:800px;height:700px';document.body.append(host);
  const {mount}=await import('/private/demo-assets/native-activity');window.__activity={host,player:mount(host,{variant:'proposed',scenario:'build',theme:'light',off:false})};
 });
 const counts=()=>lp.evaluate(()=>{const host=window.__activity.host,result={resize:0,intersection:0,detached:0};for(const entry of window.__observerAudit.values())for(const [target,owner]of entry.targets)if(owner===host){result[entry.kind==='ResizeObserver'?'resize':'intersection']++;if(!target.isConnected)result.detached++;}return result;});
 const baseline=await counts();assert.equal(baseline.resize,2,'One host and one transcript resize observer');assert.equal(baseline.detached,0);
 await lp.evaluate(()=>window.__activity.player.select('history'));
 const terminal=await lp.evaluate(()=>window.__activity.host.dataset.replayCursor);assert.ok(Number(terminal)>0);
 for(let i=0;i<3;i++){
  await lp.evaluate(()=>window.__activity.player.replay());await lp.clock.runFor(3000);
  assert.deepEqual(await lp.evaluate(()=>({cursor:window.__activity.host.dataset.replayCursor,timers:window.__eventTimers.size,live:window.__activity.host.shadowRoot.querySelectorAll('[aria-busy="true"],[data-key="status"],.ln.live').length})),{cursor:terminal,timers:0,live:0},'Reloaded history stays complete without scheduling playback');
 }
 await lp.evaluate(()=>window.__activity.player.select('build'));await lp.clock.runFor(400);
 const first=await lp.evaluate(()=>window.__activity.host.shadowRoot.querySelector('.stream:not([hidden])')?.textContent||'');
 const summary='The user wants a design intake form. Before changing anything I should look at what the app already has: tables, fields and the current screen, then plan the smallest first step.';
 assert.ok(first.length>0&&first.length<summary.length&&summary.startsWith(first),'First thought tick reveals only part of the source summary');
 await lp.clock.runFor(400);const second=await lp.evaluate(()=>window.__activity.host.shadowRoot.querySelector('.stream:not([hidden])')?.textContent||'');assert.ok(second.length>first.length&&second.length<summary.length&&summary.startsWith(second),'Next thought tick grows the same summary');
 await lp.clock.runFor(180000);
 const settled=await lp.evaluate(()=>({cursor:window.__activity.host.dataset.replayCursor,timers:window.__eventTimers.size,live:window.__activity.host.shadowRoot.querySelectorAll('[aria-busy="true"],[data-key="status"],.ln.live').length}));assert.equal(settled.timers,0);assert.equal(settled.live,0,'Finished full build has no ghost live/status tail');
 for(let i=0;i<6;i++){
  await lp.evaluate(()=>window.__activity.player.select('build-approval'));await lp.clock.runFor(3000);
  const during=await counts();assert.equal(during.resize,2);assert.equal(during.intersection,1,'Approval observes only the current inline card');assert.equal(during.detached,0);
  await lp.evaluate(()=>window.__activity.player.select('recorded'));const reset=await counts();assert.equal(reset.resize,2);assert.equal(reset.intersection,0,'Changing scenes disconnects approval observers');assert.equal(reset.detached,0);
 }
 await lp.evaluate(()=>window.__activity.player.destroy());assert.deepEqual(await counts(),{resize:0,intersection:0,detached:0});await lifecycle.close();
 assert.deepEqual(errors,[]);
 console.log('Native demos passed: auth modules, no frames/selects, source controls, coded before/after, side-by-side Combined replay, five-chip limit, keyboard expansion, full-screen/input preservation, themes, rapid switching, reduced motion, mobile, no-JS, no external requests, terminal history without replay scheduling, progressive thought text, settled completion, bounded scene observers and destruction.');
}finally{await browser.close();server.closeAllConnections();await new Promise(resolveClose=>server.close(resolveClose));}
