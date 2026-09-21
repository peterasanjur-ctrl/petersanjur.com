/* Viewport-linked settling, shared by the portfolio and Studio. */
(()=>{
  const root=document.documentElement;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const groups=[
    ['.work-heading h2,.about-intro h2,.contact-heading h2,.shop-main h2,.studio-intro h2,.intro-grid h2,.equipment-grid h2,.studio-work h2,.studio-faq h2,.inquiry-layout h2',26,.94],
    ['.project,.space-gallery>.space-photo,.studio-work-grid>figure',48,.975],
    ['.portrait,.about-copy>.lead,.intro-copy>.lead',22,.97],
    ['.about-copy>p:not(.lead),.contact-copy>p,.intro-copy>p:not(.lead),.shop-main p,.work-meta',18,1]
  ];
  const items=[];
  groups.forEach(([selector,distance,scale])=>{
    document.querySelectorAll(selector).forEach((element,index)=>{
      element.classList.add('scroll-motion');
      items.push({element,distance:distance+(element.matches('.project')&&index%2?12:0),scale,y:0});
    });
  });
  // Wrap words without changing text, line breaks, emphasis, or heading semantics.
  const textTargets=[...document.querySelectorAll('main h2,.project-caption h3,.contact-copy h3')];
  textTargets.forEach(element=>{
    const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    let index=0;
    nodes.forEach(node=>{
      const fragment=document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(word=>{
        if(!word.trim()){fragment.append(document.createTextNode(word));return;}
        const clip=document.createElement('span');
        clip.className='word-clip';
        const inner=document.createElement('span');
        inner.className='word-reveal';
        inner.style.setProperty('--word-delay',`${Math.min(index++,8)*65}ms`);
        inner.textContent=word;
        clip.append(inner);fragment.append(clip);
      });
      node.replaceWith(fragment);
    });
    element.classList.add('text-reveal');
  });
  const revealTargets=[...textTargets,...document.querySelectorAll('.project-image')];
  const revealObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('has-entered');
        revealObserver.unobserve(entry.target);
      }
    });
  },{rootMargin:'0px 0px -35px 0px',threshold:0});
  revealTargets.forEach(element=>revealObserver.observe(element));
  const active=new Set();
  let pending=false;
  const enabled=()=>!reduced.matches&&!root.classList.contains('motion-off')&&!root.classList.contains('studio-motion-off');
  function render(){
    pending=false;
    if(!enabled())return;
    // Read all geometry first to avoid alternating layout reads and writes.
    const changes=[...active].map(item=>{
      const top=item.element.getBoundingClientRect().top-item.y;
      const progress=Math.max(0,Math.min(1,(innerHeight*.96-top)/(innerHeight*.6)));
      const remaining=Math.pow(1-progress,3);
      return {item,y:item.distance*remaining,scale:1-(1-item.scale)*remaining};
    });
    changes.forEach(({item,y,scale})=>{
      item.y=y;
      item.element.style.setProperty('--settle-y',`${y.toFixed(2)}px`);
      item.element.style.setProperty('--settle-scale',scale.toFixed(4));
    });
  }
  function schedule(){if(!pending){pending=true;requestAnimationFrame(render);}}
  const byElement=new Map(items.map(item=>[item.element,item]));
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      const item=byElement.get(entry.target);
      if(entry.isIntersecting)active.add(item);else active.delete(item);
    });
    schedule();
  },{rootMargin:'100px 0px'});
  items.forEach(item=>observer.observe(item.element));
  function sync(){
    root.classList.toggle('scroll-effects-on',enabled());
    if(!enabled())items.forEach(item=>{
      item.y=0;
      item.element.style.removeProperty('--settle-y');
      item.element.style.removeProperty('--settle-scale');
    });
    schedule();
  }
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  addEventListener('load',schedule);
  document.addEventListener('toggle',schedule,true);
  document.addEventListener('portfolio-motion-change',sync);
  reduced.addEventListener('change',sync);
  let wasEnabled=enabled();
  new MutationObserver(()=>{
    if(wasEnabled!==enabled()){wasEnabled=enabled();sync();}
  }).observe(root,{attributes:true,attributeFilter:['class']});
  document.fonts.ready.then(schedule);
  sync();
})();
