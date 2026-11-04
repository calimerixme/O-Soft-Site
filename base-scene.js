import * as THREE from './vendor/three.module.js';
import {Reflector} from './vendor/addons/objects/Reflector.js';
import {referenceGeometry} from './geometry.js';
import {applyParticleWake} from './interaction.js';
import {MeshSurfaceSampler} from './vendor/addons/math/MeshSurfaceSampler.js';
import {JOURNEY_END} from './journey.js';
import {weatherRock} from './rock-material.js';
import {createImageEmblem} from './image-emblem.js';

export async function createBaseScene(sourceLogo,pointerField){
 const descriptors=await (await fetch('assets/base-scene.json')).json();
 const group=new THREE.Group();group.name='Industrial base';group.position.set(0,-3.5,-9);group.scale.setScalar(.7);group.visible=false;
 const loader=new THREE.TextureLoader();
 for(const item of descriptors){
  const geometry=await referenceGeometry(item.name);const texture=await loader.loadAsync(item.map);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=true;
  const stone=/soil|sand|rock_/.test(item.name);
  const material=new THREE.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:'#ffffff',emissiveIntensity:.035,color:stone?'#596675':'#a8b7cf',metalness:stone?.02:.78,roughness:stone?.58:.32,envMapIntensity:stone?.08:.65,bumpMap:texture,bumpScale:stone?.065:.018,side:THREE.FrontSide});
  if(stone)weatherRock(material);
  const mesh=new THREE.Mesh(geometry,material);mesh.name=item.name;mesh.position.fromArray(item.position);mesh.rotation.set(...item.rotation.map(THREE.MathUtils.degToRad));mesh.scale.fromArray(item.scale);if(!/pillars/.test(item.name))group.add(mesh);
 }
 // Broken blocks along the shore add actual silhouette and self-shading beyond the surface grain.
 let rockSeed=481;const rockRandom=()=>{rockSeed=(Math.imul(rockSeed,1664525)+1013904223)>>>0;return rockSeed/4294967296};
 const shardGeometry=new THREE.IcosahedronGeometry(1,1);const shardPositions=shardGeometry.attributes.position;
 for(let i=0;i<shardPositions.count;i++){const x=shardPositions.getX(i),y=shardPositions.getY(i),z=shardPositions.getZ(i);const fracture=.8+Math.sin(x*17.+y*11.+z*7.)*.13+Math.cos(x*9.-z*13.)*.1;shardPositions.setXYZ(i,x*fracture,y*fracture,z*fracture);}
 shardGeometry.computeVertexNormals();
 const shardMaterial=new THREE.MeshStandardMaterial({color:'#59616a',roughness:.9,metalness:0,flatShading:true});weatherRock(shardMaterial);
 const shoreBlocks=new THREE.InstancedMesh(shardGeometry,shardMaterial,64),block=new THREE.Object3D();
 for(let i=0;i<64;i++){const side=i%2?1:-1;const size=.18+rockRandom()*.58;block.position.set(side*(3.4+rockRandom()*7.),.55+size*.3,-1.5+rockRandom()*8.);block.rotation.set(rockRandom()*3,rockRandom()*6,rockRandom()*3);block.scale.set(size*(.7+rockRandom()),size*(.5+rockRandom()*.6),size*(.8+rockRandom()));block.updateMatrix();shoreBlocks.setMatrixAt(i,block.matrix);}group.add(shoreBlocks);
 const reflection=new Reflector(new THREE.PlaneGeometry(100,100),{color:0x667b98,textureWidth:innerWidth<760?512:1024,textureHeight:innerWidth<760?512:1024,clipBias:.003});reflection.rotation.x=-Math.PI*.5;reflection.position.set(0,.5,0);group.add(reflection);
 // World-space ripples keep their size as the camera moves; reflection is rough, not a perfect mirror.
 reflection.material.uniforms.uTime={value:0};
 reflection.material.vertexShader=reflection.material.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec3 waterWorld;').replace('vUv = textureMatrix * vec4( position, 1.0 );','vUv = textureMatrix * vec4( position, 1.0 ); waterWorld=(modelMatrix*vec4(position,1.)).xyz;');
 reflection.material.fragmentShader=`
 uniform sampler2D tDiffuse; uniform float uTime;
 varying vec4 vUv; varying vec3 waterWorld;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
 float waves(vec2 p){return sin(p.x*5.+p.y*8.+uTime*.7)*.32+sin(p.x*12.-p.y*6.-uTime*.9)*.16+noise(p*5.+vec2(uTime*.12,0.))*.5+noise(p*15.-uTime*.08)*.16;}
 void main(){
  vec2 p=waterWorld.xz; float h=waves(p);
  vec2 slope=vec2(waves(p+vec2(.035,0.))-waves(p-vec2(.035,0.)),waves(p+vec2(0.,.035))-waves(p-vec2(0.,.035)));
  vec2 uv=vUv.xy/vUv.w+slope*vec2(.025,.018);
  vec3 reflected=texture2D(tDiffuse,uv).rgb*.4;
  reflected+=(texture2D(tDiffuse,uv+vec2(.0018,.0009)).rgb+texture2D(tDiffuse,uv-vec2(.0018,.0009)).rgb)*.2;
  reflected+=(texture2D(tDiffuse,uv+vec2(-.003,.0015)).rgb+texture2D(tDiffuse,uv-vec2(-.003,.0015)).rgb)*.1;
  vec3 view=normalize(cameraPosition-waterWorld);float grazing=pow(1.-abs(view.y),3.);
  vec3 water=vec3(.008,.018,.028)+vec3(.008,.016,.025)*(h+.8);
  vec3 result=mix(water,reflected, .36+grazing*.4);
  float glint=pow(max(0.,dot(normalize(vec3(-slope.x*2.,1.,-slope.y*2.)),normalize(view+vec3(-.4,.8,-.2)))),70.);
  result+=vec3(.08,.15,.28)*glint;
  gl_FragColor=vec4(result,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;
 const portal=new THREE.Group();portal.position.set(.29,4.82,0);group.add(portal);const artwork=await createImageEmblem();artwork.scale.setScalar(1.3);portal.add(artwork);
 const key=new THREE.PointLight('#376eff',190,30,2);key.position.set(-3,5,3);group.add(key);
 const rim=new THREE.PointLight('#a9ccff',125,25,2);rim.position.set(3,7,-2);group.add(rim);
 const floorLight=new THREE.PointLight('#2864ec',65,18,2);floorLight.position.set(-1,1.5,2);group.add(floorLight);
 const warm=new THREE.PointLight('#ff956a',45,22,2);warm.position.set(2,8,3);group.add(warm);
 group.add(new THREE.HemisphereLight('#9caed0','#111726',.7));
 const roomMaterials=[];group.traverse(o=>{if(o.material&&o!==reflection){o.material.transparent=true;roomMaterials.push(o.material)}});
 return {group,render(progress,time,pointer){
  const enter=THREE.MathUtils.smoothstep(progress,18.5,19.5),settle=THREE.MathUtils.smoothstep(progress,20.2,JOURNEY_END),alpha=enter;group.visible=alpha>.001;group.position.y=-3.5-(1-enter)*7+settle*1.4;group.rotation.y=pointer.x*.025;
  roomMaterials.forEach(m=>m.opacity=alpha*(m.isPointsMaterial?.85:1));reflection.material.uniforms.uTime.value=time;key.intensity=175+Math.sin(time*.45)*30;rim.intensity=115+Math.sin(time*.37+1)*22;floorLight.intensity=60+Math.sin(time*.53)*12;portal.rotation.set(0,-group.rotation.y,0);portal.position.y=4.82;
 }};
}
