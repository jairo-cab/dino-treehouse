import Phaser from 'phaser';
import {
  PRAISE, TASKS, sentenceFor, slug, type Task, type ToyKey, type ZoneKey,
} from '../content/bedroom';
import {
  FONT_TITLE, H, W, breathe, bubble, burst, cover, fitHeight, fitWidth, glassPanel, parallax, shadow, speak, twinkles,
} from '../ui/helpers';
import { FAIRY_LIGHTS } from './HatchScene';

// Where a dropped toy counts as "in the right place" and where it settles.
const ZONES: Record<ZoneKey, { rect: Phaser.Geom.Rectangle; rest: { x: number; y: number } }> = {
  bed: { rect: new Phaser.Geom.Rectangle(270, 790, 340, 190), rest: { x: 440, y: 850 } },
  rug: { rect: new Phaser.Geom.Rectangle(190, 1000, 290, 120), rest: { x: 335, y: 1065 } },
  bookcase: { rect: new Phaser.Geom.Rectangle(10, 955, 240, 100), rest: { x: 125, y: 1005 } },
};

const TRAY_Y = 1195;
const TOY_HOME: Record<ToyKey, { x: number; w: number }> = {
  teddy_bear: { x: 105, w: 128 },
  ball: { x: 250, w: 118 },
  robot: { x: 395, w: 124 },
  train: { x: 590, w: 200 },
};

// Structures practised here: prepositions of place (E8) + toys & furniture vocabulary.
export class BedroomScene extends Phaser.Scene {
  private toys = new Map<ToyKey, Phaser.GameObjects.Image>();
  private pip!: Phaser.GameObjects.Image;
  private bubbleBox?: Phaser.GameObjects.Container;
  private taskIndex = 0;
  private mistakes = 0;
  private locked = false;
  private hint?: Phaser.Tweens.Tween;

  constructor() { super('Bedroom'); }

  private get task(): Task { return TASKS[this.taskIndex]; }

