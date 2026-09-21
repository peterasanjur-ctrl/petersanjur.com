const projects = {
  moonrocks: {title:'Moonrocks',client:'KIZO Kicks',category:'Conceptual / Fashion',year:'Fall 2024',location:'Miami, Florida',image:'moonrocks',alt:'KIZO sneaker held up like a scientific artifact',intro:'Footwear from another world.',story:'A conceptual fashion campaign for KIZO Kicks, photographed in a Miami studio. Moonrocks places the footwear inside a surreal laboratory, treating each sneaker as an artifact to be studied.',approach:'A cool-toned palette, lab-inspired styling, and close attention to texture create a world between fashion editorial and science fiction. The product becomes the center of the story.',role:'Photography',credits:'Models: Mawntel & Samantha',detail:'moonrocks-detail',detailAlt:'Lab-inspired fashion portrait from the Moonrocks campaign'},
  untie: {title:'Untie',client:'Turning Tides',category:'Fashion / Campaign',year:'Fall 2024',location:'New York City',image:'untie',alt:'Turning Tides fashion campaign photographed in New York City',intro:'A new take on the everyday tie.',story:'A fashion campaign for Turning Tides, featuring a new tie release. Photographed in New York City, the series brings bold styling into the rhythm of the street.',approach:'Bright, playful imagery and street-style energy give a familiar accessory a different attitude. The city becomes part of the frame.',role:'Photography'},
  fitish: {title:'Dewing It At Night',client:'FITISH',category:'Beauty / Product',year:'Fall 2024',location:'Dallas, Texas',image:'fitish',alt:'FITISH beauty campaign, Dewing It At Night',intro:'Beauty with a night-in feeling.',story:'A studio beauty and product campaign for FITISH, photographed in Dallas. Dewing It At Night brings skincare into a relaxed, girls-night-in setting.',approach:'Close-up beauty photography and an easy, intimate mood keep the focus on the people and the product. A softer take on a beauty ritual.',role:'Photography'},
  roadkill: {title:'Roadkill',client:'Editorial series',category:'Photography / Editorial',image:'roadkill',alt:'Two models with bold sculptural hair and patterned clothes on a classic car',intro:'More color. More character.',story:'A fashion editorial built around bold styling, sculptural hair, and the lines of a classic car.',approach:'Saturated color, dramatic silhouettes, and a close composition bring the personalities in the frame forward.',role:'Photography'}
};
const dialog = document.querySelector('#project-dialog');
const content = document.querySelector('#project-content');
let projectTrigger;
const projectKeys = Object.keys(projects);
function renderProject(key) {
  const p = projects[key];
  if (!p) return;
  const next = projectKeys[(projectKeys.indexOf(key)+1)%projectKeys.length];
  content.innerHTML = `<article class="project-story"><div class="story-heading"><span class="eyebrow">${p.client} / ${p.category}</span><h2 id="project-title">${p.title}</h2><div class="story-meta"><span>${p.role} — Peter Sanjur</span>${p.location ? `<span>${p.location} / ${p.year}</span>`:''}</div></div><img class="story-hero ${key==='untie'||key==='fitish'?'story-portrait':''}" src="assets/${p.image}.jpg" alt="${p.alt}"><div class="story-body"><h3>${p.intro}</h3><div><span class="eyebrow">The project</span><p>${p.story}</p><span class="eyebrow">The visual approach</span><p>${p.approach}</p>${p.credits?`<p class="story-credits">${p.credits}</p>`:''}</div></div>${p.detail?`<figure class="story-detail"><img src="assets/${p.detail}.jpg" alt="${p.detailAlt}" loading="lazy"><figcaption>${p.title} / Photography by Peter Sanjur</figcaption></figure>`:''}<div class="story-end"><a class="text-link" href="#contact">Have a project in mind? Let’s talk ↗</a><a class="next-project" href="#project/${next}"><span class="eyebrow">Next project</span>${projects[next].title} ↗</a></div></article>`;
  if (!dialog.open) { dialog.showModal(); document.body.classList.add('dialog-open'); }
  dialog.scrollTop = 0;
  document.title = `${p.title} — Peter Sanjur`;
  document.querySelector('.close-dialog').focus({preventScroll:true});
}
function syncProject() {
  const key = location.hash.startsWith('#project/') ? location.hash.slice(9) : null;
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
dialog.addEventListener('click',event=>{const link=event.target.closest('a');if(link && !link.hash.startsWith('#project/')) { dialog.close();document.body.classList.remove('dialog-open');document.title='Peter Sanjur — Photographer & Director'; }});
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
}
const rail=document.querySelector('.name-rail');
const about=document.querySelector('#about');
const movingImages=[...document.querySelectorAll('.hero-image,.project-image img')];
let framePending=false;
function renderFrame(){
  framePending=false;
  const height=window.innerHeight;
  rail.classList.toggle('is-hidden',about.getBoundingClientRect().top<height*.52);
  if(!motionEnabled||document.hidden)return;
  movingImages.forEach(img=>{
    const rect=img.parentElement.getBoundingClientRect();
    if(rect.bottom>0&&rect.top<height){
      const shift=Math.max(-25,Math.min(25,(height*.5-(rect.top+rect.height*.5))*.06));
      img.style.setProperty('--pan',`${shift}px`);
    }
  });
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
  if(!location.hash||location.hash==='#')startIntro();
}
