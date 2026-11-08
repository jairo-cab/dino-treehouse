import bank from './read.json';
import { slug } from './bedroom';
import { CLUES, MEMBERS, info, type Member } from './family';

// Exam formats: READ AND COMPLETE (pick the word) and READ AND CIRCLE (pick the picture).
export type DinoPic = [string, string];                       // [dino key, face]
export interface Complete { topic: string; text: string; options: string[]; answer: string; dinos?: DinoPic[]; obj?: string; count?: number }
export interface Option { dinos?: DinoPic[]; objs?: string[]; badge?: string }
export interface Circle { topic: string; text: string; options: Option[]; answer: number }

export const COMPLETE = bank.complete as Complete[];
const BASE_CIRCLE = bank.circle as Circle[];
const shuffled = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);
const pics = (ms: Member[]): Option[] => ms.map((m) => ({ objs: [`obj_${m}`] }));
/** The read-and-circle bank plus the family items, with fresh random distractors every time it is asked for. */
export function allCircles(): Circle[] {
  const where = MEMBERS.map((m): Circle => {
    const options = shuffled([m, ...shuffled(MEMBERS.filter((x) => x !== m)).slice(0, 2)]);
    return { topic: 'family', text: info(m).where, options: pics(options), answer: options.indexOf(m) };
  });
  const clues = CLUES.map((c): Circle => {
    const options = shuffled([c.answer, ...c.others]);
    return { topic: 'family', text: c.text, options: pics(options), answer: options.indexOf(c.answer) };
  });
  return [...BASE_CIRCLE, ...where, ...clues];
}
export const filled = (c: Complete): string => c.text.replace('___', c.answer);
export const filledKey = (c: Complete): string => slug(filled(c));
export const circleKey = (c: Circle): string => slug(c.text);
