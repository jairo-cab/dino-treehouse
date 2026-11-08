import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { HatchScene } from './scenes/HatchScene';
import { BedroomScene } from './scenes/BedroomScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#bfe8ff',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,   // portrait design size; everything scales to fit the phone
    height: 1290,
  },
  scene: [BootScene, PreloadScene, HatchScene, BedroomScene],
});
