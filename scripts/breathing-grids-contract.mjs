import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const base=process.env.BREATHING_BASE_URL || process.env.BASE_URL || 'http://127.0.0.1:4321';
const browser=await chromium.launch();
let checked=0;
try {
// A completed fallback must never flash before the configured live canvas.
for(const [route,width,reduced] of [['/',1280,false],['/case-studies/pave-breathing-grids/',390,false],['/case-studies/pave-breathing-grids/',390,true]]){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:reduced?'reduce':'no-preference'});
 const page=await context.newPage();let release;const gate=new Promise(resolve=>release=resolve);
 await page.addInitScript(()=>{
  if(window!==window.top)return;
  const configured=new Set();window.__gridFirstPaints=[];
  addEventListener('message',event=>{if(event.data?.channel==='breathing-grid'&&event.data.configured)configured.add(event.data.instance);});
  new MutationObserver(()=>{
   document.querySelectorAll('[data-breathing-grid]').forEach(root=>{
    const frame=root.querySelector('iframe');
    if(!frame?.src||frame.hidden||getComputedStyle(frame).visibility!=='visible')return;
    const instance=new URL(frame.src).searchParams.get('instance');
    if(!window.__gridFirstPaints.some(p=>p.instance===instance))window.__gridFirstPaints.push({instance,configured:configured.has(instance)});
   });
  }).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','style']});
 });
 await page.route('**/breathing-grids/*.html?*',async route=>{await gate;await route.continue();});
 await page.goto(base+route,{waitUntil:'domcontentloaded'});
 const root=page.locator('[data-breathing-grid]').first();await root.scrollIntoViewIfNeeded();await page.waitForTimeout(100);
 assert.equal(await root.locator('[data-grid-poster]').isVisible(),false,'slow load never displays a completed poster');
 assert.equal(await root.locator('iframe').isVisible(),false,'unconfigured iframe stays hidden');
 if(route==='/')await root.locator('[data-grid-variant="dither"]').click();
 release();await page.waitForFunction(()=>document.querySelector('[data-breathing-grid]').dataset.gridReady==='true');
 await page.waitForFunction(()=>window.__gridFirstPaints.length>0);
 const paints=await page.evaluate(()=>window.__gridFirstPaints);
 assert.ok(paints.length&&paints.every(p=>p.configured),'every revealed frame was configured before its first visible paint');
 assert.equal(await root.locator('[data-grid-poster]').isVisible(),false,'poster stays hidden after the live canvas appears');
 const frame=page.frames().find(f=>/breathing-grids\/(film|dither)\.html/.test(f.url()));
 if(reduced)assert.ok(await frame.evaluate(()=>__film.status().finished&&__film.state.lattice===1),'first reduced-motion scene is the final wireframe');
 const src=await root.locator('iframe').getAttribute('src');
 await root.locator(`[data-grid-variant="${route==='/'?'dither':'film'}"]`).click();
 assert.equal(await root.locator('iframe').getAttribute('src'),src,'selecting the active variant does not reload it');
 const playingBeforeStale=await root.getAttribute('data-grid-playing');
 await frame.evaluate(()=>parent.postMessage({channel:'breathing-grid',instance:'stale',configured:true,finished:true},'*'));
 await page.waitForTimeout(30);assert.equal(await root.locator('iframe').getAttribute('src'),src,'stale frame messages do not replace the current scene');
 if(route==='/')assert.equal(await root.getAttribute('data-grid-playing'),playingBeforeStale,'stale completion cannot pause the current variant');
 await root.locator('iframe').dispatchEvent('error');
 assert.equal(await root.locator('[data-grid-poster]').isVisible(),true,'load errors retain the still fallback');
 await context.close();
}
{
 const context=await browser.newContext({viewport:{width:390,height:1000}}),page=await context.newPage();
 await page.clock.install();await page.route('**/breathing-grids/*.html?*',route=>route.abort());
 await page.goto(base+'/case-studies/pave-breathing-grids/',{waitUntil:'domcontentloaded'});
 const root=page.locator('[data-breathing-grid]');await root.scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>document.querySelector('[data-grid-frame]').hasAttribute('src'));
 await page.clock.runFor(10100);
 assert.equal(await root.locator('[data-grid-poster]').isVisible(),true,'a real failed iframe request restores the still fallback');
 const failedSrc=await root.locator('iframe').getAttribute('src');
 await root.locator('[data-grid-variant="film"]').click();
 assert.notEqual(await root.locator('iframe').getAttribute('src'),failedSrc,'the selected variant can retry after a failed load');
 await context.close();
}
console.log('PASS cold-load first paint, slow loading, rapid tab switch, reduced motion and fallback');
// The introduction is one short camera move, then a stable wireframe.
if(!process.env.GRID_SKIP_FILM){
const filmPage=await browser.newPage({viewport:{width:1280,height:720}});
await filmPage.clock.install({time:0});
await filmPage.goto(base+'/case-studies/breathing-grids/film.html?seed=37&t=light');
const sendFilm=async(action,value)=>{await filmPage.evaluate(({action,value})=>postMessage({channel:'breathing-grid',action,value},'*'),{action,value});await filmPage.clock.runFor(20);};
const snapshot=()=>filmPage.evaluate(()=>({time:__film.status().time,grid:__grid.clock(),cam:{...__film.cam},state:{...__film.state},pixels:document.querySelector('canvas').toDataURL()}));
await sendFilm('playback',true);
await filmPage.clock.runFor(80);
assert.equal(await filmPage.evaluate(()=>__grid.cells().length),0,'intro starts with an empty grid');
await filmPage.clock.runFor(450);
assert.ok(await filmPage.evaluate(()=>__film.state.lattice>0&&__film.state.lattice<1),'wireframe reveals during the camera move');
await sendFilm('playback',false);
const paused=await snapshot();await filmPage.clock.runFor(700);
assert.deepEqual(await snapshot(),paused,'pause freezes the short zoom exactly');
await sendFilm('playback',true);await filmPage.clock.runFor(1000);
assert.ok(await filmPage.evaluate(()=>__film.status().finished&&__film.state.lattice===1&&__film.state.labels===1),'zoom finishes on the wireframe');
assert.equal(await filmPage.evaluate(()=>__film.state.cards+__film.state.graph+__film.state.timeline),0,'no timing sequence in the introduction');
const held=await snapshot();await sendFilm('playback',true);await filmPage.clock.runFor(5000);
assert.deepEqual(await snapshot(),held,'finished scene holds without restarting on lifecycle sync');
await sendFilm('replay');await filmPage.clock.runFor(100);
assert.equal(await filmPage.evaluate(()=>__film.status().finished),false,'explicit replay starts a new zoom');
await sendFilm('reseed',54);await sendFilm('stage','timing');await sendFilm('playback',false);
await sendFilm('stage','film');await sendFilm('playback',true);await filmPage.clock.runFor(1200);
assert.ok(await filmPage.evaluate(()=>__film.status().finished),'view changes interrupt reseed and finish the short film');
await filmPage.setViewportSize({width:640,height:720});await filmPage.clock.runFor(100);
assert.ok(await filmPage.evaluate(()=>__film.state.lattice===1&&!!__grid.cell(__film.state.id)?.rect),'finished wireframe redraws after resize');
await filmPage.close();console.log('PASS short grid zoom, pause, hold, replay, interruption and resize');
}
for (const [width,mode] of [[1440,'normal'],[390,'normal'],[320,'dark'],[390,'reduced'],[1440,'nojs']]) {
 const context=await browser.newContext({viewport:{width,height:1000},javaScriptEnabled:mode!=='nojs',reducedMotion:mode==='reduced'?'reduce':'no-preference'});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});
 if(mode==='dark')await page.addInitScript(()=>{if(window===window.top)localStorage.setItem('traykov-color-theme','dark');});
 await page.goto(base+'/case-studies/pave-breathing-grids/');
 const root=page.locator('[data-breathing-grid]');await root.scrollIntoViewIfNeeded();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow');
 if(mode==='nojs'){
   assert.equal(await root.locator('[data-grid-controls]').isVisible(),false);
   assert.equal(await root.locator('[data-grid-nojs]').evaluate(e=>e.complete&&e.naturalWidth>0),true);
   assert.equal(await root.locator('[data-grid-nojs]').isVisible(),true);
 }else{
   await root.locator('[data-grid-frame]').waitFor({state:'visible'});
   const child=()=>page.frames().find(f=>f.url().includes('/breathing-grids/film.html')||f.url().includes('/breathing-grids/blocks.html')||f.url().includes('/breathing-grids/dither.html'));
   await page.waitForFunction(()=>document.querySelector('[data-breathing-grid]').dataset.gridReady==='true');
   assert.equal(await root.locator('iframe').evaluate(e=>e.getBoundingClientRect().right<=innerWidth),true,'canvas fits viewport');
   const before=await child().evaluate(()=>document.querySelector('canvas').toDataURL());
   await root.locator('[data-grid-stage="timing"]').click();await root.locator('input').fill('35');
   await page.waitForTimeout(100);
   assert.notEqual(await child().evaluate(()=>document.querySelector('canvas').toDataURL()),before,'scrubber changes canvas');
   assert.equal(await child().evaluate(()=>window.__grid.pick('4A')),false,'unpublished direction is absent');
   const inspected=await child().evaluate(()=>window.__film.state.id);
   await root.locator('input').fill('60');await page.waitForTimeout(80);
   assert.equal(await child().evaluate(()=>window.__film.state.id),inspected,'scrub preserves the inspected cell');
   const frameSrc=await root.locator('iframe').getAttribute('src');
   const frameBefore=child();
   await root.locator('[data-grid-reset]').click();await page.waitForTimeout(100);
   assert.equal(child(),frameBefore,'new layout keeps the iframe document');
   assert.equal(await root.locator('iframe').getAttribute('src'),frameSrc,'new layout does not reload the iframe');
   assert.equal(await child().evaluate(()=>window.__film.state.cards),1,'new layout preserves timing view');
   await root.locator('[data-grid-stage="film"]').click();await page.waitForTimeout(100);
   if(mode==='reduced'){
     assert.equal(await root.locator('[data-grid-pause]').isDisabled(),true);
     assert.ok(await child().evaluate(()=>__film.status().finished&&__film.state.lattice===1),'reduced motion shows the final wireframe');
   }else{
     assert.equal(await root.getAttribute('data-grid-playing'),'true','film resumes');
     await root.locator('[data-grid-pause]').click();await page.waitForTimeout(80);
     const frozen=await child().evaluate(()=>({film:window.__film.status().time,grid:window.__grid.clock(),state:JSON.stringify(window.__film.state)}));
     await page.waitForTimeout(180);
     assert.deepEqual(await child().evaluate(()=>({film:window.__film.status().time,grid:window.__grid.clock(),state:JSON.stringify(window.__film.state)})),frozen,'pause freezes both clocks and geometry');
     await root.locator('[data-grid-reset]').click();await page.waitForTimeout(80);
     assert.ok(await child().evaluate(()=>window.__grid.cells().length>0),'paused new layout is visible');
     await root.locator('[data-grid-pause]').click();await page.waitForTimeout(100);
     assert.equal(await child().evaluate(()=>window.__film.status().finished),false,'play replays the paused new layout');
     await page.waitForTimeout(1000);
     assert.equal(await root.getAttribute('data-grid-playing'),'false','completed film reports paused');
     assert.equal(await root.locator('[data-grid-pause]').getAttribute('aria-label'),'Replay grid animation');
   }
   for(const variant of ['blocks','dither']){
     await root.locator(`[data-grid-variant="${variant}"]`).click();
     await page.waitForTimeout(250);
     assert.equal(await child().evaluate(()=>window.__grid.code()),variant==='blocks'?'3B':'3C');
     if(mode==='reduced')assert.equal(await root.getAttribute('data-grid-playing'),'false');
     if(mode!=='reduced')await root.locator('[data-grid-pause]').click();
     await root.locator('[data-grid-open]').press('Enter');await page.waitForTimeout(80);
     if(mode!=='reduced')assert.ok(await child().evaluate(()=>window.__grid.audit().cells.some(c=>c.settled)),'paused Open shows a completed cell');
     assert.ok(await child().evaluate(()=>window.__grid.load().cells>0));
   }
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('[data-breathing-grid]').dataset.gridPlaying==='false');
   assert.equal(await root.getAttribute('data-grid-playing'),'false','dynamic reduced motion');
   await page.setViewportSize({width:width===320?390:320,height:900});await page.waitForTimeout(100);
   const visibleInk=await child().evaluate(()=>{const c=document.querySelector('canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let i=0;i<d.length;i+=4)if(d[i+1]>d[i]+20&&d[i+1]>d[i+2]+10)return true;return false;});
   if(!visibleInk){console.log('RESIZE',width,mode,await child().evaluate(()=>({audit:__grid.audit(),cells:__grid.cells(),why:__grid.why(),state:__grid.state()})));await page.screenshot({path:'/tmp/grid-resize-failure.png'});}
   assert.ok(visibleInk,'paused canvas redraws on resize');
   await page.emulateMedia({reducedMotion:'no-preference'});
   await page.evaluate(()=>scrollTo({top:document.body.scrollHeight,behavior:'instant'}));await page.waitForFunction(()=>document.querySelector('[data-breathing-grid]').getBoundingClientRect().bottom<0);await page.waitForTimeout(300);await page.waitForFunction(()=>document.querySelector('[data-breathing-grid]').dataset.gridPlaying==='false');
   assert.equal(await root.getAttribute('data-grid-playing'),'false','offscreen pause');
   assert.deepEqual(errors,[]);
 }
 console.log('PASS',width,mode);checked++;await context.close();
}
console.log(`${checked} interactive/fallback contexts passed.`);
} finally {await browser.close();}
