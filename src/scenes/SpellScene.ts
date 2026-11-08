import Phaser from 'phaser';
import { hostOf } from '../content/dinos';
import { offerEgg } from '../ui/reward';
import { PRAISE, slug } from '../content/bedroom';
import { H, W, bubble, burst, button, chip, cover, makeSlot, setSlotFilled, fitHeight, FONT_TITLE, panel, speak , homeButton, progress, speakerButton } from '../ui/helpers';

const WORDS = ['ball', 'bed', 'lamp', 'rug', 'robot', 'train'];
const DISTRACTORS = 'aeioustmnrlpdb';
const SLOT_Y = 880;
const TILE_Y = 1040;

// Exam format: DICTATION / LISTEN AND WRITE. The child hears a word, sees the picture and builds the word with letter tiles.
export class SpellScene extends Phaser.Scene {
  private index = 0;
  private filled = 0;
  private mistakes = 0;
  private locked = false;
  private pip!: Phaser.GameObjects.Image;
  private bubbleBox?: Phaser.GameObjects.Container;
  private roundObjs: Phaser.GameObjects.GameObject[] = [];
  private tiles: { box: Phaser.GameObjects.Container; letter: string; used: boolean }[] = [];
  private slots: { box: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text }[] = [];
  private hintTween?: Phaser.Tweens.Tween;
  constructor() { super('Spell'); }
  private get word() { return WORDS[this.index]; }

  create() {
    this.index = 0;
    this.cameras.main.fadeIn(180);
    homeButton(this);
    this.prog = progress(this, WORDS.length);
    cover(this, 'bg_bedroom');
    panel(this, 24, 270, W - 48, 480);
    this.pip = fitHeight(this.add.image(100, 1260, `${hostOf('Spell')}_neutral`), 200).setOrigin(0.5, 1).setDepth(3);
    this.startRound();
  }

  private prog!: { set: (n: number) => void };
  private startRound() {
    this.prog.set(this.index);
    this.roundObjs.forEach((o) => o.destroy());
    this.roundObjs = []; this.tiles = []; this.slots = [];
    this.filled = 0; this.mistakes = 0; this.locked = false; this.clearHint();
    this.pip.setTexture(`${hostOf('Spell')}_neutral`);
    this.bubbleBox?.destroy();
    this.bubbleBox = bubble(this, W / 2, 150, 640, 'Listen and write.', 'listen-and-write');
    this.time.delayedCall(250, () => speak(this, 'listen-and-write'));
    this.time.delayedCall(2700, () => { if (!this.locked) speak(this, this.word, false); });

    const pic = fitHeight(this.add.image(W / 2, 470, `obj_${this.word}`), 280);
    if (pic.displayWidth > 420) pic.setScale(420 / pic.width);
    // big speaker: hear the word again
    const sb = speakerButton(this, W - 110, 340, 54, () => speak(this, this.word));
    this.roundObjs.push(pic, sb);

    const n = this.word.length, sw = 96, gap = 14;
    const x0 = W / 2 - (n * sw + (n - 1) * gap) / 2 + sw / 2;
    for (let i = 0; i < n; i++) {
      const box = makeSlot(this, x0 + i * (sw + gap), SLOT_Y, sw, 110);
      const text = this.add.text(box.x, SLOT_Y, '', { fontFamily: FONT_TITLE, fontSize: '72px', fontStyle: 'bold', color: '#3b2a14' }).setOrigin(0.5);
      this.slots.push({ box, text }); this.roundObjs.push(box, text);
    }

    // letter tiles: the word's letters + 2 distractors, shuffled
    const extra = Phaser.Utils.Array.Shuffle(DISTRACTORS.split('').filter((c) => !this.word.includes(c))).slice(0, 2);
    const letters = Phaser.Utils.Array.Shuffle([...this.word.split(''), ...extra]);
    const tw = 88, tg = 10, per = 4;
    letters.forEach((ch, i) => {
      const row = Math.floor(i / per), inRow = Math.min(per, letters.length - row * per), col = i % per;
      const rx = W / 2 - (inRow * tw + (inRow - 1) * tg) / 2 + tw / 2 + col * (tw + tg);
      const tile = { box: undefined as unknown as Phaser.GameObjects.Container, letter: ch, used: false };
      tile.box = chip(this, rx, TILE_Y + row * 120, tw, 100, ch, 64, () => this.tapTile(tile), 'white');
      this.tiles.push(tile); this.roundObjs.push(tile.box);
    });
    this.roundObjs.forEach((o) => { (o as unknown as Phaser.GameObjects.Image).setAlpha(0); this.tweens.add({ targets: o, alpha: 1, duration: 150 }); });
  }

