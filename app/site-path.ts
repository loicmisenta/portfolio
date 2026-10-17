export const pagesBuild = process.env.NEXT_PUBLIC_PAGES_BUILD === 'true';
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Content keeps portable /media URLs; only the public renderer adds the prefix.
export function sitePath(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//')) return value;
  if (basePath && (value === basePath || value.startsWith(basePath + '/'))) return value;
  return basePath + value;
}

export function pagePath(value: string): string {
  const url = sitePath(value);
  return url.endsWith('/') ? url : url + '/';
}
