import * as THREE from './vendor/three.module.js';
const TRAILS=16;
export function createPointerField(){
 const trail=Array.from({length:TRAILS},()=>new THREE.Vector4(-5,-5,0,0));
 const uniforms={uBrushTrail:{value:trail},uBrushAspect:{value:innerWidth/innerHeight}};
 let history=[],last=null,lastStamp=-100;
 addEventListener('pointermove',event=>{
  const now=performance.now()*.001,p={x:event.clientX/innerWidth,y:1-event.clientY/innerHeight,t:now};
  const distance=last?Math.hypot((p.x-last.x)*innerWidth,(p.y-last.y)*innerHeight):0;
  if(now-lastStamp>.055||distance>45){p.speed=last?Math.min(1,distance/Math.max(.01,now-last.t)/1400):.3;history.unshift(p);history.length=Math.min(history.length,TRAILS);lastStamp=now;last=p}
 },{passive:true});
 addEventListener('pointerleave',()=>{last=null});
 return {uniforms,update(now){uniforms.uBrushAspect.value=innerWidth/innerHeight;for(let i=0;i<TRAILS;i++){const p=history[i];if(!p){trail[i].set(-5,-5,0,0);continue}const age=now-p.t;trail[i].set(p.x,p.y,Math.exp(-age*1.45)*(.65+p.speed*.35),p.speed)}history=history.filter(p=>now-p.t<4)}};
}

export function applyParticleWake(material,field){
 const previous=material.onBeforeCompile;
 material.onBeforeCompile=shader=>{
  previous(shader);Object.assign(shader.uniforms,field.uniforms);
  shader.vertexShader='uniform vec4 uBrushTrail[16];\nuniform float uBrushAspect;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`
   vec4 mvPosition = vec4(transformed, 1.0);
   #ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
   #endif
   mvPosition = modelViewMatrix * mvPosition;
   #ifdef USE_INSTANCING
    vec4 particleCenter = modelViewMatrix * instanceMatrix * vec4(0.,0.,0.,1.);
    mvPosition.xyz = particleCenter.xyz + (mvPosition.xyz-particleCenter.xyz)*min(1.,abs(particleCenter.z)/5.5);
   #endif
   gl_Position = projectionMatrix * mvPosition;
   #ifdef USE_INSTANCING
    vec4 brushAnchor = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(0.,0.,0.,1.);
   #else
    vec4 brushAnchor = gl_Position;
   #endif
   vec2 screenPoint = brushAnchor.xy / max(.01,brushAnchor.w) * .5 + .5;
   vec2 displacement = vec2(0.0); float strongest = 0.0;
   for(int brush=0;brush<16;brush++){
    vec4 mark=uBrushTrail[brush];
    vec2 delta=(screenPoint-mark.xy)*vec2(uBrushAspect,1.0);
    float radius=.055+mark.w*.025;
    float influence=exp(-dot(delta,delta)/(radius*radius))*mark.z;
    if(influence>strongest){strongest=influence;vec2 radial=normalize(delta+vec2(.0002));displacement=(radial*.095+vec2(-radial.y,radial.x)*.025)*influence;}
   }
   gl_Position.xy += displacement / vec2(uBrushAspect,1.0) * gl_Position.w * 2.0;
  `);
 };
}

export function createMist(canvas,field,reduced){
 const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:false,powerPreference:'low-power'});renderer.setPixelRatio(.8);renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x000000,0);
 const uniforms={...field.uniforms,uTime:{value:0},uWork:{value:0}};
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
  precision highp float;varying vec2 vUv;uniform float uTime;uniform float uWork;uniform float uBrushAspect;uniform vec4 uBrushTrail[16];
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=mat2(1.6,1.2,-1.2,1.6)*p;a*=.5;}return v;}
  void main(){
   vec2 p=vUv*vec2(uBrushAspect,1.);float hole=0.,rim=0.;vec2 drift=vec2(0.);
   for(int i=0;i<16;i++){
    vec4 a=uBrushTrail[i];vec2 start=a.xy*vec2(uBrushAspect,1.);vec2 finish=start;
    if(i<15&&uBrushTrail[i+1].z>.01)finish=uBrushTrail[i+1].xy*vec2(uBrushAspect,1.);
    vec2 segment=finish-start;float f=clamp(dot(p-start,segment)/max(.00001,dot(segment,segment)),0.,1.);vec2 delta=p-mix(start,finish,f);float distance=length(delta);
    float radius=.035+a.w*.018;float influence=exp(-distance*distance/(radius*radius))*a.z;
    hole=max(hole,influence);rim=max(rim,exp(-pow((distance-radius*1.5)/radius,2.))*a.z);drift+=normalize(delta+vec2(.0001))*influence*.01;
   }
   float t=uTime*.025;vec2 flow=p*3.6+vec2(t,-t*.6)+drift;float n=fbm(flow+fbm(flow+2.));float clouds=smoothstep(.28,.76,n);
   float leftMist=1.-smoothstep(.12,.6,vUv.x);float density=(.02+clouds*.18)*mix(.18,1.,uWork)*mix(1.,.42,uWork*(1.-leftMist));density*=1.-hole*.98;density+=rim*.014*uWork;
   vec3 violet=mix(vec3(.17,.22,.39),vec3(.44,.23,.68),clouds);vec3 initial=vec3(.18,.38,.35);vec3 color=mix(initial,violet,uWork);
   gl_FragColor=vec4(color,density);
  }`});
 const scene=new THREE.Scene();scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),material));const camera=new THREE.Camera();
 addEventListener('resize',()=>renderer.setSize(innerWidth,innerHeight));
 return {render(scroll,time){uniforms.uTime.value=reduced?0:time;uniforms.uWork.value=THREE.MathUtils.smoothstep(scroll,4.2,5.4)*(1-THREE.MathUtils.smoothstep(scroll,19,20));renderer.render(scene,camera)}};
}
