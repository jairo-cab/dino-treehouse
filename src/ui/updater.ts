import { registerSW } from 'virtual:pwa-register';

/** Shows a small "New version! Tap to update" pill when a new build is ready. */
export function setupUpdater() {
  const updateSW = registerSW({
    onNeedRefresh() { showPill(() => applyUpdate(updateSW)); },
    onRegisteredSW(_url, reg) {
      // long sessions: look for a new version every 20 minutes
      if (reg) setInterval(() => void reg.update().catch(() => {}), 20 * 60 * 1000);
    },
  });
}

export function showPill(onTap: () => void, text = '✨ New version! Tap to update', id = 'update-pill') {
  if (document.getElementById(id)) return;
  const b = document.createElement('button');
  b.id = id;
  b.textContent = text;
  b.style.cssText = [
    'position:fixed', 'bottom:max(14px,env(safe-area-inset-bottom))', 'left:50%', 'transform:translateX(-50%)',
    'z-index:10', 'padding:12px 22px', 'border:0', 'border-radius:999px', 'background:#ff9f1c', 'color:#fff',
    'font:700 18px Fredoka,sans-serif', 'box-shadow:0 4px 0 #c97a00,0 8px 18px rgba(0,0,0,.25)', 'cursor:pointer',
    'touch-action:manipulation',
  ].join(';');
  b.addEventListener('click', onTap);
  document.body.appendChild(b);
}

/** Normal path: activate the waiting version (updateSW reloads the page). Safety net: if nothing reloaded after a second
 *  (e.g. no worker was waiting), drop the cached copy and reload, so the button can never be a dead end. The progress
 *  (dinos) lives in localStorage and is not touched. */
function applyUpdate(updateSW: (reload?: boolean) => Promise<void>) {
  void updateSW(true).catch(() => {});
  setTimeout(() => {
    void (async () => {
      try {
        for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
        for (const k of await caches.keys()) await caches.delete(k);
      } catch { /* ignore */ }
      location.reload();
    })();
  }, 1000);
}
