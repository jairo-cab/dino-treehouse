import Phaser from 'phaser';
import { DINOS, isOwned, type Dino } from '../content/dinos';
import { PRAISE, slug } from '../content/bedroom';
import { ITEMS, commandKey, commandText, nameKey, type Command, type Item } from '../content/school';
import { offerEgg } from '../ui/reward';
import { W, bubble, burst, button, cover, homeButton, panel, progress, shadow, speak } from '../ui/helpers';

const DESK = new Phaser.Geom.Rectangle(30, 690, 660, 250);
const SEATED_Y = 885, STANDING_Y = 790;
const SLOTS = [330, 460, 590];            // where taken-out things rest on the desk
const SLOT_Y = 830;
const BAG = { x: 105, y: 1105 };
const TRAY_X = [300, 450, 600], TRAY_Y = 1105;

type Obj = Phaser.GameObjects.Image;

// Exam format: LISTENING, classroom instructions (Stand up / Sit down / Open - Close your book / Take out - Put away your ...).
// The child DOES what the voice says: tap the dino, tap the book, drag things out of / back into the schoolbag.
export class SchoolScene extends Phaser.Scene {
  private cmds: Command[] = [];
  private index = 0;
  private mistakes = 0;
  private locked = false;
  private dino!: Dino;
  private dinoImg!: Obj;
  private book!: Obj;
  private bag!: Obj;
  private bookOpen = false;
  private bubbleBox?: Phaser.GameObjects.Container;
  private onDesk = new Map<Item, Obj>();
  private candidates: Obj[] = [];
  private hintTween?: Phaser.Tweens.Tween;
  private hintTarget?: Obj;
  private prog!: { set: (n: number) => void };
  constructor() { super('School'); }
  private get cmd() { return this.cmds[this.index]; }

  create() {
    this.index = 0; this.bookOpen = false; this.onDesk = new Map(); this.candidates = []; this.locked = false;
    this.cameras.main.fadeIn(180);
    cover(this, 'bg_school');
    homeButton(this);
    this.cmds = this.makeCommands();
    this.prog = progress(this, this.cmds.length);

    const owned = DINOS.filter((d) => isOwned(d.key));
    this.dino = Phaser.Utils.Array.GetRandom(owned);
    this.dinoImg = this.add.image(W / 2, SEATED_Y, `${this.dino.key}_neutral`).setOrigin(0.5, 1).setDepth(5);
    this.dinoImg.setScale(Math.min(420 / this.dinoImg.height, 460 / this.dinoImg.width));
    this.dinoImg.setInteractive({ useHandCursor: true });
    this.dinoImg.on('pointerdown', () => this.tapDino());

    // the desk (drawn once): wooden top + front, in front of the seated dino
    const g = this.add.graphics().setDepth(6);
    g.fillStyle(0x000000, 0.12).fillRoundedRect(DESK.x + 6, DESK.y + 14, DESK.width, DESK.height, 34);
    g.fillStyle(0xd08a4e, 1).fillRoundedRect(DESK.x, DESK.y, DESK.width, DESK.height, 34);
    g.fillStyle(0xf1bd82, 1).fillRoundedRect(DESK.x, DESK.y, DESK.width, 70, { tl: 34, tr: 34, bl: 14, br: 14 });
    g.lineStyle(7, 0x7a4b12, 0.9).strokeRoundedRect(DESK.x, DESK.y, DESK.width, DESK.height, 34);

    this.book = this.add.image(150, 812, 'obj_book_closed').setDepth(7);
    this.setBookTexture(false);
    this.book.setInteractive({ useHandCursor: true });
    this.book.on('pointerdown', () => this.tapBook());

    // tray with the schoolbag
    panel(this, 12, 1000, W - 24, 215).setDepth(4);
    shadow(this, BAG.x, BAG.y + 78, 190, 0.35).setDepth(6);
    this.bag = this.add.image(BAG.x, BAG.y, 'obj_schoolbag').setDepth(7);
    this.bag.setScale(190 / this.bag.width);
    this.bag.setInteractive({ useHandCursor: true });
    this.bag.on('pointerdown', () => { speak(this, nameKey('schoolbag')); this.tweens.add({ targets: this.bag, scale: this.bag.scale * 1.08, duration: 90, yoyo: true }); });

    // dragging (shared by every item)
    this.input.on('dragstart', (_p: unknown, o: Obj) => {
      if (this.locked) return;
      this.tweens.killTweensOf(o); o.setDepth(100);
      this.tweens.add({ targets: o, scale: o.getData('home').scale * 1.15, duration: 100 });
    });
    this.input.on('drag', (_p: unknown, o: Obj, x: number, y: number) => { if (!this.locked) o.setPosition(x, y); });
    this.input.on('dragend', (_p: unknown, o: Obj) => this.drop(o));

    this.startRound();
  }

