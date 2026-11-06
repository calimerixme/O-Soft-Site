import {createDesktopParticles} from './desktop-particles.js';
import {renderProfile as profile} from './render-profile.js';
import * as THREE from './vendor/three.module.js';
import {RoomEnvironment} from './vendor/addons/environments/RoomEnvironment.js';
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
 renderer.setPixelRatio(Math.min(devicePixelRatio,profile.pixelRatio));renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x000000);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
 const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x000000,.035);
 const environmentGenerator=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();const environment=environmentGenerator.fromScene(room,.04).texture;scene.environment=environment;room.dispose();environmentGenerator.dispose();
 const camera=new THREE.PerspectiveCamera(35,innerWidth/innerHeight,.1,100);camera.position.set(0,0,12);
 configureAluminium(renderer);
 const loader=new THREE.TextureLoader();
 const emblem=new THREE.Group();scene.add(emblem);
 const referenceMark=await createImageEmblem('assets/osoft-intro-transparent.png',false);emblem.add(referenceMark);
 const columnHeight=27.3;
 const spine=createTubeColumn(columnHeight);scene.add(spine);
 const columnYAt=s=>1.4+clamp((s-4.8)/(18.6-4.8),0,1)*(columnHeight-4.6);

 spine.visible=false;
 let seed=711;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const particleWork={value:0},particleOpacity={value:0},count=profile.particleCount;
 const positions=new Float32Array(count*3),colors=new Float32Array(count*3),sizes=new Float32Array(count),responsive=new Float32Array(count);
 const particleColor=new THREE.Color();
 const gaussian=()=>((random()+random()+random())-1.5)*1.65;
 const clouds=Array.from({length:78},(_,i)=>{
  const y=1.2-i/77*(columnHeight+3)+(random()-.5)*.65,angle=i*2.399963+random()*.7,radius=.85+random()*2.3;
  return {x:Math.cos(angle)*radius,y,z:Math.sin(angle)*radius,spread:.18+random()*.5};
 });
 for(let i=0;i<count;i++){
  let x,y,z;
  if(i<count*.38){const c=clouds[Math.floor(random()*clouds.length)];x=c.x+gaussian()*c.spread;y=c.y+gaussian()*(c.spread+.3);z=c.z+gaussian()*c.spread;}
  else{y=(random()-.95)*(columnHeight+3);const strand=i%3,angle=y*.85+strand*2.094+gaussian()*.32,radius=i<count*.96?1.45+Math.sin(y*.63+strand)*.65+random()*.7:2.4+random()*1.6;x=Math.cos(angle)*radius;z=Math.sin(angle)*radius;}
  positions.set([x,y,z],i*3);sizes[i]=.004+Math.pow(random(),4)*.057;responsive[i]=!profile.mobile&&i%4===0?1:0;
  particleColor.setHSL(.49+random()*.29,.55+random()*.3,.4+random()*.3);colors.set([particleColor.r,particleColor.g,particleColor.b],i*3);
 }
 const flatGeometry=new THREE.BufferGeometry();flatGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));flatGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3));flatGeometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));flatGeometry.setAttribute('aResponsive',new THREE.BufferAttribute(responsive,1));
 const wakeUniforms=profile.mobile?'':'uniform vec4 uBrushTrail[16];uniform float uBrushAspect;';
 const wakeVertex=profile.mobile?'':`if(aResponsive>.5){vec2 screenPoint=gl_Position.xy/gl_Position.w*.5+.5;vec2 displacement=vec2(0.);float strongest=0.;
  for(int brush=0;brush<16;brush++){vec4 mark=uBrushTrail[brush];vec2 delta=(screenPoint-mark.xy)*vec2(uBrushAspect,1.);float radius=.055+mark.w*.025;float influence=exp(-dot(delta,delta)/(radius*radius))*mark.z;
   if(influence>strongest){strongest=influence;vec2 radial=normalize(delta+vec2(.0002));displacement=(radial*.095+vec2(-radial.y,radial.x)*.025)*influence;}}
  gl_Position.xy+=displacement/vec2(uBrushAspect,1.)*gl_Position.w*2.;}`;
 const flatMaterial=new THREE.ShaderMaterial({vertexColors:true,transparent:true,depthWrite:false,
  uniforms:{...pointerField.uniforms,uParticleHeight:{value:innerHeight*Math.min(devicePixelRatio,profile.pixelRatio)},uParticleWork:particleWork,uParticleOpacity:particleOpacity},
  vertexShader:`attribute float aSize;attribute float aResponsive;uniform float uParticleHeight;uniform float uParticleWork;varying vec3 vParticleColor;${wakeUniforms}
   void main(){vec3 tint=mix(vec3(.05,.72,.95),vec3(.55,.18,.92),.5+.5*sin(position.y*1.2+position.x*2.));vParticleColor=mix(color,tint,uParticleWork*.55);vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(aSize*uParticleHeight*1.8/max(1.,-p.z),1.1,${profile.mobile?'7.':'10.'});${wakeVertex}}`,
  fragmentShader:`uniform float uParticleOpacity;varying vec3 vParticleColor;void main(){vec2 p=gl_PointCoord*2.-1.;float angle=atan(p.y,p.x),r=length(p);float boundary=.88+.05*cos(angle*6.);if(r>boundary)discard;
   float nz=sqrt(max(0.,1.-r*r)),light=max(0.,dot(normalize(vec3(p*.6,nz)),normalize(vec3(-.5,.7,1.))));float facet=.75+.25*cos(angle*6.);
   vec3 color=vParticleColor*(.26+.56*light*facet)+vec3(.15,.24,.32)*pow(light,12.);gl_FragColor=vec4(color,(1.-smoothstep(boundary-.1,boundary,r))*.85*uParticleOpacity);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`});
 const particles=new THREE.Points(flatGeometry,flatMaterial);particles.name=profile.mobile?'480 flat mobile particles':'Flat particles with desktop cursor wake (25%)';if(profile.mobile)scene.add(particles);
 addEventListener('resize',()=>flatMaterial.uniforms.uParticleHeight.value=innerHeight*Math.min(devicePixelRatio,profile.pixelRatio));
 const desktopParticles=profile.mobile?null:await createDesktopParticles(scene,pointerField,columnHeight,particleWork);
 const backgroundDust=createBackgroundDust(reduced);scene.add(backgroundDust.points);

 const sparkCount=profile.mobile?32:250;const sparkPositions=new Float32Array(sparkCount*3),sparkColors=new Float32Array(sparkCount*3);
 for(let i=0;i<sparkCount;i++){const angle=random()*Math.PI*2,r=.55+random()*1.35;sparkPositions.set([Math.cos(angle)*r,(random()-.6)*15,Math.sin(angle)*r],i*3);particleColor.setHSL(.52+random()*.22,.6,.65);sparkColors.set([particleColor.r,particleColor.g,particleColor.b],i*3)}const sparkGeo=new THREE.BufferGeometry();sparkGeo.setAttribute('position',new THREE.BufferAttribute(sparkPositions,3));sparkGeo.setAttribute('color',new THREE.BufferAttribute(sparkColors,3));const sparks=new THREE.Points(sparkGeo,new THREE.PointsMaterial({size:.035,vertexColors:true,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(sparks);
 let composer;if(profile.bloom){
  const [{EffectComposer},{RenderPass},{UnrealBloomPass},{OutputPass}]=await Promise.all([import('./vendor/addons/postprocessing/EffectComposer.js'),import('./vendor/addons/postprocessing/RenderPass.js'),import('./vendor/addons/postprocessing/UnrealBloomPass.js'),import('./vendor/addons/postprocessing/OutputPass.js')]);
  composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.25,.55,.7));composer.addPass(new OutputPass());}
 // A dim, moving film behind the emblem is revealed as the camera travels.
 const autoplayIntro=profile.autoplayIntro&&!reduced;
 const film=document.createElement('video');if(autoplayIntro)film.src='assets/reel.mp4';film.muted=true;film.loop=true;film.playsInline=true;film.preload=autoplayIntro?'auto':'none';const filmTexture=autoplayIntro?new THREE.VideoTexture(film):await loader.loadAsync('assets/intro-poster.jpg');filmTexture.colorSpace=THREE.SRGBColorSpace;if(autoplayIntro&&!reduced)film.play().catch(()=>{});
 const filmUniforms={uFilm:{value:filmTexture},uCut:{value:1.2},uOpacity:{value:0},uTime:{value:0},uResolution:{value:renderer.getDrawingBufferSize(new THREE.Vector2())}};
 const filmMaterial=new THREE.ShaderMaterial({uniforms:filmUniforms,transparent:true,depthWrite:false,vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform sampler2D uFilm;uniform float uCut;uniform float uOpacity;uniform float uTime;uniform vec2 uResolution;void main(){vec2 screen=gl_FragCoord.xy/uResolution;float top=1.-screen.y;float ripple=sin(screen.x*31.+uTime*.9)*.004+sin(screen.x*83.-uTime)*.002;float edge=uCut+(.5-screen.x)*.24+ripple;float mask=1.-smoothstep(edge-.004,edge+.004,top);vec2 movie=screen;float aspect=uResolution.x/uResolution.y;movie.x=(movie.x-.5)*min(1.,aspect/(16./9.))+.5;movie.y=(movie.y-.5)*min(1.,(16./9.)/aspect)+.5;vec3 c=texture2D(uFilm,movie).rgb;float gray=dot(c,vec3(.299,.587,.114));c=mix(vec3(gray),c,.25);gl_FragColor=vec4(c*.38,mask*uOpacity);}`});
 const filmPlane=new THREE.Mesh(new THREE.PlaneGeometry(100,60),filmMaterial);filmPlane.position.set(0,0,-7);scene.add(filmPlane);
 const upperAnchor=new THREE.Vector3();
 let gallery3D;let filmPlaying=false;let baseScene;createBaseScene().then(room=>{baseScene=room;room.upperAssembly.add(emblem);scene.add(room.group,room.upperAssembly)}).catch(error=>console.warn('Base scene unavailable:',error.message));
 addEventListener('visibilitychange',()=>{if(document.hidden){film.pause();filmPlaying=false;}});
 function resize(){renderer.setSize(innerWidth,innerHeight);composer?.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.getDrawingBufferSize(filmUniforms.uResolution.value)}
 addEventListener('resize',resize);
 return {renderer,scene,camera,get galleryReady(){return !!gallery3D},async setGallery(products,onActivate){gallery3D=await createGallery3D(scene,camera,spine,products,onActivate,reduced,{startY:columnYAt(GALLERY_START),endY:columnYAt(GALLERY_LAST)})},render(s,t,pointer,contactOpen,galleryState){
  s=Math.min(s,JOURNEY_END);const work=smooth(4.35,5.25,s),introMove=smooth(.3,2,s);const motion=reduced?0:t;
  const about=smooth(1.6,2.8,s)*(1-smooth(4.0,5.15,s));
  const emblemExit=smooth(4.55,5.65,s);
  emblem.visible=emblemExit<.999;
  // Local coordinates inside the moving chamber: no independent logo trajectory.
  emblem.scale.setScalar(.56);emblem.position.set(0,2.4,.15);referenceMark.material.opacity=1-emblemExit;
  emblem.rotation.set(0,0,0);
  // Like the upper chamber: vertical travel only, with a fixed depth and lens.
  const columnY=columnYAt(s);
  const leaveSpine=smooth(ENDING.spineStart,ENDING.spineEnd,s);const dock=smooth(19.45,22.25,s),settle=smooth(22.25,JOURNEY_END,s);
  spine.visible=work>.01;spine.scale.setScalar(1);
  spine.position.set(mix(.2,0,dock),mix(columnY-(1-work)*14,columnHeight+4.7,dock),.8);spine.rotation.y=0;spine.rotation.z=0;
  // Procedural particles belong to the tube section, not to the intro or finale.
  const particleEnvelope=smooth(3.9,5.25,s)*(1-smooth(18.9,20.8,s));
  particleOpacity.value=particleEnvelope;particles.visible=profile.mobile&&particleEnvelope>.001;desktopParticles?.update(s,motion,spine.position,particleEnvelope);
  sparks.visible=particleEnvelope>.001;sparks.material.opacity=.7*particleEnvelope;
  backgroundDust.update(motion,work*(1-leaveSpine),particleEnvelope);
  const atBase=smooth(19.1,21.3,s);const visibleParticles=Math.floor(mix(Math.min(profile.mobile?180:1000,count),count,smooth(.5,3.5,s))*(1-atBase*.9));flatGeometry.setDrawRange(0,Math.min(count,visibleParticles));particles.rotation.y=s*.13;particles.position.copy(spine.position);particles.rotation.z=0;particleWork.value=work;sparks.rotation.y=-motion*.025;sparks.position.copy(spine.position);sparks.position.y-=4;
  const filmAlpha=(1-smooth(3.8,4.25,s))*.9;filmUniforms.uOpacity.value=filmAlpha;filmUniforms.uCut.value=1.1-smooth(1.6,4.05,s)*1.3;filmUniforms.uTime.value=motion;if(autoplayIntro&&filmAlpha>.005&&!filmPlaying&&!reduced&&!galleryState?.modalOpen){film.play().catch(()=>{});filmPlaying=true}else if((filmAlpha<=.005||galleryState?.modalOpen)&&filmPlaying){film.pause();filmPlaying=false}
  // The finale is not pointer-driven: keep the eye safely above the shallow water plane.
  const cameraParallax=1-smooth(ENDING.galleryStart,20.5,s);
  camera.position.x+=(pointer.x*.4*cameraParallax-camera.position.x)*.035;camera.position.y+=(-pointer.y*.2*cameraParallax-camera.position.y)*.035;
  if(cameraParallax===0){camera.position.x=0;camera.position.y=0;}
  camera.position.z=(innerWidth<760?17.5:12);
  if(camera.fov!==35){camera.fov=35;camera.updateProjectionMatrix();}
  spine.scale.setScalar(1);
  camera.lookAt(0,0,0);if(baseScene){
   baseScene.renderUpper(upperAnchor.set(mix(0,spine.position.x,work),Math.max(-2.6,spine.position.y),mix(0,spine.position.z,work)),s<9,{cut:filmUniforms.uCut.value,time:motion,resolution:filmUniforms.uResolution.value});
   baseScene.render(s,motion,pointer,{x:spine.position.x,z:spine.position.z,bottom:spine.position.y-columnHeight,radiusScale:1});
  }if(gallery3D&&galleryState)gallery3D.update(galleryState,motion);if(composer)composer.render();else renderer.render(scene,camera);
 }};
}
