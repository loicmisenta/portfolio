import http from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot } from './export-pages.mjs';

const {basePath} = JSON.parse(await readFile(path.join(projectRoot, 'publish.config.json'), 'utf8'));
const root = path.join(projectRoot, 'dist/pages');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json'};
const server = http.createServer(async(req,res) => {
  try {
    const route = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (route === basePath) { res.writeHead(302,{Location:basePath + '/'}); return res.end(); }
    if (!route.startsWith(basePath + '/') || !['GET','HEAD'].includes(req.method)) throw new Error('Not found');
    const relative = route.slice(basePath.length + 1);
    if (relative.split(/[\\/]/).some(part => part.startsWith('.'))) throw new Error('Not found');
    const file = path.resolve(root, relative.endsWith('/') || !relative ? relative + 'index.html' : relative);
    if (!file.startsWith(root + path.sep)) throw new Error('Not found');
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not found');
    res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-store'});
    if (req.method === 'HEAD') return res.end();
    const stream = createReadStream(file); stream.on('error',()=>res.destroy()); stream.pipe(res);
  } catch { if (!res.headersSent) res.writeHead(404); res.end('Not found'); }
});
server.listen(Number(process.env.PREVIEW_PORT || 3040),'127.0.0.1',()=>console.log(`Pages preview: http://127.0.0.1:${server.address().port}${basePath}/`));
