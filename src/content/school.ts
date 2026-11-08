import data from './school.json';
import { slug } from './bedroom';

// Content for the "School" game (exam: E2 classroom instructions + school objects).
export type Item = 'pencil' | 'crayon' | 'rubber' | 'pen' | 'ruler' | 'pencil_case';
export const ITEMS = Object.keys(data.items) as Item[];
export const itemName = (i: Item): string => (data.items as Record<string, string>)[i];

export type Kind = 'stand' | 'sit' | 'open' | 'close' | 'take' | 'put';
export interface Command { kind: Kind; item?: Item; please: boolean }

// texts: the audio files are made from these exact strings by tools/make_school_lines.py
export function commandText(c: Command): string {
  const p = c.please ? ', please.' : '.';
  switch (c.kind) {
    case 'stand': return 'Stand up!';
    case 'sit': return 'Sit down!';
    case 'open': return `Open your book${p}`;
    case 'close': return `Close your book${p}`;
    case 'take': return `Take out your ${itemName(c.item!)}${p}`;
    case 'put': return `Put away your ${itemName(c.item!)}${p}`;
  }
}
export const commandKey = (c: Command): string => slug(commandText(c));
export const nameKey = (name: string): string => slug(name);
