export function validReleaseDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function sortTracks(tracks) {
  const date = track => track.releaseDate || (track.year ? track.year + '-01-01' : '');
  return [...tracks].sort((a, b) => date(b).localeCompare(date(a)));
}

export function validYoutubeUrl(value) {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.port && ['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(url.hostname); } catch { return false; }
}
