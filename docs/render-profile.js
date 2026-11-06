// Decide once per page load, including larger touch devices.
const mobile=innerWidth<760||matchMedia('(pointer: coarse)').matches;
export const renderProfile=Object.freeze({
 mobile,pixelRatio:mobile?1:1.25,
 activeFPS:mobile?30:60,idleFPS:mobile?30:60,modalFPS:5,
 bloom:!mobile,mist:!mobile,autoplayIntro:!mobile,
 particleCount:mobile?480:9000,
 reflectionSize:mobile?256:1024,reflectionFPS:mobile?8:20,
 previewScale:mobile?.6:1,previewFPS:mobile?15:24
});
