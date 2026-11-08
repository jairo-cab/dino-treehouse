import Phaser from 'phaser';
import { hostOf } from '../content/dinos';
import { offerEgg } from '../ui/reward';
import { PRAISE, slug } from '../content/bedroom';
import {
  COLOUR_HEX, COLOUR_ORDER, makePaintTasks, paintSentence, type ColourKey, type PaintObj, type PaintTask,
} from '../content/paint';
import { H, W, bubble, burst, button, cover, fitHeight, panel, speak , homeButton, progress } from '../ui/helpers';

const OBJ_POS: Record<PaintObj, { x: number; y: number }> = {
  ball: { x: 150, y: 470 }, bed: { x: 360, y: 470 }, lamp: { x: 575, y: 470 },
  rug: { x: 150, y: 700 }, teddy_bear: { x: 360, y: 700 }, robot: { x: 575, y: 700 },
};
const BOX = { w: 200, h: 190 };
const PALETTE_Y = 1180;

// Exam format: LISTEN AND COLOUR. Vocabulary: toys, furniture, colours. Structure: "Colour the ball red."
export class PaintScene extends Phaser.Scene {
  private items = new Map<PaintObj, Phaser.GameObjects.Image>();
  private done = new Set<PaintObj>();
  private swatches = new Map<ColourKey, Phaser.GameObjects.Container>();
  private ring!: Phaser.GameObjects.Arc;
  private pip!: Phaser.GameObjects.Image;
  private bubbleBox?: Phaser.GameObjects.Container;
  private selected: ColourKey | null = null;
  private taskIndex = 0;
  private mistakes = 0;
  private locked = false;
  private hintTweens: Phaser.Tweens.Tween[] = [];

  constructor() { super('Paint'); }
  private tasks: PaintTask[] = [];
  private get task(): PaintTask { return this.tasks[this.taskIndex]; }

  create() {
    this.cameras.main.fadeIn(180);
    homeButton(this);
    this.taskIndex = 0;
    this.tasks = makePaintTasks();
    this.prog = progress(this, this.tasks.length);
    cover(this, 'bg_bedroom');
    // soft card so the objects stand out from the busy room
    panel(this, 24, 330, W - 48, 530);

    // the grey drawings: tinting is what "paints" them
    (Object.keys(OBJ_POS) as PaintObj[]).forEach((k) => {
      const img = this.add.image(OBJ_POS[k].x, OBJ_POS[k].y, `paint_${k}`);
      img.setScale(Math.min(BOX.w / img.width, BOX.h / img.height));
      img.setInteractive({ useHandCursor: true });
      img.on('pointerdown', () => this.tapObject(k));
      this.items.set(k, img);
    });

    this.pip = fitHeight(this.add.image(95, 1070, `${hostOf('Paint')}_neutral`), 230).setOrigin(0.5, 1).setDepth(3);

    // palette tray
    const tray = this.add.graphics().setDepth(4);
    tray.fillStyle(0x000000, 0.15).fillRoundedRect(14, PALETTE_Y - 84, W - 28, 190, 44);
    tray.fillStyle(0xfff6e4, 0.9).fillRoundedRect(12, PALETTE_Y - 90, W - 24, 180, 44);
    tray.lineStyle(6, 0x7a4b12, 1).strokeRoundedRect(12, PALETTE_Y - 90, W - 24, 180, 44);
    const gap = (W - 24) / COLOUR_ORDER.length;
    COLOUR_ORDER.forEach((c, i) => this.makeSwatch(c, 12 + gap * (i + 0.5)));
    this.ring = this.add.circle(0, 0, 44).setStrokeStyle(8, 0xffffff).setDepth(7).setVisible(false);

    this.startTask();
  }

  private makeSwatch(c: ColourKey, x: number) {
    const dot = this.add.circle(0, 0, 34, COLOUR_HEX[c]).setStrokeStyle(6, c === 'white' ? 0x7a4b12 : 0xffffff);
    const shine = this.add.ellipse(-9, -11, 18, 10, 0xffffff, 0.55);
    const cont = this.add.container(x, PALETTE_Y, [dot, shine]).setDepth(6);
    cont.setSize(74, 74).setInteractive({ useHandCursor: true });
    cont.on('pointerdown', () => this.pickColour(c));
    this.swatches.set(c, cont);
  }

  private pickColour(c: ColourKey) {
    if (this.locked) return;
    this.selected = c;
    speak(this, c);                                   // hearing the colour name is vocabulary practice too
    const cont = this.swatches.get(c)!;
    this.ring.setPosition(cont.x, cont.y).setVisible(true);
    this.swatches.forEach((s, k) => this.tweens.add({ targets: s, scale: k === c ? 1.22 : 1, duration: 120 }));
  }

  private prog!: { set: (n: number) => void };
  private startTask() {
    this.prog.set(this.taskIndex);
    this.mistakes = 0; this.locked = false; this.clearHints();
    const sentence = paintSentence(this.task);
    this.bubbleBox?.destroy();
    this.bubbleBox = bubble(this, W / 2, 175, 670, sentence, slug(sentence));
    this.time.delayedCall(250, () => speak(this, slug(sentence)));
  }

