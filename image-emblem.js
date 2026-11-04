import * as THREE from './vendor/three.module.js';

// Keep the supplied artwork intact. Only soften its outer border into the scene.
export async function createImageEmblem(source='assets/osoft-reference.png',softBorder=true){
 const map=await new THREE.TextureLoader().loadAsync(source);
 map.colorSpace=THREE.SRGBColorSpace;
 const aspect=map.image.width/map.image.height;
 const material=new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false});
 if(softBorder)material.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   vec2 border=min(vMapUv,1.-vMapUv);
   diffuseColor.a*=smoothstep(0.,.08,border.x)*smoothstep(0.,.08,border.y);
  `);
 };
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(8.8,8.8/aspect),material);
 mesh.name='Original OSoft artwork — fixed facing';return mesh;
}
