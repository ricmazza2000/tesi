/* Adattatore Leaflet. Il colore locale usa sempre la graduatoria nazionale. */
(function(root){
 'use strict';
 const U=root.TerritorioUI,D=root.TerritorioDati,COLORI={BASSO:'#2E7D32',MEDIO:'#FBC02D',ALTO:'#EF6C00',CRITICO:'#C62828','n/d':'#d9d4c8'};
 root.TerritorioMappa=function(config){
  const mappa=config.mappa,poligoni=new Map(),nomi=L.layerGroup().addTo(mappa),simboli=L.layerGroup().addTo(mappa),linee=L.layerGroup().addTo(mappa);
  config.livello.eachLayer(l=>{const k=l.feature?.properties?.k;if(k)poligoni.set(k,l);});
  let contesto=null,attivo=false,vistaIniziale=null,extra=null,richiesta=0,stimePrima=null;
  const precedenteStile=config.leggiStile(),precedenteColori=config.leggiColori();
  function gruppo(){return contesto?new Set([contesto.key,...contesto.g.a]):new Set();}
  function stile(k,base){
   if(!attivo||!contesto)return base;
   if(!gruppo().has(k))return {...base,fillColor:'#c7cbc9',fillOpacity:.09,opacity:.18,weight:.25};
   const ix=contesto.punteggi[k],scelto=k===contesto.key;
   return {...base,fillColor:COLORI[ix?.f]||COLORI['n/d'],fillOpacity:scelto ? .92 : .8,color:scelto?'#172E4B':'#697c8d',weight:scelto?3.5:1.4,opacity:1,dashArray:null};
  }
  config.scriviStile(feature=>stile(feature.properties.k,precedenteStile(feature)));
  function apri(k){
   if(poligoni.has(k))config.apri(k);
   else{const url=new URL('mappa-nazionale.html',location.href);url.searchParams.set('anno',config.stato().anno);url.searchParams.set('oriz',config.stato().hz);url.searchParams.set('comune',k);url.searchParams.set('dintorni','1');location.assign(url.href);}
  }
  function fumetto(k){
   const g=contesto.comuni[k],s=D.storia(contesto.proc[k],contesto.anno),ix=contesto.punteggi[k];
   return '<b>'+U.esc(g.n)+'</b><br>Indice nazionale '+(ix?U.numero(ix.ix,1):'non disponibile')+' · bilancio '+contesto.anno
    +'<br>'+s.prima.map(e=>U.esc(D.descrivi(e,contesto.anno))).join('<br>')
    +(s.prima.length?'':'Nessun avvio registrato entro il '+contesto.anno)
    +(s.dopo.length?'<hr>Sviluppi successivi: '+s.dopo.map(e=>e.t+' '+D.annoEvento(e)).join(' · '):'');
  }
  function legenda(){
   let el=document.getElementById('tc-legenda');if(!el){el=document.createElement('div');el.id='tc-legenda';el.className='tc-legenda';document.body.append(el);}
   el.hidden=!attivo;if(!attivo)return;
   el.innerHTML='<button type="button" class="tc-chiudilegenda" data-tc-esci aria-label="Esci dalla vista dei dintorni">×</button><strong>'+U.esc(contesto.g.n)+' e i dintorni</strong><div>Bilancio '+contesto.anno+' · '+(contesto.hz==='t3'?'entro tre anni':'anno successivo')+'</div><div class="tc-rischi">'
    +Object.entries(COLORI).map(([nome,colore])=>'<span><i style="background:'+colore+'"></i>'+({BASSO:'Basso',MEDIO:'Medio',ALTO:'Alto',CRITICO:'Critico','n/d':'Dato assente'}[nome])+'</span>').join('')+'</div><div>Colori: fasce nazionali.</div><div class="tc-simboli-spiega"><span class="tc-selezione"></span>Comune scelto</div><div><b>D</b> dissesto · <b>R</b> riequilibrio entro il '+contesto.anno+'</div><button type="button" class="tc-uscita" data-tc-scheda>Apri scheda</button><button type="button" class="tc-uscita" data-tc-esci>Torna alla mappa</button>';
   el.querySelectorAll('[data-tc-esci]').forEach(b=>{b.onclick=()=>esci(true);});el.querySelector('[data-tc-scheda]').onclick=()=>apri(contesto.key);
  }
  function aggiornaSovrapposizioni(){
   nomi.clearLayers();simboli.clearLayers();linee.clearLayers();if(!attivo||!contesto){legenda();return;}
   const occupati=[],stretto=innerWidth<700,larghezza=mappa.getSize().x,altezza=mappa.getSize().y;
   const area={x1:stretto?10:255,x2:stretto?larghezza-10:larghezza-405,y1:stretto?175:75,y2:stretto?altezza*.57:altezza-35};
   function posto(k,testo){
    const g=contesto.comuni[k],p=mappa.latLngToContainerPoint(g.m),w=Math.min(200,testo.length*(stretto?4.8:5.2)+14),h=20;
    let migliore=null;
    for(let r=0;r<5;r++)for(const [dx,dy] of [[0,18+r*24],[0,-25-r*24],[w/2+16+r*12,0],[-w/2-16-r*12,0],[w/2+12,28+r*24],[-w/2-12,-28-r*24]]){
     const x=Math.max(area.x1+w/2,Math.min(area.x2-w/2,p.x+dx)),y=Math.max(area.y1+h/2,Math.min(area.y2-h/2,p.y+dy)),b={x1:x-w/2,x2:x+w/2,y1:y-h/2,y2:y+h/2};
     const sovrapposti=occupati.filter(q=>b.x1<q.x2+4&&b.x2>q.x1-4&&b.y1<q.y2+4&&b.y2>q.y1-4).length,costo=sovrapposti*10000+Math.hypot(x-p.x,y-p.y);
     if(!migliore||costo<migliore.costo)migliore={x,y,b,costo};
    }
    occupati.push(migliore.b);const punto=mappa.containerPointToLatLng([migliore.x,migliore.y]);
    if(Math.hypot(migliore.x-p.x,migliore.y-p.y)>26)L.polyline([g.m,punto],{color:'#172e4b',weight:.8,opacity:.6,interactive:false}).addTo(linee);
    return punto;
   }
   for(const k of gruppo()){
    const g=contesto.comuni[k];if(!g)continue;
    const l=poligoni.get(k),ix=contesto.punteggi[k];
    if(l){l.unbindTooltip();l.bindTooltip(fumetto(k),{sticky:true});if(l.bringToFront)l.bringToFront();}
    const etichetta=g.n+(ix?' · '+U.numero(ix.ix,1):' · n.d.');
    L.tooltip({permanent:true,direction:'center',offset:[0,0],className:'tc-nome-vicino',opacity:1}).setLatLng(posto(k,etichetta)).setContent(U.esc(etichetta)).addTo(nomi);
    const s=D.storia(contesto.proc[k],contesto.anno),sigla=(s.d.length?'D':'')+(s.r.length?(s.d.length?'·R':'R'):'');
    if(sigla){const mar=L.marker(g.m,{icon:L.divIcon({className:'tc-simbolo'+(sigla==='R'?' tc-simbolo-r':''),html:'<span>'+sigla+'</span>',iconSize:[sigla.length>1?35:23,24],iconAnchor:[12,24]}),zIndexOffset:900});mar.bindTooltip(fumetto(k),{direction:'top'});mar.on('click',()=>apri(k));mar.addTo(simboli);}
   }
   if(extra){extra.setStyle(f=>stile(f.properties.k,{}));extra.eachLayer(l=>l.bindTooltip(fumetto(l.feature.properties.k),{sticky:true}));}
   legenda();
  }
  config.scriviColori(function(){precedenteColori();aggiornaSovrapposizioni();});
  function centra(){
   if(!contesto)return;const b=L.latLngBounds([]);for(const k of gruppo()){const g=contesto.comuni[k];if(g)b.extend([[g.b[1],g.b[0]],[g.b[3],g.b[2]]]);}
   const stretto=innerWidth<700,pan=document.getElementById('pan'),altezza=pan?.getBoundingClientRect().height||0;
   mappa.fitBounds(b,{paddingTopLeft:stretto?[18,120]:[260,85],paddingBottomRight:stretto?[18,Math.min(altezza,360)+35]:[Math.min(440,innerWidth*.36),55],maxZoom:12,animate:false});
  }
  async function focus(ctx,centrare=true){
   const giro=++richiesta;if(!attivo)vistaIniziale={centro:mappa.getCenter(),zoom:mappa.getZoom()};
   contesto=ctx;attivo=true;document.body.classList.add('tc-territorio-attivo');
   if(stimePrima===null){const toggle=document.getElementById('sp-map-toggle');stimePrima=!!toggle?.checked;if(stimePrima)toggle.click();}
   const url=new URL(location.href);url.searchParams.set('comune',ctx.key);url.searchParams.set('dintorni','1');history.replaceState(null,'',url);
   for(const id of ['freg','ffascia']){const e=document.getElementById(id);if(e)e.disabled=true;}
   if(config.regionale){
    const g=await D.json('territorio/confini_esterni_toscana.json');if(giro!==richiesta)return;
    if(extra)mappa.removeLayer(extra);
    const esterni={type:'FeatureCollection',features:g.features.filter(f=>gruppo().has(f.properties.k))};
    extra=L.geoJSON(esterni,{style:f=>stile(f.properties.k,{}),onEachFeature:(f,l)=>{l.on('click',()=>apri(f.properties.k));}}).addTo(mappa);
   }
   config.ridisegna();if(centrare){centra();aggiornaSovrapposizioni();}
  }
  function esci(ripristina){
   ++richiesta;attivo=false;document.body.classList.remove('tc-territorio-attivo');nomi.clearLayers();simboli.clearLayers();linee.clearLayers();if(extra){mappa.removeLayer(extra);extra=null;}
   const url=new URL(location.href);url.searchParams.delete('dintorni');history.replaceState(null,'',url);
   document.querySelectorAll('[data-tc-ripristina]').forEach(b=>{b.hidden=true;});document.querySelectorAll('[data-tc-focus]').forEach(b=>{b.textContent='Guarda i dintorni';});
   const toggle=document.getElementById('sp-map-toggle');if(stimePrima&&toggle&&!toggle.checked)toggle.click();stimePrima=null;
   for(const id of ['freg','ffascia']){const e=document.getElementById(id);if(e)e.disabled=false;}
   config.ridisegna();legenda();if(ripristina&&vistaIniziale)mappa.setView(vistaIniziale.centro,vistaIniziale.zoom,{animate:false});
  }
  function scheda(k){
   const {anno,hz}=config.stato(),corpo=document.getElementById('p-bd');if(!corpo)return;
   const host=document.createElement('section');host.setAttribute('aria-label','Comune e dintorni');host.dataset.tcKey=k;
   if(corpo.firstElementChild)corpo.firstElementChild.after(host);else corpo.append(host);
   U.monta(host,{key:k,anno,hz,modalita:'mappa',valido:()=>config.stato().anno===anno&&config.stato().hz===hz&&config.stato().key===k,
    righe:config.righe,focus:ctx=>focus(ctx,true),ripristina:()=>esci(true),apri,
    confronta:(a,b)=>{const url=new URL('portale.html',location.href);url.searchParams.set('anno',anno);url.searchParams.set('oriz',hz);url.searchParams.set('a',a);url.searchParams.set('b',b);url.hash='comuni';location.assign(url.href);},
    pronto:ctx=>{if(attivo){const diverso=contesto?.key!==k;focus(ctx,diverso);}else if(config.richiestaFocus&&config.richiestaFocus===k){config.richiestaFocus=null;focus(ctx,true);}if(attivo){host.querySelector('[data-tc-ripristina]').hidden=false;host.querySelector('[data-tc-focus]').textContent='Centra di nuovo i dintorni';}}
   });
  }
  mappa.on('moveend resize',()=>{if(attivo)aggiornaSovrapposizioni();});
  return {scheda,focus,esci,centra,apri};
 };
})(window);
