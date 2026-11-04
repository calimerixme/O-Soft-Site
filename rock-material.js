// Static mineral detail in object space: no extra textures or per-frame CPU work.
export function weatherRock(material){
 material.roughness=.87;material.metalness=0;material.bumpMap=null;
 material.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vStonePosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvStonePosition=position;');
  shader.fragmentShader=`varying vec3 vStonePosition;
   float stoneHash(vec3 p){p=fract(p*.3183099+vec3(.13,.27,.41));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
   float stoneNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(stoneHash(i),stoneHash(i+vec3(1,0,0)),f.x),mix(stoneHash(i+vec3(0,1,0)),stoneHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(stoneHash(i+vec3(0,0,1)),stoneHash(i+vec3(1,0,1)),f.x),mix(stoneHash(i+vec3(0,1,1)),stoneHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
   float stoneHeight(vec3 p){float coarse=stoneNoise(p*3.);float strata=abs(sin(p.y*8.+p.x*2.+coarse*6.));return coarse*.025+stoneNoise(p*13.)*.005+stoneNoise(p*32.)*.0008-(1.-smoothstep(.0,.13,strata))*.003;}
  `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float mineral=stoneNoise(vStonePosition*9.);
   float strata=abs(sin(vStonePosition.y*8.+vStonePosition.x*2.+stoneNoise(vStonePosition*3.)*6.));
   float fissure=1.-smoothstep(.025,.14,strata);
   diffuseColor.rgb*=mix(vec3(.42,.46,.5),vec3(.94,.87,.76),mineral)*(1.-fissure*.38);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   float stoneRelief=stoneHeight(vStonePosition);
   vec3 surfaceDx=dFdx(-vViewPosition),surfaceDy=dFdy(-vViewPosition);
   vec3 stoneR1=cross(surfaceDy,normal),stoneR2=cross(normal,surfaceDx);
   float stoneDet=dot(surfaceDx,stoneR1);
   vec3 stoneGradient=sign(stoneDet)*(dFdx(stoneRelief)*stoneR1+dFdy(stoneRelief)*stoneR2);
   normal=normalize(abs(stoneDet)*normal-stoneGradient);
  `);
 };
}

