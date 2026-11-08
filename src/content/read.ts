import bank from './read.json';
import { slug } from './bedroom';

// Exam formats: READ AND COMPLETE (pick the word) and READ AND CIRCLE (pick the picture).
export type DinoPic = [string, string];                       // [dino key, face]
export interface Complete { topic: string; text: string; options: string[]; answer: string; dinos?: DinoPic[]; obj?: string; count?: number }
export interface Option { dinos?: DinoPic[]; objs?: string[]; badge?: string }
export interface Circle { topic: string; text: string; options: Option[]; answer: number }

export const COMPLETE = bank.complete as Complete[];
export const CIRCLE = bank.circle as Circle[];
export const filled = (c: Complete): string => c.text.replace('___', c.answer);
export const filledKey = (c: Complete): string => slug(filled(c));
export const circleKey = (c: Circle): string => slug(c.text);
