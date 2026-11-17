(function(root){
 'use strict';
 const D=root.TerritorioDati,esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const n=(x,c=0)=>x==null?'n.d.':Number(x).toLocaleString('it-IT',{maximumFractionDigits:c,minimumFractionDigits:c,useGrouping:'always'});
 function elencoStoria(s,anno){
  if(!s.prima.length)return '<div class="tc-storia">Nessun avvio registrato entro il '+anno+'.</div>';
  return s.prima.map(e=>'<div class="tc-storia"><span class="tc-badge '+(e.t==='riequilibrio'?'tc-badge-r':'')+'">'+(e.t==='dissesto'?'D':'R')+'</span>'+esc(D.descrivi(e,anno))+'</div>').join('');
 }
 function futuro(s,anno){return s.dopo.length?'<div class="tc-futuro">Successivo al '+anno+': '+s.dopo.map(e=>(e.t==='dissesto'?'dissesto':'riequilibrio')+' '+D.annoEvento(e)).join(' · ')+'. Non incluso nel riepilogo storico.</div>':'';}
 function indice(x){return x?'<span class="tc-ix">'+n(x.ix,1)+'</span><div class="tc-identita">'+esc(x.f.toLowerCase())+' · indice nazionale</div>':'<div class="tc-identita">Indice non disponibile</div>';}
 function pariHtml(ctx){
  const v=ctx.pari.lista;
  if(!v.length)return '<p class="tc-nota">'+esc(ctx.pari.motivo)+' Puoi usare il confronto libero del portale.</p>';
  return '<div class="tc-pari">'+v.map(x=>{const s=D.storia(ctx.proc[x.k],ctx.anno),ultimo=s.prima.at(-1);return '<div class="tc-pari-riga"><div><span class="tc-nome">'+esc(x.g.n)+'</span><span class="tc-identita">'+esc(x.g.p)+' · '+(x.confinante?'confinante':n(x.km,1)+' km in linea d’aria')+'</span></div><p>'+n(x.ab)+' abitanti · indice '+n(ctx.punteggi[x.k].ix,1)+'</p><p>'+(ultimo?esc(D.descrivi(ultimo,ctx.anno)):'Nessuna procedura registrata entro il '+ctx.anno)+'</p><button type="button" data-tc-confronta="'+esc(x.k)+'">Confronta</button></div>';}).join('')+'</div>';
 }
 function dettagliHtml(ctx,modalita){
  const c=ctx.conteggi,lista=ctx.vicini.slice().sort((a,b)=>a.g.n.localeCompare(b.g.n,'it'));
  const titolo=ctx.g.a.length?'I '+c.totale+' comuni confinanti':'Nessun confine terrestre con altri comuni';
  return '<h4>'+titolo+'</h4><p class="tc-nota">Avvii nel periodo <b>'+(ctx.anno-4)+'–'+ctx.anno+'</b>, escluso il comune selezionato.</p>'
   +'<div class="tc-conti"><div><b>'+c.d5+' su '+c.associati+'</b><span>comuni con un dissesto dichiarato</span></div><div><b>'+c.r5+' su '+c.associati+'</b><span>comuni con un riequilibrio avviato</span></div></div>'
   +(c.associati<c.totale?'<p class="tc-nota tc-avviso">'+(c.totale-c.associati)+' confinanti non associati all’anagrafica dell’anno: esclusi dai due conteggi.</p>':'')
   +'<p class="tc-nota">D e R distinguono i due tipi di procedura. Uno stesso comune può comparire in entrambi i conteggi. I simboli sulla mappa riguardano tutti gli avvii registrati entro il '+ctx.anno+', anche precedenti a questi cinque anni.</p>'
   +'<ul class="tc-elenco">'+lista.map(x=>'<li class="tc-vicino"><div><span class="tc-nome">'+esc(x.g.n)+'</span><span class="tc-identita">'+esc(x.g.p)+' · '+(x.ab==null?'abitanti non disponibili':n(x.ab)+' abitanti')+'</span>'+elencoStoria(x.storia,ctx.anno)+futuro(x.storia,ctx.anno)+(x.associatoAnno?'':'<p class="tc-nota tc-avviso">Identità non associata nell’annata scelta.</p>')+'</div><div>'+indice(x.indice)+(modalita==='mappa'?'<button type="button" data-tc-apri="'+esc(x.k)+'">Apri</button>':'')+'</div></li>').join('')+'</ul>';
 }
 function metodoHtml(ctx){return '<details><summary>Come scegliamo vicini e confronti</summary><p>Confinanti: territori con un tratto di confine comune, secondo le geometrie già usate dalla mappa. Il solo contatto in un punto non basta. Questi confini sono mantenuti fissi fra gli anni: fusioni e variazioni territoriali storiche non sono ricostruite.</p><p>Confronti: popolazione dello stesso anno, da metà al doppio di quella del comune. Prima i confinanti, ordinati per somiglianza di popolazione; poi, se servono, i comuni entro 50 km con dimensioni comparabili. Sono proposti solo comuni con un indice su questo orizzonte. Il punteggio e le procedure non determinano l’ordine dei suggerimenti.</p><p>Indici nazionali del modello principale: le stime provvisorie restano nella vista generale della mappa. Distanze in linea d’aria tra i centri geografici dei territori, non distanze stradali. Indici e procedure sono informazioni distinte: la vicinanza non dimostra che la crisi si trasmetta da un comune all’altro. L’assenza di avvii nell’archivio non certifica una buona situazione finanziaria.</p><p>Fonte geometrica: base Openpolis delle mappe. Popolazione: archivi ISTAT già acquisiti nel progetto. Procedure: anagrafica e chiusure documentate del portale. Ricostruzione retrospettiva con gli archivi disponibili oggi.</p></details>';}
 let seriale=0;
 async function monta(host,config){
  const richiesta=++seriale;host.dataset.tcRichiesta=String(richiesta);host.classList.add('tc');if(config.modalita==='mappa')host.classList.add('tc-mappa');
  host.innerHTML='<p role="status">Carico vicini e confronti…</p>';
  try{
   const ctx=await D.carica(config.key,config.anno,config.hz,config.righe?.());
   if(!host.isConnected||host.dataset.tcRichiesta!==String(richiesta)||!config.valido())return null;
   if(!ctx.associato){host.innerHTML='<h3>Il comune e il territorio</h3><p>Il confine di questo comune non è associato alla base geografica della mappa. Non vengono suggeriti confinanti.</p>';return null;}
   const mappa=config.modalita==='mappa';
   const mappaUrl=new URL(ctx.g.r.toUpperCase()==='TOSCANA'?'mappa-toscana.html':'mappa-nazionale.html',location.href);mappaUrl.searchParams.set('anno',ctx.anno);mappaUrl.searchParams.set('oriz',ctx.hz);mappaUrl.searchParams.set('comune',ctx.key);mappaUrl.searchParams.set('dintorni','1');
   host.innerHTML='<h3>'+(mappa?'Il comune e i dintorni':'Confronta con un comune vicino')+'</h3>'
    +'<p class="tc-nota">Anno '+ctx.anno+' · '+(ctx.hz==='t3'?'rischio entro tre anni':'rischio nell’anno successivo')+' · contesto descrittivo</p>'
    +(mappa?'<div class="tc-azioni"><button type="button" class="tc-principale" data-tc-focus>Guarda i dintorni</button><button type="button" data-tc-ripristina hidden>Torna alla mappa</button></div><p class="tc-nota">Nei confinanti, '+(ctx.anno-4)+'–'+ctx.anno+': <b>'+ctx.conteggi.d5+' con dissesto · '+ctx.conteggi.r5+' con riequilibrio</b>.</p><p class="tc-nota">Colori: rischio stimato. D/R: avvii di procedure, anche passati; date nell’elenco qui sotto.</p>':'<p>Comuni del territorio con dimensioni simili. Il confronto mantiene anno e orizzonte.</p>')
    +(mappa?'<details class="tc-dettaglio"><summary>Procedure nei confinanti e situazione del territorio</summary>'+dettagliHtml(ctx,'mappa')+'</details><details><summary>Confronta con un comune vicino</summary>'+pariHtml(ctx)+'</details>':pariHtml(ctx)+'<div class="tc-azioni"><a class="tc-bottone" href="'+esc(mappaUrl.href)+'">Guarda il territorio sulla mappa</a></div><details><summary>Il comune e i dintorni</summary>'+dettagliHtml(ctx,'portale')+'</details>')
    +metodoHtml(ctx)+'<p class="tc-solo-lettura">Questo contesto non entra nel modello e non modifica il punteggio.</p>';
   host.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-tc-focus')){config.focus?.(ctx);host.querySelector('[data-tc-ripristina]').hidden=false;b.textContent='Centra di nuovo i dintorni';}
    if(b.hasAttribute('data-tc-ripristina')){config.ripristina?.();b.hidden=true;host.querySelector('[data-tc-focus]').textContent='Guarda i dintorni';}
    if(b.dataset.tcConfronta)config.confronta(ctx.key,b.dataset.tcConfronta);
    if(b.dataset.tcApri)config.apri?.(b.dataset.tcApri);
   });
   config.pronto?.(ctx);return ctx;
  }catch(e){if(host.isConnected&&config.valido())host.innerHTML='<h3>Il comune e il territorio</h3><p role="status">Non è stato possibile caricare i dati dei dintorni. Puoi riprovare riaprendo la scheda.</p>';console.warn('Contesto territoriale:',e.message);return null;}
 }
 root.TerritorioUI={monta,esc,numero:n,elencoStoria};
})(typeof window==='undefined'?globalThis:window);