  /** A different lesson every time: the three blocks (stand/sit, open/close, the pencil-case work) come in random order and the
   *  take out / put away part follows one of three patterns. Orders that are impossible (sit before stand, close before open) never happen. */
  private makeCommands(): Command[] {
    const p = () => Math.random() < 0.5;
    const three = Phaser.Utils.Array.Shuffle([...ITEMS]).slice(0, 3) as Item[];
    const [a, b, c] = three;
    const take = (item: Item): Command => ({ kind: 'take', item, please: p() });
    const put = (item: Item): Command => ({ kind: 'put', item, please: p() });
    const pattern = Phaser.Math.Between(0, 2);
    const tidy: Command[] =
      pattern === 0 ? [take(a), take(b), take(c), ...(Phaser.Utils.Array.Shuffle([a, b, c]) as Item[]).map(put)]
      : pattern === 1 ? (() => { const first = p() ? a : b, second = first === a ? b : a; return [take(a), take(b), put(first), take(c), put(second), put(c)]; })()
      : [take(a), put(a), take(b), put(b), take(c), put(c)];
    const blocks: Command[][] = [
      [{ kind: 'stand', please: false }, { kind: 'sit', please: false }],
      [{ kind: 'open', please: p() }, { kind: 'close', please: p() }],
      tidy,
    ];
    return (Phaser.Utils.Array.Shuffle(blocks) as Command[][]).flat();
  }

  private setBookTexture(open: boolean) {
    this.bookOpen = open;
    this.book.setTexture(open ? 'obj_book_open' : 'obj_book_closed');
    this.book.setScale((open ? 215 : 160) / this.book.width);
    this.book.setData('home', { scale: this.book.scale });
  }

  private face(f: 'neutral' | 'happy' | 'sad' | 'surprised') { this.dinoImg.setTexture(`${this.dino.key}_${f}`); }

  /** An item the child can drag. Size is set from its longest side so long things (ruler, pen) fit. */
  private makeItem(item: Item, x: number, y: number, depth: number): Obj {
    const o = this.add.image(x, y, `obj_${item}`).setDepth(depth);
    o.setScale(150 / Math.max(o.width, o.height * 1.5));
    o.setData('item', item).setData('home', { x, y, scale: o.scale });
    o.setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(o);
    o.on('pointerdown', () => speak(this, nameKey(o.getData('item') === 'pencil_case' ? 'pencil case' : o.getData('item'))));
    return o;
  }

