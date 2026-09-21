const dialog = document.querySelector('#project-dialog');
const content = document.querySelector('#project-content');
let projectTrigger;
const projectKeys = Object.keys(projects);
function escapeHTML(value='') {
  return String(value).replace(/[&<>"']/g, character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}
function renderImages(images,title){
  let pairedPortrait=false;
  return images.map((image,index)=>{
    const landscape=image.width>image.height;
    const nextImage=images[index+1];
    let layout=landscape?'gallery-landscape':'';
    if(!landscape){
      if(pairedPortrait)pairedPortrait=false;
      else if(nextImage&&nextImage.width<=nextImage.height)pairedPortrait=true;
      else layout='gallery-solo';
    }
    return `<figure class="gallery-frame ${layout}"><img src="${escapeHTML(image.src)}" width="${image.width}" height="${image.height}" alt="${escapeHTML(title)} — photograph ${index+1} of ${images.length}, by Peter Sanjur" loading="${index<2?'eager':'lazy'}" decoding="async"><figcaption>${String(index+1).padStart(2,'0')} / ${String(images.length).padStart(2,'0')}</figcaption></figure>`;
  }).join('');
}
function renderFilms(films,title,poster){
  return films.map(film=>`<figure class="story-film ${film.width<film.height?'film-portrait':''}"><div class="film-player"><button type="button" class="film-play" data-src="${escapeHTML(film.src)}" aria-label="Play ${escapeHTML(film.title||title)}"><img src="${escapeHTML(film.poster||poster)}" width="${film.width||1920}" height="${film.height||1080}" alt="" loading="lazy"><span aria-hidden="true">▶ &nbsp; Play film</span></button></div><figcaption>${escapeHTML(film.title||title)}</figcaption></figure>`).join('');
}
function renderProject(key) {
  const p=projects[key];
  if(!p)return;
  const next=projectKeys[(projectKeys.indexOf(key)+1)%projectKeys.length];
  const paragraphs=p.description.split(/\n\s*\n/).filter(Boolean).map(text=>`<p>${escapeHTML(text).replace(/\n/g,'<br>')}</p>`).join('');
  const sections=p.campaigns||[];
  const imageCount=p.images.length+sections.reduce((sum,c)=>sum+(c.images||[]).length,0);
  const filmCount=p.films.length+sections.reduce((sum,c)=>sum+(c.films||[]).length,0);
  const mediaSummary=[imageCount?`${imageCount} photographs`:'',filmCount?`${filmCount} film${filmCount===1?'':'s'}`:''].filter(Boolean).join(' + ');
  const credits=(p.credits||[]).map(credit=>`<div><dt>${escapeHTML(credit.role)}</dt><dd>${escapeHTML(credit.name)}</dd></div>`).join('');
  const navigation=sections.length?`<nav class="campaign-nav" aria-label="${escapeHTML(p.title)} campaigns">${sections.map((campaign,i)=>`<button type="button" data-campaign="campaign-${i}">${escapeHTML(campaign.title)} <span aria-hidden="true">↓</span></button>`).join('')}</nav>`:'';
  const campaigns=sections.map((campaign,i)=>{
    const images=renderImages(campaign.images||[],`${p.title} — ${campaign.title}`);
    const films=renderFilms(campaign.films||[],campaign.title,p.cover.src);
    return `<section class="campaign-section" id="campaign-${i}" aria-labelledby="campaign-title-${i}"><div class="campaign-heading"><span class="eyebrow">${String(i+1).padStart(2,'0')} / ${escapeHTML(p.client)}</span><h2 id="campaign-title-${i}" tabindex="-1">${escapeHTML(campaign.title)}</h2>${campaign.description?`<p>${escapeHTML(campaign.description)}</p>`:''}</div>${films?`<div class="campaign-films ${campaign.films.length===1?'single-film':''}">${films}</div>`:''}${images?`<div class="story-gallery">${images}</div>`:''}</section>`;
  }).join('');
  const gallery=renderImages(p.images,p.title);
  content.innerHTML=`<article class="project-story"><div class="story-heading"><span class="eyebrow">${escapeHTML([p.client,p.category].filter(Boolean).join(' / '))}</span><h2 id="project-title">${escapeHTML(p.title)}</h2><div class="story-meta"><span>${escapeHTML([p.location,p.year].filter(Boolean).join(' / '))}</span><span>${mediaSummary}</span></div></div>${paragraphs?`<div class="story-breakdown"><span class="eyebrow">About the project</span><div>${paragraphs}</div></div>`:''}${credits?`<section class="story-credits" aria-label="Project credits"><span class="eyebrow">Credits</span><dl>${credits}</dl></section>`:''}${navigation}${renderFilms(p.films,p.title,p.cover.src)}${gallery?`<div class="story-gallery" aria-label="${escapeHTML(p.title)} photographs">${gallery}</div>`:''}${campaigns}<div class="story-end"><a class="text-link" href="#work">Back to all work ↗</a><a class="next-project" href="#project/${next}"><span class="eyebrow">Next project</span>${escapeHTML(projects[next].title)} ↗</a></div></article>`;
  if(!dialog.open){dialog.showModal();document.body.classList.add('dialog-open');}
  dialog.scrollTop=0;
  document.title=`${p.title} — Peter Sanjur`;
  document.querySelector('.close-dialog').focus({preventScroll:true});
}
content.addEventListener('click',event=>{
  const play=event.target.closest('.film-play');
  if(play){
    stopProjectMedia();
    const poster=play.querySelector('img');
    const video=document.createElement('video');
    video.controls=true;
    video.playsInline=true;
    video.poster=poster.src;
    video.width=poster.width;
    video.height=poster.height;
    video.setAttribute('aria-label',play.getAttribute('aria-label').replace(/^Play /,''));
    video.src=play.dataset.src;
    play.hidden=true;
    play.parentElement.append(video);
    video.focus({preventScroll:true});
    video.play().catch(()=>{/* Native controls remain available if playback needs another gesture. */});
    return;
  }
  const button=event.target.closest('[data-campaign]');
  if(!button)return;
  const section=content.querySelector(`#${button.dataset.campaign}`);
  section?.scrollIntoView({behavior:document.documentElement.classList.contains('motion-off')?'instant':'smooth',block:'start'});
  section?.querySelector('h2').focus({preventScroll:true});
});
content.addEventListener('play',event=>{
  if(event.target.tagName==='VIDEO')content.querySelectorAll('video').forEach(video=>{if(video!==event.target)video.pause();});
},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopProjectMedia();});
function stopProjectMedia(){
  content.querySelectorAll('.film-player video').forEach(video=>{
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.parentElement.querySelector('.film-play').hidden=false;
    video.remove();
  });
}
function syncProject() {
  const key = location.hash.startsWith('#project/') ? location.hash.slice(9) : null;
  stopProjectMedia();
  if (key && Object.hasOwn(projects,key)) renderProject(key);
  else if (dialog.open) { dialog.close(); document.body.classList.remove('dialog-open'); document.title='Peter Sanjur — Photographer & Director'; }
}
document.querySelectorAll('[data-project]').forEach(link => link.addEventListener('click',()=>{projectTrigger=link;}));
function closeProject() {
  history.replaceState(null,'','#work');
  syncProject();
  projectTrigger?.focus({preventScroll:true});
}
document.querySelector('.close-dialog').addEventListener('click',closeProject);
dialog.addEventListener('cancel',event=>{event.preventDefault();closeProject();});
dialog.addEventListener('click',event=>{const link=event.target.closest('a');if(link && !link.hash.startsWith('#project/')) { stopProjectMedia();dialog.close();document.body.classList.remove('dialog-open');document.title='Peter Sanjur — Photographer & Director'; }});
window.addEventListener('hashchange',syncProject);
syncProject();

const form=document.querySelector('#inquiry-form');
let inquiryText='';
if(new URLSearchParams(location.search).get('inquiry')==='studio'){form.elements.type.value='Studio inquiry';form.elements.message.placeholder='Preferred date, duration, crew size, and any equipment you need…';}
form.addEventListener('submit',event=>{
  event.preventDefault();
  const data=new FormData(form);
  inquiryText=`Hi Peter,\n\nI'd love to talk about a project.\n\nName: ${data.get('name').trim()}\nEmail: ${data.get('email').trim()}\nProject: ${data.get('type')}\nTiming: ${data.get('timing').trim()||'Flexible / to discuss'}\n\n${data.get('message').trim()}\n\nThanks,\n${data.get('name').trim()}`;
  document.querySelector('#inquiry-summary').textContent=inquiryText;
  document.querySelector('#email-draft').href=`mailto:info@petersanjur.com?subject=${encodeURIComponent(`Project inquiry — ${data.get('type')}`)}&body=${encodeURIComponent(inquiryText)}`;
  document.querySelector('#inquiry-preview').hidden=false;
  document.querySelector('#draft-status').textContent='Nothing has been sent. Open the draft in your email app, or copy the inquiry and email info@petersanjur.com.';
  document.querySelector('#email-draft').focus({preventScroll:true});
  document.querySelector('#inquiry-preview').scrollIntoView({behavior:motionEnabled?'smooth':'instant',block:'nearest'});
});
form.addEventListener('input',()=>{ document.querySelector('#inquiry-preview').hidden=true; });
document.querySelector('#copy-inquiry').addEventListener('click',async()=>{
  try { await navigator.clipboard.writeText(inquiryText); document.querySelector('#draft-status').textContent='Inquiry copied. Paste it into an email to info@petersanjur.com.'; }
  catch { document.querySelector('#draft-status').textContent='Select and copy the inquiry text above, then email it to info@petersanjur.com.'; }
});
document.querySelector('#year').textContent=new Date().getFullYear();

const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
let motionEnabled=!reducedMotion.matches;
const motionButton=document.querySelector('#motion-toggle');
const opening=document.querySelector('#opening');
const replayButton=document.querySelector('#replay-intro');
let introTimer;
let introAnimations=[];
function finishIntro(){
  clearTimeout(introTimer);
  const hadFocus=opening.contains(document.activeElement);
  opening.hidden=true;
  document.documentElement.classList.remove('intro-running');
  introAnimations.forEach(animation=>animation.cancel());
  introAnimations=[];
  if(hadFocus)document.querySelector('.site-header .wordmark').focus({preventScroll:true});
  document.dispatchEvent(new Event('portfolio-intro-change'));
}
function startIntro(manual=false){
  if(!motionEnabled)return;
  finishIntro();
  window.scrollTo({top:0,behavior:'instant'});
  // Measure the real title, so the duplicate lands in precisely the same place.
  const target=document.querySelector('#hero-title');
  const rect=target.getBoundingClientRect();
  const type=getComputedStyle(target);
  const name=opening.querySelector('.opening-name');
  Object.assign(name.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,fontSize:type.fontSize,lineHeight:type.lineHeight,letterSpacing:type.letterSpacing});
  const scale=innerWidth<761?.82:.62;
  const x=(document.documentElement.clientWidth-rect.width*scale)/2-rect.left;
  const y=innerHeight*.43-rect.height*scale/2-rect.top;
  opening.hidden=false;
  document.documentElement.classList.add('intro-running');
  const animate=(element,frames,options)=>{
    const animation=element.animate(frames,{fill:'both',...options});
    introAnimations.push(animation);return animation;
  };
  const ease='cubic-bezier(.22,.75,.18,1)';
  // Reveal → hold → descend. Explicit delays keep the quiet hold independent
  // of the easing used for the final movement.
  animate(name,[
    {transform:`translate(${x}px,${y}px) scale(${scale})`},
    {transform:'translate(0,0) scale(1)'}
  ],{duration:1750,delay:3100,easing:'cubic-bezier(.65,0,.2,1)'});
  name.querySelectorAll('.opening-word>span').forEach((word,i)=>animate(word,[
    {clipPath:'inset(0 100% 0 0)',transform:'translateY(8px)'},
    {clipPath:'inset(0 0 0 0)',transform:'translateY(0)'}
  ],{duration:1250,delay:300+i*300,easing:ease}));
  animate(opening.querySelector('.opening-veil'),[{opacity:1},{opacity:0}],{duration:1,delay:3150});
  opening.querySelectorAll('.opening-panels>span').forEach((panel,i)=>animate(panel,[
    {transform:'translateY(0)'},{transform:'translateY(-101%)'}
  ],{duration:1500,delay:3200+i*180,easing:'cubic-bezier(.65,0,.2,1)'}));
  if(manual)opening.querySelector('.skip-intro').focus({preventScroll:true});
  introTimer=setTimeout(finishIntro,5050);
  document.dispatchEvent(new Event('portfolio-intro-change'));
}
function updateMotion(){
  document.documentElement.classList.toggle('motion-off',!motionEnabled);
  motionButton.textContent=`Motion: ${motionEnabled?'on':'off'}`;
  motionButton.setAttribute('aria-pressed',String(!motionEnabled));
  replayButton.hidden=!motionEnabled;
  if(!motionEnabled){finishIntro();document.querySelectorAll('.reveal-pending').forEach(el=>el.classList.remove('reveal-pending'));}
  scheduleFrame();
  document.dispatchEvent(new Event('portfolio-motion-change'));
}
const header=document.querySelector('.site-header');
const work=document.querySelector('#work');

let framePending=false;
function renderFrame(){
  framePending=false;
  const height=window.innerHeight;
  const workTop=work.getBoundingClientRect().top;
  header.classList.toggle('is-solid',workTop<75);

}
function scheduleFrame(){if(!framePending){framePending=true;requestAnimationFrame(renderFrame);}}
window.addEventListener('scroll',scheduleFrame,{passive:true});
window.addEventListener('resize',scheduleFrame,{passive:true});
motionButton.addEventListener('click',()=>{motionEnabled=!motionEnabled;updateMotion();});
reducedMotion.addEventListener('change',()=>{motionEnabled=!reducedMotion.matches;updateMotion();});
opening.querySelector('.skip-intro').addEventListener('click',finishIntro);
replayButton.addEventListener('click',()=>startIntro(true));
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&!opening.hidden)finishIntro();});
document.addEventListener('focusin',event=>{if(!opening.hidden&&!opening.contains(event.target))finishIntro();});
window.addEventListener('hashchange',finishIntro);
window.addEventListener('resize',()=>{if(!opening.hidden)finishIntro();});
window.addEventListener('wheel',()=>{if(!opening.hidden)finishIntro();},{passive:true});
window.addEventListener('touchstart',()=>{if(!opening.hidden)finishIntro();},{passive:true});
window.addEventListener('keydown',event=>{if(!opening.hidden&&['ArrowDown','PageDown','End',' '].includes(event.key))finishIntro();});
updateMotion();
if(motionEnabled){
  let seenIntro=false;
  try { seenIntro=sessionStorage.getItem('peter-intro-framing-v3')==='yes'; } catch {}
  if((!location.hash||location.hash==='#')&&!seenIntro){
    startIntro();
    try { sessionStorage.setItem('peter-intro-framing-v3','yes'); } catch {}
  }
}
