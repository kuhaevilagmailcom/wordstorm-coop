import * as THREE from 'three';
import { io } from 'socket.io-client';
import { createGeneratedRenderer } from './generated.js';
import './style.css';

const $ = (id) => document.getElementById(id);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, alpha) => a + (b - a) * alpha;
const q = (num) => Number(num || 0).toFixed(1);
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const touchDevice = matchMedia('(pointer:coarse)').matches;
const canvas = $('world');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const generatedRenderer = createGeneratedRenderer(THREE,scene);
scene.background = new THREE.Color('#97b4e0');
scene.fog = new THREE.FogExp2('#95b7db', 0.0075);
const camera = new THREE.PerspectiveCamera(64, innerWidth / innerHeight, 0.1, 450);
const sun = new THREE.DirectionalLight('#fff2d6', 2.1);
sun.position.set(-18, 36, 25); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -65; sun.shadow.camera.right = 65; sun.shadow.camera.top = 65; sun.shadow.camera.bottom = -65;
sun.shadow.bias = -0.00008; sun.shadow.normalBias = 0.02;
scene.add(sun, new THREE.HemisphereLight('#eaf2ff', '#47657b', 2.15), new THREE.AmbientLight('#f7d8ff', 0.38));
const mat = (color, metalness = 0, roughness = 0.61, emissive = null) => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...(emissive ? { emissive, emissiveIntensity: .24 } : {}) });
const baseMat = mat('#334b76');
const lights = { pink: mat('#ff8fbf', .05, .42), gold: mat('#fff1a2'), dark: mat('#1a2644', .15, .4), white: mat('#f0f7ff'), sea: mat('#6482ad'), lime: mat('#eaff7a') };
const group = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x,y,z); parent.add(g); return g; };
const cube = (parent, w, h, d, color, x = 0, y = 0, z = 0, m = null) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), m || mat(color)); mesh.position.set(x,y,z); parent.add(mesh); return mesh; };
const sphere = (parent, radius, color, x = 0, y = 0, z = 0, detail = 12) => { const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius,detail,Math.max(8,Math.round(detail*.75))),mat(color)); mesh.position.set(x,y,z); parent.add(mesh); return mesh; };
const cylinder = (parent, rt, rb, h, color, x=0,y=0,z=0, segments=12) => { const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),mat(color)); mesh.position.set(x,y,z); parent.add(mesh); return mesh; };
const torus = (parent,r,t,color,x=0,y=0,z=0) => { const mesh = new THREE.Mesh(new THREE.TorusGeometry(r,t,8,48),mat(color,.1,.36)); mesh.position.set(x,y,z); parent.add(mesh); return mesh; };
const rand = (a,b) => a + Math.random()*(b-a);

