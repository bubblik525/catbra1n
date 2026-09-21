import {readFile} from 'node:fs/promises';
import {propagate} from '../companion/cortex-engine.mjs';
import model from '../companion/cortex-data.mjs';
export function featuresFromCandle(row){
 const o=row?.Price?.Ohlc;
 if(!o||!['Open','High','Low','Close'].every(k=>Number.isFinite(o[k])&&o[k]>0)||o.High<o.Low||o.High<Math.max(o.Open,o.Close)||o.Low>Math.min(o.Open,o.Close)||!Number.isFinite(row.Volume?.Usd)||row.Volume.Usd<0)throw Error('Valid OHLC and volume are required for the model');
 const clip=v=>Math.max(-1,Math.min(1,v));
 return [clip(Math.log(o.Close/o.Open)),clip(Math.log(o.High/o.Low)),clip(Math.log1p(row.Volume.Usd)/12),clip((o.Close-o.Low)/Math.max(1e-15,o.High-o.Low)*2-1),clip(Math.log(o.Close/o.High))];
}
export function riskMetrics(candles){
 const closes=candles.map(c=>c.Close),returns=[];let peak=closes[0],drawdown=0;
 for(let i=0;i<closes.length;i++){peak=Math.max(peak,closes[i]);drawdown=Math.min(drawdown,(closes[i]/peak-1)*100);if(i&&Date.parse(candles[i].time)-Date.parse(candles[i-1].time)===3600000)returns.push(Math.log(closes[i]/closes[i-1]));}
 const mean=returns.length?returns.reduce((a,b)=>a+b,0)/returns.length:0;
 const volatility=returns.length>=3?Math.sqrt(returns.reduce((s,r)=>s+(r-mean)**2,0)/(returns.length-1))*100:null;
 return {observedReturn:(closes.at(-1)/closes[0]-1)*100,maxCloseDrawdown:drawdown,volatility,hourlyPairs:returns.length,spanHours:(Date.parse(candles.at(-1).time)-Date.parse(candles[0].time))/3600000,stressPrice:closes.at(-1)*.1,stressLoss:90};
}
export function analyzeRows(address,rows,mode,now=Date.now()){
 const valid=rows.filter(r=>r.Token?.Address?.toLowerCase()===address.toLowerCase()&&Number.isFinite(Date.parse(r.Block?.Time))).sort((a,b)=>Date.parse(a.Block.Time)-Date.parse(b.Block.Time));
 if(!valid.length)throw Error('No price history found for this contract. Missing data is not evidence of a failed token.');
 valid.forEach(featuresFromCandle);
 const candles=valid.map(r=>({time:r.Block.Time,...r.Price.Ohlc,volume:r.Volume.Usd}));
 // Same input definition as training: first returned hourly record, never latest spot stats.
 const first=valid[0],features=featuresFromCandle(first),inference=propagate(features),o=first.Price.Ohlc,last=valid.at(-1);
 const hours=(now-Date.parse(first.Block.Time))/3600000;
 return {address,mode,name:first.Token.Name,symbol:first.Token.Symbol,checkedAt:new Date(now).toISOString(),inputTime:first.Block.Time,lastTime:last.Block.Time,records:valid.length,price:last.Price.Ohlc.Close,volume:valid.reduce((s,r)=>s+(Number.isFinite(r.Volume?.Usd)?r.Volume.Usd:0),0),inputChange:(o.Close/o.Open-1)*100,inputDrawdown:(o.Close/o.High-1)*100,features,frames:inference.frames,score:inference.score,forecastEligible:false,label:inference.score>=.5?'Decline-leaning pattern':'No decline preference',comment:`The first available candle closed ${((o.Close/o.Open-1)*100).toFixed(1)}% from its open and ${((1-o.Close/o.High)*100).toFixed(1)}% below its high. The experimental readout ${inference.score>=.5?'leans toward a lower next recorded close':'does not favor a lower next recorded close'}.`,limitations:[mode==='archive'?'Saved historical observations, not live quotes.':'Provider history fetched now; this score refers to the first returned record, not the current price.',`Input is ${Math.max(0,hours).toFixed(1)} hours old. Earliest returned data is not a verified launch time.`,'Score is uncalibrated; model predicts next available record direction, not an exact time or magnitude.','Holders, creator, contract permissions and liquidity are not checked by this price model.'],candles,risk:riskMetrics(candles),validation:model.training};
}
export function createResearch({fetcher=fetch}={}){
 let key='',next=0,busy=false;const cache=new Map();
 return async body=>{
  if(body.type==='research-key'){if(typeof body.key!=='string'||body.key.trim().length<10||body.key.length>4096)throw Error('Enter a Bitquery access token');key=body.key.trim();cache.clear();return {configured:true};}
  if(body.type==='research-disconnect'){key='';cache.clear();return {configured:false};}
  if(body.type==='research-catalog'){const rows=JSON.parse(await readFile(new URL('../companion/research-fixtures.json',import.meta.url),'utf8'));const groups=new Map();for(const r of rows){const a=r.Token?.Address?.toLowerCase();if(!a)continue;groups.set(a,(groups.get(a)||0)+1);}return [...groups].filter(([,n])=>n>=2).slice(0,250).map(([address])=>({token:address}));}
  const address=body.address?.toLowerCase();if(!/^0x[a-f0-9]{40}$/.test(address||''))throw Error('Enter a valid 0x token contract');
  if(body.mode==='archive'){
   const fixture=JSON.parse(await readFile(new URL('../companion/research-fixtures.json',import.meta.url),'utf8'));
   return analyzeRows(address,fixture,'archive');
  }
  if(!key)throw Error('Connect a Bitquery API access token in Data connection, or choose a saved example.');
  if(cache.has(address)&&Date.now()-cache.get(address).at<60000)return cache.get(address).result;
  if(busy)throw Error('One research request is already running');
  if(Date.now()<next)throw Error(`Provider cooldown: try again in ${Math.ceil((next-Date.now())/1000)} seconds`);
  busy=true;next=Date.now()+15000;
  try{
   const query=`{ Trading { Tokens(limit: {count: 1000}, orderBy: {ascending: Block_Time}, where: {Token: {Address: {is: "${address}"} Network: {is: "Robinhood"}}, Interval: {Time: {Duration: {eq: 3600}}}}) {Block {Time} Token {Address Name Symbol} Volume {Usd} Price {Ohlc {Open High Low Close}}} } }`;
   const r=await fetcher('https://streaming.bitquery.io/graphql',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({query}),signal:AbortSignal.timeout(25000)});
   if(r.status===429){next=Date.now()+60000;throw Error('Bitquery rate limit reached. Paused for 60 seconds.');}
   if(!r.ok)throw Error(`Bitquery HTTP ${r.status}. Check API access and plan permissions.`);
   const d=await r.json();if(d.errors?.length){if(JSON.stringify(d.errors).toLowerCase().includes('rate'))next=Date.now()+60000;throw Error('Bitquery rejected the query. Check quota and Trading API permissions.');}
   if(!Array.isArray(d.data?.Trading?.Tokens))throw Error('Unexpected provider response');
   const result=analyzeRows(address,d.data.Trading.Tokens,'live');if(result.records===1000)result.limitations.push('1000-record cap reached; history may be truncated.');
   cache.set(address,{at:Date.now(),result});return result;
  }finally{busy=false;}
 };
}
