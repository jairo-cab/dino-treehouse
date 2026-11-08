import data from './likes.json';
import { slug } from './bedroom';

// Content for the "Like" game (exam: E9 like / don't like, he / she). Every dino likes 2 of the 4 toys and dislikes the other 2.
export type Toy = 'teddy_bear' | 'ball' | 'robot' | 'train';
export interface Taste { he: boolean; likes: Toy[]; dislikes: Toy[] }

export const TASTES = data.dinos as unknown as Record<string, Taste>;
export const plural = (t: Toy): string => (data.toys as Record<string, string>)[t];

// --- sentences (the audio files are made from these exact texts by tools/make_like_lines.py)
export const ASK = 'A toy for me, please!';
export const sayLike = (t: Toy) => `I like ${plural(t)}. ${ASK}`;
export const sayDislike = (t: Toy) => `I don't like ${plural(t)}.`;
export const sayDislikes = (ts: Toy[]) => `${ts.map(sayDislike).join(' ')} ${ASK}`;
export const THANKS = 'Thank you!';
export const question = (he: boolean, t: Toy) => `Does ${he ? 'he' : 'she'} like ${plural(t)}?`;
export const answer = (he: boolean, yes: boolean) => `${yes ? 'Yes' : 'No'}, ${he ? 'he' : 'she'} ${yes ? 'does' : "doesn't"}.`;

// --- audio keys
export const dinoKey = (dino: string, text: string) => `${dino}-${slug(text)}`;   // spoken by the dino's own voice
export const narratorKey = (text: string) => slug(text);                          // spoken by the narrator
