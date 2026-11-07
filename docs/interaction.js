import {renderProfile as profile} from './render-profile.js?v=20261107-preload-1';
import * as THREE from './vendor/three.module.js';
const TRAILS=16;
export function createPointerField(){
 const trail=Array.from({length:TRAILS},()=>new THREE.Vector4(-5,-5,0,0));
 const filmMarks=Array.from({length:4},()=>new THREE.Vector4(-5,-5,0,0));
 const uniforms={uBrushTrail:{value:trail},uBrushAspect:{value:innerWidth/innerHeight},uFilmMarks:{value:filmMarks}};
 let history=[],last=null,lastStamp=-100;
 addEventListener('pointermove',event=>{
  if(profile.mobile||event.pointerType==='touch')return;
  const now=performance.now()*.001,p={x:event.clientX/innerWidth,y:1-event.clientY/innerHeight,t:now};
  const distance=last?Math.hypot((p.x-last.x)*innerWidth,(p.y-last.y)*innerHeight):0;
  if(now-lastStamp>.055||distance>45){p.speed=last?Math.min(1,distance/Math.max(.01,now-last.t)/1400):.3;history.unshift(p);history.length=Math.min(history.length,TRAILS);lastStamp=now;last=p}
 },{passive:true});
 addEventListener('pointerleave',()=>{last=null});
 return {uniforms,update(now){if(profile.mobile)return;uniforms.uBrushAspect.value=innerWidth/innerHeight;for(let i=0;i<TRAILS;i++){const p=history[i];if(!p){trail[i].set(-5,-5,0,0);continue}const age=now-p.t;trail[i].set(p.x,p.y,Math.exp(-age/(.65+p.speed*.65))*(.75+p.speed*.25),p.speed)}for(let i=0;i<4;i++){const mark=history[i];if(!mark){filmMarks[i].set(-5,-5,0,0);continue;}filmMarks[i].set(mark.x,mark.y,Math.exp(-(now-mark.t)*3),mark.speed);}
 history=history.filter(p=>now-p.t<4)}};
}

