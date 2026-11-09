// Declarative AI 3D scene generation. No AI-supplied code is ever executed.
const clamp=(v,min,max,d=min)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):d;
const text=(v,max=100)=>typeof v==='string'?v.replace(/[<>\x00-\x1f]/g,'').trim().slice(0,max):'';
const color=(v,d='#a9c7ff')=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:d;
const types=new Set(['box','sphere','cylinder','cone','capsule','torus','icosahedron','dodecahedron','octahedron','tube','lathe','extrude']);
const motions=new Set(['static','fall','bounce','wander','chase','orbit','spiral','rise','float','roll','rush','scatter']);
const spawns=new Set(['ground','sky','grid','line','ring','edges','cluster','around_players']);
const vec=(v,n=3,max=4,def=0)=>Array.from({length:n},(_,i)=>clamp(Array.isArray(v)?v[i]:null,-max,max,def));
const modelPart=p=>{
  if(!p||!types.has(p.type))return null;
  const out={type:p.type,pos:vec(p.pos),rot:vec(p.rot,3,6.29),size:Array.from({length:3},(_,i)=>clamp(p.size?.[i],.06,5,1)),color:color(p.color),metalness:clamp(p.metalness,0,1,0),roughness:clamp(p.roughness,.08,1,.6)};
  if(p.type==='tube'){out.points=Array.isArray(p.points)?p.points.slice(0,12).map(v=>vec(v,3,4)):[];if(out.points.length<2)return null;}
  if(p.type==='lathe'){out.profile=Array.isArray(p.profile)?p.profile.slice(0,12).map(v=>vec(v,2,3)):[];if(out.profile.length<2)return null;}
  if(p.type==='extrude'){out.outline=Array.isArray(p.outline)?p.outline.slice(0,12).map(v=>vec(v,2,3)):[];if(out.outline.length<3)return null;}
  return out;
};
const validateMotion=m=>{
  m=m||{};const out={type:motions.has(m.type)?m.type:'static',speed:clamp(m.speed,0,23,4),height:clamp(m.height,0,16,3),spin:clamp(m.spin,-7,7,0),radius:clamp(m.radius,1,22,7),growth:clamp(m.growth,-.08,.14,0),pulse:clamp(m.pulse,0,.5,0),gravity:clamp(m.gravity,4,50,24)};
  if(Array.isArray(m.phases))out.phases=m.phases.slice(0,5).filter(p=>p&&motions.has(p.type)).map(p=>({after:clamp(p.after,0,20,0),type:p.type,speed:clamp(p.speed,0,23,out.speed),height:clamp(p.height,0,16,out.height),spin:clamp(p.spin,-7,7,out.spin),radius:clamp(p.radius,1,22,out.radius)})).sort((a,b)=>a.after-b.after);
  return out;
};
export function validateScene(raw,prompt){
  if(!raw||!Array.isArray(raw.actors)||!raw.actors.length)throw Error('Missing scene actors');
  let total=0;const actors=[];
  for(const input of raw.actors.slice(0,3)){
    const parts=Array.isArray(input?.model?.parts)?input.model.parts.slice(0,18).map(modelPart).filter(Boolean):[];
    if(!parts.length)continue;
    const count=Math.min(Math.floor(clamp(input.count,1,300,12)),350-total);if(count<1)break;total+=count;
    actors.push({name:text(input.name,36)||'Объект',count,spawn:spawns.has(input.spawn)?input.spawn:'ground',size:clamp(input.size,.15,3.5,1),damage:Math.floor(clamp(input.damage,0,60,20)),lifetime:Math.floor(clamp(input.lifetime,5000,22000,11000)),delay:Math.floor(clamp(input.delay,0,4000,0)),model:{parts},motion:validateMotion(input.motion)});
  }
  if(!actors.length)throw Error('Missing valid 3D model parts');
  return {title:text(raw.title,70)||'Новая катастрофа',description:text(raw.description,125)||'Берегись!',color:color(raw.color),actors};
}
const SYSTEM='You are an AI procedural 3D artist and physics designer of a multiplayer survival game. Input is a player description. Return ONLY a compact valid JSON object with keys title (Russian), description (Russian warning), color #RRGGBB, actors array (1 to 3). Each actor: name, count (1..300), spawn (ground|sky|grid|line|ring|edges|cluster|around_players), size (0.15..3.5), damage (0..60), lifetime (5000..22000 ms), model:{parts:[...]}, motion:{type,speed,height,spin,radius,growth,pulse,gravity,phases}. A model has 1..18 colored primitive parts with each part {type,size:[w,h,d],pos:[x,y,z],rot:[rx,ry,rz],color:"#RRGGBB",metalness,roughness}. Part types: box, sphere, cylinder, cone, capsule, torus, icosahedron, dodecahedron, octahedron, tube (points:[[x,y,z],...]), lathe (profile:[[radius,y],...]), extrude (outline:[[x,y],...]). Use a detailed recognizable assembly, not generic placeholders: a phone needs body, screen and cameras; a fridge needs body, door and handles; tree needs trunk and crown. Literal cubes are ONE box part. Motion types static,fall,bounce,wander,chase,orbit,spiral,rise,float,roll,rush,scatter. Behavior phases array can switch types at seconds after spawn e.g [{after:0,type:"static"},{after:3,type:"chase",speed:9}]. Understand QUANTITY and WHERE TO SPAWN and HOW TO MOVE from the player. "many many cubes standing on the ground" => count 240, spawn grid, motion static, NOT falling from sky. "100 refrigerators chase players" => count 100, spawn ground, motion chase. Think creatively about visuals and behavior, obey semantics; not all catastrophes are rain. Safe non-graphic action. No code, no urls, no extra keys.';
const transientCodes=new Set([408,429,500,502,503,504]);
const health={state:'idle',lastHttpStatus:null,lastError:null,lastModel:null,lastSuccessAt:null,lastAttemptAt:null};
export function getAIStatus(configured=true){
  return configured?{...health}:{state:'not_configured',lastHttpStatus:null,lastError:null,lastModel:null,lastSuccessAt:null,lastAttemptAt:null};
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function generateScene(prompt,{key,base,model,fallbackModel=process.env.HCNSEC_FALLBACK_MODEL||'DeepSeek-V4-Flash'}={}){
  const offline=/кубик|кубы|кубов|cubes?/i.test(prompt)?validateScene({title:'Кубический хаос',description:'Кубики заполнили арену',color:'#ffaf61',actors:[{count:Number(prompt.match(/\d{1,4}/)?.[0])||(/много|сотн/i.test(prompt)?240:60),spawn:/пада|неб/i.test(prompt)?'sky':'grid',size:.7,damage:15,lifetime:16000,model:{parts:[{type:'box',color:'#ffaa55',size:[1,1,1]}]},motion:{type:/пада|неб/i.test(prompt)?'fall':/скач|прыга/i.test(prompt)?'bounce':'static'}}]},prompt):null;
  if(!key){health.state='not_configured';return offline;}
  const primary=String(model||'DeepSeek-V4-Pro').trim();
  const secondary=String(fallbackModel||'DeepSeek-V4-Flash').trim();
  const models=secondary && secondary!==primary?[primary,secondary,secondary]:[primary,primary];
  const root=String(base||'https://api.hcnsec.cn/v1').replace(/\/+$/,'');
  for(let attempt=0;attempt<models.length;attempt++){
    const modelName=models[attempt];
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),attempt===0?8500:9500);
    health.state='connecting';health.lastAttemptAt=new Date().toISOString();health.lastModel=modelName;
    try{
      const response=await fetch(root+'/chat/completions',{
        method:'POST',signal:controller.signal,
        headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
        body:JSON.stringify({model:modelName,temperature:.55,max_tokens:2600,messages:[
          {role:'system',content:SYSTEM},
          {role:'user',content:'Design gameplay 3D scene from this description: '+JSON.stringify(prompt)}
        ]})
      });
      if(!response.ok){
        const error=new Error('AI HTTP '+response.status);
        error.httpStatus=response.status;
        throw error;
      }
      const body=await response.json();
      const content=body.choices?.[0]?.message?.content;
      const raw=typeof content==='string'?content:Array.isArray(content)?content.map(p=>typeof p==='string'?p:(p?.text||'')).join(''):'';
      if(!raw)throw Error('Empty AI message');
      const json=raw.match(/\{[\s\S]*\}/)?.[0];
      if(!json)throw Error('Missing scene JSON');
      const plan=validateScene(JSON.parse(json),prompt);
      health.state='ready';health.lastHttpStatus=null;health.lastError=null;health.lastSuccessAt=new Date().toISOString();
      if(attempt)console.info('[WORLDGEN] AI recovered using '+modelName);
      return plan;
    }catch(err){
      health.state='degraded';
      health.lastHttpStatus=err.httpStatus||null;
      health.lastError=err.name==='AbortError'?'timeout':err.httpStatus?'HTTP '+err.httpStatus:'invalid_response_or_network';
      console.warn('[WORLDGEN] AI attempt '+(attempt+1)+'/'+models.length+' ('+modelName+'): '+health.lastError);
      const retryable=err.name==='AbortError'||!err.httpStatus||transientCodes.has(err.httpStatus);
      if(!retryable||attempt===models.length-1)break;
      await sleep(350*(attempt+1));
    }finally{clearTimeout(timer);}
  }
  console.warn('[WORLDGEN] AI unavailable, using procedural fallback');
  return offline;
}

