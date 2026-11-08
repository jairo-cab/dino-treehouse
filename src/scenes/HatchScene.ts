import Phaser from 'phaser';
import { H, W, bubble, burst, cover, fitHeight, motes, shadow, speak, vignette } from '../ui/helpers';

interface Line { text: string; audio: string; face: string }
const LINES: Line[] = [
  { text: "Hi! My name's Pip.", audio: 'hi-my-names-pip', face: 'pip_happy' },
  { text: "I'm a boy.", audio: 'pip-im-a-boy', face: 'pip_talk' },
  { text: "I'm six years old.", audio: 'im-six-years-old', face: 'pip_happy' },
  { text: "Let's play!", audio: 'lets-play', face: 'pip_happy' },
];

const SEEN = 'dino-treehouse-intro-seen';
const introSeen = (): boolean => { try { return localStorage.getItem(SEEN) === '1'; } catch { return false; } };
const markIntroSeen = (): void => { try { localStorage.setItem(SEEN, '1'); } catch { /* ignore */ } };

export class HatchScene extends Phaser.Scene {
  private egg!: Phaser.GameObjects.Image;
  private taps = 0;
  private busy = false;
  private pip?: Phaser.GameObjects.Image;
  private ring?: Phaser.GameObjects.Arc;
  private bubbleBox?: Phaser.GameObjects.Container;
  private lineIndex = 0;
  private lastTap = 0;
  constructor() { super('Hatch'); }

  create() {
    this.taps = 0; this.busy = false; this.lineIndex = 0; this.pip = undefined;
    // the egg intro is only for the very first time: after that, straight to the menu
    if (introSeen()) { this.scene.start('Menu'); return; }
    this.cameras.main.fadeIn(180);
    cover(this, 'bg_bedroom');
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.12);
    shadow(this, W / 2, 806, 330, 0.4);
    motes(this);
    vignette(this);
    this.egg = fitHeight(this.add.image(W / 2, 800, 'egg_closed'), 460).setOrigin(0.5, 1);
    this.egg.setInteractive({ useHandCursor: true });
    this.egg.on('pointerdown', () => this.tapEgg());
    this.ring = this.add.circle(W / 2, 600, 250).setStrokeStyle(10, 0xffd23f, 0.9);
    this.tweens.add({ targets: this.ring, scale: 1.12, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.egg, y: 790, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  private tapEgg() {
    if (this.busy || this.taps >= 3) return;
    this.taps++;
    this.tweens.killTweensOf(this.egg);
    this.egg.y = 800;
    this.ring?.destroy(); this.ring = undefined;
    this.tweens.add({ targets: this.egg, angle: { from: -10, to: 10 }, duration: 70, yoyo: true, repeat: 5, onComplete: () => { this.egg.angle = 0; } });
    if (this.taps === 2) this.time.delayedCall(450, () => this.egg.setTexture('egg_cracked'));
    if (this.taps === 3) { this.busy = true; this.time.delayedCall(450, () => this.hatch()); }
  }

  private hatch() {
    this.egg.setTexture('egg_open');
    burst(this, W / 2, 700, 28);
    this.cameras.main.shake(180, 0.006);
    shadow(this, W / 2, 908, 330, 0.4);
    this.pip = fitHeight(this.add.image(W / 2, 760, 'pip_surprised'), 20).setOrigin(0.5, 1).setDepth(5);
    this.pip.setScale(0.02);
    this.tweens.add({
      targets: this.pip, scale: 620 / this.pip.height, y: 900, duration: 650, ease: 'Back.out',
      onComplete: () => {
        this.pip!.setTexture('pip_happy'); this.busy = false; this.showLine();
        this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
          if (over.length > 0) return;                       // pressing the speaker button must not skip the line
          const now = this.time.now;
          if (now - this.lastTap < 450) return;               // ignore double taps
          this.lastTap = now;
          this.next();
        });
      },
    });
    this.tweens.add({ targets: this.egg, alpha: 0, y: this.egg.y + 60, duration: 700, delay: 300 });
  }

  private showLine() {
    const line = LINES[this.lineIndex];
    this.bubbleBox?.destroy();
    this.pip?.setTexture(line.face);
    this.bubbleBox = bubble(this, W / 2, 230, 640, line.text, line.audio);
    speak(this, line.audio);
    this.tweens.add({ targets: this.pip, y: '-=24', duration: 140, yoyo: true });
  }

  private next() {
    if (this.busy || !this.pip) return;
    this.lineIndex++;
    if (this.lineIndex >= LINES.length) {
      this.busy = true;
      markIntroSeen();
      this.cameras.main.fadeOut(400);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Menu'));
      return;
    }
    this.showLine();
  }
}
