import { validReleaseDate, validYoutubeUrl } from './lib/tracks.mjs';
import { prepareWaveforms } from './lib/audio-waveform.mjs';
import http from 'node:http';
import { createReadStream, createWriteStream } from 'node:fs';
import { readFile, writeFile, mkdir, stat, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { publishPages } from './scripts/publish-pages.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(process.env.DATA_DIR || path.join(root, 'data'));
const publicDir = path.join(root, 'dist/client');
await mkdir(path.join(dataDir, 'media'), { recursive: true });
const seed = JSON.parse(await readFile(path.join(root, 'content/initial.json'), 'utf8'));
const contentPath = path.join(dataDir, 'content.json');
let content;
try { content = JSON.parse(await readFile(contentPath, 'utf8')); } catch (e) { if(e.code !== 'ENOENT') throw e; content = seed; }
let credentials;
if (process.env.ADMIN_PASSWORD) { const salt = randomBytes(16).toString('hex'); credentials = { salt, hash: scryptSync(process.env.ADMIN_PASSWORD, salt, 64).toString('hex') }; }
else { try { credentials = JSON.parse(await readFile(path.join(dataDir, 'admin.json'),'utf8')); } catch(e) { if(e.code !== 'ENOENT') throw e; } }
const sessions = new Map();
const attempts = new Map();
const maxUpload = 95 * 1024 * 1024;
const localPublishEnabled = process.env.LOCAL_PUBLISH_ENABLED === 'true';
let publication = {state: 'idle', message: ''};
const mediaTypes = { 'audio/mpeg':'.mp3','audio/wav':'.wav','audio/x-wav':'.wav','audio/ogg':'.ogg','audio/flac':'.flac','audio/mp4':'.m4a','video/mp4':'.mp4','video/webm':'.webm','image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp' };
const mimeTypes = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.txt':'text/plain; charset=utf-8','.woff2':'font/woff2','.svg':'image/svg+xml', ...Object.fromEntries(Object.entries(mediaTypes).map(([k,v])=>[v,k])) };
const fail = (message, status=400) => Object.assign(new Error(message), {status});
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function body(req, limit=2*1024*1024){let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>limit)throw fail('Requête trop volumineuse.',413);chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString());}catch{throw fail('JSON invalide.');}}
function authorized(req){const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('lm_session='))?.slice(11);const expiry=sessions.get(token);return !!expiry && expiry>Date.now();}
function checkMutation(req){if(req.headers['x-portfolio-request']!=='1')throw fail('Requête refusée.',403);const origin=req.headers.origin;if(origin){let host;try{host=new URL(origin).host;}catch{throw fail('Origine invalide.',403);}if(host!==req.headers.host)throw fail('Origine refusée.',403);}}
const validText=(v,max=20000)=>typeof v==='string'&&v.length<=max;
const validUrl=v=>!v || (validText(v,2048)&&(/^https?:\/\//.test(v)||/^\/media\/[a-f0-9-]+\.(mp3|wav|ogg|flac|m4a|mp4|webm|jpg|png|webp)$/.test(v)));
function validate(c){
  if(!c||!validText(c.email,254)||!/^\S+@\S+\.\S+$/.test(c.email)||!validUrl(c.github)||!validUrl(c.linkedin))throw fail('Contact invalide.');
  for(const key of ['projects','entries','tracks','journey'])if(!Array.isArray(c[key])||c[key].length>500)throw fail('Collection invalide.');
  for(const key of ['projects','entries','tracks','journey'])for(const item of c[key]){if(item?.fr!==undefined){if(!item.fr||typeof item.fr!=='object'||Array.isArray(item.fr)||!Object.entries(item.fr).every(([k,v])=>['title','category','summary','problem','architecture','impact','text','note','period'].includes(k)&&validText(v)))throw fail('Traduction invalide.');}}
  for(const key of ['projects','entries','tracks']){const ids=new Set();for(const x of c[key]){if(!x||!validText(x.id,100)||!x.id||ids.has(x.id)||!validText(x.title,250)||!x.title.trim())throw fail('Titre ou identifiant invalide.');ids.add(x.id);}}
  for(const p of c.projects)if(!['category','summary','problem','architecture','impact'].every(k=>validText(p[k]))||!Array.isArray(p.tags)||p.tags.length>30||!p.tags.every(t=>validText(t,100))||!validUrl(p.code)||!validUrl(p.video)||!validUrl(p.cover))throw fail('Projet invalide.');
  for(const e of c.entries)if(!validText(e.text)||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||Number.isNaN(Date.parse(e.date))||!validUrl(e.video))throw fail('Note invalide.');
  for(const t of c.tracks)if((t.youtube!==undefined&&!validYoutubeUrl(t.youtube))||(t.releaseDate!==undefined&&!validReleaseDate(t.releaseDate))||(t.year!==undefined&&(typeof t.year!=='string'||!/^\d{4}$/.test(t.year)))||!validText(t.note)||!t.audio||!validUrl(t.audio)||!validUrl(t.cover))throw fail('Morceau invalide.');
  for(const j of c.journey){if(!['period','title','text'].every(k=>validText(j[k])))throw fail('Parcours invalide.');for(const key of ['start','end'])if(j[key]&&!/^\d{4}(-(?:0[1-9]|1[0-2]))?$/.test(j[key]))throw fail('Date de parcours invalide (AAAA ou AAAA-MM).');if(j.end&&!j.start)throw fail('Renseignez une date de début.');if(j.start&&j.end&&j.end.slice(0,4)<j.start.slice(0,4))throw fail('La fin doit suivre le début.');}
}
async function serveFile(req,res,filename){
  const s=await stat(filename);if(!s.isFile())throw fail('Fichier introuvable.',404);
  const type=mimeTypes[path.extname(filename)]||'application/octet-stream';
  let start=0,end=s.size-1,status=200;
  if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${s.size}`});return res.end();}if(!match[1])start=Math.max(0,s.size-Number(match[2]));else start=Number(match[1]);if(match[1]&&match[2])end=Math.min(end,Number(match[2]));if(start>end||start>=s.size){res.writeHead(416,{'Content-Range':`bytes */${s.size}`});return res.end();}status=206;}
  res.writeHead(status,{'Content-Type':type,'Content-Length':Math.max(0,end-start+1),'Accept-Ranges':'bytes','Cache-Control':filename.includes(`${path.sep}media${path.sep}`)?'public, max-age=31536000, immutable':'no-cache',...(status===206?{'Content-Range':`bytes ${start}-${end}/${s.size}`}:{})});
  if(req.method==='HEAD'||s.size===0)return res.end();await pipeline(createReadStream(filename,{start,end}),res);
}
let saveQueue=Promise.resolve();
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('X-Frame-Options','DENY');
  try{
    const url=new URL(req.url,'http://localhost');const route=decodeURIComponent(url.pathname);
    if(!['GET','HEAD','POST','PUT'].includes(req.method))throw fail('Méthode non permise.',405);
    if(route==='/api/content'&&req.method==='GET')return json(res,200,content);
    if(route==='/api/session'&&req.method==='GET')return json(res,200,{authenticated:authorized(req),configured:!!credentials});
    if(route==='/api/publish'&&req.method==='GET'){
      if(!authorized(req))throw fail('Reconnectez-vous pour consulter la publication.',401);
      return json(res,200,{...publication,enabled:localPublishEnabled});
    }
    if(req.method==='POST'||req.method==='PUT')checkMutation(req);
    if(route==='/api/login'&&req.method==='POST'){
      if(!credentials)throw fail('Administration à initialiser : exécuter npm run setup sur le serveur.',503);
      const address=req.socket.remoteAddress;const a=attempts.get(address)||{count:0,until:Date.now()+600000};if(a.until<Date.now()){a.count=0;a.until=Date.now()+600000;}if(a.count>=10)throw fail('Trop de tentatives. Réessayez dans 10 minutes.',429);
      const {password}=await body(req,4096);a.count++;attempts.set(address,a);
      if(!validText(password,1024)||!timingSafeEqual(scryptSync(password,credentials.salt,64),Buffer.from(credentials.hash,'hex')))throw fail('Mot de passe incorrect.',401);
      attempts.delete(address);const token=randomBytes(32).toString('hex');sessions.set(token,Date.now()+8*3600000);
      res.setHeader('Set-Cookie',`lm_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.COOKIE_SECURE==='true'?'; Secure':''}`);return json(res,200,{ok:true});
    }
    if(route==='/api/logout'&&req.method==='POST'){const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('lm_session='))?.slice(11);sessions.delete(token);res.setHeader('Set-Cookie','lm_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});}
    if(route==='/api/publish'&&req.method==='POST'){
      if(!authorized(req))throw fail('Reconnectez-vous pour publier.',401);
      if(!localPublishEnabled||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))throw fail('Publication disponible uniquement dans le studio local (npm run dev).',403);
      if(publication.state==='running')throw fail('Une publication est déjà en cours.',409);
      publication={state:'running',message:'Préparation…'};
      void (async()=>{
        try { await saveQueue; const result=await publishPages({root,dataDir,onProgress:message=>{publication={state:'running',message};}});publication={state:'sent',...result}; }
        catch(error){publication={state:'error',message:error.message};}
      })();
      return json(res,202,publication);
    }
    if(route==='/api/content'&&req.method==='PUT'){
      if(!authorized(req))throw fail('Reconnectez-vous pour enregistrer.',401);
      if(publication.state==='running')throw fail('Attendez la fin de la publication pour enregistrer.',409);
      const next=await body(req);validate(next);
      if(publication.state==='running')throw fail('Attendez la fin de la publication pour enregistrer.',409);
      const operation=saveQueue.then(async()=>{for(const track of next.tracks){const previous=content.tracks.find(t=>t.id===track.id&&t.audio===track.audio);if(previous?.waveform)track.waveform=previous.waveform;else delete track.waveform;}await prepareWaveforms(next,[path.join(dataDir,'media')]);const temp=contentPath+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(next,null,2));await rename(temp,contentPath);content=next;});saveQueue=operation.catch(()=>{});await operation;return json(res,200,{ok:true});
    }
    if(route==='/api/upload'&&req.method==='POST'){
      if(!authorized(req))throw fail('Reconnectez-vous pour importer.',401);
      if(publication.state==='running')throw fail('Attendez la fin de la publication pour importer.',409);
      const type=(req.headers['content-type']||'').split(';')[0];const ext=mediaTypes[type];if(!ext)throw fail('Format non pris en charge.',415);
      if(Number(req.headers['content-length'])>maxUpload)throw fail('Fichier limité à 95 Mio.',413);
      const id=randomUUID()+ext;const final=path.join(dataDir,'media',id);const temp=final+'.tmp';let size=0;
      const limiter=new Transform({transform(chunk,encoding,cb){size+=chunk.length;if(size>maxUpload)cb(fail('Fichier limité à 95 Mio.',413));else cb(null,chunk);}});
      try{await pipeline(req,limiter,createWriteStream(temp,{flags:'wx'}));if(!size)throw fail('Le fichier est vide.');await rename(temp,final);}catch(e){await unlink(temp).catch(()=>{});throw e;}
      return json(res,201,{url:'/media/'+id});
    }
    if(route.startsWith('/api/'))throw fail('Route introuvable.',404);
    if(!['GET','HEAD'].includes(req.method))throw fail('Méthode non permise.',405);
    if(route.startsWith('/media/')){if(!/^\/media\/[a-f0-9-]+\.[a-z0-9]+$/.test(route))throw fail('Fichier introuvable.',404);return await serveFile(req,res,path.join(dataDir,route));}
    const relative=route==='/'?'index.html':route.slice(1);if(relative.split(/[\\/]/).some(p=>p.startsWith('.')))throw fail('Fichier introuvable.',404);
    const filename=path.resolve(publicDir,relative);if(!filename.startsWith(publicDir+path.sep))throw fail('Fichier introuvable.',404);
    for(const candidate of [filename,filename+'.html',path.join(filename,'index.html')]){try{return await serveFile(req,res,candidate);}catch(e){if(!['ENOENT','ENOTDIR'].includes(e.code)&&e.status!==404)throw e;}}
    throw fail('Page introuvable.',404);
  }catch(e){if(!res.headersSent)json(res,e.status||(['ENOENT','ENOTDIR'].includes(e.code)?404:500),{error:e.status?e.message:'Service indisponible.'});else res.destroy();}
});
server.requestTimeout=15*60*1000;
setInterval(()=>{const now=Date.now();for(const [k,v]of sessions)if(v<now)sessions.delete(k);for(const[k,v]of attempts)if(v.until<now)attempts.delete(k);},60000).unref();
server.listen(Number(process.env.PORT||3001),process.env.HOST||'127.0.0.1',()=>console.log(`Portfolio server: http://${process.env.HOST||'127.0.0.1'}:${server.address().port}`));
