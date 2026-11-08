import Phaser from 'phaser';

export const W = 720;
export const H = 1290;

export const FONT_TITLE = 'Fredoka, "Baloo 2", "Trebuchet MS", sans-serif';
export const FONT_TEXT = 'Andika, "Trebuchet MS", sans-serif';

/** Play an audio clip if it exists (voices are added later; the game works silently until then). */
export function speak(scene: Phaser.Scene, key: string): void {
  if (scene.cache.audio.exists(key)) scene.sound.play(key);
}

/** Image scaled to fill the whole screen, centred. */
export function cover(scene: Phaser.Scene, key: string): Phaser.GameObjects.Image {
  const img = scene.add.image(W / 2, H / 2, key);
  img.setScale(Math.max(W / img.width, H / img.height) * 1.04); // a little bigger so parallax never shows edges
  return img;
}

export function fitWidth<T extends Phaser.GameObjects.Image>(img: T, width: number): T {
  img.setScale(width / img.width);
  return img;
}

export function fitHeight<T extends Phaser.GameObjects.Image>(img: T, height: number): T {
  img.setScale(height / img.height);
  return img;
}

/** Soft contact shadow, so things look like they stand in the room (this is most of the "3D" feel). */
export function shadow(scene: Phaser.Scene, x: number, y: number, width: number, alpha = 0.32): Phaser.GameObjects.Image {
  return scene.add.image(x, y, 'shadow').setDisplaySize(width, width * 0.28).setAlpha(alpha);
}

/** Little star burst, used for every success. */
export function burst(scene: Phaser.Scene, x: number, y: number, count = 18): void {
  const em = scene.add.particles(x, y, 'spark', {
    speed: { min: 120, max: 380 },
    angle: { min: 0, max: 360 },
    scale: { start: 1, end: 0 },
    lifespan: 700,
    gravityY: 300,
    tint: [0xffd23f, 0xff7a59, 0x7ed957, 0x59c3ff],
    emitting: false,
  });
  em.setDepth(1000);
  em.explode(count);
  scene.time.delayedCall(900, () => em.destroy());
}

/** Frosted-glass rounded panel (the modern UI look): translucent body, bright rim, glossy top highlight. */
export function glassPanel(
  scene: Phaser.Scene, x: number, y: number, w: number, h: number, radius = 36,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics({ x, y });
  g.fillStyle(0x000000, 0.16).fillRoundedRect(-w / 2 + 3, -h / 2 + 10, w, h, radius);       // drop shadow
  g.fillStyle(0xfff6e4, 0.82).fillRoundedRect(-w / 2, -h / 2, w, h, radius);                // body
  g.fillStyle(0xffffff, 0.45).fillRoundedRect(-w / 2 + 6, -h / 2 + 6, w - 12, h * 0.42, { tl: radius - 6, tr: radius - 6, bl: 14, br: 14 }); // gloss
  g.lineStyle(4, 0xffffff, 0.95).strokeRoundedRect(-w / 2, -h / 2, w, h, radius);           // rim light
  g.lineStyle(2, 0xb9772e, 0.55).strokeRoundedRect(-w / 2 + 3, -h / 2 + 3, w - 6, h - 6, radius - 3);
  return g;
}

/** Round glossy button (speaker, etc.). Returns the container so callers can add icons. */
export function glossyCircle(scene: Phaser.Scene, x: number, y: number, r: number, color = 0xffb627): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.2).fillCircle(2, 7, r);
  g.fillStyle(color, 1).fillCircle(0, 0, r);
  g.fillStyle(0xffffff, 0.5).fillEllipse(0, -r * 0.45, r * 1.3, r * 0.8);
  g.lineStyle(4, 0xffffff, 0.9).strokeCircle(0, 0, r);
  c.add(g);
  c.setSize(r * 2, r * 2);
  return c;
}

/** Speech bubble on a glass panel, with a speaker button that replays the audio. */
export function bubble(
  scene: Phaser.Scene, x: number, y: number, width: number, text: string, audioKey?: string,
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y).setDepth(900);
  const label = scene.add.text(-width / 2 + 34, 0, text, {
    fontFamily: FONT_TEXT, fontSize: '42px', color: '#4a2f12', wordWrap: { width: width - 170 }, lineSpacing: 6,
  }).setOrigin(0, 0.5);
  const h = Math.max(128, label.height + 60);
  c.add([glassPanel(scene, 0, 0, width, h), label]);
  if (audioKey) {
    const btn = glossyCircle(scene, width / 2 - 66, 0, 44);
    const icon = scene.add.triangle(0, 0, -9, -17, -9, 17, 19, 0, 0x5a3200);
    btn.add(icon);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      speak(scene, audioKey);
      scene.tweens.add({ targets: btn, scale: 0.86, duration: 70, yoyo: true });
    });
    c.add(btn);
  }
  c.setScale(0.6).setAlpha(0);
  scene.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 280, ease: 'Back.out' });
  return c;
}

/** Soft breathing so characters never look frozen. */
export function breathe(scene: Phaser.Scene, target: Phaser.GameObjects.Image, amount = 0.02): Phaser.Tweens.Tween {
  const sx = target.scaleX, sy = target.scaleY;
  return scene.tweens.add({
    targets: target, scaleY: sy * (1 + amount), scaleX: sx * (1 - amount / 2),
    duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.inOut',
  });
}

/**
 * Cheap depth: each layer shifts a little with the pointer (or sways by itself), far layers less than near ones.
 * `factor` = max pixels of shift. No physics, no extra assets.
 */
export function parallax(scene: Phaser.Scene, layers: { obj: Phaser.GameObjects.Components.Transform; factor: number }[]): void {
  const base = layers.map((l) => ({ x: l.obj.x, y: l.obj.y }));
  let tx = 0, ty = 0, cx = 0, cy = 0;
  scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
    tx = (p.x / W - 0.5) * 2;
    ty = (p.y / H - 0.5) * 2;
  });
  scene.events.on('update', (time: number) => {
    // idle sway when nobody touches the screen
    const sway = Math.sin(time / 2200);
    cx += (tx + sway * 0.35 - cx) * 0.06;
    cy += (ty - cy) * 0.06;
    layers.forEach((l, i) => {
      l.obj.x = base[i].x - cx * l.factor;
      l.obj.y = base[i].y - cy * l.factor * 0.5;
    });
  });
}

/** Warm fairy-light twinkles at given spots (additive glow, very cheap). */
export function twinkles(scene: Phaser.Scene, spots: { x: number; y: number }[]): void {
  spots.forEach((s, i) => {
    const glow = scene.add.image(s.x, s.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setScale(0.6).setAlpha(0.7).setDepth(5);
    scene.tweens.add({
      targets: glow, alpha: { from: 0.25, to: 0.95 }, scale: { from: 0.45, to: 0.85 },
      duration: 900 + (i % 5) * 260, yoyo: true, repeat: -1, delay: i * 170, ease: 'Sine.inOut',
    });
  });
}