function makeWorld() {
  // The simulation is a flat 56x56 arena. Everything beyond is visual decoration.
  const ground = cube(scene, 61, 2.1, 61, '#324b73', 0, -1.13, 0);
  ground.receiveShadow = true;
  const floor = cube(scene, 56.9, .2, 56.9, '#9dd7ce', 0, -.07, 0);
  floor.receiveShadow = true;
  for (let i = -28; i <= 28; i += 4) {
    const gx = cube(scene, .036, .008, 56.9, '#d9f4ea', i, .037, 0); gx.material.transparent = true; gx.material.opacity = .35;
    const gz = cube(scene, 56.9, .008, .036, '#d9f4ea', 0, .037, i); gz.material.transparent = true; gz.material.opacity = .35;
  }
  const accentMat = mat('#f4cb87');
  for (let i = -26; i <= 26; i += 13) {
    cube(scene, 1.5, .16, .7, '#fff2c2', i, .1, -27.85);
    cube(scene, 1.5, .16, .7, '#fff2c2', i, .1, 27.85);
    cube(scene, .7, .16, 1.5, '#fff2c2', -27.85, .1, i);
    cube(scene, .7, .16, 1.5, '#fff2c2', 27.85, .1, i);
  }
  for (let side of [-1,1]) {
    cube(scene, 61.1, 1.0, 1.05, '#506d9a', 0, -.42, side*30.2);
    cube(scene, 1.05, 1.0, 61.1, '#506d9a', side*30.2, -.42, 0);
  }
  const center = new THREE.Group(); center.position.y = .11;
  const ring1 = torus(center, 5.65, .12, '#fff8c6'); ring1.rotation.x = -Math.PI/2;
  const ring2 = torus(center, 8.8, .048, '#5689a6'); ring2.rotation.x = -Math.PI/2;
  scene.add(center);
  const diamonds = [ [0, -23], [0, 23], [-23, 0], [23, 0] ];
  for (const [x,z] of diamonds) {
    let g = group(scene,x,0,z); const a = cylinder(g,1.7,1.9,.25,'#6685a0',0,.03,0,4); a.rotation.y=Math.PI/4;
    let arrow = cylinder(g, .65,.65,.06,'#eaff7a',0,.23,0,3); arrow.rotation.y = Math.PI/2;
    const l = new THREE.PointLight('#d0ff77',.6,7); l.position.set(x,2,z); scene.add(l);
  }
  const deco = new THREE.Group();scene.add(deco);
  const colors=['#a19fe2','#ffb17e','#7c9dd1','#ff8dab','#a4d8b6'];
  for(let i=0;i<35;i++) {
    const angle = i / 35 * Math.PI*2; const r=rand(38,92);
    const x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    const tower=group(deco,x,-2.5,z); const h=rand(4,19), w=rand(3,8);
    let block=cube(tower,w,h,w,colors[i%colors.length],0,h/2,0);block.castShadow = false;
    cube(tower,w*.7,.3,w*.7,'#ebfdc3',0,h+.18,0);
    if(i%3===0) {
      const t=group(deco,x+rand(-7,7),0,z+rand(-7,7));
      cylinder(t,.3,.45,4.3,'#735f7a',0,2,0);
      sphere(t,2.5,'#93d8c1',0,4.6,0,8);
    }
  }
  for (let i=0;i<20;i++) {
    const a=rand(0,Math.PI*2),r=rand(34,100);
    const float=group(deco,Math.cos(a)*r,rand(8,24),Math.sin(a)*r);
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(rand(1.4,4),0), mat(i%2?'#a6bbdf':'#bba7d1'));
    float.add(rock); float.userData.float=true;float.userData.phase=rand(0,6.28);
  }
  return deco;
}
const deco = makeWorld();
function canvasLabel(text, tint='#ffffff', bg='rgba(10,22,46,.85)', fontsize=46) {
  const c = document.createElement('canvas'); c.width=512;c.height=128;
  const ctx=c.getContext('2d');
  ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(6,12,500,103,21);ctx.fill();
  ctx.fillStyle=tint;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`800 ${fontsize}px Manrope, Arial, sans-serif`;
  let label = String(text).slice(0,28);
  while(ctx.measureText(label).width>460&&label.length>2)label=label.slice(0,-2)+'…';
  ctx.fillText(label,256,67);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});
  const sprite=new THREE.Sprite(material);sprite.scale.set(3.1,.76,1);sprite.renderOrder=50;
  return sprite;
}
function avatar(player) {
  const g = group(scene,player.x,player.y,player.z);
  const color=player.color || '#eaff7a';
  const legs=group(g,0,0,0);
  const left = cube(legs,.42,.83,.5,'#27334e',-.3,.47,0); left.castShadow=true;
  const right = cube(legs,.42,.83,.5,'#27334e',.3,.47,0); right.castShadow=true;
  const body=cube(g,1.17,1.17,.68,color,0,1.42,0);body.castShadow=true;
  cube(g,.75,.16,.12,'#f2fcff',0,1.65,.39);
  const head=sphere(g,.53,'#ffe2bd',0,2.42,0,14);head.castShadow=true;
  const hair=sphere(g,.54,'#293247',0,2.64,-.03,12);hair.scale.set(1.02,.48,.95);
  sphere(g,.047,'#242d44',-.19,2.43,.5,9); sphere(g,.047,'#242d44',.19,2.43,.5,9);
  const arms = group(g,0,0,0);
  const armL=cube(arms,.34,.92,.44,color,-.8,1.47,0);armL.castShadow=true;
  const armR=cube(arms,.34,.92,.44,color,.8,1.47,0);armR.castShadow=true;
  const name=canvasLabel(player.name,'#ffffff');name.position.y=3.7;g.add(name);
  const circle = torus(g,.9,.075,color,0,.08,0);circle.rotation.x=-Math.PI/2;
  circle.material.emissive=new THREE.Color(color);circle.material.emissiveIntensity=.25;
  const halo = new THREE.Group(); const isMe = player.id===state.id;
  if(isMe){const me=canvasLabel('▼ ВЫ','#eaff7a','rgba(12,29,54,.9)',48);me.position.y=4.38;me.scale.set(1.38,.42,1);halo.add(me);g.add(halo);}
  g.userData={arms,legs,left,right,armL,armR,head,name,circle,visibleHealth:100};
  return g;
}
function createHazardVisual(h) {
  const g=group(scene,h.x,h.y,h.z),root=group(g);
  const tone = /^#[\da-fA-F]{6}$/.test(h.color||'')?h.color:'#fe927d';
  const ink='#1a2c4b';
  const shape=h.shape;
  if(h.kind==='wave'){
    const ring=torus(root,1,.16,tone);ring.rotation.x=-Math.PI/2;
    const glow=torus(root,1,.46,'#fff3ad');glow.rotation.x=-Math.PI/2;glow.material.transparent=true;glow.material.opacity=.3;
    g.userData.special='wave';
  } else if (h.kind==='vortex') {
    for(let i=0;i<7;i++){
      const r=2.5-i*.3;
      const t=torus(root,r,.16,i%2?tone:'#d3f9ff',0,.2+i*.85,0);t.rotation.x=Math.PI/2+(i%2)*.25;
      t.userData.swirl = true;
    }
    const center=cylinder(root,1.1,.45,7,tone,0,3.2,0,12);center.material.transparent=true;center.material.opacity=.15;
    g.userData.special='vortex';
  } else {
    if(shape==='phone'){
      cube(root,1.25,2.08,.25,'#1d243e');
      cube(root,1.06,1.74,.03,tone,0,.04,.15);
      cube(root,.44,.07,.035,'#172239',0,.84,.18);
      sphere(root,.065,'#21273d',-.41,.91,-.145,10);
    } else if(shape==='car'){
      cube(root,2.25,.55,1.12,tone,0,.17,0);
      cube(root,1.2,.6,.98,'#b8e6ed',-.16,.67,0);
      for(const x of [-.7,.7])for(const z of [-.59,.59]){
        const wheel=cylinder(root,.32,.32,.2,'#202943',x,-.23,z,14);wheel.rotation.x=Math.PI/2;
      }
      cube(root,.3,.14,.12,'#fff4bd',-1.04,.16,.35);
    } else if(shape==='fridge'){
      cube(root,1.35,2.25,1.07,'#d5f0f7');
      cube(root,1.4,1.43,.035,tone,0,.4,.545);
      cube(root,1.4,.74,.035,'#acd1e5',0,-.78,.545);
      cube(root,.08,.34,.12,'#5a8fa5',.55,.34,.61);
      cube(root,.08,.23,.12,'#5a8fa5',.55,-.78,.61);
    } else if(shape==='plane'){
      cube(root,.7,.53,2.4,'#c6eaff');
      cube(root,3.15,.13,.7,tone,0,.05,-.25);
      cube(root,1.1,.55,.32,'#7aa8c6',0,.25,-.87);
      const tip=new THREE.Mesh(new THREE.ConeGeometry(.35,.7,8),mat('#e5f8fa'));tip.rotation.x=Math.PI/2;tip.position.z=1.48;root.add(tip);
      cylinder(root,.21,.21,.15,'#ffba78',0,0,-1.26);
    } else if(shape==='banana'){
      for(let i=0;i<7;i++){const a=-.85+i*.27;const b=sphere(root,.37,tone,a,Math.sin((i/6)*Math.PI)*.44,0,10);b.scale.set(.68,1,.82);}
      sphere(root,.16,'#6e5435',-.98,0,0,8);sphere(root,.16,'#6e5435',.98,0,0,8);
    } else if(shape==='cat'){
      sphere(root,.72,tone,0,-.35,0,14);
      sphere(root,.59,tone,0,.43,.3,14);
      for(let a of [-1,1]){const ear=new THREE.Mesh(new THREE.ConeGeometry(.24,.5,3),mat(tone));ear.position.set(.36*a,.94,.36);ear.rotation.y=Math.PI/6*a;root.add(ear);sphere(root,.075,'#263454',.22*a,.45,.79,8);}
      sphere(root,.1,'#ee91a5',0,.21,.88,8);
    } else if(shape==='tree'){
      cylinder(root,.3,.4,1.2,'#9a7261',0,-.42,0,10);
      for(let i=0;i<3;i++){const crown=new THREE.Mesh(new THREE.ConeGeometry(1.03-i*.2,1.0,7),mat(tone));crown.position.y=.2+i*.58;root.add(crown);}
    } else if(shape==='laptop'){
      cube(root,1.9,.16,1.24,'#404d67',0,-.5,.38);
      const screen=cube(root,1.9,1.2,.12,tone,0,.14,-.18);screen.rotation.x=-.28;
      cube(root,1.6,.94,.02,'#223957',0,.15,-.10).rotation.x=-.28;
    } else if(shape==='shoe'){
      cube(root,1.6,.44,.84,tone,.17,-.3,.2);
      cube(root,.72,.85,.8,tone,-.36,.12,.2);
      cube(root,1.75,.12,1.05,'#faf9f3',.17,-.53,.2);
      for(let i=0;i<4;i++)cube(root,.3,.05,.05,'#fefefe',-.33+i*.2,.44,.64);
    } else if(shape==='bottle'){
      cylinder(root,.5,.5,1.35,tone,0,-.22,0,14);
      cylinder(root,.18,.21,.55,'#d1ffff',0,.69,0,12);
      cylinder(root,.24,.2,.14,'#3f9fa9',0,.99,0,12);
      cylinder(root,.51,.51,.32,'#f9f7de',0,-.21,0,14);
    } else if(shape==='pizza'){
      const slice=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.1,.18,3),mat('#e7bb69'));slice.rotation.y=Math.PI/6;root.add(slice);
      for(let i=0;i<5;i++){const a=i/5*6.28;sphere(root,.17,'#cf4e59',Math.cos(a)*.52,.15,Math.sin(a)*.52,9);}
      const cheese=cylinder(root,.78,.78,.07,'#f7e179',0,.13,0,12);cheese.scale.z=.77;
    } else if(shape==='burger'){
      cylinder(root,.97,.82,.45,'#e9a453',0,.4,0,20);
      cylinder(root,1,.95,.15,'#a5653d',0,.13,0,20);
      cylinder(root,1.05,1.01,.16,'#90cf65',0,.02,0,20);
      cylinder(root,1,.92,.32,'#df9b4e',0,-.2,0,20);
      sphere(root,.97,'#f7b768',0,.58,0,16).scale.y=.32;
    } else if(shape==='meteor'){
      const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(1.02,1),mat(tone,.14,.93));root.add(rock);
      for(let i=0;i<4;i++)sphere(root,rand(.12,.2),'#ffd08c',rand(-.6,.6),rand(-.6,.6),rand(-.6,.6),8);
    } else if(shape==='rocket'){
      cylinder(root,.5,.5,1.7,tone,0,0,0,12);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(.51,.7,12),mat('#f8f3ec'));cone.position.y=1.2;root.add(cone);
      for(let i=0;i<4;i++){let fin=cube(root,.2,.6,.42,'#1a3962',0,-.8,0);fin.rotation.y=i*Math.PI/2;fin.position.x=Math.sin(i*Math.PI/2)*.46;fin.position.z=Math.cos(i*Math.PI/2)*.46;}
      sphere(root,.25,'#5bd9ed',0,.27,.48,12);
    } else if(shape==='ice'){
      const ic=new THREE.Mesh(new THREE.OctahedronGeometry(1.1,0),mat('#aef9ff',.08,.17));root.add(ic);
      const ic2=new THREE.Mesh(new THREE.OctahedronGeometry(.65,0),mat('#e8ffff',.1,.21));ic2.position.set(.55,-.3,.15);root.add(ic2);
    } else if(shape==='donut'){
      const dough=torus(root,.76,.37,'#dfa363');dough.rotation.x=.2;
      const icing=torus(root,.76,.26,tone,0,0,.17);icing.rotation.x=.2;
      for(let i=0;i<13;i++){const a=i/13*Math.PI*2;const spr=cube(root,.11,.035,.08,i%2?'#c8f8e5':'#fff3b5',Math.sin(a)*.78,Math.cos(a)*.78,.43);spr.rotation.z=a;}
    } else if(shape==='toilet'){
      cube(root,.95,.9,.4,'#e9f4ff',0,.45,-.53);
      cylinder(root,.72,.58,.55,'#e9f4ff',0,-.08,.24,16);
      torus(root,.53,.11,'#fdfefe',0,.2,.24).rotation.x=-Math.PI/2;
      cylinder(root,.38,.52,.25,'#b6c4d6',0,-.49,.18);
    } else if(shape==='book'){
      cube(root,1.55,1.9,.28,tone,0,0,0);
      cube(root,1.29,1.65,.07,'#f9f2df',.04,0,.17);
      cube(root,.18,1.87,.31,'#4c386d',-.68,0,.06);
      cube(root,.75,.09,.03,'#6b749d',.15,.35,.21);
    } else if(shape==='piano'){
      cube(root,1.9,.85,1.2,'#25263d',0,.2,0);
      cube(root,1.85,.16,1.15,'#24243b',0,.75,0);
      for(let i=0;i<10;i++)cube(root,.165,.05,.68,'#f9f9f7',-.75+i*.167,-.03,.42);
      for(let i=0;i<6;i++)cube(root,.09,.06,.3,'#181b2e',-.6+i*.24,.015,.16);
    } else if(shape==='ball'){
      sphere(root,1,tone,0,0,0,20);
      torus(root,.99,.045,'#fff8dc').rotation.y=Math.PI/2;
      torus(root,.99,.045,'#fff8dc').rotation.x=Math.PI/2;
    } else if(shape==='chair'){
      cube(root,1.15,.2,1.05,tone,0,0,0);
      cube(root,1.15,1.26,.16,tone,0,.64,-.47);
      for(const x of [-.42,.42])for(const z of [-.35,.35])cube(root,.16,.8,.16,'#4e4664',x,-.48,z);
    } else {
      // Unknown nouns become tangible, colored 3D artifacts with the exact player word.
      const geom=new THREE.DodecahedronGeometry(1.12,1);
      const body=new THREE.Mesh(geom,mat(tone,.1,.36));root.add(body);
      const shiny=torus(root,.96,.048,'#ffffff');shiny.rotation.x=.8;
      const title=canvasLabel(String(h.word||'???').toUpperCase(),'#10223e','#eaff7a',41);
      title.position.y=1.75;title.scale.set(3.4,.85,1);root.add(title);
    }
    root.scale.setScalar(h.scale||1);
    if(h.kind==='rush')root.position.y=.2;
    const shadow = new THREE.Mesh(new THREE.CircleGeometry((h.radius||1)*.7,24), new THREE.MeshBasicMaterial({color:'#152d59',transparent:true,opacity:.2,depthWrite:false}));
    shadow.rotation.x=-Math.PI/2;shadow.position.y=-h.y+.025;g.add(shadow);g.userData.shadow=shadow;
  }
  g.userData.root=root;
  return g;
}
const state={id:null,room:null,joined:false,joinRequested:false,snapshot:null,players:new Map(),hazards:new Map(),particles:[],inputs:{up:false,down:false,left:false,right:false,jump:false,sprint:false},keys:new Set(),touch:{x:0,y:0,sprint:false,jump:false},camYaw:.68,camPitch:.33,camDist:10,clock:0,timeOffset:0,roundEnds:0,chooseEnds:0,picker:null,locked:false,currentWord:'',previousHealth:100,lastVisualAt:0,screenShake:0,aiEnabled:false,muted:false,soundContext:null,toastTimeout:0,bannerTimeout:0,oldRound:0};
let socket = io({autoConnect:false,transports:['websocket','polling'],reconnection:true});
let lastInputSent=0,prevTime=performance.now();
function sound(freq=250,duration=.18,type='sine',volume=.055){
  if(state.muted||!state.joined)return;
  try{if(!state.soundContext)state.soundContext=new AudioContext();const a=state.soundContext;const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(freq,a.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(50,freq*.43),a.currentTime+duration);g.gain.setValueAtTime(volume,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+duration);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+duration)}catch{}
}
function toast(text,ms=2200){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(state.toastTimeout);state.toastTimeout=setTimeout(()=>el.classList.remove('show'),ms);}
function chatMessage(p){const list=$('chat-list'),div=document.createElement('div');div.className='chat-item';div.innerHTML=`<b style="color:${/^#[0-9a-f]{6}$/i.test(p.color)?p.color:'#eaff7a'}">${safe(p.name)}:</b>${safe(p.text)}`;list.append(div);while(list.children.length>9)list.firstChild.remove();list.scrollTop=list.scrollHeight;}
function notice(text){const list=$('chat-list'),div=document.createElement('div');div.className='chat-item system';div.textContent='✳ '+text;list.append(div);while(list.children.length>9)list.firstChild.remove();list.scrollTop=list.scrollHeight;}
function showBanner(event){
  $('event-heading').textContent=event.title;
  $('event-desc').textContent=event.description;
  $('event-by').textContent=`СЛОВО «${event.word}» • ${event.by}`;
  $('event-banner').classList.remove('hidden');$('waiting-notice').classList.add('hidden');
  sound(140,.42,'sawtooth',.08);state.screenShake=.3;
  clearTimeout(state.bannerTimeout);state.bannerTimeout=setTimeout(()=>$('event-banner').classList.add('hidden'),3900);
}
function showWordPrompt(pickerId,name,endsAt){
  state.picker=pickerId;state.chooseEnds=endsAt;state.currentWord='';$('word-input').value='';
  if(pickerId===state.id){$('word-prompt').classList.remove('hidden');$('word-input').focus();sound(870,.18,'triangle');}
  else {$('word-prompt').classList.add('hidden');toast(`${name} выбирает слово для катастрофы`,2300);}
  $('waiting-notice').classList.add('hidden');
}
function updateFeed(history){const root=$('feed-list');root.replaceChildren();if(!history?.length){root.innerHTML='<div class="feed-empty">Первое слово ещё впереди...</div>';return;}
  for(const item of history.slice(0,4)){const div=document.createElement('div');div.className='feed-item';div.style.borderColor=/^#[\da-f]{6}$/i.test(item.color)?item.color:'#eaff7a';div.innerHTML=`<div class="feed-word">${safe(item.title)}</div><div class="feed-meta">${safe(item.by)} · «${safe(item.word)}»</div>`;root.append(div);}
}
function updateScoreboard(players){
  $('online-count').textContent=players.length;$('board-count').textContent=`${players.length}/16`;
  const root=$('board-rows');root.replaceChildren();
  for(const p of [...players].sort((a,b)=>b.score-a.score)) {
    const div=document.createElement('div');div.className='player-row';
    div.innerHTML=`<span class="player-spot" style="background:${/^#[\da-f]{6}$/i.test(p.color)?p.color:'#eaff7a'}">✳</span><span class="player-name ${p.id===state.id?'me':''}" title="${safe(p.name)}">${safe(p.name)}</span><span class="player-score">${Math.floor(p.score)}★</span>`;
    root.append(div);
  }
}
function healthUpdate(p){const health=Math.floor(p?.health||0);$('health-number').innerHTML=`${health}<span>HP</span>`;$('health-fill').style.width=`${health}%`;$('health-fill').style.background=health<30?'#ff7075':health<60?'#ffda85':'#c0fa75';$('score-label').textContent=`${Math.floor(p?.score||0)} ОЧКОВ`;$('player-label').textContent=p?.alive?'ВЫЖИВАЙ':'УСТРАНЁН';
  if(p&&!p.alive){$('death-overlay').classList.remove('hidden');$('respawn-seconds').textContent=Math.max(0,Math.ceil((p.respawnAt-serverNow())/1000));} else $('death-overlay').classList.add('hidden');
  if(p&&p.health<state.previousHealth){$('damage-flash').style.opacity='.4';setTimeout(()=>$('damage-flash').style.opacity='0',150);state.screenShake=.25;sound(80,.19,'sawtooth',.08);}
  state.previousHealth=health;
}
function syncSnapshot(snapshot){
  state.snapshot=snapshot;state.timeOffset=Date.now()-snapshot.serverTime;
  state.roundEnds=snapshot.nextRoundAt;state.chooseEnds=snapshot.promptEndsAt;
  $('round-index').textContent=String(snapshot.round||1).padStart(2,'0');
  const ids=new Set();
  for(const p of snapshot.players){
    ids.add(p.id);
    let obj=state.players.get(p.id);
    if(!obj){obj=avatar(p);state.players.set(p.id,obj);}
    obj.userData.target={x:p.x,y:p.y,z:p.z,yaw:p.yaw,alive:p.alive,invulnerable:p.invulnerable};
    obj.visible=p.alive;
    obj.userData.name.visible=p.alive;
  }
  for(const [id,obj] of state.players) if(!ids.has(id)) {scene.remove(obj);dispose(obj);state.players.delete(id);}
  generatedRenderer.sync(snapshot.models||{}, snapshot.hazards);
  const hazardIDs=new Set();
  for(const h of snapshot.hazards){
    if(h.kind==='generated')continue;
    hazardIDs.add(h.id);let obj=state.hazards.get(h.id);
    if(!obj){obj=createHazardVisual(h);state.hazards.set(h.id,obj);}
    obj.userData.target=h;
  }
  for(const [id,obj] of state.hazards) if(!hazardIDs.has(id)){scene.remove(obj);dispose(obj);state.hazards.delete(id);}
  updateScoreboard(snapshot.players);
  healthUpdate(snapshot.players.find(p=>p.id===state.id));
  if(snapshot.history)updateFeed(snapshot.history);
  if(snapshot.pickerId===state.id&&snapshot.promptEndsAt>serverNow()&&$('word-prompt').classList.contains('hidden')&&!snapshot.activeWord){showWordPrompt(snapshot.pickerId,'ТЫ',snapshot.promptEndsAt);}
  if(!snapshot.promptEndsAt)$('word-prompt').classList.add('hidden');
}
function dispose(object){object.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(m.map)m.map.dispose();m.dispose();}}});}
function initSockets(){
  socket.on('connect',()=>{if(!state.joinRequested)return;
    socket.emit('join',{name:$('name-field').value.trim(),room:$('room-field').value.trim().toUpperCase()},(r)=>{
      if(!r?.ok){$('lobby-error').textContent=r?.error||'Не удалось войти';$('join-button').disabled=false;state.joined=false;return;}
      state.joined=true;$('join-button').disabled=false;$('lobby').classList.add('hidden');$('hud').classList.remove('hidden');$('hud-room').textContent=r.room;
      state.room=r.room;sessionStorage.setItem('ws_name',$('name-field').value.trim());
      const url=new URL(location.href);url.searchParams.set('room',r.room);history.replaceState({},'',url);
      toast('Ты на арене. Берегись катастроф!',3000);
    });
  });
  socket.on('disconnect',()=>{if(state.joined){state.joined=false;toast('Соединение прервалось. Переподключаемся...',5000);}});
  socket.on('welcome',data=>{state.id=data.id;state.aiEnabled=data.aiEnabled;});
  socket.on('snapshot',syncSnapshot);
  socket.on('round',r=>{state.oldRound=r.round;state.roundEnds=Date.now()-state.timeOffset+10000;showWordPrompt(r.pickerId,r.name,r.endsAt);});
  socket.on('word',r=>{state.currentWord=r.word;state.chooseEnds=0;$('word-prompt').classList.add('hidden');$('waiting-notice').classList.remove('hidden');toast(`${r.by} написал: «${r.word}»`,2200);});
  socket.on('disaster',showBanner);
  socket.on('impact',({x,z,color,radius})=>impactParticles(x,z,color,radius));
  socket.on('damage',()=>sound(100,.2,'sawtooth'));
  socket.on('eliminated',r=>{notice(`${r.name} погиб от «${r.hazard}»`);sound(65,.35,'square',.04);});
  socket.on('respawn',()=>{toast('Возрождение! Вперёд!',1800);sound(600,.25,'triangle');});
  socket.on('chat',chatMessage);
  socket.on('notice',r=>notice(r.text));
  socket.on('connect_error',()=>{$('join-button').disabled=false;$('lobby-error').textContent='Нет связи с игровым сервером. Проверь запуск Node.js.';});
  socket.connect();
}
$('join-form').addEventListener('submit',e=>{
  e.preventDefault();const name=$('name-field').value.trim();const room=$('room-field').value.trim().toUpperCase();
  if(name.length<2||!/^[A-Z0-9-]{4,14}$/.test(room)){$('lobby-error').textContent='Ник от 2 символов, код комнаты — 4–14 латинских букв или цифр.';return;}
  $('lobby-error').textContent='';$('join-button').disabled=true;state.joinRequested=true;
  if(socket.connected)socket.emit('join',{name,room},(r)=>{
    if(!r?.ok){$('join-button').disabled=false;$('lobby-error').textContent=r?.error||'Ошибка соединения';return;}
    state.joined=true;$('join-button').disabled=false;$('lobby').classList.add('hidden');$('hud').classList.remove('hidden');$('hud-room').textContent=r.room;state.room=r.room;
    sessionStorage.setItem('ws_name',name);const u=new URL(location.href);u.searchParams.set('room',r.room);history.replaceState({},'',u);
    toast('Ты на арене. Берегись катастроф!',3000);
  });
  else socket.connect();
});
$('random-room').addEventListener('click',()=>{$('room-field').value='W-'+Math.random().toString(36).slice(2,8).toUpperCase();toast('Новая комната создана — нажми «Войти в хаос»');});
$('name-field').value=sessionStorage.getItem('ws_name')||'';
$('room-field').value=(new URLSearchParams(location.search).get('room')||'STORM').toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,14);
$('share-room').addEventListener('click',async()=>{const u=new URL(location.href);u.searchParams.set('room',state.room||'STORM');try{await navigator.clipboard.writeText(u.toString());toast('Ссылка-приглашение скопирована!');}catch{prompt('Скопируй ссылку другу:',u.toString());}});
$('sound-toggle').addEventListener('click',()=>{state.muted=!state.muted;$('sound-toggle').textContent=state.muted?'♪̸':'♫';toast(state.muted?'Звук выключен':'Звук включён');});
$('chat-form').addEventListener('submit',e=>{e.preventDefault();const input=$('chat-text'),value=input.value.trim();if(!value)return;socket.emit('chat',value);input.value='';input.blur();});
$('word-form').addEventListener('submit',e=>{
  e.preventDefault();const word=$('word-input').value.trim();if(word.length<2){toast('Нужно хотя бы два символа');return;}
  socket.emit('submit-word',word,r=>{if(!r?.ok){toast(r?.error||'Слово не принято');return;} $('word-prompt').classList.add('hidden');$('word-input').blur();});
});
function serverNow(){return Date.now()-state.timeOffset;}
function clearKeyInput(){state.keys.clear();state.inputs={up:false,down:false,left:false,right:false,jump:false,sprint:false};}
const codeMap = {'KeyW':'w','KeyA':'a','KeyS':'s','KeyD':'d','ArrowUp':'w','ArrowDown':'s','ArrowLeft':'a','ArrowRight':'d','Space':'space','ShiftLeft':'shift','ShiftRight':'shift'};
window.addEventListener('keydown',e=>{
  if(document.activeElement instanceof HTMLInputElement)return;
  if(e.code==='Escape'){if(document.pointerLockElement)document.exitPointerLock();return;}
  if(codeMap[e.code]){state.keys.add(codeMap[e.code]);e.preventDefault();}
  if(e.code==='Enter'&&state.joined&&$('word-prompt').classList.contains('hidden')){$('chat-text').focus();e.preventDefault();}
});
window.addEventListener('keyup',e=>{if(codeMap[e.code]){state.keys.delete(codeMap[e.code]);e.preventDefault();}});
window.addEventListener('blur',clearKeyInput);
canvas.addEventListener('click',()=>{if(!touchDevice&&state.joined&&!document.pointerLockElement)canvas.requestPointerLock?.();});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement!==canvas)return;state.camYaw-=e.movementX*.004;state.camPitch=clamp(state.camPitch+e.movementY*.003,.10,.9);});
canvas.addEventListener('wheel',e=>{state.camDist=clamp(state.camDist+e.deltaY*.01,6,16);},{passive:true});
if(touchDevice){
  const joy=$('touch-stick'),thumb=$('touch-thumb');let pointer=null;
  const updateJoystick=e=>{const rect=joy.getBoundingClientRect(),x=e.clientX-(rect.left+rect.width/2),y=e.clientY-(rect.top+rect.height/2);const l=Math.max(1,Math.hypot(x,y)),m=Math.min(l,42);state.touch.x=x/l*m/42;state.touch.y=y/l*m/42;thumb.style.transform=`translate(${state.touch.x*42}px,${state.touch.y*42}px)`;};
  joy.addEventListener('pointerdown',e=>{pointer=e.pointerId;joy.setPointerCapture(pointer);updateJoystick(e);});
  joy.addEventListener('pointermove',e=>{if(e.pointerId===pointer)updateJoystick(e);});
  for(const evt of ['pointerup','pointercancel'])joy.addEventListener(evt,e=>{if(e.pointerId!==pointer)return;pointer=null;state.touch.x=0;state.touch.y=0;thumb.style.transform='';});
  for(const [id,key] of [['touch-jump','jump'],['touch-sprint','sprint']]){
    const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);state.touch[key]=true;});
    for(const evt of ['pointerup','pointercancel'])b.addEventListener(evt,()=>{state.touch[key]=false;});
  }
  let touchLook=null,lastX=0,lastY=0;
  canvas.addEventListener('pointerdown',e=>{touchLook=e.pointerId;lastX=e.clientX;lastY=e.clientY;});
  canvas.addEventListener('pointermove',e=>{if(touchLook!==e.pointerId)return;state.camYaw-=(e.clientX-lastX)*.006;state.camPitch=clamp(state.camPitch+(e.clientY-lastY)*.005,.1,.85);lastX=e.clientX;lastY=e.clientY;});
  canvas.addEventListener('pointerup',e=>{if(e.pointerId===touchLook)touchLook=null;});
}
function sendInputs(now){
  if(!state.joined||now-lastInputSent<55)return;lastInputSent=now;
  const typing = document.activeElement instanceof HTMLInputElement;
  const canMove = !typing && $('word-prompt').classList.contains('hidden') && $('death-overlay').classList.contains('hidden');
  let forward=(state.keys.has('w')?1:0)-(state.keys.has('s')?1:0)-state.touch.y;
  let strafe=(state.keys.has('d')?1:0)-(state.keys.has('a')?1:0)+state.touch.x;
  const magnitude=Math.hypot(forward,strafe);
  if(magnitude>1){forward/=magnitude;strafe/=magnitude;}
  const dx=forward*(-Math.sin(state.camYaw))+strafe*Math.cos(state.camYaw);
  const dz=forward*(-Math.cos(state.camYaw))-strafe*Math.sin(state.camYaw);
  const inputs={up:canMove&&dz<-.25,down:canMove&&dz>.25,left:canMove&&dx<-.25,right:canMove&&dx>.25,jump:canMove&&(state.keys.has('space')||state.touch.jump),sprint:canMove&&(state.keys.has('shift')||state.touch.sprint)};
  socket.emit('input',inputs);
}
function impactParticles(x,z,color,radius=1){
  state.screenShake=clamp(state.screenShake+.13,0,.6);sound(rand(80,160),.18,'sawtooth',.028);
  const tone=/^#[\da-f]{6}$/i.test(color)?color:'#ffa873';
  const shock=new THREE.Mesh(new THREE.RingGeometry(.4,.53,30),new THREE.MeshBasicMaterial({color:tone,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));shock.rotation.x=-Math.PI/2;shock.position.set(x,.1,z);scene.add(shock);state.particles.push({obj:shock,ttl:.6,t:.6,kind:'ring'});
  for(let i=0;i<12;i++){
    const block=new THREE.Mesh(new THREE.BoxGeometry(rand(.12,.35),rand(.12,.35),rand(.12,.35)),new THREE.MeshBasicMaterial({color:i%3?'#fff3b3':tone}));
    block.position.set(x,.1,z);scene.add(block);
    state.particles.push({obj:block,ttl:rand(.5,.9),t:rand(.5,.9),kind:'debris',vx:rand(-9,9),vy:rand(4,11),vz:rand(-9,9)});
  }
  if(state.particles.length>300){const oldest=state.particles.splice(0,state.particles.length-300);for(const p of oldest){scene.remove(p.obj);dispose(p.obj);}}
}
function frameEffects(dt){for(let i=state.particles.length-1;i>=0;i--){const p=state.particles[i];p.t-=dt;if(p.t<=0){scene.remove(p.obj);dispose(p.obj);state.particles.splice(i,1);continue;}if(p.kind==='ring'){const scale=1+(1-p.t/p.ttl)*13;p.obj.scale.setScalar(scale);p.obj.material.opacity=p.t/p.ttl*.55;}else{p.obj.position.x+=p.vx*dt;p.obj.position.y+=p.vy*dt;p.obj.position.z+=p.vz*dt;p.vy-=26*dt;p.obj.rotation.x+=dt*9;p.obj.rotation.z+=dt*6;p.obj.material.opacity=p.t/p.ttl;}}
}
const cameraAim = new THREE.Vector3();const desiredCamera=new THREE.Vector3();
function animate(t){requestAnimationFrame(animate);const dt=clamp((t-prevTime)/1000,.001,.065);prevTime=t;state.clock+=dt;
  for(const tower of deco.children)if(tower.userData.float){tower.position.y+=Math.cos(state.clock*.8+tower.userData.phase)*.003; tower.rotation.y+=dt*.13;}
  if(state.joined){sendInputs(t);for(const [id,p] of state.players){const d=p.userData.target;if(!d)continue;
    const smoothing=1-Math.exp(-dt*(id===state.id?18:12));
    p.position.set(lerp(p.position.x,d.x,smoothing),lerp(p.position.y,d.y,smoothing),lerp(p.position.z,d.z,smoothing));
    let delta=((d.yaw-p.rotation.y+Math.PI*3)%(Math.PI*2))-Math.PI;p.rotation.y+=delta*smoothing;
    const moving=Math.abs(p.position.x-(p.userData.prevX??p.position.x))+Math.abs(p.position.z-(p.userData.prevZ??p.position.z));
    const run=clamp(moving/dt*1.8,0,1);
    p.userData.left.rotation.x=Math.sin(state.clock*13+id.length)*.5*run;
    p.userData.right.rotation.x=-Math.sin(state.clock*13+id.length)*.5*run;
    p.userData.armL.rotation.x=-p.userData.left.rotation.x*.8;
    p.userData.armR.rotation.x=-p.userData.right.rotation.x*.8;
    p.userData.prevX=p.position.x;p.userData.prevZ=p.position.z;
    if(d.invulnerable)p.visible=d.alive&&(Math.floor(t/130)%2===0);else p.visible=d.alive;
  }
  for(const [id,obj] of state.hazards){const h=obj.userData.target;if(!h)continue;const a=1-Math.exp(-dt*11);
    obj.position.set(lerp(obj.position.x,h.x,a),lerp(obj.position.y,h.y,a),lerp(obj.position.z,h.z,a));
    if(obj.userData.special==='wave'){obj.userData.root.scale.setScalar(Math.max(.1,h.radiusNow));obj.position.y=.15;}
    else if(obj.userData.special==='vortex'){obj.userData.root.rotation.y+=dt*2.8;obj.position.y=0;}
    else {obj.userData.root.rotation.y=lerp(obj.userData.root.rotation.y,h.yaw||0,a);if(h.kind==='fall'){obj.userData.root.rotation.x+=dt*1.3;obj.userData.root.rotation.z+=dt*.8;}}
    if(obj.userData.shadow){obj.userData.shadow.position.y=-obj.position.y+.07;obj.userData.shadow.material.opacity=clamp(.27-obj.position.y/100,0,.27);}
  }
  generatedRenderer.step(dt);
  const me=state.players.get(state.id);
  if(me){cameraAim.set(me.position.x,me.position.y+1.65,me.position.z);desiredCamera.set(cameraAim.x+Math.sin(state.camYaw)*state.camDist*Math.cos(state.camPitch),cameraAim.y+Math.sin(state.camPitch)*state.camDist+2,cameraAim.z+Math.cos(state.camYaw)*state.camDist*Math.cos(state.camPitch));
    camera.position.lerp(desiredCamera,1-Math.exp(-dt*6));
    if(state.screenShake>.01){camera.position.x+=(Math.random()-.5)*state.screenShake;camera.position.y+=(Math.random()-.5)*state.screenShake;state.screenShake=Math.max(0,state.screenShake-dt*.95);}
    camera.lookAt(cameraAim);
  }
  const now=serverNow();
  const remaining=Math.max(0,(state.roundEnds-now)/1000);
  $('round-time').textContent=q(remaining)+'s';$('round-fill').style.width=`${clamp(remaining/10*100,0,100)}%`;
  const selectRemaining=Math.max(0,(state.chooseEnds-now)/1000);
  $('prompt-seconds').textContent=q(selectRemaining);$('prompt-progress-fill').style.width=`${clamp(selectRemaining/8*100,0,100)}%`;
  $('round-title').textContent=selectRemaining>0?'ИГРОК ВЫБИРАЕТ СЛОВО':'НОВАЯ КАТАСТРОФА ЧЕРЕЗ';
  if(selectRemaining<=0&&state.chooseEnds)$('word-prompt').classList.add('hidden');
  const meInfo=state.snapshot?.players.find(p=>p.id===state.id);
  if(meInfo&&!meInfo.alive)$('respawn-seconds').textContent=Math.max(0,Math.ceil((meInfo.respawnAt-now)/1000));
  } else {
    const orbit=state.clock*.18; camera.position.set(Math.sin(orbit)*60,46,Math.cos(orbit)*65);camera.lookAt(0,0,0);
  }
  frameEffects(dt);renderer.render(scene,camera);
}
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));});
initSockets();requestAnimationFrame(animate);
