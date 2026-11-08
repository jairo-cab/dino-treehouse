import Phaser from 'phaser';
import { DINOS, introKeys, introLines, isOwned } from '../content/dinos';
import { H, W, bubble, burst, cover, fitHeight, FONT_TITLE, homeButton, motes, panel, speak, vignette } from '../ui/helpers';

/** The collection: owned dinos in colour (tap to hear them), the rest as mystery silhouettes. */
export class DinosScene extends Phaser.Scene {
  private box?: Phaser.GameObjects.Container;
  private talk?: Phaser.Time.TimerEvent;
  constructor() { super('Dinos'); }

  create(data: { just?: string }) {
    this.box = undefined; this.talk = undefined;
    this.cameras.main.fadeIn(180);
    cover(this, 'bg_bedroom');
    homeButton(this);
    motes(this); vignette(this);
    const owned = DINOS.filter((d) => isOwned(d.key)).length;
    this.add.text(W / 2, 140, `My dinos  ${owned}/${DINOS.length}`, {
      fontFamily: FONT_TITLE, fontSize: '64px', fontStyle: 'bold', color: '#fff6e4', stroke: '#6a4a20', strokeThickness: 12,
    }).setOrigin(0.5);
    panel(this, 24, 220, W - 48, 860);
    DINOS.forEach((d, i) => {
      const x = i % 2 === 0 ? 195 : 525, y = i < 2 ? 520 : 900;
      const own = isOwned(d.key);
      const cell = this.add.container(x, y).setDepth(10);
      const pic = this.add.image(0, 0, `${d.key}_${own ? 'happy' : 'neutral'}`).setOrigin(0.5, 1);
      pic.setScale(280 / pic.height);
      pic.y = 150;
      if (!own) { pic.setTint(0x3a2c20); pic.setAlpha(0.4); }
      const name = this.add.text(0, 180, own ? d.name : '?', { fontFamily: FONT_TITLE, fontSize: '52px', fontStyle: 'bold', color: '#5a3200' }).setOrigin(0.5);
      cell.add([pic, name]);
      if (own) {
        pic.setInteractive({ useHandCursor: true });
        pic.on('pointerdown', () => this.meet(d.key, cell));
        if (data?.just === d.key) { burst(this, x, y - 40, 24); this.tweens.add({ targets: pic, y: 130, duration: 160, yoyo: true, repeat: 2 }); }
      }
    });
  }

  /** Tap a dino: it says its three sentences one after the other. */
  private meet(key: string, cell: Phaser.GameObjects.Container) {
    const d = DINOS.find((x) => x.key === key)!;
    const keys = introKeys(d), lines = introLines(d);
    const play = (i: number) => {
      if (i >= 3) { this.box?.destroy(); return; }
      this.box?.destroy();
      this.box = bubble(this, W / 2, 1180, 640, lines[i], keys[i]);
      this.sound.stopAll();
      const s = this.sound.add(keys[i]);
      s.play();
      // advance by the clip length (does not depend on the 'complete' event, which can be missed)
      this.talk?.remove();
      this.talk = this.time.delayedCall((s.duration || 2.5) * 1000 + 350, () => play(i + 1));
    };
    this.tweens.add({ targets: cell, y: cell.y - 14, duration: 120, yoyo: true });
    play(0);
  }
}
void H; void fitHeight; void speak;