  private tapObject(k: PaintObj) {
    if (this.locked || this.done.has(k)) return;
    const img = this.items.get(k)!;
    if (!this.selected) {                             // no colour yet: nudge the palette
      this.swatches.forEach((s) => this.tweens.add({ targets: s, y: PALETTE_Y - 12, duration: 120, yoyo: true }));
      return;
    }
    if (k === this.task.obj && this.selected === this.task.colour) this.success(img);
    else this.fail(img);
  }

  private wash(img: Phaser.GameObjects.Image, from: number, to: number, ms: number, done?: () => void) {
    const a = Phaser.Display.Color.IntegerToColor(from), b = Phaser.Display.Color.IntegerToColor(to);
    const t = { v: 0 };
    this.tweens.add({
      targets: t, v: 100, duration: ms, ease: 'Sine.out',
      onUpdate: () => {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(a, b, 100, t.v);
        img.setTint(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
      },
      onComplete: () => done?.(),
    });
  }

  private success(img: Phaser.GameObjects.Image) {
    this.locked = true; this.clearHints();
    const obj = this.task.obj, sc = img.scale;
    this.wash(img, 0xffffff, COLOUR_HEX[this.task.colour], 380);
    this.tweens.add({ targets: img, scaleX: sc * 1.14, scaleY: sc * 0.9, duration: 120, yoyo: true, ease: 'Quad.out' });
    burst(this, img.x, img.y, 20);
    this.pip.setTexture(`${hostOf('Paint')}_happy`);
    this.tweens.add({ targets: this.pip, y: 1030, duration: 180, yoyo: true, repeat: 1, ease: 'Quad.out' });
    const praise = PRAISE[this.taskIndex % PRAISE.length];
    speak(this, slug(praise));
    this.bubbleBox?.destroy();
    this.bubbleBox = bubble(this, W / 2, 175, 670, praise);
    this.done.add(obj);

    this.time.delayedCall(1300, () => {
      this.pip.setTexture(`${hostOf('Paint')}_neutral`);
      this.taskIndex++;
      this.selected = null; this.ring.setVisible(false);
      this.swatches.forEach((s) => s.setScale(1));
      if (this.taskIndex >= this.tasks.length) this.finish(); else this.startTask();
    });
  }

  private fail(img: Phaser.GameObjects.Image) {
    this.mistakes++;
    const wrong = COLOUR_HEX[this.selected!];
    // show the wrong colour for a moment, then wash it away
    this.wash(img, 0xffffff, wrong, 160, () => this.time.delayedCall(350, () => this.wash(img, wrong, 0xffffff, 300)));
    this.tweens.add({ targets: img, angle: { from: -5, to: 5 }, duration: 70, yoyo: true, repeat: 3, onComplete: () => { img.angle = 0; } });
    this.pip.setTexture(`${hostOf('Paint')}_sad`);
    this.time.delayedCall(900, () => this.pip.setTexture(`${hostOf('Paint')}_neutral`));
    speak(this, 'try-again', false);
    // progressive help: 2 misses -> the right object pulses, 3 -> the right colour too
    if (this.mistakes >= 2) this.showHints(this.mistakes >= 3);
  }

  private showHints(withColour: boolean) {
    this.clearHints();
    const img = this.items.get(this.task.obj)!;
    const s = img.scale;
    this.hintTweens.push(this.tweens.add({ targets: img, scale: s * 1.12, duration: 380, yoyo: true, repeat: -1 }));
    if (withColour) {
      const sw = this.swatches.get(this.task.colour)!;
      this.hintTweens.push(this.tweens.add({ targets: sw, y: PALETTE_Y - 14, duration: 320, yoyo: true, repeat: -1 }));
    }
  }

  private clearHints() {
    this.hintTweens.forEach((t) => t.stop());
    this.hintTweens = [];
    this.items.forEach((img, k) => {
      const base = Math.min(BOX.w / img.width, BOX.h / img.height);
      if (img.scale !== base) img.setScale(base);
    });
    this.swatches.forEach((s) => { s.y = PALETTE_Y; });
  }

  private finish() {
    this.prog.set(this.tasks.length);
    this.locked = true;
    this.bubbleBox?.destroy();
    this.pip.setTexture(`${hostOf('Paint')}_happy`);
    this.bubbleBox = bubble(this, W / 2, 175, 650, 'Well done!', 'well-done');
    speak(this, 'well-done');
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 250, () => burst(this, 100 + Math.random() * 520, 300 + Math.random() * 500, 14));
    this.tweens.add({ targets: this.pip, y: 1010, duration: 260, yoyo: true, repeat: 5 });
    button(this, 365, 960, 280, 'Play again', () => { this.taskIndex = 0; this.scene.restart(); });
    button(this, 600, 960, 180, 'Menu', () => this.scene.start('Menu'));
    offerEgg(this, W / 2 + 100, 1140, 150);
  }
}
void H;
