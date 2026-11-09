import fs from 'node:fs';
import path from 'node:path';
import { brotliDecompressSync } from 'node:zlib';
const dir='bundle';
const files=fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>/^part-\d+$/.test(f)).sort():[];
const encoded=files.length?files.map(f=>fs.readFileSync(path.join(dir,f),'utf8')).join(''):fs.readFileSync('source.b64','utf8');
const entries=JSON.parse(brotliDecompressSync(Buffer.from(encoded.replace(/\s+/g,''),'base64')).toString('utf8'));
for (const [file,body] of Object.entries(entries)) {
  if(path.isAbsolute(file)||file.split(/[\\/]/).includes('..')||typeof body!=='string') throw new Error('Invalid entry '+file);
  fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,body,'utf8');
  console.log('Restored '+file);
}
