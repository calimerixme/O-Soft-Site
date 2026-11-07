import {renderProfile as profile} from './render-profile.js?v=20261107-preload-1';
import * as THREE from './vendor/three.module.js';

// Almost no face tint: the curved silhouette catches the blue/violet light.
export function createOuterGlass(radius,height){
 const material=new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,side:THREE.FrontSide,
  uniforms:{uReveal:{value:1}},
  vertexShader:`varying vec3 vGlassNormal;varying vec3 vGlassView;
   void main(){vec4 p=modelViewMatrix*vec4(position,1.);vGlassNormal=normalize(normalMatrix*normal);vGlassView=-p.xyz;gl_Position=projectionMatrix*p;}`,
  fragmentShader:`uniform float uReveal;varying vec3 vGlassNormal;varying vec3 vGlassView;
   void main(){vec3 n=normalize(vGlassNormal);float edge=pow(1.-abs(dot(n,normalize(vGlassView))),4.);
    vec3 tint=mix(vec3(.19,.49,.86),vec3(.48,.30,.72),smoothstep(-.65,.65,n.x));
    gl_FragColor=vec4(tint,(.0015+edge*.14)*uReveal);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`
 });
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,profile.mobile?48:96,1,true),material);
 mesh.name='Third glass wall - blue violet silhouette';
 mesh.userData.edgeGlass=true;
 return mesh;
}
