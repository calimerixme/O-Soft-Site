import * as THREE from './vendor/three.module.js';
import {Reflector} from './vendor/addons/objects/Reflector.js';
import {referenceGeometry} from './geometry.js';
import {applyParticleWake} from './interaction.js';
import {MeshSurfaceSampler} from './vendor/addons/math/MeshSurfaceSampler.js';
import {JOURNEY_END,ENDING} from './journey.js';
import {weatherRock} from './rock-material.js';
import {createImageEmblem} from './image-emblem.js';
import {createOuterGlass} from './outer-glass.js';
import {createAluminium,createCasingMaterial} from './aluminium.js';

export async function createBaseScene(sourceLogo,pointerField){
 const descriptors=await (await fetch('assets/base-scene.json')).json();
 const group=new THREE.Group();group.name='Industrial base';group.position.set(0,-3.5,-9);group.scale.setScalar(.7);group.visible=false;
 const shoreWaterLevel={value:-3.15};
 const loader=new THREE.TextureLoader();
 for(const item of descriptors){
  const geometry=await referenceGeometry(item.name);const texture=await loader.loadAsync(item.map);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=true;
  const stone=/soil|sand|rock_/.test(item.name);
  const material=new THREE.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:'#ffffff',emissiveIntensity:.035,color:stone?'#ffffff':'#a8b7cf',metalness:stone?.02:.78,roughness:stone?.58:.32,envMapIntensity:stone?.08:.65,bumpMap:texture,bumpScale:stone?.065:.018,side:THREE.FrontSide});
  if(stone){material.side=THREE.DoubleSide;material.emissiveIntensity=0;weatherRock(material,{sand:/sand|soil/.test(item.name),waterLevel:shoreWaterLevel});}
  const mesh=new THREE.Mesh(geometry,material);mesh.name=item.name;mesh.position.fromArray(item.position);mesh.rotation.set(...item.rotation.map(THREE.MathUtils.degToRad));mesh.scale.fromArray(item.scale);if(!/pillars|base-sand|base-rocky_soil|base-rock_L|base-rock_R/.test(item.name))group.add(mesh);
 }
 // One connected shoreline surface replaces the open, faceted terrain sheets.
 // A broad damp shore with an irregular edge projects into the water.
 const shoreHeight=(x,z)=>{
  const edge=3.4+Math.sin(x*.64)*.65+Math.cos(x*1.23)*.23+1.4*Math.exp(-((x-1.6)**2)/8);
  const beach=1.-THREE.MathUtils.smoothstep(z,edge-.85,edge+.85);
  return .15+beach*.85+Math.sin(x*3.2+Math.sin(z*1.2))*.016+Math.sin(z*4.1+x)*.011;
 };
 const bankHeight=(x,z)=>{
  const u=Math.max(0,Math.abs(x)-(x<0?3.7:5.3));
  const depth=THREE.MathUtils.clamp((10-z)/11,0,1);
  const rise=Math.pow(u,1.08)*(x<0?.68:.45)*depth;
  const chips=(Math.sin(x*.9+z*.53)*.10+Math.cos(x*1.9-z*.77)*.065+Math.abs(Math.sin(z*2.7+x))*.07)*Math.min(1,u*.4);
  return shoreHeight(x,z)+rise+chips;
 };
 const sandGeometry=new THREE.PlaneGeometry(48,44,144,132);sandGeometry.rotateX(-Math.PI/2);
 const sandPositions=sandGeometry.attributes.position;
 for(let i=0;i<sandPositions.count;i++){const x=sandPositions.getX(i),z=sandPositions.getZ(i);sandPositions.setY(i,shoreHeight(x,z));}
 sandGeometry.computeVertexNormals();
 const sandMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',side:THREE.DoubleSide});
 sandMaterial.userData.solidTerrain=true;weatherRock(sandMaterial,{sand:true,waterLevel:shoreWaterLevel});
 const sandSurface=new THREE.Mesh(sandGeometry,sandMaterial);sandSurface.name='Continuous damp sand with irregular shoreline';group.add(sandSurface);
 const bankMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',side:THREE.DoubleSide});
 bankMaterial.userData.solidTerrain=true;weatherRock(bankMaterial,{waterLevel:shoreWaterLevel});
 for(const side of [-1,1]){
  const geometry=new THREE.PlaneGeometry(25,36,84,100);geometry.rotateX(-Math.PI/2);
  const points=geometry.attributes.position;
  for(let i=0;i<points.count;i++){const x=side*(Math.max(0,points.getX(i)+12.5)+(side<0?3.7:5.3)),z=points.getZ(i)-7;points.setXYZ(i,x,bankHeight(x,z),z);}
  geometry.computeVertexNormals();
  const bank=new THREE.Mesh(geometry,bankMaterial);bank.name='Sloping fractured basalt bank';group.add(bank);
 }
 // Share the actual base geometry/textures, but turn its machinery upside down.
 // Independent materials keep the two ends' reveals separate.
 const upperAssembly=new THREE.Group();upperAssembly.name='Inverted copy of lower machinery';
 const upperHardware=new THREE.Group();upperHardware.rotation.z=Math.PI;upperHardware.scale.setScalar(.5);upperHardware.position.y=5.05;
 const upperMaterials=[];
 for(const mesh of group.children.filter(o=>/structure/.test(o.name))){
  const copy=mesh.clone();copy.material=createCasingMaterial();copy.material.transparent=true;upperMaterials.push(copy.material);upperHardware.add(copy);
 }
 const upperGlass=createOuterGlass(4.2,8.6);upperGlass.position.y=5.8;upperHardware.add(upperGlass);upperAssembly.add(upperHardware);
 // Keep upper cables inside the chamber, with both ends seated in hardware.
 // The lower reference cable mesh has free outer tails and is not copied here.
 const attachedCableMaterial=new THREE.MeshStandardMaterial({color:'#0b1424',metalness:.45,roughness:.35,envMapIntensity:.55});
 const socketMaterial=new THREE.MeshStandardMaterial({color:'#455d7d',metalness:.85,roughness:.3});
 for(let i=0;i<10;i++){
  const a=i*Math.PI*2/10,r=1.72,b=a+.3;
  const start=new THREE.Vector3(Math.cos(a)*r,.18,Math.sin(a)*r);
  const end=new THREE.Vector3(Math.cos(b)*r,4.42,Math.sin(b)*r);
  const curve=new THREE.CatmullRomCurve3([start,
   new THREE.Vector3(Math.cos(a+.16)*(1.38+(i%3)*.08),1.15,Math.sin(a+.16)*1.5),
   new THREE.Vector3(Math.cos(b-.16)*1.58,3.3-(i%3)*.22,Math.sin(b-.16)*1.58),end]);
  const cable=new THREE.Mesh(new THREE.TubeGeometry(curve,32,.023+(i%3)*.006,6,false),attachedCableMaterial);cable.name='Connected upper cable';upperAssembly.add(cable);
  for(const point of [start,end]){const socket=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.12,8),socketMaterial);socket.position.copy(point);upperAssembly.add(socket);}
 }
 const upperBlue=new THREE.PointLight('#4F82DA',35,13,2);upperBlue.position.set(-2,3,2);upperAssembly.add(upperBlue);
 const upperViolet=new THREE.PointLight('#9374C1',18,11,2);upperViolet.position.set(2,1,-1);upperAssembly.add(upperViolet);
 // Capture hardware before the independent logo is attached by world.js.
 const upperParts=upperAssembly.children.filter(o=>!o.isLight);
 const revealMaterials=new Set(upperMaterials);
 upperParts.forEach(part=>part.traverse(o=>{if(o.material&&!o.userData.edgeGlass){o.material.transparent=true;revealMaterials.add(o.material);}}));
 // Screen-space wipe shares the film transition edge, including its slant/ripple.
 const upperWipe={uUpperCut:{value:1.2},uUpperTime:{value:0},uUpperResolution:{value:new THREE.Vector2(1,1)}};
 const wipeDeclarations='uniform float uUpperCut;uniform float uUpperTime;uniform vec2 uUpperResolution;\n';
 const wipeFragment=`vec2 upperScreen=gl_FragCoord.xy/uUpperResolution;
  float upperRipple=sin(upperScreen.x*31.+uUpperTime*.9)*.004+sin(upperScreen.x*83.-uUpperTime)*.002;
  float upperEdge=uUpperCut+(.5-upperScreen.x)*.24+upperRipple;
  if(1.-upperScreen.y<upperEdge)discard;`;
 function injectWipe(source){return wipeDeclarations+source.replace(/void main\s*\(\s*\)\s*\{/,match=>match+wipeFragment);}
 for(const material of revealMaterials){
  const previous=material.onBeforeCompile;
  material.onBeforeCompile=shader=>{previous.call(material,shader);Object.assign(shader.uniforms,upperWipe);shader.fragmentShader=injectWipe(shader.fragmentShader);};
 }
 Object.assign(upperGlass.material.uniforms,upperWipe);upperGlass.material.fragmentShader=injectWipe(upperGlass.material.fragmentShader);
 upperAssembly.visible=false;
 // Broken blocks along the shore add actual silhouette and self-shading beyond the surface grain.
 let rockSeed=481;const rockRandom=()=>{rockSeed=(Math.imul(rockSeed,1664525)+1013904223)>>>0;return rockSeed/4294967296};
 const shardGeometry=new THREE.IcosahedronGeometry(1,1);const shardPositions=shardGeometry.attributes.position;
 for(let i=0;i<shardPositions.count;i++){const x=shardPositions.getX(i),y=shardPositions.getY(i),z=shardPositions.getZ(i);const fracture=.8+Math.sin(x*17.+y*11.+z*7.)*.13+Math.cos(x*9.-z*13.)*.1;shardPositions.setXYZ(i,x*fracture,y*fracture,z*fracture);}
 shardGeometry.computeVertexNormals();
 const shardMaterial=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.9,metalness:0,flatShading:true});shardMaterial.userData.solidTerrain=true;weatherRock(shardMaterial,{waterLevel:shoreWaterLevel});
 const shoreBlocks=new THREE.InstancedMesh(shardGeometry,shardMaterial,64),block=new THREE.Object3D();
 for(let i=0;i<64;i++){const side=i%5===0?-1:1;const size=.18+rockRandom()*.58;const rockX=side*(3.5+rockRandom()*5.8),rockZ=-1.2+rockRandom()*6.;block.position.set(rockX,bankHeight(rockX,rockZ)+size*.3,rockZ);block.rotation.set(rockRandom()*3,rockRandom()*6,rockRandom()*3);block.scale.set(size*(.7+rockRandom()),size*(.5+rockRandom()*.6),size*(.8+rockRandom()));block.updateMatrix();shoreBlocks.setMatrixAt(i,block.matrix);}group.add(shoreBlocks);
 // Small angular debris and a denser broken-rock shoulder on the right.
 const gravel=new THREE.InstancedMesh(shardGeometry,shardMaterial,360);
 for(let i=0;i<360;i++){
  const side=i%4===0?-1:1,x=side*(2.8+rockRandom()*7.5),z=-2+rockRandom()*9;
  const size=i<40?.18+rockRandom()*.32:.025+rockRandom()*.095;
  block.position.set(x,bankHeight(x,z)+size*.22,z);block.rotation.set(rockRandom()*3,rockRandom()*6,rockRandom()*3);
  block.scale.set(size*(1.1+rockRandom()),size*(.35+rockRandom()*.45),size*(.7+rockRandom()));block.updateMatrix();gravel.setMatrixAt(i,block.matrix);
 }
 gravel.name='Angular basalt fragments and shoreline gravel';group.add(gravel);
 const reflection=new Reflector(new THREE.PlaneGeometry(100,100),{color:0x667b98,textureWidth:innerWidth<760?512:1024,textureHeight:innerWidth<760?512:1024,clipBias:.003});reflection.rotation.x=-Math.PI*.5;reflection.position.set(0,.5,0);group.add(reflection);
 // World-space ripples keep their size as the camera moves; reflection is rough, not a perfect mirror.
 reflection.material.uniforms.uTime={value:0};reflection.material.uniforms.uReveal={value:0};reflection.material.transparent=true;reflection.material.depthWrite=false;
 reflection.material.vertexShader=reflection.material.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec3 waterWorld;').replace('vUv = textureMatrix * vec4( position, 1.0 );','vUv = textureMatrix * vec4( position, 1.0 ); waterWorld=(modelMatrix*vec4(position,1.)).xyz;');
 reflection.material.fragmentShader=`
 uniform sampler2D tDiffuse; uniform float uTime; uniform float uReveal;
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
  gl_FragColor=vec4(result,uReveal);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`;
 const portal=new THREE.Group();portal.position.set(.29,4.82,0);group.add(portal);const artwork=await createImageEmblem();artwork.scale.setScalar(1.3);portal.add(artwork);
 const key=new THREE.PointLight('#376eff',190,30,2);key.position.set(-3,5,3);group.add(key);
 const rim=new THREE.PointLight('#a9ccff',125,25,2);rim.position.set(3,7,-2);group.add(rim);
 const floorLight=new THREE.PointLight('#3159A5',65,18,2);floorLight.position.set(-1,1.5,2);group.add(floorLight);
 const warm=new THREE.PointLight('#ff956a',45,22,2);warm.position.set(2,8,3);group.add(warm);
 group.add(new THREE.HemisphereLight('#9caed0','#111726',.7));
 // Continue the outer sleeve down to the existing cage floor, around its logo.
 const cageGlass=createOuterGlass(4.2,8.6);cageGlass.position.set(0,5.8,0);group.add(cageGlass);
 const roomMaterials=[];group.traverse(o=>{if(o.material&&o!==reflection&&!o.userData.edgeGlass){o.material.transparent=true;roomMaterials.push(o.material)}});
 return {group,upperAssembly,renderUpper(anchor,visible,wipe){upperAssembly.visible=visible;upperAssembly.position.copy(anchor);
  upperWipe.uUpperCut.value=wipe.cut;upperWipe.uUpperTime.value=wipe.time;upperWipe.uUpperResolution.value.copy(wipe.resolution);
  upperParts.forEach(part=>part.visible=wipe.cut<1.13);
  revealMaterials.forEach(m=>{m.opacity=1;m.depthWrite=true;});
  upperGlass.material.uniforms.uReveal.value=1;
  upperBlue.intensity=wipe.cut<1.13?35:0;upperViolet.intensity=wipe.cut<1.13?18:0;
 },render(progress,time,pointer,dockPose){
  const enter=THREE.MathUtils.smoothstep(progress,ENDING.roomStart,ENDING.roomEnd),settle=THREE.MathUtils.smoothstep(progress,ENDING.roomEnd,JOURNEY_END),alpha=enter;group.visible=alpha>.001;group.position.y=-3.5-(1-enter)*3.2+settle*1.4;group.rotation.y=0;
  if(dockPose){group.position.set(dockPose.x,dockPose.bottom-10.1*.7,dockPose.z);group.scale.set(dockPose.radiusScale*.5,.7,dockPose.radiusScale*.5);}
  shoreWaterLevel.value=group.position.y+.5*.7;
  cageGlass.material.uniforms.uReveal.value=alpha;
  roomMaterials.forEach(m=>{m.opacity=alpha*(m.isPointsMaterial?.85:1);if(m.userData.solidTerrain){m.transparent=alpha<.999;m.depthWrite=true;}});const logoReveal=THREE.MathUtils.smoothstep(progress,ENDING.logoStart,ENDING.logoEnd);portal.visible=logoReveal>.001;artwork.material.opacity=alpha*logoReveal;reflection.material.uniforms.uReveal.value=alpha;reflection.material.uniforms.uTime.value=time;key.intensity=175+Math.sin(time*.45)*30;rim.intensity=115+Math.sin(time*.37+1)*22;floorLight.intensity=60+Math.sin(time*.53)*12;portal.rotation.set(0,-group.rotation.y,0);portal.position.y=4.82;
 }};
}
