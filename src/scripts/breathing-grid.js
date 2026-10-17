import {getMotionState,onMotionChange} from './motion/lifecycle.js';

export function initializeBreathingGrids() {
  document.querySelectorAll('[data-breathing-grid]').forEach(root=>{
    if(root.dataset.gridInitialized) return;
    root.dataset.gridInitialized='true';
    const frame=root.querySelector('[data-grid-frame]'), poster=root.querySelector('[data-grid-poster]');
    const pause=root.querySelector('[data-grid-pause]'), inspector=root.querySelector('[data-grid-inspector]');
    const scrub=root.querySelector('[data-grid-scrub]'), hint=root.querySelector('[data-grid-hint]');
    let variant=root.dataset.initialVariant, stage=variant==='film'?'film':'grid', visible=false, ready=false, loaded=false, manual=false, finished=false, seed=37, instance=0, displayScale=1, loadTimer=0, failed=false;
    const send=(action,value)=>{if(ready)frame.contentWindow?.postMessage({channel:'breathing-grid',action,value},'*');};
    const theme=()=>document.documentElement.dataset.theme==='dark'?'dark':'light';
    const wantsPlayback=()=>{
      const motion=window.__traykovMotion?.getState() || getMotionState();
      return visible&&!motion.hidden&&!motion.transitionActive&&!manual&&!finished&&!motion.reduced&&!motion.paused&&(variant!=='film'||stage==='film');
    };
    const fitFrame=()=>{
      const bounds=root.querySelector('.breathing-grid__stage').getBoundingClientRect();
      if(!bounds.width)return;
      const width=Math.max(640,bounds.width),scale=bounds.width/width;displayScale=scale;
      frame.style.width=`${width}px`;frame.style.maxWidth='none';
      frame.style.height=`${bounds.height/scale}px`;
      frame.style.transformOrigin='top left';frame.style.transform=`scale(${scale})`;
      send('scale',scale);
    };
    const sync=()=>{
      const motion=window.__traykovMotion?.getState() || getMotionState();
      const play=ready&&wantsPlayback();
      send('playback',play); root.dataset.gridPlaying=String(play);
      root.dataset.overviewVideoState=play?'playing':'paused';pause.hidden=!ready||(variant==='film'&&stage==='geometry');pause.setAttribute('aria-label',`${play?'Pause':finished?'Replay':'Play'} grid animation`);pause.setAttribute('aria-pressed',String(play));
      pause.disabled=variant==='film'&&stage==='geometry';
      if(motion.reduced||motion.paused||motion.hidden||motion.transitionActive)pause.disabled=true;
      if(variant==='film'&&stage!=='film'){pause.hidden=true;pause.disabled=true;}
    };
    const showFallback=()=>{
      clearTimeout(loadTimer);failed=true;ready=false;root.dataset.gridReady='false';frame.hidden=true;poster.hidden=false;hint.textContent='The interactive grid could not load. This still shows the composition.';sync();
    };
    const load=()=>{
      loaded=true;ready=false;failed=false;instance++;clearTimeout(loadTimer);loadTimer=window.setTimeout(showFallback,10000);root.dataset.gridReady='false';frame.hidden=false;frame.style.visibility="hidden";poster.hidden=true;
      poster.src=`/case-studies/media/breathing-grids-${variant}-poster.jpg`;
      frame.title=variant==='film'?'Inspect grid geometry and timing':`${variant==='blocks'?'Blocks':'Pixel dither'} interactive grid`;
      fitFrame();
      frame.src=`/case-studies/breathing-grids/${variant}.html?seed=${seed}&t=${theme()}&instance=${instance}`;
      sync();
    };
    const select=(next)=>{
      if(next===variant&&loaded&&!failed)return;
      variant=next;stage=variant==='film'?'film':'grid';manual=false;finished=false;
      root.querySelectorAll('[data-grid-variant]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gridVariant===variant)));
      root.querySelector('[data-grid-open]').hidden=variant==='film';inspector.hidden=variant!=='film';
      root.querySelectorAll('[data-grid-stage]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gridStage===stage)));
      scrub.disabled=true;scrub.value='100';root.querySelector('[data-grid-progress]').textContent='100%';
      hint.textContent=variant==='film'?'Zoom into the wireframe. Explore Geometry and Timing to inspect one cell.':'Hover to reveal a cell’s tiling. Click to stamp it or turn a shape. You can also use Open a cell.';
      if(loaded||visible)load();
    };
    const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible&&!loaded)load();sync();},{threshold:0.05});observer.observe(root);
    root.querySelector('[data-grid-controls]').hidden=false;select(variant);
    root.addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button)return;
      if(button.dataset.gridVariant){select(button.dataset.gridVariant);return;}
      if(button.hasAttribute('data-grid-reset')){seed+=17;finished=false;sync();send('reseed',seed);return;}
      if(button.hasAttribute('data-grid-open')){send('open');return;}
      if(button.hasAttribute('data-grid-pause')){if(finished){finished=false;manual=false;send('replay');}else manual=root.dataset.gridPlaying==='true';sync();return;}
      if(button.dataset.gridStage){stage=button.dataset.gridStage;finished=false;manual=stage!=='film';send('stage',stage);scrub.disabled=stage!=='timing';scrub.value='100';root.querySelector('[data-grid-progress]').textContent='100%';root.querySelectorAll('[data-grid-stage]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));sync();}
    });
    scrub.addEventListener('input',()=>{manual=true;root.querySelector('[data-grid-progress]').textContent=`${scrub.value}%`;send('scrub',Number(scrub.value)/100);sync();});
    window.addEventListener('message',event=>{
      if(event.source!==frame.contentWindow||event.data?.channel!=='breathing-grid'||event.data.instance!==String(instance)||failed)return;
      if(event.data.configured){
        clearTimeout(loadTimer);finished=Boolean(event.data.finished);ready=true;frame.hidden=false;frame.style.visibility='visible';poster.hidden=true;root.dataset.gridReady='true';sync();return;
      }
      if(typeof event.data.finished==='boolean'){if(!ready||variant!=='film'||stage!=='film')return;finished=event.data.finished;sync();return;}
      if(Number.isFinite(event.data.progress)){scrub.value=String(Math.round(event.data.progress*100));root.querySelector('[data-grid-progress]').textContent=`${scrub.value}%`;return;}
      if(!event.data.ready)return;
      fitFrame();
      frame.contentWindow?.postMessage({channel:'breathing-grid',action:'configure',value:{theme:theme(),scale:displayScale,stage,playing:wantsPlayback()}},'*');
    });
    frame.addEventListener('error',showFallback);
    const themeObserver=new MutationObserver(()=>send('theme',theme()));themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    const motionChanged=()=>sync();
    onMotionChange(motionChanged);
    window.addEventListener('traykov-motion-change',motionChanged);
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',motionChanged);
    window.addEventListener('pagehide',()=>{send('playback',false);});
    new ResizeObserver(fitFrame).observe(root.querySelector('.breathing-grid__stage'));
  });
}
