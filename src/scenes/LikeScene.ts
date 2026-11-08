import Phaser from 'phaser';
import { DINOS, isOwned, type Dino } from '../content/dinos';
import { PRAISE, slug } from '../content/bedroom';
import {
  THANKS, TASTES, answer, dinoKey, narratorKey, question, sayDislike, sayDislikes, sayLike, type Toy,
} from '../content/likes';
import { offerEgg } from '../ui/reward';
import { W, bubble, burst, button, chip, cover, dinoBow, fitHeight, homeButton, panel, popIn, progress, speak } from '../ui/helpers';

type Kind = 'give' | 'give2' | 'ask';
interface Round { kind: Kind; dino: Dino; likeToy?: Toy; toy?: Toy; yes?: boolean }

const KINDS: Kind[] = ['give', 'give', 'give2', 'ask', 'ask', 'ask'];

// Exam format: LISTEN, READ AND CHOOSE. Structures: "I like / I don't like ...", "Does he / she like ...?" "Yes, he does. / No, she doesn't."
export class LikeScene extends Phaser.Scene {
  private rounds: Round[] = [];
  private index = 0;
  private mistakes = 0;
  private locked = false;
  private dinoImg!: Phaser.GameObjects.Image;
  private bubbleBox?: Phaser.GameObjects.Container;
  private roundObjs: Phaser.GameObjects.GameObject[] = [];
  private hintTween?: Phaser.Tweens.Tween;
  private hintTarget?: Phaser.GameObjects.Container | Phaser.GameObjects.Image;
  private prog!: { set: (n: number) => void };
  constructor() { super('Like'); }
  private get round() { return this.rounds[this.index]; }

  create() {
    this.index = 0;
    this.cameras.main.fadeIn(180);
    homeButton(this);
    this.prog = progress(this, KINDS.length);
    cover(this, 'bg_bedroom');
    panel(this, 24, 270, W - 48, 480);
    this.rounds = this.makeRounds();
    this.dinoImg = fitHeight(this.add.image(W / 2, 1262, 'pip_neutral'), 400).setOrigin(0.5, 1).setDepth(3);
    this.bowOn = '';
    this.startRound();
  }

  private makeRounds(): Round[] {
    const owned = DINOS.filter((d) => isOwned(d.key));
    const start = Phaser.Math.Between(0, owned.length - 1);
    const answers = Phaser.Utils.Array.Shuffle([true, false, Math.random() < 0.5]);
    let a = 0;
    return KINDS.map((kind, i) => {
      const dino = owned[(start + i) % owned.length], t = TASTES[dino.key];
      if (kind === 'ask') {
        const yes = answers[a++];
        const pool = yes ? t.likes : t.dislikes;
        return { kind, dino, yes, toy: Phaser.Utils.Array.GetRandom(pool) };
      }
      return { kind, dino, likeToy: Phaser.Utils.Array.GetRandom(t.likes) };
    });
  }

  private bowOn = '';
  private face(f: 'neutral' | 'happy' | 'sad' | 'surprised') {
    this.dinoImg.setTexture(`${this.round.dino.key}_${f}`);
    if (this.bowOn !== this.round.dino.key) { this.bowOn = this.round.dino.key; this.dinoBowFor(); }
  }
  private bowGfx?: Phaser.GameObjects.Graphics;
  private dinoBowFor() { /* the bow follows the sprite; it is re-created for each new dino */
    this.bowGfx?.destroy();
    const before = new Set(this.children.list);
    dinoBow(this, this.dinoImg, !TASTES[this.round.dino.key].he);
    this.bowGfx = this.children.list.find((c) => !before.has(c) && c instanceof Phaser.GameObjects.Graphics) as Phaser.GameObjects.Graphics | undefined;
  }

  private startRound() {
    this.prog.set(this.index);
    this.roundObjs.forEach((o) => o.destroy());
    this.roundObjs = []; this.mistakes = 0; this.locked = false; this.clearHint();
    const r = this.round, t = TASTES[r.dino.key];
    this.face('neutral');
    this.dinoImg.setX(W / 2);
    this.tweens.add({ targets: this.dinoImg, y: { from: 1290, to: 1262 }, duration: 200 });
    this.bubbleBox?.destroy();

    if (r.kind === 'ask') {
      const q = question(t.he, r.toy!), qKey = narratorKey(q);
      this.bubbleBox = bubble(this, W / 2, 150, 640, q, qKey);
      this.time.delayedCall(250, () => speak(this, qKey));
      this.drawBoard(r.dino.key);
      const yes = answer(t.he, true), no = answer(t.he, false);
      const make = (text: string, x: number, isYes: boolean) => {
        const box = chip(this, x, 880, 330, 120, text, 36, () => this.tapAnswer(isYes, text, box), isYes ? 'green' : 'blue');
        this.roundObjs.push(box);
        return box;
      };
      make(yes, W / 2 - 180, true); make(no, W / 2 + 180, false);
      return;
    }

    // give a toy: the dino says what it likes / doesn't like, the child picks the right toy
    const liked = r.likeToy!;
    const dislikes = t.dislikes;
    const text = r.kind === 'give' ? sayLike(liked) : sayDislikes(dislikes);
    const key = dinoKey(r.dino.key, text);
    this.bubbleBox = bubble(this, W / 2, 150, 640, text, key);
    this.time.delayedCall(250, () => speak(this, key));
    const toys = Phaser.Utils.Array.Shuffle([liked, ...dislikes]) as Toy[];
    const imgs = toys.map((toy, i) => {
      const im = this.add.image(140 + i * 220, 510, `obj_${toy}`).setInteractive({ useHandCursor: true });
      im.setScale(Math.min(180 / im.width, 180 / im.height)).setData('base', im.scale);
      im.on('pointerdown', () => this.tapToy(toy, im));
      if (toy === liked) this.hintTarget = im;
      return im;
    });
    popIn(this, imgs, 120, 80);
    this.roundObjs.push(...imgs);
  }

