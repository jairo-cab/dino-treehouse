import Phaser from 'phaser';
import { PRAISE, slug } from '../content/bedroom';
import { CLUES, MEMBERS, info, key, type Member } from '../content/family';
import { offerEgg } from '../ui/reward';
import { W, bubble, burst, button, cover, homeButton, panel, progress, speak } from '../ui/helpers';

type Round =
  | { kind: 'where'; answer: Member; options: Member[] }
  | { kind: 'clue'; text: string; answer: Member; options: Member[] }
  | { kind: 'match'; members: Member[] };

const shuffle = <T,>(a: T[]): T[] => Phaser.Utils.Array.Shuffle([...a]) as T[];

/** The family comes to visit: listen and tap (family words), find who a clue describes (he / she), and READ AND MATCH. */
export class FamilyScene extends Phaser.Scene {
  private rounds: Round[] = [];
  private index = 0;
  private mistakes = 0;
  private locked = false;
  private objs: Phaser.GameObjects.GameObject[] = [];
  private bubbleBox?: Phaser.GameObjects.Container;
  private hintTween?: Phaser.Tweens.Tween;
  private hintTarget?: Phaser.GameObjects.Container;
  private prog!: { set: (n: number) => void };
  // match round
  private cards = new Map<Member, Phaser.GameObjects.Container>();
  private chips = new Map<Member, Phaser.GameObjects.Container>();
  private done = new Set<Member>();
  private selected?: Member;
  constructor() { super('Family'); }

  create() {
    this.index = 0; this.objs = []; this.locked = false;
    this.cameras.main.fadeIn(180);
    cover(this, 'bg_bedroom');
    homeButton(this);
    this.rounds = this.makeRounds();
    this.prog = progress(this, this.rounds.length);
    this.startRound();
  }

  private makeRounds(): Round[] {
    const three = (answer: Member, others?: Member[]): Member[] =>
      shuffle([answer, ...(others ?? shuffle(MEMBERS.filter((m) => m !== answer)).slice(0, 2))]);
    const where = shuffle(MEMBERS).slice(0, 4).map((answer): Round => ({ kind: 'where', answer, options: three(answer) }));
    const clues = shuffle(CLUES).slice(0, 2).map((c): Round => ({ kind: 'clue', text: c.text, answer: c.answer, options: three(c.answer, c.others) }));
    const match = [0, 1].map((): Round => ({ kind: 'match', members: shuffle(MEMBERS).slice(0, 3) }));
    return shuffle([...where, ...clues, ...match]);
  }

  private clear() {
    this.objs.forEach((o) => o.destroy()); this.objs = [];
    this.cards.clear(); this.chips.clear(); this.done.clear(); this.selected = undefined;
    this.clearHint();
  }

  private startRound() {
    this.prog.set(this.index);
    this.clear(); this.mistakes = 0; this.locked = false;
    this.bubbleBox?.destroy();
    const r = this.rounds[this.index];
    if (r.kind === 'match') { this.startMatch(r.members); return; }
    const text = r.kind === 'where' ? info(r.answer).where : r.text, k = key(text);
    this.bubbleBox = bubble(this, W / 2, 150, 660, text, k);
    this.time.delayedCall(250, () => speak(this, k));
    r.options.forEach((m, i) => {
      const card = this.portrait(W / 2, 420 + i * 280, m, 620, 260, () => this.tapOption(m, r.answer, card, r.kind));
      card.setScale(0.7).setAlpha(0);
      this.tweens.add({ targets: card, scale: 1, alpha: 1, duration: 220, delay: i * 70, ease: 'Back.out' });
      this.objs.push(card);
    });
  }

