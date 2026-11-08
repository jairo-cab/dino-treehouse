import Phaser from 'phaser';
import voiceLines from '../content/voice_lines.json';
import { FONT_TITLE, H, W } from '../ui/helpers';

const IMAGES = [
  'bg_bedroom',
  'egg_closed', 'egg_cracked', 'egg_open',
  'pip_neutral', 'pip_happy', 'pip_sad', 'pip_surprised', 'pip_talk',
  'obj_bed', 'obj_lamp', 'obj_rug', 'obj_teddy_bear', 'obj_ball', 'obj_robot', 'obj_train',
  'obj_bookcase', 'obj_window', 'obj_door',
];

// Loads everything, shows a progress bar, then starts the game.
export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    const bar = this.add.rectangle(W / 2 - 250, H * 0.6, 0, 36, 0x7ed957).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H * 0.6, 500, 36).setStrokeStyle(6, 0x7a4b12);
    this.add.text(W / 2, H * 0.5, 'Loading...', { fontFamily: FONT_TITLE, fontSize: '56px', color: '#2f5d1f' }).setOrigin(0.5);
    this.load.on('progress', (p: number) => { bar.width = 500 * p; });

    // a missing audio file must never stop the game
    this.load.on('loaderror', (file: Phaser.Loader.File) => console.warn('missing asset', file.key));

    IMAGES.forEach((k) => this.load.image(k, `img/${k}.webp`));
    voiceLines.forEach((l) => this.load.audio(l.key, `audio/${l.key}.mp3`));
  }

  create() {
    // tiny star texture for the particles (drawn by code, no image needed)
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

    // soft round shadow (radial gradient) used under every object and character
    const sh = this.textures.createCanvas('shadow', 128, 64)!;
    const sctx = sh.getContext();
    const sg = sctx.createRadialGradient(64, 32, 2, 64, 32, 62);
    sg.addColorStop(0, 'rgba(40,20,0,0.9)');
    sg.addColorStop(1, 'rgba(40,20,0,0)');
    sctx.save();
    sctx.scale(1, 0.5);
    sctx.translate(0, 32);
    sctx.fillStyle = sg;
    sctx.fillRect(0, -32, 128, 128);
    sctx.restore();
    sh.refresh();

    // warm glow dot for fairy lights
    const gl = this.textures.createCanvas('glow', 96, 96)!;
    const gctx = gl.getContext();
    const gg = gctx.createRadialGradient(48, 48, 0, 48, 48, 48);
    gg.addColorStop(0, 'rgba(255,240,180,1)');
    gg.addColorStop(0.35, 'rgba(255,200,90,0.55)');
    gg.addColorStop(1, 'rgba(255,170,60,0)');
    gctx.fillStyle = gg;
    gctx.fillRect(0, 0, 96, 96);
    gl.refresh();

    this.scene.start('Hatch');
  }
}
