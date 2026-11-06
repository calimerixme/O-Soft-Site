import * as THREE from './vendor/three.module.js';
import {applyParticleWake} from './interaction.js';
export async function createDesktopParticles(scene,pointerField,columnHeight,particleWork){
let seed=711;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const loader=new THREE.TextureLoader(),matcap=await loader.loadAsync('assets/metal-matcap.jpg');matcap.colorSpace=THREE.SRGBColorSpace;
 const count=9000;const particleMaterial=new THREE.MeshMatcapMaterial({matcap,color:'#c9efff'});particleMaterial.onBeforeCompile=shader=>{shader.uniforms.uParticleWork=particleWork;shader.vertexShader='uniform float uParticleWork;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>','#include <color_vertex>\n#if defined(USE_COLOR) || defined(USE_INSTANCING_COLOR)\nvec3 columnTint=mix(vec3(.05,.72,.95),vec3(.55,.18,.92),.5+.5*sin(instanceMatrix[3].y*1.2+instanceMatrix[3].x*2.));vColor=mix(vColor,columnTint,(.55+uParticleWork*.35));\n#endif');shader.fragmentShader=shader.fragmentShader.replace('vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;','vec3 outgoingLight = diffuseColor.rgb * (matcapColor.rgb * .9 + vec3(.12));'); };
 // One quarter keeps the cursor wake; the other three quarters never run that shader loop.
 const interactiveCount=Math.ceil(count/4),fixedCount=count-interactiveCount;
 const particleGeometry=new THREE.IcosahedronGeometry(1,1);
 const fixedMaterial=particleMaterial.clone();const tintShader=particleMaterial.onBeforeCompile;
 fixedMaterial.onBeforeCompile=shader=>{
  tintShader(shader);
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   #ifdef USE_INSTANCING
    vec4 fixedCenter=modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
    transformed*=min(1.,abs(fixedCenter.z)/5.5);
   #endif
  `);
 };
 const responsiveParticles=new THREE.InstancedMesh(particleGeometry,particleMaterial,interactiveCount);
 const fixedParticles=new THREE.InstancedMesh(particleGeometry,fixedMaterial,fixedCount);
 responsiveParticles.name='Cursor-reactive particles (25%)';fixedParticles.name='Fixed particles (75%)';
 const particles=new THREE.Group();particles.add(fixedParticles,responsiveParticles);
 let responsiveIndex=0,fixedIndex=0;
 const dummy=new THREE.Object3D(),particleColor=new THREE.Color();
 // Uneven clouds and braided filaments leave gaps without becoming a rigid sleeve.
 const gaussian=()=>((random()+random()+random())-1.5)*1.65;
 const clouds=Array.from({length:78},(_,i)=>{
  const y=1.2-i/77*(columnHeight+3)+(random()-.5)*.65;
  const angle=i*2.399963+random()*.7,radius=.85+random()*2.3;
  return {x:Math.cos(angle)*radius,y,z:Math.sin(angle)*radius,spread:.18+random()*.5};
 });
 for(let i=0;i<count;i++){
  let x,y,z;
  if(i<count*.38){const c=clouds[Math.floor(random()*clouds.length)];x=c.x+gaussian()*c.spread;y=c.y+gaussian()*(c.spread+.3);z=c.z+gaussian()*c.spread;}
  else {y=(random()-.95)*(columnHeight+3);const strand=i%3;const angle=y*.85+strand*2.094+gaussian()*.32;const radius=i<count*.96?1.45+Math.sin(y*.63+strand)*.65+random()*.7:2.4+random()*1.6;x=Math.cos(angle)*radius;z=Math.sin(angle)*radius;}
  const size=.004+Math.pow(random(),4)*.057;
  dummy.position.set(x,y,z);dummy.rotation.set(random()*6,random()*6,random()*6);dummy.scale.setScalar(size);dummy.updateMatrix();const target=i%4===0?responsiveParticles:fixedParticles;const particleIndex=i%4===0?responsiveIndex++:fixedIndex++;target.setMatrixAt(particleIndex,dummy.matrix);
  particleColor.setHSL(.49+random()*.29,.55+random()*.3,.4+random()*.3);target.setColorAt(particleIndex,particleColor);
 }
 particleMaterial.color.setRGB(1,1,1);fixedMaterial.color.setRGB(1,1,1);scene.add(particles);

applyParticleWake(particleMaterial,pointerField);
return {update(s,time,position,opacity){particles.visible=opacity>.001;particles.position.copy(position);particles.rotation.y=s*.13;responsiveParticles.rotation.y=time*.009;const countVisible=Math.floor(count*opacity);responsiveParticles.count=Math.min(interactiveCount,Math.ceil(countVisible/4));fixedParticles.count=Math.min(fixedCount,countVisible-responsiveParticles.count);}};
}
