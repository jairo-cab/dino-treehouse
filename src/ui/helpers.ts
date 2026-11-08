import Phaser from 'phaser';

export const W = 720;
export const H = 1280;
export const FONT_TITLE = 'Fredoka, "Baloo 2", "Trebuchet MS", sans-serif';
export const FONT_TEXT = 'Andika, "Trebuchet MS", sans-serif';

/**
 * Play a voice clip. By default it cuts whatever voice is still playing, so two voices never overlap
 * (that was the "double audio"). With interrupt=false it only plays if nothing else is playing.
 */
export function speak(scene: Phaser.Scene, key: string, interrupt = true): void {
  if (!scene.cache.audio.exists(key)) return;
  if (interrupt) scene.sound.stopAll();
  else if (scene.sound.getAllPlaying().length > 0) return;
  scene.sound.play(key);
}

export function cover(scene: Phaser.Scene, key: string): Phaser.GameObjects.Image {
  const img = scene.add.image(W / 2, H / 2, key);
  img.setScale(Math.max(W / img.width, H / img.height));
  return img;
}

export function fitWidth<T extends Phaser.GameObjects.Image>(img: T, width: number): T { img.setScale(width / img.width); return img; }
export function fitHeight<T extends Phaser.GameObjects.Image>(img: T, height: number): T { img.setScale(height / img.height); return img; }

export function burst(scene: Phaser.Scene, x: number, y: number, count = 18): void {
  const em = scene.add.particles(x, y, 'spark', {
    speed: { min: 120, max: 380 }, angle: { min: 0, max: 360 }, scale: { start: 1, end: 0 },
    lifespan: 700, gravityY: 300, tint: [0xffd23f, 0xff7a59, 0x7ed957, 0x59c3ff], emitting: false,
  });
  em.setDepth(1000);
  em.explode(count);
  scene.time.delayedCall(900, () => em.destroy());
}