  private startRound() {
    this.prog.set(this.index);
    this.mistakes = 0; this.locked = false; this.clearHint();
    this.candidates.forEach((c) => c.destroy()); this.candidates = [];
    this.face('neutral');
    const c = this.cmd, text = commandText(c), key = commandKey(c);
    this.bubbleBox?.destroy();
    this.bubbleBox = bubble(this, W / 2, 150, 650, text, key);
    this.time.delayedCall(250, () => speak(this, key));

    if (c.kind === 'take') {
      // the thing to take out + two others, waiting in the tray next to the bag
      const others = Phaser.Utils.Array.Shuffle(ITEMS.filter((i) => i !== c.item && !this.onDesk.has(i))).slice(0, 2);
      const order = Phaser.Utils.Array.Shuffle([c.item!, ...others]) as Item[];
      order.forEach((item, i) => {
        const o = this.makeItem(item, TRAY_X[i], TRAY_Y, 10);
        this.candidates.push(o);
        o.setScale(0.01);
        this.tweens.add({ targets: o, scale: o.getData('home').scale, duration: 220, delay: 80 + i * 70, ease: 'Back.out' });
      });
    }
    // things already on the desk can only be dragged in the "put away" rounds
    this.onDesk.forEach((o) => { o.input!.draggable = c.kind === 'put'; });
  }

  // ---- taps
  private tapDino() {
    if (this.locked) return;
    const k = this.cmd.kind;
    if (k === 'stand' || k === 'sit') { this.success(); return; }
    if (k === 'open' || k === 'close') { this.wrong(this.dinoImg, false); return; }
    this.tweens.add({ targets: this.dinoImg, y: this.dinoImg.y - 14, duration: 110, yoyo: true });   // just a playful hop
  }

  private tapBook() {
    speak(this, nameKey('book'));
    if (this.locked) return;
    const k = this.cmd.kind;
    if ((k === 'open' && !this.bookOpen) || (k === 'close' && this.bookOpen)) { this.success(); return; }
    if (k === 'stand' || k === 'sit') this.wrong(this.book, false);
    else this.tweens.add({ targets: this.book, scale: this.book.scale * 1.08, duration: 90, yoyo: true });
  }

  // ---- drops
  private drop(o: Obj) {
    if (this.locked) return;
    const item = o.getData('item') as Item, c = this.cmd;
    if (c.kind === 'take' && this.candidates.includes(o)) {
      if (!DESK.contains(o.x, o.y)) { this.sendHome(o); return; }          // not on the desk: nothing happens
      if (item === c.item) this.success(o); else this.wrong(o, true);
    } else if (c.kind === 'put' && this.onDesk.get(item) === o) {
      if (Phaser.Math.Distance.Between(o.x, o.y, BAG.x, BAG.y) > 150) { this.sendHome(o); return; }
      if (item === c.item) this.success(o); else this.wrong(o, true);
    } else {
      this.sendHome(o);
    }
  }

  private sendHome(o: Obj) {
    const h = o.getData('home');
    this.tweens.add({ targets: o, x: h.x, y: h.y, scale: h.scale, duration: 320, ease: 'Back.out', onComplete: () => o.setDepth(o.getData('depth') ?? 10) });
  }

  private wrong(o: Obj, isItem: boolean) {
    this.mistakes++;
    this.face(isItem ? 'surprised' : 'sad');
    this.tweens.add({ targets: this.dinoImg, angle: { from: -3, to: 3 }, duration: 80, yoyo: true, repeat: 3, onComplete: () => { this.dinoImg.angle = 0; } });
    this.time.delayedCall(900, () => { if (!this.locked) this.face('neutral'); });
    speak(this, 'try-again', false);
    if (isItem) this.sendHome(o);
    if (this.mistakes >= 2) this.showHint();
  }

  private hintObject(): Obj | undefined {
    const c = this.cmd;
    if (c.kind === 'stand' || c.kind === 'sit') return this.dinoImg;
    if (c.kind === 'open' || c.kind === 'close') return this.book;
    if (c.kind === 'take') return this.candidates.find((x) => x.getData('item') === c.item);
    return this.onDesk.get(c.item!);
  }

  private showHint() {
    this.clearHint();
    const t = this.hintObject();
    if (!t) return;
    this.hintTarget = t;
    this.hintTween = this.tweens.add({ targets: t, scale: t.scale * 1.15, duration: 380, yoyo: true, repeat: -1 });
  }

