// Host bridge: parent owns whether an embed may play; source owns the pixels.
(() => {
  const G = window.__grid;
  if (!G) return;
  const film = window.__film;
  let requested = false, stage = film ? 'film' : 'grid', progress = 1;

  const instance = new URLSearchParams(location.search).get('instance');
  const send = (data) => parent.postMessage({ channel: 'breathing-grid', instance, ...data }, '*');
  const active = () => requested && !document.hidden;
  const inspect = () => {
    if (!film) return;
    G.playback(false);
    film.inspect(stage, progress);
  };
  const apply = () => {
    if (film) {
      if (stage === 'film') film.playback(active());
      else inspect();
    } else G.playback(active());
  };

  addEventListener('message', (event) => {
    if (event.source !== parent || event.data?.channel !== 'breathing-grid') return;
    const { action, value } = event.data;
    if (action === 'configure' && value) {
      if (['light', 'dark'].includes(value.theme)) G.setTheme(value.theme);
      if (Number.isFinite(value.scale) && value.scale > 0 && value.scale <= 1) window.__gridHost.displayScale = value.scale;
      if (film && ['film', 'geometry', 'timing'].includes(value.stage)) stage = value.stage;
      requested = Boolean(value.playing);
      if (film && stage === 'film') film.replay();
      apply(); G.renderNow();
      send({ configured: true, finished: film?.status().finished || false });
      return;
    }
    if (action === 'playback') { requested = Boolean(value); apply(); }
    if (action === 'scale' && Number.isFinite(value) && value > 0 && value <= 1) {
      window.__gridHost.displayScale = value;
      if (film) film.refresh(); else G.renderNow();
    }
    if (action === 'theme' && ['light', 'dark'].includes(value)) {
      G.setTheme(value);
      if (film) film.refresh(); else G.renderNow();
    }
    if (action === 'open' && !film) G.openCell();
    if (action === 'reseed') {
      if (film) film.reseed(value, active());
      else G.reseedTransition(value);
    }
    if (action === 'stage' && film && ['film', 'geometry', 'timing'].includes(value)) {
      stage = value; progress = 1; if (stage === 'film') film.replay(); apply(); send({ stage });
    }
    if (action === 'replay' && film) { stage = 'film'; film.replay(); apply(); }
    if (action === 'scrub' && film && Number.isFinite(value)) {
      stage = 'timing'; progress = Math.max(0, Math.min(1, value)); inspect(); send({ progress });
    }
  });
  addEventListener('visibilitychange', apply);
  addEventListener('pagehide', () => { requested = false; apply(); });
  addEventListener('resize', () => {
    if (film) film.refresh(); else G.renderNow();
  });
  addEventListener('load', () => {
    G.renderNow();
    send({ ready: true, variant: film ? 'film' : G.code(), paused: true });
  });
})();
