// Shared helical composition: an open front, then the sides and rear of the tube.
export const GALLERY_ANGLE=60*Math.PI/180;
export function galleryPlacement(distance,width,height,mobile=false){
 const angle=distance*GALLERY_ANGLE,front=mobile?2.45:3.1,span=mobile?3.15:4.45;
 const focus=Math.exp(-distance*distance*3.8);
 const yaw=angle-.12*Math.sin(angle);
 return {x:Math.sin(angle)*span,y:-distance*height*.46,
  z:Math.cos(angle)*front,angle,yaw,scale:.86+.14*focus,focus};
}
