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
  const credits=(p.credits||[]).map(credit=>`<div><dt>${escapeHTML(credit.role)}</dt><dd>${credit.url?`<a class="quiet-link" href="${escapeHTML(credit.url)}" target="_blank" rel="noopener">${escapeHTML(credit.name)}</a>`:escapeHTML(credit.name)}</dd></div>`).join('')+(p.press||[]).map(f=>`<div><dt>Featured in</dt><dd><a class="quiet-link" href="${escapeHTML(f.url)}" target="_blank" rel="noopener">${escapeHTML(f.name)}</a></dd></div>`).join('');
  const navigation=sections.length?`<nav class="campaign-nav" aria-label="${escapeHTML(p.title)} campaigns">${sections.map((campaign,i)=>`<button type="button" data-campaign="campaign-${i}">${escapeHTML(campaign.title)} <span aria-hidden="true">↓</span></button>`).join('')}</nav>`:'';
  const campaigns=sections.map((campaign,i)=>{
    const images=renderImages(campaign.images||[],`${p.title} — ${campaign.title}`);
    const campaignFilms=campaign.films||[];
    // Wide and tall films sit in separate rows so each row shares one height.
    const tall=film=>(film.width||1920)<(film.height||1080);
    const films=campaignFilms.length===1
      ?`<div class="campaign-films single-film">${renderFilms(campaignFilms,campaign.title,p.cover.src)}</div>`
      :[campaignFilms.filter(film=>!tall(film)),campaignFilms.filter(tall)].map((group,portrait)=>group.length?`<div class="campaign-films film-group${portrait?' portrait-films':''}">${renderFilms(group,campaign.title,p.cover.src)}</div>`:'').join('');
    return `<section class="campaign-section" id="campaign-${i}" aria-labelledby="campaign-title-${i}"><div class="campaign-heading"><span class="eyebrow">${String(i+1).padStart(2,'0')} / ${escapeHTML(p.client)}</span><h2 id="campaign-title-${i}" tabindex="-1">${escapeHTML(campaign.title)}</h2>${campaign.description?`<p>${escapeHTML(campaign.description)}</p>`:''}</div>${films}${images?`<div class="story-gallery">${images}</div>`:''}</section>`;
  }).join('');
  const gallery=renderImages(p.images,p.title);
  content.innerHTML=`<article class="project-story"><div class="story-heading"><span class="eyebrow">${[p.client&&p.client_url?`<a class="quiet-link" href="${escapeHTML(p.client_url)}" target="_blank" rel="noopener">${escapeHTML(p.client)}</a>`:escapeHTML(p.client||''),escapeHTML(p.category||'')].filter(Boolean).join(' / ')}</span><h2 id="project-title">${escapeHTML(p.title)}</h2><div class="story-meta"><span>${escapeHTML([p.location,p.year].filter(Boolean).join(' / '))}</span><span>${mediaSummary}</span></div></div>${paragraphs?`<div class="story-breakdown"><span class="eyebrow">About the project</span><div>${paragraphs}</div></div>`:''}${credits?`<section class="story-credits" aria-label="Project credits"><span class="eyebrow">Credits</span><dl>${credits}</dl></section>`:''}${navigation}${renderFilms(p.films,p.title,p.cover.src)}${gallery?`<div class="story-gallery" aria-label="${escapeHTML(p.title)} photographs">${gallery}</div>`:''}${campaigns}<div class="story-end"><a class="text-link" href="#work">Back to all work ↗︎</a><a class="next-project" href="#project/${next}"><span class="eyebrow">Next project</span>${escapeHTML(projects[next].title)} ↗︎</a></div></article>`;
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
  else if (dialog.open) { dialog.close(); document.body.classList.remove('dialog-open'); document.title='Peter Sanjur — Dallas Photographer & Director'; }
}
// Project links point at crawlable pages; on the homepage a plain click opens the same project in place.
document.querySelectorAll('[data-project]').forEach(link => link.addEventListener('click',event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  projectTrigger=link;
  location.hash=`project/${link.dataset.project}`;
}));
function closeProject() {
  history.replaceState(null,'','#work');
  syncProject();
  projectTrigger?.focus({preventScroll:true});
}
document.querySelector('.close-dialog').addEventListener('click',closeProject);
dialog.addEventListener('cancel',event=>{event.preventDefault();closeProject();});
dialog.addEventListener('click',event=>{const link=event.target.closest('a');if(link && !link.hash.startsWith('#project/')) { stopProjectMedia();dialog.close();document.body.classList.remove('dialog-open');document.title='Peter Sanjur — Dallas Photographer & Director'; }});
window.addEventListener('hashchange',syncProject);
syncProject();