  private clearHint() {
    this.hintTween?.stop(); this.hintTween = undefined;
    const t = this.hintTarget;
    if (t && t.active) {
      if (t === this.dinoImg) t.setScale(Math.min(420 / t.height, 460 / t.width));
      else if (t.getData('home')) t.setScale(t.getData('home').scale);
    }
    this.hintTarget = undefined;
  }

  // ---- success
  private success(o?: Obj) {
    this.locked = true; this.clearHint();
    const c = this.cmd;
    this.face('happy');
    burst(this, W / 2, 600, 20);
    if (c.kind === 'stand') this.tweens.add({ targets: this.dinoImg, y: STANDING_Y, duration: 260, ease: 'Back.out' });
    if (c.kind === 'sit') this.tweens.add({ targets: this.dinoImg, y: SEATED_Y, duration: 260, ease: 'Quad.out' });
    if (c.kind === 'open' || c.kind === 'close') {
      this.tweens.add({ targets: this.book, scaleY: 0.1, duration: 90, yoyo: true, onYoyo: () => this.setBookTexture(c.kind === 'open'),
        onComplete: () => this.book.setScale(this.book.getData('home').scale) });
    }
    if (c.kind === 'take' && o) {
      const slot = this.onDesk.size;
      this.candidates = this.candidates.filter((x) => x !== o);
      this.candidates.forEach((x) => this.tweens.add({ targets: x, alpha: 0, scale: 0.01, duration: 200 }));
      const hx = SLOTS[slot], hy = SLOT_Y, sc = o.getData('home').scale * 0.95;
      o.setData('home', { x: hx, y: hy, scale: sc }).setData('depth', 7);
      this.tweens.add({ targets: o, x: hx, y: hy, scale: sc, duration: 240, ease: 'Back.out', onComplete: () => o.setDepth(7) });
      this.onDesk.set(c.item!, o);
      o.input!.draggable = false;
    }
    if (c.kind === 'put' && o) {
      this.onDesk.delete(c.item!);
      this.tweens.add({ targets: o, x: BAG.x, y: BAG.y - 10, scale: 0.05, alpha: 0, duration: 300, ease: 'Sine.in', onComplete: () => o.destroy() });
      this.tweens.add({ targets: this.bag, scale: this.bag.scale * 1.12, duration: 120, yoyo: true, delay: 220 });
      // what is left on the desk slides to the left so there are never gaps
      [...this.onDesk.values()].forEach((x, i) => {
        x.setData('home', { x: SLOTS[i], y: SLOT_Y, scale: x.getData('home').scale });
        this.tweens.add({ targets: x, x: SLOTS[i], duration: 250, delay: 250 });
      });
    }
    const praise = PRAISE[this.index % PRAISE.length];
    this.time.delayedCall(700, () => {
      speak(this, slug(praise));
      this.bubbleBox?.destroy();
      this.bubbleBox = bubble(this, W / 2, 150, 650, praise);
    });
    this.time.delayedCall(1800, () => {
      this.index++;
      if (this.index >= this.cmds.length) this.finish(); else this.startRound();
    });
  }

  private finish() {
    this.prog.set(this.cmds.length);
    this.candidates.forEach((c) => c.destroy());
    this.bubbleBox?.destroy();
    this.bubbleBox = bubble(this, W / 2, 400, 640, 'Well done!', 'well-done');
    speak(this, 'well-done');
    this.face('happy');
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 250, () => burst(this, 100 + Math.random() * 520, 300 + Math.random() * 500, 14));
    button(this, W / 2 - 170, 1010, 300, 'Play again', () => this.scene.restart());
    button(this, W / 2 + 170, 1010, 300, 'Menu', () => this.scene.start('Menu'));
    offerEgg(this, W / 2, 1140, 150);
  }
}
