import data from './family.json';
import { slug } from './bedroom';

// Content for the "Family" game (exam: family words, he / she, read and match).
export type Member = 'mum' | 'dad' | 'grandma' | 'grandpa' | 'sister' | 'brother' | 'baby' | 'dog';
export const MEMBERS = Object.keys(data.members) as Member[];
export const info = (m: Member) => (data.members as Record<string, { word: string; he: boolean; line: string; where: string }>)[m];
export interface Clue { text: string; answer: Member; others: Member[] }
export const CLUES = data.clues as Clue[];
export const key = (text: string): string => slug(text);
