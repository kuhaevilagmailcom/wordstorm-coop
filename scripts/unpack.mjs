import fs from 'node:fs';
import path from 'node:path';
import { brotliDecompressSync } from 'node:zlib';
const source = path.resolve('source.b64');
if (!fs.existsSync(source)) {
  if (!fs.existsSync('package.json')) throw new Error('WORDSTORM source.b64 and package.json missing');
  process.exit(0);
}
const encoded=fs.readFileSync(source,'utf8').replace(/\s+/g,'');
const entries=JSON.parse(brotliDecompressSync(Buffer.from(encoded,'base64')).toString('utf8'));
for (const [file,body] of Object.entries(entries)) {
  if(path.isAbsolute(file)||file.split(/[\\/]/).includes('..')||typeof body!=='string') throw new Error('Unexpected archive entry: '+file);
  const dest=path.resolve(file);
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,body,'utf8');
  console.log('Restored',file);
}
