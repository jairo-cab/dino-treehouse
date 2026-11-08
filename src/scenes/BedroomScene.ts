import Phaser from 'phaser';
import { hostOf } from '../content/dinos';
import { offerEgg } from '../ui/reward';
import { PRAISE, makeTasks, sentenceFor, slug, type Task, type ToyKey, type ZoneKey } from '../content/bedroom';
import { H, W, bubble, burst, button, cover, fitHeight, fitWidth, motes, popIn, shadow, speak, vignette , homeButton, progress } from '../ui/helpers';

const ZONES: Record<ZoneKey, { rect: Phaser.Geom.Rectangle; rest: { x: number; y: number } }> = {
  bed: { rect: new Phaser.Geom.Rectangle(320, 600, 320, 230), rest: { x: 470, y: 720 } },
  rug: { rect: new Phaser.Geom.Rectangle(190, 960, 340, 150), rest: { x: 360, y: 1030 } },
  bookcase: { rect: new Phaser.Geom.Rectangle(20, 900, 240, 140), rest: { x: 140, y: 990 } },
};
const TRAY_Y = 1190;
const PIP_Y = 1090;
const TOY_HOME: Record<ToyKey, { x: number; w: number }> = {
  teddy_bear: { x: 120, w: 140 }, ball: { x: 270, w: 130 }, robot: { x: 420, w: 140 }, train: { x: 605, w: 190 },
};

export class BedroomScene extends Phaser.Scene {
  private toys = new Map<ToyKey, Phaser.GameObjects.Image>();
  private pip!: Phaser.GameObjects.Image;
  private bubbleBox?: Phaser.GameObjects.Container;
  private taskIndex = 0;
  private mistakes = 0;
  private locked = false;
  private hint?: Phaser.Tweens.Tween;
  constructor() { super('Bedroom'); }
  private tasks: Task[] = [];
  private get task(): Task { return this.tasks[this.taskIndex]; }

