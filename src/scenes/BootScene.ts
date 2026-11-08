import Phaser from 'phaser';
import { FONT_TITLE, button } from '../ui/helpers';

// First screen. The "Play!" tap unlocks audio on iPhone/Safari.
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    const { width, height } = this.scale;
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x8fd8ff, 0x8fd8ff, 0xe6f7ff, 0xe6f7ff, 1).fillRect(0, 0, width, height);
    sky.fillStyle(0x7ed957, 1).fillEllipse(width / 2, height + 120, width * 1.8, 520);        // hill
    sky.fillStyle(0x5fbf3f, 1).fillEllipse(width * 0.1, height + 60, 600, 380);
    this.add.text(width / 2, height * 0.28, 'Dino\nTreehouse', {
      fontFamily: FONT_TITLE, fontSize: '124px', fontStyle: 'bold', color: '#fff6e4', align: 'center',
      stroke: '#2f5d1f', strokeThickness: 18, lineSpacing: -6,
    }).setOrigin(0.5).setShadow(0, 10, '#1f4a10', 0, true, true);
    // the tap also unlocks audio on iPhone
    const play = button(this, width / 2, height * 0.62, 400, 'Play!', () => this.scene.start('Preload'));
    this.tweens.add({ targets: play, scale: 1.05, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' });
  }
}
