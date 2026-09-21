const address=v=>typeof v==='string'&&/^0x[a-fA-F0-9]{40}$/.test(v)?v.toLowerCase():null;
export async function inspectRelations(provider,input){
 const root=address(input);if(!root)throw Error('Enter a valid public 0x address');
 const base='https://api.blockscout.com/4663/api/v2/';
 const nodes=new Map([[root,{id:root,label:root.slice(0,8)+'…'+root.slice(-4),kind:'address'}]]),links=[],warnings=[];
 const add=(id,kind,label)=>{id=address(id);if(id&&!nodes.has(id))nodes.set(id,{id,kind,label:label||id.slice(0,8)+'…'+id.slice(-4)});return id;};
 let failedRequests=0;
 const get=async path=>{try{return await provider.json(base+path);}catch(e){failedRequests++;warnings.push(e.message);if(/401|403|429|cooldown/.test(e.message))throw e;return null;}};
 const info=await get('addresses/'+root);
 const r=nodes.get(root);r.kind=info?.is_contract?'contract':'address';r.label=info?.name||r.label;r.verified=info?.is_verified??null;
 if(!info)warnings.push('Address metadata unavailable; classification is unresolved.');
 const creator=add(info?.creator_address_hash,'creator');if(creator)links.push({id:'creator:'+root,source:creator,target:root,kind:'created',evidence:info.creation_transaction_hash||'Blockscout address metadata'});
 const isToken=!!info?.token;const transfers=await get(isToken?'tokens/'+root+'/transfers':'addresses/'+root+'/token-transfers');
 for(const t of (transfers?.items||[]).slice(0,50)){
  const from=address(t.from?.hash),to=address(t.to?.hash);if(!from||!to||(!isToken&&root!==from&&root!==to)||!/^0x[0-9a-fA-F]{64}$/.test(t.transaction_hash||''))continue;
  add(from,'address');add(to,'address');links.push({id:t.transaction_hash+':'+t.log_index,source:from,target:to,kind:'transfer',token:t.token?.symbol||'TOKEN',value:String(t.total?.value??'?')+' raw',time:t.timestamp,evidence:t.transaction_hash});
 }
 if(info?.token){r.kind='token';r.label=info.token.symbol||info.token.name||r.label;const holders=await get('tokens/'+root+'/holders');for(const h of (holders?.items||[]).slice(0,30)){const id=add(h.address?.hash,h.address?.is_contract?'contract':'address');if(id)links.push({id:'holder:'+root+':'+id,source:id,target:root,kind:'holds',value:String(h.value??'?')+' raw',evidence:'Blockscout holder snapshot'});}if(holders?.next_page_params)warnings.push('Holder list truncated to first page / maximum 30 displayed.');}
 if(transfers?.next_page_params)warnings.push('Transfers truncated to first page / maximum 50 displayed.');
 if(!info&&!transfers)throw Error('Address research unavailable: metadata and transfers could not be loaded.');
 return {partial:failedRequests>0,root,nodes:[...nodes.values()],links,warnings,checkedAt:new Date().toISOString(),source:'Blockscout / Robinhood 4663',complete:false};
}
export function relationService(){let busy=false,next=0;const cache=new Map();return async(provider,input)=>{if(!provider)throw Error('Connect Blockscout in Pro Radar to inspect on-chain relationships.');const id=address(input);if(!id)throw Error('Invalid public address');const hit=cache.get(id);if(hit&&Date.now()-hit.at<300000)return hit.data;if(busy)throw Error('Relationship request already running');if(Date.now()<next)throw Error('Relationship cooldown: wait 3 seconds');busy=true;next=Date.now()+3000;try{const data=await inspectRelations(provider,id);cache.set(id,{at:Date.now(),data});if(cache.size>100)cache.delete(cache.keys().next().value);return data;}finally{busy=false;}};}