/** Blue round speaker face, baked once per radius. Centre of the image = centre of the circle. */
function speakerTexture(scene: Phaser.Scene, r: number): string {
  const size = (r + 12) * 2, c = r + 12;
  return bake(scene, `spk_${r}`, size, size, (cx) => {
    const circle = (y: number, fill: string | CanvasGradient) => { cx.beginPath(); cx.arc(c, y, r, 0, Math.PI * 2); cx.fillStyle = fill; cx.fill(); };
    circle(c + 9, 'rgba(0,0,0,0.12)');
    circle(c + 6, hex(0x2574c4));
    circle(c, vGrad(cx, c - r, 2 * r, 0x84d1ff, 0x3a9cf2));
    cx.beginPath(); cx.ellipse(c, c - r * 0.48, r * 0.6, r * 0.21, 0, 0, Math.PI * 2); cx.fillStyle = 'rgba(255,255,255,0.3)'; cx.fill();
  });
}

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const rgba = (n: number, a: number) => `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
type Ctx = CanvasRenderingContext2D;

/** Rounded-rectangle path on a 2D canvas context. */
function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath(); c.roundRect(x, y, w, h, r);
}
function fillRR(c: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient): void {
  rr(c, x, y, w, h, r); c.fillStyle = fill; c.fill();
}
function vGrad(c: Ctx, y: number, h: number, top: number, bottom: number): CanvasGradient {
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, hex(top)); g.addColorStop(1, hex(bottom));
  return g;
}

/** Draw once into a texture (cached). Graphics objects are re-drawn every frame; images are not. */
export function bake(scene: Phaser.Scene, key: string, w: number, h: number, draw: (c: Ctx) => void): string {
  if (!scene.textures.exists(key)) {
    const tex = scene.textures.createCanvas(key, Math.ceil(w), Math.ceil(h));
    if (tex) { draw(tex.getContext()); tex.refresh(); }
  }
  return key;
}

export function bubble(scene: Phaser.Scene, x: number, y: number, width: number, text: string, audioKey?: string): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y).setDepth(900);
  const label = scene.add.text(-width / 2 + 36, 0, text, {
    fontFamily: FONT_TEXT, fontSize: '40px', color: '#2f2a24', wordWrap: { width: width - 160 }, lineSpacing: 6,
  }).setOrigin(0, 0.5);
  const h = Math.max(116, label.height + 52), r = Math.min(h / 2, 58);
  const pad = 16, ox = pad + width / 2, oy = pad + h / 2;
  const key = bake(scene, `bubble_${width}_${h}`, width + 2 * pad, h + 2 * pad + 14, (c) => {
    fillRR(c, ox - width / 2 - 4, oy - h / 2 + 12, width + 8, h, r + 4, 'rgba(0,0,0,0.08)');
    fillRR(c, ox - width / 2, oy - h / 2 + 7, width, h, r, 'rgba(0,0,0,0.12)');
    fillRR(c, ox - width / 2, oy - h / 2, width, h, r, 'rgba(255,255,255,0.97)');
  });
  const g = scene.add.image(-ox, -oy, key).setOrigin(0, 0);
  c.add([g, label]);
  if (audioKey) {
    const bx = width / 2 - 62;
    const g2 = scene.add.image(bx, 0, speakerTexture(scene, 42));
    const icon = scene.add.triangle(bx + 4, 0, 0, -16, 0, 16, 26, 0, 0xffffff);
    const hit = scene.add.circle(bx, 0, 46, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => { speak(scene, audioKey); scene.tweens.add({ targets: [g2, icon], scale: 0.88, duration: 70, yoyo: true }); });
    c.add([g2, icon, hit]);
  }
  c.setScale(0.6).setAlpha(0);
  scene.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 180, ease: "Back.out" });
  return c;
}

export function breathe(scene: Phaser.Scene, target: Phaser.GameObjects.Image, amount = 0.02): Phaser.Tweens.Tween {
  const sx = target.scaleX, sy = target.scaleY;
  return scene.tweens.add({ targets: target, scaleY: sy * (1 + amount), scaleX: sx * (1 - amount / 2), duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
}

/** Soft contact shadow so things sit in the room instead of floating. */
export function shadow(scene: Phaser.Scene, x: number, y: number, width: number, alpha = 0.32): Phaser.GameObjects.Image {
  return scene.add.image(x, y, 'shadow').setDisplaySize(width, width * 0.28).setAlpha(alpha).setDepth(0.5);
}

/** A few tiny golden sparkles drifting up (a single particle emitter, max ~13 alive). */
export function motes(scene: Phaser.Scene): void {
  const em = scene.add.particles(0, 0, 'spark', {
    x: { min: 20, max: W - 20 }, y: { min: H * 0.45, max: H * 0.95 },
    lifespan: 6000, speedY: { min: -26, max: -50 }, speedX: { min: -8, max: 8 },
    scale: { start: 0.38, end: 0 }, alpha: { start: 0.7, end: 0 },
    tint: [0xfff3b0, 0xffe08a, 0xffffff], frequency: 460, blendMode: 'ADD',
  });
  em.setDepth(20);
}

/** Warm soft edge darkening: focuses the eye on the centre. A single image, no input. */
export function vignette(scene: Phaser.Scene): void {
  scene.add.image(W / 2, H / 2, 'vignette').setDisplaySize(W, H).setDepth(800);
}

/** Pieces appear one after another with a little bounce. */
export function popIn(scene: Phaser.Scene, items: Phaser.GameObjects.Image[], start = 0, gap = 90): void {
  items.forEach((it, i) => {
    const sx = it.scaleX, sy = it.scaleY, a = it.alpha;
    it.setAlpha(0).setScale(sx * 0.8, sy * 0.8);
    scene.tweens.add({ targets: it, alpha: a, scaleX: sx, scaleY: sy, duration: 260, delay: start + i * gap, ease: 'Back.out' });
  });
}

/** Frosted white card with a soft shadow: the surface the game content sits on. */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number): Phaser.GameObjects.Image {
  const pad = 12;
  const key = bake(scene, `panel_${w}_${h}`, w + 2 * pad, h + 2 * pad + 8, (c) => {
    fillRR(c, pad - 4, pad + 6, w + 8, h + 8, 44, 'rgba(0,0,0,0.07)');
    fillRR(c, pad, pad + 10, w, h, 40, 'rgba(0,0,0,0.12)');
    fillRR(c, pad, pad, w, h, 40, 'rgba(255,255,255,0.84)');
    rr(c, pad + 1.5, pad + 1.5, w - 3, h - 3, 40); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.95)'; c.stroke();
  });
  return scene.add.image(x - pad, y - pad, key).setOrigin(0, 0);
}

/** Letter slot image, centred on (x, y). Swap to the green look with setSlotFilled. */
export function makeSlot(scene: Phaser.Scene, x: number, y: number, w: number, h: number): Phaser.GameObjects.Image {
  return scene.add.image(x, y, slotTexture(scene, w, h, false));
}
export function setSlotFilled(scene: Phaser.Scene, img: Phaser.GameObjects.Image, w: number, h: number): void {
  img.setTexture(slotTexture(scene, w, h, true));
}
function slotTexture(scene: Phaser.Scene, w: number, h: number, filled: boolean): string {
  const pad = 10, ox = pad + w / 2, oy = pad + h / 2;
  return bake(scene, `slot_${filled}_${w}_${h}`, w + 2 * pad, h + 2 * pad + 6, (c) => {
    fillRR(c, ox - w / 2, oy - h / 2 + 6, w, h, 26, 'rgba(0,0,0,0.1)');
    fillRR(c, ox - w / 2, oy - h / 2, w, h, 26, filled ? hex(0xd9f7c8) : '#ffffff');
    rr(c, ox - w / 2, oy - h / 2, w, h, 26); c.lineWidth = 5; c.strokeStyle = hex(filled ? 0x5ed17a : 0xbfd0df); c.stroke();
  });
}

/**
 * Modern "pill" key: no outline, vertical colour gradient, a darker lip underneath and a soft shadow.
 * container.list[0] is the invisible hit area (it gets the pointerdown).
 */
export function chip(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, fontSize: number,
  onTap: () => void, tone: 'gold' | 'green' | 'blue' | 'white' = 'gold',
): Phaser.GameObjects.Container {
  const tones = {
    gold: { top: 0xffb64d, bottom: 0xff8a1c, lip: 0xd9650a, text: '#ffffff', shade: true },
    green: { top: 0x82e394, bottom: 0x37b863, lip: 0x23893f, text: '#ffffff', shade: true },
    blue: { top: 0x84d1ff, bottom: 0x3a9cf2, lip: 0x2574c4, text: '#ffffff', shade: true },
    white: { top: 0xffffff, bottom: 0xf3eee4, lip: 0xd3c9b8, text: '#3b2a14', shade: false },
  }[tone];
  const r = Math.min(h * 0.36, 40), lip = 9;
  const hit = scene.add.rectangle(0, 0, w, h + lip, 0xffffff, 0.001);
  const pad = 12, ox = pad + w / 2, oy = pad + h / 2;
  const key = bake(scene, `chip_${tone}_${w}_${h}`, w + 2 * pad, h + lip + 8 + 2 * pad, (c) => {
    fillRR(c, ox - w / 2 - 3, oy - h / 2 + lip + 4, w + 6, h + 6, r + 3, 'rgba(0,0,0,0.1)');
    fillRR(c, ox - w / 2, oy - h / 2 + lip + 8, w, h, r, 'rgba(0,0,0,0.14)');
    fillRR(c, ox - w / 2, oy - h / 2 + lip, w, h, r, hex(tones.lip));
    fillRR(c, ox - w / 2, oy - h / 2, w, h, r, vGrad(c, oy - h / 2, h, tones.top, tones.bottom));
    if (tone !== 'white') fillRR(c, ox - w / 2 + 14, oy - h / 2 + 7, w - 28, h * 0.18, r * 0.5, 'rgba(255,255,255,0.22)');
  });
  const g = scene.add.image(-ox, -oy, key).setOrigin(0, 0);
  const text = scene.add.text(0, -2, label, { fontFamily: FONT_TITLE, fontSize: `${fontSize}px`, fontStyle: 'bold', color: tones.text }).setOrigin(0.5);
  if (tones.shade) text.setShadow(0, 3, 'rgba(0,0,0,0.28)', 2, false, true);
  const c = scene.add.container(x, y, [hit, g, text]).setDepth(10);
  hit.setInteractive({ useHandCursor: true });
  hit.on('pointerdown', () => {
    scene.tweens.add({ targets: [g, text], y: '+=6', duration: 60, yoyo: true });
    onTap();
  });
  return c;
}

/** Big button used for menus and "Play again". */
export function button(
  scene: Phaser.Scene, x: number, y: number, w: number, label: string, onTap: () => void,
): Phaser.GameObjects.Container {
  const c = chip(scene, x, y, w, 120, label, 52, () => scene.time.delayedCall(60, onTap));
  return c.setDepth(950);
}

/** Small "Menu" pill in the top-left corner of every game, so the child can always go back. */
export function homeButton(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = chip(scene, 100, 44, 160, 60, 'Menu', 30, () => {
    scene.sound.stopAll();
    scene.time.delayedCall(60, () => scene.scene.start('Menu'));
  }, 'white');
  (c.list[2] as Phaser.GameObjects.Text).x += 16;
  const chev = scene.add.graphics();
  chev.lineStyle(7, 0x3b2a14, 1).beginPath().moveTo(-34, -12).lineTo(-46, -2).lineTo(-34, 8).strokePath();
  c.add(chev);
  return c.setDepth(960);
}

/** Row of dots in the top-right corner: finished rounds fill in orange. Call set(n) = n rounds done. */
export function progress(scene: Phaser.Scene, total: number): { set: (done: number) => void } {
  const g = scene.add.graphics().setDepth(960);
  const gap = 30, x0 = W - 34 - (total - 1) * gap;
  const set = (done: number) => {
    g.clear();
    for (let i = 0; i < total; i++) {
      const x = x0 + i * gap, y = 44;
      g.fillStyle(0x000000, 0.12).fillCircle(x, y + 3, 11);
      if (i < done) g.fillStyle(0xff9a2e, 1).fillCircle(x, y, 11);
      else g.fillStyle(0xffffff, i === done ? 1 : 0.6).fillCircle(x, y, 11);
      if (i === done) g.lineStyle(4, 0xff9a2e, 1).strokeCircle(x, y, 11);
    }
  };
  set(0);
  return { set };
}

/** Round blue speaker button (same look as the one inside the speech bubble). */
export function speakerButton(scene: Phaser.Scene, x: number, y: number, r: number, onTap: () => void): Phaser.GameObjects.Container {
  const g = scene.add.image(0, 0, speakerTexture(scene, r));
  const icon = scene.add.triangle(r * 0.1, 0, 0, -r * 0.38, 0, r * 0.38, r * 0.62, 0, 0xffffff);
  const hit = scene.add.circle(0, 0, r + 4, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
  const c = scene.add.container(x, y, [g, icon, hit]).setDepth(5);
  hit.on('pointerdown', () => { scene.tweens.add({ targets: [g, icon], scale: 0.88, duration: 70, yoyo: true }); onTap(); });
  return c;
}
