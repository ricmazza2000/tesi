(function(){
'use strict';
function init(){const p=new URLSearchParams(location.search);StimeComune.mount(document.getElementById('stime-app'),{anno:+p.get('anno')||2025,hz:p.get('oriz')||'t1',q:p.get('q')||'',openKey:p.get('comune')||null});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