  /** "Likes board": green row = the dino smiling with the toys it likes, red row = the dino sad with the toys it doesn't. */
  private drawBoard(key: string) {
    const t = TASTES[key];
    const rows: [Toy[], boolean][] = [[t.likes, true], [t.dislikes, false]];
    rows.forEach(([toys, like], r) => {
      const y = 395 + r * 215;
      const bg = this.add.graphics();
      bg.fillStyle(like ? 0x7ed99a : 0xff9a9a, 0.4).fillRoundedRect(48, y - 92, W - 96, 184, 40);
      bg.lineStyle(6, like ? 0x37b863 : 0xe5384f, 0.8).strokeRoundedRect(48, y - 92, W - 96, 184, 40);
      const face = fitHeight(this.add.image(135, y, `${key}_${like ? 'happy' : 'sad'}`), 150);
      dinoBow(this, face, !t.he);
      this.roundObjs.push(bg, face);
      const imgs = toys.map((toy, i) => {
        const im = this.add.image(330 + i * 190, y, `obj_${toy}`);
        im.setScale(Math.min(140 / im.width, 140 / im.height));
        return im;
      });
      popIn(this, imgs, r * 150, 70);
      this.roundObjs.push(...imgs);
    });
  }

  private tapToy(toy: Toy, im: Phaser.GameObjects.Image) {
    if (this.locked) return;
    const r = this.round, t = TASTES[r.dino.key];
    if (t.likes.includes(toy)) {
      this.locked = true; this.clearHint();
      this.face('happy');
      burst(this, im.x, im.y, 20);
      this.tweens.add({ targets: im, y: 1000, scale: im.scale * 0.8, duration: 500, ease: 'Sine.in' });
      this.tweens.add({ targets: this.dinoImg, y: 1230, duration: 180, yoyo: true, repeat: 1 });
      this.time.delayedCall(500, () => speak(this, dinoKey(r.dino.key, THANKS)));
      this.time.delayedCall(2100, () => this.next());
    } else {
      this.mistakes++;
      this.face('sad');
      speak(this, dinoKey(r.dino.key, sayDislike(toy)));            // "I don't like balls."
      this.tweens.add({ targets: im, x: im.x + 12, duration: 50, yoyo: true, repeat: 3 });
      this.time.delayedCall(1900, () => { if (!this.locked) this.face('neutral'); });
      if (this.mistakes >= 2) this.showHint();
    }
  }

  private tapAnswer(isYes: boolean, text: string, box: Phaser.GameObjects.Container) {
    if (this.locked) return;
    speak(this, narratorKey(text));                                  // every tap teaches the short answer
    if (isYes === this.round.yes) {
      this.locked = true; this.clearHint();
      this.face('happy');
      burst(this, box.x, box.y, 20);
      this.tweens.add({ targets: this.dinoImg, y: 1230, duration: 180, yoyo: true, repeat: 1 });
      this.time.delayedCall(1700, () => this.next());
    } else {
      this.mistakes++;
      this.face('sad');
      this.tweens.add({ targets: box, x: box.x + 12, duration: 50, yoyo: true, repeat: 3 });
      this.time.delayedCall(1700, () => { if (!this.locked) { this.face('neutral'); speak(this, 'try-again', false); } });
      if (this.mistakes >= 2) this.showHint(this.roundObjs.filter((o) => o instanceof Phaser.GameObjects.Container)[this.round.yes ? 0 : 1] as Phaser.GameObjects.Container);
    }
  }

  private showHint(target?: Phaser.GameObjects.Container) {
    this.clearHint();
    const t = target ?? this.hintTarget;
    if (!t) return;
    this.hintTarget = t;
    const base = t.scale;
    this.hintTween = this.tweens.add({ targets: t, scale: base * 1.18, duration: 380, yoyo: true, repeat: -1 });
  }

  private clearHint() {
    this.hintTween?.stop(); this.hintTween = undefined;
    const t = this.hintTarget;
    if (t && t.active) t.setScale((t.getData('base') as number | undefined) ?? 1);
  }

  private next() {
    const praise = PRAISE[this.index % PRAISE.length];
    if (this.round.kind === 'ask') { speak(this, slug(praise)); this.bubbleBox?.destroy(); this.bubbleBox = bubble(this, W / 2, 150, 640, praise); }
    this.time.delayedCall(this.round.kind === 'ask' ? 700 : 0, () => {
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
    this.face('happy');
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 250, () => burst(this, 100 + Math.random() * 520, 300 + Math.random() * 500, 14));
    button(this, W / 2 - 170, 760, 300, 'Play again', () => this.scene.restart());
    button(this, W / 2 + 170, 760, 300, 'Menu', () => this.scene.start('Menu'));
    offerEgg(this, W / 2 + 40, 1000, 250);
  }
}

export function heartPath(c: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  c.beginPath();
  c.moveTo(cx, cy + s * 0.85);
  c.bezierCurveTo(cx - s * 1.5, cy - s * 0.1, cx - s * 0.7, cy - s * 1.1, cx, cy - s * 0.4);
  c.bezierCurveTo(cx + s * 0.7, cy - s * 1.1, cx + s * 1.5, cy - s * 0.1, cx, cy + s * 0.85);
  c.closePath();
}
