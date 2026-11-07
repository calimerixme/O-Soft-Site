import * as THREE from './vendor/three.module.js';
import {createSoftwarePreview} from './software-preview.js?v=20261107-preload-1';
import {galleryPlacement} from './gallery-layout.js?v=20261107-preload-1';

function roundedRect(width,height,radius){
 const x=-width/2,y=-height/2,s=new THREE.Shape();
 s.moveTo(x+radius,y);s.lineTo(x+width-radius,y);s.quadraticCurveTo(x+width,y,x+width,y+radius);
 s.lineTo(x+width,y+height-radius);s.quadraticCurveTo(x+width,y+height,x+width-radius,y+height);
 s.lineTo(x+radius,y+height);s.quadraticCurveTo(x,y+height,x,y+height-radius);
 s.lineTo(x,y+radius);s.quadraticCurveTo(x,y,x+radius,y);return s;
}

// Shared, static micro-relief: no per-pane noise calculation during animation.
function glassNormalTexture(){
 const size=256,data=new Uint8Array(size*size*4);
 const height=(x,y)=>Math.sin(x*17+Math.sin(y*13)*1.5)*.35+Math.sin(y*31+x*11)*.16+Math.sin(x*53-y*37)*.07;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,dx=(height(u+.003,v)-height(u-.003,v))*5,dy=(height(u,v+.003)-height(u,v-.003))*5;
  const n=new THREE.Vector3(-dx,-dy,1).normalize(),i=(y*size+x)*4;
  data[i]=(n.x*.5+.5)*255;data[i+1]=(n.y*.5+.5)*255;data[i+2]=(n.z*.5+.5)*255;data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size);texture.needsUpdate=true;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;return texture;
}

async function cardTextures(product,relief){
 const scale=innerWidth<760?.5:.75;
 const canvas=document.createElement('canvas');canvas.width=1024*scale;canvas.height=690*scale;
 const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.clearRect(0,0,1024,690);
 const gradient=ctx.createLinearGradient(0,0,1024,690);
 gradient.addColorStop(0,'#d1d9d2');gradient.addColorStop(.45,'#d3c8d5');gradient.addColorStop(1,'#a9c9cb');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,1024,690);
 const image=await new THREE.TextureLoader().loadAsync(product.image);
 ctx.globalAlpha=.28;ctx.drawImage(image.image,0,0,1024,690);image.dispose();
 ctx.globalAlpha=.10;ctx.drawImage(relief.image,0,0,1024,690);ctx.globalAlpha=1;
 // Fine grain is baked once rather than recomputed as the pane moves.
 const grain=ctx.getImageData(0,0,canvas.width,canvas.height);let seed=117;
 for(let i=0;i<grain.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=(seed/4294967296-.5)*14;grain.data[i]+=n;grain.data[i+1]+=n;grain.data[i+2]+=n;}
 ctx.putImageData(grain,0,0);
 const glass=new THREE.CanvasTexture(canvas);glass.colorSpace=THREE.SRGBColorSpace;
 const lettering=document.createElement('canvas');lettering.width=canvas.width;lettering.height=canvas.height;
 const label=lettering.getContext('2d');label.scale(scale,scale);label.textAlign='center';label.textBaseline='middle';
 label.fillStyle='#cfdee9';label.font='36px Georgia';label.fillText('O’Soft',512,245);
 const words=product.name.split(' ');const lines=words.length>1?[words.slice(0,-1).join(' '),words.at(-1)]:words;
 label.font='84px ReferenceInterface, Interface, monospace';label.fillStyle='#edf6fb';
 label.shadowColor='#05111e';label.shadowBlur=9;
 lines.forEach((line,i)=>label.fillText(line,512,350+(i-(lines.length-1)/2)*90,910));
 const text=new THREE.CanvasTexture(lettering);text.colorSpace=THREE.SRGBColorSpace;
 return {glass,text};
}

