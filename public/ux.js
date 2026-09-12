(()=>{
  const qs=(s,r=document)=>r.querySelector(s), qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const toggle=qs('.mobile-nav-toggle'), menu=qs('#mobileNav');
  if(toggle&&menu){
    const close=()=>{menu.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Open menu')};
    toggle.addEventListener('click',()=>{const open=menu.hidden;menu.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close menu':'Open menu')});
    qsa('a',menu).forEach(a=>a.addEventListener('click',close));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
    document.addEventListener('click',e=>{if(!menu.hidden&&!menu.contains(e.target)&&!toggle.contains(e.target))close()});
  }

  qsa('[data-copy-email]').forEach(button=>button.addEventListener('click',async()=>{
    const value=button.dataset.copyEmail, status=button.parentElement?.querySelector('.ux-copy-status');
    try{await navigator.clipboard.writeText(value);if(status)status.textContent='Copied.';}
    catch{const t=document.createElement('textarea');t.value=value;t.setAttribute('readonly','');t.style.position='fixed';t.style.opacity='0';document.body.append(t);t.select();document.execCommand('copy');t.remove();if(status)status.textContent='Copied.';}
  }));

  const main=qs('main');
  const tool=qs('#planner,#finder,#spacing-calculator,#calculator');
  if(main&&tool){
    const candidates=qsa('.seo-path,.how.seo-copy,.related',main).filter(el=>Boolean(tool.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING));
    if(candidates.length>=2){
      candidates.forEach(el=>el.classList.add('ux-mobile-secondary'));
      const btn=document.createElement('button');btn.type='button';btn.className='ux-guidance-toggle';btn.textContent='Show planning guides and FAQs';btn.setAttribute('aria-expanded','false');
      candidates[0].before(btn);
      btn.addEventListener('click',()=>{const open=main.classList.toggle('ux-guidance-open');btn.setAttribute('aria-expanded',String(open));btn.textContent=open?'Hide planning guides and FAQs':'Show planning guides and FAQs';});
    }
  }

  if(!qs('.ux-mobile-tool-dock')){
    let href='',label='';
    if(document.body.classList.contains('ux-home')){href='#ux-start';label='Choose what I want to do';}
    else if(qs('#spacing-calculator')){href='#spacing-calculator';label='Use deck spacing calculator';}
    else if(qs('#finder')){href='#finder';label='Find projects for my leftovers';}
    else if(qs('#planner')){href='#planner';label='Use this calculator';}
    else if(qs('.guide-cta a')){href=qs('.guide-cta a').getAttribute('href');label='Open the calculator';}
    else if(qs('.quick-answer a')){href=qs('.quick-answer a').getAttribute('href');label='Check my material';}
    if(href){const dock=document.createElement('div');dock.className='ux-mobile-tool-dock';dock.innerHTML=`<a href="${href}">${label} →</a>`;document.body.append(dock);}
  }

  const path=location.pathname.replace(/\/$/,'')||'/';
  qsa('.desktop-nav a,.mobile-nav a').forEach(a=>{try{const u=new URL(a.href,location.href);if(u.pathname===path&&u.hash==='')a.setAttribute('aria-current','page');}catch{}});
})();