const rand=(a,b)=>a+Math.random()*(b-a);
let modelSeq=1;
export function spawnScene(room,word,plan,pickerId,{newHazard,io,ARENA}){
  const now=Date.now();const picker=room.players.get(pickerId);
  for(const actor of plan.actors){
    const modelId=modelSeq++;room.models.set(modelId,actor.model);
    const cols=Math.ceil(Math.sqrt(actor.count));
    for(let i=0;i<actor.count;i++){
      let x=rand(-ARENA+2,ARENA-2),z=rand(-ARENA+2,ARENA-2);
      if(actor.spawn==='grid'){const space=Math.min(3.3,Math.max(.55,actor.size*1.65));x=((i%cols)-(cols-1)/2)*space;z=(Math.floor(i/cols)-(Math.ceil(actor.count/cols)-1)/2)*space;}
      else if(actor.spawn==='ring'){const a=2*Math.PI*i/actor.count;x=13*Math.cos(a);z=13*Math.sin(a);}
      else if(actor.spawn==='line'){x=-ARENA+2+i/Math.max(1,actor.count-1)*(2*ARENA-4);z=rand(-3,3);}
      else if(actor.spawn==='cluster'){x=rand(-7,7);z=rand(-7,7);}
      else if(actor.spawn==='edges'){if(i%4===0)x=-ARENA+1;if(i%4===1)x=ARENA-1;if(i%4===2)z=-ARENA+1;if(i%4===3)z=ARENA-1;}
      else if(actor.spawn==='around_players'){const p=[...room.players.values()].find(p=>p.alive);if(p){x=p.x+rand(-8,8);z=p.z+rand(-8,8);}}
      x=Math.max(-ARENA+1,Math.min(ARENA-1,x));z=Math.max(-ARENA+1,Math.min(ARENA-1,z));
      const sky=actor.spawn==='sky'||actor.motion.type==='fall';const y=sky?rand(17,30):actor.size*.6;
      const h=newHazard(room,{kind:'generated',shape:'generated',modelId,word,color:plan.color,sourceId:pickerId,x,y,z,originX:x,originY:y,originZ:z,yaw:rand(-3.14,3.14),scale:actor.size,baseScale:actor.size,radius:actor.size*.87,baseRadius:actor.size*.87,damage:actor.damage,motion:actor.motion,vx:0,vy:0,vz:0,seed:rand(0,6.28),spawnAt:now+actor.delay+i%16*95+rand(0,300),ttl:actor.lifetime});
      if(actor.motion.type==='rush'||actor.motion.type==='scatter'){const a=actor.motion.type==='rush'?Math.atan2(-z,-x):Math.atan2(z,x);h.vx=Math.cos(a)*actor.motion.speed;h.vz=Math.sin(a)*actor.motion.speed;}
    }
  }
  room.lastDisaster={word,title:plan.title,description:plan.description,type:'generated',color:plan.color,count:plan.actors.reduce((n,a)=>n+a.count,0),by:picker?.name||'Хаос',at:now};
  room.history.unshift(room.lastDisaster);room.history=room.history.slice(0,5);io.to(room.id).emit('disaster',room.lastDisaster);
}
export function updateGenerated(room,h,now,dt,{hit,distance,io,ARENA}){
  const age=(now-h.spawnAt)/1000;const original=h.motion||{type:'static',speed:0,height:0,spin:0,radius:6};let m=original;let start=0;
  for(const phase of original.phases||[])if(phase.after<=age){m={...original,...phase};start=phase.after;}
  const t=(age-start)*m.speed;const floor=h.scale*.55;
  h.scale=Math.max(.2,Math.min(4.8,h.baseScale*(1+original.growth*age+Math.sin(age*4+h.seed)*original.pulse)));
  h.radius=Math.max(.3,Math.min(4.8,h.baseRadius*h.scale/h.baseScale));h.yaw+=m.spin*dt;
  const bounded=n=>Math.max(-ARENA+1,Math.min(ARENA-1,n));
  if(m.type==='fall'){h.vy-=original.gravity*dt;h.y+=h.vy*dt;if(h.y<=floor){h.y=floor;h.motion={...original,type:'static',phases:[]};io.to(room.id).emit('impact',{x:h.x,z:h.z,color:h.color,radius:h.radius,word:h.word});}}
  else if(m.type==='bounce'){h.y=floor+Math.abs(Math.sin(t*.75+h.seed))*m.height;h.x=bounded(h.originX+Math.sin(t*.43+h.seed)*m.radius*.45);h.z=bounded(h.originZ+Math.cos(t*.38+h.seed)*m.radius*.45);}
  else if(m.type==='wander'||m.type==='float'){h.x=bounded(h.originX+Math.sin(t*.4+h.seed)*m.radius*.5);h.z=bounded(h.originZ+Math.cos(t*.3+h.seed)*m.radius*.5);h.y=floor+(m.type==='float'?m.height+Math.sin(t+h.seed):0);}
  else if(m.type==='chase'){const p=[...room.players.values()].filter(p=>p.alive).sort((a,b)=>distance(a,h)-distance(b,h))[0];if(p){const dx=p.x-h.x,dz=p.z-h.z,n=Math.max(.1,Math.hypot(dx,dz));h.x=bounded(h.x+dx/n*m.speed*dt);h.z=bounded(h.z+dz/n*m.speed*dt);h.yaw=Math.atan2(dx,dz);}h.y=floor;}
  else if(m.type==='orbit'||m.type==='spiral'){const radius=m.type==='orbit'?m.radius:Math.min(m.radius,(age-start)*m.speed*.5+1);h.x=bounded(Math.cos(t*.27+h.seed)*radius);h.z=bounded(Math.sin(t*.27+h.seed)*radius);h.y=floor+m.height;}
  else if(m.type==='rise')h.y=floor-m.height*(1-Math.min(1,(age-start)/Math.max(.4,6/(m.speed+1))));
  else if(m.type==='roll'){h.x=bounded(h.originX+Math.sin(t+h.seed)*m.radius);h.y=floor;}
  else if(m.type==='rush'||m.type==='scatter'){h.x+=h.vx*dt;h.z+=h.vz*dt;h.y=floor;if(Math.abs(h.x)>ARENA+4||Math.abs(h.z)>ARENA+4){room.hazards.delete(h.id);return;}}
  else h.y=floor;
  if(h.damage>0)for(const p of room.players.values())if(p.alive&&distance(p,h)<h.radius+.62&&Math.abs(h.y-(p.y+1))<h.radius+1.1)hit(room,p,h,now);
}