import {DRACOLoader} from './vendor/addons/loaders/DRACOLoader.js';
// The public reference meshes carry a small JSON header before a Draco stream.
// Only geometry is reused; rendering, interaction and the journey are implemented here.
export async function referenceGeometry(name){
 const response=await fetch('assets/'+name+'.bin');if(!response.ok)throw Error('Geometry unavailable: '+name);
 const bytes=new Uint8Array(await response.arrayBuffer());let offset=-1;
 for(let i=0;i<Math.min(256,bytes.length-5);i++)if(bytes[i]===68&&bytes[i+1]===82&&bytes[i+2]===65&&bytes[i+3]===67&&bytes[i+4]===79){offset=i;break}
 if(offset<0)throw Error('Reference mesh has no Draco stream');
 const decoder=new DRACOLoader();decoder.setDecoderPath('vendor/draco/');decoder.setWorkerLimit(1);
 try {return await new Promise((resolve,reject)=>decoder.parse(bytes.slice(offset).buffer,resolve,reject))}finally{decoder.dispose()}
}
