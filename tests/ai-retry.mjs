import assert from 'node:assert/strict';
import { generateScene, getAIStatus } from '../worldgen.mjs';
const nativeFetch=globalThis.fetch;
const scene={title:'Кубики',description:'Прыгают',color:'#eeaa55',actors:[{name:'Кубики',count:12,spawn:'grid',model:{parts:[{type:'box',size:[1,1,1],color:'#aa55ff'}]},motion:{type:'bounce',speed:3}}]};
try{
  let calls=[];
  globalThis.fetch=async(_url,opts)=>{
    const request=JSON.parse(opts.body);calls.push(request.model);
    return calls.length===1?{ok:false,status:503}:{ok:true,status:200,json:async()=>({choices:[{message:{content:JSON.stringify(scene)}}]})};
  };
  const recovered=await generateScene('кубики скачут',{key:'test-only',base:'https://example.invalid/v1',model:'DeepSeek-V4-Pro',fallbackModel:'DeepSeek-V4-Flash'});
  assert.equal(recovered.actors[0].motion.type,'bounce');
  assert.deepEqual(calls,['DeepSeek-V4-Pro','DeepSeek-V4-Flash']);
  assert.equal(getAIStatus().state,'ready');
  calls=[];
  globalThis.fetch=async()=>({ok:false,status:401});
  const denied=await generateScene('кубики',{key:'test-only',base:'https://example.invalid/v1',model:'DeepSeek-V4-Pro'});
  assert.equal(denied.actors[0].count,60);
  assert.equal(getAIStatus().lastHttpStatus,401);
  assert.equal(getAIStatus().state,'degraded');
  assert.equal(getAIStatus(false).state,'not_configured');
  console.log('PASS AI retry: 503 switches to Flash; auth errors do not retry; fallback safe');
}finally{globalThis.fetch=nativeFetch;}
