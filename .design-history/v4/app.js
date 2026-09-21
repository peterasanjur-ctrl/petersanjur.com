const dialog = document.querySelector('#project-dialog');
const content = document.querySelector('#project-content');
let projectTrigger;
const projectKeys = Object.keys(projects);
function escapeHTML(value='') {
  return String(value).replace(/[&<>"']/g, character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}
function renderProject(key) {
  const p = projects[key];
  if (!p) return;
  const next = projectKeys[(projectKeys.indexOf(key)+1)%projectKeys.length];
  const paragraphs = p.description.split(/\n\s*\n/).filter(Boolean).map(text=>`<p>${escapeHTML(text).replace(/\n/g,'<br>')}</p>`).join('');
  let pairedPortrait=false;
  const gallery = p.images.map((image,index)=>{
    const landscape=image.width>image.height;
    const nextImage=p.images[index+1];
    let layout=landscape?'gallery-landscape':'';
    if(!landscape){
      if(pairedPortrait)pairedPortrait=false;
      else if(nextImage&&nextImage.width<=nextImage.height)pairedPortrait=true;
      else layout='gallery-solo';
    }
    return `<figure class="gallery-frame ${layout}"><img src="${escapeHTML(image.src)}" width="${image.width}" height="${image.height}" alt="${escapeHTML(p.title)} — photograph ${index+1} of ${p.images.length}, by Peter Sanjur" loading="${index<2?'eager':'lazy'}" decoding="async"><figcaption>${String(index+1).padStart(2,'0')} / ${String(p.images.length).padStart(2,'0')}</figcaption></figure>`;}).join('');
  const films = p.films.map(film=>`<figure class="story-film"><video controls playsinline preload="none" poster="${escapeHTML(p.cover.src)}" aria-label="${escapeHTML(p.title)} campaign film"><source src="${escapeHTML(film.src)}" type="video/mp4"></video><figcaption>${escapeHTML(p.title)} — campaign film</figcaption></figure>`).join('');
  content.innerHTML = `<article class="project-story"><div class="story-heading"><span class="eyebrow">${escapeHTML([p.client,p.category].filter(Boolean).join(' / '))}</span><h2 id="project-title">${escapeHTML(p.title)}</h2><div class="story-meta"><span>${escapeHTML(p.location)} / ${escapeHTML(p.year)}</span><span>${p.images.length} photographs${p.films.length?' + film':''}</span></div></div>${paragraphs?`<div class="story-breakdown"><span class="eyebrow">About the project</span><div>${paragraphs}</div></div>`:''}<div class="story-gallery" aria-label="${escapeHTML(p.title)} photographs">${gallery}</div>${films}<div class="story-end"><a class="text-link" href="#work">Back to all work ↗</a><a class="next-project" href="#project/${next}"><span class="eyebrow">Next project</span>${escapeHTML(projects[next].title)} ↗</a></div></article>`;
  if (!dialog.open) { dialog.showModal(); document.body.classList.add('dialog-open'); }
  dialog.scrollTop = 0;
  document.title = `${p.title} — Peter Sanjur`;
  document.querySelector('.close-dialog').focus({preventScroll:true});
}
function stopProjectMedia(){content.querySelectorAll('video').forEach(video=>video.pause());}
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
function finishIntro(){
  clearTimeout(introTimer);
  const hadFocus=opening.contains(document.activeElement);
  opening.hidden=true;
  document.documentElement.classList.remove('intro-running');
  if(hadFocus)document.querySelector('.site-header .wordmark').focus({preventScroll:true});
}
function startIntro(){
  if(!motionEnabled)return;
  finishIntro();
  window.scrollTo({top:0,behavior:'instant'});
  opening.hidden=false;
  // Restart the same finite sequence when the visitor selects Replay.
  opening.getAnimations({subtree:true}).forEach(animation=>{animation.cancel();animation.play();});
  document.documentElement.classList.add('intro-running');
  introTimer=setTimeout(finishIntro,2650);
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
replayButton.addEventListener('click',startIntro);
window.addEventListener('keydown',event=>{if(event.key==='Escape'&&!opening.hidden)finishIntro();});
document.addEventListener('focusin',event=>{if(!opening.hidden&&!opening.contains(event.target))finishIntro();});
window.addEventListener('hashchange',finishIntro);
updateMotion();
if(motionEnabled){
  const reveal=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.remove('reveal-pending');entry.target.classList.add('is-revealed');reveal.unobserve(entry.target);}
    });
  },{threshold:.12});
  document.querySelectorAll('.project-image,.project-caption,.about-intro,.portrait,.shop-main').forEach(el=>{
    if(!el.classList.contains('project-image'))el.classList.add('reveal-pending');
    reveal.observe(el);
  });
  let seenIntro=false;
  try { seenIntro=sessionStorage.getItem('peter-intro-seen')==='yes'; } catch {}
  if((!location.hash||location.hash==='#')&&!seenIntro){
    startIntro();
    try { sessionStorage.setItem('peter-intro-seen','yes'); } catch {}
  }
}