  private tapTile(tile: { box: Phaser.GameObjects.Container; letter: string; used: boolean }) {
    if (this.locked || tile.used) return;
    if (tile.letter === this.word[this.filled]) {
      tile.used = true; this.clearHint(); this.mistakes = 0;
      tile.box.setAlpha(0.25);
      const slot = this.slots[this.filled++];
      slot.text.setText(tile.letter);
      setSlotFilled(this, slot.box, 96, 110);
      this.tweens.add({ targets: slot.text, scale: { from: 1.5, to: 1 }, duration: 200, ease: 'Back.out' });
      if (this.filled === this.word.length) this.success();
    } else {
      this.mistakes++;
      this.pip.setTexture(`${hostOf('Spell')}_sad`);
      this.time.delayedCall(800, () => { if (!this.locked) this.pip.setTexture(`${hostOf('Spell')}_neutral`); });
      this.tweens.add({ targets: tile.box, x: tile.box.x + 12, duration: 50, yoyo: true, repeat: 3 });
      speak(this, 'try-again', false);
      this.time.delayedCall(1200, () => { if (!this.locked) speak(this, this.word, false); });
      if (this.mistakes >= 2) this.showHint();
    }
  }

  private showHint() {
    this.clearHint();
    const t = this.tiles.find((x) => !x.used && x.letter === this.word[this.filled]);
    if (t) this.hintTween = this.tweens.add({ targets: t.box, scale: 1.2, duration: 380, yoyo: true, repeat: -1 });
  }

  private clearHint() {
    this.hintTween?.stop(); this.hintTween = undefined;
    this.tiles.forEach((t) => t.box.setScale(1));
  }

  private success() {
    this.locked = true; this.clearHint();
    this.pip.setTexture(`${hostOf('Spell')}_happy`);
    burst(this, W / 2, SLOT_Y, 20);
    this.tweens.add({ targets: this.pip, y: 1200, duration: 180, yoyo: true, repeat: 1 });
    this.time.delayedCall(350, () => speak(this, this.word));
    const praise = PRAISE[this.index % PRAISE.length];
    this.time.delayedCall(900, () => {
      speak(this, slug(praise));
      this.bubbleBox?.destroy();
      this.bubbleBox = bubble(this, W / 2, 150, 640, praise);
    });
    this.time.delayedCall(1800, () => {
      this.index++;
      if (this.index >= WORDS.length) this.finish(); else this.startRound();
    });
  }

  private finish() {
    this.prog.set(WORDS.length);
    this.roundObjs.forEach((o) => o.destroy()); this.roundObjs = [];
    this.bubbleBox?.destroy();
    this.bubbleBox = bubble(this, W / 2, 400, 640, 'Well done!', 'well-done');
    speak(this, 'well-done');
    this.pip.setTexture(`${hostOf('Spell')}_happy`);
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 250, () => burst(this, 100 + Math.random() * 520, 300 + Math.random() * 500, 14));
    button(this, W / 2 - 170, 760, 300, 'Play again', () => this.scene.restart());
    button(this, W / 2 + 170, 760, 300, 'Menu', () => this.scene.start('Menu'));
    offerEgg(this, W / 2 + 40, 1000, 250);
  }
}
void H;
