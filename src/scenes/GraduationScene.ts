import Phaser from 'phaser';
import { DINOS, isOwned } from '../content/dinos';
import { ReadScene } from './ReadScene';
import { FONT_TITLE, W, bubble, burst, button, panel, speak } from '../ui/helpers';
import { offerEgg } from '../ui/reward';

/** The exam simulation: same kinds of rounds as the real test, then a graduation ceremony (stars, never fewer than one). */
export class GraduationScene extends ReadScene {
  constructor() { super('Graduation'); this.graduation = true; }

  protected ceremony() {
    const owned = DINOS.filter((d) => isOwned(d.key));
    const dino = Phaser.Utils.Array.GetRandom(owned);
    const stars = this.stars();
    this.add.rectangle(W / 2, 640, W, 1280, 0x000000, 0.35).setDepth(20);
    const box = panel(this, 40, 200, W - 80, 880).setDepth(21);
    void box;
    this.add.text(W / 2, 290, 'Graduation!', {
      fontFamily: FONT_TITLE, fontSize: '84px', fontStyle: 'bold', color: '#fff6e4', stroke: '#6a4a20', strokeThickness: 14,
    }).setOrigin(0.5).setDepth(22);
    const im = this.add.image(W / 2, 800, `${dino.key}_happy`).setOrigin(0.5, 1).setDepth(23);
    im.setScale(Math.min(430 / im.height, 440 / im.width));
    // the graduation cap, drawn: board + base + tassel
    const g = this.add.graphics().setDepth(24);
    const top = im.getTopCenter();
    const cx = top.x, cy = top.y + 20;
    g.fillStyle(0x2b2b3a, 1).fillRoundedRect(cx - 62, cy - 4, 124, 40, 12);
    g.fillStyle(0x3a3a4e, 1).fillPoints([new Phaser.Math.Vector2(cx, cy - 52), new Phaser.Math.Vector2(cx + 118, cy - 12), new Phaser.Math.Vector2(cx, cy + 28), new Phaser.Math.Vector2(cx - 118, cy - 12)], true);
    g.lineStyle(7, 0xffc233, 1).lineBetween(cx, cy - 12, cx + 96, cy - 4).lineBetween(cx + 96, cy - 4, cx + 96, cy + 60);
    g.fillStyle(0xffc233, 1).fillCircle(cx + 96, cy + 66, 11);
    this.tweens.add({ targets: [im, g], y: '-=18', duration: 260, yoyo: true, repeat: 2, delay: 300 });
    // stars
    for (let i = 0; i < 3; i++) {
      const on = i < stars;
      const s = this.add.star(W / 2 + (i - 1) * 150, 880, 5, 34, 74, on ? 0xffc233 : 0xcfc6b4).setDepth(23).setStrokeStyle(8, on ? 0xd98a00 : 0xaaa090);
      s.setScale(0);
      this.tweens.add({ targets: s, scale: 1, duration: 320, delay: 700 + i * 260, ease: 'Back.out', onStart: () => { if (on) burst(this, s.x, s.y, 16); } });
    }
    this.bubbleBox2 = bubble(this, W / 2, 1010, 600, 'Well done!', 'well-done');
    this.bubbleBox2.setDepth(30);
    this.time.delayedCall(500, () => speak(this, 'well-done'));
    for (let i = 0; i < 8; i++) this.time.delayedCall(i * 300, () => burst(this, 80 + Math.random() * 560, 250 + Math.random() * 600, 16));
    button(this, W / 2 - 170, 1130, 300, 'Play again', () => this.scene.restart()).setDepth(960);
    button(this, W / 2 + 170, 1130, 300, 'Menu', () => this.scene.start('Menu')).setDepth(960);
    offerEgg(this, W - 120, 560, 150);
  }
  private bubbleBox2?: Phaser.GameObjects.Container;
}
