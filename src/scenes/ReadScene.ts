import Phaser from 'phaser';
import { DINOS, isOwned } from '../content/dinos';
import { PRAISE, slug } from '../content/bedroom';
import { CIRCLE, COMPLETE, circleKey, filled, filledKey, type Circle, type Complete, type Option, type DinoPic } from '../content/read';
import { offerEgg } from '../ui/reward';
import { FONT_TITLE, W, bubble, burst, button, chip, cover, fitHeight, homeButton, nameTag, panel, progress, speak } from '../ui/helpers';

type Round = { kind: 'complete'; c: Complete } | { kind: 'circle'; c: Circle };

/** Reading practice (Read) and the exam simulation (Graduation): same rounds, Graduation adds a ceremony at the end. */
export class ReadScene extends Phaser.Scene {
  protected graduation = false;
  private rounds: Round[] = [];
  private index = 0;
  private mistakes = 0;
  private firstTry = 0;
  private locked = false;
  private objs: Phaser.GameObjects.GameObject[] = [];
  private bubbleBox?: Phaser.GameObjects.Container;
  private hintTween?: Phaser.Tweens.Tween;
  private hintTarget?: Phaser.GameObjects.Container;
  private prog!: { set: (n: number) => void };
  constructor(key = 'Read') { super(key); }
  private get round() { return this.rounds[this.index]; }

  create() {
    this.index = 0; this.firstTry = 0; this.locked = false; this.objs = [];
    this.cameras.main.fadeIn(180);
    cover(this, 'bg_school');
    homeButton(this);
    this.rounds = this.pick();
    this.prog = progress(this, this.rounds.length);
    this.startRound();
  }

  private pick(): Round[] {
    const nComplete = this.graduation ? 6 : 5, nCircle = this.graduation ? 4 : 3;
    // different topics first, so one game never repeats the same grammar point
    const take = <T extends { topic: string }>(all: T[], n: number): T[] => {
      const shuffled = Phaser.Utils.Array.Shuffle([...all]);
      const out: T[] = [];
      const seen = new Map<string, number>();
      for (const x of shuffled) { const k = seen.get(x.topic) ?? 0; if (k < 1 && out.length < n) { out.push(x); seen.set(x.topic, k + 1); } }
      for (const x of shuffled) if (out.length < n && !out.includes(x)) out.push(x);
      return out;
    };
    const rs: Round[] = [
      ...take(COMPLETE, nComplete).map((c): Round => ({ kind: 'complete', c })),
      ...take(CIRCLE, nCircle).map((c): Round => ({ kind: 'circle', c })),
    ];
    return Phaser.Utils.Array.Shuffle(rs);
  }

  private clear() {
    this.objs.forEach((o) => o.destroy()); this.objs = [];
    this.clearHint();
  }

  private startRound() {
    this.prog.set(this.index);
    this.clear(); this.mistakes = 0; this.locked = false;
    this.bubbleBox?.destroy();
    const r = this.round;
    if (r.kind === 'complete') this.startComplete(r.c); else this.startCircle(r.c);
  }

  // ---- READ AND COMPLETE: a sentence with a gap, three words to choose from
  private startComplete(c: Complete) {
    this.bubbleBox = bubble(this, W / 2, 150, 660, c.text.replace('___', '_____'));
    this.drawPicture(c.dinos, c.obj ? Array(c.count ?? 1).fill(c.obj) : undefined, 520);
    const words = Phaser.Utils.Array.Shuffle([...c.options]);
    const w = 200, gap = 20, x0 = W / 2 - (3 * w + 2 * gap) / 2 + w / 2;
    words.forEach((word, i) => {
      const box = chip(this, x0 + i * (w + gap), 960, w, 120, word, word.length > 6 ? 36 : 46, () => this.tapWord(word, c, box), 'blue');
      this.objs.push(box);
    });
  }

  private tapWord(word: string, c: Complete, box: Phaser.GameObjects.Container) {
    if (this.locked) return;
    if (word === c.answer) {
      this.locked = true; this.clearHint();
      if (this.mistakes === 0) this.firstTry++;
      burst(this, box.x, box.y, 20);
      const full = filled(c);
      this.bubbleBox?.destroy();
      this.bubbleBox = bubble(this, W / 2, 150, 660, full, filledKey(c));
      speak(this, filledKey(c));                                  // the full, correct sentence: the child hears it once solved
      this.time.delayedCall(2600, () => this.next());
    } else {
      this.wrong(box, () => c.options.indexOf(c.answer));
    }
  }

