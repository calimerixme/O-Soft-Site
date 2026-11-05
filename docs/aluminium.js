import * as THREE from './vendor/three.module.js';

let brushed,metalEnvironment;
export function configureAluminium(renderer){
 const studio=new THREE.Scene();studio.background=new THREE.Color('#303746');
 const panel=(color,x,y,z,w,h)=>{const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));p.position.set(x,y,z);p.lookAt(0,y,0);studio.add(p);};
 panel('#ffffff',-3,1,5,2.3,12);panel('#b8c2d4',2,0,5,.65,12);
 panel('#4F82DA',-5,0,1,2,15);panel('#9374C1',5,0,1,1.5,15);
 panel('#607086',0,5,-4,7,2);
 const generator=new THREE.PMREMGenerator(renderer);metalEnvironment=generator.fromScene(studio,.025).texture;generator.dispose();
 studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
}
export function createAluminium(darker=false){
 if(!brushed){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;
  const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(128,128);let seed=4921;
  for(let y=0;y<128;y++){
   seed=(Math.imul(seed,1664525)+1013904223)>>>0;
   const grain=192+(seed%48);
   for(let x=0;x<128;x++){const i=(y*128+x)*4;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=grain;pixels.data[i+3]=255;}
  }
  ctx.putImageData(pixels,0,0);brushed=new THREE.CanvasTexture(canvas);brushed.wrapS=brushed.wrapT=THREE.RepeatWrapping;brushed.repeat.set(3,12);
 }
 return new THREE.MeshPhysicalMaterial({name:darker?'Blued steel #283247':'Satin aluminium #A8AFBB',color:darker?'#283247':'#A8AFBB',metalness:.96,roughness:darker?.3:.38,roughnessMap:brushed,envMap:metalEnvironment,envMapIntensity:1.35,clearcoat:.12,clearcoatRoughness:.38});
}

// Shade casing bands per fragment, avoiding triangle-shaped material seams.
export function createCasingMaterial(){
 const material=createAluminium();material.color.set('#ffffff');
 material.onBeforeCompile=shader=>{
  shader.uniforms.uCasingSilver={value:new THREE.Color('#A8AFBB')};
  shader.uniforms.uCasingSteel={value:new THREE.Color('#283247')};
  shader.vertexShader='varying float vCasingY;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCasingY=position.y;');
  shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
   if(position.y>8.&&abs(objectNormal.y)<.5)objectNormal=normalize(vec3(position.x,0.,position.z));`);
  shader.fragmentShader='varying float vCasingY;uniform vec3 uCasingSilver;uniform vec3 uCasingSteel;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float silver=max(smoothstep(8.93,8.97,vCasingY),1.-smoothstep(2.53,2.57,vCasingY));
   diffuseColor.rgb*=mix(uCasingSteel,uCasingSilver,silver);`);
 };
 return material;
}
