const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let playing=!reduced.matches;
const video=document.querySelector('#hero-video');
const motion=document.querySelector('#studio-motion');
const viewer=document.querySelector('#space-viewer');
let videoVisible=true,photoTrigger;
function applyMotion(){
  document.documentElement.classList.toggle('studio-motion-off',!playing);
  document.documentElement.classList.toggle('studio-motion-on',playing);
  motion.textContent=playing?'Pause motion':'Play motion';
  motion.setAttribute('aria-pressed',String(!playing));
  if(playing&&videoVisible&&!document.hidden&&!viewer.open)video.play().catch(()=>{});else video.pause();
  if(!playing)document.querySelectorAll('.is-pending').forEach(el=>el.classList.remove('is-pending'));
}
new IntersectionObserver(entries=>{videoVisible=entries[0].isIntersecting;applyMotion();},{threshold:.05}).observe(video);
motion.addEventListener('click',()=>{playing=!playing;applyMotion();});
reduced.addEventListener('change',()=>{playing=!reduced.matches;applyMotion();});
document.addEventListener('visibilitychange',applyMotion);
document.querySelectorAll('.space-photo').forEach(button=>button.addEventListener('click',()=>{
  photoTrigger=button;
  const image=button.querySelector('img');
  viewer.querySelector('img').src=image.src;viewer.querySelector('img').alt=image.alt;
  viewer.querySelector('p').textContent=image.alt;
  viewer.showModal();document.body.classList.add('photo-open');applyMotion();
}));
function closePhoto(){viewer.close();document.body.classList.remove('photo-open');photoTrigger?.focus({preventScroll:true});applyMotion();}
viewer.querySelector('button').addEventListener('click',closePhoto);
viewer.addEventListener('cancel',event=>{event.preventDefault();closePhoto();});
applyMotion();
