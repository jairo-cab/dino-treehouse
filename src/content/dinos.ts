import { slug } from './bedroom';
import { TASTES } from './likes';

export interface Dino {
  key: string;        // texture prefix: <key>_neutral, <key>_happy ...
  name: string;
  age: string;        // number word ("seven")
  likes: string;      // "the ball"
  voice: string;      // Kokoro British voice
  pitch: number;      // child-like pitch ratio
  host: string;       // the game this dino hosts ('' = none)
}

// Names and details are placeholders chosen by Claude: change them here (and re-run tools/make_voices.py).
export const DINOS: Dino[] = [
  { key: 'pip', name: 'Mark', age: 'six', likes: 'the train', voice: 'bf_lily', pitch: 1.38, host: 'Bedroom' },
  { key: 'lola', name: 'Lola', age: 'seven', likes: 'the ball', voice: 'bf_isabella', pitch: 1.3, host: 'Count' },
  { key: 'bruno', name: 'Bruno', age: 'eight', likes: 'the robot', voice: 'bm_lewis', pitch: 1.25, host: 'Spell' },
  { key: 'ruby', name: 'Sara', age: 'nine', likes: 'the teddy bear', voice: 'bf_alice', pitch: 1.3, host: 'Paint' },
  { key: 'stego', name: 'Harry', age: 'five', likes: 'balls', voice: 'bm_george', pitch: 1.25, host: '' },
  { key: 'brachio', name: 'Mia', age: 'four', likes: 'teddy bears', voice: 'bf_emma', pitch: 1.4, host: '' },
  { key: 'ptero', name: 'Nina', age: 'three', likes: 'trains', voice: 'bf_alice', pitch: 1.45, host: '' },
  { key: 'shadow', name: 'Frank', age: 'two', likes: 'robots', voice: 'bm_fable', pitch: 1.25, host: '' },
  { key: 'para', name: 'Luna', age: 'one', likes: 'trains and robots', voice: 'bf_isabella', pitch: 1.45, host: '' },
];
export const EARNABLE = DINOS.filter((d) => d.key !== 'pip');   // Pip is always there; the others are won with eggs

export const isBoy = (d: Dino): boolean => TASTES[d.key]?.he ?? true;
export const introLines = (d: Dino): string[] => [
  `Hi! My name's ${d.name}.`, isBoy(d) ? "I'm a boy." : "I'm a girl.",
  `I'm ${d.age} ${d.age === 'one' ? 'year' : 'years'} old.`, `I like ${d.likes}.`,
];
// the boy/girl line is spoken by each dino's own voice, so its audio key carries the dino's key
export const introKeys = (d: Dino): string[] => introLines(d).map((l, i) => (i === 1 ? `${d.key}-${slug(l)}` : slug(l)));

// --- collection, saved on this device only (no accounts, no data leaves the phone)
const KEY = 'dino-treehouse-collection';
let mem: string[] | null = null;
export function unlocked(): string[] {
  if (mem) return mem;
  try { mem = JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]; } catch { mem = []; }
  return mem;
}
export function unlock(key: string): void {
  const u = unlocked();
  if (!u.includes(key)) mem = [...u, key];
  try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* private mode: lives only until the page closes */ }
}
/** Forget every dino won so far (the child starts the egg challenge again). */
export function resetCollection(): void {
  mem = [];
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
export const isOwned = (key: string): boolean => key === 'pip' || unlocked().includes(key);
/** Next dino the child has not won yet (null when the collection is complete). */
export const nextEgg = (): Dino | null => EARNABLE.find((d) => !unlocked().includes(d.key)) ?? null;
/** The dino that hosts a game: its own dino once won, Pip until then. */
export const hostOf = (scene: string): string => {
  const d = DINOS.find((x) => x.host === scene);
  return d && isOwned(d.key) ? d.key : 'pip';
};
