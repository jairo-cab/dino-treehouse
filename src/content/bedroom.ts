// Content for "Pip's bedroom": all English, driven by data so we can add tasks without touching scene code.
export type ToyKey = 'teddy_bear' | 'ball' | 'robot' | 'train';
export type ZoneKey = 'bed' | 'rug' | 'bookcase';

export const TOY_NAME: Record<ToyKey, string> = {
  teddy_bear: 'teddy bear',
  ball: 'ball',
  robot: 'robot',
  train: 'train',
};

// preposition + furniture phrase, and where a toy has to be dropped to count
export const ZONE_PHRASE: Record<ZoneKey, string> = {
  bed: 'on the bed',
  rug: 'on the rug',
  bookcase: 'in front of the bookcase',
};

export interface Task { toy: ToyKey; zone: ZoneKey }

export const TASKS: Task[] = [
  { toy: 'teddy_bear', zone: 'bed' },
  { toy: 'ball', zone: 'rug' },
  { toy: 'robot', zone: 'bookcase' },
  { toy: 'train', zone: 'rug' },
  { toy: 'robot', zone: 'bed' },
  { toy: 'teddy_bear', zone: 'bookcase' },
];

export const sentenceFor = (t: Task) => `Put the ${TOY_NAME[t.toy]} ${ZONE_PHRASE[t.zone]}.`;

// audio file key for a sentence, e.g. "Put the ball on the rug." -> "put-the-ball-on-the-rug"
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z' ]/g, '').replace(/'/g, '').trim().replace(/\s+/g, '-');

export const PRAISE = ['Well done!', 'Great!', 'Yes!', 'Super!'];

/** A fresh set of requests every time: any toy x any place, never the same toy twice in a row. */
export function makeTasks(n = 6): Task[] {
  const toys = Object.keys(TOY_NAME) as ToyKey[], zones = Object.keys(ZONE_PHRASE) as ZoneKey[];
  const all: Task[] = toys.flatMap((toy) => zones.map((zone) => ({ toy, zone })));
  for (let attempt = 0; attempt < 50; attempt++) {
    const pick = [...all].sort(() => Math.random() - 0.5).slice(0, n);
    if (pick.every((t, i) => i === 0 || t.toy !== pick[i - 1].toy)) return pick;
  }
  return [...all].sort(() => Math.random() - 0.5).slice(0, n);
}
