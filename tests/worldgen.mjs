import assert from 'node:assert/strict';
import {generateScene, validateScene, spawnScene, updateGenerated} from '../worldgen.mjs';

const sample={title:'Новый мир',color:'#ffee66',actors:[{
 name:'Волшебный аппарат',count:200,spawn:'grid',size:.7,damage:15,lifetime:12000,
 model:{parts:[{type:'box',size:[1,1,1],color:'#ffee66'},{type:'torus',pos:[0,1,0],color:'#ffffff'}]},
 motion:{type:'static',phases:[{after:0,type:'static'},{after:2,type:'chase',speed:8}]}
}]};
const plan=validateScene(sample,'200 аппаратов');
assert.equal(plan.actors[0].count,200);
assert.equal(plan.actors[0].model.parts.length,2);
assert.equal(plan.actors[0].motion.phases[1].type,'chase');
assert.equal(plan.actors[0].spawn,'grid');
assert.throws(()=>validateScene({actors:[{model:{parts:[{type:'javascript',code:'process.exit(1)'}]}}]},'bad'));
const capped=validateScene({actors:[{count:100000,model:{parts:[{type:'box',size:[999,-200,1]}]}}]},'x');
assert.equal(capped.actors[0].count,300);
assert.equal(capped.actors[0].model.parts[0].size[0],5);
assert.equal(capped.actors[0].model.parts[0].size[1],.06);
const offline=await generateScene('много-много кубиков на земле',{key:'',base:'',model:''});
assert.equal(offline.actors[0].count,240);
assert.equal(offline.actors[0].motion.type,'static');
const room={id:'TEST',models:new Map(),players:new Map([['p1',{id:'p1',name:'Игрок',x:0,y:0,z:0,alive:true}]]),hazards:new Map(),history:[]};
const events=[];let id=0;
spawnScene(room,'200 аппаратов',plan,'p1',{ARENA:27.6,io:{to:()=>({emit:(key)=>events.push(key)})},
 newHazard:(r,data)=>{const h={...data,id:++id};r.hazards.set(id,h);return h;}});
assert.equal(room.hazards.size,200);
assert.equal(room.models.size,1);
assert.ok([...room.hazards.values()].every(h=>h.kind==='generated'&&h.y<4&&h.modelId));
const first=[...room.hazards.values()][0];
first.x=6;first.z=6;first.originX=6;first.originZ=6;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
updateGenerated(room,first,first.spawnAt+250,.05,{hit:()=>{},distance:dist,ARENA:27.6,io:{to:()=>({emit:()=>{}})}});
assert.equal(first.x,6);
updateGenerated(room,first,first.spawnAt+2500,.05,{hit:()=>{},distance:dist,ARENA:27.6,io:{to:()=>({emit:()=>{}})}});
assert.ok(first.x<6,'chase phase should move toward player');
assert.ok(events.includes('disaster'));
console.log('PASS AI WORLDGEN: sanitized 3D models, 200 ground entities, switchable behavior and chase');
