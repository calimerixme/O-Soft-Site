import * as THREE from './vendor/three.module.js';
import {renderProfile as profile} from './render-profile.js?v=20261107-preload-1';
// Rings stay centered on the tube; only their rear semicircles are drawn.
export function createParticleNecklace(scene,height,reduced){
 const count=profile.mobile?180:720,positions=new Float32Array(count*3),colors=new Float32Array(count*3),sizes=new Float32Array(count),levels=new Float32Array(count);
 let seed=3187;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const color=new THREE.Color();
 const matcap=new THREE.TextureLoader().load('assets/metal-matcap.jpg');matcap.colorSpace=THREE.SRGBColorSpace;
 const scrollTravel=1.7,ringSpacing=18.,ringLevels=[1.,-19.5,-41.],ringCount=ringLevels.length;
 // Static clumps and empty arcs: no noise/attraction loop added to the render frame.
 const ringProfiles=Array.from({length:ringCount},()=>({phase:random()*Math.PI*2,gaps:Array.from({length:3},()=>({angle:random()*Math.PI*2,halfWidth:.16+random()*.20}))}));
 const angleDistance=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
 function sampleAngle(ring){
  const profile=ringProfiles[ring];
  for(let attempt=0;attempt<1000;attempt++){
   const angle=random()*Math.PI*2;
   if(profile.gaps.some(gap=>angleDistance(angle,gap.angle)<gap.halfWidth))continue;
   const density=.07+.93*Math.pow(.5+.5*Math.sin(angle*5.+profile.phase),2.5);
   if(random()<density)return angle;
  }
  throw Error('Unable to sample a nonempty particle arc');
 }

 for(let i=0;i<count;i++){
  const ring=i%ringCount;
  const angle=sampleAngle(ring),radius=44.+(random()-.5)*6.5;
  const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
  const level=ringLevels[ring];
  const thickness=1.4+1.6*(.5+.5*Math.sin(angle*3.+ringProfiles[ring].phase));
  const y=level+(random()-.5)*thickness;
  levels[i]=level;
  positions.set([x,y,z],i*3);
  sizes[i]=.075+Math.pow(random(),1.7)*.36;color.setHSL(.49+random()*.3,.6+random()*.25,.45+random()*.2);colors.set([color.r,color.g,color.b],i*3);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));geometry.setAttribute('aLevel',new THREE.BufferAttribute(levels,1));
 const uniforms={uMatcap:{value:matcap},uHeight:{value:1},uOpacity:{value:0},uRingCenterZ:{value:0},uOrbit:{value:0},uColumnY:{value:0},uRingSpacing:{value:ringSpacing}};
 const material=new THREE.ShaderMaterial({uniforms,vertexColors:true,transparent:true,depthWrite:false,depthTest:true,
  vertexShader:`attribute float aSize;attribute float aLevel;uniform float uColumnY;uniform float uRingSpacing;uniform float uHeight;uniform float uRingCenterZ;uniform float uOrbit;varying vec3 vColor;varying float vRearVisibility;varying float vDepthLight;void main(){vColor=color;vec3 animated=position;
   // Rotate within a common fixed plane; never rotate the inclination or add waves.
   float c=cos(uOrbit),s=sin(uOrbit);
   animated.x=position.x*c+position.z*s;animated.z=-position.x*s+position.z*c;
   animated.y=position.y+(animated.x*.7960838+animated.z*.6051864)*.10;
   float relativeZ=(modelMatrix*vec4(animated,1.)).z-uRingCenterZ;vRearVisibility=smoothstep(0.,.8,-relativeZ)*max(0.,1.-abs(aLevel+uColumnY)/uRingSpacing);vec4 p=modelViewMatrix*vec4(animated,1.);gl_Position=projectionMatrix*p;vDepthLight=clamp(1.2-max(0.,-p.z)*.007,.65,1.1);gl_PointSize=clamp(aSize*uHeight*2.2/max(1.,-p.z),1.6,14.);}`,
  fragmentShader:`uniform sampler2D uMatcap;uniform float uOpacity;varying vec3 vColor;varying float vRearVisibility;varying float vDepthLight;
  void main(){if(vRearVisibility<.001)discard;vec2 p=gl_PointCoord*2.-1.;float radius=length(p),angle=atan(p.y,p.x);
   float edge=.89+.045*cos(angle*6.);if(radius>edge)discard;
   float facetAngle=(floor((angle+3.14159)/1.0472)+.5)*1.0472-3.14159;
   vec2 faceted=mix(p,vec2(cos(facetAngle),sin(facetAngle))*radius,.24);
   vec3 normal=normalize(vec3(faceted,sqrt(max(.01,1.-radius*radius))));
   vec3 reflected=texture2D(uMatcap,normal.xy*.47+.5).rgb;
   float highlight=pow(max(0.,dot(normal,normalize(vec3(-.4,.55,1.)))),24.);
   vec3 surface=vColor*(reflected*.9+vec3(.12))*1.45+vec3(.72,.88,1.)*highlight*.28;
   gl_FragColor=vec4(surface*vDepthLight,(1.-smoothstep(edge-.1,edge,radius))*uOpacity*vRearVisibility);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
 const points=new THREE.Points(geometry,material);points.name='Wide background particle rings';scene.add(points);
 // A sparse companion stream shares the shader/material; only its group rotation differs.
 const fastCount=Math.ceil(count*.16),fastPositions=new Float32Array(fastCount*3),fastColors=new Float32Array(fastCount*3),fastSizes=new Float32Array(fastCount),fastLevels=new Float32Array(fastCount);
 for(let i=0;i<fastCount;i++){
  const source=(i*7)%count,offset=source*3,phase=.35;
  const x=positions[offset],z=positions[offset+2];
  fastPositions.set([(x*Math.cos(phase)-z*Math.sin(phase))*.985,positions[offset+1]+.15,(x*Math.sin(phase)+z*Math.cos(phase))*.985],i*3);
  fastColors.set(colors.subarray(offset,offset+3),i*3);fastSizes[i]=sizes[source]*1.05;fastLevels[i]=levels[source];
 }
 const fastGeometry=new THREE.BufferGeometry();fastGeometry.setAttribute('position',new THREE.BufferAttribute(fastPositions,3));fastGeometry.setAttribute('color',new THREE.BufferAttribute(fastColors,3));fastGeometry.setAttribute('aSize',new THREE.BufferAttribute(fastSizes,1));fastGeometry.setAttribute('aLevel',new THREE.BufferAttribute(fastLevels,1));
 const fastMaterial=material.clone();fastMaterial.uniforms={...uniforms,uOrbit:{value:0}};
 const fastPoints=new THREE.Points(fastGeometry,fastMaterial);fastPoints.name='Sparse faster companion rings';scene.add(fastPoints);

 return {points,fastPoints,update(time,anchor,opacity,scrollPosition){points.visible=fastPoints.visible=opacity>.001;if(!points.visible)return;points.position.copy(anchor);points.position.y=1.4+(anchor.y-1.4)*scrollTravel;fastPoints.position.copy(points.position);uniforms.uColumnY.value=points.position.y;uniforms.uRingCenterZ.value=anchor.z;points.rotation.y=fastPoints.rotation.y=0;uniforms.uOrbit.value=-scrollPosition*Math.PI/3+(reduced?0:time*.004);fastMaterial.uniforms.uOrbit.value=-scrollPosition*Math.PI/3+(reduced?0:time*.007);uniforms.uHeight.value=innerHeight*Math.min(devicePixelRatio,profile.pixelRatio);uniforms.uOpacity.value=opacity*.8;}};
}
