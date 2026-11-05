import * as THREE from './vendor/three.module.js';
// Static mineral detail in object space: no extra textures or per-frame CPU work.
export function weatherRock(material,{sand=false,waterLevel={value:-3.15}}={}){
 material.roughness=.9;material.metalness=0;material.envMapIntensity=.06;material.bumpMap=null;
 material.customProgramCacheKey=()=>sand?'shore-sand-v5':'basalt-rock-v5';
 material.onBeforeCompile=shader=>{
  shader.uniforms.uShoreWater=waterLevel;
  shader.uniforms.uTerrainDark={value:new THREE.Color(sand?'#45403C':'#282D36')};
  shader.uniforms.uTerrainLight={value:new THREE.Color(sand?'#45403C':'#474F5D')};
  shader.uniforms.uTerrainWet={value:new THREE.Color(sand?'#292624':'#282D36')};
  shader.vertexShader='varying vec3 vStonePosition;varying float vTerrainHeight;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   vStonePosition=position;vec4 terrainWorld=vec4(position,1.);
   #ifdef USE_INSTANCING
    terrainWorld=instanceMatrix*terrainWorld;
   #endif
   vTerrainHeight=(modelMatrix*terrainWorld).y;`);
  shader.fragmentShader=`varying vec3 vStonePosition;varying float vTerrainHeight;uniform float uShoreWater;uniform vec3 uTerrainDark;uniform vec3 uTerrainLight;uniform vec3 uTerrainWet;
   float stoneHash(vec3 p){p=fract(p*.3183099+vec3(.13,.27,.41));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
   float stoneNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(stoneHash(i),stoneHash(i+vec3(1,0,0)),f.x),mix(stoneHash(i+vec3(0,1,0)),stoneHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(stoneHash(i+vec3(0,0,1)),stoneHash(i+vec3(1,0,1)),f.x),mix(stoneHash(i+vec3(0,1,1)),stoneHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
   vec2 stonePlate(vec2 p){
    vec2 cell=floor(p),f=fract(p);float first=10.,second=10.,tone=.5;
    for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
     vec2 offset=vec2(float(x),float(y));float h=stoneHash(vec3(cell+offset,2.));
     vec2 seed=vec2(h,stoneHash(vec3(cell+offset,7.)))*.8+.1;
     vec2 d=offset+seed-f;float distance=dot(d,d);
     if(distance<first){second=first;first=distance;tone=h;}else second=min(second,distance);
    }
    return vec2(clamp((second-first)*3.,0.,1.),tone);
   }
   float stoneHeight(vec3 p){float coarse=stoneNoise(p*3.);float strata=abs(sin(p.y*12.+coarse*3.));return coarse*.005+stoneNoise(p*18.)*.0012+stoneNoise(p*65.)*.00025-(1.-smoothstep(.02,.11,strata))*.0008;}
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float mineral=stoneNoise(vStonePosition*9.);
   float strata=abs(sin(vStonePosition.y*8.+vStonePosition.x*2.+stoneNoise(vStonePosition*3.)*6.));
   float fissure=1.-smoothstep(.025,.14,strata);
   float shorelineWet=1.-smoothstep(uShoreWater+.025,uShoreWater+.48,vTerrainHeight);
   float textureDetail=clamp(dot(diffuseColor.rgb,vec3(.299,.587,.114))*2.,.78,1.12);
   float grains=stoneNoise(vStonePosition*115.);
   ${sand?'':'vec2 plate=stonePlate(vec2(vStonePosition.x*.95+vStonePosition.z*.24,vStonePosition.z*2.8+vStonePosition.y*.6));'}
   vec3 naturalTerrain=mix(uTerrainDark,uTerrainLight,smoothstep(.48,.94,mineral)*.65);
   naturalTerrain*=${sand?'mix(.8,1.16,grains)':'mix(.64,1.08,plate.y)*mix(.38,1.,smoothstep(.008,.065,plate.x))*mix(.88,1.04,grains)'};
   diffuseColor.rgb=mix(naturalTerrain,uTerrainWet,shorelineWet*.85)*textureDetail*(1.-fissure*${sand?'.04':'.28'});
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   float wetSurface=1.-smoothstep(uShoreWater+.025,uShoreWater+.48,vTerrainHeight);
   roughnessFactor=mix(roughnessFactor,.62,wetSurface*.85);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight*=.42;\n#include <opaque_fragment>');
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float stoneRelief=${sand?'stoneNoise(vStonePosition*28.)*.0015':'stoneHeight(vStonePosition)'};
   vec3 surfaceDx=dFdx(-vViewPosition),surfaceDy=dFdy(-vViewPosition);
   vec3 stoneR1=cross(surfaceDy,normal),stoneR2=cross(normal,surfaceDx);
   float stoneDet=dot(surfaceDx,stoneR1);
   vec3 stoneGradient=sign(stoneDet)*(dFdx(stoneRelief)*stoneR1+dFdy(stoneRelief)*stoneR2);
   normal=normalize(abs(stoneDet)*normal-stoneGradient);
  `);
 };
}

