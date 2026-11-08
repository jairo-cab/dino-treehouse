import { registerSW } from 'virtual:pwa-register';

/** Shows a small "New version! Tap to update" pill when a new build is ready. */
export function setupUpdater() {
  const updateSW = registerSW({
    onNeedRefresh() { showPill(() => void updateSW(true)); },
    onRegisteredSW(_url, reg) {
      // long sessions: look for a new version every 20 minutes
      if (reg) setInterval(() => void reg.update().catch(() => {}), 20 * 60 * 1000);
    },
  });
}

function showPill(onTap: () => void) {
  if (document.getElementById('update-pill')) return;
  const b = document.createElement('button');
  b.id = 'update-pill';
  b.textContent = '✨ New version! Tap to update';
  b.style.cssText = [
    'position:fixed', 'top:max(12px,env(safe-area-inset-top))', 'left:50%', 'transform:translateX(-50%)',
    'z-index:10', 'padding:12px 22px', 'border:0', 'border-radius:999px', 'background:#ff9f1c', 'color:#fff',
    'font:700 18px Fredoka,sans-serif', 'box-shadow:0 4px 0 #c97a00,0 8px 18px rgba(0,0,0,.25)', 'cursor:pointer',
    'touch-action:manipulation',
  ].join(';');
  b.addEventListener('click', onTap);
  document.body.appendChild(b);
}
