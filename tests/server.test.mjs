import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
const temp=await mkdtemp(path.join(tmpdir(),'portfolio-test-'));
let child,base,cookie;
async function start(){child=spawn(process.execPath,['server.mjs'],{env:{...process.env,DATA_DIR:temp,HOST:'127.0.0.1',LOCAL_PUBLISH_ENABLED:'false',PORT:'0',ADMIN_PASSWORD:'test-only-password-12345'},stdio:['ignore','pipe','pipe']});let output='';base=await new Promise((resolve,reject)=>{child.stdout.on('data',c=>{output+=c;const m=output.match(/http:\/\/127.0.0.1:(\d+)/);if(m)resolve(m[0])});child.on('error',reject);child.on('exit',code=>reject(new Error('Server stopped '+code)));});}
async function stop(){if(!child||child.exitCode!==null)return;const done=once(child,'exit');child.kill();await done;}
const request=(url,method='GET',body,headers={})=>fetch(base+url,{method,headers:{'X-Portfolio-Request':'1',...(cookie?{Cookie:cookie}:{}),...headers},body});
test('Persistent publishing, authentication, uploads and media streaming',async t=>{
 try{await start();
 await t.test('publication endpoints require a session',async()=>{assert.equal((await request('/api/publish')).status,401);assert.equal((await request('/api/publish','POST')).status,401);});
 await t.test('anonymous reads allowed, mutations denied',async()=>{assert.equal((await request('/api/content')).status,200);assert.equal((await request('/api/content','PUT','{}')).status,401);assert.equal((await request('/api/upload','POST','abc',{'Content-Type':'audio/mpeg'})).status,401);});
 await t.test('password and origin checked',async()=>{assert.equal((await request('/api/login','POST',JSON.stringify({password:'wrong'}))).status,401);assert.equal((await request('/api/login','POST',JSON.stringify({password:'test-only-password-12345'}),{Origin:'https://other.example'})).status,403);const r=await request('/api/login','POST',JSON.stringify({password:'test-only-password-12345'}));assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];assert.match(r.headers.get('set-cookie'),/HttpOnly/);});
 await t.test('publishing is disabled outside the local studio launcher',async()=>{const status=await request('/api/publish');assert.equal(status.status,200);assert.equal((await status.json()).enabled,false);assert.equal((await request('/api/publish','POST')).status,403);});
 let media;
 await t.test('upload whitelist, valid file and range playback',async()=>{assert.equal((await request('/api/upload','POST','<script/>',{'Content-Type':'text/html'})).status,415);const r=await request('/api/upload','POST',Buffer.from('ID3-test-fixture'),{'Content-Type':'audio/mpeg'});assert.equal(r.status,201);media=(await r.json()).url;const range=await request(media,'GET',undefined,{Range:'bytes=0-2'});assert.equal(range.status,206);assert.equal(await range.text(),'ID3');assert.equal((await request(media,'HEAD')).headers.get('content-length'),'16');assert.equal((await request(media,'GET',undefined,{Range:'bytes=9999-'})).status,416);});
 await t.test('invalid content rejected and publication stored',async()=>{assert.equal((await request('/api/content','PUT','{}')).status,400);const c=await (await request('/api/content')).json();c.tracks=[{id:'test-track',title:'Test audio',note:'Fixture',audio:media}];c.projects[0].code='javascript:alert(1)';assert.equal((await request('/api/content','PUT',JSON.stringify(c))).status,400);c.projects[0].code='https://github.com/loicmisenta';assert.equal((await request('/api/content','PUT',JSON.stringify(c))).status,200);assert.equal(JSON.parse(await readFile(path.join(temp,'content.json'),'utf8')).tracks[0].title,'Test audio');});
 await t.test('French translations persist and cannot override media URLs',async()=>{const c=await(await request('/api/content')).json();c.tracks[0].fr={note:'Version française'};assert.equal((await request('/api/content','PUT',JSON.stringify(c))).status,200);const saved=await(await request('/api/content')).json();assert.equal(saved.tracks[0].note,'Fixture');assert.equal(saved.tracks[0].fr.note,'Version française');c.tracks[0].fr.audio='javascript:alert(1)';assert.equal((await request('/api/content','PUT',JSON.stringify(c))).status,400);});
 await t.test('private files cannot be served',async()=>{assert.equal((await request('/data/admin.json')).status,404);assert.equal((await request('/media/..%2fadmin.json')).status,404);});
 await t.test('content and media survive a restart, session does not',async()=>{await stop();await start();const c=await(await request('/api/content')).json();assert.equal(c.tracks[0].title,'Test audio');assert.equal((await request(media)).status,200);assert.equal((await request('/api/content','PUT',JSON.stringify(c))).status,401);});
 }finally{await stop();await rm(temp,{recursive:true,force:true});}
});