  create() {
    this.cameras.main.fadeIn(180);
    homeButton(this);
    this.taskIndex = 0;
    this.tasks = makeTasks(6);
    this.prog = progress(this, this.tasks.length);
    cover(this, 'bg_bedroom');
    // contact shadows (soft, under every piece)
    shadow(this, 140, 911, 250, 0.35);
    shadow(this, 650, 965, 110, 0.3);
    shadow(this, 470, 893, 350, 0.38);
    shadow(this, 630, PIP_Y + 4, 210, 0.4).setDepth(2.5);
    const bookcase = fitWidth(this.add.image(140, 780, 'obj_bookcase'), 230);
    const rug = fitWidth(this.add.image(360, 1035, 'obj_rug'), 360).setDepth(1);
    const bed = fitWidth(this.add.image(470, 740, 'obj_bed'), 330).setDepth(2);
    const lamp = fitHeight(this.add.image(650, 880, 'obj_lamp'), 170).setDepth(2);
    // the lamp's light gently pulses
    const lampGlow = this.add.image(650, 830, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDisplaySize(300, 260).setAlpha(0.35).setDepth(2.2);
    this.tweens.add({ targets: lampGlow, alpha: 0.5, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.pip = fitHeight(this.add.image(630, PIP_Y, `${hostOf('Bedroom')}_neutral`), 330).setOrigin(0.5, 1).setDepth(3);
    popIn(this, [rug, bookcase, bed, lamp, this.pip], 40, 50);
    motes(this);
    vignette(this);
    // every few seconds Pip does a tiny hop so he never looks frozen (only when nothing is happening)
    this.time.addEvent({ delay: 4200, loop: true, callback: () => {
      if (this.locked || this.mistakes > 0 || this.pip.y !== PIP_Y) return;
      this.tweens.add({ targets: this.pip, y: PIP_Y - 16, duration: 150, yoyo: true, ease: 'Quad.out' });
    } });
    this.add.rectangle(W / 2, TRAY_Y + 10, W - 30, 200, 0x000000, 0.14).setStrokeStyle(0).setDepth(4);
    const slotsX = Phaser.Utils.Array.Shuffle([120, 270, 420]) as number[];
    const toyX: Record<ToyKey, number> = { teddy_bear: slotsX[0], ball: slotsX[1], robot: slotsX[2], train: 605 };
    (Object.keys(TOY_HOME) as ToyKey[]).forEach((k) => {
      const t = fitWidth(this.add.image(toyX[k], TRAY_Y, `obj_${k}`), TOY_HOME[k].w).setDepth(10);
      t.setData('home', { x: toyX[k], y: TRAY_Y, scale: t.scale });
      t.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(t);
      this.toys.set(k, t);
    });
    // a shadow that follows the toy while it is held: it looks lifted off the floor
    const dragShadow = this.add.image(0, 0, 'shadow').setAlpha(0).setDepth(99);
    this.input.on('dragstart', (_p: unknown, obj: Phaser.GameObjects.Image) => {
      if (this.locked) return;
      this.tweens.killTweensOf(obj); obj.setDepth(100);
      this.tweens.add({ targets: obj, scale: obj.getData('home').scale * 1.15, duration: 100 });
      dragShadow.setDisplaySize(obj.displayWidth * 0.9, obj.displayWidth * 0.26).setAlpha(0.3);
    });
    this.input.on('drag', (_p: unknown, obj: Phaser.GameObjects.Image, x: number, y: number) => {
      if (this.locked) return;
      obj.setPosition(x, y);
      dragShadow.setPosition(x + 6, y + obj.displayHeight * 0.55 + 14);
    });
    this.input.on('dragend', (_p: unknown, obj: Phaser.GameObjects.Image) => { dragShadow.setAlpha(0); this.drop(obj); });
    this.startTask();
  }

  private toyKeyOf(obj: Phaser.GameObjects.Image): ToyKey {
    for (const [k, v] of this.toys) if (v === obj) return k;
    throw new Error('unknown toy');
  }

  private prog!: { set: (n: number) => void };
  private startTask() {
    this.prog.set(this.taskIndex);
    this.mistakes = 0; this.locked = false; this.clearHint();
    const sentence = sentenceFor(this.task);
    this.bubbleBox?.destroy();
    this.bubbleBox = bubble(this, W / 2, 150, 660, sentence, slug(sentence));
    this.time.delayedCall(250, () => speak(this, slug(sentence)));
  }

  private drop(obj: Phaser.GameObjects.Image) {
    if (this.locked) return;
    const toy = this.toyKeyOf(obj);
    const zoneKey = (Object.keys(ZONES) as ZoneKey[]).find((z) => ZONES[z].rect.contains(obj.x, obj.y));
    if (toy === this.task.toy && zoneKey === this.task.zone) this.success(obj, ZONES[this.task.zone].rest);
    else this.fail(obj, zoneKey !== undefined);
  }

  private sendHome(obj: Phaser.GameObjects.Image) {
    const h = obj.getData('home');
    this.tweens.add({ targets: obj, x: h.x, y: h.y, scale: h.scale, duration: 350, ease: 'Back.out', onComplete: () => obj.setDepth(10) });
  }

  private fail(obj: Phaser.GameObjects.Image, wasInAZone: boolean) {
    this.mistakes++;
    this.pip.setTexture(wasInAZone ? `${hostOf('Bedroom')}_surprised` : `${hostOf('Bedroom')}_sad`);
    this.tweens.add({ targets: this.pip, angle: { from: -4, to: 4 }, duration: 80, yoyo: true, repeat: 3, onComplete: () => { this.pip.angle = 0; } });
    this.time.delayedCall(900, () => this.pip.setTexture(`${hostOf('Bedroom')}_neutral`));
    speak(this, 'try-again', false);
    this.sendHome(obj);
    if (this.mistakes >= 2) this.showHint(this.mistakes >= 3);
  }

  private showHint(withZone: boolean) {
    this.clearHint();
    const toy = this.toys.get(this.task.toy)!;
    const base = toy.getData('home').scale;
    this.hint = this.tweens.add({ targets: toy, scale: base * 1.2, duration: 380, yoyo: true, repeat: -1 });
    if (withZone) {
      const r = ZONES[this.task.zone].rect;
      const mark = this.add.rectangle(r.centerX, r.centerY, r.width, r.height).setStrokeStyle(8, 0xffd23f).setDepth(50);
      mark.setData('hintMark', true);
      this.tweens.add({ targets: mark, alpha: 0.2, duration: 450, yoyo: true, repeat: -1 });
    }
  }

  private clearHint() {
    this.hint?.stop(); this.hint = undefined;
    this.children.list.filter((c) => c.getData && c.getData('hintMark')).forEach((c) => c.destroy());
    this.toys.forEach((t) => { if (!t.input?.dragState) t.setScale(t.getData('home').scale); });
  }

  private success(obj: Phaser.GameObjects.Image, rest: { x: number; y: number }) {
    this.locked = true; this.clearHint();
    const sc = obj.getData('home').scale;
    this.tweens.add({ targets: obj, x: rest.x, y: rest.y, scale: sc, duration: 220, ease: 'Sine.out',
      onComplete: () => this.tweens.add({ targets: obj, scaleY: sc * 0.82, scaleX: sc * 1.12, duration: 90, yoyo: true, ease: 'Quad.out' }) });
    this.time.delayedCall(200, () => {
      burst(this, rest.x, rest.y - 40);
      this.pip.setTexture(`${hostOf('Bedroom')}_happy`);
      this.tweens.add({ targets: this.pip, y: PIP_Y - 40, duration: 180, yoyo: true, repeat: 1, ease: 'Quad.out' });
      speak(this, slug(PRAISE[this.taskIndex % PRAISE.length]));
      this.bubbleBox?.destroy();
      this.bubbleBox = bubble(this, W / 2, 150, 660, PRAISE[this.taskIndex % PRAISE.length]);
    });
    this.time.delayedCall(1300, () => {
      this.pip.setTexture(`${hostOf('Bedroom')}_neutral`); this.sendHome(obj); this.taskIndex++;
      if (this.taskIndex >= this.tasks.length) this.finish(); else this.startTask();
    });
  }

  private finish() {
    this.prog.set(this.tasks.length);
    this.locked = true; this.bubbleBox?.destroy(); this.pip.setTexture(`${hostOf('Bedroom')}_happy`);
    this.bubbleBox = bubble(this, W / 2, 330, 640, 'Well done!', 'well-done');
    speak(this, 'well-done');
    for (let i = 0; i < 5; i++) this.time.delayedCall(i * 250, () => burst(this, 100 + Math.random() * 520, 300 + Math.random() * 500, 14));
    this.tweens.add({ targets: this.pip, y: PIP_Y - 60, duration: 260, yoyo: true, repeat: 5 });
    button(this, W / 2 - 170, 560, 300, 'Play again', () => { this.taskIndex = 0; this.scene.restart(); });
    button(this, W / 2 + 170, 560, 300, 'Menu', () => this.scene.start('Menu'));
    offerEgg(this, W / 2, 860, 230);
  }
}
void H;
