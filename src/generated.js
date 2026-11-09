// Render AI-authored composite 3D models in efficient batches.
export function createGeneratedRenderer(THREE,scene){
  const models=new Map(),object=new THREE.Object3D(),partTransform=new THREE.Object3D(),world=new THREE.Matrix4(),composed=new THREE.Matrix4();
  function shape(p){
    switch(p.type){
      case 'box':return new THREE.BoxGeometry(1,1,1);
      case 'sphere':return new THREE.SphereGeometry(.5,16,12);
      case 'cylinder':return new THREE.CylinderGeometry(.5,.5,1,16);
      case 'cone':return new THREE.ConeGeometry(.5,1,16);
      case 'capsule':return new THREE.CapsuleGeometry(.35,.55,5,12);
      case 'torus':return new THREE.TorusGeometry(.34,.14,10,22);
      case 'icosahedron':return new THREE.IcosahedronGeometry(.62,1);
      case 'dodecahedron':return new THREE.DodecahedronGeometry(.56);
      case 'octahedron':return new THREE.OctahedronGeometry(.63);
      case 'tube':return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p.points.map(x=>new THREE.Vector3(...x))),Math.min(36,p.points.length*6),.12,6);
      case 'lathe':return new THREE.LatheGeometry(p.profile.map(([x,y])=>new THREE.Vector2(Math.abs(x),y)),20);
      case 'extrude':{
        const s=new THREE.Shape(),a=p.outline;s.moveTo(a[0][0],a[0][1]);for(let i=1;i<a.length;i++)s.lineTo(a[i][0],a[i][1]);s.closePath();return new THREE.ExtrudeGeometry(s,{depth:.2,bevelEnabled:true,bevelThickness:.045,bevelSize:.045,steps:1});
      }
      default:return new THREE.SphereGeometry(.5,12,9);
    }
  }
  function build(id,model){
    const g=new THREE.Group();scene.add(g);
    const parts=model.parts.map(p=>{
      const geom=shape(p),material=new THREE.MeshStandardMaterial({color:p.color,metalness:p.metalness,roughness:p.roughness,side:THREE.DoubleSide});
      const mesh=new THREE.InstancedMesh(geom,material,350);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow=false;mesh.receiveShadow=true;g.add(mesh);
      partTransform.position.set(...p.pos);partTransform.rotation.set(...p.rot);partTransform.scale.set(...p.size);partTransform.updateMatrix();
      return {mesh,matrix:partTransform.matrix.clone()};
    });
    return {g,parts,items:new Map(),targets:[]};
  }
  function clear(info){scene.remove(info.g);for(const p of info.parts){p.mesh.geometry.dispose();p.mesh.material.dispose();p.mesh.dispose();}}
  function sync(descriptions,hazards){
    for(const [id,model] of Object.entries(descriptions||{}))if(!models.has(id)&&model?.parts?.length)models.set(id,build(id,model));
    const active=new Map();
    for(const h of hazards||[])if(h.kind==='generated'&&h.modelId){
      const id=String(h.modelId);if(!active.has(id))active.set(id,[]);active.get(id).push(h);
    }
    for(const [id,info] of models){
      if(!descriptions[id]){clear(info);models.delete(id);continue;}
      const targets=active.get(id)||[],valid=new Set(targets.map(t=>t.id));
      for(const key of info.items.keys())if(!valid.has(key))info.items.delete(key);
      for(const h of targets)if(!info.items.has(h.id))info.items.set(h.id,{x:h.x,y:h.y,z:h.z,yaw:h.yaw||0});
      info.targets=targets;
    }
  }
  function step(dt){
    const a=1-Math.exp(-dt*13);
    for(const info of models.values()){
      for(let i=0;i<info.targets.length;i++){
        const h=info.targets[i],o=info.items.get(h.id);if(!o)continue;
        o.x+=(h.x-o.x)*a;o.y+=(h.y-o.y)*a;o.z+=(h.z-o.z)*a;
        const yaw=((h.yaw-o.yaw+Math.PI*3)%(Math.PI*2))-Math.PI;o.yaw+=yaw*a;
        object.position.set(o.x,o.y,o.z);object.rotation.set(0,o.yaw,0);object.scale.setScalar(h.scale||1);object.updateMatrix();world.copy(object.matrix);
        for(const p of info.parts){composed.multiplyMatrices(world,p.matrix);p.mesh.setMatrixAt(i,composed);}
      }
      for(const p of info.parts){p.mesh.count=info.targets.length;p.mesh.instanceMatrix.needsUpdate=true;}
    }
  }
  return {sync,step};
}