/* Contesto descrittivo: non produce un punteggio e non seleziona i pari per esito. */
(function(root){
 'use strict';
 const cache=new Map(),rad=x=>x*Math.PI/180,numero=x=>typeof x==='number'&&Number.isFinite(x);
 function distanza(a,b){const x=rad(b[0]-a[0]),y=rad(b[1]-a[1]),q=Math.sin(x/2)**2+Math.cos(rad(a[0]))*Math.cos(rad(b[0]))*Math.sin(y/2)**2;return 6371.0088*2*Math.atan2(Math.sqrt(q),Math.sqrt(Math.max(0,1-q)));}
 function annoEvento(e){return Number(e.a)||Number(String(e.d||'').slice(0,4))||null;}
 function episodi(pr){const seen=new Set();return (pr?.cron||[]).filter(e=>{const a=annoEvento(e),id=e.t+'|'+(e.d||a);if(e.rv||!a||!['dissesto','riequilibrio'].includes(e.t)||seen.has(id))return false;seen.add(id);return true;}).slice().sort((a,b)=>(a.d||annoEvento(a)+'-12-31').localeCompare(b.d||annoEvento(b)+'-12-31'));}
 function storia(pr,anno){const tutti=episodi(pr),prima=tutti.filter(e=>annoEvento(e)<=anno),d=prima.filter(e=>e.t==='dissesto'),r=prima.filter(e=>e.t==='riequilibrio');return {d,r,prima,dopo:tutti.filter(e=>annoEvento(e)>anno),d5:d.some(e=>annoEvento(e)>=anno-4),r5:r.some(e=>annoEvento(e)>=anno-4)};}
 function descrivi(e,anno){
  const avvio=annoEvento(e),fine=e.f?Number(e.f.slice(0,4)):Number(e.af)||null;
  let s=(e.t==='dissesto'?'Dissesto dichiarato':'Riequilibrio avviato')+' nel '+avvio;
  if(fine&&fine<=anno){s+=e.cf==='ritiro'?' · attivazione ritirata nel '+fine:e.cf==='fusione'?' · ente cessato per fusione nel '+fine:e.t==='riequilibrio'&&String(e.st).includes('dissesto')?' · piano terminato in dissesto nel '+fine:' · procedura conclusa nel '+fine;}
  else if(!fine&&String(e.st||'').includes('chius'))s+=' · chiusura non datata';
  return s;
 }
 function selezionaPari(key,comuni,popolazioni,righe){
  const me=comuni[key],pop=popolazioni[key]?.ab;
  if(!me||!numero(pop)||pop<=0)return {lista:[],motivo:'Popolazione dell’anno non disponibile: nessun abbinamento automatico.',rapporto:[.5,2]};
  const conf=new Set(me.a),candidati=[];
  for(const [k,g] of Object.entries(comuni)){
   if(k===key||!righe[k])continue;
   const ab=popolazioni[k]?.ab;if(!numero(ab)||ab<pop*.5||ab>pop*2)continue;
   const km=distanza(me.c,g.c);if(!conf.has(k)&&km>50)continue;
   candidati.push({k,g,ab,km,confinante:conf.has(k),differenza:Math.abs(Math.log(ab/pop))});
  }
  candidati.sort((a,b)=>Number(b.confinante)-Number(a.confinante)||a.differenza-b.differenza||a.km-b.km||a.k.localeCompare(b.k));
  return {lista:candidati.slice(0,3),motivo:candidati.length?'':'Nessun comune con un punteggio e dimensioni comparabili entro 50 km.',rapporto:[.5,2]};
 }
 function normalizzaRighe(righe,hz){const out={};for(const r of righe||[]){const ix=hz==='t3'?r.ix1:r.ix,f=hz==='t3'?r.f3:r.f;if(numero(ix))out[r.cn]={ix,f:f||'n/d'};}return out;}
 async function json(url){
  if(!cache.has(url)){const p=fetch(url,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('Archivio non caricato: '+url);return r.json();}).catch(e=>{cache.delete(url);throw e;});cache.set(url,p);}
  return cache.get(url);
 }
 async function carica(key,anno,hz,righeDisponibili){
  const [indice,pop,proc]=await Promise.all([json('territorio/indice.json'),json('confronti_simili/anno_'+anno+'.json'),json('portale_anni/comuni_procedure.json')]);
  if(indice.schema!==1||indice.entra_nel_modello!==false||pop.anno!==anno)throw new Error('Archivi territoriali incoerenti');
  const geometria=indice.comuni[key];if(!geometria)return {associato:false,key,anno,hz,fonte:indice.fonte};
  const righe=righeDisponibili||((await json('portale_anni/anno_'+anno+'.json')).righe);
  const punteggi=normalizzaRighe(righe,hz),pari=selezionaPari(key,indice.comuni,pop.comuni,punteggi);
  const vicini=geometria.a.map(k=>({k,g:indice.comuni[k],ab:pop.comuni[k]?.ab??null,indice:punteggi[k]||null,storia:storia(proc[k],anno),associatoAnno:!!pop.comuni[k]||!!punteggi[k]}));
  const valutabili=vicini.filter(x=>x.associatoAnno);
  return {associato:true,key,anno,hz,g:geometria,comuni:indice.comuni,pop:pop.comuni,proc,punteggi,pari,vicini,
    storia:storia(proc[key],anno),conteggi:{totale:vicini.length,associati:valutabili.length,conIndice:vicini.filter(x=>x.indice).length,d5:valutabili.filter(x=>x.storia.d5).length,r5:valutabili.filter(x=>x.storia.r5).length},fonte:indice.fonte};
 }
 root.TerritorioDati={carica,storia,episodi,annoEvento,descrivi,selezionaPari,distanza,normalizzaRighe,json};
})(typeof window==='undefined'?globalThis:window);
