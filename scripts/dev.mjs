import { spawn } from 'node:child_process';
const children = [spawn(process.execPath,['server.mjs'],{stdio:'inherit',env:{...process.env,HOST:'127.0.0.1',PORT:'3001',LOCAL_PUBLISH_ENABLED:'true'}}),spawn(process.execPath,['node_modules/vinext/dist/cli.js','dev','--hostname','127.0.0.1'],{stdio:'inherit'})];
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill();process.exitCode=code;}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
for(const child of children){child.on('error',e=>{console.error(e);stop(1)});child.on('exit',code=>stop(code||0));}