  // ---- READ AND CIRCLE: a sentence (also spoken) and three pictures
  private startCircle(c: Circle) {
    const key = circleKey(c);
    this.bubbleBox = bubble(this, W / 2, 150, 660, c.text, key);
    this.time.delayedCall(250, () => speak(this, key));
    c.options.forEach((opt, i) => {
      const card = this.add.container(W / 2, 410 + i * 270).setDepth(10);
      card.add(panel(this, -320, -120, 640, 240));
      this.drawOption(card, opt);
      const hit = this.add.rectangle(0, 0, 640, 240, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      card.add(hit);
      hit.on('pointerdown', () => this.tapCard(i, c, card));
      card.setScale(0.7).setAlpha(0);
      this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 220, delay: i * 70, ease: 'Back.out' });
      this.objs.push(card);
    });
  }

  private tapCard(i: number, c: Circle, card: Phaser.GameObjects.Container) {
    if (this.locked) return;
    if (i === c.answer) {
      this.locked = true; this.clearHint();
      if (this.mistakes === 0) this.firstTry++;
      burst(this, card.x, card.y, 24);
      const ring = this.add.circle(card.x, card.y, 8).setStrokeStyle(10, 0x37b863).setDepth(50);   // the "circle" of the exam
      this.tweens.add({ targets: ring, radius: 230, duration: 380, ease: 'Sine.out' });
      this.objs.push(ring);
      this.time.delayedCall(900, () => { speak(this, slug(PRAISE[this.index % PRAISE.length])); });
      this.time.delayedCall(1900, () => this.next());
    } else {
      this.wrong(card, () => c.answer, true);
    }
  }

  /** Picture content shared by "complete" (above the words) and "circle" (inside a card). */
  private drawPicture(dinos: DinoPic[] | undefined, objs: string[] | undefined, y: number) {
    if (dinos) {
      dinos.forEach(([key, face], i) => {
        const x = W / 2 + (i - (dinos.length - 1) / 2) * 280;
        const im = this.add.image(x, y + 150, `${key}_${isOwnedFace(key, face)}`).setOrigin(0.5, 1).setDepth(5);
        im.setScale(Math.min(330 / im.height, 300 / im.width));
        this.objs.push(im, nameTag(this, x, y + 182, dinoName(key)));
      });
    }
    if (objs) {
      const n = objs.length, size = Math.min(150, 560 / n), perRow = Math.min(n, 5);
      objs.forEach((o, i) => {
        const row = Math.floor(i / perRow), inRow = Math.min(perRow, n - row * perRow), col = i % perRow;
        const x = W / 2 + (col - (inRow - 1) / 2) * (size + 14), yy = y + 90 + row * (size + 10);
        const im = this.add.image(x, yy, o).setDepth(5);
        im.setScale(Math.min(size / im.width, size / im.height));
        this.objs.push(im);
      });
    }
  }

  private drawOption(card: Phaser.GameObjects.Container, opt: Option) {
    const dinos = opt.dinos ?? [], objs = opt.objs ?? [];
    const both = dinos.length > 0 && objs.length > 0, badge = !!opt.badge;
    const dx = both || badge ? -120 : 0, gap = dinos.length > 1 ? 210 : 0;
    dinos.forEach(([key, face], i) => {
      const x = dx + (i - (dinos.length - 1) / 2) * gap;
      const im = this.add.image(x, 78, `${key}_${isOwnedFace(key, face)}`).setOrigin(0.5, 1);
      im.setScale(Math.min(190 / im.height, 200 / im.width));
      card.add(im);
      nameTag(this, x, 100, dinoName(key), card);
    });
    const size = both ? 100 : Math.min(150, 560 / Math.max(1, objs.length));
    objs.forEach((o, i) => {
      const x = both ? 190 + (i - (objs.length - 1) / 2) * (size + 8) : (i - (objs.length - 1) / 2) * (size + 12);
      const im = this.add.image(x, 0, o);
      im.setScale(Math.min(size / im.width, size / im.height));
      card.add(im);
    });
    if (opt.badge) {
      card.add(this.add.circle(215, 0, 62, 0xffffff).setStrokeStyle(8, 0xff9a2e));
      card.add(this.add.text(215, 0, opt.badge, { fontFamily: FONT_TITLE, fontSize: '78px', fontStyle: 'bold', color: '#5a3200' }).setOrigin(0.5));
    }
  }

  // ---- shared
  private wrong(target: Phaser.GameObjects.Container, correct: () => number, isCard = false) {
    this.mistakes++;
    this.tweens.add({ targets: target, x: target.x + 12, duration: 50, yoyo: true, repeat: 3 });
    speak(this, 'try-again', false);
    if (this.mistakes >= 2) {
      const list = this.objs.filter((o) => o instanceof Phaser.GameObjects.Container) as Phaser.GameObjects.Container[];
      const t = list[correct()];
      if (t) { this.clearHint(); this.hintTarget = t; this.hintTween = this.tweens.add({ targets: t, scale: (isCard ? 1 : 1) * 1.12, duration: 380, yoyo: true, repeat: -1 }); }
    }
  }

  private clearHint() {
    this.hintTween?.stop(); this.hintTween = undefined;
    this.hintTarget?.setScale(1); this.hintTarget = undefined;
  }

  private next() {
    this.index++;
    if (this.index >= this.rounds.length) this.finish(); else this.startRound();
  }

  protected stars(): number {
    const f = this.firstTry / this.rounds.length;
    return f >= 0.85 ? 3 : f >= 0.55 ? 2 : 1;        // never zero: nobody is punished
  }

  protected finish() {
    this.prog.set(this.rounds.length);
    this.clear(); this.bubbleBox?.destroy();
    if (this.graduation) { this.ceremony(); return; }
    this.bubbleBox = bubble(this, W / 2, 400, 640, 'Well done!', 'well-done');
    speak(this, 'well-done');
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 250, () => burst(this, 100 + Math.random() * 520, 300 + Math.random() * 500, 14));
    button(this, W / 2 - 170, 760, 300, 'Play again', () => this.scene.restart());
    button(this, W / 2 + 170, 760, 300, 'Menu', () => this.scene.start('Menu'));
    offerEgg(this, W / 2, 1020, 250);
  }

  protected ceremony() { /* overridden by GraduationScene */ }
}

const dinoName = (key: string): string => DINOS.find((d) => d.key === key)?.name ?? key;

/** Faces exist for every dino; keep a safe fallback so a typo in the bank never shows a missing texture. */
function isOwnedFace(key: string, face: string): string {
  return DINOS.some((d) => d.key === key) ? face : 'happy';
}
void fitHeight; void isOwned;
