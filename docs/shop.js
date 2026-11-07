export function createShop(products){
 const $=s=>document.querySelector(s),key='osoft-cart-v1';
 let items=[];try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))items=[...new Set(saved)].filter(id=>products.some(p=>p.slug===id));}catch{}
 let current;
 const panel=$('#cart-panel');
 function save(){try{localStorage.setItem(key,JSON.stringify(items))}catch{}render();}
 function syncProduct(){
  if(!current)return;const added=items.includes(current.slug);
  $('#add-to-cart').disabled=added;
  $('#add-to-cart').textContent=added?'Dans votre panier':'Ajouter au panier';
  $('#product-cart-status').textContent=added?'Ce logiciel est dans votre panier.':'';
 }
 function render(){
  $('#cart-count').textContent=items.length;
  $('#cart-open').setAttribute('aria-label',`Voir le panier, ${items.length} article${items.length>1?'s':''}`);
  $('#cart-items').replaceChildren();
  if(!items.length){const empty=document.createElement('p');empty.className='cart-empty';empty.textContent='Votre panier est vide. Découvrez nos logiciels et ajoutez ceux qui vous intéressent.';$('#cart-items').append(empty);}
  for(const id of items){const p=products.find(p=>p.slug===id),row=document.createElement('div');row.className='cart-row';const info=document.createElement('div'),name=document.createElement('h3'),price=document.createElement('p'),remove=document.createElement('button');name.textContent=p.name;price.textContent='Tarif à définir';info.append(name,price);remove.textContent='Retirer';remove.setAttribute('aria-label','Retirer '+p.name);remove.onclick=()=>{items=items.filter(x=>x!==id);$('#checkout-status').textContent='';save()};row.append(info,remove);$('#cart-items').append(row);}
  $('#cart-summary').textContent=items.length?`${items.length} logiciel${items.length>1?'s':''} · Les tarifs seront communiqués prochainement.`:'';
  $('#checkout').disabled=!items.length;syncProduct();
 }
 function open(payment=false){
  const active=document.querySelector('dialog[open]');if(active&&active!==panel)active.close();
  $('#checkout-status').textContent=payment?(items.length?'Le paiement sera disponible lorsque les tarifs et le service de paiement seront configurés.':'Ajoutez un logiciel à votre panier pour continuer.'):'';
  render();if(!panel.open)panel.showModal();document.body.classList.add('modal-open');
 }
 $('#cart-open').onclick=()=>open();$('#pay-open').onclick=()=>open(true);
 $('#close-cart').onclick=()=>panel.close();
 $('#checkout').onclick=()=>{$('#checkout-status').textContent='Le paiement sera disponible lorsque les tarifs et le service de paiement seront configurés.';};
 $('#add-to-cart').onclick=()=>{if(current&&!items.includes(current.slug)){items.push(current.slug);save()}};
 addEventListener('storage',e=>{if(e.key===key){try{const saved=JSON.parse(e.newValue||'[]');items=Array.isArray(saved)?[...new Set(saved)].filter(id=>products.some(p=>p.slug===id)):[];}catch{items=[]}render();}});
 render();return {open,selectProduct(p){current=p;syncProduct();}};
}