export async function createGallery3D(scene,camera,spine,products,onActivate,reduced,columnTravel){
 await document.fonts.ready;
 const relief=await new THREE.TextureLoader().loadAsync('assets/window-glass.svg');
 const geometry=new THREE.ShapeGeometry(roundedRect(1,1,.045),24);
 const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)+.5,uv.getY(i)+.5);
 const borderShape=roundedRect(1,1,.045);borderShape.holes.push(roundedRect(.993,.990,.041));
 const borderGeometry=new THREE.ShapeGeometry(borderShape,24);
 // A bevelled rim has real side faces; its depth stays constant when panes resize.
 const rimGeometry=new THREE.ExtrudeGeometry(borderShape,{depth:.035,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.001,bevelThickness:.004,curveSegments:16});
 rimGeometry.translate(0,0,-.0175);
 const group=new THREE.Group();group.name='Software windows: rigid helix about spine';scene.add(group);
 
 const preview=createSoftwarePreview(reduced),normalMap=glassNormalTexture();
 const cards=await Promise.all(products.map(async(product,index)=>{
  const maps=await cardTextures(product,relief),pane=new THREE.Group();pane.name=product.name;
  const glass=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({map:maps.glass,normalMap,normalScale:new THREE.Vector2(.18,.18),transmission:0,clearcoat:.65,color:0x53616f,roughness:.24,metalness:.08,envMapIntensity:.55,transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide}));
  const media=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:preview.texture,transparent:true,opacity:0,depthWrite:false,depthTest:true,side:THREE.DoubleSide}));media.position.z=.030;media.visible=false;
  glass.position.z=.024;
  const title=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:maps.text,transparent:true,depthWrite:false,depthTest:true,side:THREE.FrontSide,toneMapped:false}));title.position.z=.23;
  const border=new THREE.Mesh(borderGeometry,new THREE.MeshBasicMaterial({color:'#598f98',transparent:true,opacity:.6,depthWrite:false,depthTest:true,side:THREE.DoubleSide}));border.position.z=.026;
  const rim=new THREE.Mesh(rimGeometry,new THREE.MeshStandardMaterial({color:'#63818d',metalness:.55,roughness:.29,transparent:true,opacity:.72,depthWrite:false,side:THREE.DoubleSide,envMapIntensity:.85}));
  pane.add(rim,media,glass,border,title);pane.userData.index=index;group.add(pane);
  return {pane,glass,title,border,rim,media,index,lift:0};
 }));relief.dispose();group.visible=false;
 const raycaster=new THREE.Raycaster(),ndc=new THREE.Vector2(2,2),hitTargets=cards.map(c=>c.glass);
 const blockers=spine.userData.occluders||spine.children.filter(c=>c.isMesh);let hovered=-1,enabled=false,last=0,dirty=true,lastPosition=-1,touchPointer=false;
 function pick(){
  if(!enabled||document.querySelector('dialog[open]'))return -1;
  raycaster.setFromCamera(ndc,camera);
  const hit=raycaster.intersectObjects([...hitTargets,...(spine.visible?blockers:[])],false)[0];
  return hit?.object.parent===spine?-1:(hit?.object.parent.userData.index??-1);
 }
 addEventListener('pointermove',event=>{touchPointer=event.pointerType==='touch';dirty=true;ndc.set(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2);});
 addEventListener('resize',()=>dirty=true);
 addEventListener('click',event=>{
  if(event.target.closest('button,a,input,textarea,dialog,header,aside'))return;
  ndc.set(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2);
  const index=pick();if(index>=0)onActivate(index);
 });
 return {group,update(state,time){
  const {position,alpha,entry,exit}=state;group.visible=alpha>.001;enabled=alpha>.7;
  if(!group.visible){if(document.body.classList.contains('over-software'))document.body.classList.remove('over-software');return;}
  const dt=Math.min(.05,last?time-last:.016);last=time;
  const mobile=innerWidth<760,radius=mobile?2.45:3.1;
  const frontZ=.8+radius,unitsPerPixel=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*(camera.position.z-frontZ)/innerHeight;
  const baseWidth=(mobile?innerWidth*.82:Math.min(innerWidth*.49,760))*unitsPerPixel,width=baseWidth*1.04,height=baseWidth*.673;
  // Fixed screen composition; only the relative index travels around the tube.
  group.position.set(.2,mobile?1.9:-.12,.8);group.rotation.set(0,0,0);
  group.position.y-=(1-entry)*height*.7+exit*height*1.4;
  
  const active=Math.round(position),animate=alpha>.001&&!state.modalOpen;
  if(animate)preview.render(products[active],time);
  for(const card of cards){
   const d=card.index-position;
   card.lift+=((hovered===card.index ? .25 : 0)-card.lift)*(reduced?1:1-Math.exp(-dt/.14));
   const layout=galleryPlacement(d,width,height,mobile);
   card.pane.position.set(layout.x,layout.y,layout.z+card.lift);
   card.pane.rotation.set(0,layout.yaw,0);
   card.pane.scale.set(width*layout.scale,height*layout.scale,1);
   card.media.visible=card.index===active&&animate;card.media.material.opacity=alpha*.30*(1-THREE.MathUtils.smoothstep(Math.abs(d),.15,.55));
   card.glass.material.opacity=alpha*(.82+.13*layout.focus);// Suppress rear lettering completely; front neighbours stay secondary.
   const frontFacing=Math.cos(layout.yaw)>0;
   card.title.visible=frontFacing;
   card.title.material.opacity=alpha*(.38+.62*layout.focus);card.border.material.opacity=alpha*.65;card.rim.material.opacity=alpha*.72;
  }
  group.updateMatrixWorld(true);
  if(dirty||Math.abs(position-lastPosition)>.0002){spine.updateMatrixWorld(true);camera.updateMatrixWorld(true);hovered=touchPointer?-1:pick();document.body.classList.toggle('over-software',hovered>=0);dirty=false;lastPosition=position;}
 }};
}
