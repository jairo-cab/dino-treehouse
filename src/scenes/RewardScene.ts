import Phaser from 'phaser';
import { introKeys, introLines, nextEgg, unlock, type Dino } from '../content/dinos';
import { H, W, bubble, burst, cover, fitHeight, motes, shadow, speak, vignette } from '../ui/helpers';

/** A new egg: tap it 3 times, a new dino hatches and introduces itself, then it joins the collection. */
export class RewardScene extends Phaser.Scene {
  private dino!: Dino;
  private egg!: Phaser.GameObjects.Image;
  private pic?: Phaser.GameObjects.Image;
  private taps = 0;
  private busy = false;
  private line = 0;
  private lastTap = 0;
  private box?: Phaser.GameObjects.Container;
  constructor() { super('Reward'); }

  create() {
    this.taps = 0; this.busy = false; this.line = 0; this.pic = undefined;
    const d = nextEgg();
    if (!d) { this.scene.start('Dinos'); return; }
    this.dino = d;
    this.cameras.main.fadeIn(180);
    cover(this, 'bg_bedroom');
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.12);
    shadow(this, W / 2, 806, 330, 0.4);
    motes(this); vignette(this);
    this.egg = fitHeight(this.add.image(W / 2, 800, 'egg_closed'), 460).setOrigin(0.5, 1).setInteractive({ useHandCursor: true });
    this.egg.on('pointerdown', () => this.tapEgg());
    const ring = this.add.circle(W / 2, 600, 250).setStrokeStyle(10, 0xffd23f, 0.9).setData('ring', true);
    this.tweens.add({ targets: ring, scale: 1.12, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });
    this.egg.once('pointerdown', () => ring.destroy());
    speak(this, 'new-egg');
  }

  private tapEgg() {
    if (this.busy || this.taps >= 3) return;
    this.taps++;
    this.tweens.killTweensOf(this.egg);
    this.tweens.add({ targets: this.egg, angle: { from: -10, to: 10 }, duration: 70, yoyo: true, repeat: 5, onComplete: () => { this.egg.angle = 0; } });
    if (this.taps === 2) this.time.delayedCall(300, () => this.egg.setTexture('egg_cracked'));
    if (this.taps === 3) { this.busy = true; this.time.delayedCall(350, () => this.hatch()); }
  }

  private hatch() {
    const key = this.dino.key;
    this.egg.setTexture('egg_open');
    burst(this, W / 2, 700, 28);
    this.cameras.main.shake(180, 0.006);
    this.pic = fitHeight(this.add.image(W / 2, 760, `${key}_surprised`), 20).setOrigin(0.5, 1).setDepth(5);
    this.pic.setScale(0.02);
    const tex = this.textures.get(`${key}_surprised`).getSourceImage();
    this.tweens.add({
      targets: this.pic, scale: Math.min(560 / tex.height, 640 / tex.width), y: 900, duration: 520, ease: 'Back.out',
      onComplete: () => {
        this.busy = false; this.showLine();
        this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
          if (over.length > 0) return;
          const now = this.time.now;
          if (now - this.lastTap < 400) return;
          this.lastTap = now;
          this.next();
        });
      },
    });
    this.tweens.add({ targets: this.egg, alpha: 0, y: this.egg.y + 60, duration: 500, delay: 300 });
  }

  private showLine() {
    const keys = introKeys(this.dino);
    this.box?.destroy();
    this.pic?.setTexture(`${this.dino.key}_${this.line === 2 ? 'talk' : 'happy'}`);
    this.box = bubble(this, W / 2, 230, 640, introLines(this.dino)[this.line], keys[this.line]);
    speak(this, keys[this.line]);
    this.tweens.add({ targets: this.pic, y: '-=24', duration: 140, yoyo: true });
  }

  private next() {
    if (this.busy || !this.pic) return;
    this.line++;
    if (this.line >= introLines(this.dino).length) {
      this.busy = true;
      unlock(this.dino.key);
      this.cameras.main.fadeOut(250);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Dinos', { just: this.dino.key }));
      return;
    }
    this.showLine();
  }
}
