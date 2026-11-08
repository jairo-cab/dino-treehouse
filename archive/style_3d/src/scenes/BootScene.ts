import Phaser from 'phaser';

// First screen. The "Play!" tap unlocks audio on iPhone/Safari.
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    const { width, height } = this.scale;
    this.add.text(width / 2, height * 0.3, 'Dino\nTreehouse', {
      fontFamily: 'sans-serif', fontSize: '96px', fontStyle: 'bold',
      color: '#2f5d1f', align: 'center',
    }).setOrigin(0.5);

    const btn = this.add.rectangle(width / 2, height * 0.7, 360, 140, 0xffc83d)
      .setStrokeStyle(8, 0x7a4b12).setInteractive({ useHandCursor: true });
    const label = this.add.text(width / 2, height * 0.7, 'Play!', {
      fontFamily: 'sans-serif', fontSize: '72px', fontStyle: 'bold', color: '#5a3200',
    }).setOrigin(0.5);

    this.tweens.add({ targets: [btn, label], scale: 1.06, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' });
    btn.on('pointerdown', () => {
      this.tweens.add({ targets: [btn, label], scale: 0.92, duration: 80, yoyo: true });
      // the tap also unlocks audio on iPhone
      this.time.delayedCall(160, () => this.scene.start('Preload'));
    });
  }
}
