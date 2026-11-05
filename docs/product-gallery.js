export function createProductGallery(container){
 const region=document.createElement('section');region.className='product-gallery';region.setAttribute('aria-label','Images du logiciel');region.setAttribute('aria-roledescription','carrousel');
 const stage=document.createElement('div');stage.className='product-gallery-stage';
 const image=new Image();image.draggable=false;image.decoding='async';stage.append(image);
 const previous=document.createElement('button'),next=document.createElement('button');
 previous.type=next.type='button';previous.textContent='←';next.textContent='→';
 previous.className='photo-previous';next.className='photo-next';
 previous.setAttribute('aria-label','Image précédente');next.setAttribute('aria-label','Image suivante');stage.append(previous,next);
 const footer=document.createElement('div');footer.className='product-gallery-footer';
 const caption=document.createElement('p');caption.setAttribute('aria-live','polite');caption.setAttribute('aria-atomic','true');
 const dots=document.createElement('div');dots.className='photo-dots';dots.setAttribute('aria-label','Choisir une image');footer.append(caption,dots);region.append(stage,footer);container.replaceChildren(region);
 let slides=[],index=0,name='',start=null;
 function show(value){
  index=(value+slides.length)%slides.length;const slide=slides[index];
  image.src=slide.src;image.alt=slide.alt||name;
  caption.textContent=`${index+1} / ${slides.length} · ${slide.caption||slide.alt||name}`;
  previous.hidden=next.hidden=slides.length<2;
  [...dots.children].forEach((button,i)=>{if(i===index)button.setAttribute('aria-current','true');else button.removeAttribute('aria-current');});
 }
 previous.onclick=()=>show(index-1);next.onclick=()=>show(index+1);
 container.closest('dialog').addEventListener('keydown',event=>{
  if(event.altKey||event.ctrlKey||event.metaKey||/INPUT|TEXTAREA/.test(event.target.tagName))return;
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();show(index+(event.key==='ArrowLeft'?-1:1));}
 });
 stage.addEventListener('pointerdown',event=>{if(event.target!==image||event.button!==0)return;start={id:event.pointerId,x:event.clientX,y:event.clientY};image.setPointerCapture(event.pointerId);});
 stage.addEventListener('pointerup',event=>{
  if(!start||event.pointerId!==start.id)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;start=null;
  if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3)show(index+(dx<0?1:-1));
 });
 stage.addEventListener('pointercancel',()=>start=null);
 return {setProduct(product){
  name=product.name;start=null;
  slides=product.screenshots?.length?product.screenshots.map(s=>typeof s==='string'?{src:s,alt:name}:s):[{src:product.image,alt:`${name} — visuel provisoire`,caption:'Visuel provisoire'},{src:'assets/gallery-detail.svg',alt:'Emplacement pour une capture détaillée du logiciel',caption:'Vue détaillée — capture à ajouter'},{src:'assets/gallery-features.svg',alt:'Emplacement pour une capture des fonctionnalités du logiciel',caption:'Fonctionnalités — capture à ajouter'}];
  dots.replaceChildren(...slides.map((slide,i)=>{const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Afficher l’image ${i+1}`);button.onclick=()=>show(i);return button;}));show(0);
 }};
}
