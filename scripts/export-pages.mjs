import { prepareWaveforms } from '../lib/audio-waveform.mjs';
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const maxMediaBytes = 95 * 1024 * 1024;
export function mediaReferences(content) {
  const urls = [...content.projects.flatMap(p => [p.cover, p.video]),
    ...content.entries.map(e => e.video), ...content.tracks.flatMap(t => [t.audio, t.cover])];
  return [...new Set(urls.filter(url => typeof url === 'string' && url.startsWith('/media/')).map(url => {
    if (!/^\/media\/[a-f0-9-]+\.(mp3|wav|ogg|flac|m4a|mp4|webm|jpg|png|webp)$/.test(url)) throw new Error('Chemin média invalide : ' + url);
    return url.slice('/media/'.length);
  }))];
}

export async function exportPages({root = projectRoot, dataDir = path.resolve(process.env.DATA_DIR || path.join(root, 'data'))} = {}) {
  const destination = path.join(root, 'public/media');
  let source;
  try { source = await readFile(path.join(dataDir, 'content.json'), 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; source = await readFile(path.join(root, 'content/initial.json'), 'utf8'); }
  const content = JSON.parse(source);
  await prepareWaveforms(content, [path.join(dataDir, 'media'), destination]);
  const files = mediaReferences(content);
  const copies = [];
  // Check every source before modifying the exported snapshot.
  for (const filename of files) {
    let from = path.join(dataDir, 'media', filename);
    try { await stat(from); } catch (error) { if (error.code !== 'ENOENT') throw error; from = path.join(destination, filename); }
    const info = await stat(from);
    if (!info.isFile() || info.size > maxMediaBytes) throw new Error(`Média absent ou supérieur à 95 Mio : ${filename}`);
    copies.push({from, filename});
  }
  await mkdir(destination, {recursive: true});
  for (const {from, filename} of copies) {
    const target = path.join(destination, filename);
    if (from !== target) await copyFile(from, target);
  }
  // Only remove generated UUID media, never unrelated user files or local originals.
  for (const filename of await readdir(destination)) {
    if (/^[a-f0-9-]+\.[a-z0-9]+$/.test(filename) && !files.includes(filename)) await rm(path.join(destination, filename));
  }
  await writeFile(path.join(root, 'content/initial.json'), JSON.stringify(content, null, 2) + '\n');
  return {media: files.length};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log('Export public prêt :', await exportPages()); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