  create() {
    this.cameras.main.fadeIn(500);
    const bg = cover(this, 'bg_bedroom');
    twinkles(this, FAIRY_LIGHTS);

    // furniture, back to front. Every piece gets a contact shadow.
    const bookcase = fitWidth(this.add.image(125, 955, 'obj_bookcase'), 235).setOrigin(0.5, 1);
    shadow(this, 125, 955, 250, 0.35).setDepth(0);
    const lamp = fitHeight(this.add.image(668, 915, 'obj_lamp'), 195).setOrigin(0.5, 1);
    shadow(this, 668, 915, 120, 0.3);
    const bed = fitWidth(this.add.image(440, 965, 'obj_bed'), 345).setOrigin(0.5, 1).setDepth(2);
    shadow(this, 440, 965, 380, 0.38).setDepth(1);
    const rug = fitWidth(this.add.image(335, 1110, 'obj_rug'), 300).setOrigin(0.5, 1).setDepth(1);
    // warm light pool from the lamp
    this.add.image(668, 830, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(340, 300).setAlpha(0.4);

    // Pip watches and reacts
    shadow(this, 590, 1128, 190, 0.4).setDepth(3);
    this.pip = fitHeight(this.add.image(590, 1128, 'pip_neutral'), 310).setOrigin(0.5, 1).setDepth(3);
    breathe(this, this.pip);

    // glass toy tray
    glassPanel(this, W / 2, TRAY_Y, W - 36, 190, 44).setDepth(4);

    (Object.keys(TOY_HOME) as ToyKey[]).forEach((k) => {
      const t = fitWidth(this.add.image(TOY_HOME[k].x, TRAY_Y, `obj_${k}`), TOY_HOME[k].w).setDepth(10);
      t.setData('home', { x: TOY_HOME[k].x, y: TRAY_Y, scale: t.scale });
      t.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(t);
      this.toys.set(k, t);
    });

    this.input.on('dragstart', (_p: unknown, obj: Phaser.GameObjects.Image) => {
      if (this.locked) return;
      this.tweens.killTweensOf(obj);
      obj.setDepth(100);
      this.tweens.add({ targets: obj, scale: obj.getData('home').scale * 1.18, duration: 100 });
    });
    this.input.on('drag', (_p: unknown, obj: Phaser.GameObjects.Image, x: number, y: number) => {
      if (this.locked) return;
      obj.setPosition(x, y);
    });
    this.input.on('dragend', (_p: unknown, obj: Phaser.GameObjects.Image) => this.drop(obj));

    // depth: far wall barely moves, furniture a bit more, Pip the most
    parallax(this, [
      { obj: bg, factor: 12 },
      { obj: bookcase, factor: 5 }, { obj: lamp, factor: 4 }, { obj: bed, factor: 3 }, { obj: rug, factor: 1 },
    ]);

    this.startTask();
  }

  private toyKeyOf(obj: Phaser.GameObjects.Image): ToyKey {
    for (const [k, v] of this.toys) if (v === obj) return k;
    throw new Error('unknown toy');
  }

  private startTask() {
    this.mistakes = 0;
    this.locked = false;
    this.clearHint();
    const sentence = sentenceFor(this.task);
    this.bubbleBox?.destroy();
    this.bubbleBox = bubble(this, W / 2, 150, 670, sentence, slug(sentence));
    this.time.delayedCall(450, () => speak(this, slug(sentence)));
  }

  private drop(obj: Phaser.GameObjects.Image) {
    if (this.locked) return;
    const toy = this.toyKeyOf(obj);
    const zoneKey = (Object.keys(ZONES) as ZoneKey[]).find((z) => ZONES[z].rect.contains(obj.x, obj.y));
    const right = toy === this.task.toy && zoneKey === this.task.zone;

    if (right) this.success(obj, ZONES[this.task.zone].rest);
    else this.fail(obj, zoneKey !== undefined);
  }

  private sendHome(obj: Phaser.GameObjects.Image) {
    const h = obj.getData('home');
    this.tweens.add({
      targets: obj, x: h.x, y: h.y, scale: h.scale, duration: 350, ease: 'Back.out',
      onComplete: () => obj.setDepth(10),
    });
  }

  private fail(obj: Phaser.GameObjects.Image, wasInAZone: boolean) {
    this.mistakes++;
    this.pip.setTexture(wasInAZone ? 'pip_surprised' : 'pip_sad');
    this.tweens.add({ targets: this.pip, angle: { from: -4, to: 4 }, duration: 80, yoyo: true, repeat: 3, onComplete: () => { this.pip.angle = 0; } });
    this.time.delayedCall(900, () => this.pip.setTexture('pip_neutral'));
    speak(this, 'try-again');
    this.sendHome(obj);
    // progressive help: after 2 misses the right toy glows, after 3 the right place too
    if (this.mistakes >= 2) this.showHint(this.mistakes >= 3);
  }

  private showHint(withZone: boolean) {
    this.clearHint();
    const toy = this.toys.get(this.task.toy)!;
    const base = toy.getData('home').scale;
    this.hint = this.tweens.add({ targets: toy, scale: base * 1.22, duration: 380, yoyo: true, repeat: -1 });
    if (withZone) {
      const r = ZONES[this.task.zone].rect;
      const mark = this.add.ellipse(r.centerX, r.centerY, r.width, r.height * 0.9).setStrokeStyle(8, 0xffe08a).setDepth(50);
      mark.setData('hintMark', true);
      this.tweens.add({ targets: mark, alpha: 0.2, duration: 450, yoyo: true, repeat: -1 });
    }
  }

  private clearHint() {
    this.hint?.stop();
    this.hint = undefined;
    this.children.list.filter((c) => c.getData && c.getData('hintMark')).forEach((c) => c.destroy());
    this.toys.forEach((t) => { if (!t.input?.dragState) t.setScale(t.getData('home').scale); });
  }

  private success(obj: Phaser.GameObjects.Image, rest: { x: number; y: number }) {
    this.locked = true;
    this.clearHint();
    this.tweens.add({ targets: obj, x: rest.x, y: rest.y, scale: obj.getData('home').scale * 0.9, duration: 220, ease: 'Sine.out' });
    this.time.delayedCall(200, () => {
      burst(this, rest.x, rest.y - 40);
      this.pip.setTexture('pip_happy');
      this.tweens.add({ targets: this.pip, y: '-=44', duration: 180, yoyo: true, repeat: 1, ease: 'Quad.out' });
      const praise = PRAISE[this.taskIndex % PRAISE.length];
      speak(this, slug(praise));
      this.bubbleBox?.destroy();
      this.bubbleBox = bubble(this, W / 2, 150, 670, praise);
    });

    this.time.delayedCall(1700, () => {
      this.pip.setTexture('pip_neutral');
      this.sendHome(obj);
      this.taskIndex++;
      if (this.taskIndex >= TASKS.length) this.finish();
      else this.startTask();
    });
  }

  private finish() {
    this.locked = true;
    this.bubbleBox?.destroy();
    this.pip.setTexture('pip_happy');
    this.bubbleBox = bubble(this, W / 2, 330, 650, 'Well done!', 'well-done');
    speak(this, 'well-done');
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 250, () => burst(this, 100 + Math.random() * 520, 300 + Math.random() * 500, 14));
    this.tweens.add({ targets: this.pip, y: '-=60', duration: 260, yoyo: true, repeat: 5 });

    glassPanel(this, W / 2, 570, 400, 140, 48).setDepth(950);
    const again = this.add.rectangle(W / 2, 570, 400, 140, 0xffffff, 0.001).setDepth(951).setInteractive({ useHandCursor: true });
    this.add.text(W / 2, 570, 'Play again', { fontFamily: FONT_TITLE, fontSize: '54px', fontStyle: 'bold', color: '#6b3e0a' }).setOrigin(0.5).setDepth(952);
    again.on('pointerdown', () => { this.taskIndex = 0; this.scene.restart(); });
  }
}

void H;
