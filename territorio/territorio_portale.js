/* Collegamenti locali al confronto già esistente nel portale. */
(function(root){
 'use strict';
 root.TerritorioPortale=function(config){
  const U=root.TerritorioUI;let richiestaURL=true;
  function confronta(a,b){
   const dati=config.stato();if(!dati.righe.some(x=>x.cn===a)||!dati.righe.some(x=>x.cn===b))return;
   document.getElementById('ov').classList.remove('on');
   for(const [id,key,etichetta] of [['cmpA',a,'Primo comune'],['cmpB',b,'Secondo comune']]){
    document.getElementById(id).value=key;const x=dati.righe.find(x=>x.cn===key),input=document.querySelector('input[aria-label="'+etichetta+'"]');if(input&&x)input.value=x.c+' · '+x.r;
   }
   config.mostraComuni();document.querySelector('[data-esplora="confronto"]').click();config.renderConfronto();
  }
  function scheda(x){
   const card=document.getElementById('card'),{anno,hz}=config.stato(),host=document.createElement('section');host.setAttribute('aria-label','Confronti con comuni vicini');
   const conti=card.querySelector('.fs-conti')||card.querySelector('.ind-bilancio')||card.firstElementChild;
   conti.after(host);
   U.monta(host,{key:x.cn,anno,hz,modalita:'portale',righe:()=>config.stato().righe,
    valido:()=>config.stato().anno===anno&&config.stato().hz===hz&&card.contains(host),confronta});
  }
  function daURL(){
   if(!richiestaURL)return;const url=new URL(location.href),anno=Number(url.searchParams.get('anno'))||2022,{anno:attuale,righe}=config.stato();if(attuale!==anno)return;
   const a=url.searchParams.get('a'),b=url.searchParams.get('b'),k=url.searchParams.get('comune');
   if(a&&b){richiestaURL=false;confronta(a,b);}
   else if(k){const x=righe.find(x=>x.cn===k);richiestaURL=false;if(x)config.apri(x);}
  }
  return {scheda,daURL,confronta};
 };
})(window);