// A shared screen-space film wave; instance matrices and particle anchors never change.
export function applyParticleFilm(material,field){
 const previous=material.onBeforeCompile;
 material.onBeforeCompile=shader=>{
  previous(shader);shader.uniforms.uFilmMarks=field.uniforms.uFilmMarks;shader.uniforms.uBrushAspect=field.uniforms.uBrushAspect;
  shader.vertexShader='uniform vec4 uFilmMarks[4];\nuniform float uBrushAspect;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
   vec4 filmAnchor=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
   vec2 filmUV=filmAnchor.xy/max(.01,filmAnchor.w)*.5+.5;
   vec2 filmOffset=vec2(0.);
   for(int markIndex=0;markIndex<4;markIndex++){
    vec4 mark=uFilmMarks[markIndex];
    if(mark.z<.015)continue;
    vec2 delta=(filmUV-mark.xy)*vec2(uBrushAspect,1.);float distance=length(delta);
    float wave=sin(distance*65.-mark.z*5.)*exp(-distance*distance/.012)*mark.z;
    filmOffset+=normalize(delta+vec2(.0001))*wave*.0025;
   }
   gl_Position.xy+=filmOffset/vec2(uBrushAspect,1.)*gl_Position.w*2.;
  `);
 };
}

export function createMist(canvas,field,reduced){
 if(!profile.mist){canvas.hidden=true;return null;}
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'low-power'});renderer.setPixelRatio(.6);renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x000000,0);
 const uniforms={...field.uniforms,uTime:{value:0},uWork:{value:0},uRegion:{value:0}};
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
  precision highp float;varying vec2 vUv;uniform float uTime;uniform float uWork;uniform float uRegion;uniform float uBrushAspect;uniform vec4 uBrushTrail[16];
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return v;}
  void main(){
   vec2 p=vUv*vec2(uBrushAspect,1.);float hole=0.,rim=0.;vec2 drift=vec2(0.);
   float edge=.03+.4*pow(1.-vUv.y,.8)+sin(vUv.y*6.)*.012;
   float leftMask=1.-smoothstep(edge-.075,edge+.045,vUv.x);
   float lowerRight=1.-smoothstep(.0,.65,vUv.y);
   float rightMask=smoothstep(.73+.045*sin(vUv.y*3.14)-lowerRight*.12,.94-lowerRight*.06,vUv.x);
   float regionMask=uRegion<.5?leftMask:rightMask;
   if(regionMask<.002)discard;
   // Only the left smoke evaluates the cursor history; the right haze has no brush work.
   if(uRegion<.5){for(int i=0;i<16;i++){
    vec4 a=uBrushTrail[i];if(a.z<.015)continue;
    vec2 start=a.xy*vec2(uBrushAspect,1.),finish=start;
    if(i<15&&uBrushTrail[i+1].z>.015)finish=uBrushTrail[i+1].xy*vec2(uBrushAspect,1.);
    vec2 segment=finish-start;float f=clamp(dot(p-start,segment)/max(.00001,dot(segment,segment)),0.,1.);
    vec2 delta=p-mix(start,finish,f);float distance=length(delta);
    float radius=.055+a.w*.095;
    float influence=exp(-distance*distance/(radius*radius))*a.z;
    hole=max(hole,influence);rim=max(rim,exp(-pow((distance-radius*1.5)/radius,2.))*a.z);
    drift+=normalize(delta+vec2(.0001))*influence*(.025+a.w*.04);
   }}
   float t=uTime*.025;vec2 flow=p*3.6+vec2(t,-t*.6)+drift;
   float n=fbm(flow+fbm(flow+2.));float clouds=smoothstep(.28,.76,n);
   float density=uRegion<.5?(.07+clouds*.27)*regionMask:(.012+clouds*.025+lowerRight*(.012+clouds*.018))*regionMask;
   if(uRegion>.5){
    // A soft travelling light reveals the haze, then fades between passes (18 seconds).
    float cycle=fract(uTime/18.);
    float lightY=1.3-cycle*1.65;
    float warpedY=vUv.y+(clouds-.5)*.14+sin(vUv.x*9.+t)*.025;
    float light=exp(-pow((warpedY-lightY)/.33,2.));
    float pulse=pow(max(0.,sin(cycle*3.14159265)),.8);
    density=(.006+clouds*.012+light*pulse*(.15+clouds*.20))*regionMask;
   }
   density*=uWork;
   if(uRegion<.5){density*=1.-smoothstep(.08,.85,hole);density+=rim*.028*regionMask*uWork;}
   vec3 color=uRegion<.5?mix(vec3(.19,.13,.34),vec3(.42,.23,.66),clouds):mix(vec3(.11,.25,.27),vec3(.2,.32,.35),clouds);
   if(uRegion>.5){
    float hue=.5+.5*sin(uTime*.17+vUv.y*2.);
    color=mix(vec3(.10,.35,.28),vec3(.17,.32,.48),hue);
   }
   gl_FragColor=vec4(color,density);
  }`});
 const scene=new THREE.Scene();scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));const camera=new THREE.Camera();
 addEventListener('resize',()=>renderer.setSize(innerWidth,innerHeight));
 let lastScroll=-1,lastWidth=0,lastVisibility;
 return {render(scroll,time){const work=THREE.MathUtils.smoothstep(scroll,4.2,5.4)*(1-THREE.MathUtils.smoothstep(scroll,19,20));const visibility=work>.001?'visible':'hidden';if(visibility!==lastVisibility){canvas.style.visibility=visibility;lastVisibility=visibility;}if(work<=.001)return;if(reduced&&scroll===lastScroll&&lastWidth===innerWidth)return;lastScroll=scroll;lastWidth=innerWidth;uniforms.uTime.value=reduced?0:time;uniforms.uWork.value=work;
   renderer.setScissorTest(false);renderer.clear();renderer.autoClear=false;renderer.setScissorTest(true);
   uniforms.uRegion.value=0;renderer.setScissor(0,0,Math.ceil(innerWidth*.51),innerHeight);renderer.render(scene,camera);
   uniforms.uRegion.value=1;renderer.setScissor(Math.floor(innerWidth*.6),0,Math.ceil(innerWidth*.4),innerHeight);renderer.render(scene,camera);
   renderer.setScissorTest(false);renderer.autoClear=true;}};
}
