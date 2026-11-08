import Phaser from 'phaser';
import { DINOS, isOwned } from '../content/dinos';
import { H, W, bubble, cover, fitHeight, FONT_TITLE, motes, panel, shadow, speak, vignette } from '../ui/helpers';

const GAMES = [
  { scene: 'Bedroom', label: 'Toys', icon: 'icon_toys' },
  { scene: 'Paint', label: 'Paint', icon: 'icon_paint' },
  { scene: 'Spell', label: 'Write', icon: 'icon_write' },
  { scene: 'Count', label: 'Count', icon: 'icon_count' },
  { scene: 'Like', label: 'Like', icon: 'icon_like' },
  { scene: 'School', label: 'School', icon: 'obj_schoolbag' },
  { scene: 'Read', label: 'Read', icon: 'obj_book_closed' },
  { scene: 'Graduation', label: 'Test', icon: 'icon_grad' },
  { scene: 'Family', label: 'Family', icon: 'obj_mum' },
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
    const owned = DINOS.filter((d) => isOwned(d.key)).length;
    bubble(this, W / 2, 150, 600, "Let's play!", 'lets-play');
    this.time.delayedCall(400, () => speak(this, 'lets-play'));

    // 3 columns x 3 rows: the 8 games and, in the last slot, the dino collection
    const slots = [...GAMES, { scene: 'Dinos', label: `Dinos ${owned}/${DINOS.length}`, icon: 'pip_happy' }];
    slots.forEach((g, i) => {
      const x = 125 + (i % 3) * 235, y = 322 + Math.floor(i / 3) * 262;
      const card = this.add.container(x, y).setDepth(10);
      const bg = panel(this, -110, -125, 220, 250);
      const icon = this.add.image(0, -28, g.icon);
      icon.setScale(Math.min(150 / icon.width, 140 / icon.height));
      const label = this.add.text(0, 84, g.label, {
        fontFamily: FONT_TITLE, fontSize: g.label.length > 8 ? '34px' : '42px', fontStyle: 'bold', color: '#5a3200',
      }).setOrigin(0.5);
      const hit = this.add.rectangle(0, 0, 220, 250, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      card.add([bg, icon, label, hit]);
      hit.on('pointerdown', () => {
        this.tweens.add({ targets: card, scale: 0.84, duration: 80, yoyo: true, onComplete: () => this.scene.start(g.scene) });
      });
      card.setScale(0.6).setAlpha(0);
      this.tweens.add({ targets: card, scale: 0.92, alpha: 1, duration: 240, delay: 40 + i * 45, ease: 'Back.out' });
    });
  }
}
