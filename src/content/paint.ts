// "Magic brush": listen and colour. Colours + objects come straight from the exam syllabus.
export type ColourKey = 'black' | 'blue' | 'brown' | 'green' | 'orange' | 'red' | 'white' | 'yellow';
export type PaintObj = 'ball' | 'bed' | 'lamp' | 'rug' | 'teddy_bear' | 'robot';

export const COLOUR_ORDER: ColourKey[] = ['black', 'blue', 'brown', 'green', 'orange', 'red', 'white', 'yellow'];

// hex used to tint the grey drawings
export const COLOUR_HEX: Record<ColourKey, number> = {
  black: 0x3a3a3a, blue: 0x2f80ed, brown: 0x8b5a2b, green: 0x4caf50,
  orange: 0xff9800, red: 0xe53935, white: 0xffffff, yellow: 0xffd600,
};

export const OBJ_NAME: Record<PaintObj, string> = {
  ball: 'ball', bed: 'bed', lamp: 'lamp', rug: 'rug', teddy_bear: 'teddy bear', robot: 'robot',
};

export interface PaintTask { obj: PaintObj; colour: ColourKey }

export const PAINT_TASKS: PaintTask[] = [
  { obj: 'ball', colour: 'red' },
  { obj: 'bed', colour: 'blue' },
  { obj: 'lamp', colour: 'yellow' },
  { obj: 'rug', colour: 'green' },
  { obj: 'teddy_bear', colour: 'brown' },
  { obj: 'robot', colour: 'orange' },
];

export const paintSentence = (t: PaintTask) => `Colour the ${OBJ_NAME[t.obj]} ${t.colour}.`;
