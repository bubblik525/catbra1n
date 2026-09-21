export function assessToken(token,dossier={},now=Date.now(),demo=false){
 const m=token?.market, fresh=Number.isFinite(m?.observedAt)&&m.observedAt<=now&&now-m.observedAt<120000;
 const checks=dossier.checks||{},notes=[];
 const change=fresh&&Number.isFinite(m?.change)?m.change:null;
 if(change!==null)notes.push(change<0?`The reported 24-hour price change is ${change.toFixed(2)}%. That describes the past, not the next move.`:`The reported 24-hour price change is +${change.toFixed(2)}%. A rising price alone does not establish safety.`);
 if(checks.verified===false)notes.push('The source is not verified at the provider. Contract behavior needs further investigation.');
 if(Number.isFinite(checks.listedShare)&&checks.listedShare>=50)notes.push(`The first ${checks.listedCount} listed holders account for ${checks.listedShare.toFixed(1)}% of supply. Pools and contracts may be included; this is not proof of insider ownership.`);
 if(!fresh)notes.push('I do not have a fresh market observation. I would wait for a current quote before comparing this token.');
 if(!demo&&checks.verified===true)notes.push('Source verification is available. It is a transparency signal, not a safety audit.');
 const caution=!demo&&(checks.verified===false||(checks.listedShare>=50&&checks.listedShare<=100));
 return {fresh,change,label:demo?'DEMO OBSERVATION':caution?'REVIEW THE EVIDENCE':!fresh?'WAIT FOR DATA':'KEEP OBSERVING',notes,summary:demo?'I can walk you through this simulated token. No live contract checks were performed.':caution?'I found details worth investigating. Open the evidence before drawing a conclusion.':!fresh?'There is not enough fresh evidence for a useful market interpretation.':'The available snapshot is a starting point. I cannot conclude this token is safe or predict its next move.',missing:['Mint permissions','Transfer taxes','Blacklist behavior','Liquidity lock']};
}
