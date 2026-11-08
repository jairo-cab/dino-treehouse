import Phaser from 'phaser';
import { DINOS, isOwned } from '../content/dinos';
import { H, W, bubble, chip, cover, fitHeight, FONT_TITLE, motes, panel, shadow, speak, vignette } from '../ui/helpers';

const GAMES = [
  { scene: 'Bedroom', label: 'Toys', icon: 'icon_toys' },
  { scene: 'Paint', label: 'Paint', icon: 'icon_paint' },
  { scene: 'Spell', label: 'Write', icon: 'icon_write' },
  { scene: 'Count', label: 'Count', icon: 'icon_count' },
  { scene: 'Like', label: 'Like', icon: 'icon_like' },
];

/** Game picker: one illustrated card per game. */
export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    this.cameras.main.fadeIn(180);
    cover(this, 'bg_bedroom');
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.08);
    motes(this);
    vignette(this);
    shadow(this, W / 2, 1245, 260, 0.4);
    const pip = fitHeight(this.add.image(W / 2, 1245, 'pip_happy'), 200).setOrigin(0.5, 1).setDepth(3);
    this.tweens.add({ targets: pip, y: 1228, duration: 160, yoyo: true, delay: 300 });
    const owned = DINOS.filter((d) => isOwned(d.key)).length;
    chip(this, 590, 1190, 230, 96, `Dinos ${owned}/${DINOS.length}`, 36, () => this.scene.start('Dinos'), 'blue');
    pip.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.scene.start('Dinos'));
    bubble(this, W / 2, 150, 600, "Let's play!", 'lets-play');
    this.time.delayedCall(400, () => speak(this, 'lets-play'));

    GAMES.forEach((g, i) => {
      const x = i % 2 === 0 ? 195 : 525, y = 400 + Math.floor(i / 2) * 330;
      const card = this.add.container(x, y).setDepth(10);
      const bg = panel(this, -157, -150, 314, 300);
      const icon = this.add.image(0, -36, g.icon);
      icon.setScale(220 / icon.width);
      const label = this.add.text(0, 100, g.label, {
        fontFamily: FONT_TITLE, fontSize: '50px', fontStyle: 'bold', color: '#5a3200',
      }).setOrigin(0.5);
      const hit = this.add.rectangle(0, 0, 314, 300, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      card.add([bg, icon, label, hit]);
      hit.on('pointerdown', () => {
        this.tweens.add({ targets: card, scale: 0.94, duration: 80, yoyo: true, onComplete: () => this.scene.start(g.scene) });
      });
      card.setScale(0.7).setAlpha(0);
      this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 240, delay: 40 + i * 50, ease: 'Back.out' });
    });
  }
}
