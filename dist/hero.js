/* The opening supports either the curated stills or a future local reel. */
(() => {
  const hero=document.querySelector('.montage-hero');
  const panels=[...hero.querySelectorAll('.montage-panel')];
  const reel=document.querySelector('#hero-reel');
  const count=document.querySelector('#montage-count');
  const pause=document.querySelector('#montage-pause');
  const previous=document.querySelector('#montage-prev');
  const next=document.querySelector('#montage-next');
  let collection=0,timer,visible=true,request=0,usingVideo=false,currentClip=null;
  const total=heroSettings.collections.length;
  const label=index=>`${String(index+1).padStart(2,'0')} / ${String(total).padStart(2,'0')}`;
  function canAnimate(){return motionEnabled&&opening.hidden&&visible&&!document.hidden&&!dialog.open;}
  function canPlay(){return canAnimate()&&!panels.some(panel=>panel.contains(document.activeElement));}
  function schedule(){
    clearTimeout(timer);
    pause.textContent=motionEnabled?'Pause motion':'Play motion';
    pause.setAttribute('aria-pressed',String(!motionEnabled));
    hero.querySelectorAll('.montage-panel video').forEach(clip=>{if(canAnimate()&&!usingVideo)clip.play().catch(()=>{});else clip.pause();});
    if(usingVideo){if(canPlay())reel.play().catch(()=>{});else reel.pause();}
    else if(canPlay()){
      // A slide with a clip stays up until the clip has played through.
      const remaining=currentClip?(currentClip.duration-currentClip.currentTime)*1000:0;
      timer=setTimeout(()=>show(collection+1),Math.max(heroSettings.interval,remaining||0));
    }
  }
  function loadImage(src){
    const img=new Image();img.src=src;
    return img.decode().then(()=>img,()=>null);
  }
  // Clips are decorative loops; the panel link names the project.
  function loadClip({src,poster}){
    return new Promise(resolve=>{
      const clip=document.createElement('video');
      clip.muted=true;clip.defaultMuted=true;clip.loop=true;clip.playsInline=true;clip.preload='auto';clip.poster=poster;
      clip.setAttribute('aria-hidden','true');
      const settle=ok=>{clearTimeout(wait);if(!ok)clip.removeAttribute('src');resolve(ok?clip:null);};
      const wait=setTimeout(()=>settle(false),6000);
      clip.addEventListener('loadeddata',()=>settle(true),{once:true});
      clip.addEventListener('error',()=>settle(false),{once:true});
      clip.src=src;
    }).then(clip=>clip||loadImage(poster));
  }
  async function show(index){
    const token=++request;
    const target=(index+total)%total;
    const keys=heroSettings.collections[target];
    const media=await Promise.all(keys.map(key=>{
      const clip=heroSettings.videos?.[key];
      return clip?loadClip(clip):loadImage(heroSettings.images[key]||projects[key].cover.src);
    }));
    if(token!==request)return;
    if(media.some(item=>!item)){schedule();return;}
    panels.forEach((panel,i)=>{
      const project=projects[keys[i]];
      const old=[...panel.querySelectorAll('img,video')];
      old.forEach(item=>item.setAttribute('aria-hidden','true'));
      panel.setAttribute('aria-label',`View ${project.title}`);
      const item=media[i];
      if(item.tagName==='IMG')item.alt=`${project.title} — ${project.client||project.category}`;
      item.className='montage-image-in';item.style.animationDelay=`${i*90}ms`;item.style.objectPosition=heroSettings.positions?.[keys[i]]||'';
      panel.append(item);panel.href=`portfolio/${project.slug}/`;panel.dataset.project=keys[i];
      panel.querySelector('span').textContent=`${project.title} ↗︎`;
      setTimeout(()=>old.forEach(item=>item.remove()),1100);
    });
    collection=target;count.textContent=label(collection);
    currentClip=media.find(item=>item.tagName==='VIDEO')||null;
    schedule();
  }
  previous.addEventListener('click',()=>show(collection-1));
  next.addEventListener('click',()=>show(collection+1));
  pause.addEventListener('click',()=>document.querySelector('#motion-toggle').click());
  hero.addEventListener('focusin',schedule);
  hero.addEventListener('focusout',()=>requestAnimationFrame(schedule));
  document.addEventListener('portfolio-motion-change',schedule);
  document.addEventListener('portfolio-intro-change',schedule);
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
      previous.hidden=false;next.hidden=false;count.textContent=label(collection);schedule();
    });
    reel.preload='auto';reel.src=heroSettings.videoSrc;
  }
  count.textContent=label(collection);
  schedule();
})();
