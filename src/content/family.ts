import data from './family.json';
import { slug } from './bedroom';

// Content for the "Family" game (exam: family words, he / she, read and match).
export type Member = 'mum' | 'dad' | 'grandma' | 'grandpa' | 'sister' | 'brother' | 'baby' | 'dog';
export const MEMBERS = Object.keys(data.members) as Member[];
export const info = (m: Member) => (data.members as Record<string, { word: string; he: boolean; line: string; where: string }>)[m];
export interface Clue { text: string; answer: Member; others: Member[] }
export const CLUES = data.clues as Clue[];
export const key = (text: string): string => slug(text);

/** How tall each family member really is (1 = dad): "tall / small" can then be SEEN in the picture. */
export const REL: Record<string, number> = { dad: 1, mum: 0.94, grandpa: 0.84, grandma: 0.8, brother: 0.72, sister: 0.7, baby: 0.55, dog: 0.48 };
