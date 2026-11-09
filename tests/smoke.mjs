import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../server.mjs',import.meta.url),'utf8');
assert.match(source,/const ROUND_DURATION = 30000;/,'30-second rounds on server');
const between=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const common={console,Math,Date,AbortController,setTimeout,clearTimeout,
  clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),
  cleanWord:(str)=>typeof str==='string'?str.replace(/[<>]/g,'').trim().slice(0,32):'',
  random:(a,b)=>a+(b-a)/2,ARENA:27.6,
};
const api=between('const categoryRules = [','\nfunction scheduleStorm');
{
  const c=vm.createContext({...common,API_BASE:'https://example.invalid/v1',API_KEY:'',MODEL:'DeepSeek-V4-Pro'});
  const {localPlan}=vm.runInContext(api+'\n({localPlan})',c);
  for (const [word,shape] of [['телефон','phone'],['холодильник','fridge'],['машина','car'],['пицца','pizza'],['кот','cat'],['дерево','tree'],['метеорит','meteor'],['несуществующее слово','generic']]) {
    assert.equal(localPlan(word).shape,shape,`category: ${word}`);
  }
  assert.equal(localPlan('телефон').type,'rain');
}
{
  let emitted=[];let hazards=[];
  const c=vm.createContext({...common,io:{to:()=>({emit:(key,data)=>emitted.push({key,data})})},
    newHazard:(_room,data)=>{hazards.push(data);return data;},
  });
  const {scheduleStorm}=vm.runInContext(between('function scheduleStorm','\nasync function acceptWord')+'\n({scheduleStorm})',c);
  const room={id:'TEST',players:new Map([['p1',{name:'Игорь'}]]),history:[],hazards:new Map()};
  scheduleStorm(room,'телефон',{type:'rain',shape:'phone',color:'#abcdef',title:'Апокалипсис',description:'Беги',count:16},'p1');
  assert.equal(hazards.length,16);
  assert.ok(hazards.every(h=>h.shape==='phone'&&h.kind==='fall'));
  assert.equal(emitted[0].key,'disaster');
}
{
  let emits=[];
  const c=vm.createContext({...common,io:{to:()=>({emit:(key,data)=>emits.push(key)})},
    startRound:()=>{},acceptWord:()=>{},hit:()=>{},distance:(a,b)=>Math.hypot(a.x-b.x,a.z-b.z)});
  const {simulate}=vm.runInContext(between('function simulate','\nio.on(\'connection\'')+'\n({simulate})',c);
  const now=Date.now();
  const player={id:'p1',name:'Тест',x:0,y:0,z:0,yaw:0,vx:0,vy:0,vz:0,health:100,alive:true,score:0,invulnerable:now+2000,
    input:{up:true,down:false,left:false,right:false,jump:true,sprint:false}};
  const room={id:'TEST',players:new Map([['p1',player]]),hazards:new Map(),nextRoundAt:now+10000,promptEndsAt:0,accepted:true,lastEmpty:0};
  for(let i=0;i<5;i++)simulate(room,now+i*50,.05);
  assert.ok(player.z<-.05,'forward input moves the player');
  assert.ok(player.y>0,'jump moves the player upward');
  assert.equal(player.health,100);
}
console.log('PASS: fallback categories, 30-second rounds, 3D hazards, server movement and jumping');
