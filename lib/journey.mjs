// Entries without verified dates stay separate; never infer their position.
export function groupJourney(entries) {
  const dated = [], undated = [];
  const dateValue = (value, end = false) => {
    if (!/^\d{4}(-\d{2})?$/.test(value || '')) return null;
    const [year, month] = value.split('-').map(Number);
    if (month !== undefined && (month < 1 || month > 12)) return null;
    return year * 12 + (month ? month - 1 : end ? 11 : 0);
  };
  for (const entry of entries) {
    const start = dateValue(entry.start);
    const end = entry.end ? dateValue(entry.end, true) : Infinity;
    if (start === null || end === null || end < start) undated.push([entry]);
    else dated.push({ entry, start, end });
  }
  dated.sort((a, b) => a.start - b.start);
  const groups = [];
  for (const item of dated) {
    const previous = groups.at(-1);
    if (previous && item.start <= previous.end) {
      previous.entries.push(item.entry);
      previous.end = Math.max(previous.end, item.end);
    } else groups.push({ end: item.end, entries: [item.entry] });
  }
  return [...groups.reverse().map(g => g.entries.reverse()), ...undated];
}
