import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectRoot, mediaReferences, maxMediaBytes } from './export-pages.mjs';

export function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {stdio: 'inherit', shell: false, ...options});
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${path.basename(command)} a échoué (code ${code}).`)));
  });
}

export async function buildPages({root = projectRoot} = {}) {
  const config = JSON.parse(await readFile(path.join(root, 'publish.config.json'), 'utf8'));
  if (!/^\/[a-zA-Z0-9_-]+$/.test(config.basePath)) throw new Error('Préfixe Pages invalide.');
  const snapshot = JSON.parse(await readFile(path.join(root, 'content/initial.json'), 'utf8'));
  for (const filename of mediaReferences(snapshot)) {
    const info = await stat(path.join(root, 'public/media', filename));
    if (!info.isFile() || info.size > maxMediaBytes) throw new Error('Média invalide : ' + filename);
  }
  // Isolated source tree: the local admin is never part of the public build input.
  const stage = path.join(root, '.pages-build');
  await rm(stage, {recursive: true, force: true});
  await mkdir(stage);
  for (const name of ['app', 'components', 'hooks', 'lib', 'content', 'public', 'package.json', 'tsconfig.json', 'vite.config.ts', 'next.config.ts']) {
    await cp(path.join(root, name), path.join(stage, name), {recursive: true,
      filter: source => source !== path.join(root, 'app/admin')});
  }
  await run(process.execPath, [path.join(root, 'node_modules/vinext/dist/cli.js'), 'build'], {
    cwd: stage, env: {...process.env, NEXT_PUBLIC_PAGES_BUILD: 'true', NEXT_PUBLIC_BASE_PATH: config.basePath},
  });
  const output = path.join(stage, 'dist/client');
  // Vinext's speculative prerender follows neither basePath nor slash redirects.
  // Render slashless framework routes, then package directory indexes for Pages.
  for (const route of ['projects', 'owly', 'devlog']) {
    await mkdir(path.join(output, route), {recursive: true});
    await cp(path.join(output, route + '.html'), path.join(output, route, 'index.html'));
  }
  // The current font plugin emits root-relative font URLs even with Vite base.
  // Patch generated text only; already-prefixed asset references stay intact.
  for (const filename of await readdir(output, {recursive: true})) {
    if (!/\.(html|rsc|css|js|json)$/.test(filename)) continue;
    const target = path.join(output, filename);
    const text = await readFile(target, 'utf8');
    const patched = text.replace(/(?<![a-zA-Z0-9_\/-])\/_next\/static\/_vinext_fonts\//g, config.basePath + '/_next/static/_vinext_fonts/');
    if (patched !== text) await writeFile(target, patched);
  }
  await writeFile(path.join(output, '.nojekyll'), '');
  const html = await readFile(path.join(output, 'index.html'), 'utf8');
  if (!html.includes(config.basePath + '/')) throw new Error('Préfixe absent du HTML exporté.');
  for (const route of ['projects', 'owly', 'devlog']) await stat(path.join(output, route, 'index.html'));
  // Resolve every root-relative link and CSS URL in exported HTML, including fonts.
  for (const filename of ['index.html', 'projects/index.html', 'owly/index.html', 'devlog/index.html']) {
    const page = await readFile(path.join(output, filename), 'utf8');
    const urls = [...page.matchAll(/(?:src|href)="(\/[^"<>]+)"|url\(['"]?(\/[^)'"\s]+)['"]?\)/g)].map(match => match[1] || match[2]);
    for (const url of urls) {
      if (url.startsWith('//')) continue;
      if (!url.startsWith(config.basePath + '/')) throw new Error(`URL hors du préfixe Pages : ${url}`);
      const relative = url.slice(config.basePath.length + 1).split(/[?#]/)[0];
      await stat(path.join(output, relative.endsWith('/') || !relative ? relative + 'index.html' : relative));
    }
  }
  const files = await readdir(output, {recursive: true});
  if (files.some(name => /(^|[\\/])admin(?:[.\\/]|$)/.test(name))) throw new Error('Administration présente dans l’export.');
  let size = 0;
  for (const filename of files) { const info = await stat(path.join(output, filename)); if (info.isFile()) size += info.size; }
  if (size > 1024 ** 3) throw new Error('Le site dépasse la limite de 1 Gio de GitHub Pages.');
  const destination = path.join(root, 'dist/pages');
  await rm(destination, {recursive: true, force: true});
  await cp(output, destination, {recursive: true});
  console.log(`Export GitHub Pages prêt : dist/pages (${(size / 1024 ** 2).toFixed(1)} Mio), préfixe ${config.basePath}/`);
  return destination;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await buildPages(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
