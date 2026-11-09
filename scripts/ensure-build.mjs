import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if (!fs.existsSync(path.join(root,'dist','index.html'))) {
  console.log('[WORDSTORM] dist/ missing; building website once...');
  execFileSync(process.platform==='win32'?'npm.cmd':'npm',['run','build'],{cwd:root,stdio:'inherit'});
}
