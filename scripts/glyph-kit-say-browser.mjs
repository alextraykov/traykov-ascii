import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

// Real DOM checks with simulated recognition events, not a microphone accuracy study.
const base=process.env.BASE_URL||'http://127.0.0.1:4321';
const browser=await chromium.launch();
try {
 for(const mode of [
  {name:'desktop',viewport:{width:1440,height:1000},reducedMotion:'no-preference'},
  {name:'mobile-reduced',viewport:{width:390,height:844},reducedMotion:'reduce'}
 ]){
  const {name: modeName, ...contextOptions}=mode;
  const context=await browser.newContext(contextOptions);
  await context.addInitScript(()=>{
   window.SpeechRecognition=class {
    constructor(){window.__sayRecognition=this;}
    start(){this.started=true;}
    stop(){this.stopped=true;}
    abort(){this.stopped=true;}
   };
  });
  const page=await context.newPage();let modelRequests=0;
  await page.route('**/api/glyph-kit-draw',route=>{modelRequests++;return route.abort();});
  await page.goto(`${base}/labs/glyph-kit/#try`);
  const field=page.locator('[data-gk-say-form] textarea');
  await field.waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('[data-gk-say-form] textarea').disabled);
  const spec=async()=>JSON.parse(await page.locator('[data-gk-say-spec]').textContent());
  const action=name=>page.locator(`[data-gk-say-${name}]`);
  await field.fill('A popover called Choose environment. A name field. Then two radio options, staging and production.');
  assert.deepEqual((await spec()).data.rows.map(row=>row.type),['input','radio']);
  await field.fill('Actually, a dropdown');
  assert.equal(await page.locator('[data-gk-say-state]').textContent(),'Draft');
  assert.ok(await page.locator('[data-gk-say-figure] [data-draft]').count());
  await field.fill('');
  assert.equal((await spec()).data.rows[1].type,'radio');
  await field.fill('Actually, a dropdown');await action('add').click();
  assert.equal((await spec()).data.rows[1].type,'select');
  await action('undo').click();assert.equal((await spec()).data.rows[1].type,'radio');
  await action('reset').click();
  await action('listen').click();
  const emit=async(segments)=>page.evaluate(segments=>{
   const results=segments.map(s=>Object.assign([{transcript:s.text}],{isFinal:s.final}));
   window.__sayRecognition.onresult?.({resultIndex:0,results});
  },segments);
  await emit([{text:'A name field',final:true},{text:'An email field',final:false}]);
  assert.equal((await spec()).data.rows.length,2);
  await emit([{text:'A name field',final:true}]);
  assert.equal((await spec()).data.rows.length,1,'duplicate final is ignored and draft clears');
  await page.evaluate(()=>{window.__lateResult=window.__sayRecognition.onresult;});
  await action('reset').click();
  await page.evaluate(()=>window.__lateResult({resultIndex:0,results:[Object.assign([{transcript:'An email field'}],{isFinal:true})]}));
  assert.equal((await spec()).data.rows.length,0,'late callbacks after reset are ignored');
  await action('listen').click();
  await emit([{text:'A name field',final:false}]);
  await page.evaluate(()=>window.__sayRecognition.onend());
  assert.match(await page.locator('[data-gk-say-status]').textContent(),/add it before listening again/);
  assert.equal(await field.inputValue(),'A name field');
  await action('add').click();
  await action('listen').click();
  assert.equal(await action('listen').getAttribute('aria-pressed'),'true');
  await emit([{text:'x'.repeat(601),final:true}]);
  assert.equal((await field.inputValue()).length,601,'failed final remains available for editing');
  assert.equal(await page.locator('[data-gk-say-status]').getAttribute('data-state'),'error');
  await action('reset').click();await action('listen').click();
  await page.evaluate(()=>window.__sayRecognition.onerror({error:'not-allowed'}));
  assert.match(await page.locator('[data-gk-say-status]').textContent(),/blocked/);
  await action('listen').click();assert.equal(await action('listen').getAttribute('aria-pressed'),'true');
  await action('listen').click();assert.equal(await action('listen').getAttribute('aria-pressed'),'false');
  assert.equal(modelRequests,0,'typed/speech builder never calls model API');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page must not overflow horizontally');
  console.log(`PASS ${mode.name}: typing, drafts, corrections, undo, speech event simulation and recovery`);
  await context.close();
 }
 const unsupported=await browser.newContext();
 await unsupported.addInitScript(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;});
 const page=await unsupported.newPage();await page.goto(`${base}/labs/glyph-kit/#try`);
 await page.locator('[data-gk-say-listen]').click();
 assert.match(await page.locator('[data-gk-say-status]').textContent(),/can't listen/);
 await page.locator('[data-gk-say-form] textarea').fill('A name field.');
 assert.equal(JSON.parse(await page.locator('[data-gk-say-spec]').textContent()).data.rows[0].type,'input');
 await unsupported.close();
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const still=await nojs.newPage();await still.goto(`${base}/labs/glyph-kit/#try`);
 assert.match(await still.locator('[data-gk-say-figure]').textContent(),/Staging/);
 assert.ok(await still.locator('[data-gk-say-form] textarea').isDisabled());
 console.log('PASS unsupported speech and no-JS readable example');
 await nojs.close();
} finally {await browser.close();}
