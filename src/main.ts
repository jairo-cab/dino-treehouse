import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/andika/400.css';
import '@fontsource/andika/700.css';
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { HatchScene } from './scenes/HatchScene';
import { BedroomScene } from './scenes/BedroomScene';
import { PaintScene } from './scenes/PaintScene';
import { MenuScene } from './scenes/MenuScene';
import { SpellScene } from './scenes/SpellScene';
import { CountScene } from './scenes/CountScene';
import { RewardScene } from './scenes/RewardScene';
import { DinosScene } from './scenes/DinosScene';
import { LikeScene } from './scenes/LikeScene';
import { SchoolScene } from './scenes/SchoolScene';
import { ReadScene } from './scenes/ReadScene';
import { GraduationScene } from './scenes/GraduationScene';
import { FamilyScene } from './scenes/FamilyScene';
import { setupUpdater, showPill } from './ui/updater';

async function start() {
  // text is drawn once: wait for the fonts so it never shows in a fallback font
  try { await Promise.all([document.fonts.load('700 48px Fredoka'), document.fonts.load('400 40px Andika')]); } catch { /* fall back */ }
  return new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#bfe8ff',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 720, height: 1280 },
    scene: [BootScene, PreloadScene, HatchScene, BedroomScene, PaintScene, MenuScene, SpellScene, CountScene, RewardScene, DinosScene, LikeScene, SchoolScene, ReadScene, GraduationScene, FamilyScene],
});
}

setupUpdater();

/** Phones freeze web games in odd ways (graphics lost in the background, a screen that throws). Never leave the child stuck:
 *  reload (the progress lives in localStorage) or offer a big "Tap to try again". */
function setupSafetyNets(game: Phaser.Game) {
  game.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); location.reload(); });
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > 120_000) location.reload();      // came back after 2+ minutes: start clean
  });
  window.addEventListener('error', (e) => {
    if (/ResizeObserver/i.test(e.message)) return;
    showPill(() => location.reload(), '🔄 Oops! Tap to try again', 'rescue-pill');
  });
}

// handy for automated checks in the browser console
void start().then((game) => { (window as unknown as { __game: Phaser.Game }).__game = game; setupSafetyNets(game); });
