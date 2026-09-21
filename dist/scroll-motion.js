/* Gentle, one-time entrances. Native scrolling and fully visible fallbacks. */
(()=>{
  const root=document.documentElement;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const enabled=()=>!reduced.matches&&!root.classList.contains('motion-off')&&!root.classList.contains('studio-motion-off');
  const targets=[...document.querySelectorAll('main h2,.project,.portrait,.about-copy>p,.contact-copy>h3,.contact-copy>p,.shop-main p,.statement,.space-row,.studio-facts>div,.gear-grid>div,.made-grid .space-photo,.faq-list details')];
  // Content already onscreen (including direct anchor arrivals) stays settled.
  const waiting=targets.filter(element=>element.getBoundingClientRect().top>=innerHeight);
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(({target,isIntersecting})=>{
      if(!isIntersecting)return;
      observer.unobserve(target);
      if(enabled()&&target.getBoundingClientRect().bottom>0){
        target.classList.add('soft-reveal');
      }
    });
  },{threshold:0,rootMargin:'0px 0px -20px 0px'});
  waiting.forEach(element=>observer.observe(element));
  document.addEventListener('animationend',event=>{
    if(event.animationName==='soft-rise')event.target.classList.remove('soft-reveal');
  });
  document.addEventListener('focusin',event=>{
    event.target.closest('.soft-reveal')?.classList.remove('soft-reveal');
  });
  function sync(){
    if(!enabled())document.querySelectorAll('.soft-reveal').forEach(element=>element.classList.remove('soft-reveal'));
  }
  reduced.addEventListener('change',sync);
  document.addEventListener('portfolio-motion-change',sync);
  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['class']});
})();
