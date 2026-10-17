// Neutral host only. Source and dependencies arrive through authenticated URLs.
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const instances = [];
const globalReduced = () => reduced.matches || document.documentElement.dataset.motionPreference === 'paused';
for (const root of document.querySelectorAll('[data-private-demo]')) {
  const product = root.querySelector('[data-demo-product]');
  const poster = root.querySelector('[data-demo-poster]');
  const theme = root.querySelector('[data-demo-theme]');
  const motion = root.querySelector('[data-demo-motion]');
  const expand = root.querySelector('[data-demo-expand]');
  const compare = root.dataset.demoModule === 'native-activity';
  let dark = false, paused = false, visible = false, loading, players = [], dialog;
  const state = () => ({theme:dark?'dark':'light',off:globalReduced() || paused});
  function update() {
    const current = state();
    motion.textContent = current.off ? 'Enable motion' : 'Pause motion';
    motion.disabled = globalReduced();motion.setAttribute('aria-pressed',String(current.off));
    players.forEach(player=>player.update(current));
  }
  async function load() {
    if (loading || players.length) return loading;
    const name = root.dataset.demoModule;
    if (!/^[A-Za-z0-9_-]+$/.test(name)) return;
    loading = (async () => {
      const module = await import(/* @vite-ignore */ `/private/demo-assets/${name}`);
      product.hidden = false;
      product.classList.toggle('private-demo__product--comparison',compare);
      const variants = compare ? ['today','proposed'] : ['product'];
      for(const variant of variants) {
        const pane=document.createElement('div');pane.className='private-demo__pane';
        if(compare){const label=document.createElement('strong');label.className='private-demo__pane-label';label.textContent=variant==='today'?'Today':'Proposed';pane.append(label);}
        const host=document.createElement('div');host.className='private-demo__mount';host.dataset.demoVariant=variant;pane.append(host);product.append(pane);
        players.push(module.mount(host,{...state(),variant,scenario:root.dataset.demoQuery,query:root.dataset.demoQuery}));
      }
      poster.hidden = true;root.dataset.enhanced='true';root.dataset.ready='true';
      root.querySelectorAll('[data-demo-controls]').forEach(control=>{control.hidden=false;});
      update();
    })().catch(error=>{console.error('Private example could not load',error);product.hidden=true;poster.hidden=false;loading=null;});
    return loading;
  }
  root.querySelectorAll('[data-demo-scenario]').forEach(button=>button.addEventListener('click',async()=>{
    root.dataset.demoQuery=button.dataset.demoScenario;
    root.querySelectorAll('[data-demo-scenario]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    if(compare || root.dataset.demoModule === 'native-surfaces'){players.forEach(player=>player.select(button.dataset.demoScenario));return;}
    players.forEach(player=>player.destroy());players=[];product.replaceChildren();loading=null;await load();
  }));
  root.querySelector('[data-demo-replay]')?.addEventListener('click',()=>players.forEach(player=>player.replay()));
  root.querySelector('[data-demo-pause]')?.addEventListener('click',()=>players.forEach(player=>player.pause()));
  theme.addEventListener('click',()=>{dark=!dark;theme.textContent=dark?'Light':'Dark';theme.setAttribute('aria-pressed',String(dark));update();});
  motion.addEventListener('click',()=>{paused=!paused;update();});
  expand.addEventListener('click',async()=>{
    await load();if(!players.length || dialog)return;
    dialog=document.createElement('dialog');dialog.className='private-demo-preview';dialog.setAttribute('aria-label',root.getAttribute('aria-label'));
    const close=document.createElement('button');close.type='button';close.className='private-demo-preview__close';close.textContent='Close preview';
    close.addEventListener('click',()=>dialog.close());dialog.append(close,product);document.body.append(dialog);
    dialog.addEventListener('close',()=>{root.querySelector('[data-demo-viewport]').append(product);dialog.remove();dialog=null;players.forEach(player=>player.suspend?.(false));document.documentElement.classList.remove('private-demo-preview-open');expand.focus();},{once:true});
    dialog.showModal();players.forEach(player=>player.suspend?.(false));document.documentElement.classList.add('private-demo-preview-open');close.focus();
  });
  const observer=new IntersectionObserver(entries=>{
    visible=entries[0].isIntersecting;if(visible)load();players.forEach(player=>player.suspend?.((!visible&&!dialog)||document.hidden));
  },{rootMargin:'100px'});observer.observe(root);
  instances.push({update,destroy(){players.forEach(player=>player.destroy());observer.disconnect();},visibility(){players.forEach(player=>player.suspend?.((!visible&&!dialog)||document.hidden));}});
}
window.addEventListener('traykov-motion-change',()=>instances.forEach(item=>item.update()));
reduced.addEventListener('change',()=>instances.forEach(item=>item.update()));
document.addEventListener('visibilitychange',()=>instances.forEach(item=>item.visibility()));
window.addEventListener('pagehide',event=>{if(!event.persisted)instances.forEach(item=>item.destroy());});
