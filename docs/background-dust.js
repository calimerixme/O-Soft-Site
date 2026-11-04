import * as THREE from './vendor/three.module.js';

// Distant dust has its own clock and deliberately has no pointer-field uniforms.
export function createBackgroundDust(reduced){
 const count=innerWidth<760?650:1500,positions=new Float32Array(count*3),sizes=new Float32Array(count),phases=new Float32Array(count);
 let seed=901;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<count;i++){positions.set([(random()-.5)*44,(random()-.5)*28,-8-random()*27],i*3);sizes[i]=.025+random()*.055;phases[i]=random()*Math.PI*2;}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));geometry.setAttribute('aPhase',new THREE.BufferAttribute(phases,1));
 const uniforms={uTime:{value:0},uHeight:{value:innerHeight},uOpacity:{value:.35}};
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`
  attribute float aSize;attribute float aPhase;uniform float uTime;uniform float uHeight;varying float vLight;varying float vDepth;
  void main(){vec3 p=position;p.y=mod(p.y+uTime*.065+14.,28.)-14.;p.x+=sin(uTime*.12+aPhase)*.45;p.z+=sin(uTime*.07+aPhase)*.3;vec4 view=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*view;gl_PointSize=clamp(aSize*uHeight/max(1.,-view.z),.9,3.5);vLight=.65+.35*sin(uTime*.21+aPhase);vDepth=exp(-max(0.,-view.z)*.025);}
 `,fragmentShader:`uniform float uOpacity;varying float vLight;varying float vDepth;void main(){vec2 p=gl_PointCoord*2.-1.;float r=dot(p,p);if(r>1.)discard;float soft=exp(-r*3.)*(1.-smoothstep(.5,1.,r));gl_FragColor=vec4(vec3(.32,.39,.52),soft*vLight*vDepth*uOpacity);}`});
 const points=new THREE.Points(geometry,material);points.name='Autonomous background dust';points.frustumCulled=false;
 return {points,update(time,work){uniforms.uTime.value=reduced?0:time;uniforms.uHeight.value=innerHeight;uniforms.uOpacity.value=.32+work*.3;}};
}
