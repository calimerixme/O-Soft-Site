import {renderProfile as profile} from './render-profile.js?v=20261107-preload-1';
import * as THREE from './vendor/three.module.js';
import {createOuterGlass} from './outer-glass.js?v=20261107-preload-1';
import {createAluminium} from './aluminium.js?v=20261107-preload-1';
// Concatenate once at construction; every source uses position/normal/uv.
function mergeGeometries(parts){
 const merged=new THREE.BufferGeometry();let vertices=0,indexCount=0;
 for(const part of parts){vertices+=part.attributes.position.count;indexCount+=part.index.count;}
 for(const name of ['position','normal','uv']){
  const size=parts[0].attributes[name].itemSize,data=new Float32Array(vertices*size);let offset=0;
  for(const part of parts){data.set(part.attributes[name].array,offset);offset+=part.attributes[name].array.length;}
  merged.setAttribute(name,new THREE.BufferAttribute(data,size));
 }
 const indices=new Uint32Array(indexCount);let indexOffset=0,vertexOffset=0;
 for(const part of parts){for(const index of part.index.array)indices[indexOffset++]=index+vertexOffset;vertexOffset+=part.attributes.position.count;}
 merged.setIndex(new THREE.BufferAttribute(indices,1));return merged;
}

// A real, hollow assembly: the gallery can pass both in front and behind it.
export function createTubeColumn(height){
 const group=new THREE.Group();group.name='Glass conduit with black cables';
 const radialSegments=profile.mobile?40:64,ringSegments=profile.mobile?48:80;
 const steel=createAluminium(true);
 const black=new THREE.MeshStandardMaterial({color:'#080e19',metalness:.18,roughness:.4,envMapIntensity:.28});
 const trim=createAluminium();
 // Rounded chamber hoops catch a continuous blue highlight, like the end chamber.
 const hoopMetal=createAluminium(true);hoopMetal.color.set('#65758f');hoopMetal.roughness=.19;hoopMetal.clearcoat=profile.mobile?0:.5;hoopMetal.clearcoatRoughness=.16;hoopMetal.envMapIntensity=1.9;
 // Broad studio reflections follow the rounded surface, retaining dark metal in between.
 // Evaluate per fragment so the white/blue/violet highlights remain smooth across the hoop.
 hoopMetal.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   vec3 hoopReflection=reflect(-normalize(vViewPosition),normal);
   float hoopWhite=pow(max(0.,dot(hoopReflection,normalize(vec3(-.35,.75,.6)))),22.);
   float hoopBlue=pow(max(0.,dot(hoopReflection,normalize(vec3(-.8,.25,.55)))),9.);
   float hoopViolet=pow(max(0.,dot(hoopReflection,normalize(vec3(.85,.2,.5)))),12.);
   outgoingLight+=vec3(.85,.92,1.)*hoopWhite*.85
    +vec3(.06,.25,.95)*hoopBlue*.55+vec3(.48,.16,.8)*hoopViolet*.55;
   #include <opaque_fragment>
  `);
 };
 hoopMetal.customProgramCacheKey=()=> 'conduit-hoop-studio-reflections-v1';
 const glass=new THREE.MeshPhysicalMaterial({color:'#526a99',metalness:0,roughness:.08,transparent:true,opacity:.035,depthWrite:false,side:THREE.DoubleSide,clearcoat:profile.mobile?0:1,iridescence:profile.mobile?0:.65,iridescenceThicknessRange:[180,410],envMapIntensity:.55});
 const blue=new THREE.MeshBasicMaterial({color:'#53baff',toneMapped:false});
 const violet=new THREE.MeshBasicMaterial({color:'#8b69d5',transparent:true,opacity:.35,depthWrite:false});
 const add=(geometry,material,y=0)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.y=y;group.add(mesh);return mesh;};
 const ring=(r,t,y,material=steel)=>{if(t>.06){const profile=[[r-t,-t*.55],[r+t,-t*.55],[r+t,t*.55],[r-t,t*.55],[r-t,-t*.55]].map(p=>new THREE.Vector2(...p));return add(new THREE.LatheGeometry(profile,ringSegments),material,y);}const mesh=add(new THREE.TorusGeometry(r,t,profile.mobile?6:10,ringSegments),material,y);mesh.rotation.x=Math.PI/2;return mesh;};
 // The open glass shell leaves the black cable bundle visible from every angle.
 add(new THREE.CylinderGeometry(.72,.72,height,radialSegments,1,true),glass,-height/2);
 const thirdWall=createOuterGlass(2.1,height);thirdWall.position.y=-height/2;group.add(thirdWall);
 // A centered diffuse beam faces the view while the conduit rotates around its axis.
 const glowMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:'varying vec2 vGlowUV;void main(){vGlowUV=uv;vec4 axis=modelViewMatrix*vec4(0.,position.y,0.,1.);axis.x+=position.x;gl_Position=projectionMatrix*axis;}',
  fragmentShader:`varying vec2 vGlowUV;void main(){float x=(vGlowUV.x-.5)*2.;float glow=exp(-x*x*34.)*.62+exp(-x*x*5.)*.13;
   glow*=smoothstep(0.,.018,vGlowUV.y)*smoothstep(0.,.018,1.-vGlowUV.y);
   vec3 violet=mix(vec3(.46,.22,1.),vec3(1.02,.86,1.55),exp(-x*x*40.));
   gl_FragColor=vec4(violet,glow);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`});
 const halo=add(new THREE.PlaneGeometry(.7,height),glowMaterial,-height/2);halo.position.z=0;
 for(let y=0;y>=-height;y-=2.45){ring(1.035,.011,y,steel);ring(.725,.008,y,steel);}
 for(const [r,t,y] of [[1.09,.07,0],[1.29,.15,.12],[1.57,.2,.3],[1.82,.14,.5],[1.07,.065,-height]])ring(r,t,y);
 ring(1.1,.012,-.03,blue);ring(1.45,.01,.23,blue);ring(1.055,.012,-height+.04,blue);
 // Radial seams, fasteners and cable sockets on the upper flange.
 for(let i=0;i<28;i++){
  const a=i*Math.PI*2/28,r=.52;
  const socket=add(new THREE.CylinderGeometry(.075,.075,.14,10),trim,-.1);socket.position.x=Math.cos(a)*r;socket.position.z=Math.sin(a)*r;
  const points=[];
  for(let j=0;j<=64;j++){
   const f=j/64,twist=a+Math.sin(f*16+i*.73)*.38+f*.8;
   const radius=r*(.8+.18*Math.cos(f*12+i));
   points.push(new THREE.Vector3(Math.cos(twist)*radius,-.16-f*(height-.25),Math.sin(twist)*radius));
  }
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),profile.mobile?32:96,.02+(i%4)*.004,profile.mobile?4:6,false),black);
  const bolt=add(new THREE.CylinderGeometry(.034,.034,.05,6),trim,.58);bolt.position.set(Math.cos(a)*1.62,.58,Math.sin(a)*1.62);
 }
 // Spaced service chambers: paired flanges, bolted bridges and slack cable runs.
 // Bake these static parts into three meshes rather than adding per-frame work.
 const batches=new Map([[steel,[]],[black,[]],[trim,[]],[blue,[]],[hoopMetal,[]]]);
 function part(geometry,material,position=new THREE.Vector3(),rotation=null){
  const matrix=new THREE.Matrix4().compose(position,rotation||new THREE.Quaternion(),new THREE.Vector3(1,1,1));
  geometry.applyMatrix4(matrix);batches.get(material).push(geometry);
 }
 const stations=[{y:-3.9,r:1.78},{y:-9.2,r:2.02},{y:-15.7,r:1.67},{y:-21.6,r:1.94},{y:-height+.28,r:2.1}];
 const horizontal=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);
 stations.forEach(({y,r},index)=>{
  for(const offset of [0,-.38]){
   part(new THREE.TorusGeometry(r-.1,.115,profile.mobile?10:16,ringSegments),hoopMetal,new THREE.Vector3(0,y+offset,0),horizontal);
  }
  for(let j=0;j<8;j++){
   const a=j*Math.PI/4+index*.21,x=Math.cos(a)*(r-.09),z=Math.sin(a)*(r-.09);
   part(new THREE.CylinderGeometry(.035,.035,.38,6),trim,new THREE.Vector3(x,y-.19,z));
   part(new THREE.CylinderGeometry(.06,.06,.035,6),black,new THREE.Vector3(x,y+.07,z));
  }
  // Short inset light segments identify each chamber without covering the glass.
  for(let j=0;j<3;j++)part(new THREE.TorusGeometry(r+.045,.012,5,18,.28),blue,new THREE.Vector3(0,y-.19,0),new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2,0,index*.6+j*2.094)));
  if(index===stations.length-1)return;
  const next=stations[index+1];
  for(let j=0;j<5;j++){
   const a=j*Math.PI*2/5+index*.47,b=a+.4+(j%2)*.45;
   const points=[new THREE.Vector3(Math.cos(a)*(r-.12),y-.36,Math.sin(a)*(r-.12)),
    new THREE.Vector3(Math.cos(a+.2)*(1.35+j*.12),y-1.8,Math.sin(a+.2)*(1.35+j*.12)),
    new THREE.Vector3(Math.cos(b)*1.9,next.y+.9-(j%3)*.32,Math.sin(b)*1.9),
    new THREE.Vector3(Math.cos(b)*(next.r-.12),next.y,Math.sin(b)*(next.r-.12))];
   part(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),profile.mobile?24:40,.025+(j%3)*.008,profile.mobile?4:6,false),black);
  }
 });
 // Offset vertical rails join chambers; gaps remain open so the assembly reads in depth.
 for(let j=0;j<4;j++){
  const a=j*Math.PI/2+.4;
  part(new THREE.BoxGeometry(.045,height-.8,.065),steel,new THREE.Vector3(Math.cos(a)*1.98,-height/2,Math.sin(a)*1.98));
 }
 for(const [material,geometries] of batches){
  if(!geometries.length)continue;
  const mesh=new THREE.Mesh(mergeGeometries(geometries),material);mesh.name='Static chamber assembly';group.add(mesh);
  geometries.forEach(g=>g.dispose());
 }
 // Identical opaque materials can share a draw call without changing any shapes.
 const opaqueBatches=new Map();
 for(const mesh of [...group.children]){
  if(!mesh.isMesh||mesh.material.transparent)continue;
  mesh.updateMatrix();const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrix);
  if(!opaqueBatches.has(mesh.material))opaqueBatches.set(mesh.material,[]);
  opaqueBatches.get(mesh.material).push(geometry);group.remove(mesh);mesh.geometry.dispose();
 }
 for(const [material,geometries] of opaqueBatches){
  const mesh=new THREE.Mesh(mergeGeometries(geometries),material);mesh.name='Batched conduit hardware';group.add(mesh);geometries.forEach(g=>g.dispose());
 }
 group.userData.occluders=group.children.filter(mesh=>!mesh.material.transparent);
 return group;
}
