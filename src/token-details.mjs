import {tokenImageUrl} from '../companion/token-media.mjs';
import {validAddress} from './core.mjs';
const text = v => typeof v === 'string' ? v.slice(0,160) : null;
const raw = v => /^\d+$/.test(String(v ?? '')) ? String(v) : null;
export async function loadTokenDetails(provider, address, options = {}) {
  if (!validAddress(address)) throw Error('Invalid token address');
  const paths = ['tokens/'+address, 'tokens/'+address+'/holders', 'tokens/'+address+'/transfers'];
  const names = ['metadata','holders','transfers'];
  const results = await Promise.allSettled(paths.map(p => provider.json('https://api.blockscout.com/4663/api/v2/'+p)));
  let launchAt = options.launchAt ?? null;
  if (launchAt === null && Number.isSafeInteger(options.block) && options.block >= 0) {
    try {
      const block = await provider.rpc('eth_getBlockByNumber',['0x'+options.block.toString(16),false]);
      const at=Number(BigInt(block.timestamp))*1000;
      if(Number.isSafeInteger(at)&&at>0&&at<=Date.now())launchAt=at;
    } catch {}
  }
  const sources = Object.fromEntries(results.map((r,i) => [names[i],r.status==='fulfilled' ? 'available' : 'unavailable']));
  const data = results.map(r => r.status==='fulfilled' ? r.value : null);
  const [token, holders, transfers] = data;
  const addr = v => validAddress(v?.hash) ? v.hash.toLowerCase() : null;
  return {
    checkedAt: Date.now(), launchAt, source:'Blockscout / chain 4663',
    status: results.every(r=>r.status==='fulfilled') ? 'complete' : results.some(r=>r.status==='fulfilled') ? 'partial' : 'unavailable',
    sources, name:text(token?.name), symbol:text(token?.symbol), imageUrl:tokenImageUrl(token?.icon_url),
    decimals: Number.isInteger(Number(token?.decimals)) && token?.decimals != null ? Number(token.decimals) : null,
    totalSupply:raw(token?.total_supply), holderCount:raw(token?.holders_count),
    holders: Array.isArray(holders?.items) ? holders.items.slice(0,10).map(h=>({address:addr(h.address),value:raw(h.value)})) : [],
    transfers: Array.isArray(transfers?.items) ? transfers.items.slice(0,50).map(t=>({from:addr(t.from),to:addr(t.to),value:raw(t.total?.value),timestamp:text(t.timestamp),hash:text(t.transaction_hash), logIndex:t.log_index ?? null})) : [],
    holdersTruncated:!!holders?.next_page_params || (holders?.items?.length||0)>10,
    transfersTruncated:!!transfers?.next_page_params || (transfers?.items?.length||0)>50,
  };
}
export function applyTokenDetails(token, details) {
  token.onchain=details;
  if(details.imageUrl)token.imageUrl=details.imageUrl;
  if(details.name)token.name=details.name;
  if(details.symbol)token.symbol=details.symbol;
}

export function tokenActivity(token, now=Date.now(), demo=false) {
  const d=token.onchain;
  const launchAt=demo?token.seenAt:d?.launchAt;
  const ageMinutes=Number.isFinite(launchAt)&&launchAt<=now?(now-launchAt)/60000:null;
  const fresh=!!d&&now-d.checkedAt>=0&&now-d.checkedAt<180000&&d.sources.transfers==='available';
  const seen=new Set(), participants=new Set();
  let transfers5m=0;
  if(fresh)for(const t of d.transfers){
    const at=Date.parse(t.timestamp),id=t.hash+':'+t.logIndex;
    if(!t.hash||!Number.isFinite(at)||at>now||now-at>300000||seen.has(id))continue;
    seen.add(id);transfers5m++;
    for(const a of [t.from,t.to])if(validAddress(a)&&!/^0x0{40}$/i.test(a))participants.add(a);
  }
  const active=fresh&&transfers5m>=5&&participants.size>=3;
  return {ageMinutes,ageSource:demo?'simulated launch':'factory block timestamp',transfers5m:fresh?transfers5m:null,participants5m:fresh?participants.size:null,active,
    label:active?'ON-CHAIN ACTIVE':fresh?'LOW OBSERVED ACTIVITY':'ACTIVITY UNKNOWN',
    reason:active?'At least 5 transfers and 3 distinct addresses in the last 5 minutes; activity is not proof of buying.':fresh?'Activity threshold not met in the returned transfer sample.':'Fresh transfer data not available.',
    truncated:!!d?.transfersTruncated};
}

export function researchRead(token, now=Date.now(), demo=false) {
  const activity=tokenActivity(token,now,demo),d=token.onchain;
  const fresh=!!d&&now-d.checkedAt>=0&&now-d.checkedAt<180000;
  const metadata=!!d?.name&&d.sources?.metadata==='available';
  const hasData=metadata||activity.transfers5m!==null;
  if(activity.active)return {hasData:true,priority:100,verdict:'LOOK CLOSER',reason:activity.transfers5m+' transfers across '+activity.participants5m+' addresses in 5 minutes. Inspect holders and counterparties; transfers are not necessarily buys.'};
  if(activity.transfers5m!==null)return {hasData:true,priority:40+Math.min(activity.transfers5m,10),verdict:'LOW ACTIVITY',reason:activity.transfers5m+' transfers / '+activity.participants5m+' addresses in 5 minutes. '+(d?.holderCount??'Unknown')+' holders. No strong activity signal in this sample.'};
  if(metadata)return {hasData:true,priority:fresh?30:10,verdict:fresh?'RESEARCHABLE':'STALE DATA',reason:'Token identity and '+(d?.holderCount??'unknown')+' holders available. '+(fresh?'Fresh transfer evidence is missing.':'Waiting for refreshed on-chain evidence.')};
  return {hasData:false,priority:0,verdict:'WAIT',reason:'Waiting for token metadata and transfer evidence.'};
}
