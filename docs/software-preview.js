import {renderProfile as profile} from './render-profile.js';
import * as THREE from './vendor/three.module.js';

// One shared animated texture, irrespective of the number of orbiting windows.
export function createSoftwarePreview(reduced){
 const canvas=document.createElement('canvas');canvas.width=Math.round(640*profile.previewScale);canvas.height=Math.round(432*profile.previewScale);
 const ctx=canvas.getContext('2d');ctx.setTransform(profile.previewScale,0,0,profile.previewScale,0,0);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 let last=-Infinity,slug='',start=0;
 const box=(x,y,w,h,r=8)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();ctx.stroke();};
 return {texture,render(product,time){
  const changed=slug!==product.slug;if(changed){slug=product.slug;start=time;last=-Infinity;}
  if(!changed&&(reduced||time-last<1/profile.previewFPS))return;
  last=time;const t=reduced?0:time-start,type=product.preview||'analytics';
  const gradient=ctx.createLinearGradient(0,0,640,432);gradient.addColorStop(0,'#09172c');gradient.addColorStop(1,'#052c32');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,640,432);
  ctx.lineWidth=1.4;ctx.strokeStyle='#6bcddd55';ctx.fillStyle='#3d719522';box(26,25,588,382,15);
  ctx.strokeStyle='#8ce5e666';ctx.beginPath();ctx.moveTo(26,65);ctx.lineTo(614,65);ctx.moveTo(135,65);ctx.lineTo(135,407);ctx.stroke();
  for(let i=0;i<3;i++){ctx.fillStyle=['#ad89e4','#75dbe1','#92b5d8'][i];ctx.beginPath();ctx.arc(45+i*15,45,3,0,Math.PI*2);ctx.fill();}
  for(let i=0;i<7;i++){ctx.fillStyle=i===Math.floor(t*.5)%7?'#8de9ed99':'#7b9fbc33';ctx.fillRect(45,95+i*38,62-i%3*10,5);}
  ctx.strokeStyle='#94dfea88';ctx.fillStyle='#6a99b322';
  if(type==='scan'){
   box(245,92,220,260,8);ctx.strokeStyle='#77e4e977';
   for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(270,132+i*26);ctx.lineTo(430-i%3*20,132+i*26);ctx.stroke();}
   const y=110+(Math.sin(t*.85)*.5+.5)*220;const beam=ctx.createLinearGradient(0,y-34,0,y);beam.addColorStop(0,'#35d9dd00');beam.addColorStop(1,'#6ae8ef77');ctx.fillStyle=beam;ctx.fillRect(230,y-34,250,34);ctx.strokeStyle='#baffff';ctx.beginPath();ctx.moveTo(230,y);ctx.lineTo(480,y);ctx.stroke();
  }else if(type==='transfer'||type==='backup'||type==='network'){
   const centers=type==='network'?[[210,160],[420,115],[520,260],[275,335]]:[[225,220],[510,220]];
   ctx.strokeStyle='#80cbdf88';ctx.beginPath();centers.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();
   centers.forEach(([x,y],i)=>{ctx.fillStyle='#405e8933';ctx.strokeStyle='#a8e5ef88';box(x-28,y-36,56,72);ctx.fillStyle='#a2bfe455';ctx.fillRect(x-15,y-16,30,4);ctx.fillRect(x-15,y-3,22,4);});
   for(let i=0;i<9;i++){const f=(t*.22+i/9)%1,a=centers[i%(centers.length-1)],b=centers[i%(centers.length-1)+1];ctx.fillStyle=i%2?'#b89aff':'#8ef8ee';ctx.beginPath();ctx.arc(a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f-Math.sin(f*Math.PI)*55,3.5,0,Math.PI*2);ctx.fill();}
   if(type==='backup'){ctx.strokeStyle='#6ce7d966';for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(510,220,45+((t*18+i*22)%65),0,Math.PI*2);ctx.stroke();}}
  }else if(type==='grid'||type==='calendar'||type==='desk'||type==='invoice'){
   const columns=type==='invoice'?1:3,rows=type==='calendar'?4:3;
   for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){const x=166+col*140,y=94+row*(284/rows),active=(row*columns+col)===Math.floor(t*.8)%(rows*columns);ctx.fillStyle=active?'#639cce66':'#59809e22';ctx.strokeStyle=active?'#b7afffcc':'#89c7d955';box(x,y,columns===1?410:122,rows===4?55:78,6);ctx.fillStyle=active?'#c6edf1aa':'#aacbd855';ctx.fillRect(x+12,y+14,columns===1?160:55,4);ctx.fillRect(x+12,y+29,columns===1?240:80,3);}
  }else{
   ctx.fillStyle='#568ca22a';ctx.strokeStyle='#7eb6d555';for(let i=0;i<3;i++)box(165+i*140,92,124,70);
   for(let i=0;i<8;i++){const h=35+(Math.sin(t*.6+i*.7)*.5+.5)*115;ctx.fillStyle=i%2?'#a080d899':'#53c3ce99';ctx.fillRect(182+i*47,353-h,25,h);}
   ctx.strokeStyle='#9df4e9';ctx.lineWidth=2;ctx.beginPath();for(let x=175;x<575;x+=5){const y=235+Math.sin(x*.019+t*.55)*24+Math.cos(x*.035-t*.3)*10;x===175?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();
  }
  texture.needsUpdate=true;
 }};
}
