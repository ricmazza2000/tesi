(function(){
'use strict';
function init(){
 if(typeof StimeComune==='undefined'||typeof LAYMAP==='undefined'||document.getElementById('sp-map-stime'))return;
 let attivo=false,json=null,seq=0,ultimoContesto='',aperto=null;
 const reg=typeof REGIONE!=='undefined'?REGIONE:null;
 const colors={CRITICO:'#C62828',ALTO:'#EF6C00',MEDIO:'#FBC02D',BASSO:'#2E7D32',NEUTRO:'#b8bdbd'};
 const box=document.createElement('div');box.className='sp-map-control';box.id='sp-map-stime';box.innerHTML='<label><input type="checkbox" id="sp-map-toggle"> Mostra anche le stime provvisorie</label><small class="sp-map-status">Modulo sperimentale · indici con rendiconto invariati</small><small><span class="sp-hatch-key"></span>Colore tratteggiato: stima del rischio.</small><small>Grigio tratteggiato: dissesto già noto. Grigio pieno: indice assente.</small><small><a class="sp-map-page" href="stime.html">Elenco e spiegazioni delle stime →</a></small>';document.getElementById('leg').append(box);
 const toggle=box.querySelector('input'),status=box.querySelector('.sp-map-status');
 function record(key){return attivo&&json?.meta.anno===ANNO&&!riga(key)?json.comuni[key]||null:null;}
 function patterns(){
  for(const svg of document.querySelectorAll('.leaflet-overlay-pane svg')){
   let defs=svg.querySelector('defs');if(!defs){defs=document.createElementNS('http://www.w3.org/2000/svg','defs');svg.prepend(defs);}
   for(const [name,color] of Object.entries(colors)){
    if(defs.querySelector('#sp-hatch-'+name))continue;
    const p=document.createElementNS('http://www.w3.org/2000/svg','pattern');p.id='sp-hatch-'+name;p.setAttribute('patternUnits','userSpaceOnUse');p.setAttribute('width','8');p.setAttribute('height','8');
    const rect=document.createElementNS(p.namespaceURI,'rect');rect.setAttribute('width','8');rect.setAttribute('height','8');rect.setAttribute('fill',color);rect.setAttribute('fill-opacity','.62');p.append(rect);
    const path=document.createElementNS(p.namespaceURI,'path');path.setAttribute('d','M-2 2 L2 -2 M0 8 L8 0 M6 10 L10 6');path.setAttribute('stroke','#1b3037');path.setAttribute('stroke-opacity','.55');path.setAttribute('stroke-width','1.2');p.append(path);defs.append(p);
   }
  }
 }
 const canvasPatterns={};
 function fillFor(f){
  // La mappa Italia usa Canvas, la Toscana SVG: il tratteggio deve funzionare in entrambi.
  if(!document.querySelector('.leaflet-overlay-pane canvas'))return 'url(#sp-hatch-'+f+')';
  if(canvasPatterns[f])return canvasPatterns[f];
  const tile=document.createElement('canvas');tile.width=8;tile.height=8;
  const ctx=tile.getContext('2d');ctx.globalAlpha=.62;ctx.fillStyle=colors[f]||colors.NEUTRO;ctx.fillRect(0,0,8,8);
  ctx.globalAlpha=.55;ctx.strokeStyle='#1b3037';ctx.lineWidth=1.2;ctx.beginPath();
  ctx.moveTo(-2,2);ctx.lineTo(2,-2);ctx.moveTo(0,8);ctx.lineTo(8,0);ctx.moveTo(6,10);ctx.lineTo(10,6);ctx.stroke();
  canvasPatterns[f]=ctx.createPattern(tile,'repeat');return canvasPatterns[f];
 }
 const oldStyle=stileDi;
 stileDi=function(feature){
  const base=oldStyle(feature),key=feature.properties.k,r=record(key);
  if(!r||r.tipo!=='stima')return base;
  if(typeof REG_SEL!=='undefined'&&REG_SEL&&feature.properties.reg!==REG_SEL)return base;
  const s=r.orizzonti[HZ];if(!s)return base;
  const known=r.stato?.stato==='dissesto_attivo';const f=known?'NEUTRO':reg?s.fascia_regionale:s.fascia;
  if(typeof FILT!=='undefined'&&FILT&&FILT.split(',').indexOf(f)<0&&aperto!==key)return {...base,fillOpacity:0,opacity:0};
  return {...base,fillColor:fillFor(f),fillOpacity:.9,opacity:1,weight:aperto===key?3:(reg ? .6 : .35),color:aperto===key?'#172f4c':'#fff'};
 };
 const oldColors=applicaColori;
 applicaColori=function(...args){
  patterns();const result=oldColors.apply(this,args);
  for(const [key,layer] of Object.entries(LAYMAP)){
   const r=record(key),el=layer.getElement?.();
   if(el){if(r)el.dataset.stimaLocale=r.tipo;else delete el.dataset.stimaLocale;}
   if(!r)continue;
   const e=StimeComune.esc,s=r.orizzonti[HZ],known=r.stato?.stato==='dissesto_attivo';
   const descr=r.tipo!=='stima'?'DATI INSUFFICIENTI · nessun indice attribuito':known?'STIMA PROVVISORIA · dissesto già dichiarato':`STIMA PROVVISORIA<br>Indice nazionale ≈ ${StimeComune.fmt(s.indice)} / 100${reg?'<br>Indice regionale stimato ≈ '+StimeComune.fmt(s.indice_regionale):''}`;
   layer.unbindTooltip();layer.bindTooltip('<b>'+e(r.comune)+'</b><br>'+descr+'<br>Fotografia '+ANNO+' · '+(HZ==='t3'?'entro tre anni':'anno successivo')+'<br>'+e(StimeComune.stati[r.stato?.stato]||'Stato non documentato'),{sticky:true});
   layer.setStyle(stileDi(layer.feature));
  }
  return result;
 };
 const oldOpen=mostra;
 mostra=function(key,...args){const r=record(key);if(r){if(typeof chiudi==='function')chiudi();aperto=key;applicaColori();StimeComune.apri(r,HZ,{ambito:reg?'toscana':'nazionale',onClose:()=>{aperto=null;applicaColori();}});return;}return oldOpen.call(this,key,...args);};
 async function sync(force=false){
  const context=ANNO+'|'+HZ;
  box.querySelector('.sp-map-page').href='stime.html?anno='+ANNO+'&oriz='+HZ;
  if(context!==ultimoContesto){ultimoContesto=context;aperto=null;StimeComune.chiudi();}
  if(ANNO<2022||ANNO>2025){toggle.disabled=true;attivo=false;json=null;status.textContent='Stime sperimentali disponibili per le fotografie 2022–2025.';applicaColori();return;}
  toggle.disabled=false;
  if(!toggle.checked){attivo=false;status.textContent='Stime escluse dalla vista · indici con rendiconto invariati';applicaColori();return;}
  attivo=true;if(!force&&json?.meta.anno===ANNO){applicaColori();aggiornaStatus();return;}
  const ticket=++seq,a=ANNO;status.textContent='Caricamento delle stime del '+a+'…';
  try{const j=await StimeComune.carica(a);if(ticket!==seq||a!==ANNO||!toggle.checked)return;json=j;applicaColori();aggiornaStatus();
   const requested=new URLSearchParams(location.search).get('stima');if(requested&&record(requested)){const l=LAYMAP[requested];if(l){const map=l._map;if(map?.fitBounds)map.fitBounds(l.getBounds(),{padding:[25,25],maxZoom:11});}mostra(requested);}
  }catch(e){if(ticket!==seq)return;attivo=false;json=null;status.textContent=e.message;applicaColori();}
 }
 function aggiornaStatus(){const records=Object.values(json.comuni).filter(r=>!reg||r.regione===reg);const mapped=records.filter(r=>r.tipo==='stima'&&LAYMAP[r.key]);const known=mapped.filter(r=>r.stato?.stato==='dissesto_attivo').length;status.textContent=(mapped.length-known)+' '+(mapped.length-known===1?'stima di rischio':'stime di rischio')+' · '+known+' '+(known===1?'comune già in dissesto':'comuni già in dissesto')+' · dati '+ANNO+'.'+(reg?' Colore riferito al confronto toscano.':'');}
 toggle.addEventListener('change',()=>{const u=new URL(location.href);if(toggle.checked)u.searchParams.set('stime','1');else{u.searchParams.delete('stime');u.searchParams.delete('stima');}history.replaceState(null,'',u);sync(true);});
 const oldTexts=aggiornaTesti;aggiornaTesti=function(...args){const result=oldTexts.apply(this,args);sync();return result;};
 toggle.checked=new URLSearchParams(location.search).get('stime')==='1';sync(true);
}
if(document.readyState==='complete')init();else window.addEventListener('load',init,{once:true});
})();
