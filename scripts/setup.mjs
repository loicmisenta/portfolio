import readline from 'node:readline/promises';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
const password=await rl.question('Choisissez un mot de passe administrateur (12 caractères minimum) : ');
const confirmation=await rl.question('Confirmez ce mot de passe : ');rl.close();
if(password.length<12||password!==confirmation){console.error('Mot de passe trop court ou confirmation différente.');process.exit(1);}
const salt=randomBytes(16).toString('hex');const hash=scryptSync(password,salt,64).toString('hex');
const dir=path.resolve(process.env.DATA_DIR||'data');await mkdir(dir,{recursive:true});await writeFile(path.join(dir,'admin.json'),JSON.stringify({salt,hash}),{mode:0o600});console.log('Mot de passe enregistré sous forme de hash. Redémarrez le serveur, puis ouvrez /admin.');
