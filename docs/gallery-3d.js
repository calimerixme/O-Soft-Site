import * as THREE from './vendor/three.module.js';
import {createSoftwarePreview} from './software-preview.js';

function roundedRect(width,height,radius){
 const x=-width/2,y=-height/2,s=new THREE.Shape();
 s.moveTo(x+radius,y);s.lineTo(x+width-radius,y);s.quadraticCurveTo(x+width,y,x+width,y+radius);
 s.lineTo(x+width,y+height-radius);s.quadraticCurveTo(x+width,y+height,x+width-radius,y+height);
 s.lineTo(x+radius,y+height);s.quadraticCurveTo(x,y+height,x,y+height-radius);
 s.lineTo(x,y+radius);s.quadraticCurveTo(x,y,x+radius,y);return s;
}

async function cardTextures(product,relief){
 const scale=innerWidth<760?.5:.75;
 const canvas=document.createElement('canvas');canvas.width=1024*scale;canvas.height=690*scale;
 const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.clearRect(0,0,1024,690);
 const gradient=ctx.createLinearGradient(0,0,1024,690);
 gradient.addColorStop(0,'#a1c7ba55');gradient.addColorStop(.45,'#9c80b54a');gradient.addColorStop(1,'#287e9055');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,1024,690);
 const image=await new THREE.TextureLoader().loadAsync(product.image);
 ctx.globalAlpha=.12;ctx.drawImage(image.image,0,0,1024,690);image.dispose();
 ctx.globalAlpha=.17;ctx.drawImage(relief.image,0,0,1024,690);ctx.globalAlpha=1;
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
 const borderShape=roundedRect(1,1,.045);borderShape.holes.push(roundedRect(.985,.978,.038));
 const borderGeometry=new THREE.ShapeGeometry(borderShape,24);
 const group=new THREE.Group();group.name='Software windows: rigid helix about spine';scene.add(group);
 const angleStep=Math.PI/3,pitch=(columnTravel.endY-columnTravel.startY)/Math.max(1,products.length-1);
 const preview=createSoftwarePreview(reduced);
 const cards=await Promise.all(products.map(async(product,index)=>{
  const maps=await cardTextures(product,relief),pane=new THREE.Group();pane.name=product.name;
  const glass=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:maps.glass,transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide}));
  const media=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:preview.texture,transparent:true,opacity:0,depthWrite:false,depthTest:true,side:THREE.DoubleSide}));media.position.z=-.006;media.visible=false;
  const title=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:maps.text,transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide}));title.position.z=.012;
  const border=new THREE.Mesh(borderGeometry,new THREE.MeshBasicMaterial({color:'#598f98',transparent:true,opacity:.6,depthWrite:false,depthTest:true,side:THREE.DoubleSide}));border.position.z=.006;
  pane.add(media,glass,border,title);pane.userData.index=index;pane.rotation.set(0,index*angleStep,-Math.PI/30);group.add(pane);
  return {pane,glass,title,border,media,index,sin:Math.sin(index*angleStep),cos:Math.cos(index*angleStep),lift:0};
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
  if(!group.visible){document.body.classList.remove('over-software');return;}
  const dt=Math.min(.05,last?time-last:.016);last=time;
  const mobile=innerWidth<760,radius=mobile?2.45:3.05;
  const frontZ=.8+radius,unitsPerPixel=2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*(camera.position.z-frontZ)/innerHeight;
  const width=(mobile?innerWidth*.74:Math.min(innerWidth*.4,580))*unitsPerPixel,height=width*.673;
  // One rigid helix, translated with the spine and rotated around its own central axis.
  const orbit=-position*angleStep;
  group.position.set(spine.position.x,spine.position.y-(1-entry)*pitch+exit*pitch*1.3,spine.position.z);
  group.rotation.set(0,orbit,0);
  
  const active=Math.round(position),animate=alpha>.5&&!document.querySelector('dialog[open]');
  if(animate)preview.render(products[active],time);
  for(const card of cards){
   const d=card.index-position;
   card.lift+=((hovered===card.index ? .25 : 0)-card.lift)*(reduced?1:1-Math.exp(-dt/.14));
   card.pane.position.set(card.sin*radius-Math.sin(orbit)*card.lift,-columnTravel.startY-card.index*pitch,card.cos*radius+Math.cos(orbit)*card.lift);
   // Fixed six-degree banking follows the descending helix; no independent panel wobble.
   card.pane.scale.set(width,height,1);
   card.media.visible=card.index===active&&animate;card.media.material.opacity=alpha*.58*(1-THREE.MathUtils.smoothstep(Math.abs(d),.15,.55));
   card.glass.material.opacity=alpha;card.title.material.opacity=alpha;card.border.material.opacity=alpha*.6;
  }
  group.updateMatrixWorld(true);
  if(dirty||Math.abs(position-lastPosition)>.0002){spine.updateMatrixWorld(true);camera.updateMatrixWorld(true);hovered=touchPointer?-1:pick();document.body.classList.toggle('over-software',hovered>=0);dirty=false;lastPosition=position;}
 }};
}
