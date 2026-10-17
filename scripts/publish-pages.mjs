import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { open, readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectRoot, exportPages } from './export-pages.mjs';
import { buildPages } from './build-pages.mjs';

const execute = promisify(execFile);
const isPublicContent = name => name === 'content/initial.json' || /^public\/media\/[a-f0-9-]+\.(mp3|wav|ogg|flac|m4a|mp4|webm|jpg|png|webp)$/.test(name);

export async function publishPages({root = projectRoot, dataDir, onProgress = () => {}} = {}) {
  const lockPath = path.join(root, '.publish-pages.lock');
  let lock;
  try { lock = await open(lockPath, 'wx'); }
  catch (error) { if (error.code === 'EEXIST') throw new Error('Une publication est déjà en cours. Si le studio a été arrêté brutalement, retirez .publish-pages.lock après avoir vérifié qu’aucune publication ne tourne.'); throw error; }
  try { return await performPublication({root, dataDir, onProgress}); }
  finally { await lock.close(); await unlink(lockPath); }
}

async function performPublication({root, dataDir, onProgress}) {
  const config = JSON.parse(await readFile(path.join(root, 'publish.config.json'), 'utf8'));
  if (!/^[a-zA-Z0-9-]+\/[a-zA-Z0-9_.-]+$/.test(config.repository)) throw new Error('Dépôt GitHub invalide.');
  const git = async (...args) => {
    try {
      return (await execute('git', ['-c', 'credential.interactive=never', ...args], {
        cwd: root, timeout: 120000, maxBuffer: 1024 * 1024,
        env: {...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never'},
      })).stdout.trim();
    } catch {
      throw new Error(`Échec de git ${args[0]}. Vérifiez le dépôt, la connexion GitHub et les droits d’écriture dans un terminal. Aucun push forcé n’a été effectué.`);
    }
  };
  // Keep the two leading status columns: trimming would discard the first space.
  const rawChanges = async () => {
    const {stdout} = await execute('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--no-renames'], {cwd: root, maxBuffer: 1024 * 1024});
    return stdout.split('\0').filter(Boolean);
  };
  const checkWorktree = async () => {
    const rows = await rawChanges();
    if (rows.some(row => row[0] !== ' ' && row[0] !== '?')) throw new Error('Des fichiers sont déjà préparés dans Git. Terminez votre commit avant de publier.');
    if (rows.some(row => !isPublicContent(row.slice(3)))) throw new Error('Des changements de code attendent un commit. Enregistrez-les dans Git avant de publier le contenu.');
  };
  onProgress('Vérification du dépôt Git…');
  const top = await git('rev-parse', '--show-toplevel');
  if (path.resolve(top).toLowerCase() !== path.resolve(root).toLowerCase()) throw new Error('Initialisez un dépôt Git dans le dossier du site.');
  if (await git('branch', '--show-current') !== 'main') throw new Error('La publication doit partir de la branche main.');
  const expected = config.repository.toLowerCase();
  for (const args of [['remote','get-url','--all','origin'], ['remote','get-url','--push','--all','origin']]) {
    const remotes = (await git(...args)).split('\n');
    if (remotes.length !== 1) throw new Error('Utilisez une seule destination GitHub pour origin.');
    const match = /^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([^\s]+?)(?:\.git)?\/?$/.exec(remotes[0]);
    if (!match || match[1].toLowerCase() !== expected) throw new Error(`Le remote origin (lecture et publication) doit pointer vers ${config.repository}.`);
  }
  await checkWorktree();
  await git('fetch', 'origin', 'main');
  const behind = Number(await git('rev-list', '--count', 'HEAD..origin/main'));
  if (behind) throw new Error('GitHub contient des changements absents de ce PC. Synchronisez le dépôt dans un terminal avant de publier.');
  onProgress('Export du contenu et des médias…');
  await exportPages({root, ...(dataDir ? {dataDir} : {})});
  onProgress('Construction et vérification du site public…');
  await buildPages({root});
  await checkWorktree();
  const modified = await rawChanges();
  if (modified.length) {
    await git('add', '--', 'content/initial.json', 'public/media');
    onProgress('Création du commit…');
    await git('commit', '-m', 'Publish portfolio content');
  }
  onProgress('Envoi sur GitHub…');
  // Also sends a previous commit when an earlier push failed. Never force-push.
  await git('push', 'origin', 'HEAD:main');
  const commit = await git('rev-parse', 'HEAD');
  return {
    commit,
    actionsUrl: `https://github.com/${config.repository}/actions`,
    siteUrl: `https://${config.repository.split('/')[0]}.github.io${config.basePath}/`,
    message: 'Envoyé sur GitHub. Le site sera mis à jour après la réussite du déploiement dans Actions.',
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(await publishPages({onProgress: console.log})); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