  /** A framed portrait that can be tapped. */
  private portrait(x: number, y: number, m: Member, w: number, h: number, onTap: () => void): Phaser.GameObjects.Container {
    const card = this.add.container(x, y).setDepth(10);
    card.add(panel(this, -w / 2, -h / 2, w, h));
    const im = this.add.image(0, 0, `obj_${m}`);
    im.setScale(Math.min((w - 24) / im.width, (h - 40) / im.height));
    card.add(im);
    const hit = this.add.rectangle(0, 0, w, h, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', onTap);
    card.add(hit);
    return card;
  }

  // ---- listen and tap / clues
  private tapOption(m: Member, answer: Member, card: Phaser.GameObjects.Container, kind: 'where' | 'clue') {
    if (this.locked) return;
    speak(this, key(info(m).word));                                 // every tap teaches the word
    if (m === answer) {
      this.locked = true; this.clearHint();
      burst(this, card.x, card.y, 24);
      const line = info(answer).line;
      this.time.delayedCall(900, () => {
        this.bubbleBox?.destroy();
        this.bubbleBox = bubble(this, W / 2, 150, 660, line, key(line));
        speak(this, key(line));                                    // "She's my grandma."
      });
      this.time.delayedCall(kind === 'where' ? 2900 : 3100, () => this.next());
    } else {
      this.mistakes++;
      this.tweens.add({ targets: card, x: card.x + 12, duration: 50, yoyo: true, repeat: 3 });
      this.time.delayedCall(1100, () => { if (!this.locked) speak(this, 'try-again', false); });
      if (this.mistakes >= 2) {
        const r = this.rounds[this.index];
        if (r.kind !== 'match') this.hint(this.objs.filter((o) => o instanceof Phaser.GameObjects.Container)[r.options.indexOf(r.answer)] as Phaser.GameObjects.Container);
      }
    }
  }

  // ---- read and match: tap a sentence, then the person it describes
  private startMatch(members: Member[]) {
    this.bubbleBox = bubble(this, W / 2, 150, 660, 'Read and match.', 'read-and-match');
    this.time.delayedCall(250, () => speak(this, 'read-and-match'));
    const cw = 205, gap = 20, x0 = W / 2 - (3 * cw + 2 * gap) / 2 + cw / 2;
    shuffle(members).forEach((m, i) => {
      const card = this.portrait(x0 + i * (cw + gap), 480, m, cw, 340, () => this.tapPortrait(m));
      this.cards.set(m, card); this.objs.push(card);
    });
    shuffle(members).forEach((m, i) => {
      const line = info(m).line;
      const c = this.add.container(W / 2, 800 + i * 130).setDepth(10);
      const bg = this.add.graphics();
      const draw = (sel: boolean, ok: boolean) => {
        bg.clear();
        bg.fillStyle(ok ? 0x9be8ae : 0xffffff, 0.95).fillRoundedRect(-300, -48, 600, 96, 48);
        bg.lineStyle(sel ? 10 : 5, ok ? 0x37b863 : sel ? 0xff9a2e : 0xd3c9b8, 1).strokeRoundedRect(-300, -48, 600, 96, 48);
      };
      draw(false, false);
      const t = this.add.text(0, 0, line, { fontFamily: 'Andika, sans-serif', fontSize: '40px', color: '#2f2a24' }).setOrigin(0.5);
      const hit = this.add.rectangle(0, 0, 600, 96, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.tapSentence(m));
      c.add([bg, t, hit]);
      c.setData('draw', draw);
      this.chips.set(m, c); this.objs.push(c);
    });
  }

  private tapSentence(m: Member) {
    if (this.locked || this.done.has(m)) return;
    speak(this, key(info(m).line));
    this.selected = m;
    this.chips.forEach((c, k) => (c.getData('draw') as (s: boolean, o: boolean) => void)(k === m, this.done.has(k)));
  }

  private tapPortrait(m: Member) {
    if (this.locked || this.done.has(m)) return;
    const card = this.cards.get(m)!;
    if (!this.selected) { this.tweens.add({ targets: card, scale: 1.05, duration: 90, yoyo: true }); return; }
    if (this.selected === m) {
      this.done.add(m);
      const chip = this.chips.get(m)!;
      (chip.getData('draw') as (s: boolean, o: boolean) => void)(false, true);
      burst(this, card.x, card.y, 18);
      this.add.rectangle(card.x, card.y, 205, 340).setStrokeStyle(10, 0x37b863).setDepth(11).setData('keep', true);
      this.selected = undefined;
      if (this.done.size === 3) {
        this.locked = true;
        this.time.delayedCall(900, () => speak(this, slug(PRAISE[this.index % PRAISE.length])));
        this.time.delayedCall(1900, () => this.next());
      }
    } else {
      this.mistakes++;
      const chip = this.chips.get(this.selected)!;
      this.tweens.add({ targets: chip, x: chip.x + 12, duration: 50, yoyo: true, repeat: 3 });
      this.tweens.add({ targets: card, x: card.x + 12, duration: 50, yoyo: true, repeat: 3 });
      speak(this, 'try-again', false);
      if (this.mistakes >= 2) this.hint(this.cards.get(this.selected)!);
    }
  }

  private hint(t?: Phaser.GameObjects.Container) {
    this.clearHint();
    if (!t) return;
    this.hintTarget = t;
    this.hintTween = this.tweens.add({ targets: t, scale: 1.1, duration: 380, yoyo: true, repeat: -1 });
  }

  private clearHint() {
    this.hintTween?.stop(); this.hintTween = undefined;
    this.hintTarget?.setScale(1); this.hintTarget = undefined;
  }

  private next() {
    // the green frames of a finished match round are loose rectangles: remove them with the round
    this.children.list.filter((c) => c.getData && c.getData('keep')).forEach((c) => c.destroy());
    this.index++;
    if (this.index >= this.rounds.length) this.finish(); else this.startRound();
  }

  private finish() {
    this.prog.set(this.rounds.length);
    this.clear(); this.bubbleBox?.destroy();
    this.bubbleBox = bubble(this, W / 2, 400, 640, 'Well done!', 'well-done');
    speak(this, 'well-done');
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 250, () => burst(this, 100 + Math.random() * 520, 300 + Math.random() * 500, 14));
    button(this, W / 2 - 170, 760, 300, 'Play again', () => this.scene.restart());
    button(this, W / 2 + 170, 760, 300, 'Menu', () => this.scene.start('Menu'));
    offerEgg(this, W / 2, 1020, 250);
  }
}
