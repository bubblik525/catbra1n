export function parseBatch(text){
 const addresses=[...new Set(text.trim().split(/[\s,;]+/).filter(Boolean).map(v=>v.toLowerCase()))];
 if(!addresses.length||addresses.some(v=>!/^0x[a-f0-9]{40}$/.test(v)))throw Error('Use valid 42-character public addresses; no private keys or seed phrases.');
 if(addresses.length>50)throw Error('Maximum 50 distinct addresses per batch.');
 return addresses;
}
export function assignRegions(nodes,links,pattern=false){
 const ids=new Set(nodes.map(n=>n.id)),adj=new Map(nodes.map(n=>[n.id,[]]));
 const id=v=>typeof v==='object'?v.id:v;
 for(const l of links){const a=id(l.source),b=id(l.target);if(ids.has(a)&&ids.has(b)){adj.get(a).push(b);adj.get(b).push(a);}}
 // Pattern sectors describe an observed first-candle move, not ownership clusters.
 if(pattern){for(const n of nodes){const f=n.data?.features?.[0]||0;n.region=f<-.08?0:f>.08?2:1;}return ['NEGATIVE FIRST CANDLE','FLAT FIRST CANDLE','POSITIVE FIRST CANDLE'];}
 const seen=new Set(),names=[];for(const n of nodes){if(seen.has(n.id))continue;const k=names.length,q=[n.id];seen.add(n.id);for(let i=0;i<q.length;i++)for(const next of adj.get(q[i]))if(!seen.has(next)){seen.add(next);q.push(next);}const set=new Set(q);for(const item of nodes)if(set.has(item.id))item.region=k;names.push(q.length===1?'UNLINKED ADDRESS':`CONNECTED COMPONENT ${k+1}`);}return names;
}
export function validateAtlas(v){
 const address=x=>typeof x==='string'&&/^0x[a-f0-9]{40}$/i.test(x);
 if(!v||v.version!==1||!['pattern','chain'].includes(v.mode)||!Array.isArray(v.patterns)||v.patterns.length>300||!Array.isArray(v.nodes)||v.nodes.length>600||!Array.isArray(v.links)||v.links.length>2000)throw Error('Invalid atlas snapshot');
 if(v.patterns.some(p=>!address(p.address)||!Array.isArray(p.features)||p.features.length!==5||!p.features.every(Number.isFinite))||v.nodes.some(n=>!address(n.id))||v.links.some(l=>!address(l.source)||!address(l.target)))throw Error('Invalid atlas entities');
 return v;
}
