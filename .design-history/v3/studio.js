const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let playing=!reduced.matches;
const videos=[...document.querySelectorAll('video')];
const motion=document.querySelector('#studio-motion');
let visibleVideos=new Set();
function applyMotion(){
  document.documentElement.classList.toggle('studio-motion-off',!playing);
  document.documentElement.classList.toggle('studio-motion-on',playing);
  motion.textContent=playing?'Pause motion':'Play motion';
  motion.setAttribute('aria-pressed',String(!playing));
  videos.forEach(video=>{if(playing&&visibleVideos.has(video)&&!document.hidden)video.play().catch(()=>{});else video.pause();});
  if(!playing)document.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));
  schedule();
}
const videoObserver=new IntersectionObserver(entries=>{entries.forEach(({target,isIntersecting})=>{if(isIntersecting)visibleVideos.add(target);else visibleVideos.delete(target);});applyMotion();},{threshold:.05});
videos.forEach(video=>videoObserver.observe(video));
motion.addEventListener('click',()=>{playing=!playing;applyMotion();});
reduced.addEventListener('change',()=>{playing=!reduced.matches;applyMotion();});
document.addEventListener('visibilitychange',applyMotion);
const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');reveal.unobserve(entry.target);}}),{threshold:.1});
document.querySelectorAll('.reveal').forEach(el=>reveal.observe(el));
const title=document.querySelector('#hero-title-snap');
const strip=document.querySelector('#info-strip');
const space=document.querySelector('#title-space');
const loft=document.querySelector('#loft-era-video');
const stage=document.querySelector('.loft-era-stage');
const tag=document.querySelector('.loft-era-tag');
let scheduled=false;
let stripTop=0,titleHeight=0,threshold=0;
function layout(){titleHeight=title.offsetHeight;space.style.height=(titleHeight+32)+'px';stripTop=strip.getBoundingClientRect().top+scrollY;threshold=innerHeight-(parseFloat(getComputedStyle(title).bottom)||40)-titleHeight;schedule();}
function render(){
  scheduled=false;
  const offset=Math.max(0,threshold-(stripTop-scrollY+64));
  title.style.transform=`translateY(-${offset}px)`;
  const value=Math.round(255*(1-Math.min(1,offset/Math.max(titleHeight,1))));
  title.querySelectorAll('h1,.price-val,.price-min').forEach(el=>el.style.color=`rgb(${value},${value},${value})`);
  const cta=title.querySelector('.snap-cta');cta.style.background=`rgb(${value},${value},${value})`;cta.style.color=`rgb(${255-value},${255-value},${255-value})`;
  const rect=stage.getBoundingClientRect();
  let progress=Math.max(0,Math.min(1,1-((rect.top+rect.height/2)-innerHeight/2)/(innerHeight*.6)));
  progress=progress*progress*(3-2*progress);
  loft.style.transform=playing?`scale(${.3+.7*progress})`:'none';
  loft.style.borderRadius=playing?`${50-44*progress}%`:'6%';
  tag.classList.toggle('is-visible',progress>.9||!playing);
  const note=document.querySelector('.space-frame-note');const n=note.getBoundingClientRect();note.classList.toggle('is-revealed',n.top<innerHeight*.75&&n.bottom>0);
}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(render);}}
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',layout,{passive:true});document.fonts.ready.then(layout);layout();applyMotion();
document.querySelectorAll('.faq-btn').forEach(button=>{
  const answer=document.getElementById(button.dataset.faq);answer.hidden=true;button.setAttribute('aria-controls',answer.id);
  button.addEventListener('click',()=>{const expanded=button.getAttribute('aria-expanded')==='true';button.setAttribute('aria-expanded',String(!expanded));answer.hidden=expanded;});
});
