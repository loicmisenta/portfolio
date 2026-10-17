import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { exportPages, maxMediaBytes } from '../scripts/export-pages.mjs';
import { publishPages } from '../scripts/publish-pages.mjs';

const filename = '12345678-abcd-1234-abcd-123456789abc.mp3';
const unused = 'aaaaaaaa-abcd-1234-abcd-123456789abc.mp3';
const content = {email:'test@example.com',github:'https://github.com/example',linkedin:'',journey:[],projects:[],entries:[],tracks:[{id:'song',title:'Title',note:'',audio:'/media/' + filename}]};

async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'portfolio-pages-'));
  t.after(() => rm(root, {recursive:true, force:true}));
  for (const dir of ['content','data/media','public/media']) await mkdir(path.join(root,dir), {recursive:true});
  await writeFile(path.join(root,'content/initial.json'), JSON.stringify({...content,tracks:[]}));
  await writeFile(path.join(root,'data/content.json'), JSON.stringify(content));
  await writeFile(path.join(root,'data/admin.json'), 'private-password-hash');
  await writeFile(path.join(root,'data/media',filename), 'ID3-audio-fixture');
  return root;
}

test('Public export preserves current content and copies only referenced media', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root,'data/media',unused), 'unreferenced-local-original');
  await writeFile(path.join(root,'public/media',unused), 'previously-published');
  await exportPages({root});
  assert.deepEqual(JSON.parse(await readFile(path.join(root,'content/initial.json'),'utf8')),content);
  assert.deepEqual(await readdir(path.join(root,'public/media')),[filename]);
  assert.equal(await readFile(path.join(root,'public/media',filename),'utf8'),'ID3-audio-fixture');
  assert.equal(await readFile(path.join(root,'data/admin.json'),'utf8'),'private-password-hash');
  assert.equal((await stat(path.join(root,'data/media',unused))).isFile(),true);
  // A fresh checkout can reuse the already-exported public media without data/.
  await rm(path.join(root,'data'), {recursive:true});
  await exportPages({root});
  assert.deepEqual(await readdir(path.join(root,'public/media')),[filename]);
});

test('Missing, oversized and traversal media fail before updating the snapshot', async t => {
  const root = await fixture(t);
  const before = await readFile(path.join(root,'content/initial.json'),'utf8');
  await rm(path.join(root,'data/media',filename));
  await assert.rejects(exportPages({root}), /ENOENT/);
  assert.equal(await readFile(path.join(root,'content/initial.json'),'utf8'),before);
  const file = await import('node:fs/promises').then(fs => fs.open(path.join(root,'data/media',filename),'w'));
  await file.truncate(maxMediaBytes + 1); await file.close();
  await assert.rejects(exportPages({root}), /95 Mio/);
  await writeFile(path.join(root,'data/content.json'),JSON.stringify({...content,tracks:[{...content.tracks[0],audio:'/media/../admin.json'}]}));
  await assert.rejects(exportPages({root}), /Chemin média invalide/);
  assert.equal(await readFile(path.join(root,'content/initial.json'),'utf8'),before);
});

test('Publishing refuses unrelated changes, staged secrets and concurrent runs before network access', async t => {
  const root = await fixture(t);
  const git = (...args) => execFileSync('git',args,{cwd:root,stdio:'pipe'}).toString();
  await writeFile(path.join(root,'publish.config.json'),JSON.stringify({repository:'example/portfolio',basePath:'/portfolio'}));
  await writeFile(path.join(root,'.gitignore'),'data/\n.publish-pages.lock\n');
  git('init','-b','main');git('config','user.name','Test');git('config','user.email','test@example.com');
  git('add','.');git('commit','-m','Initial fixture');git('remote','add','origin','https://github.com/example/portfolio.git');
  const initial = git('rev-parse','HEAD');
  await writeFile(path.join(root,'unrelated.txt'),'work in progress');
  await assert.rejects(publishPages({root}), /changements de code/);
  assert.equal(git('rev-parse','HEAD'),initial);
  git('add','unrelated.txt');
  await assert.rejects(publishPages({root}), /déjà préparés/);
  await writeFile(path.join(root,'.publish-pages.lock'),'another run');
  await assert.rejects(publishPages({root}), /déjà en cours/);
});
