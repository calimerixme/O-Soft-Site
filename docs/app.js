import {renderProfile as profile} from './render-profile.js';
import {createProductGallery} from './product-gallery.js';
﻿import {createWorld} from './world.js';
import {createShop} from './shop.js';
import {JOURNEY_END,ENDING,GALLERY_START,GALLERY_LAST} from './journey.js';
import {createPointerField,createMist} from './interaction.js';
const $=s=>document.querySelector(s),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const WORK=GALLERY_START,END=19.1;let STEP=1.42;
$('#journey').style.height=((JOURNEY_END+1)*100)+'vh';
let all=[],filtered=[],cards=[],selected=0,scroll=scrollY/innerHeight,targetScroll=scroll,searchQuery='',world;
const pointer={x:0,y:0};
const pointerField=createPointerField();let mist;
let shop;const productGallery=createProductGallery(document.querySelector('#project-media'));
function seek(s){if(s>=WORK-.5)prepareGallery();window.scrollTo({top:s*innerHeight,behavior:reduced?'instant':'smooth'})}
function media(p,controls=false){if(p.video){const v=document.createElement('video');v.src=p.video;v.poster=p.image;v.muted=!controls;v.loop=!controls;v.controls=controls;v.playsInline=true;v.preload=controls?'auto':'metadata';return v}const image=new Image();image.src=p.image;image.alt=p.name;return image}
function openProject(p){productGallery.setProduct(p);$('#project-client').textContent=p.client+' / '+p.tags;$('#project-title').textContent=p.name;$('#project-copy').textContent=p.description;shop.selectProduct(p);openDialog($('#project-panel'))}
function renderCards(){
 lastVideo=-2;
 for(const c of cards)c.video?.pause();
 filtered=all;
 $('#floating-gallery').replaceChildren();cards=[];
 filtered.forEach((p,i)=>{const button=document.createElement('button');button.className='project-screen';button.setAttribute('aria-label','Ouvrir '+p.name);const image=new Image();image.src=p.image;image.alt='';image.loading='eager';button.append(image);const video=p.video?media(p):null;if(video)button.append(video);
  const glass=document.createElement('span');glass.className='glass-surface';glass.setAttribute('aria-hidden','true');button.append(glass);button.style.setProperty('--glass-x',(38+i*12)+'%');button.style.setProperty('--glass-angle',(112+i*18)+'deg');button.style.setProperty('--glass-grain-offset',(i*21)+'%');const title=document.createElement('span');title.className='screen-title';const client=document.createElement('small');client.textContent=p.client;const name=document.createElement('span');const words=p.name.split(' ');name.textContent=p.slug==='discover-your-patronus'?'DISCOVER\nYOUR\nPATRONUS':words.length>2?words.slice(0,Math.ceil(words.length/2)).join(' ')+'\n'+words.slice(Math.ceil(words.length/2)).join(' '):words.join('\n');const number=document.createElement('small');number.className='screen-number';number.textContent='EXPLORE PROJECT ↗';title.append(client,name,number);button.append(title);button.onclick=()=>{const index=clamp((scroll-WORK)/STEP,0,filtered.length-1);Math.abs(i-index)<.5?openProject(p):seek(WORK+i*STEP)};$('#floating-gallery').append(button);const card={el:button,video,playing:false,p,hovered:false,lift:0};button.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')card.hovered=true});button.addEventListener('pointerleave',()=>card.hovered=false);button.addEventListener('focus',()=>card.hovered=true);button.addEventListener('blur',()=>card.hovered=false);cards.push(card);
 });
 $('#search-status').textContent=filtered.length?'':'NO MATCHING PROJECTS. TRY ANOTHER SEARCH.'; $('#next-project').disabled=!filtered.length; $('#previous-project').disabled=!filtered.length;
 if(!filtered.length)$('#project-index').textContent='00 / 00';
}
function renderShortcuts(){
 $('#filter-buttons').replaceChildren();
 all.forEach((p,i)=>{const b=document.createElement('button');b.textContent='\u2192 '+p.name;b.dataset.product=p.slug;b.onclick=()=>seek(WORK+i*STEP);$('#filter-buttons').append(b)});
 const cart=document.createElement('button');cart.textContent='\u2192 Voir le panier';cart.className='cart-shortcut';cart.onclick=()=>shop.open();$('#filter-buttons').after(cart);
}
$('#search').onsubmit=e=>{e.preventDefault();const q=$('#query').value.trim().toLocaleLowerCase('fr');const index=all.findIndex(p=>p.name.toLocaleLowerCase('fr').includes(q));if(index>=0){$('#search-status').textContent='';seek(WORK+index*STEP)}else $('#search-status').textContent='Aucun logiciel trouvé.'};
$('#work').onclick=()=>{closeDialog($('#contact-panel'));seek(WORK)};$('.home').onclick=()=>seek(0);$('#back-start').onclick=()=>seek(0);
$('#next-project').onclick=()=>seek(WORK+Math.min(filtered.length-1,selected+1)*STEP);$('#open-current-product').onclick=()=>{if(filtered[selected])openProject(filtered[selected])};
$('#previous-project').onclick=()=>seek(WORK+Math.max(0,selected-1)*STEP);
function openDialog(d){d.showModal();document.body.classList.add('modal-open')}
function closeDialog(d){if(d.open)d.close()}
function syncModal(){document.body.classList.toggle('modal-open',!!document.querySelector('dialog[open]'));$('#contact').setAttribute('aria-expanded',$('#contact-panel').open)}
for(const d of document.querySelectorAll('dialog'))d.addEventListener('close',()=>{syncModal();d.querySelectorAll('video').forEach(v=>v.pause())});
$('#contact').onclick=()=>{$('#contact-panel').open?closeDialog($('#contact-panel')):openDialog($('#contact-panel'));syncModal();drawGlobe()};$('#get-in-touch').onclick=()=>{openDialog($('#contact-panel'));syncModal();drawGlobe()};$('#close-contact').onclick=()=>closeDialog($('#contact-panel'));$('#close-project').onclick=()=>closeDialog($('#project-panel'));
$('#reel').onclick=()=>{const video=$('#reel-video');if(!video.getAttribute('src'))video.src=video.dataset.src;openDialog($('#reel-panel'));video.play().catch(()=>{})};$('#close-reel').onclick=()=>closeDialog($('#reel-panel'));
function drawGlobe(){const canvas=$('#globe'),dpr=Math.min(devicePixelRatio,2),w=innerWidth,h=innerHeight;canvas.width=w*dpr;canvas.height=h*dpr;const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);const rx=w*.4,ry=h*.39,cx=w*.5,cy=h*.5;ctx.strokeStyle='#8ab5c41a';ctx.lineWidth=.8;for(let i=-3;i<=3;i++){const lat=i*Math.PI/8;const y=cy+Math.sin(lat)*ry,r=Math.cos(lat)*rx;ctx.beginPath();ctx.ellipse(cx,y,r,Math.max(2,Math.cos(lat)*ry*.095),0,0,Math.PI*2);ctx.stroke()}for(let i=0;i<9;i++){ctx.beginPath();ctx.ellipse(cx,cy,Math.max(1,Math.abs(Math.cos(i*Math.PI/9))*rx),ry,0,0,Math.PI*2);ctx.stroke()}}
let audioCtx,gain,oscillators=[],track=0;
const tracks=[{name:'QUANTUM WORLD',base:55},{name:'DUSK',base:65.41},{name:'FLOATING LIGHT',base:49}];
async function toggleAudio(){if(!audioCtx){audioCtx=new AudioContext();gain=audioCtx.createGain();gain.gain.value=0;gain.connect(audioCtx.destination);[1,1.5,2,3].forEach((f,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.value=tracks[track].base*f;g.gain.value=.04/(i+1);o.connect(g).connect(gain);o.start();oscillators.push(o)})}await audioCtx.resume();const on=$('#audio').getAttribute('aria-pressed')!=='true';gain.gain.setTargetAtTime(on?.7:0,audioCtx.currentTime,.6);$('#audio').setAttribute('aria-pressed',on);$('#audio').setAttribute('aria-label',on?'Couper le son':'Activer le son')}
function changeTrack(delta){track=(track+delta+tracks.length)%tracks.length;$('#track-label').textContent='0'+(track+1)+'. '+tracks[track].name;oscillators.forEach((o,i)=>o.frequency.setTargetAtTime(tracks[track].base*[1,1.5,2,3][i],audioCtx.currentTime,.7))}
$('#audio').onclick=toggleAudio;$('#next-track').onclick=()=>changeTrack(1);$('#previous-track').onclick=()=>changeTrack(-1);
function updateScroll(){targetScroll=clamp(scrollY/innerHeight,0,JOURNEY_END);lastInteraction=performance.now();uiDirty=true;}addEventListener('scroll',updateScroll,{passive:true});addEventListener('pointermove',e=>{if(profile.mobile||e.pointerType==='touch')return;pointer.x=e.clientX/innerWidth-.5;pointer.y=e.clientY/innerHeight-.5;lastInteraction=performance.now();},{passive:true});addEventListener('resize',()=>{updateScroll();if($('#contact-panel').open)drawGlobe()});
// Keep native touch scrolling; accelerate wheel travel without queuing smooth-scroll animations.
addEventListener('wheel',e=>{const list=e.target.closest?.('#filter-buttons,#filters');if(list&&list.scrollHeight>list.clientHeight)return;if(e.ctrlKey||e.metaKey||document.querySelector('dialog[open]')||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;const unit=e.deltaMode===1?16:e.deltaMode===2?innerHeight:1;e.preventDefault();window.scrollBy({top:e.deltaY*unit*1.45,behavior:'instant'})},{passive:false});
addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA/.test(document.activeElement.tagName))return;if(scroll>=WORK-.5&&scroll<END){if(e.key==='ArrowRight')$('#next-project').click();if(e.key==='ArrowLeft')$('#previous-project').click()}});
let nextFrameAt=0,lastFPS=0;
let lastVideo=-1,lastTime=0,lastInteraction=-1000,lastUIScroll=-1,lastSelected=-1,lastModal=false,uiDirty=true;
let galleryPreparation;
function prepareGallery(){
 if(!world||galleryPreparation)return;
 galleryPreparation=world.setGallery(all,index=>cards[index]?.el.click()).then(()=>{document.body.classList.add('webgl-gallery');uiDirty=true;}).catch(error=>{console.warn('Gallery fallback:',error.message);});
}
const frameDOM={cue:$('.scroll-cue'),intro:$('#intro-text'),reel:$('#reel'),end:$('#end-message'),gallery:$('#floating-gallery'),index:$('#project-index')};
const styleCache=new WeakMap();
function style(element,key,value){const saved=styleCache.get(element)||{};if(saved[key]===value)return;saved[key]=value;styleCache.set(element,saved);if(key.startsWith('--'))element.style.setProperty(key,value);else element.style[key]=value;}
function frame(time){
 requestAnimationFrame(frame);if(document.hidden)return;
 const modalOpen=document.body.classList.contains('modal-open');
 const moving=Math.abs(targetScroll-scroll)>.0001||time-lastInteraction<650;
 const fps=reduced?(moving?10:2):modalOpen?profile.modalFPS:moving?profile.activeFPS:profile.idleFPS;
 if(time+.5<nextFrameAt&&modalOpen===lastModal&&fps===lastFPS)return;
 const interval=1000/fps;
 nextFrameAt=(fps!==lastFPS||time-nextFrameAt>interval?time:nextFrameAt)+interval;lastFPS=fps;
 const dt=Math.min(.15,Math.max(.001,(time-lastTime)*.001));lastTime=time;lastModal=modalOpen;
 const follow=1-Math.exp(-dt/.065);scroll=clamp(reduced?targetScroll:scroll+(targetScroll-scroll)*follow,0,JOURNEY_END);
 if(Math.abs(targetScroll-scroll)<.0001)scroll=targetScroll;
 if(scroll>2.8)prepareGallery();
 const galleryEntry=smooth(4.85,5.3,scroll),galleryExit=smooth(ENDING.galleryStart,ENDING.galleryEnd,scroll),galleryAlpha=galleryEntry*(1-galleryExit);
 const position=clamp((scroll-WORK)/STEP,0,Math.max(0,cards.length-1));selected=Math.round(position);
 if(uiDirty||scroll!==lastUIScroll){
  const inWork=scroll>WORK-.35&&scroll<ENDING.galleryEnd;document.body.classList.toggle('in-work',inWork);document.body.classList.toggle('after-intro',scroll>1.2);
  style(frameDOM.cue,'opacity',String(1-smooth(.1,.65,scroll)));
  const intro=smooth(1.55,2.05,scroll)*(1-smooth(4.1,4.95,scroll)),aboutProgress=clamp((scroll-1.7)/2.5),edge=1.1-smooth(1.6,4.05,scroll)*1.3;
  style(frameDOM.intro,'opacity',String(intro));style(frameDOM.intro,'visibility',intro>.01?'visible':'hidden');style(frameDOM.intro,'transform','none');style(frameDOM.intro,'--about-progress',String(aboutProgress));style(frameDOM.intro,'clipPath',`polygon(0 ${clamp(edge+.12)*100}%,100% ${clamp(edge-.12)*100}%,100% 100%,0 100%)`);
  const reel=smooth(1.7,2.5,scroll)-smooth(3.3,4.2,scroll);style(frameDOM.reel,'opacity',String(reel));style(frameDOM.reel,'pointerEvents',reel>.5?'auto':'none');
  const end=smooth(END,20,scroll);style(frameDOM.end,'opacity',String(end));style(frameDOM.end,'visibility',end>.01?'visible':'hidden');
  style(frameDOM.gallery,'visibility',galleryAlpha>.01?'visible':'hidden');lastUIScroll=scroll;
 }
 if(selected!==lastSelected||uiDirty){document.querySelectorAll('[data-product]').forEach((button,i)=>{button.classList.toggle('active',i===selected);if(i===selected)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');});if(cards.length)frameDOM.index.textContent=String(selected+1).padStart(2,'0')+' / '+String(cards.length).padStart(2,'0');lastSelected=selected;}
 uiDirty=false;const mobile=profile.mobile;
 if(!world?.galleryReady&&galleryAlpha>.01)cards.forEach((c,i)=>{const d=i-position,visible=galleryAlpha>.01;c.el.style.visibility=visible?'visible':'hidden';c.el.tabIndex=visible&&Math.abs(d)<.4?0:-1;if(!visible){c.hovered=false;c.lift=0;return;}c.lift+=((c.hovered?1:0)-c.lift)*(reduced?1:1-Math.exp(-dt/.14));
 // A persistent helix: depth and rotation, never per-card fades or hidden backs.
 const angle=d*(Math.PI*2/3),arc=mobile?innerWidth*.8:Math.min(innerWidth*.55,820);
 let x=Math.sin(angle)*arc,y=d*innerHeight*(mobile?.34:.38),z=(Math.cos(angle)-1)*(mobile?400:650);
 const tilt=-angle*180/Math.PI-5;y+=(1-galleryEntry)*innerHeight*.45-galleryExit*innerHeight*.85;
 c.el.style.opacity=galleryAlpha;c.el.style.zIndex=100+Math.round(Math.cos(angle)*50);
 c.el.style.transform=`translate(-50%,-50%) translate3d(${x+pointer.x*8}px,${y+pointer.y*5+(mobile?-innerHeight*.1:0)}px,${z+c.lift*(mobile?24:52)}px) rotateY(${tilt}deg) rotateZ(${Math.sin(angle)*2}deg)`;
 c.el.style.pointerEvents=galleryAlpha>.7?'auto':'none';
 });

 const active=galleryAlpha>.5&&!modalOpen?selected:-1;
 if(lastVideo!==active){cards.forEach((card,i)=>{if(card.video){if(i===active&&!reduced){card.video.play().then(()=>card.el.classList.add('playing')).catch(()=>{});card.playing=true;}else{card.video.pause();card.el.classList.remove('playing');card.playing=false;}}});lastVideo=active;}
 pointerField.update(time*.001);if(world)world.render(scroll,time*.001,pointer,$('#contact-panel').open,{position,alpha:galleryAlpha,entry:galleryEntry,exit:galleryExit,modalOpen});if(mist&&!modalOpen)mist.render(scroll,time*.001);
}
async function init(){try{all=await (await fetch('assets/projects.json')).json();STEP=(GALLERY_LAST-WORK)/Math.max(1,all.length-1);shop=createShop(all);renderShortcuts();renderCards();world=await createWorld($('#scene'),reduced,pointerField);document.body.classList.add('scene-ready');if(targetScroll>2.8)prepareGallery();mist=createMist($('#mist'),pointerField,reduced)}catch(e){console.error(e);$('#fallback').hidden=false;$('#loading-status').textContent='ENTERING IN COMPATIBILITY MODE'}finally{$('#loading').classList.add('done');setTimeout(()=>$('#loading').remove(),1200);requestAnimationFrame(frame)}}init();
