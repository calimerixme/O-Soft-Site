import * as THREE from './vendor/three.module.js';
import {EffectComposer} from './vendor/addons/postprocessing/EffectComposer.js';
import {RenderPass} from './vendor/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from './vendor/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from './vendor/addons/postprocessing/OutputPass.js';
import {RoomEnvironment} from './vendor/addons/environments/RoomEnvironment.js';
import {referenceGeometry} from './geometry.js';
import {applyParticleWake} from './interaction.js';
import {createBaseScene} from './base-scene.js';
import {createBackgroundDust} from './background-dust.js';
import {JOURNEY_END,ENDING,GALLERY_START,GALLERY_LAST} from './journey.js';
import {createImageEmblem} from './image-emblem.js';
import {createTubeColumn} from './tube-column.js';
import {createGallery3D} from './gallery-3d.js';
import {configureAluminium} from './aluminium.js';

const clamp=THREE.MathUtils.clamp;
const mix=THREE.MathUtils.lerp;
const smooth=(a,b,x)=>THREE.MathUtils.smoothstep(x,a,b);
export async function createWorld(canvas,reduced,pointerField){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x000000);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
 const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x000000,.035);
 const environmentGenerator=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();const environment=environmentGenerator.fromScene(room,.04).texture;scene.environment=environment;room.dispose();environmentGenerator.dispose();
 const camera=new THREE.PerspectiveCamera(35,innerWidth/innerHeight,.1,100);camera.position.set(0,0,12);
 configureAluminium(renderer);
 const loader=new THREE.TextureLoader();const [matcap,normal]=await Promise.all([loader.loadAsync('assets/metal-matcap.jpg'),loader.loadAsync('assets/metal-normal.png')]);matcap.colorSpace=THREE.SRGBColorSpace;normal.wrapS=normal.wrapT=THREE.RepeatWrapping;normal.repeat.set(2,2);
 let sourceLogo,sourceVertebra;try{[sourceLogo,sourceVertebra]=await Promise.all([referenceGeometry('logo'),referenceGeometry('spine')])}catch(error){console.warn('Using procedural geometry fallback:',error.message)}

 const metal=new THREE.MeshPhysicalMaterial({normalMap:normal,normalScale:new THREE.Vector2(.23,.23),color:'#86c0db',metalness:.94,roughness:.2,envMapIntensity:1.8,iridescence:.75,iridescenceIOR:1.45,iridescenceThicknessRange:[180,420],clearcoat:.65});
 const spineNormal=await loader.loadAsync('assets/spine-normal.png');spineNormal.wrapS=spineNormal.wrapT=THREE.RepeatWrapping;
 const spineMetal=metal.clone();spineMetal.normalMap=spineNormal;spineMetal.normalScale.set(.19,.19);spineMetal.color.set('#9ba6ba');spineMetal.roughness=.24;spineMetal.envMapIntensity=.95;spineMetal.iridescence=1;spineMetal.iridescenceThicknessRange=[120,550];spineMetal.clearcoat=.35;
 spineMetal.onBeforeCompile=shader=>{
  shader.uniforms.uSpineSpectrum={value:matcap};
  shader.fragmentShader='uniform sampler2D uSpineSpectrum;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
   vec3 spineView=normalize(vViewPosition);vec3 spineX=normalize(vec3(spineView.z,0.,-spineView.x));vec3 spineY=cross(spineView,spineX);
   vec2 spineUV=vec2(dot(spineX,normal),dot(spineY,normal))*.495+.5;
   vec3 spineSpectrum=texture2D(uSpineSpectrum,spineUV).rgb;
   outgoingLight=outgoingLight*(vec3(.48)+spineSpectrum*.85)+spineSpectrum*.075;
   #include <opaque_fragment>
  `);
 };
 const emblem=new THREE.Group();scene.add(emblem);
 const referenceMark=await createImageEmblem('assets/osoft-intro-transparent.png',false);emblem.add(referenceMark);
 const ribbons=new THREE.Group();scene.add(ribbons);
 class RibbonPath extends THREE.Curve{constructor(phase){super();this.phase=phase}getPoint(t,target=new THREE.Vector3()){const a=t*Math.PI*2.65+this.phase+Math.PI*.5;const r=.78+Math.sin(t*Math.PI)*.25;return target.set(Math.sin(a)*r,-.45-t*11,Math.cos(a)*r*.52)}}
 for(let k=0;k<2;k++){
  const curve=new RibbonPath(k*Math.PI);const frames=curve.computeFrenetFrames(350,false),vertices=[],indices=[],uv=[];
  for(let i=0;i<=350;i++){const p=curve.getPoint(i/350);for(let j=0;j<4;j++){const angle=j/4*Math.PI*2+Math.PI/4;const v=p.clone().addScaledVector(frames.normals[i],Math.cos(angle)*.027).addScaledVector(frames.binormals[i],Math.sin(angle)*.014);vertices.push(v.x,v.y,v.z);uv.push(j/4,i/350*8)}if(i<350)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4,c=(i+1)*4+j,d=(i+1)*4+(j+1)%4;indices.push(a,c,b,b,c,d)}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();ribbons.add(new THREE.Mesh(g,metal));
 }
 const columnHeight=27.3;
 const spine=createTubeColumn(columnHeight);scene.add(spine);
 const columnYAt=s=>1.4+clamp((s-4.8)/(18.6-4.8),0,1)*(columnHeight-4.6);

 spine.visible=false;
 let seed=711;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const particleWork={value:0};const count=innerWidth<760?3000:9000;const particleMaterial=new THREE.MeshMatcapMaterial({matcap,color:'#c9efff'});particleMaterial.onBeforeCompile=shader=>{shader.uniforms.uParticleWork=particleWork;shader.vertexShader='uniform float uParticleWork;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <color_vertex>','#include <color_vertex>\n#if defined(USE_COLOR) || defined(USE_INSTANCING_COLOR)\nvec3 columnTint=mix(vec3(.05,.72,.95),vec3(.55,.18,.92),.5+.5*sin(instanceMatrix[3].y*1.2+instanceMatrix[3].x*2.));vColor=mix(vColor,columnTint,(.55+uParticleWork*.35));\n#endif');shader.fragmentShader=shader.fragmentShader.replace('vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;','vec3 outgoingLight = diffuseColor.rgb * (matcapColor.rgb * .9 + vec3(.12));'); };
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
 const backgroundDust=createBackgroundDust(reduced);scene.add(backgroundDust.points);
 if(pointerField)applyParticleWake(particleMaterial,pointerField);
 const sparkCount=250;const sparkPositions=new Float32Array(sparkCount*3),sparkColors=new Float32Array(sparkCount*3);
 for(let i=0;i<sparkCount;i++){const angle=random()*Math.PI*2,r=.55+random()*1.35;sparkPositions.set([Math.cos(angle)*r,(random()-.6)*15,Math.sin(angle)*r],i*3);particleColor.setHSL(.52+random()*.22,.6,.65);sparkColors.set([particleColor.r,particleColor.g,particleColor.b],i*3)}const sparkGeo=new THREE.BufferGeometry();sparkGeo.setAttribute('position',new THREE.BufferAttribute(sparkPositions,3));sparkGeo.setAttribute('color',new THREE.BufferAttribute(sparkColors,3));const sparks=new THREE.Points(sparkGeo,new THREE.PointsMaterial({size:.035,vertexColors:true,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(sparks);
 const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.25,.55,.7));composer.addPass(new OutputPass());
 // A dim, moving film behind the emblem is revealed as the camera travels.
 const film=document.createElement('video');film.src='assets/reel.mp4';film.muted=true;film.loop=true;film.playsInline=true;film.preload='auto';const filmTexture=new THREE.VideoTexture(film);filmTexture.colorSpace=THREE.SRGBColorSpace;if(!reduced)film.play().catch(()=>{});
 const filmUniforms={uFilm:{value:filmTexture},uCut:{value:1.2},uOpacity:{value:0},uTime:{value:0},uResolution:{value:renderer.getDrawingBufferSize(new THREE.Vector2())}};
 const filmMaterial=new THREE.ShaderMaterial({uniforms:filmUniforms,transparent:true,depthWrite:false,vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform sampler2D uFilm;uniform float uCut;uniform float uOpacity;uniform float uTime;uniform vec2 uResolution;void main(){vec2 screen=gl_FragCoord.xy/uResolution;float top=1.-screen.y;float ripple=sin(screen.x*31.+uTime*.9)*.004+sin(screen.x*83.-uTime)*.002;float edge=uCut+(.5-screen.x)*.24+ripple;float mask=1.-smoothstep(edge-.004,edge+.004,top);vec2 movie=screen;float aspect=uResolution.x/uResolution.y;movie.x=(movie.x-.5)*min(1.,aspect/(16./9.))+.5;movie.y=(movie.y-.5)*min(1.,(16./9.)/aspect)+.5;vec3 c=texture2D(uFilm,movie).rgb;float gray=dot(c,vec3(.299,.587,.114));c=mix(vec3(gray),c,.25);gl_FragColor=vec4(c*.38,mask*uOpacity);}`});
 const filmPlane=new THREE.Mesh(new THREE.PlaneGeometry(100,60),filmMaterial);filmPlane.position.set(0,0,-7);scene.add(filmPlane);
 const upperAnchor=new THREE.Vector3();
 let gallery3D;let filmPlaying=false;let baseScene;createBaseScene(sourceLogo,pointerField).then(room=>{baseScene=room;room.upperAssembly.add(emblem);scene.add(room.group,room.upperAssembly)}).catch(error=>console.warn('Base scene unavailable:',error.message));
 function resize(){renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.getDrawingBufferSize(filmUniforms.uResolution.value)}
 addEventListener('resize',resize);
 return {renderer,scene,camera,get galleryReady(){return !!gallery3D},async setGallery(products,onActivate){gallery3D=await createGallery3D(scene,camera,spine,products,onActivate,reduced,{startY:columnYAt(GALLERY_START),endY:columnYAt(GALLERY_LAST)})},render(s,t,pointer,contactOpen,galleryState){
  s=Math.min(s,JOURNEY_END);const work=smooth(4.35,5.25,s),introMove=smooth(.3,2,s);const motion=reduced?0:t;
  const about=smooth(1.6,2.8,s)*(1-smooth(4.0,5.15,s));
  const emblemExit=smooth(4.55,5.65,s);
  emblem.visible=emblemExit<.999;ribbons.visible=false;
  // Local coordinates inside the moving chamber: no independent logo trajectory.
  emblem.scale.setScalar(.56);emblem.position.set(0,2.4,.15);referenceMark.material.opacity=1-emblemExit;
  emblem.rotation.set(0,0,0);
  // Travel along the conduit; compensate perspective during docking, in either scroll direction.
  const columnY=columnYAt(s);
  const leaveSpine=smooth(ENDING.spineStart,ENDING.spineEnd,s);const dock=smooth(19.45,22.25,s),settle=smooth(22.25,JOURNEY_END,s);
  spine.visible=work>.01;spine.scale.setScalar(1);
  spine.position.set(mix(.2,0,dock),mix(columnY-(1-work)*14,columnHeight+3.5+settle*1.4,dock),mix(.8,-9,dock));spine.rotation.y=0;spine.rotation.z=0;
  backgroundDust.update(motion,work*(1-leaveSpine));
  const atBase=smooth(19.1,21.3,s);const visibleParticles=Math.floor(mix(1000,count,smooth(.5,3.5,s))*(1-atBase*.9));responsiveParticles.count=Math.min(interactiveCount,Math.ceil(visibleParticles/4));fixedParticles.count=Math.min(fixedCount,visibleParticles-responsiveParticles.count);particles.rotation.y=s*.13;responsiveParticles.rotation.y=motion*.009;particles.position.y=mix(-4+s*.65,columnY,work);particles.rotation.z=0;particles.position.x=.2*work;particleWork.value=work;sparks.rotation.y=-motion*.025;sparks.position.y=columnY-4;
  const filmAlpha=(1-smooth(3.8,4.25,s))*.9;filmUniforms.uOpacity.value=filmAlpha;filmUniforms.uCut.value=1.1-smooth(1.6,4.05,s)*1.3;filmUniforms.uTime.value=motion;if(filmAlpha>.005&&!filmPlaying&&!reduced){film.play().catch(()=>{});filmPlaying=true}else if(filmAlpha<=.005&&filmPlaying){film.pause();filmPlaying=false}
  camera.position.x+=(pointer.x*.4-camera.position.x)*.035;camera.position.y+=(-pointer.y*.2-camera.position.y)*.035;camera.position.z=(innerWidth<760?17.5:12);const roomView=smooth(ENDING.cameraStart,ENDING.cameraEnd,s);camera.position.z+=roomView*1.4;camera.fov=35-roomView*10;camera.updateProjectionMatrix();
  const referenceDistance=(innerWidth<760?17.5:12)-.8;
  const apparentScale=(camera.position.z-spine.position.z)/referenceDistance*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))/Math.tan(THREE.MathUtils.degToRad(35/2));
  spine.scale.set(apparentScale,1,apparentScale);
  camera.lookAt(0,-.182*roomView,-4.8*roomView);if(baseScene){
   baseScene.renderUpper(upperAnchor.set(mix(0,spine.position.x,work),Math.max(-2.6,spine.position.y),mix(0,spine.position.z,work)),s<9,{cut:filmUniforms.uCut.value,time:motion,resolution:filmUniforms.uResolution.value});
   baseScene.render(s,motion,pointer,{x:spine.position.x,z:spine.position.z,bottom:spine.position.y-columnHeight,radiusScale:apparentScale});
  }if(gallery3D&&galleryState)gallery3D.update(galleryState,motion);composer.render();
 }};
}
