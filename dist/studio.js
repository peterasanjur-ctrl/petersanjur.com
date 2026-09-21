const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let playing=!reduced.matches;
const motion=document.querySelector('#studio-motion');
const viewer=document.querySelector('#space-viewer');
const heroMedia=document.querySelector('.hero-media');
const clips=[document.querySelector('#hero-video'),document.querySelector('.stack-card video')];
const visibleClips=new Set();
let photoTrigger;

// Clips play only while motion is on, they're onscreen, and no photo is enlarged.
function applyMotion(){
  document.documentElement.classList.toggle('studio-motion-off',!playing);
  document.documentElement.classList.toggle('studio-motion-on',playing);
  motion.textContent=playing?'Pause motion':'Play motion';
  motion.setAttribute('aria-pressed',String(!playing));
  clips.forEach(clip=>{
    const shown=visibleClips.has(clip)&&!clip.closest('details:not([open])');
    if(playing&&shown&&!document.hidden&&!viewer.open)clip.play().catch(()=>{});else clip.pause();
  });
  if(!playing)heroMedia.classList.add('is-clear');
}
const clipObserver=new IntersectionObserver(entries=>{
  entries.forEach(({target,isIntersecting})=>isIntersecting?visibleClips.add(target):visibleClips.delete(target));
  applyMotion();
},{threshold:.05});
clips.forEach(clip=>clipObserver.observe(clip));
motion.addEventListener('click',()=>{playing=!playing;applyMotion();});
reduced.addEventListener('change',()=>{playing=!reduced.matches;applyMotion();});
document.addEventListener('visibilitychange',applyMotion);
document.querySelector('.stack-card').addEventListener('toggle',applyMotion);

// The hero opens as a dot screen, then clears once the walkthrough is ready.
function clearHero(){setTimeout(()=>heroMedia.classList.add('is-clear'),700);}
if(clips[0].readyState>=2)clearHero();
else{clips[0].addEventListener('loadeddata',clearHero,{once:true});setTimeout(clearHero,2500);}

// Like the portfolio, the top bar turns solid once the hero has scrolled past.
// The loft card folds away at the same point, unless the visitor has set it.
const header=document.querySelector('.site-header');
const hero=document.querySelector('.studio-hero');
const loftCard=document.querySelector('.stack-card');
let loftCardSet=false;
loftCard.querySelector('summary').addEventListener('click',()=>{loftCardSet=true;});
function syncHeader(){
  const past=hero.getBoundingClientRect().bottom<75;
  header.classList.toggle('is-solid',past);
  if(!loftCardSet&&loftCard.open===past)loftCard.open=!past;
}
addEventListener('scroll',syncHeader,{passive:true});
addEventListener('resize',syncHeader,{passive:true});
syncHeader();

// Local time at the studio.
const clockFormat=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
const clocks=[...document.querySelectorAll('.studio-clock b')];
function tickClock(){const time=clockFormat.format(new Date()).replace(/:/g,' : ');clocks.forEach(clock=>clock.textContent=time);}
tickClock();
setInterval(tickClock,1000);

// Photo viewer
document.querySelectorAll('.space-photo').forEach(button=>{
  const image=button.querySelector('img');
  button.setAttribute('aria-label',`Enlarge: ${image.alt}`);
  button.addEventListener('click',()=>{
    photoTrigger=button;
    viewer.querySelector('img').src=image.src;viewer.querySelector('img').alt=image.alt;
    viewer.querySelector('p').textContent=image.alt;
    viewer.showModal();document.body.classList.add('photo-open');applyMotion();
  });
});
function closePhoto(){viewer.close();document.body.classList.remove('photo-open');photoTrigger?.focus({preventScroll:true});applyMotion();}
viewer.querySelector('.photo-close').addEventListener('click',closePhoto);
viewer.addEventListener('cancel',event=>{event.preventDefault();closePhoto();});
applyMotion();
