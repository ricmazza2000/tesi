(function(){
'use strict';
function init(){
 if(typeof StimeComune==='undefined'||document.getElementById('stime-locali'))return;
 const main=document.querySelector('main'),tabs=document.getElementById('schede');if(!main||!tabs)return;
 // Un solo ingresso nel portale: la scheda numerata insieme alle altre sezioni.
 document.querySelectorAll('#tramite a[href^="stime.html"]').forEach(a=>{const separator=a.previousElementSibling;if(separator?.tagName==='I')separator.remove();a.remove();});
 const section=document.createElement('section');section.id='stime-locali';section.dataset.stimeLocale='true';main.insertBefore(section,main.querySelector('footer'));
 const button=document.createElement('button');button.type='button';button.dataset.sez='stime-locali';button.dataset.n='05';button.textContent='Stime provvisorie';button.id='tab-stime-locali';tabs.append(button);
 SEZIONI.push('stime-locali');
 const api=StimeComune.mount(section,{embedded:true,context:()=>({anno:ANNO,hz:HZ,q:document.getElementById('q').value})});
 const oldSection=mostraSezione;
 mostraSezione=function(id,...args){const result=oldSection.call(this,id,...args);document.body.classList.toggle('sp-portal-view',id==='stime-locali');const q=document.getElementById('q');q.placeholder=id==='stime-locali'?'Cerca un comune senza rendiconto…':'Cerca un comune…';if(id==='stime-locali')api.update();return result;};
 button.onclick=()=>mostraSezione('stime-locali',true);
 const oldYear=disegnaAnno;disegnaAnno=function(...args){const result=oldYear.apply(this,args);if(section.classList.contains('on'))api.update();return result;};
 document.getElementById('hz').addEventListener('change',()=>{if(section.classList.contains('on'))api.update();});
 document.getElementById('q').addEventListener('input',e=>{if(section.classList.contains('on'))api.query(e.target.value);});
 if(location.hash==='#stime-locali')mostraSezione('stime-locali',false);
}
if(document.readyState==='complete')init();else window.addEventListener('load',init,{once:true});
})();
