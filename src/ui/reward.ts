import Phaser from 'phaser';
import { nextEgg } from '../content/dinos';
import { fitHeight, speak } from './helpers';

/** At the end of a game: a wobbling egg the child can tap to hatch a new dino (only while there are dinos left to win). */
export function offerEgg(scene: Phaser.Scene, x: number, y: number, height = 170): void {
  if (!nextEgg()) return;
  const egg = fitHeight(scene.add.image(x, y, 'egg_closed'), height).setDepth(940).setAngle(-6);
  scene.tweens.add({ targets: egg, angle: 6, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  scene.tweens.add({ targets: egg, alpha: { from: 0, to: 1 }, duration: 250 });
  scene.time.delayedCall(1700, () => speak(scene, 'new-egg', false));
  egg.setInteractive({ useHandCursor: true });
  egg.on('pointerdown', () => { scene.sound.stopAll(); scene.scene.start('Reward'); });
}
