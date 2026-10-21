export function validReleaseDate(value: unknown): boolean;
export function sortTracks<T extends {year?: string; releaseDate?: string}>(tracks: readonly T[]): T[];
