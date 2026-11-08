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
import { setupUpdater } from './ui/updater';

async function start() {
  // text is drawn once: wait for the fonts so it never shows in a fallback font
  try { await Promise.all([document.fonts.load('700 48px Fredoka'), document.fonts.load('400 40px Andika')]); } catch { /* fall back */ }
  return new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#bfe8ff',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 720, height: 1280 },
    scene: [BootScene, PreloadScene, HatchScene, BedroomScene, PaintScene, MenuScene, SpellScene, CountScene, RewardScene, DinosScene],
});
}

setupUpdater();

// handy for automated checks in the browser console
void start().then((game) => { (window as unknown as { __game: Phaser.Game }).__game = game; });
