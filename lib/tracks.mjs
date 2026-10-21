export function validReleaseDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function sortTracks(tracks) {
  const date = track => track.releaseDate || (track.year ? track.year + '-01-01' : '');
  return [...tracks].sort((a, b) => date(b).localeCompare(date(a)));
}
