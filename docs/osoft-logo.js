import * as THREE from './vendor/three.module.js';
import {applyParticleWake} from './interaction.js';

export async function createOSoftGeometry(){
 const points=await(await fetch('assets/osoft-outline.json')).json();
 const path=new THREE.ShapePath();
 for(let i=0;i<points.length;i++){
  const [x,y,type]=points[i],kind=type&7;
  if(kind===0)path.moveTo(x,-y);
  else if(kind===1)path.lineTo(x,-y);
  else if(kind===3){const b=points[++i],c=points[++i];path.bezierCurveTo(x,-y,b[0],-b[1],c[0],-c[1]);if(c[2]&128)path.currentPath.closePath();}
  if(type&128)path.currentPath.closePath();
 }
 const text=new THREE.ExtrudeGeometry(path.toShapes(false),{depth:8,bevelEnabled:true,bevelThickness:1.4,bevelSize:1.1,bevelSegments:3,curveSegments:12});
 text.computeBoundingBox();const box=text.boundingBox,w=box.max.x-box.min.x;
 text.translate(-(box.min.x+box.max.x)/2,-(box.min.y+box.max.y)/2,0);text.scale(1.54/w,1.54/w,1.54/w);text.translate(0,0,.075);
 const ring=new THREE.Shape();ring.absarc(0,0,1,0,Math.PI*2,false);const hole=new THREE.Path();hole.absarc(0,0,.85,0,Math.PI*2,true);ring.holes.push(hole);
 const circle=new THREE.ExtrudeGeometry(ring,{depth:.10,bevelEnabled:true,bevelThickness:.045,bevelSize:.035,bevelSegments:4,curveSegments:120});
 // Merge only the attributes needed by the surface sampler and physical material.
 const pieces=[circle.index?circle.toNonIndexed():circle,text.index?text.toNonIndexed():text];const merged=new THREE.BufferGeometry();
 for(const name of ['position','normal','uv']){const arrays=pieces.map(g=>g.attributes[name].array);const data=new Float32Array(arrays.reduce((n,a)=>n+a.length,0));let offset=0;for(const a of arrays){data.set(a,offset);offset+=a.length;}merged.setAttribute(name,new THREE.BufferAttribute(data,name==='uv'?2:3));}
 for(const g of [...pieces,circle,text])g.dispose();return merged;
}

export function createLogoGlass(){
 const material=new THREE.MeshPhysicalMaterial({color:'#d9f5ff',metalness:0,roughness:.035,transmission:.94,thickness:.3,ior:1.46,iridescence:1,iridescenceIOR:1.32,iridescenceThicknessRange:[130,540],clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.25,transparent:true,depthWrite:false});
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vGlassPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvGlassPosition=position;');
  shader.fragmentShader='varying vec3 vGlassPosition;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   float edge=pow(1.-abs(dot(normal,normalize(vViewPosition))),2.);
   float band=.5+.5*sin(atan(vGlassPosition.y,vGlassPosition.x)*2.+.4);
   vec3 spectrum=mix(vec3(.01,.8,1.),vec3(.55,.12,1.),band);
   float lettering=1.-smoothstep(.79,.84,length(vGlassPosition.xy));
   outgoingLight=outgoingLight*mix(.8,1.5,lettering)+spectrum*edge*.8+vec3(.09,.17,.2)*lettering;
   diffuseColor.a*=mix(.48,.94,lettering);
   #include <opaque_fragment>
  `);
 };return material;
}

export function createLogoAura(field){
 const count=12500,positions=new Float32Array(count*3),colors=new Float32Array(count*3),sizes=new Float32Array(count);let seed=84;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};const c=new THREE.Color();
 const sample=()=>{const t=rand(),a=t*Math.PI*3.1-.8,branch=rand(),spread=.02+Math.pow(rand(),2)*.24;
  if(branch<.73){const r=1.15+Math.sin(t*12.)*.14;return [Math.sin(a)*r+(rand()-.5)*spread,(t-.5)*2.8+Math.sin(a)*.25+(rand()-.5)*spread,Math.cos(a)*.6+(rand()-.5)*spread];}
  const a2=rand()*Math.PI*2,r=1.05+Math.pow(rand(),2)*.75;return [Math.cos(a2)*r,Math.sin(a2)*r*.8,(rand()-.5)*1.4];};
 for(let i=0;i<count;i++){positions.set(sample(),i*3);c.setHSL(.49+rand()*.27,.8,.5+rand()*.3);colors.set([c.r,c.g,c.b],i*3);sizes[i]=.25+Math.pow(rand(),4)*2.5;}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setAttribute('aHaloSize',new THREE.BufferAttribute(sizes,1));
 const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'#ffffff');g.addColorStop(.14,'#ffffff');g.addColorStop(.45,'#ffffff90');g.addColorStop(1,'#ffffff00');ctx.fillStyle=g;ctx.fillRect(0,0,32,32);
 const map=new THREE.CanvasTexture(canvas);const material=new THREE.PointsMaterial({map,size:.027,vertexColors:true,transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending});
 material.onBeforeCompile=shader=>{shader.vertexShader='attribute float aHaloSize;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('gl_PointSize = size;','gl_PointSize = size*aHaloSize;');};
 if(field)applyParticleWake(material,field);
 const halo=new THREE.Group();halo.add(new THREE.Points(geometry,material));
 const pearlMaterial=new THREE.MeshPhysicalMaterial({color:'#b2edff',metalness:.45,roughness:.1,clearcoat:1,iridescence:1,iridescenceThicknessRange:[180,550],envMapIntensity:1.7});
 const pearls=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,8),pearlMaterial,210),dummy=new THREE.Object3D();
 for(let i=0;i<210;i++){dummy.position.fromArray(sample());dummy.scale.setScalar(.007+Math.pow(rand(),3)*.034);dummy.updateMatrix();pearls.setMatrixAt(i,dummy.matrix);c.setHSL(.49+rand()*.27,.65,.6);pearls.setColorAt(i,c);}if(field)applyParticleWake(pearlMaterial,field);halo.add(pearls);return halo;
}
