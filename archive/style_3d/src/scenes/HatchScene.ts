import Phaser from 'phaser';
import { H, W, breathe, bubble, burst, cover, fitHeight, parallax, shadow, speak, twinkles } from '../ui/helpers';

interface Line { text: string; audio: string; face: string }

// First meeting with Pip: structures E1 (greetings) and E3 (age).
const LINES: Line[] = [
  { text: "Hi! My name's Pip.", audio: 'hi-my-names-pip', face: 'pip_happy' },
  { text: "I'm six years old.", audio: 'im-six-years-old', face: 'pip_talk' },
  { text: "Let's play!", audio: 'lets-play', face: 'pip_happy' },
];

// fairy-light positions in the 3D bedroom background
export const FAIRY_LIGHTS = [
  { x: 65, y: 103 }, { x: 152, y: 77 }, { x: 129, y: 142 }, { x: 54, y: 204 }, { x: 32, y: 252 },
  { x: 297, y: 348 }, { x: 393, y: 406 }, { x: 516, y: 357 }, { x: 580, y: 368 }, { x: 684, y: 310 },
];

const EGG_X = W / 2;
const EGG_BASE = 960;

export class HatchScene extends Phaser.Scene {
  private egg!: Phaser.GameObjects.Image;
  private eggShadow!: Phaser.GameObjects.Image;
  private taps = 0;
  private busy = false;
  private pip?: Phaser.GameObjects.Image;
  private ring?: Phaser.GameObjects.Arc;
  private bubbleBox?: Phaser.GameObjects.Container;
  private lineIndex = 0;

  constructor() { super('Hatch'); }

  create() {
    this.cameras.main.fadeIn(500);
    const bg = cover(this, 'bg_bedroom');
    twinkles(this, FAIRY_LIGHTS);
    // warm light pool on the floor where the egg sits
    this.add.image(EGG_X, EGG_BASE - 10, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(620, 260).setAlpha(0.35);

    this.eggShadow = shadow(this, EGG_X, EGG_BASE + 6, 330, 0.4);
    this.egg = fitHeight(this.add.image(EGG_X, EGG_BASE, 'egg_closed'), 470).setOrigin(0.5, 1);
    this.egg.setInteractive({ useHandCursor: true });
    this.egg.on('pointerdown', () => this.tapEgg());

    // pulsing ring + bouncing egg = "tap me" without any text
    this.ring = this.add.circle(EGG_X, EGG_BASE - 230, 260).setStrokeStyle(10, 0xffe08a, 0.9);
    this.tweens.add({ targets: this.ring, scale: 1.12, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: this.egg, y: EGG_BASE - 12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    parallax(this, [{ obj: bg, factor: 10 }, { obj: this.egg, factor: -6 }]);
  }

  private tapEgg() {
    if (this.busy || this.taps >= 3) return;
    this.taps++;
    this.tweens.killTweensOf(this.egg);
    this.egg.y = EGG_BASE;
    this.ring?.destroy();
    this.ring = undefined;
    this.tweens.add({ targets: this.egg, angle: { from: -9, to: 9 }, duration: 70, yoyo: true, repeat: 5, onComplete: () => { this.egg.angle = 0; } });

    if (this.taps === 2) this.time.delayedCall(450, () => this.swapEgg('egg_cracked'));
    if (this.taps === 3) {
      this.busy = true;
      this.time.delayedCall(450, () => this.hatch());
    }
  }

  private swapEgg(key: string) {
    // keep the same bottom-centre and the same height scale
    const bottom = this.egg.y;
    this.egg.setTexture(key);
    fitHeight(this.egg, 470).setOrigin(0.5, 1);
    this.egg.y = bottom;
  }

  private hatch() {
    this.swapEgg('egg_open');
    burst(this, EGG_X, EGG_BASE - 200, 30);
    this.cameras.main.shake(180, 0.006);

    this.pip = fitHeight(this.add.image(EGG_X, EGG_BASE - 120, 'pip_surprised'), 20).setOrigin(0.5, 1).setDepth(5);
    const target = 560 / this.pip.height;
    this.pip.setScale(0.02);
    this.tweens.add({
      targets: this.pip, scale: target, y: EGG_BASE + 20, duration: 700, ease: 'Back.out',
      onComplete: () => {
        this.pip!.setTexture('pip_happy');
        breathe(this, this.pip!);
        this.busy = false;
        this.showLine();
        this.input.on('pointerdown', () => this.next());
      },
    });
    // the empty shell slides to the side
    this.tweens.add({ targets: this.egg, x: EGG_X - 190, y: EGG_BASE + 30, scale: this.egg.scale * 0.7, duration: 700, delay: 350, ease: 'Sine.out' });
    this.tweens.add({ targets: this.eggShadow, x: EGG_X - 190, scaleX: this.eggShadow.scaleX * 0.7, duration: 700, delay: 350 });
    this.add.image(EGG_X, EGG_BASE + 14, 'shadow').setDisplaySize(300, 84).setAlpha(0.38).setDepth(4);
  }

  private showLine() {
    const line = LINES[this.lineIndex];
    this.bubbleBox?.destroy();
    this.pip?.setTexture(line.face);
    this.bubbleBox = bubble(this, W / 2, 250, 650, line.text, line.audio);
    speak(this, line.audio);
    this.tweens.add({ targets: this.pip, y: '-=26', duration: 140, yoyo: true });
  }

  private next() {
    if (this.busy || !this.pip) return;
    this.lineIndex++;
    if (this.lineIndex >= LINES.length) {
      this.busy = true;
      this.cameras.main.fadeOut(400);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Bedroom'));
      return;
    }
    this.showLine();
  }
}

void H;
