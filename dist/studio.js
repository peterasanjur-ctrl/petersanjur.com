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

// Booking request: half-hour slots, a live hours count, and a 2 hour minimum.
const booking=document.querySelector('#booking-form');
if(booking){
  if(booking.elements._t)booking.elements._t.value=Date.now();
  const {booking_date:day,start_time:start,end_time:end}=booking.elements;
  const hoursNote=booking.querySelector('#booking-hours');
  const status=booking.querySelector('#booking-status');
  const label=m=>`${(Math.floor(m/60)+11)%12+1}:${String(m%60).padStart(2,'0')} ${m<720?'AM':'PM'}`;
  const value=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
  for(let m=7*60;m<=23*60;m+=30){start.add(new Option(label(m),value(m)));end.add(new Option(label(m),value(m)));}
  start.value='10:00';end.value='14:00';
  const minutes=t=>{const [h,m]=t.split(':').map(Number);return h*60+m;};
  const today=new Date();today.setMinutes(today.getMinutes()-today.getTimezoneOffset());
  day.min=today.toISOString().slice(0,10);
  day.addEventListener('click',()=>{try{day.showPicker();}catch{}});
  function syncHours(){
    if(minutes(end.value)<=minutes(start.value)){const next=[...end.options].find(o=>minutes(o.value)>=minutes(start.value)+120);if(next)end.value=next.value;}
    const hours=(minutes(end.value)-minutes(start.value))/60;
    hoursNote.textContent=hours<2?`${hours} hr — 2 hour minimum`:`${hours} hours`;
    hoursNote.classList.toggle('is-short',hours<2);
    const total=Math.max(hours,0)*125;
    booking.querySelector('#booking-math').textContent=`${Math.max(hours,0)} hrs × $125 / hr`+(hours<2?' — 2 hr minimum':'');
    booking.querySelector('#booking-total').textContent=`$${total.toLocaleString('en-US',{minimumFractionDigits:total%1?2:0})}`;
    return hours;
  }
  start.addEventListener('change',syncHours);end.addEventListener('change',syncHours);syncHours();
  booking.addEventListener('submit',async event=>{
    event.preventDefault();
    if(syncHours()<2){status.textContent='Bookings are 2 hours minimum.';status.classList.add('is-error');end.focus();return;}
    const button=booking.querySelector('button[type=submit]');
    button.disabled=true;button.textContent='Sending…';status.classList.remove('is-error');status.textContent='Sending your request…';
    try{
      const response=await fetch(booking.action,{method:'POST',body:new URLSearchParams(new FormData(booking)),headers:{Accept:'application/json'}});
      const result=await response.json();
      if(!response.ok||result.ok===false)throw new Error(result.error||'Something went wrong.');
      window.goatcounter?.count?.({path:'studio-booking-request',title:'Studio booking request',event:true});booking.classList.add('is-sent');const sent=booking.querySelector('#booking-sent');sent.hidden=false;sent.focus();
    }catch(error){
      status.textContent=`${error.message} You can also email info@petersanjur.com.`;status.classList.add('is-error');
      button.disabled=false;button.textContent='Request to book';
    }
  });
}
