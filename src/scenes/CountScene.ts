import Phaser from 'phaser';
import { hostOf } from '../content/dinos';
import { offerEgg } from '../ui/reward';
import { PRAISE, slug } from '../content/bedroom';
import { W, bubble, burst, button, chip, cover, fitHeight, panel, popIn, speak , homeButton, progress } from '../ui/helpers';

const NUMS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
type Round = { obj: string; n: number };
/** Every game: all six things in a new order, each with a different amount from 2 to 10. */
function makeRounds(): Round[] {
  const objs = Phaser.Utils.Array.Shuffle(['ball', 'bed', 'lamp', 'robot', 'train', 'rug']) as string[];
  const amounts = Phaser.Utils.Array.Shuffle([2, 3, 4, 5, 6, 7, 8, 9, 10]) as number[];
  return objs.map((obj, i) => ({ obj, n: amounts[i] }));
}
const PLURAL: Record<string, string> = { ball: 'balls', bed: 'beds', lamp: 'lamps', robot: 'robots', train: 'trains', rug: 'rugs' };

// Exam format: READ/LISTEN AND COUNT. Structure: "How many balls?" Vocabulary: numbers 1-10, toys, furniture.
export class CountScene extends Phaser.Scene {
  private index = 0;
  private mistakes = 0;
  private locked = false;
  private pip!: Phaser.GameObjects.Image;
  private bubbleBox?: Phaser.GameObjects.Container;
  private roundObjs: Phaser.GameObjects.GameObject[] = [];
  private keys: Phaser.GameObjects.Container[] = [];
  private hintTween?: Phaser.Tweens.Tween;
  constructor() { super('Count'); }
  private rounds: Round[] = [];
  private get round() { return this.rounds[this.index]; }

  create() {
    this.index = 0;
    this.rounds = makeRounds();
    this.cameras.main.fadeIn(180);
    homeButton(this);
    this.prog = progress(this, this.rounds.length);
    cover(this, 'bg_bedroom');
    panel(this, 24, 270, W - 48, 480);
    this.pip = fitHeight(this.add.image(100, 1260, `${hostOf('Count')}_neutral`), 200).setOrigin(0.5, 1).setDepth(3);
    this.startRound();
  }

  private prog!: { set: (n: number) => void };
  private startRound() {
    this.prog.set(this.index);
    this.roundObjs.forEach((o) => o.destroy());
    this.roundObjs = []; this.keys = []; this.mistakes = 0; this.locked = false; this.clearHint();
    this.pip.setTexture(`${hostOf('Count')}_neutral`);
    const { obj, n } = this.round;
    const q = `How many ${PLURAL[obj]}?`, qKey = slug(q);
    this.bubbleBox?.destroy();
    this.bubbleBox = bubble(this, W / 2, 150, 640, q, qKey);
    this.time.delayedCall(250, () => speak(this, qKey));

    // the things to count, in a tidy grid (5 per row)
    const per = 5, size = 110, gap = 16, rows = Math.ceil(n / per);
    const items: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / per), inRow = Math.min(per, n - row * per), col = i % per;
      const x = W / 2 - (inRow * size + (inRow - 1) * gap) / 2 + size / 2 + col * (size + gap);
      const y = 510 - ((rows - 1) * (size + gap)) / 2 + row * (size + gap);
      const im = this.add.image(x, y, `obj_${obj}`);
      im.setScale(Math.min(size / im.width, size / im.height));
      items.push(im);
    }
    popIn(this, items, 40, 45);
    this.roundObjs.push(...items);

    // number keys 1..10 in two rows
    NUMS.forEach((word, i) => {
      const row = Math.floor(i / 5), col = i % 5, tw = 118, tg = 14;
      const x = W / 2 - (5 * tw + 4 * tg) / 2 + tw / 2 + col * (tw + tg);
      const box = chip(this, x, 850 + row * 135, tw, 120, String(i + 1), 70, () => this.tapNumber(i + 1, box), 'blue');
      this.keys.push(box); this.roundObjs.push(box);
      void word;
    });
  }

  private tapNumber(value: number, box: Phaser.GameObjects.Container) {
    if (this.locked) return;
    speak(this, NUMS[value - 1]);                       // every tap teaches the number word
    if (value === this.round.n) {
      this.success(box);
    } else {
      this.mistakes++;
      this.pip.setTexture(`${hostOf('Count')}_sad`);
      this.time.delayedCall(800, () => { if (!this.locked) this.pip.setTexture(`${hostOf('Count')}_neutral`); });
      this.tweens.add({ targets: box, x: box.x + 12, duration: 50, yoyo: true, repeat: 3 });
      this.time.delayedCall(1100, () => { if (!this.locked) speak(this, 'try-again', false); });
      if (this.mistakes >= 2) this.showHint();
    }
  }

  private showHint() {
    this.clearHint();
    this.hintTween = this.tweens.add({ targets: this.keys[this.round.n - 1], scale: 1.2, duration: 380, yoyo: true, repeat: -1 });
  }

  private clearHint() {
    this.hintTween?.stop(); this.hintTween = undefined;
    this.keys.forEach((k) => k.setScale(1));
  }

  private success(box: Phaser.GameObjects.Container) {
    this.locked = true; this.clearHint();
    box.setScale(1);
    this.pip.setTexture(`${hostOf('Count')}_happy`);
    burst(this, box.x, box.y, 20);
    this.tweens.add({ targets: this.pip, y: 1200, duration: 180, yoyo: true, repeat: 1 });
    const praise = PRAISE[this.index % PRAISE.length];
    this.time.delayedCall(700, () => {
      speak(this, slug(praise));
      this.bubbleBox?.destroy();
      this.bubbleBox = bubble(this, W / 2, 150, 640, praise);
    });
    this.time.delayedCall(1700, () => {
      this.index++;
      if (this.index >= this.rounds.length) this.finish(); else this.startRound();
    });
  }

  private finish() {
    this.prog.set(this.rounds.length);
    this.roundObjs.forEach((o) => o.destroy()); this.roundObjs = [];
    this.bubbleBox?.destroy();
    this.bubbleBox = bubble(this, W / 2, 400, 640, 'Well done!', 'well-done');
    speak(this, 'well-done');
    this.pip.setTexture(`${hostOf('Count')}_happy`);
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 250, () => burst(this, 100 + Math.random() * 520, 300 + Math.random() * 500, 14));
    button(this, W / 2 - 170, 760, 300, 'Play again', () => this.scene.restart());
    button(this, W / 2 + 170, 760, 300, 'Menu', () => this.scene.start('Menu'));
    offerEgg(this, W / 2 + 40, 1000, 250);
  }
}
