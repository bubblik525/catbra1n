// Descriptive statistics and conditional paths. No calibrated probabilities.
export function computeLab(candles=[]){
 const c=candles.filter(c=>Number.isFinite(c.Close)&&c.Close>0&&Number.isFinite(Date.parse(c.time))).slice().sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
 if(!c.length)return null;
 const p=c.map(c=>c.Close),last=p.at(-1),n=p.length,log=p.map(Math.log),mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
 const pairs=[]; for(let i=1;i<n;i++)if(Date.parse(c[i].time)-Date.parse(c[i-1].time)===3600000)pairs.push(Math.log(p[i]/p[i-1]));
 const mu=pairs.length?mean(pairs):null,sigma=pairs.length>=3?Math.sqrt(pairs.reduce((s,v)=>s+(v-mu)**2,0)/(pairs.length-1)):null;
 let peak=p[0];const dd=p.map(v=>{peak=Math.max(peak,v);return (v/peak-1)*100;});
 const ema=p.reduce((a,v)=>a+(2/Math.min(n+1,10))*(v-a),p[0]);
 const vols=c.map(c=>Number.isFinite(c.volume)?c.volume:0),total=vols.reduce((a,b)=>a+b,0),anchor=total>0?p.reduce((s,v,i)=>s+v*vols[i],0)/total:null;
 const span=(Date.parse(c.at(-1).time)-Date.parse(c[0].time))/3600000,ret=(last/p[0]-1)*100;
 const x=c.map(v=>(Date.parse(v.time)-Date.parse(c[0].time))/3600000),xm=mean(x),ym=mean(log),den=x.reduce((s,v)=>s+(v-xm)**2,0);
 const slope=n>=3&&den>0?x.reduce((s,v,i)=>s+(v-xm)*(log[i]-ym),0)/den:null;
 const intervals=[];for(let i=1;i<n;i++){const dt=(Date.parse(c[i].time)-Date.parse(c[i-1].time))/3600000;if(dt>0)intervals.push({dt,r:Math.log(p[i]/p[i-1])});}
 const duration=intervals.reduce((s,v)=>s+v.dt,0),pathMu=intervals.length>=3?intervals.reduce((s,v)=>s+v.r,0)/duration:null;
 const pathSigma=pathMu===null?null:Math.sqrt(intervals.reduce((s,v)=>s+(v.r-pathMu*v.dt)**2/v.dt,0)/(intervals.length-1));
 const ranges=c.filter(v=>v.High>0&&v.Low>0).map(v=>Math.log(v.High/v.Low));
 const concentration=total?vols.reduce((s,v)=>s+(v/total)**2,0):null;
 return {n,last,span,ret,dd,intervals,pathMu,pathSigma,maxDD:Math.min(...dd),pairs:pairs.length,mu,sigma,ema,anchor,slope,concentration,range:ranges.length?mean(ranges)*100:null,candles:c};
}
export function conditionalPaths(m,hours=6){
 if(!m||m.pathSigma===null||m.intervals.length<3)return [];
 return [-1,0,1].map(z=>({z,points:Array.from({length:49},(_,i)=>{const h=i/48*hours;const exponent=Math.max(-30,Math.min(30,m.pathMu*h+z*m.pathSigma*Math.sqrt(h)));return {h,p:m.last*Math.exp(exponent)};})}));
}
