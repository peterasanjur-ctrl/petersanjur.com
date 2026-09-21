/* The opening supports either the curated stills or a future local reel. */
(() => {
  const hero=document.querySelector('.montage-hero');
  const panels=[...hero.querySelectorAll('.montage-panel')];
  const reel=document.querySelector('#hero-reel');
  const count=document.querySelector('#montage-count');
  const pause=document.querySelector('#montage-pause');
  const previous=document.querySelector('#montage-prev');
  const next=document.querySelector('#montage-next');
  let collection=0,timer,visible=true,request=0,usingVideo=false;
  function canPlay(){return motionEnabled&&visible&&!document.hidden&&!dialog.open&&!panels.some(panel=>panel.contains(document.activeElement));}
  function schedule(){
    clearTimeout(timer);
    pause.textContent=motionEnabled?'Pause motion':'Play motion';
    pause.setAttribute('aria-pressed',String(!motionEnabled));
    if(usingVideo){if(canPlay())reel.play().catch(()=>{});else reel.pause();}
    else if(canPlay())timer=setTimeout(()=>show(collection+1),heroSettings.interval);
  }
  async function show(index){
    const token=++request;
    const target=(index+heroSettings.collections.length)%heroSettings.collections.length;
    const keys=heroSettings.collections[target];
    const images=await Promise.all(keys.map(async key=>{
      const img=new Image();img.src=heroSettings.images[key]||projects[key].cover.src;
      img.alt=`${projects[key].title} — ${projects[key].client||projects[key].category}`;
      try{await img.decode();return img;}catch{return null;}
    }));
    if(token!==request)return;
    if(images.some(img=>!img)){schedule();return;}
    panels.forEach((panel,i)=>{
      const old=[...panel.querySelectorAll('img')];
      old.forEach(image=>image.setAttribute('aria-hidden','true'));
      panel.setAttribute('aria-label',`View ${projects[keys[i]].title}`);
      const img=images[i];img.className='montage-image-in';img.style.animationDelay=`${i*90}ms`;
      panel.append(img);panel.href=`#project/${keys[i]}`;panel.dataset.project=keys[i];
      panel.querySelector('span').textContent=`${projects[keys[i]].title} ↗`;
      setTimeout(()=>old.forEach(image=>image.remove()),1100);
    });
    collection=target;count.textContent=`${String(collection+1).padStart(2,'0')} / ${String(heroSettings.collections.length).padStart(2,'0')}`;
    schedule();
  }
  previous.addEventListener('click',()=>show(collection-1));
  next.addEventListener('click',()=>show(collection+1));
  pause.addEventListener('click',()=>document.querySelector('#motion-toggle').click());
  hero.addEventListener('focusin',schedule);
  hero.addEventListener('focusout',()=>requestAnimationFrame(schedule));
  document.addEventListener('portfolio-motion-change',schedule);
  document.addEventListener('visibilitychange',schedule);
  window.addEventListener('hashchange',schedule);
  dialog.addEventListener('close',schedule);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.1}).observe(hero);
  if(heroSettings.videoSrc){
    reel.poster=heroSettings.videoPoster;
    reel.addEventListener('loadeddata',()=>{
      usingVideo=true;reel.hidden=false;hero.classList.add('has-reel');
      hero.querySelector('.hero-montage').inert=true;
      previous.hidden=true;next.hidden=true;count.textContent='Selected work';schedule();
    },{once:true});
    reel.addEventListener('error',()=>{
      usingVideo=false;reel.hidden=true;hero.classList.remove('has-reel');
      hero.querySelector('.hero-montage').inert=false;
      previous.hidden=false;next.hidden=false;count.textContent=`${String(collection+1).padStart(2,'0')} / 03`;schedule();
    });
    reel.preload='auto';reel.src=heroSettings.videoSrc;
  }
  schedule();
})();
