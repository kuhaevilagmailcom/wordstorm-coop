import assert from 'node:assert/strict';
import {generateScene,getAIStatus} from '../worldgen.mjs';
const native=globalThis.fetch;
const scene={title:'Кубики',description:'Прыгают',color:'#eeaa55',actors:[{name:'Кубики',count:12,spawn:'grid',model:{parts:[{type:'box',size:[1,1,1],color:'#aa55ff'}]},motion:{type:'bounce',speed:3}}]};
try{
  const calls=[];
  globalThis.fetch=async(url,opts)=>{
    const req=JSON.parse(opts.body);calls.push({url,model:req.model,auth:opts.headers.Authorization});
    return url.includes('hcnsec')?{ok:false,status:503}:{ok:true,status:200,json:async()=>({choices:[{message:{content:JSON.stringify(scene)}}]})};
  };
  const opts={key:'first-secret',base:'https://api.hcnsec.cn/v1',model:'DeepSeek-V4-Pro',fallbackModel:'DeepSeek-V4-Flash',
    backupKey:'second-secret',backupBase:'https://openrouter.ai/api/v1',backupModel:'deepseek/deepseek-flash'};
  const answer=await generateScene('12 кубиков скачут',opts);
  assert.equal(answer.actors[0].motion.type,'bounce');
  assert.deepEqual(calls.map(c=>c.model),['DeepSeek-V4-Pro','DeepSeek-V4-Flash','deepseek/deepseek-flash']);
  assert.deepEqual(calls.map(c=>c.auth),['Bearer first-secret','Bearer first-secret','Bearer second-secret']);
  assert.equal(getAIStatus().state,'ready');
  assert.equal(getAIStatus().lastSuccessProvider,'OpenRouter');
  assert.equal(getAIStatus().gatewayCoolingDown,true);
  const next=[];
  globalThis.fetch=async(url)=>{next.push(url);return {ok:true,json:async()=>({choices:[{message:{content:JSON.stringify(scene)}}]})};};
  const result=await generateScene('кубики',opts);
  assert.ok(result);
  assert.deepEqual(next,['https://openrouter.ai/api/v1/chat/completions']);
  const offline=await generateScene('60 кубиков',{key:'',backupKey:''});
  assert.equal(offline.actors[0].count,60);
  console.log('PASS separate AI backup, safe keys, 503 circuit breaker, offline fallback');
}finally{globalThis.fetch=native;}
