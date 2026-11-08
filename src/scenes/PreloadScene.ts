import Phaser from 'phaser';
import voiceLines from '../content/voice_lines.json';
import { FONT_TITLE, H, W } from '../ui/helpers';
import { heartPath } from './LikeScene';

const IMAGES = [
  'bg_bedroom', 'egg_closed', 'egg_cracked', 'egg_open',
  'pip_neutral', 'pip_happy', 'pip_sad', 'pip_surprised', 'pip_talk',
  'obj_bed', 'obj_lamp', 'obj_rug', 'obj_teddy_bear', 'obj_ball', 'obj_robot', 'obj_train',
  'obj_bookcase', 'obj_window', 'obj_door',
  'lola_neutral', 'lola_happy', 'lola_sad', 'lola_surprised', 'lola_talk', 'bruno_neutral', 'bruno_happy', 'bruno_sad', 'bruno_surprised', 'bruno_talk', 'ruby_neutral', 'ruby_happy', 'ruby_sad', 'ruby_surprised', 'ruby_talk',
  'stego_neutral', 'stego_happy', 'stego_sad', 'stego_surprised', 'stego_talk', 'brachio_neutral', 'brachio_happy', 'brachio_sad', 'brachio_surprised', 'brachio_talk', 'ptero_neutral', 'ptero_happy', 'ptero_sad', 'ptero_surprised', 'ptero_talk', 'shadow_neutral', 'shadow_happy', 'shadow_sad', 'shadow_surprised', 'shadow_talk', 'para_neutral', 'para_happy', 'para_sad', 'para_surprised', 'para_talk',
  'icon_toys', 'icon_paint', 'icon_write', 'icon_count',
  'paint_ball', 'paint_bed', 'paint_lamp', 'paint_rug', 'paint_teddy_bear', 'paint_robot',
];

export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }
  preload() {
    const bar = this.add.rectangle(W / 2 - 250, H * 0.6, 0, 36, 0x7ed957).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H * 0.6, 500, 36).setStrokeStyle(6, 0x7a4b12);
    this.add.text(W / 2, H * 0.5, 'Loading...', { fontFamily: FONT_TITLE, fontSize: '56px', color: '#2f5d1f' }).setOrigin(0.5);
    this.load.on('progress', (p: number) => { bar.width = 500 * p; });
    this.load.on('loaderror', (file: Phaser.Loader.File) => console.warn('missing asset', file.key));
    IMAGES.forEach((k) => this.load.image(k, `img/${k}.webp`));
    voiceLines.forEach((l) => this.load.audio(l.key, `audio/${l.key}.mp3`));
  }
  create() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 14 : 6;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      pts.push(new Phaser.Math.Vector2(16 + Math.cos(a) * r, 16 + Math.sin(a) * r));
    }
    g.fillPoints(pts, true);
    g.generateTexture('spark', 32, 32);
    g.destroy();
    // soft round shadow
    const sh = this.textures.createCanvas('shadow', 128, 64)!;
    const sctx = sh.getContext();
    const sg = sctx.createRadialGradient(64, 32, 2, 64, 32, 62);
    sg.addColorStop(0, 'rgba(60,35,10,0.85)');
    sg.addColorStop(1, 'rgba(60,35,10,0)');
    sctx.save(); sctx.scale(1, 0.5); sctx.translate(0, 32);
    sctx.fillStyle = sg; sctx.fillRect(0, -32, 128, 128);
    sctx.restore();
    sh.refresh();

    // warm glow dot (lamp light)
    const gl = this.textures.createCanvas('glow', 96, 96)!;
    const gctx = gl.getContext();
    const gg = gctx.createRadialGradient(48, 48, 0, 48, 48, 48);
    gg.addColorStop(0, 'rgba(255,240,180,1)');
    gg.addColorStop(0.35, 'rgba(255,200,90,0.55)');
    gg.addColorStop(1, 'rgba(255,170,60,0)');
    gctx.fillStyle = gg; gctx.fillRect(0, 0, 96, 96);
    gl.refresh();

    // vignette (transparent centre, warm dark edges)
    const vg = this.textures.createCanvas('vignette', 180, 320)!;
    const vctx = vg.getContext();
    const vgr = vctx.createRadialGradient(90, 160, 60, 90, 160, 220);
    vgr.addColorStop(0, 'rgba(70,35,0,0)');
    vgr.addColorStop(1, 'rgba(70,35,0,0.30)');
    vctx.fillStyle = vgr; vctx.fillRect(0, 0, 180, 320);
    vg.refresh();

    // placeholder icon for the Like game (heart); can be swapped for an illustrated one later
    const ic = this.textures.createCanvas('icon_like', 600, 600)!;
    const ictx = ic.getContext();
    heartPath(ictx, 300, 300, 215);
    ictx.fillStyle = '#ff5470'; ictx.fill();
    ictx.lineWidth = 18; ictx.strokeStyle = '#6b3410'; ictx.lineJoin = 'round'; ictx.stroke();
    ictx.fillStyle = 'rgba(255,255,255,0.55)'; ictx.beginPath(); ictx.ellipse(205, 205, 52, 30, -0.7, 0, Math.PI * 2); ictx.fill();
    ic.refresh();

    this.scene.start('Hatch');
  }
}