const form=document.querySelector('#inquiry-form');
// When the page loaded; the inquiry script uses it to spot bots that post instantly.
if(form?.elements._t)form.elements._t.value=Date.now();
const inquiryStatus=document.querySelector('#inquiry-status');
const inquirySent=document.querySelector('#inquiry-sent');
const sendButton=form.querySelector('[type="submit"]');
const sendLabel=sendButton.firstChild;
// Studio bookings have their own form on the studio page.
if(new URLSearchParams(location.search).get('inquiry')==='studio')location.replace('studio.html#studio-inquiry');
// The date picker starts at today, opens from anywhere in the field, and stays optional.
const dateField=form.elements.preferred_date;
const today=new Date();
dateField.min=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
dateField.addEventListener('click',()=>{try{dateField.showPicker();}catch{/* Older browsers open their own picker. */}});
['input','change'].forEach(type=>dateField.addEventListener(type,()=>dateField.toggleAttribute('data-empty',!dateField.value)));
// Show the chosen date the way people read it, e.g. "Sat, Mar 14, 2027".
function readableDate(value){
  if(!value)return '';
  const [year,month,day]=value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'}).format(new Date(year,month-1,day));
}
// Inquiries post to the web app in the form's action attribute (integrations/inquiries.gs).
form.addEventListener('submit',async event=>{
  event.preventDefault();
  const data=new FormData(form);
  const name=data.get('name').trim(),email=data.get('email').trim();
  const when=readableDate(data.get('preferred_date'));
  // The date leads the subject's tail so inquiries are easy to scan and sort by date.
  const subject=`Project inquiry — ${data.get('type')} — ${name}${when?` — ${when}`:''}`;
  const endpoint=form.getAttribute('action');
  if(!endpoint){
    // No form service connected yet: fall back to the visitor's email app.
    const body=`Name: ${name}\nEmail: ${email}\nProject: ${data.get('type')}\nPreferred date: ${when||'Flexible / to discuss'}\nBudget: ${data.get('budget')||'Not given'}\n\n${data.get('message').trim()}`;
    location.href=`mailto:info@petersanjur.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return;
  }
  data.set('_subject',subject);
  form.setAttribute('aria-busy','true');
  sendButton.disabled=true;
  sendLabel.textContent='Sending… ';
  inquiryStatus.classList.remove('is-error');
  inquiryStatus.textContent='Sending your inquiry…';
  try{
    // A plain form post, so the Google Apps Script endpoint needs no CORS preflight.
    const response=await fetch(endpoint,{method:'POST',body:new URLSearchParams(data),headers:{Accept:'application/json'}});
    const result=await response.json().catch(()=>({}));
    if(!response.ok||result.ok===false)throw new Error(result.error||`Inquiry failed: ${response.status}`);
    window.goatcounter?.count?.({path:'contact-inquiry',title:'Contact inquiry',event:true});
    form.reset();
    document.querySelector('#inquiry-sent-note').textContent=`I’ll reply to ${email}.`;
    form.classList.add('is-sent');
    inquirySent.hidden=false;
    inquirySent.focus({preventScroll:true});
    inquirySent.scrollIntoView({behavior:motionEnabled?'smooth':'instant',block:'nearest'});
  }catch{
    inquiryStatus.classList.add('is-error');
    inquiryStatus.textContent='Your inquiry didn’t send. Please try again, or email info@petersanjur.com.';
  }finally{
    form.removeAttribute('aria-busy');
    sendButton.disabled=false;
    sendLabel.textContent='Send inquiry ';
  }
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
  opening.style.height='';
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
  const target=document.querySelector('#hero-title');
  const name=opening.querySelector('.opening-name');
  // Rebuild the name as one run of text with its caret, so an older cached copy
  // of the page markup can't break the intro.
  name.textContent=target.textContent.trim();
  let caret=opening.querySelector('.opening-caret');
  if(!caret){caret=document.createElement('span');caret.className='opening-caret';caret.setAttribute('aria-hidden','true');name.after(caret);}
  // The overlay sits on the page (not the phone's shifting viewport) over the hero,
  // so the typed name and the real title share one coordinate system.
  opening.style.height=`${Math.max(document.querySelector('.hero').offsetHeight,window.innerHeight)}px`;
  opening.hidden=false;
  document.documentElement.classList.add('intro-running');
  // Measure the real title, so the duplicate lands in precisely the same place.
  const frame=opening.getBoundingClientRect();
  const rect=target.getBoundingClientRect();
  const type=getComputedStyle(target);
  // In a short window the real title can sit below the fold, so type it where
  // it can be seen and let it settle into place as the curtain lifts.
  const visibleTop=Math.min(rect.top,Math.max(16,window.innerHeight-rect.height-64));
  const settle=rect.top-visibleTop;
  Object.assign(name.style,{left:`${rect.left-frame.left}px`,top:`${visibleTop-frame.top}px`,width:`${rect.width}px`,fontSize:type.fontSize,lineHeight:type.lineHeight,letterSpacing:type.letterSpacing});
  try{
  const animate=(element,frames,options)=>{
    const animation=element.animate(frames,{fill:'both',...options});
    introAnimations.push(animation);return animation;
  };
  // Type the name in place at full size: measure where each letter ends, then
  // step a clip and a caret across those points. The text stays one run, so it
  // matches the real title exactly when the intro hands over.
  const text=name.firstChild,box=name.getBoundingClientRect(),range=document.createRange();
  // Tight negative tracking pulls each measured edge inside the glyph, so add it back.
  const tracking=Math.max(0,-parseFloat(type.letterSpacing)||0)+2;
  const stops=[0,...[...text.data].map((_,i)=>{range.setStart(text,0);range.setEnd(text,i+1);return range.getBoundingClientRect().right-box.left+tracking;})];
  const perLetter=85,typing=perLetter*(stops.length-1),typeStart=250,reveal=typeStart+typing+550;
  const step=values=>values.map((value,i)=>({...value,offset:i/(values.length-1),easing:'steps(1,end)'}));
  animate(name,step(stops.map(stop=>({clipPath:`inset(-30% ${box.width-stop}px -30% -5%)`}))),{duration:typing,delay:typeStart});
  Object.assign(caret.style,{left:`${box.left-frame.left}px`,top:`${box.top-frame.top+box.height*.08}px`,height:`${box.height*.84}px`,width:`${Math.max(4,box.height*.07)}px`});
  animate(caret,step(stops.map(stop=>({transform:`translateX(${stop+box.height*.05}px)`}))),{duration:typing,delay:typeStart});
  animate(caret,[{opacity:1},{opacity:0}],{duration:150,delay:reveal-150});
  if(settle>0)animate(name,[{translate:'0 0'},{translate:`0 ${settle}px`}],{duration:900,delay:reveal,easing:'cubic-bezier(.65,0,.2,1)'});
  animate(opening.querySelector('.opening-veil'),[{opacity:1},{opacity:0}],{duration:1,delay:reveal});
  opening.querySelectorAll('.opening-panels>span').forEach((panel,i)=>animate(panel,[
    {transform:'translateY(0)'},{transform:'translateY(-101%)'}
  ],{duration:1100,delay:reveal+50+i*120,easing:'cubic-bezier(.65,0,.2,1)'}));
  if(manual)opening.querySelector('.skip-intro').focus({preventScroll:true});
  introTimer=setTimeout(finishIntro,reveal+1300);
  // In-app browsers (like Instagram's) resize the page while it loads, moving the
  // real title after we measured it. Follow it every frame until the intro ends;
  // if its size changes, start over so the letters line up again.
  const width=rect.width;
  const follow=()=>{
    if(opening.hidden)return;
    const now=target.getBoundingClientRect(),base=opening.getBoundingClientRect();
    if(Math.abs(now.width-width)>1){startIntro(manual);return;}
    const top=Math.min(now.top,Math.max(16,window.innerHeight-now.height-64))-base.top;
    name.style.left=`${now.left-base.left}px`;name.style.top=`${top}px`;
    caret.style.left=`${now.left-base.left}px`;caret.style.top=`${top+now.height*.08}px`;
    requestAnimationFrame(follow);
  };
  requestAnimationFrame(follow);
  }catch(error){
    // Never leave visitors behind a blank overlay: show the finished page instead.
    finishIntro();return;
  }
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
// Height-only resizes (toolbars sliding in) are followed; a new width means a new layout.
let introWidth=window.innerWidth;
window.addEventListener('resize',()=>{if(!opening.hidden&&window.innerWidth!==introWidth)finishIntro();introWidth=window.innerWidth;});
window.addEventListener('wheel',()=>{if(!opening.hidden)finishIntro();},{passive:true});
window.addEventListener('touchstart',()=>{if(!opening.hidden)finishIntro();},{passive:true});
window.addEventListener('keydown',event=>{if(!opening.hidden&&['ArrowDown','PageDown','End',' '].includes(event.key))finishIntro();});
updateMotion();
if(motionEnabled){
  let seenIntro=false;
  try { seenIntro=sessionStorage.getItem('peter-intro-typed-v1')==='yes'; } catch {}
  if((!location.hash||location.hash==='#')&&!seenIntro){
    startIntro();
    try { sessionStorage.setItem('peter-intro-typed-v1','yes'); } catch {}
  }
}
