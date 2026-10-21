import seed from '../content/initial.json';
export type Translation = { fr?: Record<string, string> };
export type Project = Translation & { id: string; title: string; category: string; summary: string; tags: string[]; problem: string; architecture: string; impact: string; code?: string; video?: string; cover?: string; demo?: boolean };
export type Entry = Translation & { id: string; date: string; title: string; text: string; video?: string };
export type Track = Translation & { id: string; title: string; note: string; audio: string; year?: string; releaseDate?: string; youtube?: string; cover?: string };
export type Content = { email: string; github: string; linkedin: string; journey: (Translation & {period: string; title: string; text: string; start?: string; end?: string})[]; projects: Project[]; entries: Entry[]; tracks: Track[] };
export const initialContent: Content = seed;
