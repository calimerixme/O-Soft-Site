import {createWorld} from './world.js';
import {createShop} from './shop.js';
import {JOURNEY_END} from './journey.js';
import {createPointerField,createMist} from './interaction.js';
const $=s=>document.querySelector(s),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const WORK=5.3,STEP=6.4,END=19.1;
$('#journey').style.height=((JOURNEY_END+1)*100)+'vh';
let all=[],filtered=[],cards=[],selected=0,scroll=scrollY/innerHeight,targetScroll=scroll,searchQuery='',world;
const pointer={x:0,y:0};
const pointerField=createPointerField();let mist;
let shop;
function seek(s){window.scrollTo({top:s*innerHeight,behavior:reduced?'instant':'smooth'})}
function media(p,controls=false){if(p.video){const v=document.createElement('video');v.src=p.video;v.poster=p.image;v.muted=!controls;v.loop=!controls;v.controls=controls;v.playsInline=true;v.preload=controls?'auto':'metadata';return v}const image=new Image();image.src=p.image;image.alt=p.name;return image}
function openProject(p){const element=media(p,true);$('#project-media').replaceChildren(element);$('#project-client').textContent=p.client+' / '+p.tags;$('#project-title').textContent=p.name;$('#project-copy').textContent=p.description;shop.selectProduct(p);openDialog($('#project-panel'));if(element.tagName==='VIDEO')element.play().catch(()=>{})}
function renderCards(){
 lastVideo=-2;
 for(const c of cards)c.video?.pause();
 filtered=all;
 $('#floating-gallery').replaceChildren();cards=[];
 filtered.forEach((p,i)=>{const button=document.createElement('button');button.className='project-screen';button.setAttribute('aria-label','Ouvrir '+p.name);const image=new Image();image.src=p.image;image.alt='';image.loading='eager';button.append(image);const video=p.video?media(p):null;if(video)button.append(video);
  const glass=document.createElement('span');glass.className='glass-surface';glass.setAttribute('aria-hidden','true');button.append(glass);const title=document.createElement('span');title.className='screen-title';const client=document.createElement('small');client.textContent=p.client;const name=document.createElement('span');const words=p.name.split(' ');name.textContent=p.slug==='discover-your-patronus'?'DISCOVER\nYOUR\nPATRONUS':words.length>2?words.slice(0,Math.ceil(words.length/2)).join(' ')+'\n'+words.slice(Math.ceil(words.length/2)).join(' '):words.join('\n');const number=document.createElement('small');number.className='screen-number';number.textContent='EXPLORE PROJECT ↗';title.append(client,name,number);button.append(title);button.onclick=()=>{const index=clamp((scroll-WORK)/STEP,0,filtered.length-1);Math.abs(i-index)<.5?openProject(p):seek(WORK+i*STEP)};$('#floating-gallery').append(button);const card={el:button,video,playing:false,p,hovered:false,lift:0};button.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')card.hovered=true});button.addEventListener('pointerleave',()=>card.hovered=false);button.addEventListener('focus',()=>card.hovered=true);button.addEventListener('blur',()=>card.hovered=false);cards.push(card);
 });
 $('#search-status').textContent=filtered.length?'':'NO MATCHING PROJECTS. TRY ANOTHER SEARCH.'; $('#next-project').disabled=!filtered.length; $('#previous-project').disabled=!filtered.length;
 if(!filtered.length)$('#project-index').textContent='00 / 00';
}
function renderShortcuts(){
 $('#filter-buttons').replaceChildren();
 all.forEach((p,i)=>{const b=document.createElement('button');b.textContent='\u2192 '+p.name;b.dataset.product=p.slug;b.onclick=()=>seek(WORK+i*STEP);$('#filter-buttons').append(b)});
 const cart=document.createElement('button');cart.textContent='\u2192 Voir le panier';cart.className='cart-shortcut';cart.onclick=()=>shop.open();$('#filter-buttons').append(cart);
}
$('#search').onsubmit=e=>{e.preventDefault();const q=$('#query').value.trim().toLocaleLowerCase('fr');const index=all.findIndex(p=>p.name.toLocaleLowerCase('fr').includes(q));if(index>=0){$('#search-status').textContent='';seek(WORK+index*STEP)}else $('#search-status').textContent='Aucun logiciel trouvé.'};
$('#work').onclick=()=>{closeDialog($('#contact-panel'));seek(WORK)};$('.home').onclick=()=>seek(0);$('#back-start').onclick=()=>seek(0);
$('#next-project').onclick=()=>seek(WORK+Math.min(filtered.length-1,selected+1)*STEP);$('#previous-project').onclick=()=>seek(WORK+Math.max(0,selected-1)*STEP);
function openDialog(d){d.showModal();document.body.classList.add('modal-open')}
function closeDialog(d){if(d.open)d.close()}
function syncModal(){document.body.classList.toggle('modal-open',!!document.querySelector('dialog[open]'));$('#contact').setAttribute('aria-expanded',$('#contact-panel').open)}
for(const d of document.querySelectorAll('dialog'))d.addEventListener('close',()=>{syncModal();d.querySelectorAll('video').forEach(v=>v.pause())});
$('#contact').onclick=()=>{$('#contact-panel').open?closeDialog($('#contact-panel')):openDialog($('#contact-panel'));syncModal();drawGlobe()};$('#get-in-touch').onclick=()=>{openDialog($('#contact-panel'));syncModal();drawGlobe()};$('#close-contact').onclick=()=>closeDialog($('#contact-panel'));$('#close-project').onclick=()=>closeDialog($('#project-panel'));
$('#reel').onclick=()=>{openDialog($('#reel-panel'));$('#reel-video').play().catch(()=>{})};$('#close-reel').onclick=()=>closeDialog($('#reel-panel'));
function drawGlobe(){const canvas=$('#globe'),dpr=Math.min(devicePixelRatio,2),w=innerWidth,h=innerHeight;canvas.width=w*dpr;canvas.height=h*dpr;const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);const rx=w*.4,ry=h*.39,cx=w*.5,cy=h*.5;ctx.strokeStyle='#8ab5c41a';ctx.lineWidth=.8;for(let i=-3;i<=3;i++){const lat=i*Math.PI/8;const y=cy+Math.sin(lat)*ry,r=Math.cos(lat)*rx;ctx.beginPath();ctx.ellipse(cx,y,r,Math.max(2,Math.cos(lat)*ry*.095),0,0,Math.PI*2);ctx.stroke()}for(let i=0;i<9;i++){ctx.beginPath();ctx.ellipse(cx,cy,Math.max(1,Math.abs(Math.cos(i*Math.PI/9))*rx),ry,0,0,Math.PI*2);ctx.stroke()}}
let audioCtx,gain,oscillators=[],track=0;
const tracks=[{name:'QUANTUM WORLD',base:55},{name:'DUSK',base:65.41},{name:'FLOATING LIGHT',base:49}];
async function toggleAudio(){if(!audioCtx){audioCtx=new AudioContext();gain=audioCtx.createGain();gain.gain.value=0;gain.connect(audioCtx.destination);[1,1.5,2,3].forEach((f,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.value=tracks[track].base*f;g.gain.value=.04/(i+1);o.connect(g).connect(gain);o.start();oscillators.push(o)})}await audioCtx.resume();const on=$('#audio').getAttribute('aria-pressed')!=='true';gain.gain.setTargetAtTime(on?.7:0,audioCtx.currentTime,.6);$('#audio').setAttribute('aria-pressed',on);$('#audio').setAttribute('aria-label',on?'Couper le son':'Activer le son')}
function changeTrack(delta){track=(track+delta+tracks.length)%tracks.length;$('#track-label').textContent='0'+(track+1)+'. '+tracks[track].name;oscillators.forEach((o,i)=>o.frequency.setTargetAtTime(tracks[track].base*[1,1.5,2,3][i],audioCtx.currentTime,.7))}
$('#audio').onclick=toggleAudio;$('#next-track').onclick=()=>changeTrack(1);$('#previous-track').onclick=()=>changeTrack(-1);
function updateScroll(){targetScroll=clamp(scrollY/innerHeight,0,JOURNEY_END)}addEventListener('scroll',updateScroll,{passive:true});addEventListener('pointermove',e=>{pointer.x=e.clientX/innerWidth-.5;pointer.y=e.clientY/innerHeight-.5},{passive:true});addEventListener('resize',()=>{updateScroll();if($('#contact-panel').open)drawGlobe()});
addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA/.test(document.activeElement.tagName))return;if(scroll>=WORK-.5&&scroll<END){if(e.key==='ArrowRight')$('#next-project').click();if(e.key==='ArrowLeft')$('#previous-project').click()}});
let lastVideo=-1,lastTime=0;
function frame(time){requestAnimationFrame(frame);if(document.hidden)return;if(reduced&&time-lastTime<100)return;const dt=Math.min(.05,Math.max(.001,(time-lastTime)*.001));lastTime=time;const follow=1-Math.exp(-dt/.14);scroll=clamp(reduced?targetScroll:scroll+(targetScroll-scroll)*follow,0,JOURNEY_END);if(Math.abs(targetScroll-scroll)<.0001)scroll=targetScroll;
 const inWork=scroll>WORK-.35&&scroll<END;document.body.classList.toggle('in-work',inWork);document.body.classList.toggle('after-intro',scroll>1.2);
 $('.scroll-cue').style.opacity=1-smooth(.1,.65,scroll);
 const intro=smooth(1.55,2.05,scroll)*(1-smooth(4.1,4.95,scroll));const aboutProgress=clamp((scroll-1.7)/2.5);const edge=1.1-smooth(1.6,4.05,scroll)*1.3;$('#intro-text').style.opacity=intro;$('#intro-text').style.visibility=intro>.01?'visible':'hidden';$('#intro-text').style.transform='none';$('#intro-text').style.setProperty('--about-progress',aboutProgress);$('#intro-text').style.clipPath=`polygon(0 ${clamp(edge+.12)*100}%,100% ${clamp(edge-.12)*100}%,100% 100%,0 100%)`;
 const reel=smooth(1.7,2.5,scroll)-smooth(3.3,4.2,scroll);$('#reel').style.opacity=reel;$('#reel').style.pointerEvents=reel>.5?'auto':'none';
 const end=smooth(END,20,scroll);$('#end-message').style.opacity=end;$('#end-message').style.visibility=end>.01?'visible':'hidden';
 const galleryAlpha=smooth(4.85,5.3,scroll)*(1-smooth(18.6,19.3,scroll));$('#floating-gallery').style.visibility=galleryAlpha>.01?'visible':'hidden';
 const position=clamp((scroll-WORK)/STEP,0,Math.max(0,cards.length-1));selected=Math.round(position);document.querySelectorAll('[data-product]').forEach((b,i)=>{b.classList.toggle('active',i===selected);if(i===selected)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current')});if(cards.length)$('#project-index').textContent=String(selected+1).padStart(2,'0')+' / '+String(cards.length).padStart(2,'0');
 const mobile=innerWidth<760;
 cards.forEach((c,i)=>{const d=i-position,visible=Math.abs(d)<2.9&&galleryAlpha>.01;c.el.style.visibility=visible?'visible':'hidden';c.el.tabIndex=visible&&Math.abs(d)<.4?0:-1;if(!visible){c.hovered=false;c.lift=0;return;}c.lift+=((c.hovered?1:0)-c.lift)*(reduced?1:1-Math.exp(-dt/.14));
 // Each screen follows a vertical helix: future screens below, past screens above.
 const angle=d*.98,arc=mobile?innerWidth*.58:Math.min(innerWidth*.48,760);let x=Math.sin(angle)*arc,y=d*innerHeight*(mobile?.48:.54),z=(Math.cos(angle)-1)*(mobile?520:820);const tilt=-angle*180/Math.PI-5;c.el.style.setProperty('--glass-x',`${48+Math.sin(angle)*20+pointer.x*9}%`);c.el.style.setProperty('--glass-angle',`${115+Math.sin(angle)*25}deg`);c.el.style.setProperty('--glass-grain-offset',`${i*21}%`);y+=(1-galleryAlpha)*innerHeight*.45;
 c.el.style.opacity=galleryAlpha*(1-clamp((Math.abs(d)-1.8)/1.2));c.el.style.zIndex=10-Math.round(Math.abs(d)*2);c.el.style.transform=`translate(-50%,-50%) translate3d(${x+pointer.x*12}px,${y+pointer.y*7+(mobile?-innerHeight*.1:0)}px,${z+c.lift*(mobile?24:52)}px) rotateY(${tilt}deg) rotateZ(${Math.sin(d)*2.5+(!reduced?Math.sin(time*.0002+i)*.5:0)}deg)`;c.el.style.pointerEvents=galleryAlpha>.7?'auto':'none';
 });
 const active=galleryAlpha>.5&&!document.querySelector('dialog[open]')?selected:-1;if(lastVideo!==active){cards.forEach((c,i)=>{if(c.video){if(i===active&&!reduced){c.video.play().then(()=>c.el.classList.add('playing')).catch(()=>{});c.playing=true}else{c.video.pause();c.el.classList.remove('playing');c.playing=false}}});lastVideo=active}
 pointerField.update(time*.001);if(world)world.render(scroll,time*.001,pointer,$('#contact-panel').open);if(mist)mist.render(scroll,time*.001);
}
async function init(){try{all=await (await fetch('assets/projects.json')).json();shop=createShop(all);renderShortcuts();renderCards();world=await createWorld($('#scene'),reduced,pointerField);mist=createMist($('#mist'),pointerField,reduced)}catch(e){console.error(e);$('#fallback').hidden=false;$('#loading-status').textContent='ENTERING IN COMPATIBILITY MODE'}finally{$('#loading').classList.add('done');setTimeout(()=>$('#loading').remove(),1200);requestAnimationFrame(frame)}}init();
